/**
 * Runtime API over the 2026 expense-recognition dataset — mirrors the
 * getTaxYearConstants(year) pattern from lib/calculators/types.ts. Knowledge
 * layer only this round: business-expenses page, onboarding occupation
 * picker, the chat/coach lookup tool, and upload-flow classification. Does
 * NOT feed lib/calculators or lib/regulatory/deductions.
 */
import { DATASET_2026 } from "./data/rules-2026";
import type {
  ExpenseDataset,
  ExpenseEntry,
  GlobalRule,
  Profession,
  RecognitionFormula,
} from "./types";

export type {
  ExpenseDataset,
  ExpenseEntry,
  GlobalRule,
  Profession,
  RecognitionFormula,
  Confidence,
} from "./types";

const DATASETS: Record<number, ExpenseDataset> = {
  2026: DATASET_2026,
};
const LATEST_DATASET_YEAR = 2026;

export interface ResolvedExpenseDataset {
  dataset: ExpenseDataset;
  /** True when the requested year had no dataset of its own — UI must disclose this. */
  isFallback: boolean;
  /** The year the returned data actually describes. */
  sourceYear: number;
}

/** Resolve the dataset for a tax year, with an explicit-fallback marker (no silent substitution). */
export function getExpenseDataset(year: number): ResolvedExpenseDataset {
  const exact = DATASETS[year];
  if (exact) return { dataset: exact, isFallback: false, sourceYear: year };
  return { dataset: DATASETS[LATEST_DATASET_YEAR], isFallback: true, sourceYear: LATEST_DATASET_YEAR };
}

export function getGlobalRule(ruleId: string, year: number): GlobalRule | undefined {
  return getExpenseDataset(year).dataset.rules.find((r) => r.ruleId === ruleId);
}

export function getProfession(id: string, year: number): Profession | undefined {
  return getExpenseDataset(year).dataset.professions.find((p) => p.id === id);
}

export function listVerticals(year: number): { id: string; nameHe: string }[] {
  const { dataset } = getExpenseDataset(year);
  const seen = new Map<string, string>();
  for (const p of dataset.professions) {
    if (!seen.has(p.verticalId)) seen.set(p.verticalId, p.verticalNameHe);
  }
  return [...seen.entries()].map(([id, nameHe]) => ({ id, nameHe }));
}

export function listProfessionsByVertical(verticalId: string, year: number): Profession[] {
  return getExpenseDataset(year).dataset.professions.filter((p) => p.verticalId === verticalId);
}

/**
 * Match free text (e.g. persona.business.primaryOccupation) to a profession.
 * Exact name match first, then substring/keyword match either direction.
 * Never guess silently past that — returns null rather than a low-confidence
 * pick; callers should treat a match as a SUGGESTION the user confirms.
 */
export function matchProfession(freeText: string, year: number): Profession | null {
  const text = freeText.trim().toLowerCase();
  if (!text) return null;
  const { dataset } = getExpenseDataset(year);
  const exact = dataset.professions.find((p) => p.nameHe.toLowerCase() === text);
  if (exact) return exact;
  const partial = dataset.professions.find(
    (p) => text.includes(p.nameHe.toLowerCase()) || p.nameHe.toLowerCase().includes(text),
  );
  return partial ?? null;
}

export interface ProfessionExpenseGuide {
  profession: Profession | null;
  vehicleRule: GlobalRule | null;
  universalExpenses: ExpenseEntry[];
  professionExpenses: ExpenseEntry[];
  isFallback: boolean;
  sourceYear: number;
}

/**
 * The merged expense guide for a profession: universal (expense_base) items
 * every self-employed person can consider, plus the profession-specific
 * items, plus the vehicle rule that applies to them. `professionId: null`
 * returns just the universal list (generic fallback).
 */
export function getProfessionExpenseGuide(
  professionId: string | null,
  year: number,
): ProfessionExpenseGuide {
  const { dataset, isFallback, sourceYear } = getExpenseDataset(year);
  const profession = professionId
    ? (dataset.professions.find((p) => p.id === professionId) ?? null)
    : null;
  const vehicleRule = profession
    ? (dataset.rules.find((r) => r.ruleId === profession.vehicleRuleId) ?? null)
    : null;
  const professionExpenses = profession
    ? dataset.professionExpenses.filter((e) => e.professionId === profession.id)
    : [];
  return {
    profession,
    vehicleRule,
    universalExpenses: dataset.baseExpenses,
    professionExpenses,
    isFallback,
    sourceYear,
  };
}

export interface ExpenseClassification {
  entry: ExpenseEntry | null;
  /** No confident match — caller should let the user pick manually. */
  matched: boolean;
}

/**
 * Deterministic keyword classification of a free-text expense description
 * against a profession's guide (falls back to universal expenses). This is
 * a suggestion for the user to confirm, never an authoritative write —
 * callers must not persist eligibilityConfidence as if it were certain.
 */
export function classifyExpense(
  description: string,
  professionId: string | null,
  year: number,
): ExpenseClassification {
  const text = description.trim().toLowerCase();
  if (!text) return { entry: null, matched: false };
  const guide = getProfessionExpenseGuide(professionId, year);
  const candidates = [...guide.professionExpenses, ...guide.universalExpenses];
  const hit = candidates.find(
    (e) => text.includes(e.nameHe.toLowerCase()) || e.nameHe.toLowerCase().includes(text),
  );
  return { entry: hit ?? null, matched: !!hit };
}

/** Hebrew explanation of a recognition formula — how the UI shows non-flat rules. */
export function explainFormula(formula: RecognitionFormula): string {
  switch (formula.kind) {
    case "flat": {
      const parts: string[] = [];
      if (formula.incomeTaxRate !== null) {
        parts.push(`${Math.round(formula.incomeTaxRate * 1000) / 10}% מוכר במס הכנסה`);
      }
      if (formula.vatRate !== null) {
        parts.push(`${Math.round(formula.vatRate * 1000) / 10}% מוכר במע"מ`);
      }
      return parts.join(" · ") || "אין נתון מספרי — ראו הערה";
    }
    case "vehicle-max":
      return `הגבוה מבין (הוצאות בפועל פחות שווי שימוש) או ${Math.round(formula.floorRate * 100)}% מההוצאות`;
    case "reduce-min-cap":
      return `ההוצאה בניכוי הנמוך מבין ${formula.capNis.toLocaleString("he-IL")} ₪ או ${Math.round(formula.rate * 100)}% מההוצאה`;
    case "depreciation":
      return `פחת שנתי של ${Math.round(formula.annualRate * 100)}%`;
    case "non-deductible":
      return "לא מוכר כהוצאה";
    case "custom":
      return formula.formulaTextHe || "ראו תנאי מפורט";
  }
}
