#!/usr/bin/env node
/**
 * "No numbers in the knowledge vault" enforcement (RAG spec §9, 2026-09-08).
 *
 * Until this round, the "no numbers" rule (knowledge/README.md §4) was a
 * PROCEDURE — enforced only by whoever wrote a note remembering to follow
 * it, with zero automated check (confirmed by a code-sweep agent, see
 * memory/progress.md 08/09 entry, and docs/specs/rag-jurisdiction-packs.md
 * §1's "פערים אמיתיים" #3). This script is the first automated check.
 *
 * SCOPE (deliberately narrow, per the sweep's own findings): the vault today
 * has ZERO real violations — the only hit is knowledge/README.md's own
 * negative example ("say X, not Y ₪"), which this script excludes by
 * skipping README.md entirely (it's documentation ABOUT the vault, not vault
 * content served to the model). This script exists to catch the NEXT
 * violation, not to relitigate the current clean state.
 *
 * Flags: ₪ currency amounts, %/percent literals, and a best-effort sweep for
 * spelled-out Hebrew number-words next to "שקל/אחוז" (e.g. "מאה ועשרים אלף
 * שקל"). Explicitly does NOT flag: form-field codes (bare 2-4 digit numbers
 * with no ₪/% attached — "שדה 150", "טופס 6111"), years (2024-2027), or
 * section/law citations ("סעיף 46", "תיקון 283") — these aren't regulatory
 * QUANTITIES, they're identifiers, and the knowledge vault legitimately
 * needs to name them.
 *
 * Usage: node scripts/audit-knowledge-numbers.mjs [--dry-run]
 * Exit code 1 (fails the gate) if any violation is found, unless --dry-run.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const KNOWLEDGE_DIR = join(__dirname, "..", "knowledge");
const DRY_RUN = process.argv.includes("--dry-run");

// ── Patterns for actual regulatory QUANTITIES ───────────────────────────────

// ₪ amount: a number (with optional thousands separators/decimals) directly
// adjacent to the shekel sign, in either order ("120,000 ₪" or "₪120,000").
const CURRENCY_RE = /(\d[\d,]*(?:\.\d+)?\s*₪|₪\s*\d[\d,]*(?:\.\d+)?)/g;

// Percent literal: a number immediately followed by % or "אחוז"/"אחוזים".
const PERCENT_RE = /(\d+(?:\.\d+)?\s*%|\d+(?:\.\d+)?\s*אחוז(?:ים)?)/g;

// Best-effort: spelled-out Hebrew number words adjacent to "שקל"/"אחוז" —
// catches "מאה ועשרים אלף שקל" style amounts that dodge the digit-based
// regexes above. Not exhaustive (Hebrew number words compose in many ways);
// flagged as best-effort in the header comment, not a complete grammar.
const HEBREW_NUMBER_WORDS =
  "(?:אחד|אחת|שני|שתי|שלוש|שלושה|ארבע|ארבעה|חמש|חמישה|שש|שישה|שבע|שבעה|שמונה|תשע|תשעה|עשר|עשרה|עשרים|שלושים|ארבעים|חמישים|שישים|שבעים|שמונים|תשעים|מאה|מאתיים|אלף|אלפים|מיליון)";
const SPELLED_OUT_RE = new RegExp(
  `((?:${HEBREW_NUMBER_WORDS}[\\s־-]*){2,}\\s*(?:שקל|שקלים|אחוז|אחוזים))`,
  "g",
);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".md") && entry !== "README.md") out.push(full);
  }
  return out;
}

function auditFile(path) {
  const text = readFileSync(path, "utf8");
  const violations = [];
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    for (const re of [CURRENCY_RE, PERCENT_RE, SPELLED_OUT_RE]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line))) {
        violations.push({ line: i + 1, match: m[0], text: line.trim() });
      }
    }
  });
  return violations;
}

function main() {
  const files = walk(KNOWLEDGE_DIR);
  let totalViolations = 0;
  for (const file of files) {
    const violations = auditFile(file);
    if (violations.length === 0) continue;
    totalViolations += violations.length;
    console.error(`\n${relative(process.cwd(), file)}:`);
    for (const v of violations) {
      console.error(`  line ${v.line}: "${v.match}" — ${v.text}`);
    }
  }

  console.log(
    `\n[audit-knowledge-numbers] scanned ${files.length} note(s), ${totalViolations} violation(s).`,
  );

  if (totalViolations > 0 && !DRY_RUN) {
    console.error(
      '\nFAIL: knowledge/*.md must never embed a regulatory quantity — name it ' +
        '("תקרת עוסק פטור") and point to the calculator/form field instead. See ' +
        "knowledge/README.md §4.",
    );
    process.exit(1);
  }
}

main();
