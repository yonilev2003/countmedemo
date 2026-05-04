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
  bituachLeumiSelfEmployed: { annualPaid: number };
  bituachLifeOrCancerPolicy: number;
  /** Section 72 — life insurance premium */
  lifeInsurancePremium: number;
  donations: { currentYear: number; carriedFromPriorYears: number };
  academicDegreeCredit: boolean;
  lossOfWorkCapacityPremium?: number;     // for field 112 (אובדן כושר עבודה)
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
  invoiceCounter?: number;   // next invoice number to use
}

/** Default persona for the demo. Replace by editing personas/dana-cohen.json. */
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
