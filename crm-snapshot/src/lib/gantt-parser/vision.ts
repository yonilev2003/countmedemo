import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import type { ParseOutcome } from "./types";
import type { ParsedGanttTask, GanttUncertainty } from "@/types/db";

const SYSTEM = `You are a Gantt chart parser. The user uploads a screenshot, photo, or PDF page of a project plan or Gantt chart (could be MS Project, Asana, Monday, hand-drawn, anything). Extract the tasks into structured JSON.

Rules:
- Output JSON ONLY. No prose.
- Schema: {"tasks": [{"title": str, "start_date": "YYYY-MM-DD"|null, "end_date": "YYYY-MM-DD"|null, "assignee_hint": str?, "progress": int 0-100?, "confidence": float 0-1, "uncertainties": [str]?}], "notes": str?}
- Hebrew is fine in titles/assignees.
- If a date is ambiguous (no year, smudged, only month visible) → confidence < 0.7 and add a string in "uncertainties" explaining what you weren't sure about.
- If dates are clear, confidence ≥ 0.9.
- If you can only see partial info, still extract what you can.
- Default to year 2026 if year is missing in dates (we're in 2026-05).`;

const TASK_SCHEMA = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          start_date: { type: ["string", "null"] },
          end_date: { type: ["string", "null"] },
          assignee_hint: { type: "string" },
          progress: { type: "integer", minimum: 0, maximum: 100 },
          confidence: { type: "number" },
          uncertainties: { type: "array", items: { type: "string" } },
        },
        required: ["title", "confidence"],
      },
    },
    notes: { type: "string" },
  },
  required: ["tasks"],
};

export async function parseGanttImageOrPdf(args: {
  buffer: Buffer;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "application/pdf";
  format: "image" | "pdf";
}): Promise<ParseOutcome> {
  const anthropic = new Anthropic({ apiKey: env.anthropicApiKey });

  const base64 = args.buffer.toString("base64");

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            args.mediaType === "application/pdf"
              ? {
                  type: "document",
                  source: { type: "base64", media_type: "application/pdf", data: base64 },
                }
              : {
                  type: "image",
                  source: { type: "base64", media_type: args.mediaType, data: base64 },
                },
            {
              type: "text",
              text: `Extract all tasks. Output JSON matching this schema: ${JSON.stringify(TASK_SCHEMA)}.`,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: "המודל לא החזיר תוכן" };
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { ok: false, error: "המודל החזיר טקסט שאינו JSON" };
    }

    const parsed = JSON.parse(jsonMatch[0]) as { tasks: ParsedGanttTask[]; notes?: string };

    const uncertainties: GanttUncertainty[] = [];
    parsed.tasks.forEach((t, i) => {
      if (!t.start_date) {
        uncertainties.push({ task_index: i, field: "start_date", reason: "המודל לא הצליח לקרוא תאריך התחלה" });
      }
      if (!t.end_date) {
        uncertainties.push({ task_index: i, field: "end_date", reason: "המודל לא הצליח לקרוא תאריך סיום" });
      }
      for (const u of t.uncertainties ?? []) {
        // Treat task-level uncertainties as start/end ambiguity by default
        uncertainties.push({ task_index: i, field: "title", reason: u });
      }
    });

    return {
      ok: true,
      result: {
        format: args.format,
        tasks: parsed.tasks,
        uncertainties,
        notes: parsed.notes,
        raw: { model: "claude-haiku-4-5", outputLength: textBlock.text.length },
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `שגיאת AI: ${msg}` };
  }
}
