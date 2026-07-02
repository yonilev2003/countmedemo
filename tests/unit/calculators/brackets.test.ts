/**
 * Golden tests — progressive income tax (grossIncomeTax).
 *
 * Every expected value is hand-computed from the official bracket tables:
 *  • 2025: frozen 2024 brackets (israeli-tax-returns, budget freeze 2025–2027
 *    for brackets 1–2 and 6; all frozen in 2025).
 *  • 2026: brackets 3–5 expanded by the Economic Efficiency Law 2026
 *    (approved 2026-03-30, retroactive to 2026-01-01).
 * Surtax (מס יסף) on active income is modelled as the 50% top bracket above
 * 721,560 ₪ (47% + 3%). The 2026 5% passive-income tier is out of scope
 * (the engine only handles active business income).
 */

import { describe, expect, it } from "vitest";
import { grossIncomeTax } from "@/lib/calculators";

describe("grossIncomeTax — 2025 brackets (frozen 2024 table)", () => {
  const cases: Array<[taxable: number, expected: number]> = [
    [0, 0],
    [-5000, 0], // guard: no negative tax
    [84_120, 8_412], // bracket-1 upper edge: 10% flat
    [84_121, 8_412], // +1 ₪ into bracket 2 (rounds down)
    [100_000, 10_635], // mid bracket 2: 8,412 + 15,880×14%
    [120_720, 13_536], // bracket-2 upper edge
    [193_800, 28_152], // bracket-3 upper edge: 13,536 + 73,080×20%
    [269_280, 51_551], // bracket-4 upper edge: 28,152 + 75,480×31%
    [560_280, 153_401], // bracket-5 upper edge: +291,000×35%
    [721_560, 229_202], // bracket-6 upper edge (surtax threshold): +161,280×47%
    [721_561, 229_203], // +1 ₪ above the surtax threshold → 50% marginal
    [800_000, 268_422], // 229,202.4 + 78,440×50%
  ];
  it.each(cases)("taxable %i ₪ → %i ₪", (taxable, expected) => {
    expect(grossIncomeTax(taxable, 2025)).toBe(expected);
  });

  it("2024 table equals 2025 (frozen)", () => {
    for (const [taxable] of cases) {
      expect(grossIncomeTax(taxable, 2024)).toBe(grossIncomeTax(taxable, 2025));
    }
  });
});

describe("grossIncomeTax — 2026 brackets (expanded 3–5)", () => {
  const cases: Array<[taxable: number, expected: number]> = [
    [120_720, 13_536], // brackets 1–2 frozen — same as 2025
    [228_000, 34_992], // NEW bracket-3 upper edge: 13,536 + 107,280×20%
    [228_001, 34_992], // +1 ₪ into 31%
    [250_000, 41_812], // mid bracket 4: 34,992 + 22,000×31%
    [301_200, 57_684], // NEW bracket-4 upper edge
    [560_280, 148_362], // bracket-5 upper edge: 57,684 + 259,080×35%
    [721_560, 224_164], // surtax threshold: +161,280×47%
    [900_000, 313_384], // above threshold: 224,163.6 + 178,440×50%
  ];
  it.each(cases)("taxable %i ₪ → %i ₪", (taxable, expected) => {
    expect(grossIncomeTax(taxable, 2026)).toBe(expected);
  });

  it("the 2026 expansion reduces tax vs 2025 in the expanded range", () => {
    // 250,000 ₪ taxable: 2025 = 45,574 (28,152 + 56,200×31%), 2026 = 41,812.
    expect(grossIncomeTax(250_000, 2025)).toBe(45_574);
    expect(grossIncomeTax(250_000, 2026)).toBe(41_812);
  });
});

describe("grossIncomeTax — year-registry fallbacks", () => {
  it("future years fall back to the latest defined table (2026)", () => {
    expect(grossIncomeTax(250_000, 2030)).toBe(grossIncomeTax(250_000, 2026));
  });
  it("pre-2024 years fall back to the 2024 table", () => {
    expect(grossIncomeTax(250_000, 2020)).toBe(grossIncomeTax(250_000, 2024));
  });
});
