/**
 * The Expense Object — shared contract between the capture flow
 * (/expenses/new), the OCR/voice parser (/api/parse-expense), and the list
 * (/expenses). A draft is a form-shaped, all-string version of an ExpenseLine
 * (src/lib/persona.ts) — the same persona-embedded, localStorage-first +
 * DB-write-through pattern every other transactional record in this app uses
 * (invoices, income) rather than the standalone (unused) public.expenses
 * table. Receipt image bytes are the one thing that can't live in that JSON
 * blob — those go to Supabase Storage (bucket "receipts"), with the object
 * path stored in ExpenseLine.receiptPath.
 */

import type { ExpenseLine } from "@/lib/persona";

export type ExpenseSource = "camera" | "gallery" | "voice" | "manual";

/** Completeness of the required fields — NOT a data-quality/confidence signal. */
export type ExpenseStatus = "full" | "partial" | "needs_review";

/** Per-field OCR/voice-parse confidence, 0–1. Absent field ⇒ not extracted (not "0% confident"). */
export interface ExpenseFieldConfidence {
  vendorName?: number;
  docNumber?: number;
  date?: number;
  amount?: number;
  category?: number;
}

/** Fields that block save when missing — highlighted together, not one-at-a-time. */
export const REQUIRED_EXPENSE_FIELDS = [
  "vendorName",
  "docNumber",
  "date",
  "amount",
  "categoryId",
] as const;
export type RequiredExpenseField = (typeof REQUIRED_EXPENSE_FIELDS)[number];

/** Confidence threshold below which a value is treated as unextracted (shown
 * as an empty field for the user to fill, not a low-confidence guess). */
export const OCR_CONFIDENCE_THRESHOLD = 0.75;

/** Form-shaped draft — every numeric value is a string until save. */
export interface ExpenseDraft {
  vendorName: string;
  docNumber: string;
  date: string; // ISO yyyy-mm-dd
  amount: string; // total, ILS
  categoryId: string; // stable id from business-expenses/occupation-dataset categories
  category: string; // Hebrew label, denormalized for display/persistence
  businessPurpose: string;
  isForeignCurrency: boolean;
  originalAmount: string;
  originalCurrency: string; // ISO 4217, e.g. "USD"
  exchangeRate: string; // ILS per 1 unit of originalCurrency, on the doc date
  exchangeRateIsManual: boolean;
  confidence: ExpenseFieldConfidence;
  source: ExpenseSource;
}

export function emptyExpenseDraft(source: ExpenseSource): ExpenseDraft {
  return {
    vendorName: "",
    docNumber: "",
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    categoryId: "",
    category: "",
    businessPurpose: "",
    isForeignCurrency: false,
    originalAmount: "",
    originalCurrency: "USD",
    exchangeRate: "",
    exchangeRateIsManual: false,
    confidence: {},
    source,
  };
}

export function missingRequiredFields(draft: ExpenseDraft): RequiredExpenseField[] {
  return REQUIRED_EXPENSE_FIELDS.filter((f) => !String(draft[f] ?? "").trim());
}

export function computeExpenseStatus(draft: ExpenseDraft): ExpenseStatus {
  const missing = missingRequiredFields(draft);
  if (missing.length === 0) return "full";
  if (missing.length === REQUIRED_EXPENSE_FIELDS.length) return "needs_review";
  return "partial";
}

/**
 * VAT is always DERIVED, never user-entered. `total × rate/(1+rate)`, NOT a
 * naive `total × rate` (a documented gotcha — israeli-receipt-scanner skill).
 * Always 0 for foreign-currency expenses (import VAT is a separate, explicit
 * future exception — not handled here).
 */
export function deriveVat(totalIls: number, isForeign: boolean, vatRate: number): number {
  if (isForeign || !(totalIls > 0)) return 0;
  return Math.round(((totalIls * vatRate) / (1 + vatRate)) * 100) / 100;
}

/** Build the persona-embedded ExpenseLine from a validated (status="full") draft. */
export function draftToExpenseLine(
  draft: ExpenseDraft,
  opts: { vatRate: number; deductionRule: ExpenseLine["deductionRule"]; partialPercent?: number; receiptPath?: string },
): ExpenseLine {
  const amount = Number(draft.amount) || 0;
  return {
    date: draft.date,
    vendorName: draft.vendorName,
    description: draft.businessPurpose || draft.vendorName,
    amount,
    vat: deriveVat(amount, draft.isForeignCurrency, opts.vatRate),
    category: draft.category,
    receiptPath: opts.receiptPath,
    deductionRule: opts.deductionRule,
    partialPercent: opts.partialPercent,
    docNumber: draft.docNumber || undefined,
    categoryId: draft.categoryId || undefined,
    status: computeExpenseStatus(draft),
    businessPurpose: draft.businessPurpose || undefined,
    isForeignCurrency: draft.isForeignCurrency || undefined,
    originalAmount: draft.isForeignCurrency ? Number(draft.originalAmount) || undefined : undefined,
    originalCurrency: draft.isForeignCurrency ? draft.originalCurrency : undefined,
    exchangeRate: draft.isForeignCurrency ? Number(draft.exchangeRate) || undefined : undefined,
    source: draft.source,
  };
}
