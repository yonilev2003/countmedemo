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

/**
 * עוסק פטור annual revenue ceiling for 2024.
 * Invariant (per product decision): the עוסק פטור ceiling ALWAYS equals the
 * עוסק זעיר ceiling, so both fields below read from this single constant.
 */
const OSEK_EXEMPT_CEILING_2024 = 120000;

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

  // VAT-exempt (עוסק פטור) ceiling — tied to the עוסק זעיר ceiling (always equal)
  osekPaturThreshold: OSEK_EXEMPT_CEILING_2024,

  // עוסק זעיר: automatic 30% expense recognition (income tax simplified track)
  osekZeirExpenseRate: 0.30,   // 30% of turnover treated as expenses automatically
  osekZeirThreshold: OSEK_EXEMPT_CEILING_2024,   // same ceiling as עוסק פטור

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

export type TaxYearConstants = typeof TAX_YEAR_2024;

/**
 * עוסק פטור / עוסק זעיר ceiling for 2025.
 * Same invariant as 2024 — one constant feeds both fields so they cannot drift.
 * TODO(Roy): confirm the 2025 indexed value (carried 2024 figure for now).
 */
const OSEK_EXEMPT_CEILING_2025 = 120000;

/**
 * Tax year 2025 — every value is set explicitly (no blind spread of 2024) so
 * each constant is a deliberate per-year decision.
 *
 * FROZEN: Israel did not index income-tax brackets or credit-point values for
 * 2025 (budget freeze, no inflation linkage) — those are intentionally equal to
 * 2024. STABLE: statutory rates (4.5% keren, 52/48% B"L, 30% zeir, 35% pension
 * credit) don't move year to year. CARRIED: index-linked caps/thresholds that
 * normally change annually are kept at the 2024 figure with a TODO until Roy
 * confirms the official 2025 numbers — so we never silently show a wrong value.
 */
export const TAX_YEAR_2025: TaxYearConstants = {
  // Keren Hishtalmut — rate stable; caps index-linked
  kerenHishtalmutCap: 13203,            // TODO(Roy): confirm 2025
  kerenHishtalmutIncomeCeiling: 293397, // TODO(Roy): confirm 2025
  kerenHishtalmutRate: 0.045,           // stable

  // Bituach Leumi — rates stable; thresholds index-linked
  bituachLeumiDeductibleRate: 0.52,     // stable
  bituachLeumiCreditRate: 0.48,         // stable
  blMonthlyThreshold1: 7522,            // TODO(Roy): confirm 2025 (avg-wage linked)
  blMonthlyMax: 49030,                  // TODO(Roy): confirm 2025 contribution ceiling
  blRate1: 0.0597,                      // stable
  blRate2: 0.1783,                      // stable

  // Pension — rates stable; caps index-linked
  pensionDeductionRate: 0.11,           // stable
  pensionDeductionCap: 25608,           // TODO(Roy): confirm 2025
  pensionCreditRate: 0.055,             // stable
  pensionCreditCap: 12804,              // TODO(Roy): confirm 2025
  pensionCreditPercent: 0.35,           // stable

  // Form 6111 obligation threshold — index-linked
  form6111Threshold: 256410,            // TODO(Roy): confirm 2025

  // עוסק פטור / עוסק זעיר ceiling — tied (always equal)
  osekPaturThreshold: OSEK_EXEMPT_CEILING_2025,
  osekZeirExpenseRate: 0.30,            // statutory 30% (תיקון 257)
  osekZeirThreshold: OSEK_EXEMPT_CEILING_2025,

  // Credit points — FROZEN for 2025 (no linkage)
  residentCreditPoints: 2.25,           // frozen
  pointValueAnnual: 2904,               // frozen 2024–2027

  // Oleh / returning resident — statutory, stable
  newOlehCreditYear1: 3.0,
  newOlehCreditYear2: 2.0,
  newOlehCreditYear3: 1.0,

  // Soldier discharge — statutory, stable
  soldierMonthsCredit: 36,
  soldierFractionPerMonth: 1 / 6 / 36,

  // Surtax — FROZEN for 2025
  surtaxThreshold: 721560,              // TODO(Roy): confirm 2025 (freeze likely)
  surtaxRate: 0.03,                     // stable

  // Income tax brackets — FROZEN for 2025 (identical to 2024 per budget freeze)
  taxBrackets: [
    { from: 0,      to: 84120,  rate: 0.10 },
    { from: 84120,  to: 120720, rate: 0.14 },
    { from: 120720, to: 193800, rate: 0.20 },
    { from: 193800, to: 269280, rate: 0.31 },
    { from: 269280, to: 560280, rate: 0.35 },
    { from: 560280, to: 721560, rate: 0.47 },
    { from: 721560, to: Infinity, rate: 0.50 },
  ],
};

/**
 * עוסק פטור / עוסק זעיר ceiling for 2026.
 * TODO(Roy): confirm the 2026 indexed value (carried 2025 figure for now).
 */
const OSEK_EXEMPT_CEILING_2026 = 120000;

/**
 * Tax year 2026 — the FUTURE/accruing year (filed in 2027). Values sourced from
 * the `israeli-tax-returns` skill's 2026 reference, NOT yet confirmed by Roy.
 *
 * CHANGED for 2026 (vs the 2024/2025 freeze):
 *  • Income-tax brackets 3–5 were EXPANDED by the Economic Efficiency Law 2026
 *    (approved 2026-03-30, retroactive to 2026-01-01). Brackets 1–2 and 6 stay
 *    frozen at 2025 values. We use the skill's 2026 boundaries here because the
 *    2025 brackets are now *known-wrong* for 2026 — and the project rule is to
 *    never silently show a wrong value. TODO(Roy): confirm against the official
 *    pkudat-mas tables before relying on 2026 numbers in production.
 *  • Bituach Leumi: the 60%-of-average-wage tier boundary rose to ~7,703/month
 *    (skill 2026). Self-employed rate tiers may shift under Amendment 252
 *    (תיקון 252, CPI-indexed 2026–2028) — kept at the 2025 values with a TODO
 *    until Roy confirms the official 2026 self-employed rates.
 * FROZEN: credit-point value (2,904, frozen 2025–2027) and resident points.
 * CARRIED w/ TODO(Roy): index-linked caps (keren, pension, 6111, osek ceiling).
 */
export const TAX_YEAR_2026: TaxYearConstants = {
  // Keren Hishtalmut — rate stable; caps index-linked
  kerenHishtalmutCap: 13203,            // TODO(Roy): confirm 2026
  kerenHishtalmutIncomeCeiling: 293397, // TODO(Roy): confirm 2026
  kerenHishtalmutRate: 0.045,           // stable

  // Bituach Leumi — 60%-avg-wage boundary rose for 2026 (skill); rates per תיקון 252
  bituachLeumiDeductibleRate: 0.52,     // stable
  bituachLeumiCreditRate: 0.48,         // stable
  blMonthlyThreshold1: 7703,            // skill 2026 (60% avg wage) — TODO(Roy): confirm
  blMonthlyMax: 49030,                  // TODO(Roy): confirm 2026 contribution ceiling
  blRate1: 0.0597,                      // TODO(Roy): confirm 2026 (תיקון 252 may change)
  blRate2: 0.1783,                      // TODO(Roy): confirm 2026 (תיקון 252 may change)

  // Pension — rates stable; caps index-linked
  pensionDeductionRate: 0.11,           // stable
  pensionDeductionCap: 25608,           // TODO(Roy): confirm 2026
  pensionCreditRate: 0.055,             // stable
  pensionCreditCap: 12804,              // TODO(Roy): confirm 2026
  pensionCreditPercent: 0.35,           // stable

  // Form 6111 obligation threshold — index-linked
  form6111Threshold: 256410,            // TODO(Roy): confirm 2026

  // עוסק פטור / עוסק זעיר ceiling — tied (always equal)
  osekPaturThreshold: OSEK_EXEMPT_CEILING_2026,
  osekZeirExpenseRate: 0.30,            // statutory 30% (תיקון 257)
  osekZeirThreshold: OSEK_EXEMPT_CEILING_2026,

  // Credit points — FROZEN 2025–2027
  residentCreditPoints: 2.25,           // frozen
  pointValueAnnual: 2904,               // frozen 2024–2027

  // Oleh / returning resident — statutory, stable
  newOlehCreditYear1: 3.0,
  newOlehCreditYear2: 2.0,
  newOlehCreditYear3: 1.0,

  // Soldier discharge — statutory, stable
  soldierMonthsCredit: 36,
  soldierFractionPerMonth: 1 / 6 / 36,

  // Surtax — FROZEN (brackets 6 + surtax not indexed)
  surtaxThreshold: 721560,              // TODO(Roy): confirm 2026
  surtaxRate: 0.03,                     // stable

  // Income tax brackets — brackets 3–5 EXPANDED for 2026 (Economic Efficiency Law 2026)
  taxBrackets: [
    { from: 0,      to: 84120,  rate: 0.10 }, // frozen
    { from: 84120,  to: 120720, rate: 0.14 }, // frozen
    { from: 120720, to: 228000, rate: 0.20 }, // expanded (was →193,800 in 2024/25)
    { from: 228000, to: 301200, rate: 0.31 }, // expanded (was 193,800→269,280)
    { from: 301200, to: 560280, rate: 0.35 }, // expanded lower bound (was 269,280)
    { from: 560280, to: 721560, rate: 0.47 }, // frozen
    { from: 721560, to: Infinity, rate: 0.50 },
  ],
};

/** Registry of every defined tax year. Add a new year here once confirmed. */
const TAX_YEAR_REGISTRY: Record<number, TaxYearConstants> = {
  2024: TAX_YEAR_2024,
  2025: TAX_YEAR_2025,
  2026: TAX_YEAR_2026,
};

/** Most recent tax year we have an explicit definition for. */
const LATEST_TAX_YEAR = 2026;

/**
 * Returns the constants for a filing year. Exact match wins; future years fall
 * back to the latest defined set, earlier years to 2024.
 */
export function getTaxYearConstants(year: number): TaxYearConstants {
  const exact = TAX_YEAR_REGISTRY[year];
  if (exact) return exact;
  return year > LATEST_TAX_YEAR ? TAX_YEAR_2026 : TAX_YEAR_2024;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Tax-year lifecycle: which year is being filed *now*, and each year's status.
 *
 * A given calendar moment has exactly one "open" filing year — the annual return
 * you submit now. Today (2026) that return is for tax year 2025. Earlier years
 * are already filed; later years are still accruing and not yet filable.
 *
 * DEFAULT_VIEW_YEAR is where the demo lands (kept at 2024 for EY stability — a
 * locked product decision), independent of which year is currently "open".
 * ────────────────────────────────────────────────────────────────────────── */

/** The tax year whose annual return is open for filing right now. */
export const ACTIVE_FILING_YEAR = 2025;

/** Where /demo and /file land by default (locked: 2024 for the EY demo). */
export const DEFAULT_VIEW_YEAR = 2024;

export type FilingStatus = "filed" | "open" | "future";

/**
 * Filing status of a tax year relative to the year currently open for filing.
 * filed  — return already submitted (read-only history)
 * open   — the active return being prepared now
 * future — year still accruing; not yet filable
 */
export function getYearStatus(
  year: number,
  activeFilingYear: number = ACTIVE_FILING_YEAR,
): FilingStatus {
  if (year < activeFilingYear) return "filed";
  if (year === activeFilingYear) return "open";
  return "future";
}

/** Hebrew label + read-only flag for each filing status (UI badges). */
export const FILING_STATUS_META: Record<
  FilingStatus,
  { label: string; readOnly: boolean }
> = {
  filed: { label: "הוגש", readOnly: true },
  open: { label: "פתוח להגשה", readOnly: false },
  future: { label: "עתידי", readOnly: true },
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

/** Provenance for every agent-watchable scalar in TAX_YEAR_2024. */
export const TAX_CONSTANT_META: Record<string, TaxConstantMeta> = {
  kerenHishtalmutCap: {
    description: "תקרת ההפקדה השנתית המוכרת לקרן השתלמות לעצמאי",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: "2024-01-01T00:00:00.000Z",
  },
  kerenHishtalmutIncomeCeiling: {
    description: "תקרת ההכנסה לחישוב ההפקדה המוכרת לקרן השתלמות",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: "2024-01-01T00:00:00.000Z",
  },
  kerenHishtalmutRate: {
    description: "שיעור ההפקדה המוכר לקרן השתלמות לעצמאי (4.5%)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: "2024-01-01T00:00:00.000Z",
  },
  bituachLeumiDeductibleRate: {
    description: "שיעור דמי ביטוח לאומי לעצמאי המוכרים כהוצאה (52%)",
    sourceUrl: "https://www.btl.gov.il/",
    publisher: "המוסד לביטוח לאומי",
    effectiveTaxYears: [2024],
    lastVerified: "2024-01-01T00:00:00.000Z",
  },
  form6111Threshold: {
    description: "מחזור שמעליו חלה חובת צירוף טופס 6111 לדוח",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: "2024-01-01T00:00:00.000Z",
  },
  osekPaturThreshold: {
    description: "תקרת מחזור שנתי לעוסק פטור ממע״מ",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: "2024-01-01T00:00:00.000Z",
  },
  osekZeirExpenseRate: {
    description: "שיעור הוצאות מוכר אוטומטית במסלול עוסק זעיר (30%)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: "2024-01-01T00:00:00.000Z",
  },
  osekZeirThreshold: {
    description: "תקרת מחזור למסלול עוסק זעיר",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: "2024-01-01T00:00:00.000Z",
  },
  residentCreditPoints: {
    description: "נקודות זיכוי בסיס לתושב ישראל",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: "2024-01-01T00:00:00.000Z",
  },
  pointValueAnnual: {
    description: "שווי שנתי של נקודת זיכוי אחת (₪)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024, 2025, 2026, 2027],
    lastVerified: "2024-01-01T00:00:00.000Z",
  },
  surtaxThreshold: {
    description: "סף הכנסה שמעליו חל מס יסף",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: "2024-01-01T00:00:00.000Z",
  },
  surtaxRate: {
    description: "שיעור מס יסף (3%)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: "2024-01-01T00:00:00.000Z",
  },
  pensionDeductionCap: {
    description: "תקרת ניכוי בגין הפקדות לפנסיה (סעיף 47)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024],
    lastVerified: "2024-01-01T00:00:00.000Z",
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

