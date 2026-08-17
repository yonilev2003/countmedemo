/**
 * The YTD baseline-plus-documents expenses model (journey-scan round 2):
 * ONE derivation — effectiveDeductibleExpenses — feeds the light dashboard,
 * שדה 150, the P&L and the forecast, so a quick expense recorded on the
 * dashboard must move ALL of them by the same amount (net of reclaimable VAT).
 */

import { describe, it, expect } from "vitest";
import { effectiveDeductibleExpenses, type ExpenseLine } from "@/lib/persona";
import { computeBusinessIncome } from "@/lib/calculators/index";
import { calculatePL } from "@/lib/p-and-l/index";
import { computeYearSummary } from "@/lib/dashboard/summary";
import { makePersona } from "../helpers/persona-factory";

const expense = (over: Partial<ExpenseLine>): ExpenseLine => ({
  date: "2026-08-17",
  vendorName: "ספק",
  description: "בדיקה",
  amount: 0,
  vat: 0,
  category: "כללי",
  deductionRule: "full",
  ...over,
});

describe("effectiveDeductibleExpenses — the single YTD expenses derivation", () => {
  it("returns the baseline scalar when there are no rows", () => {
    const p = makePersona({ income: { totalDeductibleExpenses: 8000 } });
    expect(effectiveDeductibleExpenses(p.income)).toBe(8000);
  });

  it("adds rows NET of reclaimable VAT (morshe: 1,180 gross with 180 VAT → +1,000)", () => {
    const p = makePersona({ income: { totalDeductibleExpenses: 8000 } });
    p.income.expenses = [expense({ amount: 1180, vat: 180 })];
    expect(effectiveDeductibleExpenses(p.income)).toBe(9000);
  });

  it("counts the full gross for עוסק פטור rows (vat stored 0 — nothing to reclaim)", () => {
    const p = makePersona({ income: { totalDeductibleExpenses: 0 } });
    p.income.expenses = [expense({ amount: 350, vat: 0 })];
    expect(effectiveDeductibleExpenses(p.income)).toBe(350);
  });

  it("ignores soft-deleted rows", () => {
    const p = makePersona({ income: { totalDeductibleExpenses: 100 } });
    p.income.expenses = [
      expense({ amount: 500, vat: 0, deletedAt: "2026-08-17T10:00:00Z" }),
      expense({ amount: 200, vat: 0 }),
    ];
    expect(effectiveDeductibleExpenses(p.income)).toBe(300);
  });

  it("moves שדה 150 and the year cards by the same amount (the round-2 bug)", () => {
    const p = makePersona({
      income: { year: 2026, totalRevenue: 82000, totalDeductibleExpenses: 0 },
    });
    const before = computeBusinessIncome(p);
    p.income.expenses = [expense({ amount: 1180, vat: 180 })];
    expect(before - computeBusinessIncome(p)).toBe(1000);
    expect(computeYearSummary(p).expensesYtd).toBe(1000);
    expect(calculatePL(p).totalExpenses).toBe(1000);
  });
});

describe("calculatePL dated-documents path", () => {
  it("counts only payment docs, at their EX-VAT amount (not gross, no business-accounts)", () => {
    const p = makePersona({
      income: { year: 2026, totalRevenue: 82000, totalDeductibleExpenses: 0 },
    });
    p.income.invoices = [
      {
        invoiceNumber: "2026-0001",
        date: "2026-08-10",
        customerName: "אורי",
        description: "עבודה",
        amount: 2000,
        vat: 360,
        total: 2360,
        docType: "tax-invoice-receipt",
        status: "paid",
      },
      {
        invoiceNumber: "BA-2026-0001",
        date: "2026-08-12",
        customerName: "אורי",
        description: "דרישת תשלום",
        amount: 5000,
        vat: 900,
        total: 5900,
        docType: "business-account",
        status: "sent",
      },
    ];
    const pl = calculatePL(p);
    const augustRevenue = pl.monthlyData[7].revenue; // August, 0-indexed
    // The old code summed 2,360 + 5,900 = 8,260 "revenue" (the round-2 bug).
    expect(augustRevenue).toBe(2000);
  });
});
