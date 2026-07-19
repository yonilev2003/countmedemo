/**
 * "מי לא שילם לי" — receivables over the persona's documents (CEO plan §3.6).
 *
 * Pure, deterministic functions: no LLM, no network. "Overdue"/"expired" are
 * DERIVED from dates at call time — never stored, so nothing needs a cron.
 *
 * Semantics (documents spec, docs/specs/beta/documents-receivables.md):
 * - receipts / tax-invoice-receipts attest payment received ⇒ never open.
 * - business-accounts (חשבון עסקה) are payment demands ⇒ open until marked paid.
 * - quotes (הצעת מחיר) are offers ⇒ tracked separately, never "debt".
 */

import { InvoiceLine, Persona } from "@/lib/persona";
import { isRevenueDoc } from "@/lib/invoice-generator";

export type EffectiveStatus = "paid" | "sent" | "overdue" | "expired";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(fromIso: string, to: Date): number {
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) return 0;
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

/** Render-time status for any document. */
export function effectiveStatus(inv: InvoiceLine, today: Date = new Date()): EffectiveStatus {
  const docType = inv.docType ?? "tax-invoice-receipt";
  // Payment docs (and legacy rows with no status) are paid by definition.
  if (isRevenueDoc(docType)) return "paid";
  if (inv.status === "paid") return "paid";
  if (docType === "quote") {
    return inv.validUntil && daysBetween(inv.validUntil, today) > 0 ? "expired" : "sent";
  }
  // business-account: overdue only when a due date was set and has passed.
  return inv.dueDate && daysBetween(inv.dueDate, today) > 0 ? "overdue" : "sent";
}

/** An open (unpaid) business-account — the money that is actually "outside". */
export function isOpenReceivable(inv: InvoiceLine, today: Date = new Date()): boolean {
  if ((inv.docType ?? "tax-invoice-receipt") !== "business-account") return false;
  const s = effectiveStatus(inv, today);
  return s === "sent" || s === "overdue";
}

export interface ReceivablesSummary {
  /** Sum (incl. VAT — the amount the customer owes) of open business-accounts. */
  outstandingTotal: number;
  openCount: number;
  overdueTotal: number;
  overdueCount: number;
  /** Open quotes tracked separately — potential, not debt. */
  openQuotesTotal: number;
  openQuotesCount: number;
  /** Aging of the open amount by days since the document date. */
  aging: { current: number; over30: number; over60: number };
}

export function getReceivablesSummary(
  persona: Persona,
  today: Date = new Date(),
): ReceivablesSummary {
  const docs = persona.income.invoices ?? [];
  const summary: ReceivablesSummary = {
    outstandingTotal: 0,
    openCount: 0,
    overdueTotal: 0,
    overdueCount: 0,
    openQuotesTotal: 0,
    openQuotesCount: 0,
    aging: { current: 0, over30: 0, over60: 0 },
  };

  for (const inv of docs) {
    const docType = inv.docType ?? "tax-invoice-receipt";
    const status = effectiveStatus(inv, today);

    if (docType === "quote" && status === "sent") {
      summary.openQuotesTotal += inv.total;
      summary.openQuotesCount += 1;
      continue;
    }

    if (!isOpenReceivable(inv, today)) continue;

    summary.outstandingTotal += inv.total;
    summary.openCount += 1;
    if (status === "overdue") {
      summary.overdueTotal += inv.total;
      summary.overdueCount += 1;
    }
    const age = daysBetween(inv.date, today);
    if (age > 60) summary.aging.over60 += inv.total;
    else if (age > 30) summary.aging.over30 += inv.total;
    else summary.aging.current += inv.total;
  }

  return summary;
}

export type ReminderTone = "gentle" | "matter" | "assertive";

/**
 * Graded payment-reminder drafts in Eitan's register.
 * DRAFT — placeholder copy pending Tomi's final wording (TOMI-1); factual only,
 * no legal threats (חוק מוסר תשלומים references need Roy's verification first).
 */
export function buildReminder(
  inv: InvoiceLine,
  tone: ReminderTone,
  businessName: string,
): string {
  const amount = `${inv.total.toLocaleString("he-IL")} ₪`;
  const docRef = `חשבון עסקה ${inv.invoiceNumber}`;
  const due = inv.dueDate
    ? ` (מועד התשלום: ${new Date(inv.dueDate).toLocaleDateString("he-IL")})`
    : "";

  switch (tone) {
    case "gentle":
      return (
        `היי ${inv.customerName}, כאן ${businessName}. ` +
        `רק תזכורת קטנה — ${docRef} על סך ${amount} עדיין פתוח${due}. ` +
        `אם התשלום כבר בדרך, אפשר להתעלם. תודה!`
      );
    case "matter":
      return (
        `שלום ${inv.customerName}, ` +
        `${docRef} על סך ${amount} טרם שולם${due}. ` +
        `נשמח להסדרת התשלום בימים הקרובים. בתודה, ${businessName}.`
      );
    case "assertive":
      return (
        `שלום ${inv.customerName}, ` +
        `למרות תזכורת קודמת, ${docRef} על סך ${amount} עדיין פתוח${due}. ` +
        `נבקש להסדיר את התשלום עד סוף השבוע, או לעדכן אותנו במועד צפוי. ` +
        `בתודה, ${businessName}.`
      );
  }
}
