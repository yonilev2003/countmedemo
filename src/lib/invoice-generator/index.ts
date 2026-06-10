import { Persona, InvoiceLine } from "@/lib/persona";
import { getTaxYearConstants } from "@/lib/calculators/types";

/** Returns next sequential invoice number string like "2024-0042" */
export function nextInvoiceNumber(persona: Persona): string {
  const counter = (persona.invoiceCounter ?? 1);
  return `${new Date().getFullYear()}-${String(counter).padStart(4, "0")}`;
}

/** Validates the invoice fields — returns array of error strings */
export function validateInvoice(invoice: Partial<InvoiceLine>): string[] {
  const errors: string[] = [];
  if (!invoice.customerName?.trim()) errors.push("שם לקוח נדרש");
  if (!invoice.description?.trim()) errors.push("תיאור השירות נדרש");
  if (!invoice.amount || invoice.amount <= 0) errors.push("סכום חייב להיות גדול מ-0");
  if (!invoice.date) errors.push("תאריך נדרש");
  // Israeli rule: for invoices > 5,000 ILS the customer ID is required
  if (invoice.amount && invoice.amount > 5000 && !invoice.customerTaxId) {
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
