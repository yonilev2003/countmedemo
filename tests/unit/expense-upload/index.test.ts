/**
 * Pure-logic tests for the /expenses upload flow (lib/expense-upload).
 * Covers: currency conversion (DEMO_RATES), VAT extraction, recognition-rate
 * derivation from expense-engine formulas, blocking validation, duplicate
 * detection, aggregate recompute on save, and CSV export.
 */
import { describe, expect, it } from "vitest";
import { makePersona } from "../helpers/persona-factory";
import type { ExpenseLine } from "@/lib/persona";
import type { ExpenseEntry, RecognitionFormula } from "@/lib/expense-engine";
import {
  DEMO_RATES,
  convertToIls,
  computeVatAmount,
  deriveRuleFromEntry,
  recognizedFraction,
  recognizedAmount,
  validateDraftExpense,
  findPossibleDuplicate,
  withNewExpenseLine,
  buildExpensesCsv,
  filterExpenses,
  computeExpenseTotals,
  expenseStatus,
  isBusinessPurposeRequired,
  type DraftExpenseFields,
} from "@/lib/expense-upload";

function expenseLine(overrides: Partial<ExpenseLine> = {}): ExpenseLine {
  return {
    date: "2026-07-04",
    vendorName: "WOLT מסעדות בע\"מ",
    description: "ארוחת עסקים",
    amount: 148,
    vat: 22.58,
    category: "פגישות עבודה",
    deductionRule: "partial",
    partialPercent: 80,
    ...overrides,
  };
}

function entry(formula: RecognitionFormula, overrides: Partial<ExpenseEntry> = {}): ExpenseEntry {
  return {
    id: "EX-0001",
    nameHe: "בדיקה",
    category: "בדיקה",
    formula,
    incomeTaxFraction: null,
    vatFraction: null,
    legalSourceHe: "בדיקה",
    rateCertainty: "legal",
    eligibilityConfidence: "A",
    ...overrides,
  };
}

describe("currency conversion (DEMO_RATES)", () => {
  it("ILS is a 1:1 passthrough", () => {
    expect(convertToIls(100, "ILS")).toEqual({ ilsAmount: 100, exchangeRate: 1 });
  });

  it("converts USD/EUR using the demo rate table", () => {
    const usd = convertToIls(100, "USD");
    expect(usd.exchangeRate).toBe(DEMO_RATES.USD);
    expect(usd.ilsAmount).toBeCloseTo(100 * DEMO_RATES.USD, 2);

    const eur = convertToIls(50, "EUR");
    expect(eur.exchangeRate).toBe(DEMO_RATES.EUR);
    expect(eur.ilsAmount).toBeCloseTo(50 * DEMO_RATES.EUR, 2);
  });
});

describe("computeVatAmount", () => {
  it("extracts VAT from a VAT-inclusive ILS total using the year's official rate", () => {
    // 2026 vatRate = 0.18 per lib/calculators/types.ts
    const vat = computeVatAmount(118, "ILS", 2026);
    expect(vat).toBeCloseTo(18, 1);
  });

  it("is always 0 for foreign-currency receipts (spec §3.7)", () => {
    expect(computeVatAmount(500, "USD", 2026)).toBe(0);
    expect(computeVatAmount(500, "EUR", 2026)).toBe(0);
  });
});

describe("deriveRuleFromEntry — never invents a rate beyond the engine's own numbers", () => {
  it("no match at all ⇒ auto:false, user must pick", () => {
    expect(deriveRuleFromEntry(null)).toEqual({ rule: "partial", auto: false });
  });

  it("flat 100% ⇒ full, auto", () => {
    const e = entry({ kind: "flat", incomeTaxRate: 1, vatRate: 1 });
    expect(deriveRuleFromEntry(e)).toEqual({ rule: "full", auto: true });
  });

  it("flat 80% ⇒ partial 80, auto", () => {
    const e = entry({ kind: "flat", incomeTaxRate: 0.8, vatRate: 0.66 });
    expect(deriveRuleFromEntry(e)).toEqual({ rule: "partial", partialPercent: 80, auto: true });
  });

  it("flat with null incomeTaxRate ⇒ not auto-derivable", () => {
    const e = entry({ kind: "flat", incomeTaxRate: null, vatRate: null });
    expect(deriveRuleFromEntry(e).auto).toBe(false);
  });

  it("depreciation ⇒ rule depreciation, percent = annualRate*100, auto", () => {
    const e = entry({ kind: "depreciation", annualRate: 0.2, vatRate: 1 });
    expect(deriveRuleFromEntry(e)).toEqual({ rule: "depreciation", partialPercent: 20, auto: true });
  });

  it("non-deductible ⇒ partial 0%, auto", () => {
    const e = entry({ kind: "non-deductible" });
    expect(deriveRuleFromEntry(e)).toEqual({ rule: "partial", partialPercent: 0, auto: true });
  });

  it("vehicle-max / reduce-min-cap / custom are NOT flat percentages ⇒ auto:false", () => {
    expect(deriveRuleFromEntry(entry({ kind: "vehicle-max", floorRate: 0.45, vatRate: 0.66 })).auto).toBe(false);
    expect(
      deriveRuleFromEntry(entry({ kind: "reduce-min-cap", capNis: 1000, rate: 0.5, vatRate: null })).auto,
    ).toBe(false);
    expect(
      deriveRuleFromEntry(entry({ kind: "custom", formulaTextHe: "ראו תנאי", vatRate: null })).auto,
    ).toBe(false);
  });
});

describe("recognizedFraction / recognizedAmount", () => {
  it("full ⇒ 100% recognized regardless of partialPercent", () => {
    expect(recognizedFraction({ deductionRule: "full", partialPercent: 50 })).toBe(1);
    expect(recognizedAmount({ amount: 200, deductionRule: "full" })).toBe(200);
  });

  it("partial ⇒ amount * partialPercent/100", () => {
    expect(recognizedAmount({ amount: 200, deductionRule: "partial", partialPercent: 80 })).toBe(160);
  });

  it("partial/depreciation with no partialPercent ⇒ 0 recognized (never guesses)", () => {
    expect(recognizedFraction({ deductionRule: "partial" })).toBe(0);
    expect(recognizedFraction({ deductionRule: "depreciation" })).toBe(0);
  });
});

describe("validateDraftExpense — blocking-validation contract (spec §3.5)", () => {
  const complete: DraftExpenseFields = {
    vendorName: "WOLT",
    documentNumber: "INV-1",
    date: "2026-07-04",
    totalAmount: 148,
    category: "ציוד",
    businessPurpose: "",
    hasRecognitionRate: true,
  };

  it("a fully-filled unambiguous-category draft is valid", () => {
    const r = validateDraftExpense(complete);
    expect(r.isValid).toBe(true);
    expect(r.missing).toEqual([]);
    expect(r.filledCount).toBe(r.requiredCount);
  });

  it("flags every missing field at once, not just the first", () => {
    const r = validateDraftExpense({
      ...complete,
      vendorName: "",
      documentNumber: "",
      totalAmount: null,
    });
    const fields = r.missing.map((m) => m.field);
    expect(fields).toEqual(expect.arrayContaining(["vendorName", "documentNumber", "totalAmount"]));
    expect(r.isValid).toBe(false);
  });

  it("amount of 0 or negative counts as missing", () => {
    expect(validateDraftExpense({ ...complete, totalAmount: 0 }).isValid).toBe(false);
    expect(validateDraftExpense({ ...complete, totalAmount: -5 }).isValid).toBe(false);
  });

  it("no recognition rate resolved ⇒ blocks save", () => {
    const r = validateDraftExpense({ ...complete, hasRecognitionRate: false });
    expect(r.isValid).toBe(false);
    expect(r.missing.some((m) => m.field === "recognitionRate")).toBe(true);
  });

  it("ambiguous category (e.g. פגישות עבודה) requires businessPurpose; unambiguous doesn't", () => {
    expect(isBusinessPurposeRequired("פגישות עבודה")).toBe(true);
    expect(isBusinessPurposeRequired("אחר")).toBe(true);
    expect(isBusinessPurposeRequired("ציוד")).toBe(false);
    expect(isBusinessPurposeRequired("תוכנות ומנויים")).toBe(false);

    const ambiguousDraft: DraftExpenseFields = { ...complete, category: "פגישות עבודה", businessPurpose: "" };
    expect(validateDraftExpense(ambiguousDraft).isValid).toBe(false);
    expect(validateDraftExpense({ ...ambiguousDraft, businessPurpose: "פגישה עם לקוח" }).isValid).toBe(true);
  });

  it("live-clears: filling a missing field increases filledCount immediately", () => {
    const missing = validateDraftExpense({ ...complete, vendorName: "" });
    const filled = validateDraftExpense({ ...complete, vendorName: "WOLT" });
    expect(filled.filledCount).toBe(missing.filledCount + 1);
  });
});

describe("findPossibleDuplicate — spec §6 (24h window, non-blocking)", () => {
  const existing = [expenseLine({ vendorName: "Adobe", amount: 89, date: "2026-07-01" })];

  it("flags same vendor + amount within 24h", () => {
    const dup = findPossibleDuplicate(existing, {
      vendorName: "adobe", // case-insensitive
      amount: 89,
      date: "2026-07-01T20:00:00Z",
    });
    expect(dup).not.toBeNull();
  });

  it("does not flag a different amount", () => {
    expect(
      findPossibleDuplicate(existing, { vendorName: "Adobe", amount: 199, date: "2026-07-01" }),
    ).toBeNull();
  });

  it("does not flag outside the 24h window", () => {
    expect(
      findPossibleDuplicate(existing, { vendorName: "Adobe", amount: 89, date: "2026-07-05" }),
    ).toBeNull();
  });
});

describe("withNewExpenseLine — aggregate recompute on save", () => {
  it("bumps totalDeductibleExpenses by the RECOGNIZED amount and expenseCount by 1", () => {
    const persona = makePersona({
      income: { totalDeductibleExpenses: 1000, expenseCount: 3 } as never,
    });
    const line = expenseLine({ amount: 200, deductionRule: "partial", partialPercent: 80 });
    const updated = withNewExpenseLine(persona, line);

    expect(updated.income.totalDeductibleExpenses).toBe(1000 + 160);
    expect(updated.income.expenseCount).toBe(4);
    expect(updated.income.expenses).toHaveLength(1);
    expect(updated.income.expenses![0]).toBe(line);
    // original persona untouched
    expect(persona.income.totalDeductibleExpenses).toBe(1000);
  });

  it("a full-rule line adds its whole amount", () => {
    const persona = makePersona({ income: { totalDeductibleExpenses: 0, expenseCount: 0 } as never });
    const updated = withNewExpenseLine(persona, expenseLine({ amount: 500, deductionRule: "full" }));
    expect(updated.income.totalDeductibleExpenses).toBe(500);
  });
});

describe("buildExpensesCsv — two-layer export (spec §3.8-ד)", () => {
  const rows = [
    expenseLine({ vendorName: "Adobe", amount: 89, category: "תוכנות", deductionRule: "full" }),
    expenseLine({
      vendorName: "WOLT",
      amount: 148,
      category: "פגישות עבודה",
      deductionRule: "partial",
      partialPercent: 80,
      currency: "ILS",
    }),
    expenseLine({
      vendorName: "AWS",
      amount: 365,
      originalAmount: 100,
      currency: "USD",
      exchangeRate: 3.65,
      category: "תוכנות",
      deductionRule: "full",
    }),
  ];

  it("has both a category-summary section and a full-detail section", () => {
    const csv = buildExpensesCsv(rows);
    expect(csv).toContain("סיכום לפי קטגוריה");
    expect(csv).toContain("פירוט מלא");
    expect(csv).toContain("מזה הוצאות חו״ל");
  });

  it("includes every row in the detail section, including a foreign-currency one", () => {
    const csv = buildExpensesCsv(rows);
    expect(csv).toContain("Adobe");
    expect(csv).toContain("WOLT");
    expect(csv).toContain("AWS");
    expect(csv).toContain("USD");
  });

  it("starts with a UTF-8 BOM for Excel Hebrew compatibility", () => {
    const csv = buildExpensesCsv(rows);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("escapes fields containing commas/quotes", () => {
    const csv = buildExpensesCsv([expenseLine({ vendorName: 'שם, עם "גרשיים"' })]);
    expect(csv).toContain('"שם, עם ""גרשיים"""');
  });
});

describe("expenseStatus / filterExpenses / computeExpenseTotals", () => {
  const full = expenseLine({ deductionRule: "full", partialPercent: undefined, amount: 100, vat: 15 });
  const partial = expenseLine({ deductionRule: "partial", partialPercent: 50, amount: 200, vat: 20 });
  const review = expenseLine({ deductionRule: "partial", needsReview: true, amount: 50, vat: 5 });
  const all = [full, partial, review];

  it("expenseStatus: needsReview wins over the deduction rule", () => {
    expect(expenseStatus(full)).toBe("full");
    expect(expenseStatus(partial)).toBe("partial");
    expect(expenseStatus(review)).toBe("needs-review");
  });

  it("filterExpenses: full/partial/needs-review filters", () => {
    expect(filterExpenses(all, "full")).toEqual([full]);
    expect(filterExpenses(all, "partial")).toEqual([partial]);
    expect(filterExpenses(all, "needs-review")).toEqual([review]);
    expect(filterExpenses(all, "all")).toEqual(all);
  });

  it("filterExpenses: this-month is computed dynamically from `now`, not hardcoded", () => {
    const now = new Date("2026-07-15T12:00:00Z");
    const july = expenseLine({ date: "2026-07-10" });
    const june = expenseLine({ date: "2026-06-10" });
    expect(filterExpenses([july, june], "this-month", now)).toEqual([july]);
  });

  it("computeExpenseTotals sums amount/vat/count of exactly the given (already-filtered) list", () => {
    const totals = computeExpenseTotals(all);
    expect(totals.totalAmount).toBe(350);
    expect(totals.totalVat).toBe(40);
    expect(totals.count).toBe(3);
  });
});
