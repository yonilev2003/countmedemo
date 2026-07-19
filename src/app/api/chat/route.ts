import Anthropic from "@anthropic-ai/sdk";
import { MODEL_SONNET, logAiUsage } from "@/lib/ai/models";
import { Persona } from "@/lib/persona";
import {
  EITAN_TOOLS,
  runEitanTool,
  buildRichContext,
} from "@/lib/agent/tools";
import { requireUserIfGated } from "@/lib/security/api-guard";
import {
  checkRateLimit,
  rateLimitResponse,
  resolveClientKey,
} from "@/lib/security/rate-limit";

const SYSTEM_PROMPT = `אתה המלווה הפיננסי של countme. אתה עוזר AI לעצמאים בישראל שממלאים דוח שנתי 1301.
אתה מכיר את כל נתוני המשתמש ואת הדוח שלו. תענה בעברית, בגוף שני נקבה, בצורה ידידותית ומקצועית.
תשובות קצרות וממוקדות. אל תשתמש בשום סימני markdown כמו כוכביות, מקפים, קווים, גרשיים כפולים.
כתוב טקסט רגיל בלבד. אפשר להשתמש בסוגריים ובפסיקים. אל תפתח תשובה עם מקף.
אם שאלה לא קשורה למיסים או עסק, ציין שאתה מתמחה בנושאים פיננסיים בלבד.`;

// Rate limiting via the shared in-memory limiter (lib/security/rate-limit):
// per-instance only on serverless — see its JSDoc for durable follow-ups.
const RATE_LIMIT_MAX_REQUESTS = 12; // per client per minute

/* ──────────────────────────────────────────────────────────
   Input validation — narrow JSON body to expected shape.
   Reject early on malformed input so we don't pay Anthropic
   for noise.
   ────────────────────────────────────────────────────────── */
const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_ITEMS = 40;
const MAX_HISTORY_ITEM_CHARS = 4000;

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

  return { ok: true, body: { message, history, persona: r.persona as Persona } };
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return Response.json({ error: "API key not configured" }, { status: 503 });
  }

  // Rate limit BEFORE parsing/validating the body — cheapest reject possible
  const rl = checkRateLimit("chat", resolveClientKey(request), RATE_LIMIT_MAX_REQUESTS);
  if (!rl.allowed) {
    return rateLimitResponse(rl.retryAfter);
  }

  // Auth gate (no-op while AUTH_GATING_ENABLED is off) — after the limiter,
  // before we spend a Supabase round-trip or Anthropic tokens.
  const guard = await requireUserIfGated(request);
  if (guard.denied) return guard.denied;

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

  // Build messages: last 10 turns from history + current user message
  const trimmedHistory = history.slice(-20); // 20 items = 10 turns
  const messages: Anthropic.MessageParam[] = [
    ...trimmedHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  const anthropic = new Anthropic({ apiKey });
  // Richer computed snapshot (runs the calculators) instead of a flat persona echo.
  const personaContext = buildRichContext(persona);
  const MAX_TOOL_ROUNDS = 4;

  // Two cached system blocks: stable instructions + the computed snapshot.
  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    { type: "text", text: personaContext, cache_control: { type: "ephemeral" } },
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
            model: MODEL_SONNET,
            max_tokens: 1024,
            system: systemBlocks,
            messages,
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
                  content: runEitanTool(
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

        logAiUsage({ route: "chat", model: MODEL_SONNET, rounds: roundsDone, ...usageTotal });
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
