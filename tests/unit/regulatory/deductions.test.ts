/**
 * Golden test — risk-gap.md §7.4 #2: the "vehicle" (רכב) category previously
 * had no entry in the deductions registry at all, so classifyExpensePLImpact
 * fell through to the 100%-recognised default for every car expense.
 */

import { describe, it, expect } from "vitest";
import { classifyExpensePLImpact, getDeduction } from "@/lib/regulatory/deductions";

describe("vehicle deduction (45% flat convention rate)", () => {
  it("getDeduction resolves the vehicle entry at 45%", () => {
    const def = getDeduction("vehicle", 2026);
    expect(def?.rule).toBe("partial");
    expect(def?.ratePercent).toBe(45);
  });

  it("classifyExpensePLImpact matches רכב-family category nouns to 45% recognised, operating-expense", () => {
    for (const category of ["רכב", "דלק לרכב העסקי", "חניה ליד המשרד", "ביטוח רכב שנתי"]) {
      const routing = classifyExpensePLImpact(category, 2026);
      expect(routing.plImpact).toBe("operating-expense");
      expect(routing.recognizedRate).toBeCloseTo(0.45);
    }
  });

  it("home-office (משרד ביתי) is intentionally NOT matched — no fixed rate exists, falls back to 100%/operating-expense unchanged", () => {
    const routing = classifyExpensePLImpact("משרד ביתי", 2026);
    expect(routing.plImpact).toBe("operating-expense");
    expect(routing.recognizedRate).toBe(1);
  });
});
