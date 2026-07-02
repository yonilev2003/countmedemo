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
  it("bituach leumi: 52% deductible; brackets 7,522 / 50,695 ₪ per month; 7.12%/17.83%", () => {
    expect(TC.bituachLeumiDeductibleRate).toBe(0.52);
    expect(TC.blMonthlyThreshold1).toBe(7_522);
    expect(TC.blMonthlyMax).toBe(50_695); // 49,030 was the 2024 figure
    expect(TC.blRate1).toBe(0.0712);
    expect(TC.blRate2).toBe(0.1783);
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
  });
  it("form 6111 threshold 256,410 (ex-VAT)", () => {
    expect(TC.form6111Threshold).toBe(256_410);
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
  it("bituach leumi combined rates 7.70% / 17.83%, max 51,910 ₪ per month", () => {
    expect(TC.blRate1).toBe(0.077); // 4.47% B"L + 3.23% health (Amend. 252)
    expect(TC.blRate2).toBe(0.1783); // 12.83% + 5.00% — NOT 18.00%
    expect(TC.blMonthlyMax).toBe(51_910);
  });
  it("point value + surtax threshold frozen through 2027", () => {
    expect(TC.pointValueAnnual).toBe(2_904);
    expect(TC.surtaxThreshold).toBe(721_560);
  });
  it("keren exempt-deposit cap 20,566 (unchanged from 2025)", () => {
    expect(TC.kerenExemptDepositCap).toBe(20_566);
  });
});
