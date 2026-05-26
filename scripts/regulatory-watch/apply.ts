/**
 * Regulatory-Watch — apply an approved constant change.
 *
 * Performs targeted code surgery on src/lib/calculators/types.ts:
 *   1. replaces the numeric value of <name> inside the TAX_YEAR_2024 literal
 *   2. bumps the matching TAX_CONSTANT_META[<name>].lastVerified to today
 * The proposed file text is validated (edge-cases invariants) *before* writing,
 * so a bad change is rejected rather than committed.
 *
 * Usage:
 *   node --experimental-strip-types scripts/regulatory-watch/apply.ts <name> <newValue>
 */

import { readFile, writeFile } from "node:fs/promises";
import { validateConstants, typesPath, parseConstants } from "./edge-cases.ts";

function replaceScalar(src: string, name: string, newValue: number): { text: string; old: number } {
  // Match `name: <number>` within the file (the constant keys are unique).
  const re = new RegExp(`(\\b${name}\\s*:\\s*)(-?\\d+(?:\\.\\d+)?)`);
  const m = src.match(re);
  if (!m) throw new Error(`could not find scalar "${name}" in TAX_YEAR_2024`);
  const old = Number(m[2]);
  return { text: src.replace(re, `$1${newValue}`), old };
}

function bumpLastVerified(src: string, name: string, iso: string): string {
  // Find the META entry for <name> and replace the lastVerified literal within
  // its object block only.
  const keyIdx = src.indexOf(`${name}: {`);
  if (keyIdx === -1) return src; // no meta entry — value-only change is fine
  const lvRe = /lastVerified:\s*"[^"]*"/;
  const after = src.slice(keyIdx);
  const replaced = after.replace(lvRe, `lastVerified: "${iso}"`);
  return src.slice(0, keyIdx) + replaced;
}

async function main(): Promise<void> {
  const [name, rawValue] = process.argv.slice(2);
  if (!name || rawValue === undefined) {
    console.error("usage: apply.ts <constantName> <newValue>");
    process.exitCode = 1;
    return;
  }
  const newValue = Number(rawValue);
  if (!Number.isFinite(newValue)) {
    console.error(`newValue must be a finite number, got "${rawValue}"`);
    process.exitCode = 1;
    return;
  }

  const path = typesPath();
  const original = await readFile(path, "utf8");

  // Sanity: the constant must currently exist.
  const before = parseConstants(original).scalars[name];
  if (before === undefined) {
    console.error(`constant "${name}" not found in TAX_YEAR_2024`);
    process.exitCode = 1;
    return;
  }

  const { text: withValue, old } = replaceScalar(original, name, newValue);
  const proposed = bumpLastVerified(withValue, name, new Date().toISOString());

  // Guardrail: validate the proposed text before touching disk.
  const { ok, problems } = validateConstants(proposed);
  if (!ok) {
    console.error("✗ proposed change fails invariant checks — aborting:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }

  await writeFile(path, proposed, "utf8");
  console.log(`✓ ${name}: ${old} → ${newValue} (lastVerified bumped). Invariants OK.`);
}

main().catch((err) => {
  console.error("[apply] failed:", err);
  process.exitCode = 1;
});
