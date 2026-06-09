import Anthropic from "@anthropic-ai/sdk";
import { Persona } from "@/lib/persona";
import {
  getClientIp,
  createRateLimiter,
  rateLimitResponse,
} from "@/lib/api/rate-limit";
import {
  HistoryItem,
  validateMessage,
  validateHistory,
} from "@/lib/api/chat-validation";
import { buildChatPersonaContext } from "@/lib/api/persona-context";
import { anthropicSSEResponse } from "@/lib/api/sse";

const SYSTEM_PROMPT = `אתה המלווה הפיננסי של countme. אתה עוזר AI לעצמאים בישראל שממלאים דוח שנתי 1301.
אתה מכיר את כל נתוני המשתמש ואת הדוח שלו. תענה בעברית, בגוף שני נקבה, בצורה ידידותית ומקצועית.
תשובות קצרות וממוקדות. אל תשתמש בשום סימני markdown כמו כוכביות, מקפים, קווים, גרשיים כפולים.
כתוב טקסט רגיל בלבד. אפשר להשתמש בסוגריים ובפסיקים. אל תפתח תשובה עם מקף.
אם שאלה לא קשורה למיסים או עסק, ציין שאתה מתמחה בנושאים פיננסיים בלבד.`;

const checkRateLimit = createRateLimiter(12);

interface ValidatedBody {
  message: string;
  history: HistoryItem[];
  persona: Persona;
}

function validateBody(raw: unknown): { ok: true; body: ValidatedBody } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Body must be an object" };
  }
  const r = raw as Record<string, unknown>;

  const msg = validateMessage(r.message);
  if (!msg.ok) return msg;

  const hist = validateHistory(r.history);
  if (!hist.ok) return hist;

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

  return {
    ok: true,
    body: { message: msg.message, history: hist.history, persona: r.persona as Persona },
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return Response.json({ error: "API key not configured" }, { status: 503 });
  }

  // Rate limit BEFORE parsing/validating the body — cheapest reject possible
  const rl = checkRateLimit(getClientIp(request));
  if (!rl.allowed) return rateLimitResponse(rl);

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
      role: m.role,
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  const anthropic = new Anthropic({ apiKey });
  const personaContext = buildChatPersonaContext(persona);

  return anthropicSSEResponse(() =>
    anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      // Single cache breakpoint on the LAST system block — it caches the whole
      // prefix (instructions + persona context) as one unit. Splitting into two
      // breakpoints kept each block under the 1024-token cache minimum.
      system: [
        { type: "text", text: SYSTEM_PROMPT },
        {
          type: "text",
          text: personaContext,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    }),
  );
}
