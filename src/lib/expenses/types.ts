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

export type ExpenseSource = "camera" | "gallery" | "file" | "voice" | "manual";

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

/** `missingRequiredFields` can also flag `businessPurpose` — conditionally
 * required for categories in `AMBIGUOUS_CATEGORY_IDS` (spec §7). */
export type ExpenseMissingField = RequiredExpenseField | "businessPurpose";

/** Categories where "business purpose" stops being a nice-to-have and
 * becomes required documentation — these are exactly the categories an
 * accountant/auditor is most likely to challenge without a stated reason.
 * PRODUCT CALL PENDING ACCOUNTANT REVIEW: this list (and whether it should
 * vary by osek type or amount) has not been signed off — see
 * israeli-expense-categorizer skill notes before extending it. */
export const AMBIGUOUS_CATEGORY_IDS = new Set(["hospitality", "gifts", "travel"]);

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
  /** True once the user has manually edited any OCR/voice-detected field
   * (spec §2) — carried into ExpenseLine.reviewedByUser on save. */
  reviewedByUser: boolean;
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
    reviewedByUser: false,
  };
}

export function missingRequiredFields(draft: ExpenseDraft): ExpenseMissingField[] {
  const missing: ExpenseMissingField[] = REQUIRED_EXPENSE_FIELDS.filter(
    (f) => !String(draft[f] ?? "").trim(),
  );
  if (AMBIGUOUS_CATEGORY_IDS.has(draft.categoryId) && !draft.businessPurpose.trim()) {
    missing.push("businessPurpose");
  }
  return missing;
}

/**
 * amount must be a positive number to save. The string "0" passes the
 * required-field truthiness check in `missingRequiredFields` (it's a
 * non-empty string), so that check alone lets a zero-amount line through —
 * this closes that gap. Negative amounts would represent a credit/refund,
 * which this flow doesn't model (no credit-record type here); block with a
 * clear message instead of silently accepting or miscomputing VAT on it.
 */
export function validateAmount(amount: string): string | null {
  if (!amount.trim()) return null; // empty is `missingRequiredFields`'s concern, not this one
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return "סכום שלילי מייצג זיכוי או החזר — האפשרות הזאת עדיין לא נתמכת. פנה/י לתיעוד ידני מול רו״ח.";
  if (n === 0) return "הסכום חייב להיות גדול מ-0.";
  return null;
}

export function computeExpenseStatus(draft: ExpenseDraft): ExpenseStatus {
  const missing = missingRequiredFields(draft);
  if (missing.length === 0) return "full";
  // Nothing at all was filled in/extracted — the pre-existing "found
  // nothing" signal, regardless of source.
  if (missing.length === REQUIRED_EXPENSE_FIELDS.length) return "needs_review";
  // An OCR/voice-sourced draft missing SOME (but not all) required fields
  // means the automated extraction left a gap — most commonly confidence
  // gating (spec §1) blanking a low-confidence guess. That's a "needs
  // review" line, not a normal in-progress manual fill: a manual draft is
  // expected to be partially filled while the user is still typing, so it
  // stays "partial" until complete.
  if (draft.source !== "manual") return "needs_review";
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

/** The subset of parsed fields the OCR/voice parser can attach a confidence
 * score to (matches ExpenseFieldConfidence minus `category`, which the
 * parser never scores — it's picked from a closed list, not read off the
 * document). */
export interface ParsedExpenseFields {
  vendorName: string;
  docNumber: string;
  date: string;
  amount: number;
}

/**
 * Confidence gating (spec §1): a parsed field whose confidence is present
 * and below OCR_CONFIDENCE_THRESHOLD is treated as unextracted — blanked out
 * for the user to fill in, rather than prefilled as a low-confidence guess.
 * Its confidence entry is dropped too, so the "detected" hint shown next to
 * the field stays truthful about what's actually left in the draft.
 * A field with no confidence at all (voice parses never carry one) passes
 * through untouched — gating only applies where we have a score to gate on.
 */
export function applyConfidenceGate(
  parsed: ParsedExpenseFields,
  confidence: ExpenseFieldConfidence | undefined,
): { fields: ParsedExpenseFields; confidence: ExpenseFieldConfidence } {
  const kept: ExpenseFieldConfidence = {};
  let { vendorName, docNumber, date, amount } = parsed;

  if (confidence?.vendorName != null) {
    if (confidence.vendorName < OCR_CONFIDENCE_THRESHOLD) vendorName = "";
    else kept.vendorName = confidence.vendorName;
  }
  if (confidence?.docNumber != null) {
    if (confidence.docNumber < OCR_CONFIDENCE_THRESHOLD) docNumber = "";
    else kept.docNumber = confidence.docNumber;
  }
  if (confidence?.date != null) {
    if (confidence.date < OCR_CONFIDENCE_THRESHOLD) date = "";
    else kept.date = confidence.date;
  }
  if (confidence?.amount != null) {
    if (confidence.amount < OCR_CONFIDENCE_THRESHOLD) amount = 0;
    else kept.amount = confidence.amount;
  }

  return { fields: { vendorName, docNumber, date, amount }, confidence: kept };
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
    reviewedByUser: draft.reviewedByUser || undefined,
  };
}
