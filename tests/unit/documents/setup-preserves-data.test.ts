/**
 * Regression lock: re-running the /setup wizard must NEVER destroy a user's
 * transactional data (2026-07-24).
 *
 * The wizard edits SETTINGS (identity, business, deductions). It previously
 * rebuilt `income` from scratch, so a returning user who tapped "עדכן נתונים"
 * and finished the wizard lost every invoice/receipt/quote/business-account and
 * expense — in localStorage AND in Supabase (persistPersona write-through) —
 * and the numbering counters reset, so the next document reused a used number.
 *
 * These tests encode the contract on the merge shape produced by buildPersona().
 * They mirror the spread logic in src/app/setup/page.tsx; if that logic changes
 * shape, update BOTH together.
 */

import { describe, it, expect } from "vitest";
import type { InvoiceLine, Persona } from "@/lib/persona";
import { makePersona } from "../helpers/persona-factory";

/** The fields buildPersona() must carry over from an existing persona. */
function mergeLikeWizard(existing: Persona | null, wizardIncome: {
  year: number;
  totalRevenue: number;
  totalDeductibleExpenses: number;
  netIncome: number;
}) {
  return {
    id: existing?.id ?? "user-new",
    income: {
      ...wizardIncome,
      invoices: existing?.income?.invoices ?? [],
      expenses: existing?.income?.expenses ?? [],
      invoiceCount: existing?.income?.invoices?.length ?? 0,
      expenseCount: existing?.income?.expenses?.length ?? 0,
      monthlyBreakdown: existing?.income?.monthlyBreakdown ?? [],
    },
    ...(existing?.invoiceCounter !== undefined
      ? { invoiceCounter: existing.invoiceCounter }
      : {}),
    ...(existing?.docCounters ? { docCounters: existing.docCounters } : {}),
  };
}

const WIZARD_INCOME = {
  year: 2025,
  totalRevenue: 90000,
  totalDeductibleExpenses: 20000,
  netIncome: 70000,
};

function doc(n: string): InvoiceLine {
  return {
    invoiceNumber: n,
    date: "2026-07-01",
    customerName: "לקוח",
    description: "שירות",
    amount: 1000,
    vat: 180,
    total: 1180,
  };
}

describe("re-running /setup preserves transactional data", () => {
  const existing = makePersona({
    id: "user-original",
    invoiceCounter: 7,
    docCounters: { quote: 3, "business-account": 2 },
    income: {
      invoices: [doc("2026-0001"), doc("2026-0002")],
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
      monthlyBreakdown: [{ month: "2026-07", revenue: 2000, expenses: 500 }],
    } as never,
  });

  const merged = mergeLikeWizard(existing, WIZARD_INCOME);

  it("keeps every document", () => {
    expect(merged.income.invoices).toHaveLength(2);
    expect(merged.income.invoices.map((i) => i.invoiceNumber)).toEqual([
      "2026-0001",
      "2026-0002",
    ]);
  });

  it("keeps expenses and the derived monthly series", () => {
    expect(merged.income.expenses).toHaveLength(1);
    expect(merged.income.monthlyBreakdown).toHaveLength(1);
  });

  it("keeps the numbering counters — a reused document number is a bookkeeping bug", () => {
    expect(merged.invoiceCounter).toBe(7);
    expect(merged.docCounters).toEqual({ quote: 3, "business-account": 2 });
  });

  it("keeps the persona id stable (it keys the owner stamp / DB row)", () => {
    expect(merged.id).toBe("user-original");
  });

  it("still applies the settings the wizard DOES own", () => {
    expect(merged.income.totalRevenue).toBe(90000);
    expect(merged.income.year).toBe(2025);
  });

  it("counts are derived from the arrays, never left at 0", () => {
    expect(merged.income.invoiceCount).toBe(2);
    expect(merged.income.expenseCount).toBe(1);
  });

  it("a genuinely new user (no existing persona) starts empty, not undefined", () => {
    const fresh = mergeLikeWizard(null, WIZARD_INCOME);
    expect(fresh.income.invoices).toEqual([]);
    expect(fresh.income.expenses).toEqual([]);
    expect(fresh.income.invoiceCount).toBe(0);
    expect(fresh.invoiceCounter).toBeUndefined();
  });
});
