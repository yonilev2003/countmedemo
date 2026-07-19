/**
 * Receivables + document-model golden tests (beta, CEO plan §3.6).
 *
 * Covers: per-kind status derivation (overdue/expired computed, never stored),
 * the open-amount summary that feeds the dashboard chip, numbering-series
 * isolation (quotes must never consume the invoice sequence), and the
 * revenue-doc rule (only payment docs count as income).
 */

import { describe, it, expect } from "vitest";
import { makePersona } from "../helpers/persona-factory";
import type { InvoiceLine, Persona } from "@/lib/persona";
import {
  nextDocNumber,
  bumpDocCounter,
  isRevenueDoc,
  initialDocStatus,
  allowedDocTypesFor,
} from "@/lib/invoice-generator";
import {
  effectiveStatus,
  getReceivablesSummary,
  isOpenReceivable,
  buildReminder,
} from "@/lib/receivables/summary";
import { computeMonthSummary, yearMonthKey } from "@/lib/dashboard/summary";

const TODAY = new Date("2026-07-19T12:00:00Z");

function doc(overrides: Partial<InvoiceLine>): InvoiceLine {
  return {
    invoiceNumber: "2026-0001",
    date: "2026-07-01",
    customerName: "לקוח בדיקה",
    description: "שירות",
    amount: 1000,
    vat: 180,
    total: 1180,
    ...overrides,
  };
}

function withDocs(docs: InvoiceLine[]): Persona {
  return makePersona({ income: { invoices: docs } as never });
}

describe("effectiveStatus — derived, never stored", () => {
  it("payment docs (and legacy rows without docType/status) are always paid", () => {
    expect(effectiveStatus(doc({}), TODAY)).toBe("paid");
    expect(effectiveStatus(doc({ docType: "receipt" }), TODAY)).toBe("paid");
    expect(
      effectiveStatus(doc({ docType: "tax-invoice-receipt", status: "sent" }), TODAY),
    ).toBe("paid");
  });

  it("business-account: sent without dueDate, overdue only past dueDate", () => {
    const open = doc({ docType: "business-account", status: "sent" });
    expect(effectiveStatus(open, TODAY)).toBe("sent");
    expect(
      effectiveStatus({ ...open, dueDate: "2026-07-30" }, TODAY),
    ).toBe("sent");
    expect(
      effectiveStatus({ ...open, dueDate: "2026-07-10" }, TODAY),
    ).toBe("overdue");
    expect(
      effectiveStatus({ ...open, dueDate: "2026-07-10", status: "paid" }, TODAY),
    ).toBe("paid");
  });

  it("quote: sent until validUntil passes, then expired", () => {
    const q = doc({ docType: "quote", status: "sent" });
    expect(effectiveStatus(q, TODAY)).toBe("sent");
    expect(effectiveStatus({ ...q, validUntil: "2026-06-30" }, TODAY)).toBe("expired");
  });
});

describe("getReceivablesSummary — the dashboard chip contract", () => {
  it("sums only open business-accounts; quotes tracked separately; receipts never", () => {
    const persona = withDocs([
      doc({ docType: "receipt", total: 5000 }),
      doc({ docType: "business-account", status: "sent", total: 1180 }),
      doc({
        docType: "business-account",
        status: "sent",
        total: 2360,
        date: "2026-05-01",
        dueDate: "2026-06-01",
      }),
      doc({ docType: "business-account", status: "paid", total: 999 }),
      doc({ docType: "quote", status: "sent", total: 700 }),
    ]);
    const s = getReceivablesSummary(persona, TODAY);
    expect(s.outstandingTotal).toBe(1180 + 2360);
    expect(s.openCount).toBe(2);
    expect(s.overdueTotal).toBe(2360);
    expect(s.overdueCount).toBe(1);
    expect(s.openQuotesTotal).toBe(700);
    expect(s.openQuotesCount).toBe(1);
    // aging: the May doc (79 days old) lands in over60, the July one in current
    expect(s.aging.over60).toBe(2360);
    expect(s.aging.current).toBe(1180);
    expect(s.aging.over30).toBe(0);
  });

  it("empty persona → all zeros (empty state contract)", () => {
    const s = getReceivablesSummary(withDocs([]), TODAY);
    expect(s.outstandingTotal).toBe(0);
    expect(s.openCount).toBe(0);
  });

  it("isOpenReceivable is false for every non-business-account kind", () => {
    expect(isOpenReceivable(doc({ docType: "quote", status: "sent" }), TODAY)).toBe(false);
    expect(isOpenReceivable(doc({ docType: "receipt" }), TODAY)).toBe(false);
  });
});

describe("numbering series isolation", () => {
  it("quotes/business-accounts run on their own prefixed sequences", () => {
    const persona = makePersona({ invoiceCounter: 42 } as never);
    expect(nextDocNumber(persona, "quote")).toMatch(/^Q-\d{4}-0001$/);
    expect(nextDocNumber(persona, "business-account")).toMatch(/^BA-\d{4}-0001$/);
    // and the legacy shared series is untouched by them
    expect(nextDocNumber(persona, "receipt")).toMatch(/-0042$/);

    const bumped = bumpDocCounter(persona, "quote");
    expect(bumped.docCounters?.quote).toBe(2);
    expect(bumped.invoiceCounter).toBe(42); // invoice sequence NOT consumed

    const bumped2 = bumpDocCounter(persona, "tax-invoice-receipt");
    expect(bumped2.invoiceCounter).toBe(43);
    expect(bumped2.docCounters).toBeUndefined();
  });
});

describe("revenue-doc rule + month summary", () => {
  it("only payment docs count as revenue; quotes/business-accounts never", () => {
    expect(isRevenueDoc("receipt")).toBe(true);
    expect(isRevenueDoc("tax-invoice-receipt")).toBe(true);
    expect(isRevenueDoc(undefined)).toBe(true); // legacy rows
    expect(isRevenueDoc("business-account")).toBe(false);
    expect(isRevenueDoc("quote")).toBe(false);
  });

  it("initial status: payment docs born paid, demands/offers born sent", () => {
    expect(initialDocStatus("receipt")).toBe("paid");
    expect(initialDocStatus("business-account")).toBe("sent");
    expect(initialDocStatus("quote")).toBe("sent");
  });

  it("patur may not issue a tax invoice", () => {
    expect(allowedDocTypesFor("patur")).not.toContain("tax-invoice-receipt");
    expect(allowedDocTypesFor("morshe")).toContain("tax-invoice-receipt");
  });

  it("computeMonthSummary: ex-VAT, current month only, year-aware", () => {
    const persona = makePersona({
      income: {
        invoices: [
          doc({ amount: 1000, vat: 180, total: 1180, date: "2026-07-03" }),
          doc({ amount: 500, vat: 90, total: 590, date: "2026-07-10", docType: "receipt" }),
          // same month LAST year — must not merge (year-aware key)
          doc({ amount: 9999, vat: 0, total: 9999, date: "2025-07-10" }),
          // open business-account — not revenue
          doc({ docType: "business-account", status: "sent", amount: 800, total: 944, date: "2026-07-11" }),
        ],
        expenses: [
          {
            date: "2026-07-05",
            vendorName: "ספק",
            description: "ציוד",
            amount: 300,
            category: "ציוד",
            deductionRule: "full",
          },
        ],
      } as never,
    });
    const s = computeMonthSummary(persona, TODAY);
    expect(s.revenue).toBe(1500); // ex-VAT, this July only
    expect(s.revenueDocCount).toBe(2);
    expect(s.expenses).toBe(300);
    expect(s.ratio).toBeCloseTo(0.2);
    expect(s.isFirstUse).toBe(false);
  });

  it("first-use flag drives the day-0 empty state", () => {
    const s = computeMonthSummary(withDocs([]), TODAY);
    expect(s.isFirstUse).toBe(true);
    expect(s.revenue).toBe(0);
    expect(s.ratio).toBeNull();
  });

  it("yearMonthKey is year-aware (the monthFromIso bug class)", () => {
    expect(yearMonthKey("2026-07-03")).toBe("2026-07");
    expect(yearMonthKey("2025-07-03")).toBe("2025-07");
    expect(yearMonthKey("bad")).toBeNull();
  });
});

describe("reminders (DRAFT copy pending Tomi)", () => {
  it("all three tones mention customer, number and amount", () => {
    const inv = doc({ docType: "business-account", invoiceNumber: "BA-2026-0007", total: 1180 });
    for (const tone of ["gentle", "matter", "assertive"] as const) {
      const text = buildReminder(inv, tone, "סטודיו דנה");
      expect(text).toContain("לקוח בדיקה");
      expect(text).toContain("BA-2026-0007");
      expect(text).toContain("1,180");
    }
  });
});
