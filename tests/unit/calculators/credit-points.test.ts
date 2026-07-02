/**
 * Golden tests — nekudot zikui aggregation (totalCreditPoints).
 *
 * Point tables per israeli-tax-returns (verified 2026-07-02):
 *  • Resident base: male 2.25 / female 2.75. Point value 2,904 ₪ (frozen 2024–2027).
 *  • Children by age in the tax year: 0→1.5, 1–5→2.5, 6–17→1.0, 18→0.5.
 *  • Oleh: 3.0 in year 1 (engine defaults to year-1 without an aliyah date).
 *  • Discharged soldier (סעיף 39א): 1/6 point per eligible month (full service:
 *    men 23+ / women 22+ months) or 1/12 (partial, 12–22 months), for 36 months
 *    starting the month AFTER discharge; partial years prorated.
 *  • Miluim (תיקון 283, from tax year 2026, based on PRIOR-year combat days):
 *    30–39→0.5 · 40–49→0.75 · 50→1.0 · +0.25 per full 5 days above 50 · cap 4.0.
 *    Verified 2026-07-02 vs gov.il (pa181225-1) + kolzchut.
 */

import { describe, expect, it } from "vitest";
import { totalCreditPoints } from "@/lib/calculators";
import { miluimCreditPoints } from "@/lib/calculators/types";
import { makePersona } from "../helpers/persona-factory";

describe("resident base points", () => {
  it("male → 2.25", () => {
    expect(totalCreditPoints(makePersona())).toBe(2.25);
  });
  it("female → 2.75", () => {
    expect(totalCreditPoints(makePersona({ personal: { gender: "female" } }))).toBe(2.75);
  });
});

describe("children points by age band (tax year 2025)", () => {
  it("one child per band: 1.5 + 2.5 + 1.0 + 0.5, age 20 → 0", () => {
    const p = makePersona({
      personal: {
        children: [
          { birthYear: 2025 }, // age 0 → 1.5
          { birthYear: 2022 }, // age 3 → 2.5
          { birthYear: 2015 }, // age 10 → 1.0
          { birthYear: 2007 }, // age 18 → 0.5
          { birthYear: 2005 }, // age 20 → 0
        ],
      },
    });
    expect(totalCreditPoints(p)).toBe(2.25 + 5.5);
  });
});

describe("oleh hadash", () => {
  it("adds the year-1 rate (3.0) when flagged", () => {
    expect(totalCreditPoints(makePersona({ personal: { isNewResident: true } }))).toBe(5.25);
  });
});

describe("discharged-soldier proration", () => {
  it("full service, full eligible year → 12 × 1/6 = 2.0", () => {
    const p = makePersona({
      personal: { isSoldierDischarged: true, soldierDischargeDate: "2024-06-15" },
    });
    expect(totalCreditPoints(p)).toBe(2.25 + 2.0);
  });
  it("partial service (15 months) → 12 × 1/12 = 1.0", () => {
    const p = makePersona({
      personal: {
        isSoldierDischarged: true,
        soldierDischargeDate: "2024-06-15",
        soldierServiceMonths: 15,
      },
    });
    expect(totalCreditPoints(p)).toBe(2.25 + 1.0);
  });
  it("discharge during the tax year → months prorated (Apr–Dec = 9 × 1/6 = 1.5)", () => {
    const p = makePersona({
      personal: { isSoldierDischarged: true, soldierDischargeDate: "2025-03-10" },
    });
    expect(totalCreditPoints(p)).toBe(2.25 + 1.5);
  });
  it("window closing during the tax year → prorated (Jan–Oct 2025 = 10 × 1/6 ≈ 1.67)", () => {
    const p = makePersona({
      personal: { isSoldierDischarged: true, soldierDischargeDate: "2022-10-15" },
    });
    expect(totalCreditPoints(p)).toBe(2.25 + 1.67);
  });
  it("no discharge date → assumes a full eligible year (documented fallback)", () => {
    const p = makePersona({ personal: { isSoldierDischarged: true } });
    expect(totalCreditPoints(p)).toBe(2.25 + 2.0);
  });
});

describe("miluim ladder (תיקון 283) — verified 2026-07-02", () => {
  const ladder: Array<[days: number, points: number]> = [
    [0, 0],
    [29, 0], // below the 30-day minimum
    [30, 0.5],
    [39, 0.5],
    [40, 0.75],
    [49, 0.75],
    [50, 1.0],
    [54, 1.0], // +0.25 only per FULL 5 days
    [55, 1.25],
    [109, 3.75],
    [110, 4.0], // cap reached
    [200, 4.0], // capped
  ];
  it.each(ladder)("%i combat days (2025) → %f points on the 2026 return", (days, points) => {
    expect(miluimCreditPoints(2026, days)).toBe(points);
  });

  it("no credit line on pre-2026 returns regardless of days", () => {
    expect(miluimCreditPoints(2025, 100)).toBe(0);
  });

  it("reads PRIOR-year days from reserveDaysByYear on the filing year", () => {
    const p = makePersona({
      income: { year: 2026 },
      personal: { reserveDaysByYear: { "2025": { combatDays: 60 } } },
    });
    // 60 days → 1.0 + floor(10/5)×0.25 = 1.5
    expect(totalCreditPoints(p)).toBe(2.25 + 1.5);
  });

  it("falls back to the legacy combatReserveDays field", () => {
    const p = makePersona({
      income: { year: 2026 },
      personal: { reserveDaysByYear: {}, combatReserveDays: 50 },
    });
    expect(totalCreditPoints(p)).toBe(2.25 + 1.0);
  });
});

describe("combined scenario", () => {
  it("female + oleh + children (2.5 + 1.0) + miluim 60 days on 2026 return", () => {
    const p = makePersona({
      income: { year: 2026 },
      personal: {
        gender: "female",
        isNewResident: true,
        children: [{ birthYear: 2024 }, { birthYear: 2019 }], // ages 2, 7
        reserveDaysByYear: { "2025": { combatDays: 60 } },
      },
    });
    // 2.75 + 3.0 + (2.5 + 1.0) + 1.5 = 10.75
    expect(totalCreditPoints(p)).toBe(10.75);
  });
});
