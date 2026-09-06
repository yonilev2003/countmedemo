/**
 * Golden tests — personal deductions, §46 donations credit, §45א(א)(1) life
 * insurance, field-level calculators, and the end-to-end tax estimate.
 *
 * Sources (verified 2026-07-02): israeli-tax-returns skill tables; kolzchut
 * (donations §46: 35%, floor 207 ₪ 2024–2025, ceiling 30% of taxable income);
 * חוזר מס הכנסה 19/2004 (life insurance 25%).
 */

import { describe, expect, it } from "vitest";
import {
  computeBusinessIncome,
  computeDonationsCredit,
  computePersonalDeductions,
  computeTaxableIncome,
  estimateTaxLiability,
  field072LifeInsurance,
  field137KerenHishtalmut,
  field150BusinessIncome,
  field297Form6111,
} from "@/lib/calculators";
import { makePersona } from "../helpers/persona-factory";

describe("computeBusinessIncome", () => {
  it("regular track: revenue − recognised expenses", () => {
    const p = makePersona({ income: { totalRevenue: 300_000, totalDeductibleExpenses: 60_000 } });
    expect(computeBusinessIncome(p)).toBe(240_000);
  });
  it("עוסק זעיר: 70% of turnover (30% auto-recognised)", () => {
    const p = makePersona({
      business: { isOsekZeir: true },
      income: { totalRevenue: 100_000, totalDeductibleExpenses: 45_000 },
    });
    expect(computeBusinessIncome(p)).toBe(70_000);
  });
});

describe("computePersonalDeductions (2025)", () => {
  it("keren: bound by 4.5% of income when income is the binding cap", () => {
    const p = makePersona({
      income: { totalRevenue: 300_000, totalDeductibleExpenses: 60_000 }, // income 240,000
      deductionsAndCredits: { kerenHishtalmut: { annualContribution: 20_000 } },
    });
    // 4.5% × 240,000 = 10,800 < cap 13,203 < contribution 20,000
    expect(computePersonalDeductions(p).keren).toBe(10_800);
  });
  it("keren: bound by the 13,203 cap at high income", () => {
    const p = makePersona({
      income: { totalRevenue: 400_000, totalDeductibleExpenses: 0 },
      deductionsAndCredits: { kerenHishtalmut: { annualContribution: 20_000 } },
    });
    // 4.5% × min(400,000, 293,397) = 13,203 (income ceiling binds exactly at the cap)
    expect(computePersonalDeductions(p).keren).toBe(13_203);
  });
  it("bituach leumi: 52% of paid (סעיף 47א)", () => {
    const p = makePersona({
      income: { totalRevenue: 300_000 },
      deductionsAndCredits: { bituachLeumiSelfEmployed: { annualPaid: 20_000 } },
    });
    expect(computePersonalDeductions(p).bituachLeumi).toBe(10_400);
  });
  it("bituach leumi: risk-gap.md §7.7 #3 — with healthTaxAnnualPaid split out, 52% applies to the B\"L-only base, flowing through computePersonalDeductions same as field030", () => {
    const p = makePersona({
      income: { totalRevenue: 300_000 },
      deductionsAndCredits: {
        bituachLeumiSelfEmployed: { annualPaid: 20_000, healthTaxAnnualPaid: 8_000 },
      },
    });
    // (20,000 − 8,000) × 0.52 = 6,240 — not 10,400 (52% of the combined 20,000).
    expect(computePersonalDeductions(p).bituachLeumi).toBe(6_240);
  });
  it("bituach leumi: 0 for עוסק זעיר (bundled in the automatic 30%)", () => {
    const p = makePersona({
      business: { isOsekZeir: true },
      income: { totalRevenue: 100_000 },
      deductionsAndCredits: { bituachLeumiSelfEmployed: { annualPaid: 20_000 } },
    });
    expect(computePersonalDeductions(p).bituachLeumi).toBe(0);
  });
  it("pension §47: bound by the 25,608 cap", () => {
    const p = makePersona({
      income: { totalRevenue: 300_000, totalDeductibleExpenses: 60_000 },
      deductionsAndCredits: { pensionContributions: { annualContribution: 30_000 } },
    });
    // min(30,000, 11% × 240,000 = 26,400, 25,608)
    expect(computePersonalDeductions(p).pension).toBe(25_608);
  });
  it("taxable income = business income − all three deductions", () => {
    const p = makePersona({
      income: { totalRevenue: 300_000, totalDeductibleExpenses: 60_000 },
      deductionsAndCredits: {
        kerenHishtalmut: { annualContribution: 20_000 },
        bituachLeumiSelfEmployed: { annualPaid: 20_000 },
        pensionContributions: { annualContribution: 30_000 },
      },
    });
    expect(computeTaxableIncome(p)).toBe(240_000 - 10_800 - 10_400 - 25_608); // 193,192
  });
});

describe("computeDonationsCredit (§46, 2025)", () => {
  const base = { income: { totalRevenue: 300_000, totalDeductibleExpenses: 0 } };
  it("below the 207 ₪ floor → no credit (206 ₪)", () => {
    const p = makePersona({ ...base, deductionsAndCredits: { donations: { currentYear: 206 } } });
    expect(computeDonationsCredit(p).credit).toBe(0);
  });
  it("regression: exactly 200 ₪ (the stale old floor) → still no credit", () => {
    const p = makePersona({ ...base, deductionsAndCredits: { donations: { currentYear: 200 } } });
    expect(computeDonationsCredit(p).credit).toBe(0);
  });
  it("at the floor (207 ₪) → 35% credit = 72 ₪", () => {
    const p = makePersona({ ...base, deductionsAndCredits: { donations: { currentYear: 207 } } });
    expect(computeDonationsCredit(p).credit).toBe(72);
  });
  it("carried-forward donations count toward the total", () => {
    const p = makePersona({
      ...base,
      deductionsAndCredits: { donations: { currentYear: 600, carriedFromPriorYears: 400 } },
    });
    expect(computeDonationsCredit(p).credit).toBe(350); // 1,000 × 35%
  });
  it("capped at 30% of taxable income", () => {
    const p = makePersona({
      income: { totalRevenue: 100_000, totalDeductibleExpenses: 0 }, // taxable 100,000
      deductionsAndCredits: { donations: { currentYear: 50_000 } },
    });
    const d = computeDonationsCredit(p);
    expect(d.ceiling).toBe(30_000);
    expect(d.recognized).toBe(30_000);
    expect(d.credit).toBe(10_500);
  });
});

describe("field calculators", () => {
  it("field072 — life insurance credit is 25% of premium (corrected from 5%)", () => {
    const p = makePersona({ deductionsAndCredits: { lifeInsurancePremium: 10_000 } });
    expect(field072LifeInsurance(p).value).toBe(2_500);
  });
  it("field137 — keren allowed amount respects the deduction cap", () => {
    const p = makePersona({
      income: { totalRevenue: 400_000, totalDeductibleExpenses: 0 },
      deductionsAndCredits: { kerenHishtalmut: { annualContribution: 15_000 } },
    });
    expect(field137KerenHishtalmut(p).value).toBe(13_203);
  });
  it("field150 — עוסק זעיר reports 70% of turnover", () => {
    const p = makePersona({
      business: { isOsekZeir: true },
      income: { totalRevenue: 100_000 },
    });
    expect(field150BusinessIncome(p).value).toBe(70_000);
  });
  it("field297 — form 6111 required strictly ABOVE 254,237 ₪ (2025, =300k incl-VAT / 1.18)", () => {
    const at = makePersona({ income: { totalRevenue: 254_237 } });
    const above = makePersona({ income: { totalRevenue: 254_238 } });
    expect(field297Form6111(at).value).toBe("לא חייב");
    expect(field297Form6111(above).value).toBe("חייב בטופס 6111");
  });
});

describe("estimateTaxLiability — end-to-end golden (2025)", () => {
  it("full persona: deductions, brackets, credit points, §46 + §45א credits, מקדמות", () => {
    const p = makePersona({
      income: {
        totalRevenue: 300_000,
        totalDeductibleExpenses: 60_000,
        mikdamot: 20_000,
      },
      deductionsAndCredits: {
        kerenHishtalmut: { annualContribution: 20_000 },
        bituachLeumiSelfEmployed: { annualPaid: 20_000 },
        pensionContributions: { annualContribution: 30_000 },
        donations: { currentYear: 1_000 },
      },
    });
    const e = estimateTaxLiability(p);
    expect(e.businessIncome).toBe(240_000);
    expect(e.kerenDeduction).toBe(10_800);
    expect(e.blDeduction).toBe(10_400);
    expect(e.pensionDeduction).toBe(25_608);
    expect(e.taxableIncome).toBe(193_192);
    // 13,536 + (193,192 − 120,720) × 20% = 28,030 (rounds down from 28,030.4)
    expect(e.grossTax).toBe(28_030);
    expect(e.creditPointsValue).toBe(6_534); // 2.25 × 2,904
    expect(e.donationsCredit).toBe(350);
    // §45A base: min(30,000, 5.5% × 240,000 = 13,200, TC.pensionCreditCap = 12,804)
    // → the fixed NIS cap governs here (12,804 < 13,200) → 35% × 12,804 = 4,481.4 → 4,481.
    // Fixed 13/08/2026: the cap was previously missing from this min(), which let
    // high earners (businessIncome > 232,800) get an overstated §45A credit —
    // this test's own prior expected value (4,620) baked that bug in as "correct".
    expect(e.pensionCredit).toBe(4_481);
    expect(e.blCredit).toBe(0); // no such credit exists in law
    expect(e.taxAfterCredits).toBe(28_030 - 6_534 - 350 - 4_481); // 16,665
    expect(e.excessCredits).toBe(0);
    expect(e.balance).toBe(16_665 - 20_000); // −3,335 → refund
  });

  it("credits exceeding gross tax are reported as excess, never refunded as negative tax", () => {
    const p = makePersona({
      personal: { gender: "female" },
      income: { totalRevenue: 50_000, totalDeductibleExpenses: 0 },
    });
    const e = estimateTaxLiability(p);
    expect(e.grossTax).toBe(5_000); // 10% bracket
    expect(e.creditPointsValue).toBe(7_986); // 2.75 × 2,904
    expect(e.taxAfterCredits).toBe(0);
    expect(e.excessCredits).toBe(2_986);
    expect(e.balance).toBe(0);
  });
});
