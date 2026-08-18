/**
 * Client-graph golden tests (RAG audit #20, 2026-08-18).
 *
 * Pure functions over Persona, zero DB — every expected number below is
 * hand-computed from the fixture invoices/expenses (see the comments next
 * to each fixture value).
 */

import { describe, it, expect } from "vitest";
import { makePersona } from "../helpers/persona-factory";
import type { ExpenseLine, InvoiceLine } from "@/lib/persona";
import {
  buildClientGraph,
  topCustomers,
  expenseBreakdownByCategory,
  openReceivablesByCustomer,
} from "@/lib/agent/client-graph";

const ASOF = new Date("2025-06-01T00:00:00Z");

function inv(overrides: Partial<InvoiceLine>): InvoiceLine {
  return {
    invoiceNumber: "0000",
    date: "2025-01-01",
    customerName: "לקוח",
    description: "שירות",
    amount: 0,
    vat: 0,
    total: 0,
    ...overrides,
  };
}

function exp(overrides: Partial<ExpenseLine>): ExpenseLine {
  return {
    date: "2025-01-01",
    vendorName: "ספק",
    description: "הוצאה",
    amount: 0,
    category: "כללי",
    deductionRule: "full",
    ...overrides,
  };
}

// ── Fixture data (shared across the describe blocks below) ─────────────────

const invoices: InvoiceLine[] = [
  // revenue docs
  inv({ invoiceNumber: "2025-0001", customerName: "לקוח א", docType: "tax-invoice-receipt", amount: 1000, vat: 180, total: 1180, date: "2025-01-10" }),
  inv({ invoiceNumber: "2025-0002", customerName: "לקוח א", docType: "receipt", amount: 500, vat: 0, total: 500, date: "2025-02-01" }),
  inv({ invoiceNumber: "2025-0003", customerName: "לקוח ב", docType: "tax-invoice-receipt", amount: 2000, vat: 360, total: 2360, date: "2025-03-01" }),
  // receipt derived FROM the overdue business-account below (settles it)
  inv({
    invoiceNumber: "2025-0004",
    customerName: "לקוח ב",
    docType: "receipt",
    amount: 300,
    vat: 54,
    total: 354,
    date: "2025-06-02",
    relatedDocNumber: "BA-2025-0002",
  }),
  // business-accounts (not revenue)
  inv({ invoiceNumber: "BA-2025-0001", customerName: "לקוח א", docType: "business-account", status: "sent", amount: 800, vat: 144, total: 944, date: "2025-01-01", dueDate: "2099-01-01" }),
  inv({ invoiceNumber: "BA-2025-0002", customerName: "לקוח ב", docType: "business-account", status: "sent", amount: 300, vat: 54, total: 354, date: "2025-01-01", dueDate: "2025-02-01" }),
  inv({ invoiceNumber: "BA-2025-0003", customerName: "לקוח א", docType: "business-account", status: "paid", amount: 100, vat: 18, total: 118, date: "2025-01-01" }),
  // quote (never revenue, never a receivable) — carries a validUntil deadline
  inv({ invoiceNumber: "Q-2025-0001", customerName: "לקוח ג", docType: "quote", status: "sent", amount: 50, vat: 0, total: 50, date: "2025-01-01", validUntil: "2025-12-31" }),
  // relatedDocNumber pointing at a doc that doesn't exist — must NOT produce an edge
  inv({ invoiceNumber: "2025-0005", customerName: "לקוח ג", docType: "receipt", amount: 10, vat: 0, total: 10, date: "2025-01-01", relatedDocNumber: "GHOST-404" }),
];

const expenses: ExpenseLine[] = [
  exp({ category: "רכב", vendorName: "דלק ישראל", amount: 1000, vat: 100, date: "2025-03-01" }), // current year, net 900
  exp({ category: "רכב", vendorName: "דלק ישראל", amount: 500, vat: 0, date: "2024-03-01" }), // previous year, net 500
  exp({ category: "טלפון", vendorName: "בזק", amount: 200, vat: 0, date: "2025-04-01" }), // current year only, net 200
  exp({ category: "ציוד", vendorName: "ספק ציוד", amount: 50, vat: 50, date: "2024-05-01" }), // previous year, net 0
  exp({ category: "רכב", vendorName: "X", amount: 9999, vat: 0, date: "2025-01-01", deletedAt: "2025-05-01" }), // soft-deleted — must be excluded entirely
];

function fixturePersona() {
  return makePersona({ income: { year: 2025, invoices, expenses } as never });
}

// ── buildClientGraph structure ──────────────────────────────────────────────

describe("buildClientGraph", () => {
  const graph = buildClientGraph(fixturePersona(), ASOF);

  it("creates a derived_from edge only when the related document actually exists", () => {
    expect(graph.edges).toContainEqual({
      from: "document:2025-0004",
      to: "document:BA-2025-0002",
      type: "derived_from",
    });
    // 2025-0005 points at GHOST-404, which is not in the invoice list.
    expect(
      graph.edges.some((e) => e.from === "document:2025-0005" && e.type === "derived_from"),
    ).toBe(false);
  });

  it("creates deadline nodes + due_on edges for business-account dueDate and quote validUntil", () => {
    expect(graph.nodes).toContainEqual({
      id: "deadline:BA-2025-0002:due",
      type: "deadline",
      label: "2025-02-01",
    });
    expect(graph.edges).toContainEqual({
      from: "document:BA-2025-0002",
      to: "deadline:BA-2025-0002:due",
      type: "due_on",
    });
    expect(graph.nodes).toContainEqual({
      id: "deadline:Q-2025-0001:valid-until",
      type: "deadline",
      label: "2025-12-31",
    });
  });

  it("builds vendor → expense → category chains and excludes soft-deleted expenses", () => {
    const vendorNode = graph.nodes.find((n) => n.id === "vendor:דלק ישראל");
    expect(vendorNode).toBeDefined();
    const categoryNode = graph.nodes.find((n) => n.id === "category:רכב");
    expect(categoryNode).toBeDefined();
    // the deleted ₪9999 "X" vendor expense must not appear anywhere in the graph
    expect(graph.nodes.some((n) => n.id === "vendor:X")).toBe(false);
    expect(
      graph.nodes.some((n) => n.type === "expense" && (n.data as { amount?: number })?.amount === 9999),
    ).toBe(false);
  });

  it("empty persona produces an empty graph", () => {
    const empty = buildClientGraph(makePersona({ income: { invoices: [], expenses: [] } as never }), ASOF);
    expect(empty.nodes).toEqual([]);
    expect(empty.edges).toEqual([]);
  });
});

// ── topCustomers ─────────────────────────────────────────────────────────

describe("topCustomers", () => {
  const graph = buildClientGraph(fixturePersona(), ASOF);

  it("sums ex-VAT revenue from payment docs only, per customer, sorted desc", () => {
    // לקוח א: 1000 + 500 = 1500 (2 docs); business-accounts excluded.
    // לקוח ב: 2000 + 300 = 2300 (2 docs); business-account excluded.
    // לקוח ג: only a business-account-less receipt of amount 10 → included (it's a receipt).
    expect(topCustomers(graph, 5)).toEqual([
      { customerName: "לקוח ב", revenueTotal: 2300, documentCount: 2 },
      { customerName: "לקוח א", revenueTotal: 1500, documentCount: 2 },
      { customerName: "לקוח ג", revenueTotal: 10, documentCount: 1 },
    ]);
  });

  it("respects the limit", () => {
    expect(topCustomers(graph, 1)).toEqual([
      { customerName: "לקוח ב", revenueTotal: 2300, documentCount: 2 },
    ]);
  });

  it("empty graph → empty result", () => {
    expect(topCustomers({ nodes: [], edges: [] }, 5)).toEqual([]);
  });
});

// ── expenseBreakdownByCategory ──────────────────────────────────────────────

describe("expenseBreakdownByCategory", () => {
  const graph = buildClientGraph(fixturePersona(), ASOF);
  const rows = expenseBreakdownByCategory(graph, 2025);

  it("computes net-of-VAT totals per category, sorted desc by current-year total", () => {
    expect(rows).toEqual([
      { category: "רכב", currentYearTotal: 900, previousYearTotal: 500, yoyChangePercent: 80 },
      { category: "טלפון", currentYearTotal: 200 },
      { category: "ציוד", currentYearTotal: 0, previousYearTotal: 0, yoyChangePercent: null },
    ]);
  });

  it("a category with no prior-year data omits previousYearTotal/yoyChangePercent entirely", () => {
    const telephone = rows.find((r) => r.category === "טלפון");
    expect(telephone).toBeDefined();
    expect("previousYearTotal" in telephone!).toBe(false);
    expect("yoyChangePercent" in telephone!).toBe(false);
  });
});

// ── openReceivablesByCustomer ────────────────────────────────────────────

describe("openReceivablesByCustomer", () => {
  const graph = buildClientGraph(fixturePersona(), ASOF);

  it("includes only sent/overdue business-accounts, excludes paid docs/quotes/receipts", () => {
    // לקוח א: BA-2025-0001 sent (944, not overdue — dueDate 2099) — BA-2025-0003 paid, excluded.
    // לקוח ב: BA-2025-0002 overdue (354, dueDate 2025-02-01 < ASOF).
    expect(openReceivablesByCustomer(graph)).toEqual([
      { customerName: "לקוח א", outstandingTotal: 944, overdueTotal: 0, openCount: 1 },
      { customerName: "לקוח ב", outstandingTotal: 354, overdueTotal: 354, openCount: 1 },
    ]);
  });

  it("empty graph → empty result", () => {
    expect(openReceivablesByCustomer({ nodes: [], edges: [] })).toEqual([]);
  });
});
