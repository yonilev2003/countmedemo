import type { ParsedGanttTask, GanttUncertainty } from "@/types/db";

export type SourceFormat = "csv" | "xlsx" | "pdf" | "image" | "xml" | "mpp";

export interface ParseResult {
  format: SourceFormat;
  tasks: ParsedGanttTask[];
  uncertainties: GanttUncertainty[];
  notes?: string;
  /** Raw model output / parser intermediate, kept for audit. */
  raw?: unknown;
}

export interface ParseError {
  ok: false;
  error: string;
  hint?: string;
}

export interface ParseSuccess {
  ok: true;
  result: ParseResult;
}

export type ParseOutcome = ParseSuccess | ParseError;
