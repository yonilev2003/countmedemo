import type { ParsedGanttTask, GanttUncertainty } from "@/types/db";

interface NormalizedResult {
  tasks: ParsedGanttTask[];
  uncertainties: GanttUncertainty[];
  notes?: string;
}

/**
 * Map a CSV/XLSX matrix (first row = headers) into ParsedGanttTask[].
 * Heuristic header matching for Hebrew + English. Records uncertainties
 * for fields that couldn't be parsed cleanly.
 */
export function normalizeRows(matrix: string[][]): NormalizedResult {
  const headers = matrix[0].map((h) => h.trim().toLowerCase());
  const rows = matrix.slice(1);

  const colIndex = (...patterns: (string | RegExp)[]) =>
    headers.findIndex((h) =>
      patterns.some((p) =>
        typeof p === "string" ? h === p || h.includes(p) : p.test(h),
      ),
    );

  const titleCol = colIndex("task name", "task", "name", "משימה", "שם משימה", "כותרת", "פעילות");
  const startCol = colIndex("start", "start date", "begin", "התחלה", "תאריך התחלה");
  const endCol = colIndex("end", "end date", "finish", "due", "סיום", "תאריך סיום", "deadline");
  const assigneeCol = colIndex("assignee", "owner", "responsible", "אחראי", "שייך ל", "מבצע");
  const progressCol = colIndex("progress", "complete", "%", "התקדמות", "אחוז");
  const descriptionCol = colIndex("description", "details", "תיאור", "פרטים", "הערות");

  const tasks: ParsedGanttTask[] = [];
  const uncertainties: GanttUncertainty[] = [];

  rows.forEach((row, rowIdx) => {
    const title = (titleCol >= 0 ? row[titleCol] : row[0])?.trim() ?? "";
    if (!title) return;

    const startRaw = startCol >= 0 ? row[startCol]?.trim() : undefined;
    const endRaw = endCol >= 0 ? row[endCol]?.trim() : undefined;

    const startParsed = parseDateLoose(startRaw);
    const endParsed = parseDateLoose(endRaw);

    const taskIndex = tasks.length;

    if (startRaw && !startParsed) {
      uncertainties.push({
        task_index: taskIndex,
        field: "start_date",
        reason: `לא הצלחתי להבין את תאריך ההתחלה "${startRaw}"`,
        suggestion: "ספק תאריך בפורמט YYYY-MM-DD או DD/MM/YYYY",
      });
    }
    if (endRaw && !endParsed) {
      uncertainties.push({
        task_index: taskIndex,
        field: "end_date",
        reason: `לא הצלחתי להבין את תאריך הסיום "${endRaw}"`,
        suggestion: "ספק תאריך בפורמט YYYY-MM-DD או DD/MM/YYYY",
      });
    }
    if (!startParsed && !endParsed) {
      uncertainties.push({
        task_index: taskIndex,
        field: "start_date",
        reason: "אין תאריכים כלל למשימה הזו",
      });
    }

    let progress: number | undefined;
    if (progressCol >= 0) {
      const raw = row[progressCol]?.trim() ?? "";
      const m = raw.match(/(\d+(?:\.\d+)?)/);
      if (m) {
        progress = Math.max(0, Math.min(100, Math.round(Number(m[1]))));
      }
    }

    tasks.push({
      title,
      description: descriptionCol >= 0 ? row[descriptionCol]?.trim() || undefined : undefined,
      start_date: startParsed,
      end_date: endParsed,
      assignee_hint: assigneeCol >= 0 ? row[assigneeCol]?.trim() || undefined : undefined,
      progress,
      confidence: startParsed && endParsed ? 0.95 : startParsed || endParsed ? 0.6 : 0.3,
      uncertainties: undefined,
    });
  });

  let notes: string | undefined;
  if (titleCol < 0 && tasks.length > 0) {
    notes = "לא נמצאה עמודת כותרת מפורשת — נלקחה העמודה הראשונה.";
  }

  return { tasks, uncertainties, notes };
}

/**
 * Best-effort date parser: ISO, DD/MM/YYYY, DD.MM.YYYY, MM/DD/YYYY (US),
 * Hebrew "1 בינואר 2026". Returns null if nothing matches.
 */
export function parseDateLoose(s: string | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;

  // ISO 2026-01-15
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);

  // DD/MM/YYYY or DD.MM.YYYY (Israeli convention)
  m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    const day = +m[1];
    const month = +m[2];
    const year = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return iso(year, month, day);
    }
  }

  // Excel serial number (number of days since 1900-01-01, with quirks)
  const num = Number(t);
  if (Number.isFinite(num) && num > 1000 && num < 100000) {
    const d = new Date(Date.UTC(1899, 11, 30) + num * 86400000);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }

  // Last resort: native Date parsing
  const native = new Date(t);
  if (!isNaN(native.getTime()) && native.getFullYear() > 1990 && native.getFullYear() < 2100) {
    return native.toISOString().slice(0, 10);
  }

  return null;
}

function iso(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
