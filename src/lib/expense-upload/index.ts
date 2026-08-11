/**
 * Pure logic for the /expenses upload + review + summary flow (beta,
 * docs/specs/beta/artifacts/02-expense-upload-spec.md). Mirrors the
 * lib/invoice-generator/index.ts pattern: framework-free functions the page
 * component calls, kept here so they're independently unit-testable.
 *
 * Deliberately does NOT touch lib/calculators or lib/expense-engine — this is
 * the upload-flow's own seam, consuming expense-engine's public API
 * read-only (classifyExpense/explainFormula/entry.incomeTaxFraction).
 */

import type { Persona, ExpenseLine, ExpenseCurrency } from "@/lib/persona";
import type { ExpenseEntry, RecognitionFormula } from "@/lib/expense-engine";
import { getTaxYearConstants } from "@/lib/calculators/types";

/* ──────────────────────────────────────────────────────────────────────────
   Categories — a fixed Hebrew set for the /expenses form's category select.
   Not the same list as business-expenses/profiles.ts (those are per-
   profession qualitative categories); this is the flat set the Expense
   Object's own `category` field uses, per spec §2/§4.
   ────────────────────────────────────────────────────────────────────────── */
export const EXPENSE_CATEGORIES = [
  "ציוד",
  "תוכנות ומנויים",
  "פגישות עבודה",
  "נסיעות ורכב",
  "שכירות ואחזקה",
  "ייעוץ מקצועי",
  "שיווק ופרסום",
  "אחר",
] as const;

export type ExpenseCategoryOption = (typeof EXPENSE_CATEGORIES)[number];

/**
 * Categories where the business connection isn't self-evident — spec §3.8-א
 * names these two explicitly ("פגישות עבודה", "אחר"). For these,
 * `businessPurpose` becomes a blocking-required field; for every other
 * category it stays optional ("(מומלץ)").
 */
export const AMBIGUOUS_CATEGORIES: ReadonlySet<string> = new Set([
  "פגישות עבודה",
  "אחר",
]);

export function isBusinessPurposeRequired(category: string): boolean {
  return AMBIGUOUS_CATEGORIES.has(category);
}

/* ──────────────────────────────────────────────────────────────────────────
   Foreign currency — DEMO ONLY — replace with the Bank of Israel official-rate
   API before production, per docs/specs/beta/artifacts/02-expense-upload-spec.md §3.7.
   Real integration must key off the RECEIPT DATE's published rate, not a
   static constant.
   ────────────────────────────────────────────────────────────────────────── */
export const DEMO_RATES: Record<ExpenseCurrency, number> = {
  ILS: 1,
  USD: 3.65,
  EUR: 3.95,
};

export interface ConversionResult {
  ilsAmount: number;
  exchangeRate: number;
}

/** Convert a foreign-currency amount to its ILS equivalent using DEMO_RATES. */
export function convertToIls(
  amount: number,
  currency: ExpenseCurrency,
): ConversionResult {
  const rate = DEMO_RATES[currency];
  return { ilsAmount: Math.round(amount * rate * 100) / 100, exchangeRate: rate };
}

/**
 * VAT on an expense receipt — spec §3 "חישוב מע"מ":
 *   ILS: vat = total - total / (1 + vatRate)   (vatRate is year-keyed, never hardcoded)
 *   foreign currency: vat is always 0 — VAT is a local Israeli tax; a foreign
 *   supplier's invoice carries no Israeli VAT to reclaim (spec §3.7).
 */
export function computeVatAmount(
  totalIlsAmount: number,
  currency: ExpenseCurrency,
  year: number,
): number {
  if (currency !== "ILS") return 0;
  const vatRate = getTaxYearConstants(year).vatRate;
  return Math.round((totalIlsAmount - totalIlsAmount / (1 + vatRate)) * 100) / 100;
}

/* ──────────────────────────────────────────────────────────────────────────
   Recognition-rate derivation — NEVER computed/hardcoded here beyond reading
   the expense-engine's own structured fields. Only "flat" and "depreciation"
   formulas map onto our simplified ExpenseLine.deductionRule automatically;
   everything else (vehicle-max/reduce-min-cap/custom/non-deductible-with-no-
   number/no match at all) returns auto:false — the caller MUST let the user
   pick manually rather than default to 100%.
   ────────────────────────────────────────────────────────────────────────── */
export interface DerivedRule {
  rule: "full" | "partial" | "depreciation";
  partialPercent?: number;
  /** True when the rule/percent above came straight from the expense-engine
   *  entry (a suggestion the UI shows as pre-filled + explained); false means
   *  no confident auto-derivation was possible and the user must choose. */
  auto: boolean;
}

export function deriveRuleFromEntry(entry: ExpenseEntry | null): DerivedRule {
  if (!entry) return { rule: "partial", auto: false };
  return deriveRuleFromFormula(entry.formula);
}

function deriveRuleFromFormula(formula: RecognitionFormula): DerivedRule {
  switch (formula.kind) {
    case "flat": {
      if (formula.incomeTaxRate === null) return { rule: "partial", auto: false };
      if (formula.incomeTaxRate >= 1) return { rule: "full", auto: true };
      return {
        rule: "partial",
        partialPercent: Math.round(formula.incomeTaxRate * 1000) / 10,
        auto: true,
      };
    }
    case "depreciation":
      return {
        rule: "depreciation",
        partialPercent: Math.round(formula.annualRate * 1000) / 10,
        auto: true,
      };
    case "non-deductible":
      return { rule: "partial", partialPercent: 0, auto: true };
    // vehicle-max / reduce-min-cap / custom are not flat percentages — the
    // UI shows explainFormula(formula) as guidance text, but the rate is
    // left for the user to pick manually (constraint: never silently
    // default to 100%).
    case "vehicle-max":
    case "reduce-min-cap":
    case "custom":
      return { rule: "partial", auto: false };
  }
}

/**
 * The fraction of `amount` that counts as deductible/recognized — uniform
 * across "full" (=1) and "partial"/"depreciation" (= partialPercent/100,
 * defaulting to 0 when absent rather than guessing).
 */
export function recognizedFraction(
  line: Pick<ExpenseLine, "deductionRule" | "partialPercent">,
): number {
  if (line.deductionRule === "full") return 1;
  return (line.partialPercent ?? 0) / 100;
}

export function recognizedAmount(
  line: Pick<ExpenseLine, "amount" | "deductionRule" | "partialPercent">,
): number {
  return Math.round(line.amount * recognizedFraction(line) * 100) / 100;
}

/* ──────────────────────────────────────────────────────────────────────────
   Blocking-validation — spec §3.5. Required: vendor_name, document_number,
   date, total_amount(+currency is always set via the selector so it's never
   "missing" on its own), category. We ADD one field beyond the spec's own
   list: the recognition rate, but ONLY when classifyExpense could not
   auto-derive one (deriveRuleFromEntry(...).auto === false) — ExpenseLine.
   deductionRule is a non-optional field in our data model, and the
   constraint "never silently default to 100%" means we cannot save a rate
   nobody chose. See report for this deliberate, documented deviation.
   ────────────────────────────────────────────────────────────────────────── */
export interface DraftExpenseFields {
  vendorName: string;
  documentNumber: string;
  date: string;
  totalAmount: number | null;
  category: string;
  businessPurpose: string;
  /** Whether a recognition rate is resolved (auto-derived or manually chosen). */
  hasRecognitionRate: boolean;
}

export interface ValidationResult {
  /** Field key → Hebrew label, for every currently-missing required field. */
  missing: { field: string; label: string }[];
  /** Total number of required fields for this draft (denominator of the counter). */
  requiredCount: number;
  /** Number of required fields currently filled (numerator of the counter). */
  filledCount: number;
  isValid: boolean;
}

export function validateDraftExpense(draft: DraftExpenseFields): ValidationResult {
  const checks: { field: string; label: string; ok: boolean }[] = [
    { field: "vendorName", label: "שם ספק", ok: !!draft.vendorName.trim() },
    { field: "documentNumber", label: "מספר מסמך", ok: !!draft.documentNumber.trim() },
    { field: "date", label: "תאריך", ok: !!draft.date.trim() },
    {
      field: "totalAmount",
      label: "סכום כולל",
      ok: draft.totalAmount != null && draft.totalAmount > 0,
    },
    { field: "category", label: "קטגוריה", ok: !!draft.category.trim() },
    {
      field: "recognitionRate",
      label: "שיעור הכרה",
      ok: draft.hasRecognitionRate,
    },
  ];
  if (isBusinessPurposeRequired(draft.category)) {
    checks.push({
      field: "businessPurpose",
      label: "מה זה שימש בעסק?",
      ok: !!draft.businessPurpose.trim(),
    });
  }

  const missing = checks.filter((c) => !c.ok).map(({ field, label }) => ({ field, label }));
  return {
    missing,
    requiredCount: checks.length,
    filledCount: checks.length - missing.length,
    isValid: missing.length === 0,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   Duplicate detection — spec §6: same vendor+amount within a 24h date window
   triggers a non-blocking "נראה שזה כבר קיים" notice.
   ────────────────────────────────────────────────────────────────────────── */
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function findPossibleDuplicate(
  existing: ExpenseLine[],
  candidate: Pick<ExpenseLine, "vendorName" | "amount" | "date">,
): ExpenseLine | null {
  const candidateVendor = candidate.vendorName.trim().toLowerCase();
  const candidateDate = new Date(candidate.date).getTime();
  if (!candidateVendor || Number.isNaN(candidateDate)) return null;

  return (
    existing.find((e) => {
      if (e.vendorName.trim().toLowerCase() !== candidateVendor) return false;
      if (Math.abs(e.amount - candidate.amount) > 0.01) return false;
      const existingDate = new Date(e.date).getTime();
      if (Number.isNaN(existingDate)) return false;
      return Math.abs(existingDate - candidateDate) <= DUPLICATE_WINDOW_MS;
    }) ?? null
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Aggregate recompute on save — mirrors src/app/invoices/new/page.tsx's
   inline totalRevenue/invoiceCount bump for the equivalent expense fields.
   totalDeductibleExpenses tracks the RECOGNIZED amount (what actually feeds
   field 150 / the P&L via lib/calculators + lib/p-and-l), not the raw amount
   paid — see lib/calculators/index.ts which reads totalDeductibleExpenses
   directly as the expense side of net business income.
   ────────────────────────────────────────────────────────────────────────── */
export function withNewExpenseLine(persona: Persona, line: ExpenseLine): Persona {
  return {
    ...persona,
    income: {
      ...persona.income,
      expenses: [...(persona.income.expenses ?? []), line],
      totalDeductibleExpenses:
        persona.income.totalDeductibleExpenses + recognizedAmount(line),
      expenseCount: (persona.income.expenseCount ?? 0) + 1,
    },
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   CSV export — spec §3.8-ד / §5: two layers in one file — a category-summary
   section (what gets copied into the annual report) and a full detail
   section (every field, both paid and recognized amounts). Hand-rolled, no
   csv library per project constraint.
   ────────────────────────────────────────────────────────────────────────── */
function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(csvEscape).join(",");
}

export function buildExpensesCsv(expenses: ExpenseLine[]): string {
  const lines: string[] = [];

  // Layer 1 — summary by category (ILS), what gets copied to the 1301.
  lines.push("סיכום לפי קטגוריה");
  lines.push(csvRow(["קטגוריה", "סכום ששולם (₪)", "סכום מוכר (₪)", "מס׳ רשומות"]));
  const byCategory = new Map<string, { paid: number; recognized: number; count: number }>();
  for (const e of expenses) {
    const cur = byCategory.get(e.category) ?? { paid: 0, recognized: 0, count: 0 };
    cur.paid += e.amount;
    cur.recognized += recognizedAmount(e);
    cur.count += 1;
    byCategory.set(e.category, cur);
  }
  for (const [category, v] of byCategory.entries()) {
    lines.push(
      csvRow([category, round2(v.paid), round2(v.recognized), v.count]),
    );
  }
  const foreignTotal = expenses
    .filter((e) => e.currency && e.currency !== "ILS")
    .reduce((sum, e) => sum + e.amount, 0);
  lines.push(csvRow(["מזה הוצאות חו״ל", round2(foreignTotal), "", ""]));
  const totalPaid = expenses.reduce((s, e) => s + e.amount, 0);
  const totalRecognized = expenses.reduce((s, e) => s + recognizedAmount(e), 0);
  lines.push(csvRow(["סה״כ", round2(totalPaid), round2(totalRecognized), expenses.length]));

  lines.push("");

  // Layer 2 — full detail rows.
  lines.push("פירוט מלא");
  lines.push(
    csvRow([
      "תאריך",
      "ספק",
      "מספר מסמך",
      "תיאור",
      "קטגוריה",
      "מטבע",
      "סכום מקורי",
      "שער המרה",
      "סכום ששולם (₪)",
      "מע״מ (₪)",
      "כלל הכרה",
      "אחוז הכרה",
      "סכום מוכר (₪)",
      "מה שימש בעסק",
      "דורש בדיקה",
    ]),
  );
  for (const e of expenses) {
    lines.push(
      csvRow([
        e.date,
        e.vendorName,
        e.documentNumber ?? "",
        e.description,
        e.category,
        e.currency ?? "ILS",
        e.originalAmount ?? e.amount,
        e.exchangeRate ?? 1,
        round2(e.amount),
        round2(e.vat ?? 0),
        deductionRuleLabel(e.deductionRule),
        e.partialPercent ?? (e.deductionRule === "full" ? 100 : ""),
        round2(recognizedAmount(e)),
        e.businessPurpose ?? "",
        e.needsReview ? "כן" : "לא",
      ]),
    );
  }

  // Excel-friendly UTF-8 BOM so Hebrew renders correctly on open.
  return "﻿" + lines.join("\r\n");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function deductionRuleLabel(rule: ExpenseLine["deductionRule"]): string {
  if (rule === "full") return "מוכר במלואו";
  if (rule === "depreciation") return "פחת";
  return "מוכר חלקית";
}

/* ──────────────────────────────────────────────────────────────────────────
   Summary/list filters — spec §5. "current month" computed dynamically.
   ────────────────────────────────────────────────────────────────────────── */
export type ExpenseFilter = "all" | "this-month" | "full" | "partial" | "needs-review";

export function expenseStatus(
  line: ExpenseLine,
): "full" | "partial" | "needs-review" {
  if (line.needsReview) return "needs-review";
  if (line.deductionRule === "full") return "full";
  return "partial";
}

export function filterExpenses(
  expenses: ExpenseLine[],
  filter: ExpenseFilter,
  now: Date = new Date(),
): ExpenseLine[] {
  switch (filter) {
    case "all":
      return expenses;
    case "this-month": {
      const y = now.getFullYear();
      const m = now.getMonth();
      return expenses.filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === y && d.getMonth() === m;
      });
    }
    case "full":
      return expenses.filter((e) => expenseStatus(e) === "full");
    case "partial":
      return expenses.filter((e) => expenseStatus(e) === "partial");
    case "needs-review":
      return expenses.filter((e) => expenseStatus(e) === "needs-review");
  }
}

export interface ExpenseTotals {
  totalAmount: number;
  totalVat: number;
  count: number;
}

export function computeExpenseTotals(expenses: ExpenseLine[]): ExpenseTotals {
  return expenses.reduce<ExpenseTotals>(
    (acc, e) => ({
      totalAmount: acc.totalAmount + e.amount,
      totalVat: acc.totalVat + (e.vat ?? 0),
      count: acc.count + 1,
    }),
    { totalAmount: 0, totalVat: 0, count: 0 },
  );
}
