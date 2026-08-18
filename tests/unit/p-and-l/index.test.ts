/**
 * Golden tests — calculatePL (2026-08-18 audit fixes).
 *
 * Two real bugs found live: (1) a dated document from a DIFFERENT calendar
 * year than the persona's declared income.year got bucketed into that
 * month anyway (a real Aug-2026 receipt counted as 2025's August); (2) the
 * expense-category pie silently dropped the whole undated setup-wizard
 * baseline the moment even one dated expense row existed, showing e.g. one
 * category at "100%" while every other card on the same screen showed the
 * true (much larger) total.
 */

import { describe, expect, it } from "vitest";
import { calculatePL } from "@/lib/p-and-l/index";
import { makePersona } from "../helpers/persona-factory";

describe("calculatePL — cross-year document filtering", () => {
  it("ignores a dated invoice/expense whose year doesn't match income.year", () => {
    const p = makePersona({
      income: {
        year: 2025,
        totalRevenue: 119_500,
        totalDeductibleExpenses: 20_000,
        invoices: [
          {
            invoiceNumber: "2026-0001",
            date: "2026-08-05", // real 2026 activity, persona still declares 2025
            customerName: "לקוח",
            description: "שירות",
            amount: 6_500,
            vat: 0,
            total: 6_500,
            docType: "receipt",
            status: "paid",
          },
        ],
        expenses: [],
      },
    });
    const pl = calculatePL(p);
    // The wrong-year invoice must not be treated as real dated activity —
    // it correctly falls through to the honest even-spread fallback
    // (Source 3) instead of landing in "its" month as if it were in-year.
    expect(pl.hasDatedData).toBe(false);
    expect(pl.monthlyData.every((m) => m.revenue === Math.round(119_500 / 12))).toBe(true);
  });

  it("does bucket a dated document whose year matches income.year", () => {
    const p = makePersona({
      income: {
        year: 2026,
        totalRevenue: 119_500,
        totalDeductibleExpenses: 0,
        invoices: [
          {
            invoiceNumber: "2026-0001",
            date: "2026-08-05",
            customerName: "לקוח",
            description: "שירות",
            amount: 6_500,
            vat: 0,
            total: 6_500,
            docType: "receipt",
            status: "paid",
          },
        ],
        expenses: [],
      },
    });
    const pl = calculatePL(p);
    expect(pl.monthlyData[7].revenue).toBe(6_500); // August, 0-indexed
    expect(pl.hasDatedData).toBe(true);
  });
});

describe("calculatePL — expense-breakdown reconciles to totalExpenses", () => {
  it("adds an unclassified-baseline slice so the pie sum always equals totalExpenses", () => {
    const p = makePersona({
      income: {
        year: 2026,
        totalRevenue: 119_500,
        totalDeductibleExpenses: 20_000, // undated baseline
        expenses: [
          {
            date: "2026-08-06",
            vendorName: "ספק",
            description: "ציוד",
            amount: 3_009,
            vat: 0,
            category: "ציוד",
            deductionRule: "full",
          },
        ],
      },
    });
    const pl = calculatePL(p);
    const sum = pl.expenseBreakdown.reduce((s, e) => s + e.amount, 0);
    expect(sum).toBe(pl.totalExpenses); // was 3,009 vs a true 23,009 before the fix
    const categorized = pl.expenseBreakdown.find((e) => e.category === "ציוד");
    expect(categorized?.amount).toBe(3_009);
    const residual = pl.expenseBreakdown.find((e) => e.category !== "ציוד");
    expect(residual?.amount).toBe(20_000);
  });

  it("adds no residual slice when dated categories already cover the full total", () => {
    const p = makePersona({
      income: {
        year: 2026,
        totalRevenue: 10_000,
        totalDeductibleExpenses: 0, // no baseline — the dated row is the whole total
        expenses: [
          {
            date: "2026-08-06",
            vendorName: "ספק",
            description: "ציוד",
            amount: 3_009,
            vat: 0,
            category: "ציוד",
            deductionRule: "full",
          },
        ],
      },
    });
    const pl = calculatePL(p);
    expect(pl.expenseBreakdown).toHaveLength(1);
    expect(pl.expenseBreakdown[0].amount).toBe(3_009);
  });
});
