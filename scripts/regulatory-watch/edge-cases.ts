/**
 * Regulatory-Watch — constants integrity / differential snapshot.
 *
 * The 8 demo calculators can't be executed under plain Node (they use the
 * `@/` path alias and a JSON import that the bundler resolves, not node). So
 * instead of running them, we validate the *source of truth* they read —
 * `src/lib/calculators/types.ts` — by parsing the TAX_YEAR_2024 literal and
 * asserting invariants no legitimate tax change should ever break:
 *   - rates stay within (0, 1]
 *   - caps / thresholds / ceilings stay positive
 *   - the income-tax brackets remain contiguous, ascending, and open-ended
 *
 * `apply.ts` runs validateConstants() on the *proposed* file text before it
 * writes, so a bad regulatory change can't corrupt the constants. Run directly
 * for a differential snapshot vs the last committed values.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface Bracket {
  from: number;
  to: number;
  rate: number;
}

export interface ParsedConstants {
  scalars: Record<string, number>;
  brackets: Bracket[];
}

export function typesPath(): string {
  return join(process.cwd(), "src", "lib", "calculators", "types.ts");
}

/** Extract a balanced `{...}` (or `[...]`) block starting at `marker`. */
function sliceBalanced(src: string, marker: string, open: string, close: string): string {
  const start = src.indexOf(marker);
  if (start === -1) return "";
  const from = src.indexOf(open, start);
  if (from === -1) return "";
  let depth = 0;
  for (let i = from; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close) {
      depth--;
      if (depth === 0) return src.slice(from + 1, i);
    }
  }
  return "";
}

export function parseConstants(src: string): ParsedConstants {
  const block = sliceBalanced(src, "export const TAX_YEAR_2024", "{", "}");

  // Pull out the brackets array, then strip it so scalar parsing ignores it.
  const bracketsArr = sliceBalanced(block, "taxBrackets:", "[", "]");
  const blockNoBrackets = block.replace(
    new RegExp("taxBrackets:\\s*\\[[\\s\\S]*?\\]", "m"),
    "",
  );

  const scalars: Record<string, number> = {};
  const scalarRe = /(\w+)\s*:\s*(-?\d+(?:\.\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = scalarRe.exec(blockNoBrackets)) !== null) {
    scalars[m[1]] = Number(m[2]);
  }

  const brackets: Bracket[] = [];
  const bRe = /from:\s*([\d.]+)\s*,\s*to:\s*(Infinity|[\d.]+)\s*,\s*rate:\s*([\d.]+)/g;
  while ((m = bRe.exec(bracketsArr)) !== null) {
    brackets.push({
      from: Number(m[1]),
      to: m[2] === "Infinity" ? Infinity : Number(m[2]),
      rate: Number(m[3]),
    });
  }

  return { scalars, brackets };
}

export function validateConstants(src: string): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  const { scalars, brackets } = parseConstants(src);

  if (Object.keys(scalars).length === 0) {
    problems.push("could not parse any scalar constants from TAX_YEAR_2024");
  }

  for (const [name, value] of Object.entries(scalars)) {
    if (!Number.isFinite(value)) {
      problems.push(`${name} is not a finite number (${value})`);
      continue;
    }
    if (/rate/i.test(name)) {
      if (value <= 0 || value > 1) problems.push(`${name} = ${value} is outside (0, 1]`);
    } else if (/(cap|ceiling|threshold|value|points|max)/i.test(name)) {
      if (value <= 0) problems.push(`${name} = ${value} must be positive`);
    }
  }

  if (brackets.length === 0) {
    problems.push("no tax brackets parsed");
  } else {
    for (let i = 0; i < brackets.length; i++) {
      const b = brackets[i];
      if (b.rate <= 0 || b.rate > 1) problems.push(`bracket ${i} rate ${b.rate} outside (0, 1]`);
      if (i > 0) {
        if (b.from !== brackets[i - 1].to) {
          problems.push(`bracket ${i} not contiguous: from ${b.from} != prev to ${brackets[i - 1].to}`);
        }
        if (b.rate < brackets[i - 1].rate) {
          problems.push(`bracket ${i} rate ${b.rate} lower than previous ${brackets[i - 1].rate}`);
        }
      }
    }
    if (brackets[brackets.length - 1].to !== Infinity) {
      problems.push("top bracket must be open-ended (to: Infinity)");
    }
  }

  return { ok: problems.length === 0, problems };
}

function snapshotPath(): string {
  return (
    process.env.REGWATCH_SNAPSHOT_PATH ??
    join(process.cwd(), ".regulatory-watch", "constants-snapshot.json")
  );
}

/** CLI: validate the live file and diff against the committed snapshot. */
async function main(): Promise<void> {
  const src = await readFile(typesPath(), "utf8");
  const { ok, problems } = validateConstants(src);
  const { scalars } = parseConstants(src);

  console.log("Regulatory-Watch constants check\n");
  if (ok) {
    console.log("  ✓ all invariants hold");
  } else {
    console.log("  ✗ invariant violations:");
    for (const p of problems) console.log(`    - ${p}`);
  }

  // Differential snapshot.
  const snapPath = snapshotPath();
  let prev: Record<string, number> | null = null;
  try {
    prev = JSON.parse(await readFile(snapPath, "utf8"));
  } catch {
    prev = null;
  }

  if (prev) {
    const changed: string[] = [];
    for (const [k, v] of Object.entries(scalars)) {
      if (prev[k] !== undefined && prev[k] !== v) changed.push(`${k}: ${prev[k]} → ${v}`);
    }
    if (changed.length > 0) {
      console.log("\n  changed since last snapshot:");
      for (const c of changed) console.log(`    - ${c}`);
    } else {
      console.log("\n  no scalar changes since last snapshot");
    }
  } else {
    await mkdir(dirname(snapPath), { recursive: true });
    await writeFile(snapPath, JSON.stringify(scalars, null, 2), "utf8");
    console.log(`\n  wrote initial snapshot → ${snapPath}`);
  }

  process.exitCode = ok ? 0 : 1;
}

// Run as CLI only when invoked directly, not when imported by apply.ts.
if (process.argv[1] && process.argv[1].endsWith("edge-cases.ts")) {
  main().catch((err) => {
    console.error("[edge-cases] failed:", err);
    process.exitCode = 1;
  });
}
