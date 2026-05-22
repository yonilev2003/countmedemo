#!/usr/bin/env node
/**
 * Bootstrap a new TAX_YEAR_YYYY_RAW table in src/lib/calculators/types.ts.
 *
 * Behavior:
 *   - Clones every constant from the previous tax year.
 *   - Skips constants whose effectiveTo is < newYear (sunset / הוראת שעה expired).
 *   - Marks every cloned constant with lastVerified=today and notes that it
 *     needs human re-verification.
 *
 * Usage:
 *   tsx scripts/new-tax-year.ts 2025
 *
 * After running: open a PR. Each constant must be human-verified before merge.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { TAX_YEAR_TABLES, type TaxConstant } from "../src/lib/calculators/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const TYPES_PATH = join(REPO_ROOT, "src", "lib", "calculators", "types.ts");

function literalize(v: unknown): string {
  if (typeof v === "number") {
    if (v === Infinity) return "Infinity";
    if (v === -Infinity) return "-Infinity";
    return String(v);
  }
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "boolean") return String(v);
  if (v === null || v === undefined) return "null";
  return JSON.stringify(v, null, 2)
    .replace(/"([a-zA-Z_$][a-zA-Z0-9_$]*)":/g, "$1:")
    .replace(/"Infinity"/g, "Infinity");
}

function main() {
  const newYear = Number(process.argv[2]);
  if (!Number.isFinite(newYear)) {
    console.error("Usage: tsx scripts/new-tax-year.ts <YYYY>");
    process.exit(1);
  }
  const prevYear = newYear - 1;
  const prev = TAX_YEAR_TABLES[prevYear];
  if (!prev) {
    console.error(`No table for ${prevYear} — can't clone.`);
    process.exit(1);
  }
  if (TAX_YEAR_TABLES[newYear]) {
    console.error(`TAX_YEAR_${newYear}_RAW already exists.`);
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);

  const entries: string[] = [];
  for (const [key, raw] of Object.entries(prev)) {
    const c = raw as TaxConstant<unknown>;
    if (c.effectiveTo !== undefined && c.effectiveTo < newYear) {
      console.log(`[new-tax-year] skipping ${key} — effectiveTo=${c.effectiveTo} < ${newYear}`);
      continue;
    }
    const noteSuffix = "נדרשת בדיקה אנושית מול הפרסום הרשמי לשנת המס החדשה.";
    const notes = c.notes ? `${c.notes} ${noteSuffix}` : noteSuffix;
    entries.push(
      `  ${key}: {\n` +
      `    value: ${literalize(c.value)},\n` +
      `    source: ${literalize(c.source)},\n` +
      `    lastVerified: "${today}",\n` +
      `    effectiveFrom: ${newYear},\n` +
      (c.effectiveTo !== undefined ? `    effectiveTo: ${c.effectiveTo},\n` : "") +
      `    notes: ${JSON.stringify(notes)},\n` +
      `  } satisfies TaxConstant${Array.isArray(c.value) ? "<TaxBracket[]>" : ""},`
    );
  }

  const newTable =
    `export const TAX_YEAR_${newYear}_RAW = {\n` +
    entries.join("\n") +
    `\n} as const satisfies Record<string, TaxConstant<unknown>>;\n\n` +
    `export const TAX_YEAR_${newYear} = flatten(TAX_YEAR_${newYear}_RAW);\n`;

  let src = readFileSync(TYPES_PATH, "utf-8");
  // Insert before the TAX_YEAR_TABLES registry declaration.
  const anchor = `export const TAX_YEAR_TABLES: Record<number, typeof TAX_YEAR_2024_RAW> = {`;
  const idx = src.indexOf(anchor);
  if (idx === -1) {
    console.error("Could not find TAX_YEAR_TABLES anchor in types.ts.");
    process.exit(1);
  }
  src = src.slice(0, idx) + newTable + "\n" + src.slice(idx);
  // Add to registry.
  src = src.replace(
    /(TAX_YEAR_TABLES: Record<number, typeof TAX_YEAR_2024_RAW> = \{\n)/,
    `$1  ${newYear}: TAX_YEAR_${newYear}_RAW,\n`,
  );

  writeFileSync(TYPES_PATH, src);
  console.log(`[new-tax-year] inserted TAX_YEAR_${newYear}_RAW with ${entries.length} constants.`);
  console.log(`[new-tax-year] every constant is marked for re-verification. Open a PR and verify each one against the official ${newYear} publications.`);
}

main();
