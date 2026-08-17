/**
 * CSV/PDF export support for the /expenses list and /expenses/print — pure
 * builders and predicates, no DOM/Blob/window work here (that lives in the
 * pages, which trigger the actual download/print). Kept pure and
 * side-effect-free so it can be unit-tested directly.
 *
 * The CSV has two sections in one file, matching how the user's accountant
 * expects a הוצאות handoff: a category-summary roll-up first (what an
 * accountant skims first), then the full detail rows underneath, separated
 * by a blank line. UTF-8 BOM is prefixed so Hebrew opens correctly in Excel
 * (without it, Excel guesses a non-UTF-8 codepage and every Hebrew cell
 * turns to מוגננג).
 *
 * This file also owns the pill-filter contract shared between /expenses
 * (list + its CSV export) and /expenses/print (reached via ?filter=) — kept
 * in ONE place so the two screens can never filter differently for the same
 * pill (spec §3).
 */

import type { ExpenseLine } from "@/lib/persona";

/* ─────────────────────────────── Pill filters ──────────────────────────── */

export type ExpensePillFilter = "all" | "month" | "full" | "partial" | "needs_review";

export const EXPENSE_PILL_ORDER: ExpensePillFilter[] = [
  "all",
  "month",
  "full",
  "partial",
  "needs_review",
];

const STATIC_PILL_LABEL: Record<Exclude<ExpensePillFilter, "month">, string> = {
  all: "הכל",
  full: "מוכר במלואו",
  partial: "חסרים פרטים",
  needs_review: "דורש בדיקה",
};

/** Shared Hebrew month names — also used by /expenses/print to label its
 *  per-month groups, so the two screens don't maintain separate copies. */
export const HEBREW_MONTH_NAMES = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

/** "אוגוסט 2026" — always the CURRENT calendar month, not the latest month
 *  that happens to have data, computed fresh at render time. */
export function currentMonthLabel(now: Date = new Date()): string {
  return `${HEBREW_MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
}

export function expensePillLabel(filter: ExpensePillFilter, now: Date = new Date()): string {
  return filter === "month" ? currentMonthLabel(now) : STATIC_PILL_LABEL[filter];
}

/** ?filter= query-param → pill, defaulting anything unrecognized to "all". */
export function parseExpensePillFilter(value: string | string[] | null | undefined): ExpensePillFilter {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "month" || v === "full" || v === "partial" || v === "needs_review" ? v : "all";
}

/**
 * The ONE filtering predicate behind every pill. Both /expenses and
 * /expenses/print call this — never reimplement it at either call site.
 */
export function filterExpensesByPill(
  expenses: ExpenseLine[],
  filter: ExpensePillFilter,
  now: Date = new Date(),
): ExpenseLine[] {
  switch (filter) {
    case "all":
      return expenses;
    case "month": {
      const y = now.getFullYear();
      const m = now.getMonth();
      return expenses.filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === y && d.getMonth() === m;
      });
    }
    case "full":
    case "partial":
    case "needs_review":
      return expenses.filter((e) => e.status === filter);
  }
}

/**
 * Groups (already-filtered) expenses by calendar month, ascending — the
 * shape /expenses/print renders one table per group from. Key format
 * "YYYY-MM" so groups sort correctly across a year boundary.
 */
export function groupExpensesByMonth(
  expenses: ExpenseLine[],
): { key: string; label: string; expenses: ExpenseLine[] }[] {
  const groups = new Map<string, ExpenseLine[]>();
  for (const e of expenses) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(e);
    else groups.set(key, [e]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, lines]) => {
      const [y, m] = key.split("-");
      return { key, label: `${HEBREW_MONTH_NAMES[Number(m) - 1]} ${y}`, expenses: lines };
    });
}

/* ────────────────────────────────── CSV ─────────────────────────────────── */

const STATUS_CSV_LABEL: Record<NonNullable<ExpenseLine["status"]>, string> = {
  full: "מלא",
  partial: "חסרים פרטים",
  needs_review: "דורש בדיקה",
};

const SOURCE_CSV_LABEL: Record<NonNullable<ExpenseLine["source"]>, string> = {
  camera: "צילום",
  gallery: "גלריה",
  file: "קובץ",
  voice: "הקלטה קולית",
  manual: "ידני",
};

/** Round to agorot — avoids float noise like 179.99999999999997 in the CSV. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** RFC-4180 field escaping: quote whenever the value contains a comma, quote, or newline. */
function csvField(value: string | number | undefined | null): string {
  const str = value === undefined || value === null ? "" : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(cells: (string | number | undefined | null)[]): string {
  return cells.map(csvField).join(",") + "\r\n";
}

/**
 * Builds the full export CSV for a given (already-filtered) set of expenses.
 * needs_review rows are NEVER dropped from the detail section — they're
 * flagged with their status label instead, so the accountant sees exactly
 * what still needs the user's attention rather than a silently missing row.
 */
export function buildExpensesCsv(expenses: ExpenseLine[]): string {
  const rows: string[] = [];

  // ── (a) category summary ──────────────────────────────────────────────
  rows.push(csvRow(["קטגוריה", "סה״כ ₪", "מזה מע״מ", "מספר הוצאות"]));

  const byCategory = new Map<string, { total: number; vat: number; count: number }>();
  for (const e of expenses) {
    const key = e.category || "ללא קטגוריה";
    const agg = byCategory.get(key) ?? { total: 0, vat: 0, count: 0 };
    agg.total += e.amount;
    agg.vat += e.vat ?? 0;
    agg.count += 1;
    byCategory.set(key, agg);
  }
  const sortedCategories = [...byCategory.entries()].sort((a, b) => b[1].total - a[1].total);
  for (const [category, agg] of sortedCategories) {
    rows.push(csvRow([category, round2(agg.total), round2(agg.vat), agg.count]));
  }

  // Foreign-currency total row — always present, even when 0, so the section
  // shape is predictable for whoever parses this CSV downstream.
  const foreign = expenses.filter((e) => e.isForeignCurrency);
  const foreignTotal = foreign.reduce((s, e) => s + e.amount, 0);
  const foreignVat = foreign.reduce((s, e) => s + (e.vat ?? 0), 0);
  rows.push(csvRow(["מזה הוצאות חו״ל", round2(foreignTotal), round2(foreignVat), foreign.length]));

  // ── blank line between sections ─────────────────────────────────────
  rows.push("\r\n");

  // ── (b) detail section — every ExpenseLine field as a column ──────────
  rows.push(
    csvRow([
      "תאריך",
      "ספק",
      "מספר מסמך",
      "תיאור",
      "סכום",
      "מע״מ",
      "קטגוריה",
      "סטטוס",
      "מקור",
      "מטרה עסקית",
      "סכום מקורי",
      "מטבע מקורי",
      "שער חליפין",
      "נתיב קבלה",
    ]),
  );
  for (const e of expenses) {
    rows.push(
      csvRow([
        e.date,
        e.vendorName,
        e.docNumber ?? "",
        e.description,
        round2(e.amount),
        round2(e.vat ?? 0),
        e.category,
        e.status ? STATUS_CSV_LABEL[e.status] : "",
        e.source ? SOURCE_CSV_LABEL[e.source] : "",
        e.businessPurpose ?? "",
        e.originalAmount ?? "",
        e.originalCurrency ?? "",
        e.exchangeRate ?? "",
        e.receiptPath ?? "",
      ]),
    );
  }

  // BOM (U+FEFF) first — Excel's UTF-8 CSV auto-detection keys off it.
  return "﻿" + rows.join("");
}
