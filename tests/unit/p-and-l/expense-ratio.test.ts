/**
 * Golden tests — computeExpenseRatio's isZeirEligible (MURSHE-ZEIR,
 * Amendment 265, verified 2026-08-19).
 *
 * Eligibility for מסלול עוסק זעיר is TURNOVER-ONLY — independent of
 * osekType. Before this fix, isZeirEligible required osekType === "patur",
 * which wrongly reported an under-ceiling עוסק מורשה as ineligible.
 */

import { describe, expect, it } from "vitest";
import { computeExpenseRatio } from "@/lib/p-and-l/expense-ratio";
import { makePersona } from "../helpers/persona-factory";

describe("computeExpenseRatio — isZeirEligible is turnover-only", () => {
  it("an עוסק מורשה under the ceiling is eligible (was false before the fix)", () => {
    const p = makePersona({
      business: { osekType: "morshe", isOsekZeir: false },
      income: { year: 2025, totalRevenue: 90_000, totalDeductibleExpenses: 10_000 },
    });
    expect(computeExpenseRatio(p).isZeirEligible).toBe(true);
  });

  it("an עוסק מורשה OVER the ceiling is still not eligible", () => {
    const p = makePersona({
      business: { osekType: "morshe", isOsekZeir: false },
      income: { year: 2025, totalRevenue: 150_000, totalDeductibleExpenses: 10_000 },
    });
    expect(computeExpenseRatio(p).isZeirEligible).toBe(false);
  });

  it("an עוסק פטור under the ceiling stays eligible (unchanged behavior)", () => {
    const p = makePersona({
      business: { osekType: "patur" },
      income: { year: 2025, totalRevenue: 90_000, totalDeductibleExpenses: 10_000 },
    });
    expect(computeExpenseRatio(p).isZeirEligible).toBe(true);
  });

  it("zero revenue is never eligible, regardless of osekType", () => {
    const p = makePersona({
      business: { osekType: "morshe" },
      income: { year: 2025, totalRevenue: 0 },
    });
    expect(computeExpenseRatio(p).isZeirEligible).toBe(false);
  });
});
