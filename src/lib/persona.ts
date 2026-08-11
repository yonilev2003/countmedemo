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
  /** Length of regular military service in months — drives the discharged-soldier
   * credit's full (1/6) vs partial (1/12) per-month rate. Absent ⇒ assume full. */
  soldierServiceMonths?: number | null;
  academicDegreeYear: number | null;
  aliyahDate?: string | null;  // date of aliyah (ISO), for עולה חדש/ה credit
  /**
   * Combat ("לוחם") reserve days served, keyed by SERVICE year (e.g. "2025").
   * The miluim credit (תיקון 283) for tax year N is based on days served in N-1,
   * so the calculator looks up reserveDaysByYear[N-1]. `nonCombatDays` is captured
   * for future benefits but does NOT feed the current combat-only credit.
   */
  reserveDaysByYear?: Record<string, { combatDays: number; nonCombatDays?: number }>;
  /** @deprecated Legacy single-year combat days — superseded by reserveDaysByYear.
   * Read only as a fallback when reserveDaysByYear has no entry for the year. */
  combatReserveDays?: number | null;
  /** List of children for credit point calculations */
  children: { birthYear: number }[];
}

/**
 * Document kinds (beta, CEO plan §3.3):
 * - "tax-invoice-receipt" (305) / "receipt" (320) — payment-received tax docs.
 * - "business-account" (חשבון עסקה) — a payment demand; NOT a tax document.
 * - "quote" (הצעת מחיר) — a non-binding offer; NOT a tax document.
 * Only the first two count as revenue (payment actually received).
 */
export type InvoiceDocType =
  | "tax-invoice-receipt"
  | "receipt"
  | "business-account"
  | "quote";

/** Stored document status. "overdue"/"expired" are DERIVED at render time
 *  (from dueDate/validUntil) — never stored, so no cron is needed. */
export type DocStatus = "sent" | "paid";

export interface InvoiceLine {
  invoiceNumber: string;       // e.g. "2024-0042" (Q-/BA- prefixes for quote/business-account)
  date: string;                // ISO date
  customerName: string;
  customerTaxId?: string;      // teudat zehut or company number
  description: string;
  amount: number;              // before VAT
  vat: number;                 // 0 for עוסק פטור
  total: number;               // amount + vat
  category?: string;           // e.g. "ייעוץ", "עיצוב"
  /** Doc kind — "tax-invoice-receipt" (305, default) or "receipt" (320),
   *  plus the non-tax docs "business-account" / "quote" (beta 2026-07). */
  docType?: InvoiceDocType;
  /** "paid" for payment-received docs (receipts); "sent" for open
   *  business-accounts/quotes. Absent on legacy rows ⇒ treated as "paid". */
  status?: DocStatus;
  /** business-account only: payment due date (user-chosen, no default —
   *  Yoni 19/07). When past and status!=="paid", the doc renders as overdue. */
  dueDate?: string;
  /** quote only: offer validity end date. Past ⇒ renders as expired. */
  validUntil?: string;
  /** Set when the user marks a business-account as paid. */
  paidDate?: string;
  /** Conversion chain link (quote → business-account → receipt). */
  relatedDocNumber?: string;
  /** Reminder log for "מי לא שילם לי" (wa.me/mailto sends). */
  remindersSent?: { date: string; tone: "gentle" | "matter" | "assertive" }[];
}

export type ExpenseCurrency = "ILS" | "USD" | "EUR";

export interface ExpenseLine {
  date: string;                // ISO date
  vendorName: string;
  description: string;
  amount: number;              // total paid (incl. VAT for patur, ex VAT for morshe)
  vat?: number;
  category: string;            // matches business-expenses/profiles.ts category names
  receiptPath?: string;
  deductionRule: "full" | "partial" | "depreciation";
  /**
   * For "partial" — the % of `amount` that is deductible. For "depreciation" —
   * the annual depreciation rate (%) applied THIS year, so that a uniform
   * "recognized amount = amount * (partialPercent ?? 0) / 100" formula covers
   * both rules (see lib/expense-upload/index.ts `recognizedFraction`).
   * Absent on a depreciation row ⇒ treated as 0% recognized this year (safe
   * default — never silently assumes a rate that wasn't sourced from the
   * expense-engine or entered by the user).
   */
  partialPercent?: number;

  /* ── Beta 2026-08-11 additions (docs/specs/beta/artifacts/02-expense-upload-spec.md) ──
     All optional/backward-compatible — no migration needed, existing rows are
     valid without them. */

  /** Invoice/receipt/document number — required going forward by the /expenses
   *  upload flow (spec §3.5), but optional on the type since older rows (e.g.
   *  from /setup's Excel import) don't have one. */
  documentNumber?: string;
  /** Free text: "מה זה שימש בעסק?" — dynamically required for ambiguous
   *  categories (spec §3.8-א). */
  businessPurpose?: string;
  /** Currency of the original receipt. Absent/"ILS" ⇒ no foreign-currency
   *  handling applies and `amount` is already the ILS figure. */
  currency?: ExpenseCurrency;
  /** Amount in the original (foreign) currency, before ILS conversion. Equal
   *  to `amount` for ILS rows. */
  originalAmount?: number;
  /** Conversion factor applied to reach `amount` from `originalAmount` — 1 for
   *  ILS rows. Sourced from the DEMO_RATES stopgap (spec §3.7), not a live
   *  Bank-of-Israel rate. */
  exchangeRate?: number;
  /** True when this record's OCR confidence at capture time was below the
   *  review threshold (or a required field had to be filled in fully by
   *  hand) — informational flag for the summary page's needs-review filter,
   *  never blocks save and never implies the saved data itself is incomplete
   *  (blocking validation already guarantees completeness). */
  needsReview?: boolean;
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
  /**
   * Optional link into the expense-engine dataset (lib/expense-engine) —
   * a Profession.id ("P001".."P113") the user picked manually on
   * /business-expenses, overriding the free-text primaryOccupation match
   * (matchProfession). jsonb column in Supabase; no migration needed.
   */
  professionId?: string;
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

/* ──────────────────────────────────────────────────────────────────────────
 * Onboarding journey (beta, docs/specs/beta/onboarding.md) — the lite
 * ≤3-minute /onboarding questionnaire that replaced /setup as the entry
 * point. Entirely optional/additive: a Persona with no `journey` field is a
 * pre-onboarding-era persona (founders' own personas, personas/dana-cohen.json)
 * and is treated as a fully-experienced, filing-ready user — see getJourney().
 * ────────────────────────────────────────────────────────────────────────── */

export type JourneyTier = "pre" | "first-year" | "experienced";
export type IncomeBand = "0-5k" | "5-10k" | "10-20k" | "20k-plus" | "irregular";
export type TriState = "yes" | "no" | "unsure";

/** Tri-state answers to the authorities-filing filter (tier === "pre" only). */
export interface PersonaJourneyAuthorities {
  masHachnasa: TriState;
  maam: TriState;
  bituachLeumi: TriState;
}

export interface PersonaJourney {
  tier: JourneyTier;
  /** Monthly-revenue range — copy-context for the dashboard's empty states
   *  ONLY. Never a calculator input (see the no-fabrication note on
   *  buildLitePersona in lib/onboarding/build-lite-persona.ts). */
  incomeBand: IncomeBand | null;
  /** Authorities-filing filter answers — collected only when tier === "pre". */
  authorities?: PersonaJourneyAuthorities;
  /**
   * "lite-v1" = came through the real /onboarding flow. "legacy" is used only
   * by getJourney()'s in-memory fallback for a persona with no `journey` at
   * all — never written to a real persona, so it never round-trips through
   * persistPersona/Supabase.
   */
  onboardingVersion: "lite-v1" | "legacy";
  onboardingCompletedAt: string; // ISO
  /** Whether the deferred /setup flow ("השלמת פרטים לדוח") has been completed. */
  filingDetailsCompleted: boolean;
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
  invoiceCounter?: number;   // next invoice number to use (legacy shared series
                             // for tax-invoice-receipt + receipt — kept for
                             // numbering continuity; series split pending Roy)
  /** Separate numbering sequences for the non-tax docs (quotes must never
   *  consume the invoice sequence). Key absent ⇒ next number is 1. */
  docCounters?: Partial<Record<"business-account" | "quote", number>>;
  /** Onboarding journey metadata (beta). Optional — see the doc comment above. */
  journey?: PersonaJourney;
}

/**
 * Read a persona's journey, with a legacy fallback for any persona created
 * before the /onboarding flow existed (founders' own personas,
 * personas/dana-cohen.json, any pre-beta signup): treated as a fully
 * experienced user who has already completed the filing-details flow, so
 * such users never see onboarding nudges or get gated out of /file.
 *
 * The returned fallback object is synthesized in memory only — it is never
 * written back to the persona (onboardingCompletedAt "" is a deliberate
 * "unknown, predates tracking" marker, not a real timestamp).
 */
export function getJourney(persona: Persona): PersonaJourney {
  if (persona.journey) return persona.journey;
  return {
    tier: "experienced",
    incomeBand: null,
    onboardingVersion: "legacy",
    onboardingCompletedAt: "",
    filingDetailsCompleted: true,
  };
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
