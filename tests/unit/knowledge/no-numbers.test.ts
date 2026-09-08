/**
 * First automated enforcement of the "no numbers in knowledge/*.md" rule
 * (knowledge/README.md §4) — previously a procedure only, per the RAG spec
 * audit (docs/specs/rag-jurisdiction-packs.md §1, "פערים אמיתיים" #3).
 * Runs scripts/audit-knowledge-numbers.mjs as a real subprocess so this test
 * exercises exactly what `npm run audit:knowledge-numbers` runs in CI/pre-push,
 * not a reimplementation that could drift from it.
 */

import { describe, expect, it } from "vitest";
import { execFileSync } from "child_process";
import { join } from "path";

describe("knowledge vault: no embedded regulatory numbers", () => {
  it("scripts/audit-knowledge-numbers.mjs finds zero violations in knowledge/*.md", () => {
    const scriptPath = join(process.cwd(), "scripts", "audit-knowledge-numbers.mjs");
    let output = "";
    let failed = false;
    try {
      output = execFileSync("node", [scriptPath], { encoding: "utf8" });
    } catch (err) {
      failed = true;
      output = (err as { stdout?: string; stderr?: string }).stdout ?? "";
      output += (err as { stdout?: string; stderr?: string }).stderr ?? "";
    }
    expect(failed, `audit-knowledge-numbers found violations:\n${output}`).toBe(false);
    expect(output).toContain("0 violation(s)");
  });
});
