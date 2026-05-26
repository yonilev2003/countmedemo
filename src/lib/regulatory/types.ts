/**
 * Regulatory-Watch — shared contracts.
 *
 * These types are the seam between the three stages of the daily run:
 *   fetchers (sources.ts)  →  RegulatoryItem[]
 *   classifier (classify.ts) →  Classification
 *   orchestrator (run.ts)    →  Finding / RunSummary (see scripts/.../report.ts)
 */

export type RegSourceId =
  | "taxes-gov"
  | "gov-il-rss"
  | "shituf"
  | "icpas"
  | "knesset";

/** A single publication discovered by a fetcher, before classification. */
export interface RegulatoryItem {
  /** Stable dedup key — derived from source + url (+ title fallback). */
  id: string;
  title: string;
  url: string;
  source: RegSourceId;
  /** ISO timestamp. Best-effort; falls back to fetch time if the source omits it. */
  publishedAt: string;
  /** Raw snippet/description the source provided, if any. */
  summary?: string;
}

/** A source the watcher polls. `fetch` must never throw — it returns [] on failure. */
export interface RegSource {
  id: RegSourceId;
  label: string;
  fetch(): Promise<RegulatoryItem[]>;
}

export type Confidence = "high" | "medium" | "low";

/** One proposed change to a tracked tax constant. */
export interface AffectedConstant {
  /** Key into TAX_YEAR_2024 / TAX_CONSTANT_META. */
  name: string;
  oldValue: unknown;
  proposedValue: unknown;
}

/** The classifier's verdict on a single RegulatoryItem. */
export interface Classification {
  relevant: boolean;
  /** Concise Hebrew summary for the report / issue body. */
  summaryHe: string;
  confidence: Confidence;
  /** e.g. "value-update", "new-bracket", "proposed-legislation", "rate-change". */
  changeType: string;
  affectedConstants: AffectedConstant[];
  /** When relevant === false: why it was skipped (shown in the report). */
  reason?: string;
}
