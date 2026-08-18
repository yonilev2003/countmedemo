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

import { Persona, effectiveDeductibleExpenses } from "@/lib/persona";
import { isRevenueDoc } from "@/lib/invoice-generator";
import { classifyExpensePLImpact, type PLImpact } from "@/lib/regulatory/deductions";

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

/** True when an ISO date's year matches the persona's declared tax year —
 *  without this, a document dated in a DIFFERENT calendar year than
 *  income.year (e.g. a real Aug-2026 receipt on a persona still declaring
 *  income.year=2025) got bucketed into that month as if it belonged to the
 *  declared year, corrupting both the P&L monthly view and the forecast's
 *  active-months detection (audit, 2026-08-18). */
function isInTaxYear(iso: string, year: number): boolean {
  return iso.startsWith(String(year));
}

export function calculatePL(persona: Persona): PLSummary {
  const totalRevenue = persona.income.totalRevenue;
  // Shared YTD derivation (baseline + non-deleted rows, net of reclaimable
  // VAT) — the P&L must show the same expenses figure as the dashboards.
  const totalExpenses = effectiveDeductibleExpenses(persona.income);
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
        // Only payment docs are revenue (a business-account/quote is a demand,
        // not income), and turnover is EX-VAT — `total` here counted output
        // VAT as income and inflated the P&L cards (journey-scan round 2:
        // 8,260 shown against a true 2,000 net).
        if (!isRevenueDoc(inv.docType)) continue;
        // A document dated outside the persona's declared tax year isn't
        // this year's activity (audit finding, 2026-08-18) — e.g. a real
        // Aug-2026 receipt on a persona still declaring income.year=2025.
        if (!isInTaxYear(inv.date, persona.income.year)) continue;
        const m = monthFromIso(inv.date);
        if (m !== null) {
          revenueByMonth[m - 1] += inv.amount;
          hasDatedData = true;
        }
      }
    }
    if (expensesLines.length > 0) {
      for (const exp of expensesLines) {
        if (exp.deletedAt) continue; // soft-deleted — hidden everywhere else too
        if (!isInTaxYear(exp.date, persona.income.year)) continue;
        const m = monthFromIso(exp.date);
        if (m !== null) {
          // Net of reclaimable input VAT — same basis as totalExpenses above.
          expensesByMonth[m - 1] += exp.amount - (exp.vat ?? 0);
          hasDatedData = true;
        }
      }
    }
    // NOTE: the undated setup-wizard baseline is intentionally NOT smoothed
    // into monthlyData here — that would corrupt the monthly chart's one
    // job (showing where REAL dated activity happened) with synthetic
    // filler. The year-total reconciliation (baseline+docs must equal
    // totalRevenue/totalExpenses) instead happens at the CALLER: read
    // pl.totalRevenue/totalExpenses directly for a "whole year" view rather
    // than re-summing monthlyData, which only ever holds dated-only figures
    // (audit, 2026-08-18 — see dashboard/pro/page.tsx and the expense-pie
    // reconciliation below).
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
      if (exp.deletedAt) continue;
      byCategory[exp.category] =
        (byCategory[exp.category] ?? 0) + (exp.amount - (exp.vat ?? 0));
    }
    rawBreakdown = Object.entries(byCategory).map(([category, amount]) => ({
      category,
      amount,
    }));
    // Reconcile against the setup-wizard BASELINE (totalExpenses is the
    // authoritative YTD figure — baseline + rows; the loop above only ever
    // sees categorized rows). Without this the pie silently dropped the
    // baseline entirely the moment even one dated row existed — 100% of a
    // ₪23,009 total rendering as one ₪3,009 category (audit, 2026-08-18).
    const categorizedSum = rawBreakdown.reduce((s, r) => s + r.amount, 0);
    const uncategorized = Math.round(totalExpenses - categorizedSum);
    if (uncategorized > 0) {
      rawBreakdown.push({ category: "יתרה לא מסווגת (מהגדרה הראשונית)", amount: uncategorized });
    }
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
