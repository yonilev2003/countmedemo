import Anthropic from "@anthropic-ai/sdk";
import {
  getClientIp,
  createRateLimiter,
  rateLimitResponse,
} from "@/lib/api/rate-limit";
import { sanitizeText } from "@/lib/api/chat-validation";

/**
 * Voice-to-invoice parser.
 *
 * Takes a free-text Hebrew transcript (typically dictated via Web Speech API)
 * and returns structured invoice fields ready to drop into the form.
 *
 * Uses Claude Haiku 4.5 — cheap + fast. Single non-streaming call, JSON output.
 */

const SYSTEM_PROMPT = `אתה מסייע ב-CountMe להוצאת חשבוניות לעצמאיים בישראל.
תקבל תיאור בעברית של חשבונית או קבלה בשפה חופשית, ועליך להחזיר אובייקט JSON תקין בלבד עם השדות הבאים:

{
  "customerName": string,        // שם הלקוח (חברה או אדם פרטי). מחרוזת ריקה אם חסר.
  "customerTaxId": string,        // ת.ז. (9 ספרות) או ח.פ. (9 ספרות). מחרוזת ריקה אם לא צוין.
  "description": string,          // תיאור השירות/המוצר. אם לא צוין במפורש, נסח קצר על בסיס ההקשר.
  "amount": number,               // סכום בשקלים כמספר שלם. אם נאמר "חמשת אלפים" החזר 5000. אם נאמר "חמש מאות" החזר 500. אם לא צוין, החזר 0.
  "category": string,             // קטגוריה כללית: "ייעוץ", "עיצוב", "פיתוח", "הדרכה" וכו'. מחרוזת ריקה אם לא ברור.
  "docType": "tax-invoice-receipt" | "receipt"  // אם המשתמש אמר "קבלה" בלבד → "receipt", אחרת ברירת מחדל "tax-invoice-receipt".
}

חוקים:
- החזר JSON תקין בלבד, ללא כל טקסט נוסף, ללא markdown, ללא הסבר.
- סכומים: עוסק מורשה מציין סכום לפני מע"מ, עוסק פטור מציין סכום סופי. במקרה ספק החזר את הסכום שהוזכר כפי שהוא.
- אם המשתמש אמר "חשבונית" סתם → docType = "tax-invoice-receipt".
- שמות בעברית/אנגלית — שמור על האיות המקורי.
- אם השדה חסר, החזר מחרוזת ריקה (או 0 ל-amount), אל תמציא.`;

const checkRateLimit = createRateLimiter(12);

interface ParsedInvoice {
  customerName: string;
  customerTaxId: string;
  description: string;
  amount: number;
  category: string;
  docType: "tax-invoice-receipt" | "receipt";
}

function isValidParsed(x: unknown): x is ParsedInvoice {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.customerName === "string" &&
    typeof o.customerTaxId === "string" &&
    typeof o.description === "string" &&
    typeof o.amount === "number" &&
    typeof o.category === "string" &&
    (o.docType === "tax-invoice-receipt" || o.docType === "receipt")
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return Response.json({ error: "API key not configured" }, { status: 503 });
  }

  const rl = checkRateLimit(getClientIp(request));
  if (!rl.allowed) return rateLimitResponse(rl);

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
  if (typeof body.transcript !== "string") {
    return Response.json({ error: "transcript must be a string" }, { status: 400 });
  }
  const transcript = sanitizeText(body.transcript);
  if (transcript.length === 0) {
    return Response.json({ error: "transcript is empty" }, { status: 400 });
  }
  if (transcript.length > 1000) {
    return Response.json({ error: "transcript too long" }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: transcript }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ error: "No text response from model" }, { status: 502 });
    }

    // The model is instructed to return raw JSON; strip any accidental code fences.
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
