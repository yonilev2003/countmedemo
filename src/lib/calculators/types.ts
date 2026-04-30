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

export interface TaxBracket {
  from: number;
  to: number;
  rate: number;
}

/** Estimated tax liability breakdown (not a form field — shown as bonus card). */
export interface TaxEstimate {
  businessIncome: number;
  kerenDeduction: number;
  blDeduction: number;
  pensionDeduction: number;
  taxableIncome: number;
  grossTax: number;
  creditPointsValue: number;
  blCredit: number;
  taxAfterCredits: number;
  mikdamot: number;
  balance: number; // negative = refund, positive = additional payment due
}

/** Tax-year constants used by the calculators. Update yearly. */
export const TAX_YEAR_2024 = {
  // Keren Hishtalmut: 4.5% of income up to income ceiling 293,397 = max 13,203 NIS deductible
  kerenHishtalmutCap: 13203,
  kerenHishtalmutIncomeCeiling: 293397,
  kerenHishtalmutRate: 0.045,

  // Bituach Leumi self-employed: 52% deductible expense, 48% direct tax credit
  bituachLeumiDeductibleRate: 0.52,
  bituachLeumiCreditRate: 0.48,
  // B"L rate tiers (monthly thresholds × 12 for annual)
  blMonthlyThreshold1: 7522,   // 60% of avg wage — first-tier ceiling
  blMonthlyMax: 49030,         // contribution ceiling
  blRate1: 0.0597,             // up to threshold1
  blRate2: 0.1783,             // above threshold1 up to max

  // Pension (section 47 deduction + 45A credit)
  pensionDeductionRate: 0.11,          // up to 11% of income
  pensionDeductionCap: 25608,          // max ILS deductible 2024
  pensionCreditRate: 0.055,            // 5.5% for 45A credit
  pensionCreditCap: 12804,             // max ILS for 45A credit base
  pensionCreditPercent: 0.35,          // 35% credit on qualifying contribution

  // Form 6111 obligation threshold
  form6111Threshold: 256410,

  // VAT-exempt (עוסק פטור) ceiling 2024
  osekPaturThreshold: 120000,

  // עוסק זעיר: automatic 30% expense recognition (income tax simplified track)
  osekZeirExpenseRate: 0.30,   // 30% of turnover treated as expenses automatically
  osekZeirThreshold: 120000,   // same as VAT-exempt ceiling for 2024

  // Credit points
  residentCreditPoints: 2.25,
  pointValueAnnual: 2904, // ILS per nekuda, frozen 2024–2027

  // Oleh / returning resident
  newOlehCreditYear1: 3.0,
  newOlehCreditYear2: 2.0,
  newOlehCreditYear3: 1.0,

  // Soldier discharge credit (1/6 point per month for up to 36 months)
  soldierMonthsCredit: 36,
  soldierFractionPerMonth: 1 / 6 / 36,

  // Surtax (mas yesafim): 3% above 721,560 → effective top bracket = 50%
  surtaxThreshold: 721560,
  surtaxRate: 0.03,

  // 2024 income tax brackets (verified against official data)
  taxBrackets: [
    { from: 0,      to: 84120,  rate: 0.10 },
    { from: 84120,  to: 120720, rate: 0.14 },
    { from: 120720, to: 193800, rate: 0.20 },
    { from: 193800, to: 269280, rate: 0.31 },
    { from: 269280, to: 560280, rate: 0.35 },
    { from: 560280, to: 721560, rate: 0.47 },
    { from: 721560, to: Infinity, rate: 0.50 }, // 47% + 3% surtax
  ] as TaxBracket[],
};
