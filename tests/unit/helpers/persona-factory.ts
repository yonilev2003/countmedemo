/**
 * Test-persona factory for the golden-test suite.
 *
 * Builds a minimal-but-complete Persona so every calculator can run. Defaults
 * are deliberately "neutral": male, no children, no credits, no deductions —
 * each test overrides exactly what it exercises, so expected values stay
 * readable next to the inputs that produce them.
 */

import type { Persona } from "@/lib/persona";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export function makePersona(overrides: DeepPartial<Persona> = {}): Persona {
  const base: Persona = {
    id: "test-persona",
    displayName: "בדיקה",
    personal: {
      firstName: "טל",
      lastName: "בדיקה",
      fatherName: null,
      teudatZehut: "000000000",
      birthDate: "1990-01-01",
      gender: "male",
      maritalStatus: "single",
      spouse: null,
      isNewResident: false,
      isReturningResident: false,
      isEilatResident: false,
      isSoldierDischarged: false,
      soldierDischargeDate: null,
      soldierServiceMonths: null,
      academicDegreeYear: null,
      aliyahDate: null,
      reserveDaysByYear: {},
      combatReserveDays: null,
      children: [],
    },
    contact: {
      mailingAddress: {
        street: "",
        houseNumber: "",
        city: "",
        zipCode: "",
      },
      residenceSameAsMailing: true,
      email: "test@example.com",
      phoneMobile: "",
      phoneWork: null,
      phoneHome: null,
      consentDigitalNotices: false,
    },
    business: {
      tradeName: "עסק בדיקה",
      primaryOccupation: "ייעוץ",
      osekType: "patur",
      osekFileNumber: "000000000",
      osekStartDate: "2020-01-01",
      address: {
        sameAsResidence: true,
        street: null,
        houseNumber: null,
        city: null,
        zipCode: null,
      },
      bookkeepingMethod: "single-entry",
      bookkeepingType: "computerized",
      isSmallBusiness: false,
      isOsekZeir: false,
      hasEmployees: false,
      employerNames: [],
    },
    bank: {
      bankCode: "10",
      bankName: "בדיקה",
      branchCode: "001",
      accountNumber: "000000",
      accountOwnerName: "טל בדיקה",
    },
    income: {
      year: 2025,
      totalRevenue: 0,
      totalDeductibleExpenses: 0,
      netIncome: 0,
      invoiceCount: 0,
      expenseCount: 0,
      mikdamot: 0,
      financialInstitutionsIncome: 0,
      taxWithheldAtSource: 0,
      monthlyBreakdown: [],
    },
    deductionsAndCredits: {
      kerenHishtalmut: { annualContribution: 0 },
      kupatGemel: { annualContribution: 0 },
      pensionContributions: { annualContribution: 0 },
      bituachLeumiSelfEmployed: { annualPaid: 0 },
      bituachLifeOrCancerPolicy: 0,
      lifeInsurancePremium: 0,
      donations: { currentYear: 0, carriedFromPriorYears: 0 },
      academicDegreeCredit: false,
      lossOfWorkCapacityPremium: 0,
    },
    vatAndTurnover: {
      annualTurnoverWithoutVat: 0,
      isAbove6111Threshold: false,
    },
  };

  return deepMerge(base, overrides) as Persona;
}

function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  const out = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    const current = out[key];
    if (
      value &&
      current &&
      typeof value === "object" &&
      typeof current === "object" &&
      !Array.isArray(value) &&
      !Array.isArray(current)
    ) {
      out[key] = deepMerge(current, value as DeepPartial<typeof current>);
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as T;
}
