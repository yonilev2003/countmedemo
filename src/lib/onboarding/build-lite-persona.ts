/**
 * Factory for the Persona produced by the lite /onboarding questionnaire
 * (beta, docs/specs/beta/onboarding.md §1, ONB-2).
 *
 * NO-FABRICATION PRINCIPLE (a direct extension of "the engine is
 * deterministic — we never invent numbers", the same rule that removed the
 * 12%-of-net Bituach-Leumi fallback from /setup's buildPersona): the lite
 * onboarding flow never asks for exact financial figures, so it must never
 * write any. Every number the calculators can read — revenue, expenses,
 * Bituach Leumi paid, keren hishtalmut, pension, donations — is written as
 * literal 0 here, with NO derived/estimated fallback of any kind.
 * `journey.incomeBand` is the ONLY financial signal onboarding collects, and
 * it is copy-context for the dashboard's empty states only (see the doc
 * comment on PersonaJourney in lib/persona.ts) — nothing in this file reads
 * it to compute a number.
 *
 * Identity fields the flow doesn't ask (teudatZehut, birthDate, bank...) get
 * documented inert defaults, filled in later by the deferred /setup flow
 * ("השלמת פרטים לדוח"). Pages that need real filing data gate on
 * `getJourney(persona).filingDetailsCompleted` (ONB-11), not on these
 * defaults looking populated.
 */

import type {
  IncomeBand,
  JourneyTier,
  OsekType,
  Persona,
  PersonaJourneyAuthorities,
} from "@/lib/persona";

/**
 * Default filing year for a freshly onboarded persona. Onboarding never asks
 * about tax year (that's a /setup-only question, deferred) — this mirrors
 * /setup's own current default (src/app/setup/page.tsx `selectedYear`
 * initial state), so a lite persona and a full-wizard persona start on the
 * same year until the user changes it in /setup.
 */
export const LITE_PERSONA_FILING_YEAR = 2025;

export interface OnboardingAnswers {
  firstName: string;
  lastName: string;
  /** Display occupation string — a Profession.nameHe from the expense-engine
   *  dataset, or the user's own free text when nothing matched. */
  occupation: string;
  /** Set only when `occupation` was picked from the expense-engine dataset
   *  (lib/expense-engine) rather than typed as free text. */
  professionId?: string;
  tier: JourneyTier;
  /** Collected only when tier === "pre" (screen 3a). */
  authorities?: PersonaJourneyAuthorities;
  osekType: OsekType;
  isOsekZeir: boolean;
  /** Range, never an amount — see the no-fabrication note above. */
  incomeBand: IncomeBand | null;
  /** Falls back to the full name when the user skips the business-name screen. */
  tradeName: string;
}

/**
 * Build a Persona from the onboarding answers.
 *
 * `existing` (optional): a persona already present locally/in the DB for
 * this user — e.g. an anonymous cache adopted right before login, or a user
 * re-running onboarding. When present, transactional data (invoices,
 * expenses, monthly series, numbering counters, capital declaration) is
 * carried over verbatim, mirroring the same defensive merge /setup's own
 * buildPersona() uses (src/app/setup/page.tsx) — onboarding must never
 * destroy real documents a user already created.
 */
export function buildLitePersona(
  answers: OnboardingAnswers,
  existing?: Persona | null,
): Persona {
  const displayName = `${answers.firstName} ${answers.lastName}`.trim();
  const tradeName = answers.tradeName.trim() || displayName;
  // עוסק זעיר is only a valid state on top of עוסק פטור — guard defensively
  // even though the UI never offers it under מורשה (mirrors setup's own guard).
  const isOsekZeir = answers.isOsekZeir && answers.osekType === "patur";

  return {
    id: existing?.id ?? "user-" + Date.now(),
    displayName,
    personal: {
      firstName: answers.firstName,
      lastName: answers.lastName,
      fatherName: null,
      // Inert defaults — never fed to a calculator before /setup is completed.
      teudatZehut: existing?.personal?.teudatZehut ?? "",
      birthDate: existing?.personal?.birthDate ?? "",
      gender: existing?.personal?.gender ?? "female",
      maritalStatus: existing?.personal?.maritalStatus ?? "single",
      spouse: existing?.personal?.spouse ?? null,
      isNewResident: existing?.personal?.isNewResident ?? false,
      isReturningResident: existing?.personal?.isReturningResident ?? false,
      isEilatResident: existing?.personal?.isEilatResident ?? false,
      isSoldierDischarged: existing?.personal?.isSoldierDischarged ?? false,
      soldierDischargeDate: existing?.personal?.soldierDischargeDate ?? null,
      soldierServiceMonths: existing?.personal?.soldierServiceMonths ?? null,
      academicDegreeYear: existing?.personal?.academicDegreeYear ?? null,
      aliyahDate: existing?.personal?.aliyahDate ?? null,
      reserveDaysByYear: existing?.personal?.reserveDaysByYear,
      combatReserveDays: existing?.personal?.combatReserveDays ?? null,
      children: existing?.personal?.children ?? [],
    },
    contact: existing?.contact ?? {
      mailingAddress: { street: "", houseNumber: "", city: "", zipCode: "" },
      residenceSameAsMailing: true,
      email: "",
      phoneMobile: "",
      phoneWork: null,
      phoneHome: null,
      consentDigitalNotices: false,
    },
    business: {
      tradeName,
      primaryOccupation: answers.occupation,
      osekType: answers.osekType,
      osekFileNumber: existing?.business?.osekFileNumber ?? "",
      osekStartDate: existing?.business?.osekStartDate ?? "",
      address: existing?.business?.address ?? {
        sameAsResidence: true,
        street: null,
        houseNumber: null,
        city: null,
        zipCode: null,
      },
      bookkeepingMethod: existing?.business?.bookkeepingMethod ?? "single-entry",
      bookkeepingType: existing?.business?.bookkeepingType ?? "computerized",
      isSmallBusiness: true, // revenue is always 0 at this point — trivially true
      isOsekZeir,
      hasEmployees: existing?.business?.hasEmployees ?? false,
      employerNames: existing?.business?.employerNames ?? [],
      ...(answers.professionId ? { professionId: answers.professionId } : {}),
    },
    bank: existing?.bank ?? {
      bankCode: "",
      bankName: "",
      branchCode: "",
      accountNumber: "",
      accountOwnerName: displayName,
    },
    income: {
      year: existing?.income?.year ?? LITE_PERSONA_FILING_YEAR,
      // No-fabrication: literal 0, no fallback of any kind.
      totalRevenue: 0,
      totalDeductibleExpenses: 0,
      netIncome: 0,
      invoiceCount: existing?.income?.invoices?.length ?? 0,
      expenseCount: existing?.income?.expenses?.length ?? 0,
      mikdamot: 0,
      invoices: existing?.income?.invoices ?? [],
      expenses: existing?.income?.expenses ?? [],
      financialInstitutionsIncome: 0,
      taxWithheldAtSource: 0,
      monthlyBreakdown: existing?.income?.monthlyBreakdown ?? [],
    },
    deductionsAndCredits: {
      kerenHishtalmut: { annualContribution: 0 },
      kupatGemel: { annualContribution: 0 },
      pensionContributions: { annualContribution: 0 },
      // No 12%-of-net (or any other) estimate — only what the user actually
      // enters later in /setup.
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
    journey: {
      tier: answers.tier,
      incomeBand: answers.incomeBand,
      ...(answers.tier === "pre" && answers.authorities
        ? { authorities: answers.authorities }
        : {}),
      onboardingVersion: "lite-v1",
      onboardingCompletedAt: new Date().toISOString(),
      filingDetailsCompleted: false,
    },
    ...(existing?.invoiceCounter !== undefined
      ? { invoiceCounter: existing.invoiceCounter }
      : {}),
    ...(existing?.docCounters ? { docCounters: existing.docCounters } : {}),
    ...(existing?.capitalDeclaration
      ? { capitalDeclaration: existing.capitalDeclaration }
      : {}),
  };
}
