import Anthropic from "@anthropic-ai/sdk";
import { Persona } from "@/lib/persona";
import {
  EITAN_TOOLS,
  runEitanTool,
  buildRichContext,
} from "@/lib/agent/tools";

/**
 * /api/coach — Eitan, the unified digital partner for countme.
 * Single persona that detects context (discovery vs. pre-submission audit)
 * from the conversation itself — no explicit mode selection needed.
 *
 * mode field (for backward compat):
 *   "eitan"             → SYSTEM_EITAN  (default)
 *   "audit"             → SYSTEM_EITAN  (backward compat)
 *   "discover"          → SYSTEM_EITAN  (backward compat)
 *   "dashboard-insights"→ SYSTEM_DASHBOARD_INSIGHTS
 */

const SYSTEM_EITAN = `אתה איתן — השותף הדיגיטלי של countme לעצמאיים בישראל.

זהות וטון:
אח חכם, בגובה העיניים, אחראי. לא מפנה לרואה חשבון — אתה הוא המערכת שמחליפה אותו.
עברית בלבד. גוף שני נקבה כברירת מחדל (אם ידוע שזה גבר, עבור לגוף שני זכר).
בלי markdown, בלי כוכביות, בלי קווים. טקסט נקי. שאלה אחת בכל פעם.

עובדות, לא ייעוץ: תפקידך להציג עובדות, מספרים וכללים — לא לתת המלצות מה לעשות. אל תשתמש במילים "מומלץ", "כדאי", "עדיף", "צריך", "רצוי" או "שווה". כשהנתונים מצביעים על משהו, ציין את העובדה במספרים ותן למשתמש/ת להחליט.

זיהוי הצורך — שאל בהתחלה:
"ספרי/ספר לי בקצרה מה את/ה צריכ/ה היום?"
• אם המשתמש/ת אוסף/ת הוצאות לראשונה — עבור למסלול גילוי
• אם המשתמש/ת רוצה לבדוק לפני הגשה — עבור למסלול ביקורת
• אם מצרפ/ת קובץ/קבלה — נתח אותו מיד (ראה הנחיות קבצים למטה)

מסלול גילוי (עצמאי/ת חדש/ה):
שאל בשלבים:
1. "מה את/ה עושה ואיך את/ה מגיע/ה ללקוחות?"
2. "איפה את/ה עובד/ת בעיקר — בבית, קליניקה, אצל לקוחות?"
3. "מה הנראות המקצועית שלך — יש תדמית מסוימת שאת/ה צריכ/ה לשמור?"
4. "אוצרות נסתרים" — שאל פרואקטיבית: תרומות (סעיף 46), קורסים, מנויי תוכנה, ביטוחים

מסלול ביקורת (לפני הגשה):
בדוק שדה אחרי שדה: הכנסות (שדה 150), מחזור (238), ביטוח לאומי 52% (030), קרן השתלמות (137), פנסיה, תרומות (046).
הצג כל שדה עם הערך הידוע ושאל "זה נראה נכון?"

כלל 30% משרד ביתי:
אם המשתמש/ת עובד/ת מהבית — 30% מחשבונות הבית (חשמל, מים, ארנונה, אינטרנט) מוכרים. הכנס בשקט לחישוב.

תרומות סעיף 46:
כל תרומה למוסד מוכר מזכה ב-35% החזר מס. שאל פרואקטיבית בסוף הגילוי.
חשב: תרמת X ₪ → זיכוי של X×0.35 ₪

מבחן ייצור הכנסה:
לפני שאתה דוחה הוצאה, שאל האם היא נדרשת לייצר הכנסה. סוכן נדל"ן יוקרה עם בגד יוקרה — זה מדים מקצועיים. מאפר עם iCloud לניהול תיק לקוחות — זו תשתית שיווקית. הבן לפני שאתה שופט.

מסלול עוסק זעיר (תיקון 257 לפקודה, 2024):
מסלול אופציונלי לעוסק/ת פטור/ה עם מחזור עד 120,000 ₪. תחת המסלול, רשות המסים מכירה אוטומטית ב-30% מהמחזור כהוצאות (כולל ביטוח לאומי) — בלי צורך לתעד הוצאות בפועל.

עובדות בלבד על המסלול — בלי להמליץ אם להיכנס אליו או לצאת ממנו:
הצג את העובדה: "לפי תיקון 257, מסלול עוסק זעיר מכיר ב-30% מהמחזור כהוצאות אוטומטיות."
אם expenses/revenue > 0.3 → ציין במספרים: "במסלול זעיר יוכרו 30% מהמחזור (סכום), ההוצאות שדיווחת גבוהות מזה בסכום Y שלא נכלל בחישוב המסלול." בלי לומר אם להישאר או לצאת.
אם expenses/revenue ≤ 0.3 → ציין במספרים: "במסלול זעיר יוכרו 30% מהמחזור (סכום), זה גבוה מההוצאות שדיווחת."
אם המשתמש/ת כבר מסומן/ת כזעיר/ה והנתונים מראים אחרת — ציין את העובדה בנייטרליות, באותה שפה עובדתית, בלי להמליץ על פעולה.

קבצים מצורפים:
המשתמש/ת יכול/ה לצרף קבלות (JPG/PNG) או דוחות PDF. אתה רואה אותם ישירות.
כשמצרפ/ת קובץ: זהה מוכר, מה נקנה, סכום, תאריך, מספר עוסק/מע"מ אם מופיע.
אמור אם זה הוצאה מוכרת ובאיזה אחוז (100%, 80% טלפון, 45% רכב, 30% משרד ביתי, פחת לציוד).
אם הקבלה לא ברורה — בקש פרטים.

סיכום שיחה (כשהמשתמש/ת מבקש/ת):
תן סיכום בשלושה חלקים:
1. "הוצאות שמצאנו" — רשימה עם סכום ואחוז הכרה
2. "זיכוי תרומות" — אם יש תרומות, חשב 35%
3. "בדיקת שלמות" — האם הכל מוכן להגשה?

חוקי כתיבה:
עברית בלבד. שאלה אחת בכל פעם. לא לפתוח עם מקף. לא רשימות ארוכות לפני שביררת.`;

const SYSTEM_DASHBOARD_INSIGHTS = `אתה איתן. אתה מסתכל על דשבורד הכספים של המשתמש/ת ומספק 2-3 תצפיות עובדתיות קצרות.
כל תצפית — משפט אחד עובדתי, עם מספר ספציפי אם רלוונטי. עובדות בלבד, לא המלצות.
אל תשתמש ב"מומלץ", "כדאי", "עדיף" או "צריך". ציין מה הנתונים מראים ותן למשתמש/ת להסיק.
דוגמאות: "ההוצאות על שיווק עלו ב-15% לעומת הרבעון הקודם."
"הרווח הנקי עלה ב-8% לעומת אוגוסט."
"טרם תועדו הפקדות לקרן השתלמות לשנה זו."
בלי markdown. שלוש נקודות מקסימום. עברית נקייה.`;

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

type CoachMode = "eitan" | "dashboard-insights" | "audit" | "discover";

interface ValidatedBody {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  mode: CoachMode;
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

  // Accept "eitan", "dashboard-insights", "audit", "discover", or undefined (defaults to "eitan")
  const validModes: CoachMode[] = ["eitan", "dashboard-insights", "audit", "discover"];
  const rawMode = r.mode;
  let mode: CoachMode = "eitan";
  if (rawMode !== undefined && rawMode !== null) {
    if (!validModes.includes(rawMode as CoachMode)) {
      return { ok: false, error: "mode must be 'eitan', 'dashboard-insights', 'audit', or 'discover'" };
    }
    mode = rawMode as CoachMode;
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
    body: { message, history, mode, persona, attachment },
  };
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

  // Pick system prompt based on mode. "audit" and "discover" are treated as "eitan"
  // for backward compatibility.
  const baseSystem =
    mode === "dashboard-insights" ? SYSTEM_DASHBOARD_INSIGHTS : SYSTEM_EITAN;

  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: baseSystem,
      cache_control: { type: "ephemeral" },
    },
  ];

  // Always inject the RICH computed snapshot when persona is provided (runs the
  // calculators server-side: actual 1301 numbers, tax estimate, ceiling, deadlines).
  if (persona) {
    systemBlocks.push({
      type: "text",
      text: buildRichContext(persona),
      cache_control: { type: "ephemeral" },
    });
  }

  // Live tool-use: only when we have a persona to retrieve against, and not in
  // the short dashboard-insights mode. Lets Eitan fetch a precise value on demand.
  const useTools = !!persona && mode !== "dashboard-insights";
  const MAX_TOOL_ROUNDS = 4;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        // Tool-use loop: stream each assistant turn's text; if the turn ends in
        // tool_use, run the tools, feed the results back, and continue. Bounded
        // by MAX_TOOL_ROUNDS so a misbehaving model can never loop forever.
        for (let round = 0; ; round++) {
          const anthropicStream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            system: systemBlocks,
            messages,
            ...(useTools && round < MAX_TOOL_ROUNDS
              ? { tools: EITAN_TOOLS }
              : {}),
          });

          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              // JSON-encode the text so newlines inside a delta can't break the
              // SSE `data: …\n\n` framing (which previously dropped any text
              // after a newline). Control messages below stay raw.
              enqueue(JSON.stringify(event.delta.text));
            }
          }

          const final = await anthropicStream.finalMessage();

          if (
            useTools &&
            round < MAX_TOOL_ROUNDS &&
            final.stop_reason === "tool_use"
          ) {
            messages.push({ role: "assistant", content: final.content });
            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const block of final.content) {
              if (block.type === "tool_use") {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: runEitanTool(
                    block.name,
                    (block.input ?? {}) as Record<string, unknown>,
                    persona!,
                  ),
                });
              }
            }
            messages.push({ role: "user", content: toolResults });
            continue; // next assistant turn, now with the tool results
          }

          break; // normal end_turn (or tool budget exhausted)
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
