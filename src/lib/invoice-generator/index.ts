import { Persona, InvoiceLine, InvoiceDocType, DocStatus } from "@/lib/persona";
import { getTaxYearConstants } from "@/lib/calculators/types";

/** Returns next sequential invoice number string like "2024-0042" */
export function nextInvoiceNumber(persona: Persona): string {
  const counter = (persona.invoiceCounter ?? 1);
  return `${new Date().getFullYear()}-${String(counter).padStart(4, "0")}`;
}

/** Number-series prefixes for the non-tax docs. The two payment docs keep the
 *  legacy shared un-prefixed series (numbering continuity; split pending Roy). */
const SERIES_PREFIX: Record<"business-account" | "quote", string> = {
  "business-account": "BA-",
  quote: "Q-",
};

/**
 * Next document number for a given kind. Quotes and business-accounts run on
 * their own sequences (a quote must never consume the invoice sequence);
 * receipts/tax-invoices keep the legacy shared counter.
 */
export function nextDocNumber(persona: Persona, docType: InvoiceDocType): string {
  if (docType === "quote" || docType === "business-account") {
    const counter = persona.docCounters?.[docType] ?? 1;
    return `${SERIES_PREFIX[docType]}${new Date().getFullYear()}-${String(counter).padStart(4, "0")}`;
  }
  return nextInvoiceNumber(persona);
}

/** Persona counter updates to persist alongside a newly created document. */
export function bumpDocCounter(
  persona: Persona,
  docType: InvoiceDocType,
): Pick<Persona, "invoiceCounter" | "docCounters"> {
  if (docType === "quote" || docType === "business-account") {
    return {
      invoiceCounter: persona.invoiceCounter,
      docCounters: {
        ...persona.docCounters,
        [docType]: (persona.docCounters?.[docType] ?? 1) + 1,
      },
    };
  }
  return {
    invoiceCounter: (persona.invoiceCounter ?? 1) + 1,
    docCounters: persona.docCounters,
  };
}

/** Payment-received tax docs — the ONLY kinds that count as revenue. */
export function isRevenueDoc(docType: InvoiceDocType | undefined): boolean {
  const t = docType ?? "tax-invoice-receipt";
  return t === "tax-invoice-receipt" || t === "receipt";
}

/** Initial stored status per kind: payment docs are born paid, demands/offers open. */
export function initialDocStatus(docType: InvoiceDocType): DocStatus {
  return isRevenueDoc(docType) ? "paid" : "sent";
}

/** Which document kinds an osek may issue (patur never issues a tax invoice). */
export function allowedDocTypesFor(osekType: "patur" | "morshe"): InvoiceDocType[] {
  return osekType === "patur"
    ? ["receipt", "business-account", "quote"]
    : ["tax-invoice-receipt", "receipt", "business-account", "quote"];
}

/** Validates the invoice fields — returns array of error strings */
export function validateInvoice(invoice: Partial<InvoiceLine>): string[] {
  const errors: string[] = [];
  if (!invoice.customerName?.trim()) errors.push("שם לקוח נדרש");
  if (!invoice.description?.trim()) errors.push("תיאור השירות נדרש");
  if (!invoice.amount || invoice.amount <= 0) errors.push("סכום חייב להיות גדול מ-0");
  if (!invoice.date) errors.push("תאריך נדרש");
  // Israeli rule: for TAX documents > 5,000 ILS the customer ID is required.
  // Quotes/business-accounts are not tax documents — rule doesn't apply.
  if (
    invoice.amount &&
    invoice.amount > 5000 &&
    !invoice.customerTaxId &&
    isRevenueDoc(invoice.docType)
  ) {
    errors.push("לחשבוניות מעל 5,000 ₪ נדרש מספר ת.ז. / ח.פ. של הלקוח");
  }
  return errors;
}

/**
 * Calculates totals for an invoice given the osek type. VAT uses the standard
 * rate for the issuing year (year-keyed in calculators/types.ts): 17% through
 * 2024, 18% from 2025-01-01. Defaults to the current calendar year.
 */
export function calculateInvoiceTotals(
  amount: number,
  osekType: "patur" | "morshe",
  year: number = new Date().getFullYear(),
): { net: number; vat: number; total: number } {
  if (osekType === "morshe") {
    const vat = Math.round(amount * getTaxYearConstants(year).vatRate);
    return { net: amount, vat, total: amount + vat };
  }
  return { net: amount, vat: 0, total: amount };
}

/** Format a date string to Hebrew-friendly format */
export function formatHebrewDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}
