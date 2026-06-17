import danaCohen from "../../personas/dana-cohen.json";

export type MaritalStatus =
  | "single"
  | "married"
  | "divorced"
  | "widowed"
  | "separated";

export type OsekType = "patur" | "morshe";

export interface PersonaPersonal {
  firstName: string;
  lastName: string;
  fatherName: string | null;
  teudatZehut: string;
  birthDate: string;
  /** Affects resident credit points: female = 2.75, male = 2.25 */
  gender: "male" | "female";
  maritalStatus: MaritalStatus;
  spouse: unknown | null;
  isNewResident: boolean;
  isReturningResident: boolean;
  isEilatResident: boolean;
  isSoldierDischarged: boolean;
  soldierDischargeDate: string | null;
  academicDegreeYear: number | null;
  aliyahDate?: string | null;  // date of aliyah (ISO), for עולה חדש/ה credit
  /** List of children for credit point calculations */
  children: { birthYear: number }[];
}

export type InvoiceDocType = "tax-invoice-receipt" | "receipt";

export interface InvoiceLine {
  invoiceNumber: string;       // e.g. "2024-0042"
  date: string;                // ISO date
  customerName: string;
  customerTaxId?: string;      // teudat zehut or company number
  description: string;
  amount: number;              // before VAT
  vat: number;                 // 0 for עוסק פטור
  total: number;               // amount + vat
  category?: string;           // e.g. "ייעוץ", "עיצוב"
  /** SHAAM doc type — "tax-invoice-receipt" (305, default) or "receipt" (320) */
  docType?: InvoiceDocType;
}

export interface ExpenseLine {
  date: string;                // ISO date
  vendorName: string;
  description: string;
  amount: number;              // total paid (incl. VAT for patur, ex VAT for morshe)
  vat?: number;
  category: string;            // matches business-expenses/profiles.ts category names
  receiptPath?: string;
  deductionRule: "full" | "partial" | "depreciation";
  partialPercent?: number;
}

export interface PersonaContact {
  mailingAddress: {
    street: string;
    houseNumber: string;
    apartment?: string;
    city: string;
    zipCode: string;
  };
  residenceSameAsMailing: boolean;
  email: string;
  phoneMobile: string;
  phoneWork: string | null;
  phoneHome: string | null;
  consentDigitalNotices: boolean;
}

export interface PersonaBusiness {
  tradeName: string;
  primaryOccupation: string;
  osekType: OsekType;
  osekFileNumber: string;
  osekStartDate: string;
  address: {
    sameAsResidence: boolean;
    street: string | null;
    houseNumber: string | null;
    city: string | null;
    zipCode: string | null;
  };
  bookkeepingMethod: "single-entry" | "double-entry";
  bookkeepingType: "manual" | "computerized";
  isSmallBusiness: boolean;
  /** עוסק זעיר — simplified 30% expense track. Only valid if osekType === "patur". */
  isOsekZeir: boolean;
  hasEmployees: boolean;
  employerNames: string[];
}

export interface PersonaBank {
  bankCode: string;
  bankName: string;
  branchCode: string;
  accountNumber: string;
  accountOwnerName: string;
}

export interface PersonaIncome {
  year: number;
  totalRevenue: number;
  totalDeductibleExpenses: number;
  netIncome: number;
  invoiceCount: number;
  expenseCount: number;
  /** Advance tax payments (מקדמות) paid during the year. Used in tax estimate card. */
  mikdamot?: number;
  invoices?: InvoiceLine[];
  expenses?: ExpenseLine[];
  financialInstitutionsIncome?: number;   // for field 032
  taxWithheldAtSource?: number;           // for field 115
  monthlyBreakdown: { month: string; revenue: number; expenses: number }[];
}

export interface PersonaDeductions {
  kerenHishtalmut: { annualContribution: number };
  kupatGemel: { annualContribution: number };
  /** Sections 45A/47 — pension/provident fund contributions */
  pensionContributions: { annualContribution: number };
  /**
   * Self-employed National-Insurance paid (field 030). `annualPaid` is intended
   * to be the BITUACH-LEUMI COMPONENT ONLY — it is the base for the 52% סעיף-47א
   * deduction, which applies to B"L and NOT to health tax (מס בריאות).
   * FLAG(Roy): if a real persona's figure bundles health tax into this number,
   * the 52% deduction is overstated. Recommended fix when real data lands: split
   * into `{ bituachLeumi: number; healthTax: number }` and deduct 52% of the
   * B"L part only. Do not change the deduction base silently.
   */
  bituachLeumiSelfEmployed: { annualPaid: number };
  bituachLifeOrCancerPolicy: number;
  /** Section 72 — life insurance premium */
  lifeInsurancePremium: number;
  donations: { currentYear: number; carriedFromPriorYears: number };
  academicDegreeCredit: boolean;
  lossOfWorkCapacityPremium?: number;     // for field 112 (אובדן כושר עבודה)
}

/* ──────────────────────────────────────────────────────────────────────────
 * הצהרת הון — Capital declaration (Form 1219)
 *
 * A point-in-time snapshot of everything the taxpayer owns (assets) and owes
 * (liabilities). The Tax Authority compares two declarations across years to
 * check that the change in net worth is explained by declared income. countme
 * computes the SUBTOTALS and NET CAPITAL from the user's own entries — it states
 * facts, not advice; valuation rules are flagged to the רו"ח (israeli-tax-returns).
 * ────────────────────────────────────────────────────────────────────────── */

export type AssetCategory =
  | "cash-and-deposits" // מזומן, עו"ש, פיקדונות, חסכונות
  | "securities" // ניירות ערך וקרנות
  | "provident-and-pension" // קופ"ג, קרן השתלמות, פנסיה
  | "real-estate" // נדל"ן (דירות, מגרשים)
  | "vehicles" // כלי רכב
  | "business-capital" // הון בעסק (מלאי, ציוד, יתרת לקוחות)
  | "loans-receivable" // הלוואות שנתן הנישום
  | "life-insurance" // ביטוח חיים — ערך פדיון
  | "personal-property" // מטלטלין, תכשיטים, אומנות
  | "other-assets";

export type LiabilityCategory =
  | "mortgage" // משכנתא
  | "bank-loan" // הלוואה בנקאית
  | "private-loan" // הלוואה מאחר/קרוב
  | "credit-balance" // יתרת אשראי/כרטיסים
  | "supplier-debt" // חוב לספקים
  | "other-liability";

export interface AssetItem {
  category: AssetCategory;
  description: string;
  value: number; // ₪ at the declaration date
  /** Provenance of the number (bank statement, appraisal…) — feeds CalcResult sources. */
  evidence?: string;
}

export interface LiabilityItem {
  category: LiabilityCategory;
  description: string;
  value: number;
  evidence?: string;
}

export interface PersonaCapitalDeclaration {
  /** Snapshot date of the declaration, ISO (e.g. "2024-12-31"). */
  declarationDate: string;
  assets: AssetItem[];
  liabilities: LiabilityItem[];
}

export interface Persona {
  id: string;
  displayName: string;
  personal: PersonaPersonal;
  contact: PersonaContact;
  business: PersonaBusiness;
  bank: PersonaBank;
  income: PersonaIncome;
  deductionsAndCredits: PersonaDeductions;
  vatAndTurnover: {
    annualTurnoverWithoutVat: number;
    isAbove6111Threshold: boolean;
  };
  /** הצהרת הון (Form 1219). Optional — only present once the user fills it. */
  capitalDeclaration?: PersonaCapitalDeclaration;
  invoiceCounter?: number;   // next invoice number to use
}

/**
 * Bundled demo persona (Dana Cohen). Replace by editing personas/dana-cohen.json.
 *
 * SCOPE — anonymous / open-demo ONLY. Do NOT auto-load this for an authenticated
 * user: a real logged-in user's persona is `profiles.persona` in Supabase (read
 * via `lib/data/persona-repository`), hydrated into the local cache by
 * `PersonaHydrator`. Seeding this demo object into the signup → /setup → DB flow
 * would show one person fake data and could overwrite their real DB row.
 *
 * As of this writing nothing in `src/` imports this at runtime — `/demo` reads
 * the local cache and redirects to /setup when empty; pages read the cache via
 * `loadPersona()`. Keep it that way: if you need a demo seed, gate it behind an
 * explicit "no authenticated user" check, never an unconditional fallback.
 */
export const defaultPersona = danaCohen as unknown as Persona;

/** Read any nested path on the persona (used by form-1301 schema "personaPath"). */
export function readPersonaPath(persona: Persona, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object" && key in (acc as Record<string, unknown>)
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      persona,
    );
}
