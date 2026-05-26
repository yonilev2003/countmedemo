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

/** Estimated tax liability breakdown (not a form field — shown as gate before the form). */
export interface TaxEstimate {
  businessIncome: number;
  kerenDeduction: number;
  blDeduction: number;
  pensionDeduction: number;
  taxableIncome: number;
  grossTax: number;
  creditPointsValue: number;
  blCredit: number;
  /** Credits that exceeded gross tax — cannot be refunded, shown as עודף שלא נוצל */
  excessCredits: number;
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

/* ──────────────────────────────────────────────────────────────────────────
 * Regulatory-Watch metadata layer.
 *
 * The values above stay a plain numeric record so the calculators keep reading
 * `TAX_YEAR_2024.kerenHishtalmutCap` etc. unchanged. This *additive* registry
 * gives the regulatory-watch agent the provenance it needs: which official
 * source each constant comes from, who published it, which tax years it applies
 * to, and when we last verified it. `apply.ts` bumps `lastVerified` (and the
 * value) when an approved change lands.
 * ────────────────────────────────────────────────────────────────────────── */

export interface TaxConstantMeta {
  /** Hebrew description of what the constant is — fed to the classifier. */
  description: string;
  sourceUrl: string;
  publisher: string;
  effectiveTaxYears: number[];
  /** ISO timestamp of the last time a human/agent confirmed this value. */
  lastVerified: string;
}

/** A constant plus its live value and provenance. */
export interface TaxConstantEntry {
  name: string;
  value: number;
  meta: TaxConstantMeta;
}

const ITA = "רשות המסים בישראל";
const ITA_HOME = "https://www.gov.il/he/departments/israel_tax_authority";
const VERIFIED = "2024-01-01T00:00:00.000Z";

/** Provenance for every agent-watchable scalar in TAX_YEAR_2024. */
export const TAX_CONSTANT_META: Record<string, TaxConstantMeta> = {
  kerenHishtalmutCap: {
    description: "תקרת ההפקדה השנתית המוכרת לקרן השתלמות לעצמאי",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: VERIFIED,
  },
  kerenHishtalmutIncomeCeiling: {
    description: "תקרת ההכנסה לחישוב ההפקדה המוכרת לקרן השתלמות",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: VERIFIED,
  },
  kerenHishtalmutRate: {
    description: "שיעור ההפקדה המוכר לקרן השתלמות לעצמאי (4.5%)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: VERIFIED,
  },
  bituachLeumiDeductibleRate: {
    description: "שיעור דמי ביטוח לאומי לעצמאי המוכרים כהוצאה (52%)",
    sourceUrl: "https://www.btl.gov.il/",
    publisher: "המוסד לביטוח לאומי",
    effectiveTaxYears: [2024],
    lastVerified: VERIFIED,
  },
  form6111Threshold: {
    description: "מחזור שמעליו חלה חובת צירוף טופס 6111 לדוח",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: VERIFIED,
  },
  osekPaturThreshold: {
    description: "תקרת מחזור שנתי לעוסק פטור ממע״מ",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: VERIFIED,
  },
  osekZeirExpenseRate: {
    description: "שיעור הוצאות מוכר אוטומטית במסלול עוסק זעיר (30%)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: VERIFIED,
  },
  osekZeirThreshold: {
    description: "תקרת מחזור למסלול עוסק זעיר",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: VERIFIED,
  },
  residentCreditPoints: {
    description: "נקודות זיכוי בסיס לתושב ישראל",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: VERIFIED,
  },
  pointValueAnnual: {
    description: "שווי שנתי של נקודת זיכוי אחת (₪)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024, 2025, 2026, 2027],
    lastVerified: VERIFIED,
  },
  surtaxThreshold: {
    description: "סף הכנסה שמעליו חל מס יסף",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: VERIFIED,
  },
  surtaxRate: {
    description: "שיעור מס יסף (3%)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: VERIFIED,
  },
  pensionDeductionCap: {
    description: "תקרת ניכוי בגין הפקדות לפנסיה (סעיף 47)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: VERIFIED,
  },
};

/**
 * List every tracked constant with its current numeric value and provenance.
 * Skips non-scalar members of TAX_YEAR_2024 (e.g. taxBrackets).
 */
export function listTaxConstants(): TaxConstantEntry[] {
  const bag = TAX_YEAR_2024 as Record<string, unknown>;
  return Object.entries(TAX_CONSTANT_META).map(([name, meta]) => {
    const value = bag[name];
    return {
      name,
      value: typeof value === "number" ? value : Number.NaN,
      meta,
    };
  });
}

