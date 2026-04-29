import danaCohen from "../../personas/dana-cohen.json";

export type MaritalStatus =
  | "single"
  | "married"
  | "divorced"
  | "widowed"
  | "separated";

export type OsekType = "patur" | "morshe" | "company";

export interface PersonaPersonal {
  firstName: string;
  lastName: string;
  fatherName: string | null;
  teudatZehut: string;
  birthDate: string;
  maritalStatus: MaritalStatus;
  spouse: unknown | null;
  isNewResident: boolean;
  isReturningResident: boolean;
  isEilatResident: boolean;
  isSoldierDischarged: boolean;
  soldierDischargeDate: string | null;
  academicDegreeYear: number | null;
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
  monthlyBreakdown: { month: string; revenue: number; expenses: number }[];
}

export interface PersonaDeductions {
  kerenHishtalmut: { annualContribution: number };
  kupatGemel: { annualContribution: number };
  bituachLeumiSelfEmployed: { annualPaid: number };
  bituachLifeOrCancerPolicy: number;
  donations: { currentYear: number; carriedFromPriorYears: number };
  academicDegreeCredit: boolean;
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
