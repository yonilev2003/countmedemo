/**
 * דוח מע"מ תקופתי — periodic VAT report (Form 874 field mapping).
 *
 * IN-APP ONLY, INFORMATIONAL — this is Yoni's explicit scope for this feature
 * (2026-08-22): "רק ברמות שלא חייבים עכשיו api רשמי". It computes Form 874's
 * fields from data already in the persona (invoices + expenses) and displays
 * them. It does NOT call SHAAM, does NOT submit anything, and is not a
 * substitute for the official portal — same posture as pl-report/israeli-report
 * (a computed report the user reads, copies from, or hands to their accountant).
 *
 * Field mapping source: the israeli-vat-reporting skill (Step 4) + Form 874.
 * VAT applicability: only an עוסק מורשה charges/reclaims VAT — this includes a
 * murshe-זעיר (Amendment 265: זעיר is an income-tax track, independent of VAT
 * registration — see lib/alerts/ceiling.ts's isMursheZeir doc). A plain עוסק
 * פטור never files a periodic VAT report — only an annual turnover declaration
 * (vat-osek-patur-annual in lib/deadlines/calendar.ts) — so `applicable` is
 * false for it here.
 *
 * Reporting cadence (israeli-vat-reporting skill, §69A(g) of the VAT Law):
 * annual turnover > 1,500,000 ₪ → monthly; otherwise bi-monthly. Read from
 * persona.vatAndTurnover.annualTurnoverWithoutVat — the persona's own
 * dedicated field for this, not re-derived from income.totalRevenue.
 *
 * NOT MODELED (flagged in notesHe, not silently zeroed-and-hidden): zero-rated
 * (export) sales and VAT-exempt sales — InvoiceLine has no field distinguishing
 * either from a standard domestic sale, so fields 2/3 are always 0 with an
 * explicit caveat rather than a confident-looking wrong number.
 */

import type { Persona, ExpenseLine, InvoiceLine } from "@/lib/persona";
import { getTaxYearConstants } from "@/lib/calculators/types";
import { isRevenueDoc } from "@/lib/invoice-generator";

export type VatCadence = "monthly" | "bi-monthly";

/** Annual turnover (ex-VAT) above which a filer must report monthly (§69A(g)). */
const MONTHLY_CADENCE_THRESHOLD = 1_500_000;

/** Annual turnover (ex-VAT) above which the detailed 874 report is required from 2026. */
const DETAILED_874_THRESHOLD = 500_000;

export interface VatPeriod {
  year: number;
  /** 0-based calendar month the period starts in. */
  startMonth: number;
  /** 0-based calendar month the period ends in (inclusive). */
  endMonth: number;
  labelHe: string;
}

export interface VatReportField {
  code: number;
  labelHe: string;
  labelEn: string;
  amount: number;
}

export interface VatReport {
  /** False for עוסק פטור — no periodic VAT report exists for them. */
  applicable: boolean;
  cadence: VatCadence;
  period: VatPeriod;
  /** All available periods for this year+cadence, for a period switcher UI. */
  availablePeriods: VatPeriod[];
  fields: VatReportField[];
  /** Field 4 — total output VAT. */
  outputVat: number;
  /** Field 6 — total input VAT. */
  inputVat: number;
  /** Field 7 — net VAT (output - input). Positive = owed, negative = credit. */
  netVat: number;
  /** Field 9 — amount due/refund after adjustments (== netVat + field 8, field 8 always 0 today). */
  amountDue: number;
  vatRate: number;
  invoiceCount: number;
  expenseCount: number;
  /** ISO date string — the online (SHAAM) filing deadline for this period. */
  onlineDueDate: string;
  notesHe: string[];
}

const MONTH_NAMES_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function biMonthlyPeriods(year: number): VatPeriod[] {
  const periods: VatPeriod[] = [];
  for (let m = 0; m < 12; m += 2) {
    periods.push({
      year,
      startMonth: m,
      endMonth: m + 1,
      labelHe: `${MONTH_NAMES_HE[m]}–${MONTH_NAMES_HE[m + 1]} ${year}`,
    });
  }
  return periods;
}

function monthlyPeriods(year: number): VatPeriod[] {
  return Array.from({ length: 12 }, (_, m) => ({
    year,
    startMonth: m,
    endMonth: m,
    labelHe: `${MONTH_NAMES_HE[m]} ${year}`,
  }));
}

export function getVatPeriodsForYear(year: number, cadence: VatCadence): VatPeriod[] {
  return cadence === "monthly" ? monthlyPeriods(year) : biMonthlyPeriods(year);
}

/** Cadence per §69A(g): > 1.5M ₪/yr ex-VAT turnover → monthly, else bi-monthly. */
export function determineVatCadence(persona: Persona): VatCadence {
  return persona.vatAndTurnover.annualTurnoverWithoutVat > MONTHLY_CADENCE_THRESHOLD
    ? "monthly"
    : "bi-monthly";
}

/**
 * Default period index: the most recently COMPLETED period as of `today`
 * (freelancers file for a period only after it ends). If `today` falls
 * outside `year` entirely (a past or future filing year), defaults to the
 * last period of that year — the most likely one a user revisiting an old
 * year wants to see.
 */
export function defaultVatPeriodIndex(
  year: number,
  cadence: VatCadence,
  today: Date = new Date(),
): number {
  const periods = getVatPeriodsForYear(year, cadence);
  if (today.getFullYear() !== year) return periods.length - 1;
  const month = today.getMonth();
  const currentIdx = periods.findIndex((p) => month >= p.startMonth && month <= p.endMonth);
  if (currentIdx === -1) return periods.length - 1;
  // The period containing today's month is still in progress — default to
  // the last COMPLETED one (previous index), clamped to the first period.
  return Math.max(0, currentIdx - 1);
}

/**
 * Whether an ISO date string ("YYYY-MM-DD...") falls inside `period`.
 * Parses year/month directly from the string (same convention as
 * lib/alerts/ceiling.ts's isInYear) rather than `new Date(iso).getMonth()` —
 * a date-only ISO string parses as UTC midnight, so reading it back with the
 * local-timezone Date getters can shift a 1st-of-month boundary date into
 * the previous month on a host running west of UTC.
 */
function isInPeriod(iso: string, period: VatPeriod): boolean {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7)) - 1;
  if (Number.isNaN(year) || Number.isNaN(month)) return false;
  return year === period.year && month >= period.startMonth && month <= period.endMonth;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Format a Date's LOCAL calendar date as "YYYY-MM-DD" — deliberately not
 * `.toISOString()`, which converts through UTC and would shift the date
 * backward by a day for any host east of UTC (Israel included) when the
 * local time is past midnight but before the UTC offset catches up. See
 * lib/deadlines/calendar.ts's jerusalemToday doc for the same class of bug.
 */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sumInvoices(invoices: InvoiceLine[], period: VatPeriod, pick: (i: InvoiceLine) => number): number {
  return round2(
    invoices
      .filter((inv) => isRevenueDoc(inv.docType) && isInPeriod(inv.date, period))
      .reduce((sum, inv) => sum + pick(inv), 0),
  );
}

function sumExpenses(expenses: ExpenseLine[], period: VatPeriod, pick: (e: ExpenseLine) => number): number {
  return round2(
    expenses
      .filter((e) => !e.deletedAt && isInPeriod(e.date, period))
      .reduce((sum, e) => sum + pick(e), 0),
  );
}

/**
 * Build the periodic VAT report for `persona`, for `year`/`periodIndex`
 * (defaults to the current tax year's most-recently-completed period).
 * Pure function — no network, no submission.
 */
export function computeVatReport(
  persona: Persona,
  year: number = persona.income.year,
  periodIndex?: number,
): VatReport {
  const cadence = determineVatCadence(persona);
  const availablePeriods = getVatPeriodsForYear(year, cadence);
  const idx = periodIndex ?? defaultVatPeriodIndex(year, cadence);
  const period = availablePeriods[Math.min(Math.max(idx, 0), availablePeriods.length - 1)];

  const TC = getTaxYearConstants(year);
  const isMorshe = persona.business.osekType === "morshe";

  const invoices = persona.income.invoices ?? [];
  const expenses = persona.income.expenses ?? [];

  const totalSalesInclVat = isMorshe ? sumInvoices(invoices, period, (i) => i.total) : 0;
  const outputVat = isMorshe ? sumInvoices(invoices, period, (i) => i.vat) : 0;
  const totalPurchasesInclVat = isMorshe ? sumExpenses(expenses, period, (e) => e.amount) : 0;
  const inputVat = isMorshe ? sumExpenses(expenses, period, (e) => e.vat ?? 0) : 0;
  const netVat = round2(outputVat - inputVat);
  const adjustments = 0;
  const amountDue = round2(netVat + adjustments);

  const invoiceCount = invoices.filter((i) => isRevenueDoc(i.docType) && isInPeriod(i.date, period)).length;
  const expenseCount = expenses.filter((e) => !e.deletedAt && isInPeriod(e.date, period)).length;

  const fields: VatReportField[] = [
    { code: 1, labelHe: "סה\"כ מכירות (כולל מע\"מ)", labelEn: "Total sales (incl. VAT)", amount: totalSalesInclVat },
    { code: 2, labelHe: "מכירות בשיעור אפס (יצוא)", labelEn: "Zero-rated sales (exports)", amount: 0 },
    { code: 3, labelHe: "מכירות פטורות ממע\"מ", labelEn: "Exempt sales", amount: 0 },
    { code: 4, labelHe: "סה\"כ מס עסקאות", labelEn: "Total output VAT", amount: outputVat },
    { code: 5, labelHe: "סה\"כ רכישות (כולל מע\"מ)", labelEn: "Total purchases (incl. VAT)", amount: totalPurchasesInclVat },
    { code: 6, labelHe: "מס תשומות", labelEn: "Input VAT claimed", amount: inputVat },
    { code: 7, labelHe: "מע\"מ לתשלום / להחזר", labelEn: "Net VAT (output − input)", amount: netVat },
    { code: 8, labelHe: "התאמות", labelEn: "Adjustments", amount: adjustments },
    { code: 9, labelHe: "סכום לתשלום / לקבל", labelEn: "Amount due / refund", amount: amountDue },
  ];

  const notesHe: string[] = [
    "שדות 2 ו-3 (מכירות בשיעור אפס ופטורות) אינם נתמכים עדיין במערכת — אם קיימות מכירות כאלה בתקופה, יש להוסיפן ידנית לפני ההגשה.",
  ];
  if (persona.vatAndTurnover.annualTurnoverWithoutVat > DETAILED_874_THRESHOLD && year >= 2026) {
    notesHe.push("מחזור שנתי מעל 500,000 ₪ מחייב מ-2026 הגשת דוח מע\"מ מפורט (874) הכולל פירוט חשבוניות — מעבר לסכומים המצרפיים כאן.");
  }

  return {
    applicable: isMorshe,
    cadence,
    period,
    availablePeriods,
    fields,
    outputVat,
    inputVat,
    netVat,
    amountDue,
    vatRate: TC.vatRate,
    invoiceCount,
    expenseCount,
    onlineDueDate: toIsoDate(vatPeriodOnlineDueDate(period)),
    notesHe,
  };
}

/**
 * The SHAAM online filing deadline for a period: the 19th of the month
 * following the period's end month (israeli-vat-reporting skill, Step 5).
 */
export function vatPeriodOnlineDueDate(period: VatPeriod): Date {
  const dueMonth = period.endMonth + 1;
  if (dueMonth > 11) return new Date(period.year + 1, 0, 19);
  return new Date(period.year, dueMonth, 19);
}
