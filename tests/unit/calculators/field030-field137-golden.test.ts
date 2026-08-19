/**
 * Direct golden tests — field030 (Bituach Leumi deduction) and field137
 * (Keren Hishtalmut), calling the calculator functions themselves.
 *
 * Why this file exists: field030BituachLeumi (~calculators/index.ts:284-313)
 * and field137KerenHishtalmut (~calculators/index.ts:320-339) hand-duplicate
 * the exact same formulas that computePersonalDeductions (~index.ts:822-844)
 * independently re-implements for the tax estimate. Before this file,
 * deductions-credits.test.ts only exercised the duplicated formula via
 * computePersonalDeductions() plus one narrow field137 cap-binding case
 * (lines 129-135) — an edit to the field-calculator copy alone (e.g. the
 * displayed formula string, or the osek-zeir branch) could go uncaught by any
 * test. These tests call field030BituachLeumi / field137KerenHishtalmut
 * directly so the field-level copy has its own coverage.
 *
 * Sources: israeli-bituach-leumi skill (52% deductible, סעיף 47א);
 * israeli-tax-returns skill (קרן השתלמות עצמאים: 4.5% cap, 13,203 ₪ 2025 cap).
 */

import { describe, expect, it } from "vitest";
import { field030BituachLeumi, field137KerenHishtalmut } from "@/lib/calculators";
import { makePersona } from "../helpers/persona-factory";

describe("field030BituachLeumi — direct golden tests", () => {
  it("normal track: 52% of annualPaid, rounded", () => {
    const p = makePersona({
      income: { totalRevenue: 300_000, totalDeductibleExpenses: 0 },
      deductionsAndCredits: { bituachLeumiSelfEmployed: { annualPaid: 22_340 } },
    });
    const result = field030BituachLeumi(p);
    // Math.round(22,340 × 0.52) = Math.round(11,616.8) = 11,617
    expect(result.value).toBe(11_617);
    expect(result.formula).toContain("52%");
  });

  it("עוסק זעיר branch: no deduction — value is false, formula cites the 30% bundling", () => {
    const p = makePersona({
      business: { isOsekZeir: true },
      income: { totalRevenue: 100_000, totalDeductibleExpenses: 0 },
      deductionsAndCredits: { bituachLeumiSelfEmployed: { annualPaid: 22_340 } },
    });
    const result = field030BituachLeumi(p);
    expect(result.value).toBe(false);
    expect(result.formula).toContain("30%");
  });
});

describe("field137KerenHishtalmut — direct golden tests", () => {
  it("non-cap-binding: small contribution under both the income-based term and the flat cap → allowed = contribution", () => {
    const p = makePersona({
      income: { totalRevenue: 100_000, totalDeductibleExpenses: 0 }, // business income 100,000
      deductionsAndCredits: { kerenHishtalmut: { annualContribution: 1_000 } },
    });
    // incomeBased = round(min(100,000, 293,397) × 4.5%) = 4,500; cap = 13,203.
    // min(1,000, 4,500, 13,203) = 1,000 — the contribution itself binds.
    expect(field137KerenHishtalmut(p).value).toBe(1_000);
  });

  it("cap-binding (13,203) and income-ceiling interplay — three-way min()", () => {
    // Above the income ceiling (293,397): min(income, ceiling) saturates at the
    // ceiling, so the income-based term = round(293,397 × 4.5%) = 13,203 — which
    // IS the flat cap (the cap is calibrated as ceiling × rate). A contribution
    // above both lands on 13,203 regardless of which "limit" you call binding.
    const aboveCeiling = makePersona({
      income: { totalRevenue: 400_000, totalDeductibleExpenses: 0 },
      deductionsAndCredits: { kerenHishtalmut: { annualContribution: 15_000 } },
    });
    expect(field137KerenHishtalmut(aboveCeiling).value).toBe(13_203);

    // Below the ceiling, the income-based term is what actually binds — the
    // flat cap is never reached because 4.5% × ceiling is calibrated to land
    // just under it. This confirms min() picks the income-based term here,
    // not the flat cap, when income < ceiling.
    const belowCeiling = makePersona({
      income: { totalRevenue: 240_000, totalDeductibleExpenses: 0 },
      deductionsAndCredits: { kerenHishtalmut: { annualContribution: 20_000 } },
    });
    // incomeBased = round(min(240,000, 293,397) × 4.5%) = 10,800 < cap 13,203 < contribution 20,000
    expect(field137KerenHishtalmut(belowCeiling).value).toBe(10_800);
  });

  it("under עוסק זעיר: LOCKS IN current behavior — no isOsekZeir branch, deduction is still computed", () => {
    // OPEN QUESTION for Roy (docs/feedback/2026-08-18, task #19): field030
    // above explicitly zeroes the Bituach Leumi deduction for עוסק זעיר
    // (bundled into the automatic 30% expense — see field030BituachLeumi).
    // field137KerenHishtalmut has NO equivalent isOsekZeir branch: it runs the
    // ordinary min() formula against computeBusinessIncome(p), which for עוסק
    // זעיר already reflects the reduced (70%-of-turnover) business income, and
    // nothing else. This test documents that current behavior as-is — it is
    // NOT a ruling on whether קרן השתלמות should also be disallowed (or
    // otherwise adjusted) under מסלול עוסק זעיר. Flag to Roy; do not "fix"
    // this asymmetry without a decision recorded in memory/decisions.md.
    const p = makePersona({
      business: { isOsekZeir: true },
      income: { totalRevenue: 100_000, totalDeductibleExpenses: 0 },
      deductionsAndCredits: { kerenHishtalmut: { annualContribution: 5_000 } },
    });
    // businessIncome = round(100,000 × (1 − 0.30)) = 70,000 (עוסק זעיר 70% rule)
    // incomeBased = round(min(70,000, 293,397) × 4.5%) = 3,150
    // allowed = min(5,000, 3,150, 13,203) = 3,150 — a real number, NOT false/0
    // the way field030's value is for the same persona shape.
    const result = field137KerenHishtalmut(p);
    expect(result.value).toBe(3_150);
    expect(result.value).not.toBe(false);
  });
});
