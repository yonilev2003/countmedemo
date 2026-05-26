/**
 * Regulatory-Watch — daily orchestrator.
 *
 * Loop: fetch all sources → drop already-seen items (seen.json) → classify each
 * with Claude → open a GitHub issue per relevant finding → persist the run
 * summary. The heavy Chromium/PDF render is intentionally a *separate* CI step
 * that reads the persisted summary (see report.ts / the workflow), so this loop
 * stays light and can run even where puppeteer can't.
 *
 * Environment:
 *   ANTHROPIC_API_KEY      — required to classify (without it, items fall back
 *                            to "could not classify" and nothing is reported).
 *   GITHUB_TOKEN + GITHUB_REPOSITORY — required to open issues; absent ⇒ dry run
 *                            (findings still reported, issueUrl left empty).
 *   REGWATCH_SUMMARY_PATH  — where to write the summary JSON.
 *   REGWATCH_INLINE_REPORT — if set, also render the HTML/PDF in-process.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fetchAllSources, SOURCES } from "../../src/lib/regulatory/sources.ts";
import { classifyAll } from "../../src/lib/regulatory/classify.ts";
import { loadSeen, saveSeen } from "./seen.ts";
import { buildIssueBody, canOpenIssues, openIssue } from "./issues.ts";
import type { Finding, RunSummary } from "./report.ts";

async function main(): Promise<void> {
  const runDate = new Date().toISOString().slice(0, 10);

  // 1. Fetch every source (fetchAllSources never rejects).
  const items = await fetchAllSources();
  console.log(`[regulatory-watch] fetched ${items.length} item(s) from ${SOURCES.length} source(s)`);

  // 2. Dedup against prior runs.
  const seen = await loadSeen();
  const unseen = items.filter((it) => !seen.has(it.id));
  console.log(`[regulatory-watch] ${unseen.length} new (after dedup)`);

  // 3. Classify the new items.
  const classifications = await classifyAll(unseen);

  // 4. Split into findings (relevant → open issue) and skipped publications.
  const relevantFindings: Finding[] = [];
  const irrelevantPublications: RunSummary["irrelevantPublications"] = [];
  const issuesEnabled = canOpenIssues();
  if (!issuesEnabled) {
    console.log("[regulatory-watch] GITHUB_TOKEN/REPOSITORY absent — dry run, not opening issues");
  }

  for (let i = 0; i < unseen.length; i++) {
    const item = unseen[i];
    const cls = classifications[i];
    if (!cls?.relevant) {
      irrelevantPublications.push({
        title: item.title,
        source: item.source,
        reason: cls?.reason ?? "סווג כלא רלוונטי",
      });
      continue;
    }

    let issueUrl = "";
    if (issuesEnabled) {
      try {
        const ref = await openIssue({
          title: `[רגולציה] ${item.title}`,
          body: buildIssueBody(item, cls),
        });
        issueUrl = ref.url;
      } catch (err) {
        console.error(`[regulatory-watch] failed to open issue for "${item.title}":`, err);
      }
    }

    relevantFindings.push({
      title: item.title,
      sourceUrl: item.url,
      publishedAt: item.publishedAt,
      summaryHe: cls.summaryHe,
      affectedConstants: cls.affectedConstants,
      confidence: cls.confidence,
      issueUrl,
      changeType: cls.changeType,
    });
  }

  // 5. Persist dedup state (mark everything we just processed as seen).
  for (const it of unseen) seen.add(it.id);
  await saveSeen(seen);

  // 6. Assemble + persist the run summary (tail-end hook).
  const summary: RunSummary = {
    runDate,
    sourcesScanned: SOURCES.length,
    newPublications: unseen.length,
    relevantFindings,
    irrelevantPublications,
  };

  const summaryPath =
    process.env.REGWATCH_SUMMARY_PATH ??
    join(process.cwd(), ".regulatory-watch", "last-run.json");
  await mkdir(dirname(summaryPath), { recursive: true });
  await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(
    `[regulatory-watch] summary → ${summaryPath} ` +
      `(${relevantFindings.length} finding(s), ${irrelevantPublications.length} skipped)`,
  );

  if (process.env.REGWATCH_INLINE_REPORT) {
    const { writeReport } = await import("./report.ts");
    const pdfPath = await writeReport(summary);
    console.log(`[regulatory-watch] report → ${pdfPath}`);
  }
}

main().catch((err) => {
  console.error("[regulatory-watch] run failed:", err);
  process.exitCode = 1;
});
