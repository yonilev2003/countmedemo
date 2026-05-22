#!/usr/bin/env node
/**
 * Edge-case report — runs after `apply.ts` modifies types.ts.
 *
 * Snapshots calculator outputs for every persona under personas/*.json,
 * compares against a baseline (committed in .regulatory-watch/baseline.json),
 * and prints a markdown table of changed outputs. The workflow attaches the
 * output to the PR body.
 *
 * Usage:
 *   tsx scripts/regulatory-watch/edge-cases.ts        # write current outputs
 *   tsx scripts/regulatory-watch/edge-cases.ts --diff # diff vs baseline
 *   tsx scripts/regulatory-watch/edge-cases.ts --refresh-baseline
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { calculators, estimateTaxLiability } from "../../src/lib/calculators/index";
import type { Persona } from "../../src/lib/persona";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const BASELINE_PATH = join(REPO_ROOT, ".regulatory-watch", "baseline.json");
const PERSONAS_DIR = join(REPO_ROOT, "personas");

interface Snapshot {
  [personaFile: string]: {
    estimate: Record<string, number>;
    calculators: Record<string, unknown>;
  };
}

function loadPersonas(): Array<{ name: string; persona: Persona }> {
  return readdirSync(PERSONAS_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".schema.json"))
    .map((f) => ({
      name: f,
      persona: JSON.parse(readFileSync(join(PERSONAS_DIR, f), "utf-8")) as Persona,
    }));
}

function takeSnapshot(): Snapshot {
  const snap: Snapshot = {};
  for (const { name, persona } of loadPersonas()) {
    const calcs: Record<string, unknown> = {};
    for (const [id, fn] of Object.entries(calculators)) {
      try {
        calcs[id] = fn(persona).value;
      } catch (e) {
        calcs[id] = `ERROR: ${e}`;
      }
    }
    snap[name] = {
      estimate: estimateTaxLiability(persona) as unknown as Record<string, number>,
      calculators: calcs,
    };
  }
  return snap;
}

function diff(baseline: Snapshot, current: Snapshot): string {
  const lines: string[] = ["| persona | field | before | after |", "|---|---|---|---|"];
  for (const persona of Object.keys(current)) {
    const before = baseline[persona];
    const after = current[persona];
    if (!before) {
      lines.push(`| ${persona} | (new persona) | — | snapshot taken |`);
      continue;
    }
    for (const k of Object.keys(after.calculators)) {
      const b = before.calculators[k];
      const a = after.calculators[k];
      if (JSON.stringify(b) !== JSON.stringify(a)) {
        lines.push(`| ${persona} | ${k} | \`${JSON.stringify(b)}\` | \`${JSON.stringify(a)}\` |`);
      }
    }
    for (const k of Object.keys(after.estimate)) {
      const b = (before.estimate as Record<string, number>)[k];
      const a = after.estimate[k];
      if (b !== a) {
        lines.push(`| ${persona} | estimate.${k} | \`${b}\` | \`${a}\` |`);
      }
    }
  }
  return lines.length > 2
    ? lines.join("\n")
    : "_אין שינויים בפלט המחשבונים._";
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--refresh-baseline")) {
    writeFileSync(BASELINE_PATH, JSON.stringify(takeSnapshot(), null, 2) + "\n");
    console.log(`[edge-cases] baseline written to ${BASELINE_PATH}`);
    return;
  }

  if (args.includes("--diff")) {
    if (!existsSync(BASELINE_PATH)) {
      console.log("_אין baseline — להריץ קודם --refresh-baseline._");
      return;
    }
    const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf-8")) as Snapshot;
    const current = takeSnapshot();
    console.log("## Edge-case diff\n");
    console.log(diff(baseline, current));
    return;
  }

  // Default: print current snapshot
  console.log(JSON.stringify(takeSnapshot(), null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
