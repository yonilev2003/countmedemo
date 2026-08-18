import Anthropic from "@anthropic-ai/sdk";
import { MODEL_SONNET, MODEL_HAIKU, logAiUsage, withMessageCacheBreakpoint } from "@/lib/ai/models";
import { dailyUserCap, getBudgetState } from "@/lib/ai/usage";
import { renderEitanConstants, renderKnowledgeCatalog } from "@/lib/agent/knowledge";
import { Persona } from "@/lib/persona";
import {
  EITAN_TOOLS,
  runEitanTool,
  buildRichContext,
} from "@/lib/agent/tools";
import { requireUserIfGated } from "@/lib/security/api-guard";
import {
  checkRateLimit,
  checkRateLimitDurable,
  rateLimitResponse,
  resolveClientKey,
} from "@/lib/security/rate-limit";

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

// Persona + scope lines below follow docs/reviews/2026-07-02-ws8-copy-audit.md
// (O2 identity line, O3 home-office transparency, O4 clothing/interpretation rule).
// The explicit clothing-deductibility sentence in "מבחן ייצור הכנסה" is newly
// authored — DRAFT — NEEDS LEGAL REVIEW.
const SYSTEM_EITAN = `אתה שקל — השותף הדיגיטלי של countme לעצמאיים בישראל.

זהות וטון:
אח חכם, בגובה העיניים, אחראי. אתה עוזר לה/לו להבין מה קורה בעסק — לא מחליף ייעוץ מקצועי. כשעולה שאלה שדורשת שיקול דעת של רואה חשבון או יועץ מס (סיווג חריג, מס שבח, מבנה עסקי, ביקורת), אמור זאת ישירות ובחום — בלי לוותר על הטון.
עברית בלבד. גוף שני נקבה כברירת מחדל (אם ידוע שזה גבר, עבור לגוף שני זכר).
בלי markdown, בלי כוכביות, בלי קווים. טקסט נקי. שאלה אחת בכל פעם.

עובדות, לא ייעוץ: תפקידך להציג עובדות, מספרים וכללים — לא לתת המלצות מה לעשות. אל תשתמש במילים "מומלץ", "כדאי", "עדיף", "צריך", "רצוי" או "שווה". כשהנתונים מצביעים על משהו, ציין את העובדה במספרים ותן למשתמש/ת להחליט.

אתה לא מחשב — אף פעם:
כל ערך מחושב (שדה בדוח, אומדן מס, זיכוי, יתרה, השוואת מסלולים) מגיע אך ורק מהכלים שלרשותך (get_form_value, get_tax_estimate, get_upcoming_deadlines, get_ceiling_status). כל אחוז, תקרה או שיעור — אך ורק מטבלת הקבועים המצורפת. אל תבצע חשבון בעצמך ואל תצטט מספר מהזיכרון; אם אין כלי או קבוע שנותן את המספר — אמור שאינך יכול לחשב זאת כאן.

כשאתה לא יודע (החלטת מוצר 19/07):
בשאלות ידע (חוקים, כללים, מקרים חריגים) שאין להן תשובה במאגר הידע, בקבועים או בכלים — אמור בפשטות שאתה מערכת חדשה וייתכן שהמידע שלך חסר, והצג את מה שכן ידוע לך תוך סימון ההבדל. בתקלות טכניות במערכת או בעיות בחשבון — הפנה למייל countme5555@gmail.com. אל תמציא.

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
בדוק שדה אחרי שדה עם הכלי get_form_value: הכנסות (150), מחזור (238), ביטוח לאומי (030), קרן השתלמות (137), פנסיה, תרומות (046).
הצג כל שדה עם הערך שהכלי החזיר ושאל "זה נראה נכון?"

משרד ביתי:
אם המשתמש/ת עובד/ת מהבית — קיים כלל של הכרה בחלק יחסי מהוצאות הבית (חשמל, מים, ארנונה, אינטרנט) לפי היחס של שטח העבודה. ההכרה תלוית נסיבות ותיעוד — הצג את העיקרון, ציין שהחישוב המדויק נעשה בדוח, ואל תחשב בעצמך.

תרומות סעיף 46:
שאל פרואקטיבית בסוף הגילוי. השיעור, הרצפה והתקרה — בטבלת הקבועים. לחישוב הזיכוי בפועל — הכלי get_form_value עם שדה 046. אל תכפיל בעצמך.

מבחן ייצור הכנסה:
לפני שאתה דוחה הוצאה, שאל האם היא נדרשת לייצור הכנסה. מאפר עם iCloud לניהול תיק לקוחות — זו תשתית שיווקית. כשההכרה תלויה בפרשנות (ביגוד, אירוח, נסיעות מעורבות) — הצג את הכלל, ציין שההכרה תלוית-נסיבות, ואל תפסוק. שים לב: ביגוד רגיל אינו מוכר בדרך כלל — רק ביגוד ייעודי לעבודה שלא ניתן ללבוש ביומיום.

מסלול עוסק זעיר:
התקרה ושיעור ההכרה האוטומטית — בטבלת הקבועים. עובדות בלבד, בלי להמליץ אם להיכנס או לצאת. להשוואה מספרית בין המסלול להוצאות בפועל — הכלי get_ceiling_status או get_tax_estimate; הצג את שני המספרים שהכלי החזיר ותן למשתמש/ת להסיק. אם המשתמש/ת כבר במסלול והנתונים מראים אחרת — ציין את העובדה בנייטרליות.

קבצים מצורפים:
המשתמש/ת יכול/ה לצרף קבלות (JPG/PNG) או דוחות PDF. אתה רואה אותם ישירות.
כשמצרפ/ת קובץ: זהה מוכר, מה נקנה, סכום, תאריך, מספר עוסק/מע"מ אם מופיע.
לגבי הכרה: ציין אם ההוצאה נראית עסקית ומאיזה סוג (מלאה / חלקית / פחת), בלי לנקוב באחוז מספרי — האחוז המדויק נקבע לפי כללי ההכרה בדוח. אם הקבלה לא ברורה — בקש פרטים.

סיכום שיחה (כשהמשתמש/ת מבקש/ת):
תן סיכום בשלושה חלקים:
1. "הוצאות שמצאנו" — רשימה עם סכום וסוג ההכרה
2. "זיכוי תרומות" — אם יש תרומות, הצג את תוצאת הכלי לשדה 046
3. "בדיקת שלמות" — האם הכל מוכן להגשה?

חוקי כתיבה:
עברית בלבד. שאלה אחת בכל פעם. לא לפתוח עם מקף. לא רשימות ארוכות לפני שביררת.`;

const SYSTEM_DASHBOARD_INSIGHTS = `אתה שקל. אתה מסתכל על דשבורד הכספים של המשתמש/ת ומספק 2-3 תצפיות עובדתיות קצרות.
כל תצפית — משפט אחד עובדתי, עם מספר ספציפי אם רלוונטי. עובדות בלבד, לא המלצות.
אל תשתמש ב"מומלץ", "כדאי", "עדיף" או "צריך". ציין מה הנתונים מראים ותן למשתמש/ת להסיק.
דוגמאות: "ההוצאות על שיווק עלו ב-15% לעומת הרבעון הקודם."
"הרווח הנקי עלה ב-8% לעומת אוגוסט."
"טרם תועדו הפקדות לקרן השתלמות לשנה זו."
בלי markdown. שלוש נקודות מקסימום. עברית נקייה.`;

// Rate limiting via the shared limiter (lib/security/rate-limit). The "coach"
// namespace keeps a separate bucket so coach + form-filling chats don't share
// a budget. In-memory = per-instance on serverless — see the lib's JSDoc.
const RATE_LIMIT_MAX_REQUESTS = 12; // per client per minute

const MAX_MESSAGE_CHARS = 2000;
// History caps (2026-08-18 cost-guard pass, v2 plan 2.4): the `messages`
// array built from this history is resent to Anthropic on EVERY tool-loop
// round (initial call + up to MAX_TOOL_ROUNDS=4 retries below = up to 5
// calls per user turn), so every char kept here is billed up to 5x once
// tool use kicks in. Cut from 40/4000 to keep that multiplier bounded.
const MAX_HISTORY_ITEMS = 12;
const MAX_HISTORY_ITEM_CHARS = 2000;
// Total history budget in chars, enforced server-side in validateBody()
// regardless of how the client chunked it — oldest items are dropped first
// (newest kept), so a long conversation still costs a bounded amount per
// request even before the ×5 tool-loop multiplier above.
const MAX_HISTORY_TOTAL_CHARS = 8000;
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

  // Enforce the TOTAL char budget across the whole history, dropping the
  // OLDEST items first (keep the newest) — see MAX_HISTORY_TOTAL_CHARS'
  // comment above for the cost rationale. The per-item/per-count caps above
  // bound the worst case; this bounds the common case of many mid-sized items.
  let historyChars = 0;
  const boundedHistory: typeof history = [];
  for (let i = history.length - 1; i >= 0; i--) {
    historyChars += history[i].content.length;
    if (historyChars > MAX_HISTORY_TOTAL_CHARS && boundedHistory.length > 0) break;
    boundedHistory.unshift(history[i]);
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
    body: { message, history: boundedHistory, mode, persona, attachment },
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return Response.json({ error: "API key not configured" }, { status: 503 });
  }

  // Cheap in-memory IP limit first — catches an obvious flood before even
  // resolving a user.
  const ipKey = resolveClientKey(request);
  const rl = checkRateLimit("coach", ipKey, RATE_LIMIT_MAX_REQUESTS);
  if (!rl.allowed) {
    return rateLimitResponse(rl.retryAfter);
  }

  // Auth gate (no-op while AUTH_GATING_ENABLED is off) — after the cheap
  // limiter, before any further DB round-trip or Anthropic tokens.
  const guard = await requireUserIfGated(request);
  if (guard.denied) return guard.denied;
  const userId = guard.user?.id ?? null;

  // Durable cross-instance per-minute limit — keyed by the authenticated
  // user when we have one, IP otherwise (resolveClientKey's fallback).
  const clientKey = resolveClientKey(request, userId);
  const rlDurable = await checkRateLimitDurable("coach", clientKey, RATE_LIMIT_MAX_REQUESTS);
  if (!rlDurable.allowed) {
    return rateLimitResponse(rlDurable.retryAfter);
  }

  // Per-user daily cap (v2 plan 2.2) — same key as above, separate
  // namespace/window (86400s). Falls back to the IP-keyed bucket when auth
  // gating is off.
  const dailyCap = dailyUserCap("coach");
  const rlDaily = await checkRateLimitDurable("coach-daily", clientKey, dailyCap, 86_400);
  if (!rlDaily.allowed) {
    return rateLimitResponse(
      rlDaily.retryAfter,
      "הגעת/ה למכסת השיחות היומית עם שקל. אפשר להמשיך מחר.",
    );
  }

  // Global spend budget (v2 plan 2.3) — checked once per request. "paused"
  // stops the route outright; "degraded" swaps Sonnet for Haiku below
  // rather than blocking the request.
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

  const validated = validateBody(raw);
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 });
  }

  const { message, history, mode, persona, attachment } = validated.body;

  // history is already bounded (count + per-item chars + total-char budget)
  // by validateBody() — no further trimming needed here.
  const trimmedHistory = history;

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
  // Constants year: the persona's filing year when present (cache is shared
  // per-year cohort — byte-stable serialization in renderEitanConstants).
  const constantsYear = persona?.income?.year ?? 2025;
  const baseSystem =
    mode === "dashboard-insights"
      ? SYSTEM_DASHBOARD_INSIGHTS
      : `${SYSTEM_EITAN}\n\n${renderEitanConstants(constantsYear)}\n\n${renderKnowledgeCatalog()}`;

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

  // Model for this request: Haiku when the global budget is "degraded"
  // (manual kill-switch or spend threshold), Sonnet otherwise. NOTE: the
  // model string is part of the prompt-cache key (see models.ts) — a
  // degraded request simply misses the Sonnet cache for this turn, which is
  // an accepted cost, not a correctness issue.
  const model = budgetState === "degraded" ? MODEL_HAIKU : MODEL_SONNET;
  if (budgetState === "degraded") {
    // Streaming SSE contract only recognizes "[DONE]"/"[ERROR] " control
    // lines (same client parser as chat-panel.tsx) — anything else lands in
    // the visible reply, so we log instead of adding a user-visible note.
    console.log("[ai-usage] coach: degraded to Haiku for this request (budget threshold)");
  }

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
        const usageTotal = {
          input_tokens: 0,
          output_tokens: 0,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        };
        let roundsDone = 0;
        for (let round = 0; ; round++) {
          const anthropicStream = anthropic.messages.stream({
            model,
            max_tokens: 1024,
            system: systemBlocks,
            messages: withMessageCacheBreakpoint(messages),
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
          roundsDone = round + 1;
          usageTotal.input_tokens += final.usage.input_tokens;
          usageTotal.output_tokens += final.usage.output_tokens;
          usageTotal.cache_creation_input_tokens +=
            final.usage.cache_creation_input_tokens ?? 0;
          usageTotal.cache_read_input_tokens +=
            final.usage.cache_read_input_tokens ?? 0;

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
                  content: await runEitanTool(
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

        logAiUsage({ route: "coach", model, rounds: roundsDone, userId, ...usageTotal });
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
