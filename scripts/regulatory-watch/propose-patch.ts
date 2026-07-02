/**
 * Regulatory-Watch — params-patch proposal.
 *
 * When the classifier recognizes a publication as a concrete parameter change
 * (Classification.affectedConstants with a numeric proposedValue), this module
 * turns it into a READY-TO-REVIEW unified diff against
 * src/lib/calculators/types.ts:
 *   1. the scalar value inside the TAX_YEAR_2024 literal, and
 *   2. the matching TAX_CONSTANT_META entry — sourceUrl repointed at the
 *      publication and lastVerified bumped to the run date (provenance).
 * The proposed file text is validated against the edge-cases invariants BEFORE
 * the diff is offered, so a nonsense value (negative cap, rate > 1) is flagged
 * in the proposal itself.
 *
 * The diff is ATTACHED TO THE GITHUB ISSUE for a human to review and apply —
 * it is never applied or auto-merged by the pipeline. (`apply.ts` remains the
 * human's one-command way to land an approved value.)
 *
 * Degrades gracefully: no classification (no API key) ⇒ no affectedConstants ⇒
 * no proposals; unreadable types.ts or unlocatable constant ⇒ a proposal with
 * manual instructions instead of a diff. Never throws.
 */

import { readFile } from "node:fs/promises";
import type { Classification, RegulatoryItem } from "../../src/lib/regulatory/types.ts";
import { parseConstants, typesPath, validateConstants } from "./edge-cases.ts";
import type { Provenance } from "./cross-ref.ts";

// --------------------------------------------------------------------------
// Contracts
// --------------------------------------------------------------------------

export interface PatchProposal {
  constantName: string;
  oldValue: number;
  proposedValue: number;
  /** Unified diff against src/lib/calculators/types.ts, or null if we could not build one. */
  diff: string | null;
  /** One-command apply path for the human reviewer. */
  applyCommand: string;
  /** Did the PROPOSED file text pass the edge-cases invariants? */
  invariantsOk: boolean;
  invariantProblems: string[];
  /** When diff is null — why, and what to do instead. */
  note?: string;
}

// --------------------------------------------------------------------------
// types.ts source (read once per run, defensively)
// --------------------------------------------------------------------------

let typesSourceCache: string | null | undefined;

async function loadTypesSource(): Promise<string | null> {
  if (typesSourceCache !== undefined) return typesSourceCache;
  try {
    typesSourceCache = await readFile(typesPath(), "utf8");
  } catch {
    typesSourceCache = null;
  }
  return typesSourceCache;
}

/** Test seam: reset the cached source (unused in production). */
export function resetTypesSourceCache(): void {
  typesSourceCache = undefined;
}

// --------------------------------------------------------------------------
// Line-level edits → unified diff
// --------------------------------------------------------------------------

interface LineEdit {
  /** 0-based line index in the original file. */
  line: number;
  newText: string;
}

const DIFF_CONTEXT = 2;

/**
 * Render replace-only line edits as a unified diff. All edits are 1:1 line
 * replacements, so old/new hunk offsets and lengths stay identical — no
 * offset bookkeeping needed.
 */
function buildUnifiedDiff(lines: string[], edits: LineEdit[]): string {
  const sorted = [...edits].sort((a, b) => a.line - b.line);

  // Merge edits whose context windows touch into single hunks.
  const hunks: LineEdit[][] = [];
  for (const edit of sorted) {
    const last = hunks[hunks.length - 1];
    if (last && edit.line - last[last.length - 1].line <= DIFF_CONTEXT * 2) {
      last.push(edit);
    } else {
      hunks.push([edit]);
    }
  }

  const out: string[] = [
    "--- a/src/lib/calculators/types.ts",
    "+++ b/src/lib/calculators/types.ts",
  ];
  for (const hunk of hunks) {
    const start = Math.max(0, hunk[0].line - DIFF_CONTEXT);
    const end = Math.min(lines.length - 1, hunk[hunk.length - 1].line + DIFF_CONTEXT);
    const count = end - start + 1;
    out.push(`@@ -${start + 1},${count} +${start + 1},${count} @@`);
    const editAt = new Map(hunk.map((e) => [e.line, e.newText]));
    for (let i = start; i <= end; i++) {
      const replacement = editAt.get(i);
      if (replacement !== undefined) {
        out.push(`-${lines[i]}`);
        out.push(`+${replacement}`);
      } else {
        out.push(` ${lines[i]}`);
      }
    }
  }
  return out.join("\n");
}

/** Apply replace-only edits to produce the proposed full file text. */
function applyEdits(lines: string[], edits: LineEdit[]): string {
  const next = [...lines];
  for (const e of edits) next[e.line] = e.newText;
  return next.join("\n");
}

// --------------------------------------------------------------------------
// Locating the edit points
// --------------------------------------------------------------------------

/**
 * First line whose text matches `<name>: <number>` — same "keys are unique"
 * contract apply.ts relies on (TAX_YEAR_2024 is declared first in the file).
 */
function findScalarLine(
  lines: string[],
  name: string,
): { line: number; newText: (v: number) => string } | null {
  const re = new RegExp(`^(\\s*${name}\\s*:\\s*)(-?\\d+(?:\\.\\d+)?)(.*)$`);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (m) {
      const [, head, , tail] = m;
      return { line: i, newText: (v) => `${head}${v}${tail}` };
    }
  }
  return null;
}

/**
 * Locate `sourceUrl:` / `lastVerified:` inside TAX_CONSTANT_META[<name>]'s
 * object block. Returns [] when the constant has no meta entry (value-only
 * change is still proposable).
 */
function findMetaEdits(
  lines: string[],
  name: string,
  publicationUrl: string,
  verifiedIso: string,
): LineEdit[] {
  const metaStart = lines.findIndex((l) => l.includes("TAX_CONSTANT_META"));
  if (metaStart === -1) return [];
  const entryRe = new RegExp(`^\\s*${name}\\s*:\\s*\\{`);
  let entryStart = -1;
  for (let i = metaStart; i < lines.length; i++) {
    if (entryRe.test(lines[i])) {
      entryStart = i;
      break;
    }
  }
  if (entryStart === -1) return [];

  const edits: LineEdit[] = [];
  const safeUrl = publicationUrl.replace(/["\\\n\r]/g, "");
  for (let i = entryStart + 1; i < lines.length; i++) {
    if (/^\s*\},?\s*$/.test(lines[i])) break; // end of this entry's block
    const src = lines[i].match(/^(\s*sourceUrl:\s*)("[^"]*"|[^,]+)(,?.*)$/);
    if (src) {
      edits.push({ line: i, newText: `${src[1]}"${safeUrl}"${src[3]}` });
      continue;
    }
    const lv = lines[i].match(/^(\s*lastVerified:\s*)"[^"]*"(,?.*)$/);
    if (lv) {
      edits.push({ line: i, newText: `${lv[1]}"${verifiedIso}"${lv[2]}` });
    }
  }
  return edits;
}

// --------------------------------------------------------------------------
// Proposal builder
// --------------------------------------------------------------------------

function applyCommandFor(name: string, value: number): string {
  return `node --experimental-strip-types scripts/regulatory-watch/apply.ts ${name} ${value}`;
}

/**
 * Build patch proposals for every affected constant of a classified item that
 * names a tracked scalar with a concrete numeric proposedValue. Never throws.
 */
export async function proposePatches(
  item: RegulatoryItem,
  cls: Classification,
  fetchedAt: string,
): Promise<PatchProposal[]> {
  if (!cls.relevant || cls.affectedConstants.length === 0) return [];

  const src = await loadTypesSource();
  const scalars = src ? parseConstants(src).scalars : {};
  const lines = src ? src.split("\n") : [];
  const proposals: PatchProposal[] = [];

  for (const affected of cls.affectedConstants) {
    try {
      const proposed = Number(affected.proposedValue);
      // No concrete number stated in the publication ⇒ nothing to patch.
      if (affected.proposedValue == null || !Number.isFinite(proposed)) continue;

      const current = scalars[affected.name];
      if (src === null || current === undefined) {
        proposals.push({
          constantName: affected.name,
          oldValue: typeof affected.oldValue === "number" ? affected.oldValue : Number.NaN,
          proposedValue: proposed,
          diff: null,
          applyCommand: applyCommandFor(affected.name, proposed),
          invariantsOk: false,
          invariantProblems: [],
          note:
            src === null
              ? "לא ניתן לקרוא את src/lib/calculators/types.ts — נדרש עדכון ידני."
              : `הקבוע "${affected.name}" לא נמצא כסקלר ב-TAX_YEAR_2024 (ייתכן מדרגה/ערך מורכב) — נדרש עדכון ידני.`,
        });
        continue;
      }
      if (current === proposed) continue; // already up to date — nothing to propose

      const scalarHit = findScalarLine(lines, affected.name);
      const edits: LineEdit[] = [];
      if (scalarHit) {
        edits.push({ line: scalarHit.line, newText: scalarHit.newText(proposed) });
      }
      edits.push(...findMetaEdits(lines, affected.name, item.url, fetchedAt));

      if (edits.length === 0) {
        proposals.push({
          constantName: affected.name,
          oldValue: current,
          proposedValue: proposed,
          diff: null,
          applyCommand: applyCommandFor(affected.name, proposed),
          invariantsOk: false,
          invariantProblems: [],
          note: "לא אותרו שורות לעריכה — נדרש עדכון ידני.",
        });
        continue;
      }

      // Guardrail: validate the PROPOSED text before offering the diff.
      const { ok, problems } = validateConstants(applyEdits(lines, edits));

      proposals.push({
        constantName: affected.name,
        oldValue: current,
        proposedValue: proposed,
        diff: buildUnifiedDiff(lines, edits),
        applyCommand: applyCommandFor(affected.name, proposed),
        invariantsOk: ok,
        invariantProblems: problems,
      });
    } catch (err) {
      console.warn(
        `[propose-patch] failed for "${affected.name}":`,
        (err as Error).message,
      );
    }
  }
  return proposals;
}

// --------------------------------------------------------------------------
// Markdown rendering (for the GitHub issue body)
// --------------------------------------------------------------------------

const REVIEW_BANNER = [
  "> **בדיקה אנושית חובה — ההצעה לעולם אינה ממוזגת אוטומטית.**",
  "> יש לאמת את הערך מול הפרסום הרשמי, להחיל ידנית (או בפקודה שלמטה), ואז להריץ `npm run build`.",
].join("\n");

/** Render the proposals as the issue-body section, incl. the ```diff block. */
export function renderPatchSection(
  proposals: PatchProposal[],
  provenance?: Provenance,
): string {
  if (proposals.length === 0) return "";

  const parts: string[] = ["## הצעת עדכון קבועים (טיוטה לבדיקה)", "", REVIEW_BANNER, ""];

  for (const p of proposals) {
    parts.push(`### \`${p.constantName}\`: ${p.oldValue} → **${p.proposedValue}**`, "");
    if (p.diff) {
      parts.push("```diff", p.diff, "```", "");
      parts.push(
        p.invariantsOk
          ? "- בדיקת אינווריאנטים על הטקסט המוצע: עוברת ✓"
          : `- בדיקת אינווריאנטים על הטקסט המוצע: **נכשלת** — ${p.invariantProblems.join("; ") || "ראו edge-cases.ts"}`,
      );
    } else if (p.note) {
      parts.push(`- ${p.note}`);
    }
    parts.push(`- יישום לאחר אישור: \`${p.applyCommand}\``, "");
  }

  if (provenance) {
    parts.push(
      `_מקור ההצעה: ${provenance.sourceLabel} — פורסם ${provenance.publishedAt}, נשלף ${provenance.fetchedAt}._`,
    );
  }
  return parts.join("\n").trimEnd();
}

// --------------------------------------------------------------------------
// CLI (import smoke + simulation):
//   node --experimental-strip-types propose-patch.ts <constantName> <newValue>
// Prints the exact issue-body section that would be attached for a synthetic
// classified item — useful for demos and for verifying the diff generator
// without an ANTHROPIC_API_KEY.
// --------------------------------------------------------------------------

if (process.argv[1] && process.argv[1].endsWith("propose-patch.ts")) {
  const [name, rawValue] = process.argv.slice(2);
  if (!name || rawValue === undefined) {
    console.error("usage: propose-patch.ts <constantName> <newValue>");
    process.exitCode = 1;
  } else {
    const now = new Date().toISOString();
    const item: RegulatoryItem = {
      id: "simulated:0000",
      title: `(סימולציה) עדכון ${name}`,
      url: "https://www.gov.il/he/departments/israel_tax_authority",
      source: "taxes-gov",
      publishedAt: now,
    };
    const cls: Classification = {
      relevant: true,
      summaryHe: "סימולציה מקומית של הצעת עדכון קבוע.",
      confidence: "high",
      changeType: "value-update",
      affectedConstants: [
        { name, oldValue: null, proposedValue: Number(rawValue) },
      ],
    };
    proposePatches(item, cls, now)
      .then((proposals) => {
        if (proposals.length === 0) {
          console.log(
            "(no proposal — value identical to current, non-numeric, or constant untracked)",
          );
          return;
        }
        console.log(
          renderPatchSection(proposals, {
            source: item.source,
            sourceLabel: "רשות המסים בישראל — עדכונים",
            publishedAt: item.publishedAt,
            fetchedAt: now,
          }),
        );
      })
      .catch((err) => {
        console.error("[propose-patch] simulation failed:", err);
        process.exitCode = 1;
      });
  }
}
