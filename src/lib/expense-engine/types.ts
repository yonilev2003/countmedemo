/**
 * Types for the 2026 expense-recognition dataset — Israeli self-employed
 * deductible-expense rules (62 global rules, 113 professions across 20
 * verticals, 23 universal base expenses, 596 profession-specific expenses,
 * depreciation rates, non-deductible list).
 *
 * Source of record: data/expense-recognition/2026.xlsx (committed). Generated
 * into src/lib/expense-engine/data/rules-2026.ts by
 * scripts/expense-engine/generate.ts — see that script for the exact mapping.
 *
 * KEY SEMANTIC (from the dataset's own README): the recognition RATE is
 * legally certain (grounded in a regulation/statute); whether a given
 * expense is ELIGIBLE for a given profession is a judgment call (an
 * application of סעיף 17 to the specific circumstances) — there is no
 * regulation that lists deductible expenses by profession. The two must
 * always be shown separately, never merged into one "confidence" number.
 * `ExpenseEntry.rateCertainty` / `eligibilityConfidence` encode that split.
 *
 * Deliberately NOT wired into lib/calculators or lib/regulatory/deductions
 * this round — this is a knowledge layer (business-expenses page, onboarding
 * occupation picker, chat tool, upload classification). The 1301/P&L engine
 * and its golden tests are untouched.
 */

/**
 * Closed set of computable/explainable recognition formulas. Only the two
 * patterns the dataset's own README calls out as commonly miscalculated
 * (vehicle, mobile phone) get a structured, computable shape; everything
 * else that isn't a flat percentage is "custom" — the UI shows the
 * dataset's own Hebrew formula text verbatim rather than guessing at a
 * computation. Never invent a formula kind not backed by the source data.
 */
export type RecognitionFormula =
  | { kind: "flat"; incomeTaxRate: number | null; vatRate: number | null }
  | { kind: "vehicle-max"; floorRate: number; vatRate: number | null }
  | { kind: "reduce-min-cap"; capNis: number; rate: number; vatRate: number | null }
  | { kind: "depreciation"; annualRate: number; vatRate: number | null }
  | { kind: "non-deductible" }
  | { kind: "custom"; formulaTextHe: string; vatRate: number | null };

/** A/B/C per the dataset's own certainty ranking (see its README). */
export type Confidence = "A" | "B" | "C";

export interface GlobalRule {
  ruleId: string; // "VEH-01", "COM-01", "DEP-02", "NON-01", …
  category: string;
  nameHe: string;
  formula: RecognitionFormula;
  /** Raw income-tax fraction from the sheet, where the row states one directly. */
  incomeTaxFraction: number | null;
  /** Raw VAT fraction from the sheet. */
  vatFraction: number | null;
  /** The sheet's own "formula / cap / condition" text — always shown. */
  conditionHe?: string;
  legalSourceHe: string;
  confidence: Confidence;
}

export interface Profession {
  id: string; // "P001".."P113"
  nameHe: string;
  verticalId: string; // "V01".."V20"
  verticalNameHe: string;
  /** FK into GlobalRule — the car-deduction rule that applies to this profession. */
  vehicleRuleId: string;
  vehicleRateHint?: number;
  statusNoteHe?: string;
  /** Informational count from the sheet — not authoritative, don't rely on it for iteration. */
  expenseCountHint?: number;
}

export interface ExpenseEntry {
  id: string; // "EB-002" (base) or "EX-0002" (per-profession)
  /** Absent ⇒ universal (from expense_base). Present ⇒ from expense_by_profession. */
  professionId?: string;
  nameHe: string;
  category: string;
  formula: RecognitionFormula;
  incomeTaxFraction: number | null;
  vatFraction: number | null;
  conditionHe?: string;
  legalSourceHe: string;
  /** The rate itself is legally grounded — always true for entries in this dataset. */
  rateCertainty: "legal";
  /** Whether THIS expense applies to THIS profession is a judgment call — see module doc. */
  eligibilityConfidence: Confidence;
}

export interface ExpenseDataset {
  datasetYear: 2026;
  generatedAt: string; // ISO date the generator last ran — informational only
  rules: GlobalRule[];
  professions: Profession[];
  baseExpenses: ExpenseEntry[];
  professionExpenses: ExpenseEntry[];
  depreciation: GlobalRule[];
  nonDeductible: GlobalRule[];
}
