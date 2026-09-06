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

describe("vehicle rate — profession-specific override (risk-gap.md §9)", () => {
  it("a courier (שליח, 25% in the 113-profession dataset) gets 25%, not the flat 45%", () => {
    const routing = classifyExpensePLImpact("רכב", 2026, "שליח");
    expect(routing.recognizedRate).toBeCloseTo(0.25);
  });

  it("a moving company (מוביל / הובלות, 100% in the dataset) gets 100%, not 45%", () => {
    const routing = classifyExpensePLImpact("דלק", 2026, "מוביל / הובלות");
    expect(routing.recognizedRate).toBe(1);
  });

  it("a taxi driver (נהג מונית, 90%) gets 90%", () => {
    const routing = classifyExpensePLImpact("ביטוח רכב", 2026, "נהג מונית");
    expect(routing.recognizedRate).toBeCloseTo(0.9);
  });

  it("an occupation not in the dataset falls back to the flat 45% convention rate", () => {
    const routing = classifyExpensePLImpact("רכב", 2026, "מקצוע שלא קיים במאגר");
    expect(routing.recognizedRate).toBeCloseTo(0.45);
  });

  it("no primaryOccupation given at all falls back to the flat 45% rate (backward compatible)", () => {
    const routing = classifyExpensePLImpact("רכב", 2026);
    expect(routing.recognizedRate).toBeCloseTo(0.45);
  });
});
