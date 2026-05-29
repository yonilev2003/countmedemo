import { parseCsvFile } from "./csv";
import { parseExcelFile } from "./excel";
import { parseMsProjectXml } from "./ms-project-xml";
import { parseGanttImageOrPdf } from "./vision";
import type { ParseOutcome } from "./types";

export interface DispatchInput {
  filename: string;
  mime: string;
  buffer: Buffer;
}

/**
 * Detects the format from filename + mime, then dispatches.
 * Refuses .mpp with a friendly hint to export to XML or CSV.
 */
export async function parseGanttFile(input: DispatchInput): Promise<ParseOutcome> {
  const lower = input.filename.toLowerCase();

  if (lower.endsWith(".mpp")) {
    return {
      ok: false,
      error: "פורמט .mpp לא נתמך ישירות.",
      hint: "ב-MS Project: File → Save As → בחר 'XML' או 'CSV'. אפשר גם לצלם screenshot ולעלות כתמונה.",
    };
  }

  if (lower.endsWith(".csv") || input.mime === "text/csv") {
    return parseCsvFile(input.buffer);
  }

  if (
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    input.mime.includes("spreadsheetml") ||
    input.mime === "application/vnd.ms-excel"
  ) {
    return parseExcelFile(input.buffer);
  }

  if (lower.endsWith(".xml") || input.mime === "application/xml" || input.mime === "text/xml") {
    return parseMsProjectXml(input.buffer);
  }

  if (input.mime === "application/pdf" || lower.endsWith(".pdf")) {
    return parseGanttImageOrPdf({
      buffer: input.buffer,
      mediaType: "application/pdf",
      format: "pdf",
    });
  }

  if (input.mime.startsWith("image/")) {
    const mediaType =
      input.mime === "image/jpeg" || input.mime === "image/png" || input.mime === "image/webp"
        ? (input.mime as "image/jpeg" | "image/png" | "image/webp")
        : "image/png";
    return parseGanttImageOrPdf({
      buffer: input.buffer,
      mediaType,
      format: "image",
    });
  }

  return {
    ok: false,
    error: `סוג קובץ לא מזוהה: ${input.mime || lower}`,
    hint: "פורמטים נתמכים: CSV, XLSX, MS Project XML, PDF, תמונה (PNG/JPEG/WEBP).",
  };
}

export type { ParseOutcome } from "./types";
