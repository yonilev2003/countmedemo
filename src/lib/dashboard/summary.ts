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
import type { CeilingAlert } from "@/lib/alerts/ceiling";

export interface MonthSummary {
  /** "YYYY-MM" of the summarized calendar month. */
  monthKey: string;
  revenue: number;        // ex-VAT
  expenses: number;
  /** expenses / revenue, null when revenue is 0 (never divide-by-zero). */
  ratio: number | null;
  revenueDocCount: number;
  expenseCount: number;
  /** Non-deleted expenses with status "needs_review", regardless of month —
   *  drives the dashboard nudge strip (not a monthly figure by design: a
   *  needs_review row from last month is still unresolved today). */
  needsReviewCount: number;
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

  // Not scoped to monthKey on purpose — an unresolved needs_review row from
  // any month should keep nudging until the user completes it.
  const needsReviewCount = expenses.filter(
    (e) => !e.deletedAt && e.status === "needs_review",
  ).length;

  return {
    monthKey,
    revenue,
    expenses: expenseSum,
    ratio: revenue > 0 ? expenseSum / revenue : null,
    revenueDocCount,
    expenseCount,
    needsReviewCount,
    isFirstUse: invoices.length === 0 && expenses.length === 0,
  };
}

/**
 * The Eitan dashboard line — a deterministic Hebrew template over the summary
 * (zero LLM calls from the dashboard; "עובדות, לא עצות"). Kept to 1-2 short
 * factual sentences in Eitan's register.
 */
/**
 * Ceiling awareness (Yoni, 18/08): the deterministic "שקל אומר" line is the
 * ONE always-visible AI voice on the light dashboard — a user approaching
 * the עוסק פטור/זעיר turnover ceiling must see it react here, not only on
 * /alerts (which nothing links to from the light dashboard's daily flow).
 * Crossing the ceiling is not optional — registration as עוסק מורשה becomes
 * mandatory and the זעיר/פטור benefits are lost, so this is surfaced from
 * "approaching" (60%+) onward, using the SAME headline the ceiling engine
 * already computes (one source of truth, never a second hand-written copy
 * of the threshold rule).
 */
export function eitanMonthLine(
  s: MonthSummary,
  firstName?: string,
  ceiling?: CeilingAlert | null,
): string {
  const name = firstName?.trim() ? `${firstName.trim()}, ` : "";
  const ceilingNote =
    ceiling && ceiling.level !== "safe" ? ` ${ceiling.headlineHe}.` : "";

  if (s.isFirstUse) {
    return (
      `${name}ברוכים הבאים! ברגע שתפיקו את המסמך הראשון או תתעדו הוצאה — ` +
      `המספרים כאן יתחילו לזוז.${ceilingNote}`
    );
  }
  if (s.revenue === 0 && s.expenses === 0) {
    return `${name}החודש עוד לא תועדו הכנסות או הוצאות. הכפתורים למטה מחכים.${ceilingNote}`;
  }
  const rev = `${s.revenue.toLocaleString("he-IL")} ₪`;
  if (s.revenue === 0) {
    return `${name}החודש תועדו הוצאות של ${s.expenses.toLocaleString("he-IL")} ₪ ועדיין אין הכנסות.${ceilingNote}`;
  }
  const ratioPart =
    s.ratio !== null && s.ratio > 0
      ? ` ההוצאות הן ${Math.round(s.ratio * 100)}% מההכנסות`
      : "";
  return (
    `${name}החודש נכנסו ${rev} מ-${s.revenueDocCount} ` +
    `${s.revenueDocCount === 1 ? "מסמך" : "מסמכים"}.${ratioPart ? ratioPart + "." : ""}${ceilingNote}`
  );
}

/* ── Year-to-date summary (Yoni, 16/08): the setup wizard's annual figures are
   the BASELINE ("כמה הכנסת השנה עד כה"), and documents/expenses created in
   the app add on top from that point. Revenue docs already bump
   income.totalRevenue at creation (invoices/new), so the scalar IS the YTD
   figure; expense rows never bump their scalar, so YTD expenses = baseline +
   active in-app rows for the declared year. ───────────────────────────────
 *
 * FP-07 (2026-08-19, Yoni's live finding — "אין הפרדה לנתונים"): the wizard
 * baseline scalars (totalRevenue/totalDeductibleExpenses) describe ONE year
 * only — persona.income.year, the year the user typed them in for — but
 * computeYearSummary used to read them unconditionally regardless of which
 * year the dashboard was actually showing, so every year looked identical.
 *
 * Scoping rule (product-approved middle path — no data-model overhaul):
 *   - year === persona.income.year (the default): UNCHANGED behavior —
 *     baseline + every non-deleted document, exactly as before this fix.
 *   - year !== persona.income.year: the baseline contributes ZERO (it isn't
 *     this year's figure), and only documents whose OWN date falls in the
 *     requested year count — revenue docs via isRevenueDoc + date, expense
 *     rows via non-deleted + date, both ex-VAT.
 * Every call site that omits `year` keeps its exact current behavior. */

export interface YearSummary {
  /** The tax year these totals describe (the requested `year`, or the
   *  persona's declared year when no `year` argument is passed). */
  year: number;
  /** Baseline (declared year only) + matching revenue docs, ex-VAT. */
  revenueYtd: number;
  /** Baseline (declared year only) + matching non-deleted expense rows. */
  expensesYtd: number;
  /** expensesYtd / revenueYtd, null when revenue is 0. */
  ratioYtd: number | null;
}

/** True when an ISO date's year matches `year` — local copy of the same
 *  convention p-and-l/index.ts's isInTaxYear uses (module-ownership
 *  boundaries keep this a duplicate, not a shared import; keep both in sync
 *  if the underlying rule ever changes). */
function isInYear(iso: string, year: number): boolean {
  return iso.startsWith(String(year));
}

export function computeYearSummary(
  persona: Persona,
  year: number = persona.income.year,
): YearSummary {
  const isDeclaredYear = year === persona.income.year;

  // Revenue: for the DECLARED year the scalar already IS baseline + docs
  // (revenue docs bump income.totalRevenue unconditionally at creation —
  // see invoices/new) — reading it directly is unchanged from before this
  // fix. For any OTHER requested year the scalar carries no meaning (it
  // describes the declared year only), so sum only revenue docs dated in
  // that year instead — the baseline contributes 0.
  const revenueYtd = isDeclaredYear
    ? persona.income.totalRevenue
    : Math.round(
        (persona.income.invoices ?? [])
          .filter((inv) => isRevenueDoc(inv.docType) && isInYear(inv.date, year))
          .reduce((sum, inv) => sum + inv.amount, 0) * 100,
      ) / 100;

  // Expenses: for the DECLARED year, SYMMETRY with revenue (journey-scan
  // finding, unchanged from before this fix) — every non-deleted row counts
  // regardless of its own calendar date, via the shared helper that שדה 150
  // / P&L / forecast also read. For any OTHER requested year the baseline
  // contributes 0 and only rows dated in that year count.
  const expensesYtd = isDeclaredYear
    ? effectiveDeductibleExpenses(persona.income)
    : Math.round(
        (persona.income.expenses ?? [])
          .filter((e) => !e.deletedAt && isInYear(e.date, year))
          .reduce((sum, e) => sum + (e.amount - (e.vat ?? 0)), 0) * 100,
      ) / 100;

  return {
    year,
    revenueYtd,
    expensesYtd,
    ratioYtd: revenueYtd > 0 ? expensesYtd / revenueYtd : null,
  };
}
