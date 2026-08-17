/**
 * Expense Object helpers — VAT is always derived (never naive total×rate),
 * status reflects required-field completeness, foreign-currency expenses
 * never carry VAT (import VAT is a documented future exception).
 */

import { describe, expect, it } from "vitest";
import {
  deriveVat,
  computeExpenseStatus,
  missingRequiredFields,
  emptyExpenseDraft,
  draftToExpenseLine,
  validateAmount,
  AMBIGUOUS_CATEGORY_IDS,
  REQUIRED_EXPENSE_FIELDS,
} from "@/lib/expenses/types";

describe("deriveVat", () => {
  it("derives VAT as total × rate/(1+rate), not total × rate", () => {
    // 1180 ILS gross at 18% VAT → net 1000, VAT 180 (NOT 1180*0.18=212.4)
    expect(deriveVat(1180, false, 0.18)).toBeCloseTo(180, 1);
  });
  it("is 0 for a foreign-currency expense regardless of amount", () => {
    expect(deriveVat(1000, true, 0.18)).toBe(0);
  });
  it("is 0 for a non-positive amount", () => {
    expect(deriveVat(0, false, 0.18)).toBe(0);
    expect(deriveVat(-50, false, 0.18)).toBe(0);
  });
});

describe("computeExpenseStatus / missingRequiredFields", () => {
  const full = { ...emptyExpenseDraft("manual"), vendorName: "ספק", docNumber: "123", amount: "100", categoryId: "equipment" };

  it("full when every required field is present", () => {
    expect(missingRequiredFields(full)).toEqual([]);
    expect(computeExpenseStatus(full)).toBe("full");
  });

  it("partial when some but not all required fields are present", () => {
    const draft = { ...full, docNumber: "" };
    expect(missingRequiredFields(draft)).toEqual(["docNumber"]);
    expect(computeExpenseStatus(draft)).toBe("partial");
  });

  it("needs_review when every required field is missing, regardless of source (nothing at all was entered/extracted)", () => {
    // emptyExpenseDraft pre-fills `date` with today (a sensible default, not
    // an extracted value) — clear it too so this exercises "nothing at all
    // entered/extracted".
    const empty = { ...emptyExpenseDraft("manual"), date: "" };
    expect(missingRequiredFields(empty)).toEqual([...REQUIRED_EXPENSE_FIELDS]);
    expect(computeExpenseStatus(empty)).toBe("needs_review");
  });

  it("stays partial for a manual draft missing only SOME fields — a normal in-progress fill, not a bad auto-extraction", () => {
    const oneGap = { ...full, docNumber: "" };
    expect(missingRequiredFields(oneGap)).toEqual(["docNumber"]);
    expect(computeExpenseStatus(oneGap)).toBe("partial");
  });

  it("needs_review for an OCR/voice-sourced draft missing SOME (not all) required fields — spec §1: confidence gating left a gap, which is a review case, not a normal in-progress fill", () => {
    const oneGap = { ...full, source: "voice" as const, docNumber: "" };
    expect(missingRequiredFields(oneGap)).toEqual(["docNumber"]);
    expect(computeExpenseStatus(oneGap)).toBe("needs_review");
  });
});

describe("validateAmount (spec §6 — amount must be > 0)", () => {
  it("allows empty (that's missingRequiredFields' concern, not this one)", () => {
    expect(validateAmount("")).toBeNull();
    expect(validateAmount("   ")).toBeNull();
  });

  it("allows a normal positive amount", () => {
    expect(validateAmount("100")).toBeNull();
    expect(validateAmount("0.5")).toBeNull();
  });

  it("blocks the string \"0\" with a clear message — passes the truthiness check missingRequiredFields uses, so this closes that specific gap", () => {
    const err = validateAmount("0");
    expect(err).not.toBeNull();
    expect(err).toContain("0");
  });

  it("blocks a negative amount with a credit/refund-not-supported message", () => {
    const err = validateAmount("-50");
    expect(err).not.toBeNull();
    expect(err).toMatch(/זיכוי|החזר/);
  });
});

describe("AMBIGUOUS_CATEGORY_IDS / businessPurpose requirement (spec §7)", () => {
  const base = { ...emptyExpenseDraft("manual"), vendorName: "ספק", docNumber: "123", amount: "100" };

  it("does not require businessPurpose for a non-ambiguous category", () => {
    const draft = { ...base, categoryId: "equipment" };
    expect(AMBIGUOUS_CATEGORY_IDS.has("equipment")).toBe(false);
    expect(missingRequiredFields(draft)).toEqual([]);
  });

  it("requires businessPurpose when the category is in AMBIGUOUS_CATEGORY_IDS", () => {
    for (const categoryId of AMBIGUOUS_CATEGORY_IDS) {
      const draft = { ...base, categoryId, businessPurpose: "" };
      expect(missingRequiredFields(draft)).toContain("businessPurpose");
      expect(computeExpenseStatus(draft)).not.toBe("full");
    }
  });

  it("is satisfied once businessPurpose is filled in for an ambiguous category", () => {
    const draft = { ...base, categoryId: "hospitality", businessPurpose: "ארוחת עבודה עם לקוח" };
    expect(missingRequiredFields(draft)).toEqual([]);
    expect(computeExpenseStatus(draft)).toBe("full");
  });
});

describe("draftToExpenseLine", () => {
  it("carries status, source and derived VAT onto the persisted line", () => {
    const draft = {
      ...emptyExpenseDraft("camera"),
      vendorName: "ספק",
      docNumber: "42",
      amount: "1180",
      categoryId: "equipment",
      category: "ציוד",
    };
    const line = draftToExpenseLine(draft, { vatRate: 0.18, deductionRule: "full" });
    expect(line.status).toBe("full");
    expect(line.source).toBe("camera");
    expect(line.vat).toBeCloseTo(180, 1);
    expect(line.amount).toBe(1180);
  });

  it("omits originalAmount/currency/exchangeRate for a non-foreign expense", () => {
    const draft = { ...emptyExpenseDraft("manual"), amount: "500" };
    const line = draftToExpenseLine(draft, { vatRate: 0.18, deductionRule: "full" });
    expect(line.originalAmount).toBeUndefined();
    expect(line.originalCurrency).toBeUndefined();
    expect(line.exchangeRate).toBeUndefined();
  });
});
