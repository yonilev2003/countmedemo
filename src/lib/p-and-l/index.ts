/**
 * P&L calculation functions for the dashboard.
 * Pure functions — no React, no side effects.
 *
 * Strategy for monthly breakdown (in priority order):
 *   1. If persona.income.monthlyBreakdown covers ≥ 6 months → use it (complete truth).
 *   2. Else if persona.income.invoices[] has dated entries → group revenue by month.
 *      Same for expenses. `hasDatedData` = true.
 *   3. Else distribute totals evenly across 12 months (demo fallback).
 *
 * Note: monthlyBreakdown takes priority over sample invoices because it represents
 * the complete monthly summary (not just a few sampled line items).
 */

import { Persona } from "@/lib/persona";
import { classifyExpensePLImpact, type PLImpact } from "@/lib/regulatory/deductions";
import {
  ACTIVE_FILING_YEAR,
  DEFAULT_VIEW_YEAR,
} from "@/lib/calculators/types";

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
  /** Each category carries its P&L destination + deductible fraction (from the deductions registry). */
  expenseBreakdown: { category: string; amount: number; plImpact: PLImpact; recognizedRate: number }[];
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

function yearFromIso(iso: string): number | null {
  // Accepts "YYYY-MM-DD" or "YYYY-MM"
  const y = parseInt(String(iso).split("-")[0], 10);
  return Number.isNaN(y) ? null : y;
}

/**
 * Return the distinct tax years that have any data attached to this persona —
 * derived from dated invoices, dated expenses, and monthlyBreakdown keys, plus
 * the persona's declared `income.year`. Sorted descending (latest first).
 *
 * Used to drive a year selector. For the default demo persona (all 2024) this
 * is just `[2024]`, so no selector appears and nothing changes.
 */
export function availableTaxYears(persona: Persona): number[] {
  const years = new Set<number>();
  if (persona.income.year) years.add(persona.income.year);
  for (const inv of persona.income.invoices ?? []) {
    const y = yearFromIso(inv.date);
    if (y !== null) years.add(y);
  }
  for (const exp of persona.income.expenses ?? []) {
    const y = yearFromIso(exp.date);
    if (y !== null) years.add(y);
  }
  for (const row of persona.income.monthlyBreakdown ?? []) {
    if (typeof row.month === "string") {
      const y = yearFromIso(row.month);
      if (y !== null) years.add(y);
    }
  }
  return [...years].sort((a, b) => b - a);
}

/**
 * Years to offer in the UI year-selector. Unions the years that actually have
 * data (`availableTaxYears`) with the lifecycle years the product always knows
 * about — the default view year (2024), the year open for filing now (2025) and
 * the next/future year (2026) — so the selector always exposes the full
 * filed / open / future trio even before a year has any records. Sorted newest
 * first.
 */
export function taxYearsForUI(persona: Persona): number[] {
  const years = new Set<number>(availableTaxYears(persona));
  years.add(DEFAULT_VIEW_YEAR);
  years.add(ACTIVE_FILING_YEAR);
  years.add(ACTIVE_FILING_YEAR + 1);
  return [...years].sort((a, b) => b - a);
}

/**
 * Project a persona onto a single tax year.
 *
 * Invoices, expenses and monthlyBreakdown are filtered to records whose date/key
 * belongs to `year`. The scalar income totals (totalRevenue / totalDeductible-
 * Expenses / counts) are RECOMPUTED from the year's records *only when there is
 * year-tagged data that crosses more than one year* — i.e. only when the raw
 * scalar totals can no longer be trusted to describe a single year. When all of
 * the persona's data lives in one year (the default demo: everything 2024), the
 * scalar totals are kept verbatim so existing numbers are byte-for-byte unchanged.
 *
 * This is the single seam that gives the dashboard, P&L report and every insight
 * card (expense-ratio, forecast, ceiling, Eitan) per-year separation: feed them
 * `personaForYear(persona, activeYear)` instead of the raw persona.
 */
export function personaForYear(persona: Persona, year: number): Persona {
  const allYears = availableTaxYears(persona);
  const isSingleYear = allYears.length <= 1;

  // Single-year persona (the demo): nothing to separate — return as-is so the
  // 2024 path is identical to before.
  if (isSingleYear) return persona;

  const invoices = (persona.income.invoices ?? []).filter(
    (inv) => yearFromIso(inv.date) === year,
  );
  const expenses = (persona.income.expenses ?? []).filter(
    (exp) => yearFromIso(exp.date) === year,
  );
  const monthlyBreakdown = (persona.income.monthlyBreakdown ?? []).filter(
    (row) => typeof row.month !== "string" || yearFromIso(row.month) === year,
  );

  // Recompute the year's headline totals. Prefer monthlyBreakdown (the
  // authoritative monthly summary the new-invoice flow keeps in sync); fall
  // back to summing dated line items.
  let totalRevenue: number;
  let totalExpenses: number;
  if (monthlyBreakdown.length > 0) {
    totalRevenue = monthlyBreakdown.reduce((s, r) => s + (r.revenue || 0), 0);
    totalExpenses = monthlyBreakdown.reduce((s, r) => s + (r.expenses || 0), 0);
  } else {
    totalRevenue = invoices.reduce((s, i) => s + i.total, 0);
    totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  }

  return {
    ...persona,
    income: {
      ...persona.income,
      year,
      totalRevenue,
      totalDeductibleExpenses: totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      invoiceCount: invoices.length,
      expenseCount: expenses.length,
      invoices,
      expenses,
      monthlyBreakdown,
    },
  };
}

export function calculatePL(persona: Persona): PLSummary {
  const totalRevenue = persona.income.totalRevenue;
  const totalExpenses = persona.income.totalDeductibleExpenses;
  const netProfit = totalRevenue - totalExpenses;

  // Initialize 12-month buckets
  const revenueByMonth = Array(12).fill(0) as number[];
  const expensesByMonth = Array(12).fill(0) as number[];

  let hasDatedData = false;

  // Source 1: monthlyBreakdown — authoritative when it covers ≥ 6 months
  const mb = persona.income.monthlyBreakdown ?? [];
  const mbCoveredMonths = new Set<number>();
  if (mb.length >= 6) {
    for (const row of mb) {
      const monthVal = row.month;
      let m: number | null = null;
      if (typeof monthVal === "number") m = monthVal;
      else if (typeof monthVal === "string") m = monthFromIso(monthVal);
      if (m === null) continue;
      revenueByMonth[m - 1] = row.revenue;
      expensesByMonth[m - 1] = row.expenses;
      mbCoveredMonths.add(m);
    }
  }

  // Source 2: dated invoice/expense line items — only when monthlyBreakdown is sparse
  const invoices = persona.income.invoices ?? [];
  const expensesLines = persona.income.expenses ?? [];

  if (mbCoveredMonths.size < 6) {
    if (invoices.length > 0) {
      for (const inv of invoices) {
        const m = monthFromIso(inv.date);
        if (m !== null) {
          revenueByMonth[m - 1] += inv.total;
          hasDatedData = true;
        }
      }
    }
    if (expensesLines.length > 0) {
      for (const exp of expensesLines) {
        const m = monthFromIso(exp.date);
        if (m !== null) {
          expensesByMonth[m - 1] += exp.amount;
          hasDatedData = true;
        }
      }
    }
  }

  // Source 3: even distribution (only if both sources above produced nothing)
  if (!hasDatedData && mbCoveredMonths.size === 0) {
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
  let rawBreakdown: { category: string; amount: number }[] = [];
  if (expensesLines.length > 0) {
    const byCategory: Record<string, number> = {};
    for (const exp of expensesLines) {
      byCategory[exp.category] = (byCategory[exp.category] ?? 0) + exp.amount;
    }
    rawBreakdown = Object.entries(byCategory).map(([category, amount]) => ({
      category,
      amount,
    }));
  } else {
    rawBreakdown = [
      { category: "תוכנות ומנויים", amount: Math.round(totalExpenses * 0.25) },
      { category: "השתלמות ולמידה", amount: Math.round(totalExpenses * 0.15) },
      { category: "ציוד ומחשוב", amount: Math.round(totalExpenses * 0.3) },
      { category: "ביטוח לאומי", amount: Math.round(totalExpenses * 0.2) },
      { category: "אחר", amount: Math.round(totalExpenses * 0.1) },
    ];
  }

  // Tag each category with where it lands in the P&L and its deductible
  // fraction — the registry is the authority for both.
  const year = persona.income.year ?? new Date().getFullYear() - 1;
  const expenseBreakdown = rawBreakdown.map((e) => {
    const routing = classifyExpensePLImpact(e.category, year);
    return { ...e, plImpact: routing.plImpact, recognizedRate: routing.recognizedRate };
  });

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
