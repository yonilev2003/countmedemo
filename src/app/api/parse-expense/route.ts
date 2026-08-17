import Anthropic from "@anthropic-ai/sdk";
import { MODEL_HAIKU, logAiUsage } from "@/lib/ai/models";
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
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB base64-decoded — same cap for images and PDFs

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

  const clientKey = resolveClientKey(request);
  const rl = checkRateLimit("parse-expense", clientKey, RATE_LIMIT_MAX_REQUESTS);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);
  const rlDurable = await checkRateLimitDurable("parse-expense", clientKey, RATE_LIMIT_MAX_REQUESTS);
  if (!rlDurable.allowed) return rateLimitResponse(rlDurable.retryAfter);

  const guard = await requireUserIfGated(request);
  if (guard.denied) return guard.denied;

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
    // Rough bound on decoded size — base64 is ~4/3 the byte length. Same cap as images.
    if (body.pdfBase64.length > (MAX_FILE_BYTES * 4) / 3) {
      return Response.json({ error: "PDF too large" }, { status: 413 });
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
