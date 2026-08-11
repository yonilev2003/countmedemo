/**
 * buildLitePersona() — no-fabrication contract + existing-data preservation
 * (ONB-2 DoD).
 *
 * "Mirrors userTypeFromPersona in lib/data/persona-repository.ts" — kept in
 * sync manually (same convention as tests/unit/documents/setup-preserves-data
 * .test.ts's mergeLikeWizard). persona-repository.ts is a browser-only module
 * (imports @supabase/ssr's createBrowserClient), so it is not imported
 * directly from this node-environment test suite.
 */

import { describe, it, expect } from "vitest";
import type { Persona } from "@/lib/persona";
import {
  buildLitePersona,
  LITE_PERSONA_FILING_YEAR,
  type OnboardingAnswers,
} from "@/lib/onboarding/build-lite-persona";
import { makePersona } from "../helpers/persona-factory";

function userTypeFromPersona(persona: Persona): "zaair" | "patur" | "murshe" {
  if (persona.business?.isOsekZeir) return "zaair";
  return persona.business?.osekType === "morshe" ? "murshe" : "patur";
}

const BASE_ANSWERS: OnboardingAnswers = {
  firstName: "דנה",
  lastName: "כהן",
  occupation: "מעצבת גרפית",
  professionId: "P035",
  tier: "first-year",
  osekType: "patur",
  isOsekZeir: false,
  incomeBand: "5-10k",
  tradeName: "",
};

describe("buildLitePersona — no-fabrication principle", () => {
  const persona = buildLitePersona(BASE_ANSWERS);

  it("writes literal 0 for every calculator-facing number — no estimate of any kind", () => {
    expect(persona.income.totalRevenue).toBe(0);
    expect(persona.income.totalDeductibleExpenses).toBe(0);
    expect(persona.income.netIncome).toBe(0);
    expect(persona.income.mikdamot).toBe(0);
    expect(persona.income.financialInstitutionsIncome).toBe(0);
    expect(persona.income.taxWithheldAtSource).toBe(0);
    expect(persona.deductionsAndCredits.bituachLeumiSelfEmployed.annualPaid).toBe(0);
    expect(persona.deductionsAndCredits.kerenHishtalmut.annualContribution).toBe(0);
    expect(persona.deductionsAndCredits.pensionContributions.annualContribution).toBe(0);
    expect(persona.deductionsAndCredits.donations.currentYear).toBe(0);
    expect(persona.vatAndTurnover.annualTurnoverWithoutVat).toBe(0);
    expect(persona.vatAndTurnover.isAbove6111Threshold).toBe(false);
  });

  it("specifically: no 12%-of-net Bituach Leumi fallback, regardless of income band", () => {
    // Even with a high income band selected, the B"L figure must stay 0 —
    // incomeBand is copy-context only, never a calculator input.
    const highIncome = buildLitePersona({ ...BASE_ANSWERS, incomeBand: "20k-plus" });
    expect(highIncome.deductionsAndCredits.bituachLeumiSelfEmployed.annualPaid).toBe(0);
  });

  it("stamps journey.incomeBand for copy purposes but it never leaks into income.*", () => {
    expect(persona.journey?.incomeBand).toBe("5-10k");
    expect(persona.income.totalRevenue).toBe(0);
  });

  it("writes documented inert identity defaults, not fabricated ones", () => {
    expect(persona.personal.teudatZehut).toBe("");
    expect(persona.personal.birthDate).toBe("");
    expect(persona.personal.gender).toBe("female");
    expect(persona.personal.maritalStatus).toBe("single");
    expect(persona.bank.bankCode).toBe("");
  });

  it("defaults the filing year to the documented constant", () => {
    expect(persona.income.year).toBe(LITE_PERSONA_FILING_YEAR);
  });

  it("marks filingDetailsCompleted false — /setup still owes the rest", () => {
    expect(persona.journey?.filingDetailsCompleted).toBe(false);
    expect(persona.journey?.onboardingVersion).toBe("lite-v1");
  });
});

describe("buildLitePersona — business/journey shape", () => {
  it("carries the occupation display string and professionId when picked from the dataset", () => {
    const persona = buildLitePersona(BASE_ANSWERS);
    expect(persona.business.primaryOccupation).toBe("מעצבת גרפית");
    expect(persona.business.professionId).toBe("P035");
  });

  it("omits professionId entirely for free-text occupations (never fakes a match)", () => {
    const persona = buildLitePersona({
      ...BASE_ANSWERS,
      occupation: "מקצוע שלא ברשימה",
      professionId: undefined,
    });
    expect(persona.business.primaryOccupation).toBe("מקצוע שלא ברשימה");
    expect(persona.business.professionId).toBeUndefined();
  });

  it("falls back the trade name to the full name when skipped", () => {
    const persona = buildLitePersona({ ...BASE_ANSWERS, tradeName: "" });
    expect(persona.business.tradeName).toBe("דנה כהן");
  });

  it("uses the given trade name when provided", () => {
    const persona = buildLitePersona({ ...BASE_ANSWERS, tradeName: "סטודיו דנה" });
    expect(persona.business.tradeName).toBe("סטודיו דנה");
  });

  it("collects authorities only for tier === pre", () => {
    const pre = buildLitePersona({
      ...BASE_ANSWERS,
      tier: "pre",
      authorities: { masHachnasa: "no", maam: "unsure", bituachLeumi: "no" },
    });
    expect(pre.journey?.authorities).toEqual({
      masHachnasa: "no",
      maam: "unsure",
      bituachLeumi: "no",
    });

    const experienced = buildLitePersona({
      ...BASE_ANSWERS,
      tier: "experienced",
      authorities: { masHachnasa: "yes", maam: "yes", bituachLeumi: "yes" },
    });
    expect(experienced.journey?.authorities).toBeUndefined();
  });

  it("guards isOsekZeir=true against osekType=morshe (mirrors /setup's own guard)", () => {
    const persona = buildLitePersona({
      ...BASE_ANSWERS,
      osekType: "morshe",
      isOsekZeir: true, // should never happen from the UI, but defend anyway
    });
    expect(persona.business.isOsekZeir).toBe(false);
  });
});

describe("buildLitePersona — user_type derives correctly for every osek combination", () => {
  it("zeir → zaair", () => {
    const p = buildLitePersona({ ...BASE_ANSWERS, osekType: "patur", isOsekZeir: true });
    expect(userTypeFromPersona(p)).toBe("zaair");
  });

  it("patur (not zeir) → patur", () => {
    const p = buildLitePersona({ ...BASE_ANSWERS, osekType: "patur", isOsekZeir: false });
    expect(userTypeFromPersona(p)).toBe("patur");
  });

  it("morshe → murshe", () => {
    const p = buildLitePersona({ ...BASE_ANSWERS, osekType: "morshe", isOsekZeir: false });
    expect(userTypeFromPersona(p)).toBe("murshe");
  });
});

describe("buildLitePersona — preserves existing transactional data (never destroys real documents)", () => {
  const existing: Persona = makePersona({
    id: "user-original",
    invoiceCounter: 5,
    docCounters: { quote: 1 },
    income: {
      invoices: [
        {
          invoiceNumber: "2026-0001",
          date: "2026-07-01",
          customerName: "לקוח",
          description: "שירות",
          amount: 1000,
          vat: 180,
          total: 1180,
        },
      ],
      expenses: [
        {
          date: "2026-07-02",
          vendorName: "ספק",
          description: "ציוד",
          amount: 500,
          category: "כללי",
          deductionRule: "full",
        },
      ],
      monthlyBreakdown: [{ month: "2026-07", revenue: 1180, expenses: 500 }],
    } as never,
  });

  const persona = buildLitePersona(BASE_ANSWERS, existing);

  it("keeps the persona id stable", () => {
    expect(persona.id).toBe("user-original");
  });

  it("keeps every existing document and expense", () => {
    expect(persona.income.invoices).toHaveLength(1);
    expect(persona.income.expenses).toHaveLength(1);
    expect(persona.income.invoiceCount).toBe(1);
    expect(persona.income.expenseCount).toBe(1);
  });

  it("keeps numbering counters — re-onboarding must never reuse a document number", () => {
    expect(persona.invoiceCounter).toBe(5);
    expect(persona.docCounters).toEqual({ quote: 1 });
  });

  it("a genuinely new user (no existing persona) starts with empty transactional data", () => {
    const fresh = buildLitePersona(BASE_ANSWERS, null);
    expect(fresh.income.invoices).toEqual([]);
    expect(fresh.income.expenses).toEqual([]);
    expect(fresh.invoiceCounter).toBeUndefined();
  });
});
