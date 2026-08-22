/**
 * Golden tests — the "מה אתה היום, או רוצה להיות?" onboarding classifier
 * (Tomi's onboarding notes, 2026-08-22, item 3). The legal invariant this
 * protects: hasVatCollectionDuty must track osekType ALONE — a
 * morshe-זעיר result still owes VAT (see the module doc comment in
 * src/lib/onboarding/osek-classifier.ts and the MURSHE-ZEIR note in
 * lib/alerts/ceiling.ts).
 */

import { describe, expect, it } from "vitest";
import { classifyOsek, isMandatoryOsekMorsheProfession } from "@/lib/onboarding/osek-classifier";

describe("isMandatoryOsekMorsheProfession", () => {
  it("flags a profession tagged mandatory-morshe in the regulatory dataset", () => {
    expect(isMandatoryOsekMorsheProfession("עורך דין")).toBe(true);
    expect(isMandatoryOsekMorsheProfession("רואה חשבון")).toBe(true);
  });
  it("does not flag an untagged/unmatched profession", () => {
    expect(isMandatoryOsekMorsheProfession("מעצבת גרפית")).toBe(false);
    expect(isMandatoryOsekMorsheProfession("")).toBe(false);
  });
});

describe("classifyOsek — under ceiling, ordinary profession", () => {
  it("returns patur, no VAT duty, zeir suggested when expenses are low", () => {
    const r = classifyOsek({
      occupationText: "מעצבת גרפית",
      projectedTurnover: 80_000,
      expensePercent: 10,
      year: 2025,
    });
    expect(r.osekType).toBe("patur");
    expect(r.hasVatCollectionDuty).toBe(false);
    expect(r.isOsekZeirSuggested).toBe(true);
    expect(r.mandatoryMorsheReason).toBe(false);
  });

  it("does not suggest zeir when real expenses exceed the zeir cap", () => {
    const r = classifyOsek({
      occupationText: "מעצבת גרפית",
      projectedTurnover: 80_000,
      expensePercent: 50,
      year: 2025,
    });
    expect(r.osekType).toBe("patur");
    expect(r.isOsekZeirSuggested).toBe(false);
  });
});

describe("classifyOsek — unanswered expense % must never bias toward zeir", () => {
  it("does not suggest zeir when expensePercent is omitted (not the same as 0%)", () => {
    const r = classifyOsek({
      occupationText: "מעצבת גרפית",
      projectedTurnover: 80_000,
      // expensePercent omitted entirely
      year: 2025,
    });
    expect(r.isOsekZeirSuggested).toBe(false);
  });

  it("omitted and explicit 0% must NOT produce the same suggestion", () => {
    const omitted = classifyOsek({
      occupationText: "מעצבת גרפית",
      projectedTurnover: 80_000,
      year: 2025,
    });
    const zero = classifyOsek({
      occupationText: "מעצבת גרפית",
      projectedTurnover: 80_000,
      expensePercent: 0,
      year: 2025,
    });
    expect(omitted.isOsekZeirSuggested).toBe(false);
    expect(zero.isOsekZeirSuggested).toBe(true);
  });
});

describe("isMandatoryOsekMorsheProfession — common formal abbreviations", () => {
  it("recognizes עו״ד and רו״ח abbreviations, not just spelled-out names", () => {
    expect(isMandatoryOsekMorsheProfession('עו"ד')).toBe(true);
    expect(isMandatoryOsekMorsheProfession("עו״ד")).toBe(true);
    expect(isMandatoryOsekMorsheProfession('רו"ח')).toBe(true);
  });
});

describe("classifyOsek — over ceiling", () => {
  it("returns morshe with VAT duty, and never suggests zeir over the ceiling", () => {
    const r = classifyOsek({
      occupationText: "מעצבת גרפית",
      projectedTurnover: 200_000,
      expensePercent: 10,
      year: 2025,
    });
    expect(r.osekType).toBe("morshe");
    expect(r.hasVatCollectionDuty).toBe(true);
    expect(r.overCeiling).toBe(true);
    expect(r.isOsekZeirSuggested).toBe(false);
  });

  it("reads the year-keyed threshold, not a hardcoded one (2026 = 122,833)", () => {
    const r2025 = classifyOsek({ occupationText: "", projectedTurnover: 121_000, expensePercent: 0, year: 2025 });
    const r2026 = classifyOsek({ occupationText: "", projectedTurnover: 121_000, expensePercent: 0, year: 2026 });
    expect(r2025.osekType).toBe("morshe"); // over 2025's 120,000 ceiling
    expect(r2026.osekType).toBe("patur"); // under 2026's 122,833 ceiling
    expect(r2026.threshold).toBe(122_833);
  });
});

describe("classifyOsek — mandatory-morshe profession, MURSHE-ZEIR precision", () => {
  it("forces morshe even under the ceiling, and can still suggest zeir on top", () => {
    const r = classifyOsek({
      occupationText: "עורך דין",
      projectedTurnover: 60_000,
      expensePercent: 5,
      year: 2025,
    });
    expect(r.mandatoryMorsheReason).toBe(true);
    expect(r.osekType).toBe("morshe");
    // The legal invariant this whole module exists to protect: VAT duty
    // tracks osekType, NOT the zeir suggestion — a morshe-זעיר still owes VAT.
    expect(r.hasVatCollectionDuty).toBe(true);
    expect(r.isOsekZeirSuggested).toBe(true);
  });
});
