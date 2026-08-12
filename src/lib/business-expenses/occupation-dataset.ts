/**
 * The 113-profession / 20-vertical regulatory expense-recognition dataset
 * (tax year 2026), sourced from `data/regulatory-dataset-2026.json`.
 *
 * Provenance: professionally researched, citation-backed dataset provided by
 * Yoni 2026-08-12 (`CountMe_hotzaot_mukarot_2026.xlsx` + a PDF rendering of
 * the same source data, used to cross-check the parse). Every row carries a
 * `confidence` grade — treat it as load-bearing, not decoration:
 *   A — anchored to a regulation/law, amount verified against the regulation
 *       text for this tax year. Quotable as law.
 *   B — Tax Authority position or established professional practice.
 *       Reliable to show the user, but NOT quotable as law.
 *   C — business judgment / Section 17's general "incurred to produce
 *       income" test applied to a specific situation. Not quotable — needs
 *       case-by-case review. Never present a C-grade number as certain.
 *
 * This is a reference dataset, not tax advice — see `DATASET.disclaimer` and
 * show a <LegalNote> variant referencing it on any screen that surfaces
 * these numbers (per the 2026-08-12 product-scope directive).
 *
 * One known source-data gap, fixed at build time (see the generation script
 * in the session scratchpad): P001 (עורך דין) was missing from the source
 * xlsx's `professions` sheet even though its 7 expense lines existed in
 * `expense_by_profession` and it's fully documented in the companion PDF —
 * backfilled from the PDF, cross-checked against the expense lines actually
 * present for professionId "P001".
 */

import dataset from "./data/regulatory-dataset-2026.json";

export type ConfidenceGrade = "A" | "B" | "C";

export interface OccupationVertical {
  id: string;
  nameHe: string;
}

export interface OccupationCategory {
  id: string;
  nameHe: string;
}

export interface OccupationExpenseLine {
  expenseId: string;
  nameHe: string;
  categoryId: string;
  /** Fraction (0-1) of the expense recognized for income-tax purposes. */
  pctIncomeTax: number;
  /** Fraction (0-1) of VAT on the expense that can be reclaimed as input tax. */
  pctVat: number;
  sourceLaw: string;
  confidence: ConfidenceGrade;
  noteHe: string | null;
}

export interface Profession {
  professionId: string;
  verticalId: string;
  nameHe: string;
  vehicleRuleId: string;
  vehicleRuleHe: string;
  pctVehicle: number;
  statusNoteHe: string | null;
  expenses: OccupationExpenseLine[];
}

export interface UniversalRule {
  ruleId: string;
  categoryId: string;
  categoryHe: string;
  nameHe: string;
  pctIncomeTax: number;
  pctVat: number;
  formulaHe: string;
  sourceLaw: string;
  confidence: ConfidenceGrade;
}

export interface BaseExpense {
  expenseId: string;
  nameHe: string;
  categoryId: string;
  pctIncomeTax: number;
  pctVat: number;
  sourceLaw: string;
  confidence: ConfidenceGrade;
  noteHe: string | null;
}

export interface DepreciationRule {
  ruleId: string;
  assetTypeHe: string;
  annualRate: number;
  pctVat: number;
  noteHe: string | null;
  sourceLaw: string;
  confidence: ConfidenceGrade;
}

export interface NonDeductibleRule {
  ruleId: string;
  categoryHe: string;
  itemHe: string;
  detailHe: string;
  sourceLaw: string;
  confidence: ConfidenceGrade;
}

interface RegulatoryDataset {
  year: number;
  generatedAt: string;
  source: string;
  disclaimer: string;
  confidenceLegend: Record<ConfidenceGrade, string>;
  verticals: OccupationVertical[];
  categories: OccupationCategory[];
  universalRules: UniversalRule[];
  baseExpenses: BaseExpense[];
  depreciation: DepreciationRule[];
  nonDeductible: NonDeductibleRule[];
  professions: Profession[];
}

export const DATASET = dataset as RegulatoryDataset;

const professionById = new Map(DATASET.professions.map((p) => [p.professionId, p]));
const verticalById = new Map(DATASET.verticals.map((v) => [v.id, v]));
const categoryById = new Map(DATASET.categories.map((c) => [c.id, c]));

export function getProfessionById(id: string): Profession | undefined {
  return professionById.get(id);
}

export function getVerticalById(id: string): OccupationVertical | undefined {
  return verticalById.get(id);
}

export function getCategoryLabel(categoryId: string): string {
  return categoryById.get(categoryId)?.nameHe ?? categoryId;
}

/**
 * All professions grouped by vertical, in the dataset's canonical order —
 * the shape a "most popular first, then grouped by vertical" search picker
 * (the new onboarding wizard's occupation step) wants to render.
 */
export function professionsByVertical(): { vertical: OccupationVertical; professions: Profession[] }[] {
  return DATASET.verticals.map((vertical) => ({
    vertical,
    professions: DATASET.professions.filter((p) => p.verticalId === vertical.id),
  }));
}

/**
 * Search-first lookup for the occupation picker: matches a free-text query
 * against profession name and vertical name (Hebrew substring, case/nikud-
 * insensitive isn't needed for Hebrew — plain substring is what the source
 * artifact's own `OccPicker` component does). Returns professions only
 * (verticals aren't separately selectable — matches the source artifact).
 */
export function searchProfessions(query: string, limit = 40): Profession[] {
  const q = query.trim();
  if (!q) return [];
  return DATASET.professions
    .filter((p) => p.nameHe.includes(q) || verticalById.get(p.verticalId)?.nameHe.includes(q))
    .slice(0, limit);
}

/**
 * Best-effort match from a free-text occupation string (e.g. what the
 * current /setup wizard's step-3 free-text input, or a not-yet-migrated
 * caller, already has on hand) to a single profession record. Exact name
 * match first, then substring either direction. Returns undefined rather
 * than guessing when nothing reasonable matches — callers should fall back
 * to the generic occupation profiles in `profiles.ts`, not force a match.
 */
export function matchProfessionByFreeText(occupationText: string): Profession | undefined {
  const q = occupationText.trim();
  if (!q) return undefined;
  const exact = DATASET.professions.find((p) => p.nameHe === q);
  if (exact) return exact;
  return DATASET.professions.find((p) => q.includes(p.nameHe) || p.nameHe.includes(q));
}
