import Anthropic from "@anthropic-ai/sdk";
import { Persona } from "@/lib/persona";
import { TAX_YEAR_2024 } from "@/lib/calculators/types";

const SYSTEM_PROMPT = `אתה המלווה הפיננסי של countme — עוזר AI לעצמאים בישראל שממלאים דוח שנתי 1301.
אתה מכיר את כל נתוני המשתמש ואת הדוח שלו. תענה בעברית, בגוף שני נקבה (כי הדמו הוא לדנה כהן), בצורה ידידותית ומקצועית.
תשובות קצרות וממוקדות — זה ממשק צ'אט, לא מאמר.
אם שאלה לא קשורה למיסים/עסק, תגיד שאתה מתמחה בנושאים פיננסיים בלבד.`;

function buildPersonaContext(persona: Persona): string {
  const p = persona;
  const bituachPaid = p.deductionsAndCredits.bituachLeumiSelfEmployed.annualPaid;
  const bituachDeductible = Math.round(
    bituachPaid * TAX_YEAR_2024.bituachLeumiDeductibleRate,
  );

  const creditLines: string[] = ["תושב (2.25)"];
  if (p.personal.isNewResident) creditLines.push("עולה חדש");
  if (p.personal.isSoldierDischarged) creditLines.push("חייל משוחרר");

  const form6111 = p.vatAndTurnover.annualTurnoverWithoutVat > TAX_YEAR_2024.form6111Threshold
    ? "חייב בטופס 6111"
    : "לא חייב";

  return `נתוני המשתמש:
שם: ${p.personal.firstName} ${p.personal.lastName}
הכנסות ברוטו: ${p.income.totalRevenue.toLocaleString("he-IL")} ₪
הוצאות מוכרות: ${p.income.totalDeductibleExpenses.toLocaleString("he-IL")} ₪
הכנסה חייבת (שדה 150): ${p.income.netIncome.toLocaleString("he-IL")} ₪
מחזור שנתי (שדות 238/294): ${p.income.totalRevenue.toLocaleString("he-IL")} ₪
ביטוח לאומי ששולם: ${bituachPaid.toLocaleString("he-IL")} ₪ (מוכר לניכוי: ${bituachDeductible.toLocaleString("he-IL")} ₪)
קרן השתלמות: ${p.deductionsAndCredits.kerenHishtalmut.annualContribution.toLocaleString("he-IL")} ₪
עסק: ${p.business.tradeName} — ${p.business.primaryOccupation}
סוג עוסק: ${p.business.osekType}
טופס 6111: ${form6111}
נקודות זיכוי: ${creditLines.join(", ")}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return Response.json({ error: "API key not configured" }, { status: 503 });
  }

  let body: {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
    persona: Persona;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { message, history, persona } = body;

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
  const personaContext = buildPersonaContext(persona);

  // Build a ReadableStream that pipes Anthropic SSE deltas as our own SSE
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
          // Two cached system blocks:
          // 1. Stable persona-agnostic instructions (cache_control on this block
          //    caches both it and everything before it — i.e. just itself here)
          // 2. Persona context (may change per user but stable within a session)
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
            {
              type: "text",
              text: personaContext,
              cache_control: { type: "ephemeral" },
            },
          ],
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
