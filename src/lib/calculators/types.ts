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
  /**
   * Section 45A pension credit — 35% of the qualifying pension contribution
   * (qualifying base capped at 5.5% of business income). A direct credit against
   * tax, SEPARATE from the Section 47 deduction (pensionDeduction). The same
   * shekel cannot be both deducted (47) and credited (45A). Owned by
   * israeli-tax-returns (Step 3.5). Added in the 2026-06 accuracy audit.
   */
  pensionCredit: number;
  /**
   * Section 46 donations credit — 35% of recognised donations (min 200 ₪).
   * A direct credit against tax, NOT a deduction from income. Added 2026-06.
   */
  donationsCredit: number;
  /**
   * @deprecated There is NO 48% Bituach-Leumi tax credit in Israeli law. Only
   * 52% of B"L paid is a deduction-from-income (סעיף 47א); the remaining 48% is
   * NOT recognised as a deduction OR a credit (claltax / prisha / kolzchut,
   * verified 2026-06). Held at 0 for back-compat with existing readers; do not
   * reintroduce a non-zero value.
   */
  blCredit: number;
  /** Credits that exceeded gross tax — cannot be refunded, shown as עודף שלא נוצל */
  excessCredits: number;
  taxAfterCredits: number;
  mikdamot: number;
  balance: number; // negative = refund, positive = additional payment due
}

/**
 * עוסק פטור annual revenue ceiling for 2024 = 120,000 ₪.
 * Invariant (per product decision): the עוסק פטור ceiling ALWAYS equals the
 * עוסק זעיר ceiling, so both fields below read from this single constant.
 * CONFIRMED 2026-06 (israeli-vat-reporting + kolzchut/greeninvoice): the ceiling
 * was 120,000 ₪ for 2024 AND 2025 (frozen, not indexed). CPI-indexing only began
 * in 2026 (→ 122,833 ₪). See TAX_YEAR_2026 below.
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

  // VAT (מע"מ) standard rate — 17% through 2024
  vatRate: 0.17,

  // Credit points
  residentCreditPoints: 2.25,
  pointValueAnnual: 2904, // ILS per nekuda, frozen 2024–2027

  // Oleh / returning resident
  newOlehCreditYear1: 3.0,
  newOlehCreditYear2: 2.0,
  newOlehCreditYear3: 1.0,

  // Discharged-soldier credit (זיכוי חייל משוחרר, סעיף 67/39א לפקודה).
  // CORRECTED 2026-06 (kolzchut + claltax/finance sources): the credit is
  // 1/6 of a credit point per ELIGIBLE MONTH for full service (men 23+ months,
  // women 22+ months) — i.e. 2 points per full eligibility year — for the 36
  // months following discharge. Partial service (12–22 months) earns 1/12 point
  // per month (1 point/year). The first and last tax years are prorated by the
  // number of eligible months that fall within the year (חישוב יחסי).
  // The old value (1/6/36 ≈ 0.0046) was wrong — it divided the monthly fraction
  // by the 36-month window, collapsing the whole benefit to a rounding error.
  soldierMonthsCredit: 36, // max eligible months from month after discharge
  soldierFractionPerMonth: 1 / 6, // full service (men 23+ / women 22+ months)
  soldierReducedFractionPerMonth: 1 / 12, // partial service (12–22 months)
  soldierFullServiceMonthsMale: 23,
  soldierFullServiceMonthsFemale: 22,

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
 * עוסק פטור / עוסק זעיר ceiling for 2025 = 120,000 ₪.
 * Same invariant as 2024 — one constant feeds both fields so they cannot drift.
 * CONFIRMED 2026-06 (was CARRIED→TODO(Roy)): the 2025 ceiling is 120,000 ₪,
 * unchanged from 2024. Sources: israeli-vat-reporting reference (≈120K, annually
 * updated) + multiple Israeli accounting sources (kolzchut, greeninvoice,
 * cpa-ea) which all state 2024–2025 = 120,000 and CPI-indexing began only in
 * 2026 (→ 122,833). The user's belief that 2025 was higher conflates the 2026
 * change with 2025. NOT a bug — the displayed 120,000 was correct for 2025.
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
  // Keren Hishtalmut — rate + caps all unchanged 2024→2025 (frozen).
  kerenHishtalmutCap: 13203,            // CONFIRMED 2025 (kolzchut/fnx/financialstar)
  kerenHishtalmutIncomeCeiling: 293397, // CONFIRMED 2025 (= 13,203 ÷ 4.5%)
  kerenHishtalmutRate: 0.045,           // stable
  // Capital-gains-exemption deposit cap (separate from the deductible cap) is
  // 20,566 ₪ for 2025 — surfaced in field137 notes, not a constant here.

  // Bituach Leumi — rates stable; thresholds index-linked.
  bituachLeumiDeductibleRate: 0.52,     // stable (סעיף 47א — 52% of B"L is deductible)
  // NOTE: bituachLeumiCreditRate is NOT a real tax benefit. Only 52% of B"L is a
  // deduction-from-income; the other 48% gets NO deduction and NO credit
  // (verified 2026-06: claltax/prisha/kolzchut). This field is retained for the
  // shared type shape + field-048 legacy display only — the tax ESTIMATE no
  // longer credits it (see estimateTaxLiability). Do not treat 48% as a credit.
  bituachLeumiCreditRate: 0.48,         // legacy/display only — NOT credited in tax calc
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

  // Form 6111 obligation threshold.
  // FLAG(Roy) 2026-06: israeli-tax-returns states the obligation triggers at
  // turnover > 300,000 ₪ INCLUDING VAT. Our code compares this against ex-VAT
  // turnover (income.totalRevenue), so the units don't match. 256,410 is a
  // legacy ex-VAT-looking figure of unconfirmed provenance. Two coherent fixes:
  //   (a) set this to 300000 and compare against VAT-inclusive turnover, or
  //   (b) keep an ex-VAT threshold = 300000 / 1.18 ≈ 254,237 and compare ex-VAT.
  // Left at 256,410 pending Roy's call on which basis to model. See audit doc.
  form6111Threshold: 256410,            // FLAG(Roy): reconcile with 300,000 incl-VAT

  // עוסק פטור / עוסק זעיר ceiling — tied (always equal)
  osekPaturThreshold: OSEK_EXEMPT_CEILING_2025,
  osekZeirExpenseRate: 0.30,            // statutory 30% (תיקון 257)
  osekZeirThreshold: OSEK_EXEMPT_CEILING_2025,

  // VAT (מע"מ) standard rate — raised to 18% on 2025-01-01 (held at 18% in 2026)
  vatRate: 0.18,

  // Credit points — FROZEN for 2025 (no linkage)
  residentCreditPoints: 2.25,           // frozen
  pointValueAnnual: 2904,               // frozen 2024–2027

  // Oleh / returning resident — statutory, stable
  newOlehCreditYear1: 3.0,
  newOlehCreditYear2: 2.0,
  newOlehCreditYear3: 1.0,

  // Soldier discharge — statutory, stable. CORRECTED 2026-06 (was 1/6/36 — see
  // the 2024 block for the full explanation). 1/6 point per eligible month for
  // full service (2 pts/full year), 1/12 for partial service, over 36 months.
  soldierMonthsCredit: 36,
  soldierFractionPerMonth: 1 / 6,
  soldierReducedFractionPerMonth: 1 / 12,
  soldierFullServiceMonthsMale: 23,
  soldierFullServiceMonthsFemale: 22,

  // Surtax — FROZEN for 2025 (israeli-tax-returns: 721,560 frozen 2025–2027)
  surtaxThreshold: 721560,              // CONFIRMED 2025 (frozen through 2027)
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
 * עוסק פטור / עוסק זעיר ceiling for 2026 = 122,833 ₪.
 * CONFIRMED 2026-06: first year of CPI-indexing (was frozen at 120,000 for
 * 2024–2025). Sources: kolzchut, greeninvoice, cpa-ea; also already referenced
 * in lib/deadlines/calendar.ts and the israeli-expense-categorizer skill.
 */
const OSEK_EXEMPT_CEILING_2026 = 122833;

/**
 * Tax year 2026 — added in the 2026-06 accuracy audit.
 *
 * WHY THIS EXISTS: today's date is in 2026 and the registry previously fell back
 * to 2025 constants for any year > 2025, silently showing 2025 figures for 2026
 * filings. Two confirmed 2026 changes make that wrong: the עוסק פטור ceiling rose
 * to 122,833 ₪ (CPI-indexing began), and the Economic Efficiency Law 2026
 * (approved 2026-03-30, retroactive to 2026-01-01) EXPANDED income-tax brackets
 * 3–5 (israeli-tax-returns). Brackets 1–2 and 6, the surtax threshold, and the
 * credit-point value remain frozen through 2027.
 *
 * CARRIED→FLAG(Roy): index-linked caps that I could not independently confirm for
 * 2026 (keren caps, pension caps, B"L thresholds, form6111) are carried from 2025
 * and flagged. Do not treat them as verified 2026 values.
 */
export const TAX_YEAR_2026: TaxYearConstants = {
  // Keren Hishtalmut — FLAG(Roy): 2026 indexed caps unconfirmed (carried 2025).
  kerenHishtalmutCap: 13203,            // FLAG(Roy): confirm 2026 (likely indexed up)
  kerenHishtalmutIncomeCeiling: 293397, // FLAG(Roy): confirm 2026
  kerenHishtalmutRate: 0.045,           // stable

  // Bituach Leumi — FLAG(Roy): 2026 thresholds unconfirmed (carried 2025).
  bituachLeumiDeductibleRate: 0.52,     // stable (סעיף 47א)
  bituachLeumiCreditRate: 0.48,         // legacy/display only — NOT credited in tax calc
  blMonthlyThreshold1: 7703,            // israeli-bituach-leumi 2026: 60% avg wage = 7,703
  blMonthlyMax: 51910,                  // israeli-bituach-leumi 2026: max insurable = 51,910
  blRate1: 0.0597,                      // FLAG(Roy): 2026 self-employed rates shifted (Amend. 252)
  blRate2: 0.1783,                      // FLAG(Roy): 2026 self-employed rates shifted (Amend. 252)

  // Pension — FLAG(Roy): 2026 caps unconfirmed (carried 2025).
  pensionDeductionRate: 0.11,           // stable
  pensionDeductionCap: 25608,           // FLAG(Roy): confirm 2026
  pensionCreditRate: 0.055,             // stable
  pensionCreditCap: 12804,              // FLAG(Roy): confirm 2026
  pensionCreditPercent: 0.35,           // stable

  // Form 6111 — same FLAG as 2025 (reconcile 300,000 incl-VAT vs ex-VAT basis).
  form6111Threshold: 256410,            // FLAG(Roy): reconcile with 300,000 incl-VAT

  // עוסק פטור / עוסק זעיר ceiling — CONFIRMED 122,833 for 2026.
  osekPaturThreshold: OSEK_EXEMPT_CEILING_2026,
  osekZeirExpenseRate: 0.30,            // statutory 30% (תיקון 257)
  osekZeirThreshold: OSEK_EXEMPT_CEILING_2026,

  // VAT — 18% (held at 18% in 2026 per israeli-vat-reporting).
  vatRate: 0.18,

  // Credit points — frozen through 2027.
  residentCreditPoints: 2.25,           // frozen
  pointValueAnnual: 2904,               // frozen 2024–2027

  // Oleh / returning resident — statutory, stable.
  newOlehCreditYear1: 3.0,
  newOlehCreditYear2: 2.0,
  newOlehCreditYear3: 1.0,

  // Soldier discharge — statutory, stable.
  soldierMonthsCredit: 36,
  soldierFractionPerMonth: 1 / 6,
  soldierReducedFractionPerMonth: 1 / 12,
  soldierFullServiceMonthsMale: 23,
  soldierFullServiceMonthsFemale: 22,

  // Surtax — frozen 2025–2027.
  surtaxThreshold: 721560,              // CONFIRMED (frozen through 2027)
  surtaxRate: 0.03,                     // stable

  // Income tax brackets — 2026: brackets 3–5 EXPANDED (Economic Efficiency Law
  // 2026, approved 2026-03-30, retroactive to 2026-01-01). 1–2 and 6 frozen.
  // israeli-tax-returns references/tax-brackets-credits.md (2026).
  taxBrackets: [
    { from: 0,      to: 84120,  rate: 0.10 },
    { from: 84120,  to: 120720, rate: 0.14 },
    { from: 120720, to: 228000, rate: 0.20 }, // expanded (was →193,800)
    { from: 228000, to: 301200, rate: 0.31 }, // expanded (was →269,280)
    { from: 301200, to: 560280, rate: 0.35 }, // expanded (was 269,280→560,280)
    { from: 560280, to: 721560, rate: 0.47 },
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
 * back to the latest defined set (2026), earlier years to 2024.
 */
export function getTaxYearConstants(year: number): TaxYearConstants {
  const exact = TAX_YEAR_REGISTRY[year];
  if (exact) return exact;
  return year > LATEST_TAX_YEAR ? TAX_YEAR_2026 : TAX_YEAR_2024;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Miluim (combat reserve) income-tax credit points — תיקון 283, approved by the
 * Knesset 2026-11-19. EFFECTIVE FROM TAX YEAR 2026 (for reserve service done in
 * 2025) — there is NO miluim credit-point benefit for tax year 2025 or earlier.
 *
 * Tiers for tax years 2026–2027 (CONFIRMED 2026-06 via Knesset + multiple CPA
 * firms): based on combat reserve days served in the qualifying year:
 *   30–39 days → 0.50 point · 40–49 days → 0.75 point · 50+ days → 1.00 point.
 * From tax year 2028 the day-thresholds drop (min 20 days) with a different
 * schedule — NOT modelled here; revisit when 2028 constants are added.
 *
 * Eligibility applies to combat ("לוחם") reservists; self-employed reservists are
 * eligible. Kept separate from the year constants because the benefit is
 * day-banded rather than a single scalar. See field-miluim calculator.
 * ────────────────────────────────────────────────────────────────────────── */
export interface MiluimCreditTier {
  minDays: number;
  points: number;
}

/** First tax year the miluim credit-point benefit exists. */
export const MILUIM_CREDIT_FIRST_YEAR = 2026;

/** Day-banded miluim credit tiers for tax years 2026–2027 (descending). */
export const MILUIM_CREDIT_TIERS_2026: MiluimCreditTier[] = [
  { minDays: 50, points: 1.0 },
  { minDays: 40, points: 0.75 },
  { minDays: 30, points: 0.5 },
];

/**
 * Resolve miluim combat-reserve credit points for a tax year + days served.
 * Returns 0 for years before 2026 (benefit did not exist) or below the 30-day
 * minimum. For 2028+ the tiers change — this still applies the 2026–2027 table
 * and should be revisited when 2028 is modelled.
 */
export function miluimCreditPoints(year: number, combatReserveDays: number): number {
  if (year < MILUIM_CREDIT_FIRST_YEAR) return 0;
  if (!combatReserveDays || combatReserveDays <= 0) return 0;
  const tier = MILUIM_CREDIT_TIERS_2026.find((t) => combatReserveDays >= t.minDays);
  return tier ? tier.points : 0;
}

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
    description: "תקרת ההפקדה השנתית המוכרת לקרן השתלמות לעצמאי (13,203 ₪)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024, 2025], // confirmed unchanged 2024→2025 (audit 2026-06)
    lastVerified: "2026-06-10T00:00:00.000Z",
  },
  kerenHishtalmutIncomeCeiling: {
    description: "תקרת ההכנסה לחישוב ההפקדה המוכרת לקרן השתלמות (293,397 ₪)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024, 2025], // confirmed unchanged 2024→2025 (audit 2026-06)
    lastVerified: "2026-06-10T00:00:00.000Z",
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
    description: "תקרת מחזור שנתי לעוסק פטור ממע״מ (120,000 ₪ ל-2024–2025; 122,833 ₪ מ-2026)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024, 2025], // 120,000; 2026 = 122,833 (CPI-indexed) — see TAX_YEAR_2026
    lastVerified: "2026-06-10T00:00:00.000Z",
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
    description: "סף הכנסה שמעליו חל מס יסף (721,560 ₪, מוקפא 2025–2027)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024, 2025, 2026, 2027], // frozen through 2027 (israeli-tax-returns)
    lastVerified: "2026-06-10T00:00:00.000Z",
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

