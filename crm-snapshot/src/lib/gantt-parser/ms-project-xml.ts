import type { ParseOutcome } from "./types";
import type { ParsedGanttTask, GanttUncertainty } from "@/types/db";

/**
 * Parses Microsoft Project XML export (File → Save As → XML).
 *
 * MS Project's binary .mpp format is impossible to parse without Java
 * (mpxj) or a paid converter. The XML format is the realistic free path.
 *
 * Schema reference: https://learn.microsoft.com/en-us/office-project/xml-data-interchange/exchanging-project-plan-data-with-other-applications
 */
export function parseMsProjectXml(buffer: Buffer): ParseOutcome {
  let text: string;
  try {
    text = buffer.toString("utf-8");
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  } catch {
    return { ok: false, error: "Could not decode XML as UTF-8" };
  }

  if (!text.includes("<Project") && !text.includes("<project")) {
    return {
      ok: false,
      error: "הקובץ לא נראה כ-MS Project XML",
      hint: "ב-MS Project: File → Save As → בחר 'XML' כסוג קובץ.",
    };
  }

  // Extract <Tasks>...<Task>...</Task></Tasks>
  const taskBlocks = [...text.matchAll(/<Task>([\s\S]*?)<\/Task>/g)].map((m) => m[1]);
  if (taskBlocks.length === 0) {
    return { ok: false, error: "לא נמצאו משימות ב-XML" };
  }

  const tasks: ParsedGanttTask[] = [];
  const uncertainties: GanttUncertainty[] = [];

  for (const block of taskBlocks) {
    const name = pluckTag(block, "Name");
    if (!name) continue;
    if (pluckTag(block, "IsNull") === "1") continue;
    if (pluckTag(block, "Summary") === "1" && pluckTag(block, "OutlineLevel") === "0") continue;

    const startRaw = pluckTag(block, "Start");
    const finishRaw = pluckTag(block, "Finish");
    const percentComplete = pluckTag(block, "PercentComplete");

    const start = startRaw ? startRaw.slice(0, 10) : null;
    const finish = finishRaw ? finishRaw.slice(0, 10) : null;

    const taskIndex = tasks.length;
    if (!start) {
      uncertainties.push({ task_index: taskIndex, field: "start_date", reason: "אין Start ב-XML" });
    }
    if (!finish) {
      uncertainties.push({ task_index: taskIndex, field: "end_date", reason: "אין Finish ב-XML" });
    }

    tasks.push({
      title: name,
      start_date: start,
      end_date: finish,
      progress: percentComplete ? Math.round(Number(percentComplete)) : undefined,
      confidence: start && finish ? 0.95 : 0.5,
    });
  }

  return {
    ok: true,
    result: {
      format: "xml",
      tasks,
      uncertainties,
      notes: "פוענח מ-MS Project XML.",
      raw: { taskCount: taskBlocks.length },
    },
  };
}

function pluckTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!m) return null;
  return m[1].trim();
}
