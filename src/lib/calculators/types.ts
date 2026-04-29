/**
 * Shared types for the field calculators that drive the demo.
 *
 * Each calculator takes a persona JSON and returns a CalcResult with:
 *   - value: what to write in the form (number for currency/integer, string for text)
 *   - sources: human-readable list of what fed the calculation (shown in the agent tooltip)
 *   - formula: short explanation of the math
 *
 * Tax-rule references default to year 2024. When tomorrow we wire the
 * israeli-tax-returns skill, calculators may pull constants from there
 * instead of being hard-coded.
 */

import type { Persona } from "@/lib/persona";

export interface CalcSource {
  label: string;
  detail?: string;
}

export interface CalcResult {
  /** The actual value to display in the form. */
  value: number | string | boolean | null;
  /** Short formula or explanation of "how we got there". */
  formula: string;
  /** Human-readable sources of the inputs. */
  sources: CalcSource[];
  /** "How sure are we?" — used to colour-code the demo. */
  confidence: "high" | "medium" | "low";
  /** Optional notes — usually a heads-up about future-proofing or limits. */
  notes?: string[];
}

export type Calculator = (persona: Persona) => CalcResult;

/** Tax-year constants used by the calculators. Update yearly. */
export const TAX_YEAR_2024 = {
  kerenHishtalmutCap: 19920, // ILS — 4.5% deduction cap, source: Pkudat Mas Hachnasa s. 17(5a)
  kerenHishtalmutRate: 0.045,
  bituachLeumiDeductibleRate: 0.52, // 52% of payments are deductible expense, rest is credit
  form6111Threshold: 256410, // ILS — turnover threshold for Form 6111
  residentCreditPoints: 2.25, // 2.25 nekudot zikui per resident
  pointValueAnnual: 2904, // ILS per nekuda for 2024
  newOlehCreditYear1: 0.25,
  newOlehCreditYear2: 1 / 6,
  newOlehCreditYear3: 1 / 12,
  soldierMonthsCredit: 36,
  soldierFractionPerMonth: 1 / 6 / 36, // 1/6 of a credit point per month, over 36 months total
};
