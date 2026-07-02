/**
 * Regulatory-Watch — daily orchestrator.
 *
 * Loop: fetch all sources → cross-reference across sources (corroboration +
 * provenance) → drop already-seen items (seen.json) → classify each with
 * Claude → propose a params patch when a concrete value change is recognized →
 * open a GitHub issue per relevant finding (corroborated first; single-source
 * items are labeled and demoted) → persist the run summary. The heavy
 * Chromium/PDF render is intentionally a *separate* CI step that reads the
 * persisted summary (see report.ts / the workflow), so this loop stays light
 * and can run even where puppeteer can't.
 *
 * Environment:
 *   ANTHROPIC_API_KEY      — required to classify. Absent ⇒ classification is
 *                            env-blocked: items are still fetched, cross-
 *                            referenced and reported (as unclassified), but no
 *                            findings/patches are produced.
 *   GITHUB_TOKEN + GITHUB_REPOSITORY — required to open issues; absent ⇒ dry run
 *                            (findings still reported, issueUrl left empty).
 *   REGWATCH_SUMMARY_PATH  — where to write the summary JSON.
 *   REGWATCH_INLINE_REPORT — if set, also render the HTML/PDF in-process.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fetchAllSources, SOURCES } from "../../src/lib/regulatory/sources.ts";
import { classifyAll } from "../../src/lib/regulatory/classify.ts";
import type { Classification, RegulatoryItem } from "../../src/lib/regulatory/types.ts";
import { loadSeen, saveSeen } from "./seen.ts";
import { buildIssueBody, canOpenIssues, ensureLabel, openIssue } from "./issues.ts";
import { corroborationPriority, crossReference, type CrossRef } from "./cross-ref.ts";
import { proposePatches, renderPatchSection } from "./propose-patch.ts";

const ISSUE_LABEL = "regulatory-watch";
const SINGLE_SOURCE_LABEL = "single-source";
import type { Finding, RunSummary } from "./report.ts";

/** Fallback CrossRef when an item somehow misses the map (defensive only). */
function fallbackCrossRef(item: RegulatoryItem, fetchedAt: string): CrossRef {
  return {
    corroborated: false,
    kind: "single-source",
    matches: [],
    provenance: {
      source: item.source,
      sourceLabel: item.source,
      publishedAt: item.publishedAt,
      fetchedAt,
    },
  };
}

async function main(): Promise<void> {
  const runDate = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();

  // 1. Fetch every source (fetchAllSources never rejects).
  const items = await fetchAllSources();
  console.log(`[regulatory-watch] fetched ${items.length} item(s) from ${SOURCES.length} source(s)`);
  // Per-source visibility: a source returning 0 is the silent-failure mode
  // (wrong URL / changed markup), so surface it explicitly rather than hiding it.
  const sourceCounts: NonNullable<RunSummary["sourceCounts"]> = [];
  for (const s of SOURCES) {
    const n = items.filter((it) => it.source === s.id).length;
    sourceCounts.push({ id: s.id, label: s.label, items: n, fetchedAt });
    if (n === 0) console.warn(`[regulatory-watch]   ⚠ ${s.id}: 0 items — check endpoint/parser`);
    else console.log(`[regulatory-watch]   ${s.id}: ${n} item(s)`);
  }

  // 2. Cross-reference the WHOLE fetch (already-seen items still corroborate
  //    a new one), attaching corroboration + provenance to every item.
  const crossRefs = crossReference(items, fetchedAt);
  const corroborated = items.filter((it) => crossRefs.get(it.id)?.corroborated).length;
  console.log(
    `[regulatory-watch] cross-ref: ${corroborated}/${items.length} corroborated ` +
      `(primary source or ≥2 sources), ${items.length - corroborated} single-source`,
  );

  // 3. Dedup against prior runs.
  const seen = await loadSeen();
  const unseen = items.filter((it) => !seen.has(it.id));
  console.log(`[regulatory-watch] ${unseen.length} new (after dedup)`);

  // 4. Classify the new items. Without an API key the stage is env-blocked:
  //    classifyAll degrades to safe fallbacks and we tag the run accordingly.
  const classifyBlocked = !(process.env.ANTHROPIC_API_KEY ?? "").trim();
  const classifyStatus = classifyBlocked ? "env-blocked: ANTHROPIC_API_KEY" : "enabled";
  if (classifyBlocked) {
    console.warn(
      "[regulatory-watch] env-blocked: ANTHROPIC_API_KEY — classification skipped; " +
        "items reported unclassified, no patch proposals",
    );
  }
  const classifications = await classifyAll(unseen);

  // 5. Split into findings (relevant → open issue) and skipped publications.
  const relevant: { item: RegulatoryItem; cls: Classification; xref: CrossRef }[] = [];
  const irrelevantPublications: RunSummary["irrelevantPublications"] = [];

  for (let i = 0; i < unseen.length; i++) {
    const item = unseen[i];
    const cls = classifications[i];
    const xref = crossRefs.get(item.id) ?? fallbackCrossRef(item, fetchedAt);
    if (!cls?.relevant) {
      irrelevantPublications.push({
        title: item.title,
        source: item.source,
        reason: classifyBlocked
          ? "env-blocked: ANTHROPIC_API_KEY — לא סווג"
          : (cls?.reason ?? "סווג כלא רלוונטי"),
      });
      continue;
    }
    relevant.push({ item, cls, xref });
  }

  // Corroborated findings first: the regulator's own word, then multi-source
  // echoes; single-source items are opened last and labeled for triage.
  relevant.sort(
    (a, b) => corroborationPriority(a.xref.kind) - corroborationPriority(b.xref.kind),
  );

  const issuesEnabled = canOpenIssues();
  if (issuesEnabled) {
    await ensureLabel(ISSUE_LABEL);
    await ensureLabel(
      SINGLE_SOURCE_LABEL,
      "d4c5f9",
      "ממצא רגולטורי ממקור יחיד — טרם אומת בהצלבה",
    );
  } else {
    console.log("[regulatory-watch] GITHUB_TOKEN/REPOSITORY absent — dry run, not opening issues");
  }

  const relevantFindings: Finding[] = [];
  for (const { item, cls, xref } of relevant) {
    // Params-patch proposal: attached to the issue for human review only —
    // never applied or auto-merged here. Degrades to "" without classification.
    let patchSection = "";
    try {
      const proposals = await proposePatches(item, cls, fetchedAt);
      if (proposals.length > 0) {
        patchSection = renderPatchSection(proposals, xref.provenance);
        console.log(
          `[regulatory-watch] patch proposal: ${proposals
            .map((p) => `${p.constantName} ${p.oldValue}→${p.proposedValue}`)
            .join(", ")} (attached to issue, human review required)`,
        );
      }
    } catch (err) {
      console.warn(`[regulatory-watch] propose-patch failed for "${item.title}":`, err);
    }

    let issueUrl = "";
    if (issuesEnabled) {
      try {
        const labels = xref.corroborated
          ? [ISSUE_LABEL]
          : [ISSUE_LABEL, SINGLE_SOURCE_LABEL];
        const titlePrefix = xref.corroborated ? "[רגולציה]" : "[רגולציה][מקור יחיד]";
        const ref = await openIssue({
          title: `${titlePrefix} ${item.title}`,
          body: buildIssueBody(item, cls, { crossRef: xref, patchSection }),
          labels,
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
      provenance: {
        source: xref.provenance.source,
        sourceLabel: xref.provenance.sourceLabel,
        fetchedAt: xref.provenance.fetchedAt,
      },
      corroboration: {
        corroborated: xref.corroborated,
        kind: xref.kind,
        matchedSources: xref.matches.map((m) => m.source),
      },
    });
  }

  // 6. Persist dedup state (mark everything we just processed as seen).
  for (const it of unseen) seen.add(it.id);
  await saveSeen(seen);

  // 7. Assemble + persist the run summary (tail-end hook).
  const summary: RunSummary = {
    runDate,
    sourcesScanned: SOURCES.length,
    newPublications: unseen.length,
    relevantFindings,
    irrelevantPublications,
    classifyStatus,
    sourceCounts,
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
