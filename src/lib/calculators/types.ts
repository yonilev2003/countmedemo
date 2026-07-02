/**
 * Shared types for the field calculators that drive the demo.
 *
 * Each calculator takes a persona JSON and returns a CalcResult with:
 *   - value: what to write in the form (number for currency/integer, string for text)
 *   - sources: human-readable list of what fed the calculation (shown in the agent tooltip)
 *   - formula: short explanation of the math
 *
 * Tax-rule constants are year-keyed (see getTaxYearConstants). The product's
 * current calibration target is TAX YEAR 2025 (the pilot files the 2025 annual
 * return); 2024 stays defined as a valid historical filing year and 2026 is
 * defined-but-mostly-flagged (out of scope of the 2025 alignment pass).
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
  femaleResidentBonusPoints: 0.5, // female base = male base + 0.5 (2.75 total)
  pointValueAnnual: 2904, // ILS per nekuda, frozen 2024–2027

  // Child credit points by age within the tax year (israeli-tax-returns table).
  childCreditPointsByAge: {
    bornDuringYear: 1.5, // year of birth only
    age1to5: 2.5,
    age6to17: 1.0,
    age18: 0.5, // last credited year
  },

  // Donations credit (סעיף 46): 35% of recognised donations, floor 207 ₪,
  // ceiling 30% of taxable income (or an absolute cap ~9.35M ₪ — NOT modelled,
  // irrelevant at our users' scale). Floor CONFIRMED 2024 = 207 ₪ (kolzchut,
  // retrieved 2026-07-02; the previous hardcoded 200 was the stale 2023 figure).
  donationsCreditPercent: 0.35,
  donationsCreditMinimum: 207,
  donationsCreditIncomeCeilingRate: 0.30,

  // Life-insurance premium credit (סעיף 45א(א)(1)): 25% of the premium.
  // CORRECTED 2026-07-02 (was 5% — no such rate exists; sources: חוזר מס הכנסה
  // 19/2004, kolzchut, indigofinance). The 45א qualifying-premium ceiling is
  // NOT yet modelled — FLAG(Roy): confirm the cap mechanism before high-premium
  // personas rely on this figure.
  lifeInsuranceCreditRate: 0.25,

  // Keren-hishtalmut EXEMPT-DEPOSIT cap (capital-gains exemption at withdrawal;
  // separate from the deductible cap above). FLAG(Roy): 2024 figure unconfirmed —
  // carried at the 2025 value (display-only note in field137).
  kerenExemptDepositCap: 20566,

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
 * each constant is a deliberate per-year decision. THIS IS THE CALIBRATION
 * TARGET (the pilot files the 2025 annual return) — no 2024 or 2026 value may
 * leak into this block.
 *
 * Status after the ty2025-alignment pass (2026-06-10):
 *  • FROZEN — brackets, credit-point value (2,904), surtax (721,560): not
 *    indexed for 2025, intentionally equal to 2024. CONFIRMED via
 *    israeli-tax-returns (frozen 2025–2027).
 *  • CONFIRMED — keren cap 13,203 / income ceiling 293,397; B"L bracket 7,522/mo
 *    & ceiling 49,030/mo + the 7.12% / 17.83% self-employed rates; עוסק
 *    פטור/זעיר ceiling 120,000; VAT 18%. Sources in the inline comments.
 *  • STABLE — statutory rates (4.5% keren, 52% B"L deduction, 30% zeir, 35%
 *    pension credit) don't move year to year.
 *  • FLAG(Roy) — only the index-linked PENSION caps (25,608 / 12,804) remain
 *    unconfirmed for 2025 (no owned skill states them); carried at 2024 with a
 *    flag so we never silently show a wrong value.
 */
export const TAX_YEAR_2025: TaxYearConstants = {
  // Keren Hishtalmut — rate + caps all unchanged 2024→2025 (frozen).
  kerenHishtalmutCap: 13203,            // CONFIRMED 2025 (kolzchut/fnx/financialstar)
  kerenHishtalmutIncomeCeiling: 293397, // CONFIRMED 2025 (= 13,203 ÷ 4.5%)
  kerenHishtalmutRate: 0.045,           // stable
  // Capital-gains-exemption deposit cap (separate from the deductible cap) is
  // 20,566 ₪ for 2025 — surfaced in field137 notes, not a constant here.

  // Bituach Leumi — rates stable; thresholds index-linked.
  // CONFIRMED 2025 (israeli-bituach-leumi + ty2025-alignment decision):
  //   • reduced-rate bracket boundary = 7,522 ₪/mo (= 90,264 ₪/yr; 60% avg wage)
  //   • max insurable income          = 49,030 ₪/mo (= 588,360 ₪/yr)
  //   • combined SELF-EMPLOYED rates (B"L + health):
  //       reduced bracket = 7.12%  (3.89% B"L + 3.23% health)   ← blRate1
  //       full    bracket = 17.83% (12.83% B"L + 5.00% health)  ← blRate2
  //   The 52% deduction (סעיף 47א) applies to the B"L COMPONENT ONLY, never to
  //   the health-tax component — that intent is documented by the split above
  //   and enforced in field030BituachLeumi (it deducts 52% of the user's
  //   `bituachLeumiSelfEmployed.annualPaid` input, which is B"L-paid, not health).
  bituachLeumiDeductibleRate: 0.52,     // stable (סעיף 47א — 52% of the B"L component)
  // NOTE: bituachLeumiCreditRate is NOT a real tax benefit. Only 52% of B"L is a
  // deduction-from-income; the other 48% gets NO deduction and NO credit
  // (verified 2026-06: claltax/prisha/kolzchut). This field is retained for the
  // shared type shape + field-048 legacy display only — the tax ESTIMATE no
  // longer credits it (see estimateTaxLiability). Do not treat 48% as a credit.
  bituachLeumiCreditRate: 0.48,         // legacy/display only — NOT credited in tax calc
  blMonthlyThreshold1: 7522,            // CONFIRMED 2025 (= 90,264 ₪/yr, 60% avg wage)
  // CORRECTED 2026-07-02: the 2025 max insurable income is 50,695 ₪/mo (kolzchut
  // "דמי ביטוח לאומי לעצמאי" + btl.gov.il 2025 circular). 49,030 was the 2024
  // figure, previously carried here with a wrong CONFIRMED mark. DORMANT constant
  // (no calculator consumes it) — display/provenance only.
  blMonthlyMax: 50695,                  // CONFIRMED 2025 (was wrongly 49,030 = the 2024 value)
  // blRate1/blRate2 are DORMANT (defined for shape/provenance; no calculator
  // consumes them — the 030/137 calcs deduct from the persona's paid figure).
  blRate1: 0.0712,                      // CONFIRMED 2025 reduced total: 3.89% B"L + 3.23% health
  blRate2: 0.1783,                      // CONFIRMED 2025 full total: 12.83% B"L + 5.00% health

  // Pension — rates stable; caps index-linked.
  // CONFIRMED 2025 (2026-07-02, FLAG(Roy) resolved): the qualifying-income cap
  // (הכנסה מזכה) is 232,800 ₪ for 2024–2025 (kolzchut pension-benefits page +
  // mvs.co.il) → deduction cap 11% × 232,800 = 25,608; credit-base cap
  // 5.5% × 232,800 = 12,804. The carried values were correct.
  pensionDeductionRate: 0.11,           // stable
  pensionDeductionCap: 25608,           // CONFIRMED 2025 (= 11% × 232,800)
  pensionCreditRate: 0.055,             // stable
  pensionCreditCap: 12804,              // CONFIRMED 2025 (= 5.5% × 232,800)
  pensionCreditPercent: 0.35,           // stable

  // Form 6111 obligation threshold — CONFIRMED 256,410 ₪ (ex-VAT) for 2025.
  // ADJUDICATED (ty2025-alignment): our calculators compare against ex-VAT
  // turnover (income.totalRevenue), and 256,410 ₪ is the correct ex-VAT trigger
  // for the 2025 return. The israeli-tax-returns skill quotes the rule as
  // "> 300,000 ₪ INCLUDING VAT"; at the 2025 VAT rate (18%) that is
  // 300,000 / 1.18 ≈ 254,237 ₪ ex-VAT — the same order of magnitude. The
  // ex-VAT figure we use (256,410) is the value to compare against our ex-VAT
  // turnover and is confirmed correct; the earlier FLAG is resolved.
  form6111Threshold: 256410,            // CONFIRMED 2025 (ex-VAT basis; ≈300,000 incl-VAT)

  // עוסק פטור / עוסק זעיר ceiling — tied (always equal)
  osekPaturThreshold: OSEK_EXEMPT_CEILING_2025,
  osekZeirExpenseRate: 0.30,            // statutory 30% (תיקון 257)
  osekZeirThreshold: OSEK_EXEMPT_CEILING_2025,

  // VAT (מע"מ) standard rate — raised to 18% on 2025-01-01 (held at 18% in 2026)
  vatRate: 0.18,

  // Credit points — FROZEN for 2025 (no linkage)
  residentCreditPoints: 2.25,           // frozen
  femaleResidentBonusPoints: 0.5,       // statutory, stable
  pointValueAnnual: 2904,               // frozen 2024–2027

  // Child credit points — statutory table, stable (israeli-tax-returns).
  childCreditPointsByAge: {
    bornDuringYear: 1.5,
    age1to5: 2.5,
    age6to17: 1.0,
    age18: 0.5,
  },

  // Donations credit (סעיף 46) — floor CONFIRMED 2025 = 207 ₪ (kolzchut +
  // PKF year-end circular, retrieved 2026-07-02). Percent + income ceiling stable.
  donationsCreditPercent: 0.35,
  donationsCreditMinimum: 207,
  donationsCreditIncomeCeilingRate: 0.30,

  // Life-insurance credit (סעיף 45א(א)(1)) — 25%, statutory (see 2024 block).
  lifeInsuranceCreditRate: 0.25,

  // Keren exempt-deposit cap — CONFIRMED 2025 = 20,566 ₪ (kolzchut, pensuni,
  // retrieved 2026-07-02).
  kerenExemptDepositCap: 20566,

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
  // Keren Hishtalmut — deductible cap CONFIRMED 2026 = 13,203 ₪ (unchanged;
  // kolzchut + moreinvest "נכון ל-2026", retrieved 2026-07-02). Income ceiling
  // still FLAG(Roy) (13,203 ÷ 4.5% ≈ 293,400 is consistent but not officially cited).
  kerenHishtalmutCap: 13203,            // CONFIRMED 2026 (kolzchut, moreinvest)
  kerenHishtalmutIncomeCeiling: 293397, // FLAG(Roy): confirm 2026
  kerenHishtalmutRate: 0.045,           // stable

  // Bituach Leumi — FLAG(Roy): 2026 thresholds unconfirmed (carried 2025).
  bituachLeumiDeductibleRate: 0.52,     // stable (סעיף 47א)
  bituachLeumiCreditRate: 0.48,         // legacy/display only — NOT credited in tax calc
  // FLAG(Roy): threshold candidates conflict — 7,703 (israeli-bituach-leumi skill)
  // vs 7,710 (jobcalc.co.il 2026 calculator, = 60% avg wage). Kept 7,703 until a
  // btl.gov.il primary source settles it. DORMANT constant.
  blMonthlyThreshold1: 7703,            // FLAG(Roy): confirm 2026 (7,703 vs 7,710)
  blMonthlyMax: 51910,                  // CONFIRMED 2026 (kolzchut + jobcalc: 51,910 ₪/mo)
  // CONFIRMED 2026 (2026-07-02): self-employed B"L 4.47% reduced / 12.83% full
  // (Amend. 252 increase) + health 3.23% / 5.00% → combined 7.70% / 17.83%
  // (kolzchut, jobcalc, ICPAS 2025→2026 tables). Was carried 5.97% with FLAG.
  blRate1: 0.0770,                      // CONFIRMED 2026 (4.47% B"L + 3.23% health)
  blRate2: 0.1783,                      // CONFIRMED 2026 (12.83% B"L + 5.00% health)

  // Pension — FLAG(Roy): 2026 caps unconfirmed (carried 2025).
  pensionDeductionRate: 0.11,           // stable
  pensionDeductionCap: 25608,           // FLAG(Roy): confirm 2026
  pensionCreditRate: 0.055,             // stable
  pensionCreditCap: 12804,              // FLAG(Roy): confirm 2026
  pensionCreditPercent: 0.35,           // stable

  // Form 6111 — basis adjudicated (ex-VAT comparison, see 2025 block). The 2026
  // ex-VAT figure itself is OUT OF SCOPE of the ty2025 pass; carried from 2025.
  form6111Threshold: 256410,            // carried from 2025 (2026 value out of scope — NEEDS-ROY)

  // עוסק פטור / עוסק זעיר ceiling — CONFIRMED 122,833 for 2026.
  osekPaturThreshold: OSEK_EXEMPT_CEILING_2026,
  osekZeirExpenseRate: 0.30,            // statutory 30% (תיקון 257)
  osekZeirThreshold: OSEK_EXEMPT_CEILING_2026,

  // VAT — 18% (held at 18% in 2026 per israeli-vat-reporting).
  vatRate: 0.18,

  // Credit points — frozen through 2027.
  residentCreditPoints: 2.25,           // frozen
  femaleResidentBonusPoints: 0.5,       // statutory, stable
  pointValueAnnual: 2904,               // frozen 2024–2027

  // Child credit points — statutory table, stable.
  childCreditPointsByAge: {
    bornDuringYear: 1.5,
    age1to5: 2.5,
    age6to17: 1.0,
    age18: 0.5,
  },

  // Donations credit (סעיף 46) — percent/ceiling stable; floor FLAG(Roy):
  // 2026 indexed floor unconfirmed, carried at the 2025 value (207 ₪).
  donationsCreditPercent: 0.35,
  donationsCreditMinimum: 207,          // FLAG(Roy): confirm 2026 floor
  donationsCreditIncomeCeilingRate: 0.30,

  // Life-insurance credit (סעיף 45א(א)(1)) — 25%, statutory (see 2024 block).
  lifeInsuranceCreditRate: 0.25,

  // Keren exempt-deposit cap — CONFIRMED 2026 = 20,566 ₪, unchanged from 2025
  // (pensuni, analyst, igemel-net — retrieved 2026-07-02).
  kerenExemptDepositCap: 20566,

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
 * Knesset 2025-11-19. EFFECTIVE FROM TAX YEAR 2026.
 *
 * MECHANISM (confirmed, Gemini review 2026-06-19): the credit in tax year N is
 * based on the combat reserve days served in the PRIOR year (N-1). So the 2026
 * return credits 2025 service; the 2027 return credits 2026 service. There is NO
 * miluim credit line on the 2025 return itself — only a forward-looking forecast.
 *
 * BASE LADDER for tax years 2026–2027 (combat "לוחם" days in the qualifying year):
 *   30–39 → 0.50 · 40–49 → 0.75 · 50 → 1.00, then +0.25 per full 5 days beyond
 *   50, capped at 4.00 points (reached at 110 days). Point value = 2,904 ₪
 *   (frozen 2024–2027), so the max benefit is 11,616 ₪.
 *
 * 2027 ENTRY TIER — TODO(Roy): sources mention a lower 20-day entry tier added
 * for tax year 2027 (for 2026 service). The reported value (20 days → 0.75) is
 * regressive against the base ladder (30 days → 0.50) and is NOT modelled until
 * the official 2027 table is confirmed (חוזר רשות המסים 16.12.2025). Until then
 * 2027 uses the same base ladder as 2026.
 *
 * Eligibility applies to combat reservists; self-employed reservists are eligible
 * and claim it on the annual return (Form 1301). See field-miluim calculator.
 * ────────────────────────────────────────────────────────────────────────── */
export interface MiluimCreditTier {
  minDays: number;
  points: number;
}

/** First tax year the miluim credit-point benefit exists. */
export const MILUIM_CREDIT_FIRST_YEAR = 2026;

/**
 * Dedicated point value for the miluim credit (₪). Held separately from the
 * general credit-point value because תיקון 283 froze the miluim point at 2,904 ₪
 * for 2026–2027 specifically — if the general point is later indexed, the miluim
 * point must NOT follow it silently.
 */
export const MILUIM_CREDIT_POINT_VALUE = 2904;

/** Base day-bands for the linear ladder (descending). Documentation of the
 * fixed-point bands below 50; the >50 progression is computed in the function. */
export const MILUIM_CREDIT_TIERS_2026: MiluimCreditTier[] = [
  { minDays: 50, points: 1.0 },
  { minDays: 40, points: 0.75 },
  { minDays: 30, points: 0.5 },
];

/** Minimum combat days for any credit under the base ladder (2026–2027). */
const MILUIM_MIN_DAYS = 30;
/** Maximum credit points (reached at 110 days). */
const MILUIM_MAX_POINTS = 4.0;

/**
 * Resolve miluim combat-reserve credit POINTS for a given TAX YEAR + combat days
 * served in the qualifying (prior) year. Implements the full base ladder
 * including the +0.25-per-5-days progression above 50 days, capped at 4.0.
 * Returns 0 before 2026 or below the 30-day minimum.
 *
 * NOTE: `combatReserveDays` must already be the PRIOR-year (N-1) figure — use
 * `miluimCreditPointsForFiling` to resolve it from a persona's reserveDaysByYear.
 */
export function miluimCreditPoints(taxYear: number, combatReserveDays: number): number {
  if (taxYear < MILUIM_CREDIT_FIRST_YEAR) return 0;
  const days = combatReserveDays || 0;
  if (days < MILUIM_MIN_DAYS) return 0;
  if (days < 40) return 0.5;
  if (days < 50) return 0.75;
  // 50+ : 1.0 at 50, +0.25 per full 5 days beyond 50, capped at 4.0 (110 days).
  const extraSteps = Math.floor((days - 50) / 5);
  return Math.min(MILUIM_MAX_POINTS, 1.0 + extraSteps * 0.25);
}

/** The service year whose days feed the credit on a given filing (tax) year. */
export function miluimServiceYear(taxYear: number): number {
  return taxYear - 1;
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
    effectiveTaxYears: [2024, 2025], // statutory rate — stable (ty2025-alignment)
    lastVerified: "2026-06-10T00:00:00.000Z",
  },
  bituachLeumiDeductibleRate: {
    description: "שיעור דמי ביטוח לאומי לעצמאי המוכרים כהוצאה — רכיב הב״ל בלבד (52%)",
    sourceUrl: "https://www.btl.gov.il/",
    publisher: "המוסד לביטוח לאומי",
    effectiveTaxYears: [2024, 2025], // סעיף 47א — stable; applies to B"L component only
    lastVerified: "2026-06-10T00:00:00.000Z",
  },
  form6111Threshold: {
    description: "מחזור (ללא מע״מ) שמעליו חלה חובת צירוף טופס 6111 לדוח (256,410 ₪)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024, 2025], // ex-VAT basis confirmed (ty2025-alignment)
    lastVerified: "2026-06-10T00:00:00.000Z",
  },
  osekPaturThreshold: {
    description: "תקרת מחזור שנתי לעוסק פטור ממע״מ (120,000 ₪ ל-2024–2025; 122,833 ₪ מ-2026)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024, 2025], // 120,000; 2026 = 122,833 (CPI-indexed) — see TAX_YEAR_2026
    lastVerified: "2026-06-10T00:00:00.000Z",
  },
  osekZeirExpenseRate: {
    description: "שיעור הוצאות מוכר אוטומטית במסלול עוסק זעיר (30%, תיקון 257)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024, 2025], // statutory 30% — stable (ty2025-alignment)
    lastVerified: "2026-06-10T00:00:00.000Z",
  },
  osekZeirThreshold: {
    description: "תקרת מחזור למסלול עוסק זעיר (= תקרת עוסק פטור, 120,000 ₪ ל-2024–2025)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024, 2025], // 120,000 confirmed 2024–2025; 122,833 from 2026
    lastVerified: "2026-06-10T00:00:00.000Z",
  },
  residentCreditPoints: {
    description: "נקודות זיכוי בסיס לתושב ישראל (גבר 2.25 / אישה 2.75)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024, 2025], // frozen (ty2025-alignment)
    lastVerified: "2026-06-10T00:00:00.000Z",
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
    effectiveTaxYears: [2024, 2025], // stable (ty2025-alignment)
    lastVerified: "2026-06-10T00:00:00.000Z",
  },
  pensionDeductionCap: {
    description: "תקרת ניכוי בגין הפקדות לפנסיה (סעיף 47)",
    sourceUrl: ITA_HOME,
    publisher: ITA,
    effectiveTaxYears: [2024], // FLAG(Roy): 2025 indexed cap unconfirmed — see TAX_YEAR_2025
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

