/**
 * Golden test — risk-gap.md §7.4 #2: category-based partial-deduction rates
 * (vehicle 45%, phone/internet 80%) must actually reduce the operating-expense
 * total in the Israeli P&L report, not just be computed and then ignored.
 */

import { describe, it, expect } from "vitest";
import { calculatePL } from "@/lib/p-and-l/index";
import { buildIsraeliPLReport } from "@/lib/p-and-l/israeli-report";
import type { ExpenseLine } from "@/lib/persona";
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

describe("buildIsraeliPLReport — operating-expense recognizedRate", () => {
  it("a vehicle expense (רכב, 45% recognised) reduces operatingExpenses by its recognised fraction, not its gross amount", () => {
    const p = makePersona({
      income: { year: 2026, totalRevenue: 100000, totalDeductibleExpenses: 0 },
    });
    p.income.expenses = [expense({ category: "רכב", amount: 1000, vat: 0 })];
    const report = buildIsraeliPLReport(p, calculatePL(p));
    // Old bug: operatingExpenses would be 1000 (100%). Correct: 450 (45%).
    expect(report.totals.operatingExpenses).toBe(450);
  });

  it("an internet/phone expense (80% recognised) is netted the same way", () => {
    const p = makePersona({
      income: { year: 2026, totalRevenue: 100000, totalDeductibleExpenses: 0 },
    });
    p.income.expenses = [expense({ category: "אינטרנט", amount: 500, vat: 0 })];
    const report = buildIsraeliPLReport(p, calculatePL(p));
    expect(report.totals.operatingExpenses).toBe(400);
  });

  it("risk-gap.md §9: a courier's (שליח) vehicle expense is recognised at 25% (dataset), not the flat 45% fallback", () => {
    const p = makePersona({
      business: { primaryOccupation: "שליח" },
      income: { year: 2026, totalRevenue: 100000, totalDeductibleExpenses: 0 },
    });
    p.income.expenses = [expense({ category: "רכב", amount: 1000, vat: 0 })];
    const report = buildIsraeliPLReport(p, calculatePL(p));
    expect(report.totals.operatingExpenses).toBe(250);
  });

  it("an unmatched category still counts at 100% (no regression for the common case)", () => {
    const p = makePersona({
      income: { year: 2026, totalRevenue: 100000, totalDeductibleExpenses: 0 },
    });
    p.income.expenses = [expense({ category: "תוכנות ומנויים", amount: 300, vat: 0 })];
    const report = buildIsraeliPLReport(p, calculatePL(p));
    expect(report.totals.operatingExpenses).toBe(300);
  });
});
