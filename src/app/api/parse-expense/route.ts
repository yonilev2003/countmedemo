import Anthropic from "@anthropic-ai/sdk";
import { MODEL_HAIKU, logAiUsage } from "@/lib/ai/models";
import { dailyUserCap, getBudgetState } from "@/lib/ai/usage";
import { requireUserIfGated } from "@/lib/security/api-guard";
import {
  checkRateLimit,
  checkRateLimitDurable,
  rateLimitResponse,
  resolveClientKey,
} from "@/lib/security/rate-limit";
import { DATASET } from "@/lib/business-expenses/occupation-dataset";

/**
 * Expense capture parser — OCR (receipt photo or PDF) or voice (dictated
 * Hebrew transcript) → structured Expense Object fields, ready to drop into
 * the /expenses/new review screen. Same shape as /api/parse-invoice's
 * transcript→JSON pattern, extended to also accept an image or a PDF
 * document (the latter's Claude "document" content-block pattern is copied
 * from /api/upload's income-report/form-106 parsing — see parsePdfWithClaude
 * there). A multi-page PDF is only ever read from its first page — enforced
 * via the prompt below, not by actually truncating the file — matching the
 * "first-page-only" note shown next to the upload option in the UI.
 *
 * Category is matched against the W3 113-profession dataset's 19 stable
 * categories (not a free-text guess) so the result plugs directly into the
 * same taxonomy /business-expenses uses — "one shared taxonomy," per the
 * approved plan.
 */

const RATE_LIMIT_MAX_REQUESTS = 10; // per client per minute — vision calls cost more than parse-invoice's text-only
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB base64-decoded — images only
// PDFs get a much tighter cap than images: Claude bills a document by its
// full byte size regardless of how many pages we actually want, and the
// prompt above only ever asks it to read page 1. This repo has no PDF
// library to physically truncate to page 1 server-side before sending (and
// adding one is out of scope tonight — see AGENTS.md's "no new dependency"
// rule) — so a multi-page PDF that would otherwise bill for every page is
// capped small enough to stay cheap, and the 413 below nudges the user
// toward a single-page photo instead.
const MAX_PDF_BYTES = 2 * 1024 * 1024; // 2MB base64-decoded

const CATEGORY_LIST = DATASET.categories
  .map((c) => `${c.id}: ${c.nameHe}`)
  .join("\n");

const SYSTEM_PROMPT = `אתה מסייע ב-countme לתיעוד הוצאות עסקיות של עצמאים בישראל.
תקבל תמונה או קובץ PDF של קבלה/חשבונית, או תיאור מוקלט בעברית, ועליך להחזיר אובייקט JSON תקין בלבד עם השדות הבאים:

{
  "vendorName": string,     // שם הספק/העסק שהנפיק את המסמך. מחרוזת ריקה אם לא ברור.
  "docNumber": string,      // מספר החשבונית/קבלה כפי שמופיע במסמך. מחרוזת ריקה אם לא ברור.
  "date": string,           // תאריך המסמך, YYYY-MM-DD. מחרוזת ריקה אם לא ברור — אל תמציא תאריך של היום.
  "amount": number,         // סכום כולל, כפי שמופיע במסמך (במטבע המסמך). 0 אם לא ברור.
  "currency": string,       // מטבע המסמך: "ILS" | "USD" | "EUR" | "GBP". אם לא צוין, הנח "ILS".
  "categoryId": string,     // הקטגוריה המתאימה ביותר מהרשימה הבאה (מזהה בלבד, מחרוזת ריקה אם אף אחת לא מתאימה):
${CATEGORY_LIST}
  "confidence": {           // רק לתמונה/PDF (OCR) — עבור כל שדה שחולץ מהמסמך עצמו, ציון 0 עד 1 עד כמה אתה בטוח בקריאה. השמט שדה שלא חולץ בכלל.
    "vendorName": number,
    "docNumber": number,
    "date": number,
    "amount": number
  }
}

חוקים:
- החזר JSON תקין בלבד, ללא markdown, ללא הסבר.
- אל תמציא ערך לשדה שלא ניתן לקרוא/להבין בבירור — השאר מחרוזת ריקה (או 0 ל-amount).
- אם המסמך הוא PDF עם כמה עמודים, התייחס לעמוד הראשון בלבד והתעלם מהשאר.
- קלט מוקלט (טקסט חופשי, לא תמונה/PDF): אל תכלול "confidence" בתשובה כלל.
- קלט תמונה או PDF (OCR): כלול "confidence" עבור כל שדה שהצלחת לחלץ.`;

interface ParsedExpense {
  vendorName: string;
  docNumber: string;
  date: string;
  amount: number;
  currency: string;
  categoryId: string;
  confidence?: Partial<Record<"vendorName" | "docNumber" | "date" | "amount", number>>;
}

function isValidParsed(x: unknown): x is ParsedExpense {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.vendorName === "string" &&
    typeof o.docNumber === "string" &&
    typeof o.date === "string" &&
    typeof o.amount === "number" &&
    typeof o.currency === "string" &&
    typeof o.categoryId === "string"
  );
}

const VALID_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ValidMediaType = (typeof VALID_MEDIA_TYPES)[number];

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return Response.json({ error: "API key not configured" }, { status: 503 });
  }

  // Cheap in-memory IP limit first — catches an obvious flood before even
  // resolving a user.
  const ipKey = resolveClientKey(request);
  const rl = checkRateLimit("parse-expense", ipKey, RATE_LIMIT_MAX_REQUESTS);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

  // Auth gate (no-op while AUTH_GATING_ENABLED is off) — after the cheap
  // limiter, before we spend a Supabase round-trip or Anthropic tokens.
  const guard = await requireUserIfGated(request);
  if (guard.denied) return guard.denied;
  const userId = guard.user?.id ?? null;

  // Durable cross-instance per-minute limit — keyed by the authenticated
  // user when we have one, IP otherwise (resolveClientKey's fallback).
  const clientKey = resolveClientKey(request, userId);
  const rlDurable = await checkRateLimitDurable("parse-expense", clientKey, RATE_LIMIT_MAX_REQUESTS);
  if (!rlDurable.allowed) return rateLimitResponse(rlDurable.retryAfter);

  // Per-user daily cap (v2 plan 2.2) — shared "upload-daily" namespace with
  // /api/upload and /api/parse-invoice (all three are document-ingestion
  // routes; dailyUserCap() maps all three route names to the same
  // AI_USER_DAILY_UPLOAD_CAP). Falls back to the IP-keyed bucket when auth
  // gating is off.
  const dailyCap = dailyUserCap("parse-expense");
  const rlDaily = await checkRateLimitDurable("upload-daily", clientKey, dailyCap, 86_400);
  if (!rlDaily.allowed) {
    return rateLimitResponse(
      rlDaily.retryAfter,
      "הגעת/ה למכסת חילוצי המסמכים היומית. אפשר להמשיך מחר.",
    );
  }

  // Global spend budget (v2 plan 2.3) — "paused" stops all AI features,
  // including expense parsing. This route is already Haiku-only, so there's
  // no "degraded" model swap to apply here.
  const budgetState = await getBudgetState();
  if (budgetState === "paused") {
    return Response.json(
      {
        error:
          "כרגע יש עומס גבוה על שירותי ה-AI וקאונטמי השהתה אותם זמנית. נסי שוב מאוחר יותר.",
      },
      { status: 503 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof raw !== "object" || raw === null) {
    return Response.json({ error: "Body must be an object" }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;

  const anthropic = new Anthropic({ apiKey });
  let userContent: Anthropic.MessageParam["content"];

  if (typeof body.transcript === "string") {
    const transcript = body.transcript.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
    if (!transcript) return Response.json({ error: "transcript is empty" }, { status: 400 });
    if (transcript.length > 1000) return Response.json({ error: "transcript too long" }, { status: 400 });
    userContent = transcript;
  } else if (typeof body.imageBase64 === "string" && typeof body.imageMediaType === "string") {
    if (!VALID_MEDIA_TYPES.includes(body.imageMediaType as ValidMediaType)) {
      return Response.json({ error: "unsupported image type" }, { status: 400 });
    }
    // Rough bound on decoded size — base64 is ~4/3 the byte length.
    if (body.imageBase64.length > (MAX_FILE_BYTES * 4) / 3) {
      return Response.json({ error: "image too large" }, { status: 413 });
    }
    userContent = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: body.imageMediaType as ValidMediaType,
          data: body.imageBase64,
        },
      },
      { type: "text", text: "חלץ את פרטי הקבלה/החשבונית מהתמונה." },
    ];
  } else if (typeof body.pdfBase64 === "string") {
    // Rough bound on decoded size — base64 is ~4/3 the byte length. Tighter
    // cap than images (see MAX_PDF_BYTES above): a multi-page PDF bills in
    // full even though we only read page 1.
    if (body.pdfBase64.length > (MAX_PDF_BYTES * 4) / 3) {
      return Response.json(
        { error: "קובץ ה-PDF גדול מדי (מקסימום 2MB) — נסי לצלם את הקבלה במקום." },
        { status: 413 },
      );
    }
    userContent = [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: body.pdfBase64,
        },
      },
      {
        type: "text",
        text: "חלץ את פרטי הקבלה/החשבונית מהמסמך. אם יש בו יותר מעמוד אחד, התייחס לעמוד הראשון בלבד.",
      },
    ];
  } else {
    return Response.json(
      { error: "must provide transcript, imageBase64+imageMediaType, or pdfBase64" },
      { status: 400 },
    );
  }

  try {
    const response = await anthropic.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 500,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userContent }],
    });

    logAiUsage({
      route: "parse-expense",
      model: MODEL_HAIKU,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
      userId,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ error: "No text response from model" }, { status: 502 });
    }

    const cleaned = textBlock.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return Response.json({ error: "Model did not return valid JSON", raw: textBlock.text }, { status: 502 });
    }

    if (!isValidParsed(parsed)) {
      return Response.json({ error: "Parsed JSON missing required fields", raw: parsed }, { status: 502 });
    }

    return Response.json(parsed);
  } catch (err) {
    const msg = err instanceof Anthropic.APIError ? err.message : "Unexpected error";
    return Response.json({ error: msg }, { status: 502 });
  }
}
