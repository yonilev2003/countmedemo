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

import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fetchAllSources, SOURCES } from "../../src/lib/regulatory/sources.ts";
import { classifyAll } from "../../src/lib/regulatory/classify.ts";
import { loadSeen, saveSeen } from "./seen.ts";
import { buildIssueBody, canOpenIssues, ensureLabel, openIssue } from "./issues.ts";

const ISSUE_LABEL = "regulatory-watch";
import type { Finding, RunSummary } from "./report.ts";

async function main(): Promise<void> {
  const runDate = new Date().toISOString().slice(0, 10);

  // 1. Fetch every source (fetchAllSources never rejects).
  const items = await fetchAllSources();
  console.log(`[regulatory-watch] fetched ${items.length} item(s) from ${SOURCES.length} source(s)`);
  // Per-source visibility: a source returning 0 is the silent-failure mode
  // (wrong URL / changed markup), so surface it explicitly rather than hiding it.
  const perSourceCounts: { id: string; label: string; count: number }[] = [];
  for (const s of SOURCES) {
    const n = items.filter((it) => it.source === s.id).length;
    perSourceCounts.push({ id: s.id, label: s.label, count: n });
    if (n === 0) console.warn(`[regulatory-watch]   ⚠ ${s.id}: 0 items — check endpoint/parser`);
    else console.log(`[regulatory-watch]   ${s.id}: ${n} item(s)`);
  }

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
  if (issuesEnabled) {
    await ensureLabel(ISSUE_LABEL);
  } else {
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

  // 7. Write a GitHub Step Summary so the run's main page shows per-source
  // counts + findings at a glance — no digging into the step log to learn
  // which source returned 0 (the silent-failure signal).
  await writeStepSummary({
    runDate,
    perSourceCounts,
    newPublications: unseen.length,
    findings: relevantFindings.length,
    skipped: irrelevantPublications.length,
    issuesEnabled,
  });

  if (process.env.REGWATCH_INLINE_REPORT) {
    const { writeReport } = await import("./report.ts");
    const pdfPath = await writeReport(summary);
    console.log(`[regulatory-watch] report → ${pdfPath}`);
  }
}

/**
 * Append a Markdown block to $GITHUB_STEP_SUMMARY (GitHub Actions). Shows up on
 * the run's Summary page. No-op when the env var is unset (e.g. local runs).
 */
async function writeStepSummary(s: {
  runDate: string;
  perSourceCounts: { id: string; label: string; count: number }[];
  newPublications: number;
  findings: number;
  skipped: number;
  issuesEnabled: boolean;
}): Promise<void> {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;
  const rows = s.perSourceCounts
    .map((c) => `| ${c.label} | \`${c.id}\` | ${c.count === 0 ? "⚠️ 0" : c.count} |`)
    .join("\n");
  const md = [
    `## 📋 Regulatory-Watch — ${s.runDate}`,
    "",
    `**Sources scanned:** ${s.perSourceCounts.length} · ` +
      `**New (after dedup):** ${s.newPublications} · ` +
      `**Findings:** ${s.findings} · ` +
      `**Skipped:** ${s.skipped}`,
    s.issuesEnabled ? "" : "_Dry run — GITHUB_TOKEN absent, no issues opened._",
    "",
    "### Items fetched per source",
    "",
    "| Source | id | Items |",
    "| --- | --- | --- |",
    rows,
    "",
    "> A source showing **⚠️ 0** returned nothing — its endpoint/URL likely needs " +
      "fixing (override via the matching `REGWATCH_SRC_*` repo Variable).",
    "",
  ].join("\n");
  try {
    await appendFile(path, md, "utf8");
  } catch (err) {
    console.warn("[regulatory-watch] could not write step summary:", (err as Error).message);
  }
}

main().catch((err) => {
  console.error("[regulatory-watch] run failed:", err);
  process.exitCode = 1;
});
