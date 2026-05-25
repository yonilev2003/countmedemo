/**
 * Regulatory-Watch — daily orchestrator (SCAFFOLD).
 *
 * NOTE: the production fetch → dedup → classify → open-issue → persist loop
 * described in the project docs does not yet live in this repo. This file is a
 * thin scaffold whose only job today is to show *where* the report hook
 * attaches: the loop builds a `RunSummary`, and the tail-end emits it.
 *
 * Integration contract with report.ts:
 *   - The orchestrator serialises `summary` to REGWATCH_SUMMARY_PATH
 *     (default `.regulatory-watch/last-run.json`).
 *   - A dedicated CI step then reads that JSON and calls `writeReport`, so the
 *     heavy Chromium/puppeteer render runs in isolation from the agent loop.
 *
 * For a local one-shot run, set REGWATCH_INLINE_REPORT=1 to also generate the
 * HTML/PDF in-process (handy when iterating on the report design).
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { RunSummary } from "./report.ts";

async function main(): Promise<void> {
  // ──────────────────────────────────────────────────────────────────────
  // TODO: the real loop (fetchers → dedup via seen.json → Claude classify →
  // open GitHub issues) populates this object. Until that lands, we emit an
  // empty-but-valid summary so the report pipeline is exercisable end-to-end.
  // ──────────────────────────────────────────────────────────────────────
  const summary: RunSummary = {
    runDate: new Date().toISOString().slice(0, 10),
    sourcesScanned: 0,
    newPublications: 0,
    relevantFindings: [],
    irrelevantPublications: [],
  };

  // ── Summary hook (tail-end of the run) ────────────────────────────────
  const summaryPath =
    process.env.REGWATCH_SUMMARY_PATH ??
    join(process.cwd(), ".regulatory-watch", "last-run.json");
  await mkdir(dirname(summaryPath), { recursive: true });
  await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(`[regulatory-watch] wrote run summary → ${summaryPath}`);

  if (process.env.REGWATCH_INLINE_REPORT) {
    const { writeReport } = await import("./report.ts");
    const pdfPath = await writeReport(summary);
    console.log(`[regulatory-watch] wrote report → ${pdfPath}`);
  }
}

main().catch((err) => {
  console.error("[regulatory-watch] run failed:", err);
  process.exitCode = 1;
});
