import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import type { ParseOutcome } from "./types";
import type { GanttUncertainty, ParsedGanttTask } from "@/types/db";

const ParsedTaskSchema = z.object({
  title: z.string(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  assignee_hint: z.string().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  confidence: z.number().min(0).max(1),
  uncertainties: z.array(z.string()).optional(),
});

const ParsedGanttSchema = z.object({
  tasks: z.array(ParsedTaskSchema),
  notes: z.string().optional(),
});

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
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
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

    let rawParsed: unknown;
    try {
      rawParsed = JSON.parse(jsonMatch[0]);
    } catch {
      return { ok: false, error: "פלט המודל לא JSON תקין" };
    }
    const validation = ParsedGanttSchema.safeParse(rawParsed);
    if (!validation.success) {
      console.error("Gantt schema validation failed", validation.error);
      return { ok: false, error: "פלט המודל לא תואם סכמה" };
    }
    const tasks: ParsedGanttTask[] = validation.data.tasks.map((t) => ({
      title: t.title,
      start_date: t.start_date ?? null,
      end_date: t.end_date ?? null,
      assignee_hint: t.assignee_hint,
      progress: t.progress,
      confidence: t.confidence,
      uncertainties: t.uncertainties,
    }));
    const parsedNotes = validation.data.notes;

    const uncertainties: GanttUncertainty[] = [];
    tasks.forEach((t, i) => {
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
        tasks,
        uncertainties,
        notes: parsedNotes,
        raw: { model: "claude-sonnet-4-6", outputLength: textBlock.text.length },
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `שגיאת AI: ${msg}` };
  }
}
