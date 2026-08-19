/**
 * Golden tests — computeYearSummary's FP-07 year-scoping (2026-08-19).
 *
 * Before this fix, switching the dashboard year via YearSwitch never changed
 * revenueYtd/expensesYtd — they read the flat persona.income scalars with no
 * year dependence (Yoni's live finding: "אין הפרדה לנתונים").
 */

import { describe, expect, it } from "vitest";
import { computeYearSummary } from "@/lib/dashboard/summary";
import { makePersona } from "../helpers/persona-factory";

describe("computeYearSummary — default (no year arg) matches pre-fix behavior exactly", () => {
  it("baseline + all non-deleted expense rows, revenue scalar as-is", () => {
    const p = makePersona({
      income: {
        year: 2025,
        totalRevenue: 100_000,
        totalDeductibleExpenses: 20_000,
        expenses: [
          { date: "2099-01-01", vendorName: "v", description: "d", amount: 3_000, vat: 0, category: "c", deductionRule: "full" },
        ],
      },
    });
    const s = computeYearSummary(p);
    expect(s.year).toBe(2025);
    expect(s.revenueYtd).toBe(100_000);
    expect(s.expensesYtd).toBe(23_000); // baseline + the row, regardless of its (nonsense) date
  });

  it("passing the declared year explicitly is identical to omitting it", () => {
    const p = makePersona({ income: { year: 2025, totalRevenue: 50_000, totalDeductibleExpenses: 10_000 } });
    expect(computeYearSummary(p, 2025)).toEqual(computeYearSummary(p));
  });
});

describe("computeYearSummary — a DIFFERENT requested year excludes the baseline", () => {
  it("counts only revenue docs and expense rows dated in the requested year", () => {
    const p = makePersona({
      income: {
        year: 2025,
        totalRevenue: 119_000, // 2025 baseline — must not leak into 2026
        totalDeductibleExpenses: 20_000, // same
        invoices: [
          {
            invoiceNumber: "2026-0001",
            date: "2026-02-10",
            customerName: "לקוח",
            description: "שירות",
            amount: 8_000,
            vat: 0,
            total: 8_000,
            docType: "receipt",
            status: "paid",
          },
          {
            invoiceNumber: "2025-0001",
            date: "2025-02-10", // wrong year for a 2026 read
            customerName: "לקוח",
            description: "שירות",
            amount: 5_000,
            vat: 0,
            total: 5_000,
            docType: "receipt",
            status: "paid",
          },
        ],
        expenses: [
          { date: "2026-03-01", vendorName: "v", description: "d", amount: 2_000, vat: 0, category: "c", deductionRule: "full" },
          { date: "2025-03-01", vendorName: "v", description: "d", amount: 9_000, vat: 0, category: "c", deductionRule: "full" },
        ],
      },
    });
    const s2026 = computeYearSummary(p, 2026);
    expect(s2026.year).toBe(2026);
    expect(s2026.revenueYtd).toBe(8_000); // only the 2026-dated invoice; baseline excluded
    expect(s2026.expensesYtd).toBe(2_000); // only the 2026-dated expense; baseline excluded

    // The declared year (2025) is untouched by the fix.
    const s2025 = computeYearSummary(p, 2025);
    expect(s2025.revenueYtd).toBe(119_000);
    expect(s2025.expensesYtd).toBe(31_000); // baseline (20,000) + BOTH rows, 2,000+9,000 (symmetry rule, unchanged)
  });

  it("ignores non-revenue docs (quote/business-account) for a non-declared year", () => {
    const p = makePersona({
      income: {
        year: 2025,
        totalRevenue: 0,
        invoices: [
          {
            invoiceNumber: "Q-1",
            date: "2026-01-01",
            customerName: "לקוח",
            description: "הצעה",
            amount: 20_000,
            vat: 0,
            total: 20_000,
            docType: "quote",
          },
        ],
      },
    });
    expect(computeYearSummary(p, 2026).revenueYtd).toBe(0);
  });

  it("ratioYtd is null when the scoped revenue is 0", () => {
    const p = makePersona({ income: { year: 2025, totalRevenue: 50_000 } });
    expect(computeYearSummary(p, 2026).ratioYtd).toBeNull();
  });
});
