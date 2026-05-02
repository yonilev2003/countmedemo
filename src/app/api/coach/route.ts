import Anthropic from "@anthropic-ai/sdk";
import { Persona } from "@/lib/persona";
import { TAX_YEAR_2024 } from "@/lib/calculators/types";

/**
 * /api/coach — standalone expense coach chat (separate from /api/chat which is
 * the form-filling assistant on /demo). Two modes:
 *   - "audit"    : pre-submission review for someone who already has expense data
 *   - "discover" : exploratory conversation for new self-employed users
 *
 * Knowledge sourced from the israeli-tax-returns + israeli-expense-categorizer
 * skills (Pkudat Mas Hachnasa 2024).
 */

const SYSTEM_AUDIT = `אתה מאמן ההוצאות של countme בתפקיד מבקר טרום-הגשה.
המשתמשת יש לה דוח הוצאות והיא עומדת להגיש דוח שנתי 1301 לרשות המסים בישראל.
המטרה שלך: לוודא שלא פיספסה שום הוצאה מוכרת, ושהכל מסווג נכון לפי פקודת מס הכנסה 2024.

חוקי הוצאות עיקריים שצריך לעבור עליהם:
משרד ביתי - חלק יחסי משכר דירה, חשמל, מים, ארנונה, אינטרנט (לפי שטח חדר העבודה ביחס לדירה).
רכב לעבודה - 45% מהוצאות הרכב המעורבות (דלק, ביטוח, רישוי, תיקונים, חניות).
טלפון ואינטרנט - 80% (שימוש מעורב עסקי-פרטי).
ציוד הון - מחשב לפטופ פחת על 3 שנים, ציוד מקצועי 5 שנים.
תוכנות ומנויים מקצועיים - 100% (Adobe, GitHub, Notion, Claude Pro, Figma).
השתלמות מקצועית - 100% (קורסים, כנסים, ספרים, סופרוויזיה).
ייעוץ מקצועי - 100% (רו"ח, עו"ד, יועץ עסקי).
ארוחות עם לקוחות - 50% עד תקרה של 80 ש"ח ליום.
ביטוח אחריות מקצועית - 100%.
קרן השתלמות לעצמאי - עד 4.5% מהמחזור, תקרה שנתית 19,920 ש"ח ל-2024.
פנסיה לעצמאי - חובה, מוכרת לזיכוי בסעיף 47.
ביטוח לאומי לעצמאי - 52% מהתשלום מוכר לניכוי.
תרומות לפי סעיף 46 - 35% זיכוי מס.
שכירות חדר טיפול או קליניקה - 100% אם החדר רק לעבודה.

איך לעבוד:
שאל שאלה אחת בכל פעם, לא רשימה ארוכה. היה חמים אך מקצועי. גוף שני נקבה כברירת מחדל.
התחל מהדברים שהכי הרבה שוכחים: משרד ביתי, רכב, השתלמויות, תרומות, קרן השתלמות.
כשתגלה הוצאה שלא דווחה - תציין בקצרה כמה היא יכולה לחסוך (אחוז ניכוי או זיכוי).
אחרי 6-8 שאלות, סכם בנקודות מה גילית, ותגיד שאפשר לחזור לטופס 1301 בכתובת /demo.
אם המשתמשת רוצה לראות מדריך מלא להוצאות לעיסוק שלה, הפנה אותה ל /business-expenses.

צירוף קבצים:
המשתמשת יכולה לצרף לך קבלות (תמונות JPG/PNG) או דוחות PDF. אתה רואה אותם ישירות.
כשהיא מצרפת קובץ, נתח אותו: זהה את המוכר, סוג ההוצאה, סכום, תאריך, ועוסק/מע"מ אם רשום.
תגיד לה אם זה נראה לך הוצאה מוכרת לעסק, ובאיזה אחוז (100%, 80%, 45%, וכו').
אם הקבלה לא בעברית או לא ברורה, תציין זאת ותבקש פרטים נוספים.

חוקי כתיבה:
עברית בלבד. בלי markdown, בלי כוכביות, בלי קווים, בלי כוכבי כותרת.
טקסט נקי בלבד. אפשר פסיקים וסוגריים. אל תפתח תשובה עם מקף.
אל תכתוב רשימות עם תוויות כמו "1." או "א." - כתוב כמשפטים זורמים.`;

const SYSTEM_DISCOVER = `אתה מאמן ההוצאות של countme בתפקיד יועץ-לעצמאי-מתחיל.
המשתמשת בדיוק התחילה עסק עצמאי בישראל ולא יודעת אילו הוצאות מוכרות לה.
המטרה שלך: לגלות יחד איתה אילו הוצאות מוכרות יש לה דרך שגרת היומיום שלה.
חשוב במיוחד לחשוף הוצאות שהרבה עצמאים לא חושבים עליהן.

תחומי חקירה (אל תרוץ עליהם בסדר קבוע, היה דינמי לפי התשובות):
עבודה מהבית - הדירה יכולה להיות מוגדרת כמשרד; חלק יחסי משכר הדירה לפי שטח חדר עבודה. למשל אם החדר 12 מ"ר מתוך דירה 80 מ"ר, אז 15% מהשכ"ד מוכר. רוב העצמאים לא יודעים את זה.
רכב לעבודה - 45% מכל הוצאות הרכב מוכרות אם הוא משמש גם לעסק. דלק, ביטוח, רישוי, תיקונים.
טלפון ואינטרנט - 80% מוכרים. גם הסלולר וגם האינטרנט הביתי.
ציוד עבודה - מחשב, לפטופ, מסך, כיסא משרדי, אוזניות. פחת על 3-5 שנים.
תוכנות ומנויים - 100% מוכר. Adobe, GitHub, Notion, Claude Pro, Figma, Zoom.
השתלמות והכשרות - 100% מוכר. קורסים, כנסים, ספרי מקצוע, מנויים לפלטפורמות לימוד.
ייעוץ מקצועי - 100% מוכר. רו"ח, עו"ד, יועץ עסקי.
ארוחות עם לקוחות - 50% עד תקרה של 80 ש"ח ליום.
ביטוח אחריות מקצועית - 100% מוכר.
קרן השתלמות לעצמאי - עד 4.5% מהמחזור (תקרה 19,920 ש"ח ב-2024). חיסכון מדהים במס.
פנסיה לעצמאי - חובה לפי חוק. מזכה בסעיף 47.
ביטוח לאומי לעצמאי - 52% מהתשלום מוכר לניכוי.
תרומות לפי סעיף 46 - 35% זיכוי מס. רוב העצמאים לא דורשים את זה.

איך לעבוד:
שאל שאלה אחת בכל פעם, ב-1-2 משפטים. בנה על התשובות הקודמות, לא תסריט קבוע.
התחל פתוח: שאל איפה היא עובדת ובאיזה תחום, ומשם תתפתח השיחה.
היה חם וסקרן, לא מרצה. אסור להגיש רשימה ארוכה בבת אחת.
כשהיא נותנת תשובה, תציין בקצרה איזו הוצאה זה פותח לה ואיך זה עובד (1-2 משפטים).
אחרי 6-8 שאלות, סכם בנקודות מה גילית. הצע: "אם רוצה לראות מדריך מלא לעיסוק שלך, יש בdemo את הדף /business-expenses".

דוגמאות לשאלות פתיחה טובות:
"איפה את עובדת ביום-יום? בבית, בחלל עבודה, או אצל לקוחות?"
"בוא נתחיל - באיזה תחום העסק שלך?"

דוגמאות למה שאסור:
לא לשאול "אילו הוצאות יש לך?" - זה דורש ממנה לדעת מראש את התשובה.
לא לתת רשימה של 13 קטגוריות לפני שביררת מספיק.
לא לכתוב פסקה ארוכה - שאלה אחת ממוקדת.

צירוף קבצים:
המשתמשת יכולה לצרף קבלה (תמונה) או PDF. אתה רואה אותם ישירות.
כשהיא מצרפת קבלה, נתח: מוכר, מה נקנה, סכום, תאריך. תגיד לה אם זה נראה הוצאה מוכרת לעסק שלה ובאיזה אחוז.
זו הזדמנות מצוינת ללמד אותה - כל קבלה היא דוגמה קונקרטית של הכלל הכללי.

חוקי כתיבה:
עברית בלבד, גוף שני נקבה כברירת מחדל.
בלי markdown, בלי כוכביות, בלי קווים, בלי תווי כותרת.
טקסט נקי בלבד. אפשר פסיקים וסוגריים. אל תפתח תשובה עם מקף.
אל תכתוב רשימות ממוספרות - השתמש במשפטים זורמים.`;

/* ──────────────────────────────────────────────────────────
   Rate limiting — same shape as /api/chat. Separate bucket so
   coach + form-filling chats don't share a budget.
   ────────────────────────────────────────────────────────── */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const ipBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    if (ipBuckets.size > 1000) {
      for (const [k, v] of ipBuckets.entries()) {
        if (now > v.resetAt) ipBuckets.delete(k);
      }
    }
    return { allowed: true };
  }
  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true };
}

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_ITEMS = 40;
const MAX_HISTORY_ITEM_CHARS = 4000;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB after base64 decode
const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const;
type AttachmentMediaType = (typeof ALLOWED_ATTACHMENT_TYPES)[number];

interface Attachment {
  name: string;
  mediaType: AttachmentMediaType;
  /** Base64-encoded file content (without the data: prefix). */
  data: string;
}

interface ValidatedBody {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  mode: "audit" | "discover";
  persona?: Persona;
  attachment?: Attachment;
}

function validateBody(
  raw: unknown,
): { ok: true; body: ValidatedBody } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Body must be an object" };
  }
  const r = raw as Record<string, unknown>;

  if (typeof r.message !== "string") {
    return { ok: false, error: "message must be a string" };
  }
  const message = r.message
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
  if (message.length === 0) return { ok: false, error: "message is empty" };
  if (message.length > MAX_MESSAGE_CHARS) {
    return { ok: false, error: `message exceeds ${MAX_MESSAGE_CHARS} chars` };
  }

  if (r.mode !== "audit" && r.mode !== "discover") {
    return { ok: false, error: "mode must be 'audit' or 'discover'" };
  }

  if (!Array.isArray(r.history)) {
    return { ok: false, error: "history must be an array" };
  }
  if (r.history.length > MAX_HISTORY_ITEMS) {
    return { ok: false, error: `history exceeds ${MAX_HISTORY_ITEMS} items` };
  }
  const history: { role: "user" | "assistant"; content: string }[] = [];
  for (const item of r.history) {
    if (typeof item !== "object" || item === null) {
      return { ok: false, error: "history item must be an object" };
    }
    const it = item as Record<string, unknown>;
    if (it.role !== "user" && it.role !== "assistant") {
      return { ok: false, error: "history role must be user or assistant" };
    }
    if (typeof it.content !== "string") {
      return { ok: false, error: "history content must be a string" };
    }
    if (it.content.length > MAX_HISTORY_ITEM_CHARS) {
      return { ok: false, error: "history item too long" };
    }
    history.push({ role: it.role, content: it.content });
  }

  let persona: Persona | undefined;
  if (r.persona !== undefined && r.persona !== null) {
    if (typeof r.persona !== "object") {
      return { ok: false, error: "persona must be an object if provided" };
    }
    persona = r.persona as Persona;
  }

  let attachment: Attachment | undefined;
  if (r.attachment !== undefined && r.attachment !== null) {
    if (typeof r.attachment !== "object") {
      return { ok: false, error: "attachment must be an object" };
    }
    const a = r.attachment as Record<string, unknown>;
    if (typeof a.name !== "string" || a.name.length === 0 || a.name.length > 200) {
      return { ok: false, error: "attachment.name invalid" };
    }
    if (
      typeof a.mediaType !== "string" ||
      !ALLOWED_ATTACHMENT_TYPES.includes(a.mediaType as AttachmentMediaType)
    ) {
      return {
        ok: false,
        error: "attachment.mediaType must be image (jpeg/png/gif/webp) or PDF",
      };
    }
    if (typeof a.data !== "string" || a.data.length === 0) {
      return { ok: false, error: "attachment.data must be a base64 string" };
    }
    // Rough byte-size check from base64 length (4 base64 chars ≈ 3 bytes)
    const approxBytes = Math.floor((a.data.length * 3) / 4);
    if (approxBytes > MAX_ATTACHMENT_BYTES) {
      return { ok: false, error: "attachment exceeds 5MB" };
    }
    attachment = {
      name: a.name,
      mediaType: a.mediaType as AttachmentMediaType,
      data: a.data,
    };
  }

  return {
    ok: true,
    body: { message, history, mode: r.mode, persona, attachment },
  };
}

function buildPersonaContext(persona: Persona): string {
  const p = persona;
  const bituachPaid = p.deductionsAndCredits.bituachLeumiSelfEmployed.annualPaid;
  const bituachDeductible = Math.round(
    bituachPaid * TAX_YEAR_2024.bituachLeumiDeductibleRate,
  );
  return `נתוני המשתמשת מהדוח שלה:
שם: ${p.personal.firstName} ${p.personal.lastName}
עסק: ${p.business.tradeName}, ${p.business.primaryOccupation}
סוג עוסק: ${p.business.osekType}${p.business.isOsekZeir ? " (מסלול עוסק זעיר)" : ""}
מחזור שנתי: ${p.income.totalRevenue.toLocaleString("he-IL")} ש"ח
הוצאות מוכרות שכבר דווחו: ${p.income.totalDeductibleExpenses.toLocaleString("he-IL")} ש"ח
ביטוח לאומי ששולם: ${bituachPaid.toLocaleString("he-IL")} ש"ח (מוכר ${bituachDeductible.toLocaleString("he-IL")} ש"ח)
קרן השתלמות: ${p.deductionsAndCredits.kerenHishtalmut.annualContribution.toLocaleString("he-IL")} ש"ח

כשאת חוקרת איתה, התייחסי לנתונים האלה. אם משהו חסר או נמוך משמעותית מהצפוי לעיסוק שלה, ציון את זה.`;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return Response.json({ error: "API key not configured" }, { status: 503 });
  }

  const ip = getClientIp(request);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return Response.json(
      { error: "יותר מדי בקשות. נסי שוב בעוד כמה שניות." },
      {
        status: 429,
        headers: rl.retryAfter ? { "Retry-After": String(rl.retryAfter) } : undefined,
      },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validated = validateBody(raw);
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 });
  }

  const { message, history, mode, persona, attachment } = validated.body;

  const trimmedHistory = history.slice(-20);

  // Build the current user turn. If a file is attached, include it as a vision
  // content block alongside the text — Claude can read receipts and PDFs directly.
  let currentTurnContent: Anthropic.MessageParam["content"];
  if (attachment) {
    const blocks: Anthropic.ContentBlockParam[] = [];
    if (attachment.mediaType === "application/pdf") {
      blocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: attachment.data,
        },
      });
    } else {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: attachment.mediaType,
          data: attachment.data,
        },
      });
    }
    blocks.push({ type: "text", text: message });
    currentTurnContent = blocks;
  } else {
    currentTurnContent = message;
  }

  const messages: Anthropic.MessageParam[] = [
    ...trimmedHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: currentTurnContent },
  ];

  const anthropic = new Anthropic({ apiKey });
  const baseSystem = mode === "audit" ? SYSTEM_AUDIT : SYSTEM_DISCOVER;

  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: baseSystem,
      cache_control: { type: "ephemeral" },
    },
  ];
  if (persona && mode === "audit") {
    systemBlocks.push({
      type: "text",
      text: buildPersonaContext(persona),
      cache_control: { type: "ephemeral" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        const anthropicStream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: systemBlocks,
          messages,
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            enqueue(event.delta.text);
          }
        }

        enqueue("[DONE]");
        controller.close();
      } catch (err) {
        const msg =
          err instanceof Anthropic.APIError
            ? `שגיאה מה-API: ${err.message}`
            : "אירעה שגיאה בלתי צפויה. נסי שוב.";
        enqueue(`[ERROR] ${msg}`);
        enqueue("[DONE]");
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
