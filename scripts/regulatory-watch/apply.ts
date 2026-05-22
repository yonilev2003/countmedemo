#!/usr/bin/env node
/**
 * Apply an approved regulatory-update Issue.
 *
 * Triggered by the regulatory-apply.yml workflow when an Issue with label
 * `regulatory-update` gains the `approved` label. Steps:
 *   1. Read the issue body, pull the JSON metadata block.
 *   2. For each proposed change, rewrite TAX_YEAR_YYYY_RAW in
 *      src/lib/calculators/types.ts via a targeted regex replace.
 *   3. Bump lastVerified on every touched constant.
 *   4. Print the diff. The workflow runs the build + edge-case report
 *      and opens a PR with this branch.
 *
 * Usage:
 *   ISSUE_NUMBER=42 tsx scripts/regulatory-watch/apply.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const TYPES_PATH = join(REPO_ROOT, "src", "lib", "calculators", "types.ts");

interface ProposedChange {
  constant: string;
  taxYear: number;
  from: unknown;
  to: unknown;
  reasoning: string;
}

interface IssueMetadata {
  publicationId: string;
  proposedChanges: ProposedChange[];
  effectiveTaxYears: number[];
  sunsetDate: string | null;
}

async function fetchIssue(repo: string, token: string, num: number) {
  const res = await fetch(`https://api.github.com/repos/${repo}/issues/${num}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`fetch issue ${num} failed: ${res.status}`);
  return (await res.json()) as { body: string; title: string };
}

function extractMetadata(body: string): IssueMetadata {
  const block = body.match(/```json\s*([\s\S]*?)```/);
  if (!block) throw new Error("No JSON metadata block found in issue body.");
  return JSON.parse(block[1]) as IssueMetadata;
}

/**
 * Replace `value: <currentLiteral>` inside the `constantKey: { ... }` block
 * of `TAX_YEAR_${taxYear}_RAW`, and bump lastVerified to today.
 */
function applyChange(source: string, change: ProposedChange, today: string): string {
  // Anchor: the constant declaration in the right tax-year table.
  // We find `constantKey: {` then locate `value:` then bump until the comma.
  const tableMarker = `TAX_YEAR_${change.taxYear}_RAW`;
  const tableIdx = source.indexOf(tableMarker);
  if (tableIdx === -1) {
    throw new Error(`Could not find ${tableMarker} in types.ts. Did you forget to seed this tax year?`);
  }

  // Find constant block start within the table.
  const blockRegex = new RegExp(
    `(${escapeRegex(change.constant)}\\s*:\\s*\\{)([\\s\\S]*?)(\\}\\s*satisfies)`,
    "m",
  );
  const m = source.slice(tableIdx).match(blockRegex);
  if (!m) {
    throw new Error(`Could not find constant block for ${change.constant} in ${tableMarker}.`);
  }

  const blockStartInTable = m.index!;
  const fullStart = tableIdx + blockStartInTable;
  const head = m[1];
  let inner = m[2];
  const tail = m[3];

  // Replace value: <...>,
  const newValueLiteral = toTsLiteral(change.to);
  const valueRegex = /value\s*:\s*([\s\S]*?)(,\s*\n)/;
  if (!valueRegex.test(inner)) {
    throw new Error(`Could not find value: in ${change.constant} block`);
  }
  inner = inner.replace(valueRegex, `value: ${newValueLiteral}$2`);

  // Bump lastVerified
  const lvRegex = /lastVerified\s*:\s*"[^"]*"/;
  if (lvRegex.test(inner)) {
    inner = inner.replace(lvRegex, `lastVerified: "${today}"`);
  } else {
    inner = inner.replace(/(,\s*\n)(\s*)effectiveFrom/, `,\n$2lastVerified: "${today}",\n$2effectiveFrom`);
  }

  const updatedBlock = head + inner + tail;
  return source.slice(0, fullStart) + updatedBlock + source.slice(fullStart + m[0].length);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toTsLiteral(v: unknown): string {
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "boolean") return String(v);
  // Arrays and nested objects — rely on JSON, then unquote keys for objects.
  return JSON.stringify(v, null, 2)
    .replace(/"([a-zA-Z_$][a-zA-Z0-9_$]*)":/g, "$1:");
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const issueNumber = Number(process.env.ISSUE_NUMBER);
  if (!repo || !token || !issueNumber) {
    throw new Error("ISSUE_NUMBER, GITHUB_REPOSITORY, GITHUB_TOKEN required.");
  }

  const issue = await fetchIssue(repo, token, issueNumber);
  const meta = extractMetadata(issue.body);
  if (meta.proposedChanges.length === 0) {
    console.log("[regulatory-apply] no proposed changes — nothing to do.");
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  let src = readFileSync(TYPES_PATH, "utf-8");
  for (const change of meta.proposedChanges) {
    console.log(`[regulatory-apply] ${change.constant} (TY${change.taxYear}): ${JSON.stringify(change.from)} → ${JSON.stringify(change.to)}`);
    src = applyChange(src, change, today);
  }
  writeFileSync(TYPES_PATH, src);
  console.log(`[regulatory-apply] wrote ${meta.proposedChanges.length} changes to ${TYPES_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
