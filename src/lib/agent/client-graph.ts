/**
 * Client relationship graph — pure functions over Persona, zero DB (RAG audit
 * #20, 2026-08-18).
 *
 * Builds a small typed graph out of the persona's documents/expenses so the
 * chat agent can answer relational questions ("מי הלקוחות הכי גדולים שלי?",
 * "כמה חייבים לי הלקוחות?", "איך ההוצאות שלי מתפלגות?") without a database —
 * everything is derived, in-memory, from the same Persona object every other
 * calculator already reads.
 *
 * Node types: customer, document (any InvoiceLine — receipt/invoice/business
 * -account/quote), vendor, expense, category, deadline (a document's
 * dueDate/validUntil).
 * Edge types:
 *   - issued_to     customer   → document   (customer received this doc)
 *   - issued_to     vendor     → expense    (vendor charged this expense)
 *   - derived_from  document   → document   (child → the doc it was created
 *                                             FROM, via relatedDocNumber —
 *                                             e.g. a receipt derived_from the
 *                                             business-account it settles)
 *   - categorized_as expense   → category
 *   - due_on        document   → deadline
 *
 * Reuses the existing pure status/revenue helpers (lib/receivables/summary,
 * lib/invoice-generator) rather than re-deriving "is this paid/open/revenue"
 * logic a second time — same single-source-of-truth discipline as the rest
 * of the codebase.
 */

import type { ExpenseLine, InvoiceLine, Persona } from "@/lib/persona";
import { isRevenueDoc } from "@/lib/invoice-generator";
import { effectiveStatus, type EffectiveStatus } from "@/lib/receivables/summary";

export type GraphNodeType =
  | "customer"
  | "document"
  | "vendor"
  | "expense"
  | "category"
  | "deadline";

export type GraphEdgeType = "issued_to" | "derived_from" | "categorized_as" | "due_on";

export interface DocumentNodeData {
  invoiceNumber: string;
  docType: InvoiceLine["docType"];
  amount: number; // ex-VAT
  vat: number;
  total: number; // incl. VAT
  date: string;
  status: EffectiveStatus;
}

export interface ExpenseNodeData {
  amount: number; // gross, as paid
  vat: number; // reclaimable input VAT embedded in amount (0 for עוסק פטור)
  date: string;
  vendorName: string;
  category: string;
}

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  data?: DocumentNodeData | ExpenseNodeData | Record<string, never>;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: GraphEdgeType;
}

export interface ClientGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const customerNodeId = (name: string) => `customer:${name}`;
const documentNodeId = (invoiceNumber: string) => `document:${invoiceNumber}`;
const vendorNodeId = (name: string) => `vendor:${name}`;
const expenseNodeId = (index: number) => `expense:${index}`;
const categoryNodeId = (category: string) => `category:${category}`;
const deadlineNodeId = (invoiceNumber: string, kind: "due" | "valid-until") =>
  `deadline:${invoiceNumber}:${kind}`;

/**
 * Builds the graph. `asOf` drives the derived document status (paid/sent/
 * overdue/expired) — pass a fixed date in tests for determinism, same
 * convention as getReceivablesSummary/effectiveStatus.
 */
export function buildClientGraph(persona: Persona, asOf: Date = new Date()): ClientGraph {
  const nodesById = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const upsertNode = (n: GraphNode) => {
    if (!nodesById.has(n.id)) nodesById.set(n.id, n);
  };

  const invoices: InvoiceLine[] = persona.income.invoices ?? [];
  const invoiceNumbers = new Set(invoices.map((inv) => inv.invoiceNumber));

  for (const inv of invoices) {
    const custId = customerNodeId(inv.customerName);
    const docId = documentNodeId(inv.invoiceNumber);

    upsertNode({ id: custId, type: "customer", label: inv.customerName });
    upsertNode({
      id: docId,
      type: "document",
      label: inv.invoiceNumber,
      data: {
        invoiceNumber: inv.invoiceNumber,
        docType: inv.docType,
        amount: inv.amount,
        vat: inv.vat,
        total: inv.total,
        date: inv.date,
        status: effectiveStatus(inv, asOf),
      },
    });
    edges.push({ from: custId, to: docId, type: "issued_to" });

    // Only link when the target actually exists in this persona's documents —
    // relatedDocNumber is free text and could point at a since-deleted doc.
    if (inv.relatedDocNumber && invoiceNumbers.has(inv.relatedDocNumber)) {
      edges.push({
        from: docId,
        to: documentNodeId(inv.relatedDocNumber),
        type: "derived_from",
      });
    }

    if (inv.docType === "business-account" && inv.dueDate) {
      const dId = deadlineNodeId(inv.invoiceNumber, "due");
      upsertNode({ id: dId, type: "deadline", label: inv.dueDate });
      edges.push({ from: docId, to: dId, type: "due_on" });
    }
    if (inv.docType === "quote" && inv.validUntil) {
      const dId = deadlineNodeId(inv.invoiceNumber, "valid-until");
      upsertNode({ id: dId, type: "deadline", label: inv.validUntil });
      edges.push({ from: docId, to: dId, type: "due_on" });
    }
  }

  const expenses: ExpenseLine[] = (persona.income.expenses ?? []).filter((e) => !e.deletedAt);
  expenses.forEach((exp, idx) => {
    const vId = vendorNodeId(exp.vendorName);
    const eId = expenseNodeId(idx);
    const cId = categoryNodeId(exp.category);

    upsertNode({ id: vId, type: "vendor", label: exp.vendorName });
    upsertNode({
      id: eId,
      type: "expense",
      label: exp.description || exp.category,
      data: {
        amount: exp.amount,
        vat: exp.vat ?? 0,
        date: exp.date,
        vendorName: exp.vendorName,
        category: exp.category,
      },
    });
    upsertNode({ id: cId, type: "category", label: exp.category });

    edges.push({ from: vId, to: eId, type: "issued_to" });
    edges.push({ from: eId, to: cId, type: "categorized_as" });
  });

  return { nodes: [...nodesById.values()], edges };
}

function nodeMap(graph: ClientGraph): Map<string, GraphNode> {
  return new Map(graph.nodes.map((n) => [n.id, n]));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/* ──────────────────────────────────────────────────────────────────────────
 * Query helpers — traverse the graph built above. Each powers one chat tool.
 * ────────────────────────────────────────────────────────────────────────── */

export interface CustomerRevenue {
  customerName: string;
  revenueTotal: number; // ex-VAT, revenue docs only (isRevenueDoc)
  documentCount: number;
}

/** Top customers by revenue (ex-VAT), payment docs only — same rule as computeMonthSummary. */
export function topCustomers(graph: ClientGraph, limit = 5): CustomerRevenue[] {
  const byId = nodeMap(graph);
  const totals = new Map<string, CustomerRevenue>();

  for (const edge of graph.edges) {
    if (edge.type !== "issued_to") continue;
    const customer = byId.get(edge.from);
    const doc = byId.get(edge.to);
    if (!customer || customer.type !== "customer" || !doc || doc.type !== "document") continue;
    const data = doc.data as DocumentNodeData;
    if (!isRevenueDoc(data.docType)) continue;

    const entry = totals.get(customer.label) ?? {
      customerName: customer.label,
      revenueTotal: 0,
      documentCount: 0,
    };
    entry.revenueTotal = round2(entry.revenueTotal + data.amount);
    entry.documentCount += 1;
    totals.set(customer.label, entry);
  }

  return [...totals.values()]
    .sort((a, b) => b.revenueTotal - a.revenueTotal)
    .slice(0, Math.max(0, limit));
}

export interface CategoryBreakdown {
  category: string;
  currentYearTotal: number; // net of reclaimable VAT — same as effectiveDeductibleExpenses
  /** Present only when at least one previous-year expense exists in this category. */
  previousYearTotal?: number;
  /** null when previousYearTotal is 0 (percent change is undefined, not infinite-but-hidden). */
  yoyChangePercent?: number | null;
}

/** Expense totals by category for `currentYear`, with YoY vs. currentYear-1 when data exists. */
export function expenseBreakdownByCategory(
  graph: ClientGraph,
  currentYear: number,
): CategoryBreakdown[] {
  const byId = nodeMap(graph);
  const totals = new Map<string, { current: number; previous: number; hasPrevious: boolean }>();

  for (const edge of graph.edges) {
    if (edge.type !== "categorized_as") continue;
    const expense = byId.get(edge.from);
    const category = byId.get(edge.to);
    if (!expense || expense.type !== "expense" || !category || category.type !== "category") continue;
    const data = expense.data as ExpenseNodeData;
    const year = Number(data.date?.slice(0, 4));
    if (!Number.isFinite(year)) continue;
    const net = data.amount - data.vat;

    const entry = totals.get(category.label) ?? { current: 0, previous: 0, hasPrevious: false };
    if (year === currentYear) entry.current += net;
    else if (year === currentYear - 1) {
      entry.previous += net;
      entry.hasPrevious = true;
    }
    totals.set(category.label, entry);
  }

  return [...totals.entries()]
    .map(([category, v]): CategoryBreakdown => {
      const row: CategoryBreakdown = { category, currentYearTotal: round2(v.current) };
      if (v.hasPrevious) {
        row.previousYearTotal = round2(v.previous);
        row.yoyChangePercent = v.previous === 0 ? null : round2(((v.current - v.previous) / v.previous) * 100);
      }
      return row;
    })
    .sort((a, b) => b.currentYearTotal - a.currentYearTotal);
}

export interface CustomerReceivables {
  customerName: string;
  outstandingTotal: number; // incl. VAT — the amount the customer owes, same convention as getReceivablesSummary
  overdueTotal: number;
  openCount: number;
}

/** Open (unpaid) business-accounts, grouped by customer — same open/overdue rule as isOpenReceivable. */
export function openReceivablesByCustomer(graph: ClientGraph): CustomerReceivables[] {
  const byId = nodeMap(graph);
  const totals = new Map<string, CustomerReceivables>();

  for (const edge of graph.edges) {
    if (edge.type !== "issued_to") continue;
    const customer = byId.get(edge.from);
    const doc = byId.get(edge.to);
    if (!customer || customer.type !== "customer" || !doc || doc.type !== "document") continue;
    const data = doc.data as DocumentNodeData;
    if (data.docType !== "business-account") continue;
    if (data.status !== "sent" && data.status !== "overdue") continue;

    const entry = totals.get(customer.label) ?? {
      customerName: customer.label,
      outstandingTotal: 0,
      overdueTotal: 0,
      openCount: 0,
    };
    entry.outstandingTotal = round2(entry.outstandingTotal + data.total);
    if (data.status === "overdue") entry.overdueTotal = round2(entry.overdueTotal + data.total);
    entry.openCount += 1;
    totals.set(customer.label, entry);
  }

  return [...totals.values()].sort((a, b) => b.outstandingTotal - a.outstandingTotal);
}
