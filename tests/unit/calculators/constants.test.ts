/**
 * Golden tests — the year-keyed constants themselves.
 *
 * Locks every CONFIRMED scalar so a silent edit (or a wrong "verified" value
 * pasted from an external model — it happened) fails CI. Values carrying
 * FLAG(Roy) are intentionally NOT asserted here: they are unverified carries,
 * and asserting them would launder them into looking confirmed.
 * Sources + retrieval dates live next to each constant in types.ts.
 */

import { describe, expect, it } from "vitest";
import { getTaxYearConstants } from "@/lib/calculators/types";

describe("2025 constants (CONFIRMED set)", () => {
  const TC = getTaxYearConstants(2025);
  it("עוסק פטור/זעיר ceiling frozen at 120,000", () => {
    expect(TC.osekPaturThreshold).toBe(120_000);
    expect(TC.osekZeirThreshold).toBe(120_000);
  });
  it("VAT 18%", () => expect(TC.vatRate).toBe(0.18));
  it("keren: 4.5% / cap 13,203 / income ceiling 293,397", () => {
    expect(TC.kerenHishtalmutRate).toBe(0.045);
    expect(TC.kerenHishtalmutCap).toBe(13_203);
    expect(TC.kerenHishtalmutIncomeCeiling).toBe(293_397);
  });
  it("pension §47/§45א caps from the 232,800 qualifying-income cap", () => {
    expect(TC.pensionDeductionCap).toBe(25_608); // 11% × 232,800
    expect(TC.pensionCreditCap).toBe(12_804); // 5.5% × 232,800
  });
  it("bituach leumi: 52% deductible; brackets 7,522 / 50,695 ₪ per month; 7.70%/18.00%", () => {
    expect(TC.bituachLeumiDeductibleRate).toBe(0.52);
    expect(TC.blMonthlyThreshold1).toBe(7_522);
    expect(TC.blMonthlyMax).toBe(50_695); // 49,030 was the 2024 figure
    expect(TC.blRate1).toBe(0.077); // 4.47% B"L (תיקון 252) + 3.23% health — was 7.12% (stale 3.89% B"L)
    expect(TC.blRate2).toBe(0.18); // 12.83% B"L + 5.17% health (תיקון 69) — was 17.83% (stale 5.00%)
  });
  it("donations §46: 35%, floor 207 ₪, ceiling 30% of taxable income", () => {
    expect(TC.donationsCreditPercent).toBe(0.35);
    expect(TC.donationsCreditMinimum).toBe(207); // NOT 200 — stale 2023 figure
    expect(TC.donationsCreditIncomeCeilingRate).toBe(0.3);
  });
  it("life-insurance credit §45א(א)(1) is 25%", () => {
    expect(TC.lifeInsuranceCreditRate).toBe(0.25);
  });
  it("credit points: male 2.25 (+0.5 female), point value 2,904, surtax 721,560 @ 3%", () => {
    expect(TC.residentCreditPoints).toBe(2.25);
    expect(TC.femaleResidentBonusPoints).toBe(0.5);
    expect(TC.pointValueAnnual).toBe(2_904);
    expect(TC.surtaxThreshold).toBe(721_560);
    expect(TC.surtaxRate).toBe(0.03);
    expect(TC.surtaxCapitalIncomeAdditionalRate).toBe(0.02); // 2025+: +2% on capital income (§121ב/תיקון 276)
  });
  it("form 6111 threshold 254,237 (ex-VAT at 18% VAT = 300,000 incl-VAT / 1.18)", () => {
    expect(TC.form6111Threshold).toBe(254_237);
  });
});

describe("2026 constants (CONFIRMED subset)", () => {
  const TC = getTaxYearConstants(2026);
  it("עוסק פטור/זעיר ceiling CPI-indexed to 122,833", () => {
    expect(TC.osekPaturThreshold).toBe(122_833);
    expect(TC.osekZeirThreshold).toBe(122_833);
  });
  it("keren deductible cap still 13,203", () => {
    expect(TC.kerenHishtalmutCap).toBe(13_203);
  });
  it("bituach leumi combined rates 7.70% / 18.00%, max 51,910 ₪ per month", () => {
    expect(TC.blRate1).toBe(0.077); // 4.47% B"L + 3.23% health (תיקון 252)
    expect(TC.blRate2).toBe(0.18); // 12.83% B"L + 5.17% health (תיקון 69) — was 17.83%
    expect(TC.blMonthlyMax).toBe(51_910);
  });
  it("point value + surtax frozen through 2027; form 6111 254,237; +2% capital surtax", () => {
    expect(TC.pointValueAnnual).toBe(2_904);
    expect(TC.surtaxThreshold).toBe(721_560);
    expect(TC.form6111Threshold).toBe(254_237); // same as 2025 (18% VAT, 300k incl-VAT)
    expect(TC.surtaxCapitalIncomeAdditionalRate).toBe(0.02);
  });
  it("keren exempt-deposit cap 20,566 (2026; rose from 20,520 in 2025)", () => {
    expect(TC.kerenExemptDepositCap).toBe(20_566);
  });
});

/**
 * Year-separation contract — locks the values that DIFFER between 2025 and 2026
 * (and the ones that are deliberately identical). Guards against a future edit
 * silently collapsing the two years. Verified against the web on 2026-07-03.
 */
describe("2025 vs 2026 — clean year separation", () => {
  const y25 = getTaxYearConstants(2025);
  const y26 = getTaxYearConstants(2026);

  it("osek patur/zeir ceiling: 120,000 (2025) → 122,833 (2026, first CPI-indexed year)", () => {
    expect(y25.osekPaturThreshold).toBe(120_000);
    expect(y26.osekPaturThreshold).toBe(122_833);
  });
  it("BL max insurable income: 50,695 (2025) → 51,910 ₪/mo (2026)", () => {
    expect(y25.blMonthlyMax).toBe(50_695);
    expect(y26.blMonthlyMax).toBe(51_910);
  });
  it("BL reduced monthly bracket: 7,522 (2025) → 7,703 ₪/mo (2026)", () => {
    expect(y25.blMonthlyThreshold1).toBe(7_522);
    expect(y26.blMonthlyThreshold1).toBe(7_703);
  });
  it("keren exempt-deposit cap: 20,520 (2025) → 20,566 (2026)", () => {
    expect(y25.kerenExemptDepositCap).toBe(20_520);
    expect(y26.kerenExemptDepositCap).toBe(20_566);
  });
  it("income-tax brackets 3–4 widened in 2026 (Economic Efficiency Law)", () => {
    expect(y25.taxBrackets[2].to).toBe(193_800);
    expect(y26.taxBrackets[2].to).toBe(228_000);
    expect(y25.taxBrackets[3].to).toBe(269_280);
    expect(y26.taxBrackets[3].to).toBe(301_200);
  });
  it("deliberately IDENTICAL both years (frozen / statutory)", () => {
    expect(y25.pointValueAnnual).toBe(y26.pointValueAnnual); // 2,904 frozen 2024–2027
    expect(y25.surtaxThreshold).toBe(y26.surtaxThreshold); // 721,560 frozen
    expect(y25.blRate1).toBe(y26.blRate1); // both 0.077 (rose in 2025, not 2026)
    expect(y25.blRate2).toBe(y26.blRate2); // both 0.18
    expect(y25.vatRate).toBe(y26.vatRate); // both 0.18
    expect(y25.form6111Threshold).toBe(y26.form6111Threshold); // both 254,237 (18% VAT)
    expect(y25.pensionDeductionCap).toBe(y26.pensionDeductionCap); // 25,608 (232,800 frozen)
    expect(y25.surtaxCapitalIncomeAdditionalRate).toBe(0.02);
    expect(y26.surtaxCapitalIncomeAdditionalRate).toBe(0.02);
  });
  it("2024 has NO capital-income surtax add-on (0) — the +2% began in 2025", () => {
    expect(getTaxYearConstants(2024).surtaxCapitalIncomeAdditionalRate).toBe(0);
  });
});
