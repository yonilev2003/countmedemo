import type { ParseOutcome } from "./types";
import { normalizeRows } from "./normalize";

/**
 * Lightweight CSV parser that handles quoted fields, embedded commas, escaped quotes.
 * Sufficient for typical Gantt exports — not a full RFC 4180 implementation.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (ch === "\r") {
        // ignore — newline handler picks up \n
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function parseCsvFile(buffer: Buffer): ParseOutcome {
  let text: string;
  try {
    // Try UTF-8 with BOM stripping
    text = buffer.toString("utf-8");
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  } catch {
    return { ok: false, error: "Could not decode CSV as UTF-8" };
  }

  const matrix = parseCsv(text);
  if (matrix.length < 2) {
    return { ok: false, error: "CSV ריק או ללא כותרות + שורות" };
  }

  const result = normalizeRows(matrix);
  return {
    ok: true,
    result: {
      format: "csv",
      tasks: result.tasks,
      uncertainties: result.uncertainties,
      notes: result.notes,
      raw: { headers: matrix[0], rowCount: matrix.length - 1 },
    },
  };
}
