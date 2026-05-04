/**
 * P&L calculation functions for the dashboard.
 * Pure functions — no React, no side effects.
 *
 * Strategy for monthly breakdown (in priority order):
 *   1. If persona.income.invoices[] has dates → group revenue by month from invoices.
 *      Same for expenses.
 *   2. Else if persona.income.monthlyBreakdown exists → use that.
 *   3. Else distribute totals evenly across 12 months (demo fallback).
 */

import { Persona } from "@/lib/persona";

export interface MonthlyPL {
  month: number; // 1-12
  label: string; // "ינו׳", "פבר׳", etc.
  revenue: number;
  expenses: number;
  net: number;
}

export interface PLSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  expenseBreakdown: { category: string; amount: number }[];
  monthlyData: MonthlyPL[];
  /** True iff month-level data came from real dated line items (invoices/expenses). */
  hasDatedData: boolean;
  /** First and last month with any activity, 1-12. Useful for auto-zoom. */
  activeRange: { from: number; to: number };
}

const MONTH_LABELS = [
  "ינו׳",
  "פבר׳",
  "מרץ",
  "אפר׳",
  "מאי",
  "יוני",
  "יולי",
  "אוג׳",
  "ספט׳",
  "אוק׳",
  "נוב׳",
  "דצמ׳",
];

function monthFromIso(iso: string): number | null {
  // Accepts "YYYY-MM-DD" or "YYYY-MM"
  const parts = iso.split("-");
  if (parts.length < 2) return null;
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(m) || m < 1 || m > 12) return null;
  return m;
}

export function calculatePL(persona: Persona): PLSummary {
  const totalRevenue = persona.income.totalRevenue;
  const totalExpenses = persona.income.totalDeductibleExpenses;
  const netProfit = totalRevenue - totalExpenses;

  // Initialize 12-month buckets
  const revenueByMonth = Array(12).fill(0) as number[];
  const expensesByMonth = Array(12).fill(0) as number[];

  let hasDatedData = false;

  // Source 1: dated invoice line items
  const invoices = persona.income.invoices ?? [];
  if (invoices.length > 0) {
    for (const inv of invoices) {
      const m = monthFromIso(inv.date);
      if (m !== null) {
        revenueByMonth[m - 1] += inv.total;
        hasDatedData = true;
      }
    }
  }

  // Source 1: dated expense line items
  const expensesLines = persona.income.expenses ?? [];
  if (expensesLines.length > 0) {
    for (const exp of expensesLines) {
      const m = monthFromIso(exp.date);
      if (m !== null) {
        expensesByMonth[m - 1] += exp.amount;
        hasDatedData = true;
      }
    }
  }

  // Source 2: monthlyBreakdown (only fills in months that line items didn't cover)
  const mb = persona.income.monthlyBreakdown ?? [];
  for (const row of mb) {
    const monthVal = row.month;
    let m: number | null = null;
    if (typeof monthVal === "number") m = monthVal;
    else if (typeof monthVal === "string") m = monthFromIso(monthVal);
    if (m === null) continue;
    if (revenueByMonth[m - 1] === 0) revenueByMonth[m - 1] = row.revenue;
    if (expensesByMonth[m - 1] === 0) expensesByMonth[m - 1] = row.expenses;
  }

  // Source 3: even distribution (only for months still empty AND we have no dated source)
  if (!hasDatedData && mb.length === 0) {
    const evenRev = Math.round(totalRevenue / 12);
    const evenExp = Math.round(totalExpenses / 12);
    for (let i = 0; i < 12; i++) {
      revenueByMonth[i] = evenRev;
      expensesByMonth[i] = evenExp;
    }
  }

  const monthlyData: MonthlyPL[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    label: MONTH_LABELS[i],
    revenue: revenueByMonth[i],
    expenses: expensesByMonth[i],
    net: revenueByMonth[i] - expensesByMonth[i],
  }));

  // Active range — first and last month with any non-zero activity
  let from = 1;
  let to = 12;
  if (hasDatedData) {
    const activeMonths = monthlyData
      .filter((m) => m.revenue > 0 || m.expenses > 0)
      .map((m) => m.month);
    if (activeMonths.length > 0) {
      from = Math.min(...activeMonths);
      to = Math.max(...activeMonths);
    }
  }

  // Expense breakdown by category — line items if any, else rough demo split.
  let expenseBreakdown: { category: string; amount: number }[] = [];
  if (expensesLines.length > 0) {
    const byCategory: Record<string, number> = {};
    for (const exp of expensesLines) {
      byCategory[exp.category] = (byCategory[exp.category] ?? 0) + exp.amount;
    }
    expenseBreakdown = Object.entries(byCategory).map(([category, amount]) => ({
      category,
      amount,
    }));
  } else {
    expenseBreakdown = [
      { category: "תוכנות ומנויים", amount: Math.round(totalExpenses * 0.25) },
      { category: "השתלמות ולמידה", amount: Math.round(totalExpenses * 0.15) },
      { category: "ציוד ומחשוב", amount: Math.round(totalExpenses * 0.3) },
      { category: "ביטוח לאומי", amount: Math.round(totalExpenses * 0.2) },
      { category: "אחר", amount: Math.round(totalExpenses * 0.1) },
    ];
  }

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    expenseBreakdown,
    monthlyData,
    hasDatedData,
    activeRange: { from, to },
  };
}

export function filterByQuarter(
  data: MonthlyPL[],
  quarter: 1 | 2 | 3 | 4,
): MonthlyPL[] {
  const start = (quarter - 1) * 3 + 1;
  return data.filter((m) => m.month >= start && m.month <= start + 2);
}

export function filterByMonth(
  data: MonthlyPL[],
  month: number,
): MonthlyPL[] {
  return data.filter((m) => m.month === month);
}
