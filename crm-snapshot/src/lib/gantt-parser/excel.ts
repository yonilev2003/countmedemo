import ExcelJS from "exceljs";
import type { ParseOutcome } from "./types";
import { normalizeRows } from "./normalize";

export async function parseExcelFile(buffer: Buffer): Promise<ParseOutcome> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    // Use first non-empty sheet
    const sheet = workbook.worksheets.find((ws) => ws.actualRowCount > 1);
    if (!sheet) {
      return { ok: false, error: "Excel ריק או ללא נתונים" };
    }

    const matrix: string[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        const v = cell.value;
        if (v == null) {
          cells.push("");
        } else if (v instanceof Date) {
          cells.push(v.toISOString().slice(0, 10));
        } else if (typeof v === "object" && "text" in v) {
          cells.push(String((v as { text: string }).text ?? ""));
        } else if (typeof v === "object" && "result" in v) {
          cells.push(String((v as { result: unknown }).result ?? ""));
        } else {
          cells.push(String(v));
        }
      });
      matrix.push(cells);
    });

    if (matrix.length < 2) {
      return { ok: false, error: "Excel ללא כותרות + שורות" };
    }

    const result = normalizeRows(matrix);
    return {
      ok: true,
      result: {
        format: "xlsx",
        tasks: result.tasks,
        uncertainties: result.uncertainties,
        notes: result.notes,
        raw: { sheetName: sheet.name, headers: matrix[0], rowCount: matrix.length - 1 },
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `שגיאת Excel: ${msg}` };
  }
}
