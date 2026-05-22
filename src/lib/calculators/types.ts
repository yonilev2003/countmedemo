/**
 * Shared types for the field calculators + the regulatory metadata layer.
 *
 * Each calculator takes a persona JSON and returns a CalcResult with:
 *   - value: what to write in the form (number for currency/integer, string for text)
 *   - sources: human-readable list of what fed the calculation
 *   - formula: short explanation of the math
 *
 * Tax-rule numbers live in TAX_YEAR_YYYY_RAW (the metadata-rich table) and are
 * flattened automatically to TAX_YEAR_YYYY (the lookup the calculators use).
 * The regulatory-watch agent reads the _RAW table to know which value came
 * from which official publication, when it was last verified, and which tax
 * years it applies to.
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

/* ============================================================
 * Regulatory metadata layer
 * ============================================================ */

export type Issuer = "taxes.gov.il" | "knesset" | "icpas" | "gov.il";

export interface TaxConstantSource {
  /** Canonical URL of the publication that establishes this value. */
  url: string;
  /** Human-readable Hebrew title. */
  title: string;
  /** Which official body issued it. */
  issuer: Issuer;
  /** ISO date the source was published. */
  publishedAt: string;
}

export interface TaxConstant<T = number> {
  value: T;
  source: TaxConstantSource;
  /** ISO date — bumped each time a human (yoni/CPA) confirmed the value is still correct. */
  lastVerified: string;
  /** First tax year this value applies to. */
  effectiveFrom: number;
  /** Inclusive last tax year — set for הוראות שעה. Omit for permanent values. */
  effectiveTo?: number;
  /** Free-text caveats — surfaced in the agent's Issue. */
  notes?: string;
}

export type TaxYearTable = Record<string, TaxConstant<unknown>>;

/** Strip a metadata-rich table to plain {key: value} for the calculators. */
function flatten<T extends Record<string, TaxConstant<unknown>>>(
  table: T,
): { [K in keyof T]: T[K] extends TaxConstant<infer V> ? V : never } {
  const out = {} as { [K in keyof T]: T[K] extends TaxConstant<infer V> ? V : never };
  for (const k in table) {
    (out as Record<string, unknown>)[k] = table[k].value;
  }
  return out;
}

/* ============================================================
 * Raw metadata for tax year 2024
 *
 * Every number a calculator reads lives here with its source URL,
 * the date a human last verified it, and the tax-year window it applies to.
 * The regulatory-watch agent uses this to know "this publication might affect
 * `pointValueAnnual` — that value's source is X, last verified on Y".
 *
 * When updating a value: bump `lastVerified` and (if the change is for a
 * future year) clone this constant into the 2025+ table instead of mutating
 * this one — past filings rely on the historical value.
 * ============================================================ */

const SRC_RASHUT_MISIM_2024: TaxConstantSource = {
  url: "https://www.gov.il/he/departments/israel_tax_authority",
  title: "רשות המסים — מדריך מס הכנסה לעצמאי, שנת המס 2024",
  issuer: "taxes.gov.il",
  publishedAt: "2024-01-01",
};

const SRC_RASHUT_MISIM_NEKUDAT_ZIKUI: TaxConstantSource = {
  url: "https://www.gov.il/he/departments/general/credit-points-tax-year",
  title: "ערך נקודת זיכוי — רשות המסים",
  issuer: "taxes.gov.il",
  publishedAt: "2024-01-01",
};

const SRC_KNESSET_PAKIDAT_MAS: TaxConstantSource = {
  url: "https://www.nevo.co.il/law_html/law01/255_001.htm",
  title: "פקודת מס הכנסה [נוסח חדש]",
  issuer: "knesset",
  publishedAt: "2024-01-01",
};

const SRC_BITUACH_LEUMI_RATES: TaxConstantSource = {
  url: "https://www.btl.gov.il/Insurance/Pages/Atzmaim.aspx",
  title: "ביטוח לאומי — שיעורי דמי ביטוח לעצמאי",
  issuer: "gov.il",
  publishedAt: "2024-01-01",
};

const VERIFIED_2024 = "2024-12-15";

export const TAX_YEAR_2024_RAW = {
  // Keren Hishtalmut: 4.5% of income up to income ceiling = max NIS deductible
  kerenHishtalmutCap: {
    value: 13203,
    source: SRC_RASHUT_MISIM_2024,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
    notes: "תקרה שנתית למוכרות בניכוי. עשויה להשתנות מדי שנה.",
  } satisfies TaxConstant,
  kerenHishtalmutIncomeCeiling: {
    value: 293397,
    source: SRC_RASHUT_MISIM_2024,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,
  kerenHishtalmutRate: {
    value: 0.045,
    source: SRC_RASHUT_MISIM_2024,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,

  // Bituach Leumi self-employed: 52% deductible expense, 48% direct tax credit
  bituachLeumiDeductibleRate: {
    value: 0.52,
    source: SRC_BITUACH_LEUMI_RATES,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,
  bituachLeumiCreditRate: {
    value: 0.48,
    source: SRC_BITUACH_LEUMI_RATES,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,
  blMonthlyThreshold1: {
    value: 7522,
    source: SRC_BITUACH_LEUMI_RATES,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
    notes: "60% מהשכר הממוצע — סף המדרגה הראשונה.",
  } satisfies TaxConstant,
  blMonthlyMax: {
    value: 49030,
    source: SRC_BITUACH_LEUMI_RATES,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,
  blRate1: {
    value: 0.0597,
    source: SRC_BITUACH_LEUMI_RATES,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,
  blRate2: {
    value: 0.1783,
    source: SRC_BITUACH_LEUMI_RATES,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,

  // Pension (section 47 deduction + 45A credit)
  pensionDeductionRate: {
    value: 0.11,
    source: SRC_KNESSET_PAKIDAT_MAS,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
    notes: "סעיף 47 לפקודה.",
  } satisfies TaxConstant,
  pensionDeductionCap: {
    value: 25608,
    source: SRC_RASHUT_MISIM_2024,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,
  pensionCreditRate: {
    value: 0.055,
    source: SRC_KNESSET_PAKIDAT_MAS,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
    notes: "סעיף 45א.",
  } satisfies TaxConstant,
  pensionCreditCap: {
    value: 12804,
    source: SRC_RASHUT_MISIM_2024,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,
  pensionCreditPercent: {
    value: 0.35,
    source: SRC_KNESSET_PAKIDAT_MAS,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,

  // Form 6111 obligation threshold
  form6111Threshold: {
    value: 256410,
    source: SRC_RASHUT_MISIM_2024,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
    notes: "סף מחזור לחובת הגשת טופס 6111 (דוח מאזן ורווח-והפסד).",
  } satisfies TaxConstant,

  // VAT-exempt (עוסק פטור) ceiling
  osekPaturThreshold: {
    value: 120000,
    source: {
      url: "https://www.gov.il/he/departments/topics/excise_tax_authority",
      title: "תקרת עוסק פטור — חוק מע\"מ",
      issuer: "taxes.gov.il",
      publishedAt: "2024-01-01",
    },
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,

  // עוסק זעיר: automatic 30% expense recognition
  osekZeirExpenseRate: {
    value: 0.30,
    source: SRC_KNESSET_PAKIDAT_MAS,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
    notes: "מסלול מקוצר עוסק זעיר — 30% הוצאות אוטומטיות.",
  } satisfies TaxConstant,
  osekZeirThreshold: {
    value: 120000,
    source: SRC_KNESSET_PAKIDAT_MAS,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,

  // Credit points
  residentCreditPoints: {
    value: 2.25,
    source: SRC_KNESSET_PAKIDAT_MAS,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
    notes: "סעיף 33א — נקודות זיכוי לתושב ישראל (גבר).",
  } satisfies TaxConstant,
  pointValueAnnual: {
    value: 2904,
    source: SRC_RASHUT_MISIM_NEKUDAT_ZIKUI,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
    effectiveTo: 2027,
    notes: "ערך נקודת זיכוי שנתית — מוקפא 2024–2027 לפי חוק.",
  } satisfies TaxConstant,

  // Oleh / returning resident
  newOlehCreditYear1: {
    value: 3.0,
    source: SRC_KNESSET_PAKIDAT_MAS,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,
  newOlehCreditYear2: {
    value: 2.0,
    source: SRC_KNESSET_PAKIDAT_MAS,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,
  newOlehCreditYear3: {
    value: 1.0,
    source: SRC_KNESSET_PAKIDAT_MAS,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,

  // Soldier discharge credit
  soldierMonthsCredit: {
    value: 36,
    source: SRC_KNESSET_PAKIDAT_MAS,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,
  soldierFractionPerMonth: {
    value: 1 / 6 / 36,
    source: SRC_KNESSET_PAKIDAT_MAS,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,

  // Surtax (mas yesafim)
  surtaxThreshold: {
    value: 721560,
    source: SRC_KNESSET_PAKIDAT_MAS,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
    notes: "סעיף 121ב — מס יסף.",
  } satisfies TaxConstant,
  surtaxRate: {
    value: 0.03,
    source: SRC_KNESSET_PAKIDAT_MAS,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
  } satisfies TaxConstant,

  // Income tax brackets
  taxBrackets: {
    value: [
      { from: 0,      to: 84120,  rate: 0.10 },
      { from: 84120,  to: 120720, rate: 0.14 },
      { from: 120720, to: 193800, rate: 0.20 },
      { from: 193800, to: 269280, rate: 0.31 },
      { from: 269280, to: 560280, rate: 0.35 },
      { from: 560280, to: 721560, rate: 0.47 },
      { from: 721560, to: Infinity, rate: 0.50 },
    ] as TaxBracket[],
    source: SRC_KNESSET_PAKIDAT_MAS,
    lastVerified: VERIFIED_2024,
    effectiveFrom: 2024,
    notes: "מדרגות מס הכנסה ליחיד — 50% מבטא 47% + מס יסף 3%.",
  } satisfies TaxConstant<TaxBracket[]>,
} as const satisfies Record<string, TaxConstant<unknown>>;

/** Flat lookup used by calculators (backwards-compatible shape). */
export const TAX_YEAR_2024 = flatten(TAX_YEAR_2024_RAW);

/** Registry of all known tax-year metadata tables, for the agent. */
export const TAX_YEAR_TABLES: Record<number, typeof TAX_YEAR_2024_RAW> = {
  2024: TAX_YEAR_2024_RAW,
};

/** Resolver — returns the flat value table for the requested tax year. */
export function TY(year: number): typeof TAX_YEAR_2024 {
  const table = TAX_YEAR_TABLES[year];
  if (!table) {
    throw new Error(`No tax-year metadata for ${year}. Add it via scripts/new-tax-year.ts.`);
  }
  return flatten(table);
}
