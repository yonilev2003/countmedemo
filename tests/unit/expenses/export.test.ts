/**
 * CSV export builder — category-summary section (incl. the foreign-expenses
 * total row), a blank-line separator, then the full detail section. Pure
 * function; no DOM/Blob involved (see lib/expenses/export.ts header).
 */

import { describe, expect, it } from "vitest";
import {
  buildExpensesCsv,
  filterExpensesByPill,
  groupExpensesByMonth,
  parseExpensePillFilter,
} from "@/lib/expenses/export";
import type { ExpenseLine } from "@/lib/persona";

function line(overrides: Partial<ExpenseLine>): ExpenseLine {
  return {
    date: "2026-08-01",
    vendorName: "ספק בדיקה",
    description: "תיאור",
    amount: 100,
    vat: 0,
    category: "כללי",
    deductionRule: "full",
    ...overrides,
  };
}

describe("buildExpensesCsv", () => {
  it("prefixes a UTF-8 BOM so Excel opens Hebrew correctly", () => {
    const csv = buildExpensesCsv([line({})]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("builds a category-summary section ending with a foreign-expenses total row", () => {
    const csv = buildExpensesCsv([
      line({ category: "ציוד", amount: 100, vat: 15 }),
      line({ category: "ציוד", amount: 200, vat: 30 }),
      line({
        category: "נסיעות",
        amount: 50,
        vat: 0,
        isForeignCurrency: true,
        originalAmount: 15,
        originalCurrency: "USD",
        exchangeRate: 3.3,
      }),
    ]);
    const lines = csv.slice(1).split("\r\n"); // strip BOM before splitting

    expect(lines[0]).toBe("קטגוריה,סה״כ ₪,מזה מע״מ,מספר הוצאות");
    expect(lines[1]).toBe("ציוד,300,45,2");
    expect(lines[2]).toBe("נסיעות,50,0,1");
    // Foreign total row always present, even for a single matching category.
    expect(lines[3]).toBe("מזה הוצאות חו״ל,50,0,1");
    // Blank line separates the two sections.
    expect(lines[4]).toBe("");
  });

  it("emits a foreign-expenses total row of zero when nothing is foreign", () => {
    const csv = buildExpensesCsv([line({ category: "ציוד", amount: 100, vat: 15 })]);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[2]).toBe("מזה הוצאות חו״ל,0,0,0");
  });

  it("never skips a needs_review row in the detail section — flags it instead", () => {
    const csv = buildExpensesCsv([
      line({ vendorName: "ללא פרטים", status: "needs_review", category: "כללי" }),
    ]);
    const detail = csv.split("\r\n\r\n")[1]; // everything after the blank-line separator
    const detailLines = detail.split("\r\n").filter(Boolean);
    expect(detailLines[0]).toContain("סטטוס");
    const dataRow = detailLines.find((l) => l.includes("ללא פרטים"));
    expect(dataRow).toBeDefined();
    expect(dataRow).toContain("דורש בדיקה");
  });

  it("escapes commas, quotes and newlines per RFC 4180", () => {
    const csv = buildExpensesCsv([
      line({ vendorName: 'ספק "מיוחד", בע"מ', description: "שורה אחת\nשורה שנייה" }),
    ]);
    expect(csv).toContain('"ספק ""מיוחד"", בע""מ"');
    expect(csv).toContain('"שורה אחת\nשורה שנייה"');
  });

  it("includes every ExpenseLine field as a detail column, in order", () => {
    const csv = buildExpensesCsv([
      line({
        date: "2026-07-15",
        vendorName: "ספק",
        docNumber: "123",
        description: "תיאור מלא",
        amount: 1180,
        vat: 180,
        category: "ציוד",
        status: "full",
        source: "camera",
        businessPurpose: "לצורך העסק",
        isForeignCurrency: true,
        originalAmount: 300,
        originalCurrency: "USD",
        exchangeRate: 3.93,
        receiptPath: "receipts/uid/1.jpg",
      }),
    ]);
    const detail = csv.split("\r\n\r\n")[1];
    const detailLines = detail.split("\r\n").filter(Boolean);
    expect(detailLines[1].split(",")).toEqual([
      "2026-07-15",
      "ספק",
      "123",
      "תיאור מלא",
      "1180",
      "180",
      "ציוד",
      "מלא",
      "צילום",
      "לצורך העסק",
      "300",
      "USD",
      "3.93",
      "receipts/uid/1.jpg",
    ]);
  });

  it("rounds amounts to agorot to avoid float noise", () => {
    const csv = buildExpensesCsv([line({ amount: 179.999999999999, vat: 0 })]);
    expect(csv).toContain(",180,");
  });
});

// The shared predicate behind /expenses' pill filters AND /expenses/print's
// ?filter= param (spec §1 + §3) — one implementation, tested once.
describe("filterExpensesByPill", () => {
  const now = new Date("2026-08-17T12:00:00Z");

  it("'all' returns every row unchanged", () => {
    const rows = [line({}), line({ status: "needs_review" })];
    expect(filterExpensesByPill(rows, "all", now)).toEqual(rows);
  });

  it("'month' keeps only rows in the current calendar month", () => {
    const inMonth = line({ date: "2026-08-05" });
    const otherMonth = line({ date: "2026-07-31" });
    expect(filterExpensesByPill([inMonth, otherMonth], "month", now)).toEqual([inMonth]);
  });

  it("status pills ('full'/'partial'/'needs_review') match ExpenseLine.status exactly", () => {
    const full = line({ status: "full" });
    const partial = line({ status: "partial" });
    const review = line({ status: "needs_review" });
    const rows = [full, partial, review];
    expect(filterExpensesByPill(rows, "full", now)).toEqual([full]);
    expect(filterExpensesByPill(rows, "partial", now)).toEqual([partial]);
    expect(filterExpensesByPill(rows, "needs_review", now)).toEqual([review]);
  });
});

describe("parseExpensePillFilter", () => {
  it("passes through recognized values", () => {
    expect(parseExpensePillFilter("month")).toBe("month");
    expect(parseExpensePillFilter("needs_review")).toBe("needs_review");
  });

  it("defaults anything unrecognized (including null/undefined) to 'all'", () => {
    expect(parseExpensePillFilter(null)).toBe("all");
    expect(parseExpensePillFilter(undefined)).toBe("all");
    expect(parseExpensePillFilter("bogus")).toBe("all");
  });
});

describe("groupExpensesByMonth", () => {
  it("groups by calendar month, sorted ascending, with a Hebrew month+year label", () => {
    const groups = groupExpensesByMonth([
      line({ date: "2026-08-10", amount: 100 }),
      line({ date: "2026-07-01", amount: 50 }),
      line({ date: "2026-08-20", amount: 30 }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["2026-07", "2026-08"]);
    expect(groups[1].label).toBe("אוגוסט 2026");
    expect(groups[1].expenses).toHaveLength(2);
  });
});
