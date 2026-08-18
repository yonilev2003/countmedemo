/**
 * Golden tests — the forecast run-rate model (2026-08-18 fix).
 *
 * Root bug: persona.income.totalRevenue is a YTD figure (baseline + docs,
 * "how much you've earned this year so far"), never a completed-year total
 * on its own — the old code divided it by 12 unconditionally, which is a
 * no-op for an in-progress year (projectedAnnualRevenue === totalRevenue,
 * hiding the true pace) and happens to be correct only for a genuinely
 * completed year. These tests lock in the fixed months-elapsed anchor.
 */

import { describe, expect, it } from "vitest";
import { buildForecast } from "@/lib/forecast/index";
import { makePersona } from "../helpers/persona-factory";

describe("buildForecast — months-elapsed run-rate anchor", () => {
  it("a COMPLETED year (income.year in the past) projects to exactly the actual total — no extrapolation", () => {
    const p = makePersona({
      income: { year: 2025, totalRevenue: 119_500, totalDeductibleExpenses: 0 },
    });
    const forecast = buildForecast(p, new Date("2026-08-18"));
    expect(forecast.yearIsComplete).toBe(true);
    expect(forecast.monthsElapsed).toBe(12);
    expect(forecast.scenarios.average.projectedAnnualRevenue).toBe(119_500);
  });

  it("an IN-PROGRESS year (income.year === current year) anchors the run-rate to months elapsed, not /12", () => {
    const p = makePersona({
      income: { year: 2026, totalRevenue: 119_500, totalDeductibleExpenses: 0 },
    });
    // August 18 2026 → month index 7 (0-based) → monthsElapsed = 8.
    const forecast = buildForecast(p, new Date("2026-08-18"));
    expect(forecast.yearIsComplete).toBe(false);
    expect(forecast.monthsElapsed).toBe(8);
    // 119,500 / 8 * 12 = 179,250 — the old code showed 119,500 (a no-op).
    expect(forecast.scenarios.average.projectedAnnualRevenue).toBe(179_250);
    expect(forecast.scenarios.average.monthlyRunRate).toBe(Math.round(119_500 / 8));
  });

  it("projects a ceiling-crossing month for a patur persona on pace to exceed the threshold", () => {
    // 2026 ceiling = 122,833. Pace: 60,000/4 months = 15,000/month.
    // Remaining at month 4: 122,833-60,000=62,833 → ceil(62,833/15,000)=5 more months → month 9.
    const p = makePersona({
      business: { osekType: "patur", isOsekZeir: false },
      income: { year: 2026, totalRevenue: 60_000, totalDeductibleExpenses: 0 },
    });
    const forecast = buildForecast(p, new Date("2026-04-15"));
    expect(forecast.projectedCeilingCrossingMonth).toBe(9);
  });

  it("never projects a crossing month for a morshe persona (no ceiling) or a completed year", () => {
    const morshe = makePersona({
      business: { osekType: "morshe" },
      income: { year: 2026, totalRevenue: 200_000, totalDeductibleExpenses: 0 },
    });
    expect(buildForecast(morshe, new Date("2026-04-15")).projectedCeilingCrossingMonth).toBeNull();

    const completedYearPatur = makePersona({
      business: { osekType: "patur", isOsekZeir: false },
      income: { year: 2025, totalRevenue: 200_000, totalDeductibleExpenses: 0 },
    });
    expect(
      buildForecast(completedYearPatur, new Date("2026-08-18")).projectedCeilingCrossingMonth,
    ).toBeNull();
  });

  it("no crossing month when the average-pace projection stays under the ceiling", () => {
    const p = makePersona({
      business: { osekType: "patur", isOsekZeir: false },
      income: { year: 2026, totalRevenue: 10_000, totalDeductibleExpenses: 0 },
    });
    const forecast = buildForecast(p, new Date("2026-04-15"));
    expect(forecast.projectedCeilingCrossingMonth).toBeNull();
  });
});
