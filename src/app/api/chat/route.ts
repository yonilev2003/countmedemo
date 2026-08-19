import Anthropic from "@anthropic-ai/sdk";
import { MODEL_SONNET, MODEL_HAIKU, logAiUsage, withMessageCacheBreakpoint } from "@/lib/ai/models";
import { dailyUserCap, getBudgetState } from "@/lib/ai/usage";
import { Persona } from "@/lib/persona";
import {
  EITAN_TOOLS,
  runEitanTool,
  buildRichContext,
  renderKnowledgeToc,
} from "@/lib/agent/tools";
import { requireUserIfGated } from "@/lib/security/api-guard";
import {
  checkRateLimit,
  checkRateLimitDurable,
  rateLimitResponse,
  resolveClientKey,
} from "@/lib/security/rate-limit";

const SYSTEM_PROMPT = `אתה שקל — השותף הדיגיטלי של countme. אתה עוזר AI לעצמאים בישראל שממלאים דוח שנתי 1301.
אם שואלים אותך מי אתה או מה שמך: שמך שקל, המלווה הפיננסי של countme (אותה דמות שמופיעה בצ'אט הראשי).
אתה מכיר את כל נתוני המשתמש ואת הדוח שלו. תענה בעברית, בגוף שני נקבה, בצורה ידידותית ומקצועית.
תשובות קצרות וממוקדות. אל תשתמש בשום סימני markdown כמו כוכביות, מקפים, קווים, גרשיים כפולים.
כתוב טקסט רגיל בלבד. אפשר להשתמש בסוגריים ובפסיקים. אל תפתח תשובה עם מקף.
אם שאלה לא קשורה למיסים או עסק, ציין שאתה מתמחה בנושאים פיננסיים בלבד.
אם קראת לכלי get_ceiling_status וקיבלת סטטוס warning, critical או exceeded, ציין זאת ביוזמתך באחת התשובות הקרובות גם אם לא נשאלת על כך במפורש — חציית תקרת עוסק פטור/זעיר מחייבת רישום כעוסק מורשה ואיבוד ההטבות ללא יוצא מן הכלל, וזו עובדה שחשוב שהמשתמש/ת ידע/תדע גם בלי לשאול.
אתה מחשבון מדויק, לא ייעוץ מס — האחריות על ההגשה לרשות המסים היא של המשתמש/ת, ושאלה שדורשת שיקול דעת מקצועי מקומה אצל רואה חשבון או יועץ מס מוסמך. אל תמציא נתונים או כללים — אם אינך בטוח, אמור זאת במפורש והפנה לבדיקה מקצועית.`;

// Rate limiting via the shared in-memory limiter (lib/security/rate-limit):
// per-instance only on serverless — see its JSDoc for durable follow-ups.
const RATE_LIMIT_MAX_REQUESTS = 12; // per client per minute

/* ──────────────────────────────────────────────────────────
   Input validation — narrow JSON body to expected shape.
   Reject early on malformed input so we don't pay Anthropic
   for noise.
   ────────────────────────────────────────────────────────── */
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

interface ValidatedBody {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  persona: Persona;
}

function validateBody(raw: unknown): { ok: true; body: ValidatedBody } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Body must be an object" };
  }
  const r = raw as Record<string, unknown>;

  if (typeof r.message !== "string") {
    return { ok: false, error: "message must be a string" };
  }
  // Strip control chars (except newline/tab) — simple sanitization
  const message = r.message.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  if (message.length === 0) return { ok: false, error: "message is empty" };
  if (message.length > MAX_MESSAGE_CHARS) {
    return { ok: false, error: `message exceeds ${MAX_MESSAGE_CHARS} chars` };
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

  if (typeof r.persona !== "object" || r.persona === null) {
    return { ok: false, error: "persona must be an object" };
  }
  // Minimal persona shape check — enough to build the system prompt without crashing
  const p = r.persona as Record<string, unknown>;
  if (
    typeof p.personal !== "object" ||
    typeof p.income !== "object" ||
    typeof p.business !== "object" ||
    typeof p.deductionsAndCredits !== "object" ||
    typeof p.vatAndTurnover !== "object"
  ) {
    return { ok: false, error: "persona missing required sections" };
  }

  return { ok: true, body: { message, history: boundedHistory, persona: r.persona as Persona } };
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return Response.json({ error: "API key not configured" }, { status: 503 });
  }

  // Rate limit BEFORE parsing/validating the body — cheapest reject possible.
  // In-memory first (catches an obvious flood without even an IP→user
  // resolution, let alone a Supabase round-trip).
  const ipKey = resolveClientKey(request);
  const rl = checkRateLimit("chat", ipKey, RATE_LIMIT_MAX_REQUESTS);
  if (!rl.allowed) {
    return rateLimitResponse(rl.retryAfter);
  }

  // Auth gate (no-op while AUTH_GATING_ENABLED is off) — after the cheap
  // limiter, before any further DB round-trip or Anthropic tokens.
  const guard = await requireUserIfGated(request);
  if (guard.denied) return guard.denied;
  const userId = guard.user?.id ?? null;

  // Durable cross-instance per-minute limit — keyed by the authenticated
  // user when we have one (stable across IPs/devices, can't be rotated by
  // switching networks), IP otherwise (resolveClientKey's fallback). This
  // route calls Claude, so it's worth the one extra DB round-trip (see
  // checkRateLimitDurable's JSDoc).
  const clientKey = resolveClientKey(request, userId);
  const rlDurable = await checkRateLimitDurable("chat", clientKey, RATE_LIMIT_MAX_REQUESTS);
  if (!rlDurable.allowed) {
    return rateLimitResponse(rlDurable.retryAfter);
  }

  // Per-user daily cap (v2 plan 2.2) — same key as the per-minute check
  // above, separate namespace/window (86400s) so the two don't share a
  // bucket. Falls back to the IP-keyed bucket when auth gating is off.
  const dailyCap = dailyUserCap("chat");
  const rlDaily = await checkRateLimitDurable("chat-daily", clientKey, dailyCap, 86_400);
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

  const { message, history, persona } = validated.body;

  // history is already bounded (count + per-item chars + total-char budget)
  // by validateBody() — no further trimming needed here.
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  const anthropic = new Anthropic({ apiKey });
  // Richer computed snapshot (runs the calculators) instead of a flat persona echo.
  const personaContext = buildRichContext(persona);
  const MAX_TOOL_ROUNDS = 4;

  // Model for this request: Haiku when the global budget is "degraded"
  // (manual kill-switch or spend threshold), Sonnet otherwise. NOTE: the
  // model string is part of the prompt-cache key (see models.ts) — a
  // degraded request simply misses the Sonnet cache for this turn, which is
  // an accepted cost, not a correctness issue.
  const model = budgetState === "degraded" ? MODEL_HAIKU : MODEL_SONNET;
  if (budgetState === "degraded") {
    // Streaming SSE contract only recognizes "[DONE]"/"[ERROR] " control
    // lines (see chat-panel.tsx) — anything else lands in the visible
    // reply, so we log instead of adding a user-visible note here.
    console.log("[ai-usage] chat: degraded to Haiku for this request (budget threshold)");
  }

  // Three cached system blocks: stable instructions + the computed snapshot +
  // the knowledge-vault TOC (RAG audit #20 — build-time constant, so this
  // block is byte-stable across requests and caches like the other two).
  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    { type: "text", text: personaContext, cache_control: { type: "ephemeral" } },
    { type: "text", text: renderKnowledgeToc(), cache_control: { type: "ephemeral" } },
  ];

  // Build a ReadableStream that pipes Anthropic SSE deltas as our own SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const enqueue = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        // Tool-use loop (persona is always present here): stream each turn's text;
        // on tool_use, run the tools and feed results back. Bounded rounds.
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
            ...(round < MAX_TOOL_ROUNDS ? { tools: EITAN_TOOLS } : {}),
          });

          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              // JSON-encode so newlines in a delta don't break SSE framing.
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

          if (round < MAX_TOOL_ROUNDS && final.stop_reason === "tool_use") {
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
                    persona,
                  ),
                });
              }
            }
            messages.push({ role: "user", content: toolResults });
            continue;
          }

          break;
        }

        logAiUsage({ route: "chat", model, rounds: roundsDone, userId, ...usageTotal });
        enqueue("[DONE]");
        controller.close();
      } catch (err) {
        // Emit a Hebrew error message as a final SSE chunk so the client can display it
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
