/**
 * The light dashboard's three numbers (CEO plan §3.2): הכנסות · הוצאות · יחס.
 *
 * Deterministic and derived ONLY from actual documents/expense rows — never
 * from wizard estimates or synthetic monthly spreads (calculatePL fabricates a
 * uniform spread when only annual totals exist; the daily-life dashboard must
 * show real activity or honest zeros — the empty state IS the product).
 *
 * Revenue = ex-VAT sums of payment docs (receipt / tax-invoice-receipt) in the
 * period. Quotes and business-accounts never count (payment not received).
 * VAT is never computed here — the stored per-document split (calculated at
 * creation via calculateInvoiceTotals + getTaxYearConstants) is authoritative.
 */

import { Persona, effectiveDeductibleExpenses } from "@/lib/persona";
import { isRevenueDoc } from "@/lib/invoice-generator";

export interface MonthSummary {
  /** "YYYY-MM" of the summarized calendar month. */
  monthKey: string;
  revenue: number;        // ex-VAT
  expenses: number;
  /** expenses / revenue, null when revenue is 0 (never divide-by-zero). */
  ratio: number | null;
  revenueDocCount: number;
  expenseCount: number;
  /** True when the user has NO documents and NO expense rows at all (ever) —
   *  drives the day-0 empty state, the most important screen of the beta. */
  isFirstUse: boolean;
}

/** Year-aware "YYYY-MM" from an ISO date ("2026-07-03" → "2026-07"). */
export function yearMonthKey(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  return m ? `${m[1]}-${m[2]}` : null;
}

export function computeMonthSummary(
  persona: Persona,
  today: Date = new Date(),
): MonthSummary {
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const invoices = persona.income.invoices ?? [];
  const expenses = persona.income.expenses ?? [];

  let revenue = 0;
  let revenueDocCount = 0;
  for (const inv of invoices) {
    if (!isRevenueDoc(inv.docType)) continue;
    if (yearMonthKey(inv.date) !== monthKey) continue;
    revenue += inv.amount; // ex-VAT by definition of InvoiceLine.amount
    revenueDocCount += 1;
  }

  let expenseSum = 0;
  let expenseCount = 0;
  for (const e of expenses) {
    if (e.deletedAt) continue; // soft-deleted — hidden in /expenses, must not inflate the card
    if (yearMonthKey(e.date) !== monthKey) continue;
    // Net of reclaimable input VAT (0 for patur) — same basis as the ex-VAT
    // revenue above, so the ratio compares like with like.
    expenseSum += e.amount - (e.vat ?? 0);
    expenseCount += 1;
  }

  return {
    monthKey,
    revenue,
    expenses: expenseSum,
    ratio: revenue > 0 ? expenseSum / revenue : null,
    revenueDocCount,
    expenseCount,
    isFirstUse: invoices.length === 0 && expenses.length === 0,
  };
}

/**
 * The Eitan dashboard line — a deterministic Hebrew template over the summary
 * (zero LLM calls from the dashboard; "עובדות, לא עצות"). Kept to 1-2 short
 * factual sentences in Eitan's register.
 */
export function eitanMonthLine(s: MonthSummary, firstName?: string): string {
  const name = firstName?.trim() ? `${firstName.trim()}, ` : "";
  if (s.isFirstUse) {
    return (
      `${name}ברוכים הבאים! ברגע שתפיקו את המסמך הראשון או תתעדו הוצאה — ` +
      `המספרים כאן יתחילו לזוז.`
    );
  }
  if (s.revenue === 0 && s.expenses === 0) {
    return `${name}החודש עוד לא תועדו הכנסות או הוצאות. הכפתורים למטה מחכים.`;
  }
  const rev = `${s.revenue.toLocaleString("he-IL")} ₪`;
  if (s.revenue === 0) {
    return `${name}החודש תועדו הוצאות של ${s.expenses.toLocaleString("he-IL")} ₪ ועדיין אין הכנסות.`;
  }
  const ratioPart =
    s.ratio !== null && s.ratio > 0
      ? ` ההוצאות הן ${Math.round(s.ratio * 100)}% מההכנסות`
      : "";
  return (
    `${name}החודש נכנסו ${rev} מ-${s.revenueDocCount} ` +
    `${s.revenueDocCount === 1 ? "מסמך" : "מסמכים"}.${ratioPart ? ratioPart + "." : ""}`
  );
}

/* ── Year-to-date summary (Yoni, 16/08): the setup wizard's annual figures are
   the BASELINE ("כמה הכנסת השנה עד כה"), and documents/expenses created in
   the app add on top from that point. Revenue docs already bump
   income.totalRevenue at creation (invoices/new), so the scalar IS the YTD
   figure; expense rows never bump their scalar, so YTD expenses = baseline +
   active in-app rows for the declared year. ─────────────────────────────── */

export interface YearSummary {
  /** Declared tax year the totals describe. */
  year: number;
  /** Baseline from setup + revenue docs created since (ex-VAT). */
  revenueYtd: number;
  /** Baseline from setup + non-deleted in-app expense rows for the year. */
  expensesYtd: number;
  /** expensesYtd / revenueYtd, null when revenue is 0. */
  ratioYtd: number | null;
}

export function computeYearSummary(persona: Persona): YearSummary {
  const year = persona.income.year;
  const revenueYtd = persona.income.totalRevenue;
  // SYMMETRY with revenue (journey-scan finding): revenue docs bump the
  // scalar unconditionally at creation, so the expense side must also count
  // every non-deleted row regardless of its calendar year — otherwise a
  // quick expense dated "today" silently vanishes from the card whenever the
  // declared tax year lags the calendar year (e.g. year=2025, today=2026).
  // The shared helper is also what שדה 150 / P&L / forecast read, so the
  // light dashboard can never disagree with the tax surfaces again.
  const expensesYtd = effectiveDeductibleExpenses(persona.income);
  return {
    year,
    revenueYtd,
    expensesYtd,
    ratioYtd: revenueYtd > 0 ? expensesYtd / revenueYtd : null,
  };
}
