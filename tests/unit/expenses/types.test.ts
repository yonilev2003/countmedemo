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

  it("needs_review when every required field is missing", () => {
    // emptyExpenseDraft pre-fills `date` with today (a sensible default, not
    // an extracted value) — clear it too so this exercises the "nothing at
    // all was extracted" case the status is actually meant to catch.
    const empty = { ...emptyExpenseDraft("manual"), date: "" };
    expect(missingRequiredFields(empty)).toEqual([...REQUIRED_EXPENSE_FIELDS]);
    expect(computeExpenseStatus(empty)).toBe("needs_review");
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
