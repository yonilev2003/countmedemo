/**
 * Golden tests — periodic VAT report (Form 874 field mapping), in-app only.
 * See src/lib/vat-report/index.ts's header comment for scope (no SHAAM call,
 * no submission — computed from persona invoices/expenses only).
 */

import { describe, expect, it } from "vitest";
import {
  computeVatReport,
  determineVatCadence,
  defaultVatPeriodIndex,
  getVatPeriodsForYear,
  vatPeriodOnlineDueDate,
} from "@/lib/vat-report";
import { makePersona } from "../helpers/persona-factory";
import type { InvoiceLine, ExpenseLine } from "@/lib/persona";

const invoice = (over: Partial<InvoiceLine>): InvoiceLine => ({
  invoiceNumber: "2025-0001",
  date: "2025-03-10",
  customerName: "לקוח",
  description: "שירות",
  amount: 1000,
  vat: 180,
  total: 1180,
  docType: "tax-invoice-receipt",
  status: "paid",
  ...over,
});

const expense = (over: Partial<ExpenseLine>): ExpenseLine => ({
  date: "2025-03-10",
  vendorName: "ספק",
  description: "ציוד",
  amount: 590,
  vat: 90,
  category: "ציוד",
  deductionRule: "full",
  ...over,
});

describe("computeVatReport — applicability", () => {
  it("is NOT applicable for עוסק פטור — no periodic VAT report exists for them", () => {
    const p = makePersona({ business: { osekType: "patur" } });
    const report = computeVatReport(p, 2025, 0);
    expect(report.applicable).toBe(false);
    expect(report.fields.every((f) => f.amount === 0)).toBe(true);
  });

  it("IS applicable for עוסק מורשה", () => {
    const p = makePersona({ business: { osekType: "morshe" } });
    expect(computeVatReport(p, 2025, 0).applicable).toBe(true);
  });

  it("IS applicable for a murshe-זעיר (Amendment 265 — זעיר is income-tax-only, VAT unaffected)", () => {
    const p = makePersona({ business: { osekType: "morshe", isOsekZeir: true } });
    expect(computeVatReport(p, 2025, 0).applicable).toBe(true);
  });
});

describe("computeVatReport — field mapping (Form 874)", () => {
  it("sums sales/VAT/purchases/input-VAT only from documents dated inside the requested period", () => {
    const p = makePersona({
      business: { osekType: "morshe" },
      income: {
        year: 2025,
        invoices: [
          invoice({ date: "2025-01-15", amount: 1000, vat: 180, total: 1180 }), // Jan–Feb period
          invoice({ date: "2025-02-20", amount: 500, vat: 90, total: 590 }),    // Jan–Feb period
          invoice({ date: "2025-03-05", amount: 2000, vat: 360, total: 2360 }), // Mar–Apr — excluded
        ],
        expenses: [
          expense({ date: "2025-01-10", amount: 590, vat: 90 }), // Jan–Feb period
          expense({ date: "2025-03-01", amount: 200, vat: 30 }), // excluded
        ],
      },
    });
    const report = computeVatReport(p, 2025, 0); // Jan–Feb period (index 0)
    expect(report.period.labelHe).toContain("ינואר");
    const byCode = Object.fromEntries(report.fields.map((f) => [f.code, f.amount]));
    expect(byCode[1]).toBe(1770); // 1180 + 590
    expect(byCode[4]).toBe(270); // 180 + 90 output VAT
    expect(byCode[5]).toBe(590); // purchases incl VAT
    expect(byCode[6]).toBe(90); // input VAT
    expect(byCode[7]).toBe(180); // net VAT = 270 - 90
    expect(byCode[9]).toBe(180); // amount due (no adjustments)
    expect(report.invoiceCount).toBe(2);
    expect(report.expenseCount).toBe(1);
  });

  it("excludes non-revenue docs (business-account, quote) from sales/output-VAT", () => {
    const p = makePersona({
      business: { osekType: "morshe" },
      income: {
        year: 2025,
        invoices: [
          invoice({ date: "2025-01-15", docType: "business-account", amount: 5000, vat: 900, total: 5900 }),
          invoice({ date: "2025-01-16", docType: "quote", amount: 3000, vat: 540, total: 3540 }),
          invoice({ date: "2025-01-17", docType: "tax-invoice-receipt", amount: 100, vat: 18, total: 118 }),
        ],
      },
    });
    const report = computeVatReport(p, 2025, 0);
    const byCode = Object.fromEntries(report.fields.map((f) => [f.code, f.amount]));
    expect(byCode[1]).toBe(118);
    expect(byCode[4]).toBe(18);
  });

  it("excludes soft-deleted expenses from purchases/input-VAT", () => {
    const p = makePersona({
      business: { osekType: "morshe" },
      income: {
        year: 2025,
        expenses: [
          expense({ date: "2025-01-05", amount: 1000, vat: 150 }),
          expense({ date: "2025-01-06", amount: 500, vat: 75, deletedAt: "2025-06-01" }),
        ],
      },
    });
    const report = computeVatReport(p, 2025, 0);
    const byCode = Object.fromEntries(report.fields.map((f) => [f.code, f.amount]));
    expect(byCode[5]).toBe(1000);
    expect(byCode[6]).toBe(150);
  });

  it("fields 2/3 (zero-rated/exempt) are always 0 with an explicit not-modeled note, never silently hidden", () => {
    const p = makePersona({ business: { osekType: "morshe" } });
    const report = computeVatReport(p, 2025, 0);
    const byCode = Object.fromEntries(report.fields.map((f) => [f.code, f.amount]));
    expect(byCode[2]).toBe(0);
    expect(byCode[3]).toBe(0);
    expect(report.notesHe.join(" ")).toContain("שדות 2 ו-3");
  });

  it("vatRate reflects the requested year's rate (17% for 2024, 18% for 2025+)", () => {
    const p = makePersona({ business: { osekType: "morshe" } });
    expect(computeVatReport(p, 2024, 0).vatRate).toBe(0.17);
    expect(computeVatReport(p, 2025, 0).vatRate).toBe(0.18);
  });

  it("risk-gap.md §7.4 #3: the 500K detailed-874 note is driven by LIVE turnover, not a stale setup-time snapshot", () => {
    const above = makePersona({
      business: { osekType: "morshe" },
      income: { totalRevenue: 600_000 },
      vatAndTurnover: { annualTurnoverWithoutVat: 10_000 }, // stale — must NOT suppress the note
    });
    expect(computeVatReport(above, 2026, 0).notesHe.join(" ")).toContain("500,000");

    const below = makePersona({
      business: { osekType: "morshe" },
      income: { totalRevenue: 400_000 },
    });
    expect(computeVatReport(below, 2026, 0).notesHe.join(" ")).not.toContain("500,000");
  });
});

describe("determineVatCadence — §69A(g)", () => {
  it("bi-monthly at/under 1,500,000 ₪ annual turnover", () => {
    const p = makePersona({ income: { totalRevenue: 1_500_000 } });
    expect(determineVatCadence(p)).toBe("bi-monthly");
  });
  it("monthly strictly above 1,500,000 ₪", () => {
    const p = makePersona({ income: { totalRevenue: 1_500_001 } });
    expect(determineVatCadence(p)).toBe("monthly");
  });
  it("risk-gap.md §7.4 #3: reads the LIVE income.totalRevenue, ignoring a stale/frozen vatAndTurnover.annualTurnoverWithoutVat snapshot", () => {
    // Old bug: this used to read vatAndTurnover.annualTurnoverWithoutVat, which
    // is written once at /setup and never updated as new invoices land — a
    // business crossing 1.5M mid-year via invoices kept showing bi-monthly.
    const p = makePersona({
      income: { totalRevenue: 2_000_000 }, // live, invoice-driven — above threshold
      vatAndTurnover: { annualTurnoverWithoutVat: 100_000 }, // stale setup-time snapshot — below threshold
    });
    expect(determineVatCadence(p)).toBe("monthly");
  });
});

describe("getVatPeriodsForYear", () => {
  it("bi-monthly → 6 periods of 2 months each", () => {
    const periods = getVatPeriodsForYear(2025, "bi-monthly");
    expect(periods).toHaveLength(6);
    expect(periods[0]).toMatchObject({ startMonth: 0, endMonth: 1 });
    expect(periods[5]).toMatchObject({ startMonth: 10, endMonth: 11 });
  });
  it("monthly → 12 periods of 1 month each", () => {
    const periods = getVatPeriodsForYear(2025, "monthly");
    expect(periods).toHaveLength(12);
    expect(periods[0]).toMatchObject({ startMonth: 0, endMonth: 0 });
  });
});

describe("defaultVatPeriodIndex", () => {
  it("a past filing year (today's year !== requested year) defaults to the LAST period", () => {
    expect(defaultVatPeriodIndex(2024, "bi-monthly", new Date(2025, 5, 15))).toBe(5);
  });
  it("mid-period today (bi-monthly): defaults to the last COMPLETED period, not the in-progress one", () => {
    // Today = March 10 → in the Mar–Apr period (index 1, in progress) → default to Jan–Feb (index 0)
    expect(defaultVatPeriodIndex(2025, "bi-monthly", new Date(2025, 2, 10))).toBe(0);
    // Today = July 5 → in Jul–Aug period (index 3, in progress) → default to May–Jun (index 2)
    expect(defaultVatPeriodIndex(2025, "bi-monthly", new Date(2025, 6, 5))).toBe(2);
  });
  it("January (first period in progress): clamps to period 0, never negative", () => {
    expect(defaultVatPeriodIndex(2025, "bi-monthly", new Date(2025, 0, 15))).toBe(0);
  });
  it("monthly cadence: defaults to the previous completed month", () => {
    expect(defaultVatPeriodIndex(2025, "monthly", new Date(2025, 4, 15))).toBe(3); // May in progress → April
  });
});

describe("vatPeriodOnlineDueDate", () => {
  it("19th of the month after the period ends", () => {
    const periods = getVatPeriodsForYear(2025, "bi-monthly");
    const dueForJanFeb = vatPeriodOnlineDueDate(periods[0]);
    expect(dueForJanFeb.getFullYear()).toBe(2025);
    expect(dueForJanFeb.getMonth()).toBe(2); // March
    expect(dueForJanFeb.getDate()).toBe(19);
  });
  it("Nov–Dec period rolls the due date into January of the NEXT year", () => {
    const periods = getVatPeriodsForYear(2025, "bi-monthly");
    const dueForNovDec = vatPeriodOnlineDueDate(periods[5]);
    expect(dueForNovDec.getFullYear()).toBe(2026);
    expect(dueForNovDec.getMonth()).toBe(0); // January
    expect(dueForNovDec.getDate()).toBe(19);
  });
});
