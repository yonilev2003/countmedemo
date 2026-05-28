/**
 * Build a P&L statement in the Israeli standard format
 * (Doch Revach VeHefsed) from a persona.
 *
 * Follows the structure documented by the `israeli-financial-reports` skill:
 *   Total Revenue           הכנסות
 *     – Cost of Revenue     עלות המכר
 *   = Gross Profit          רווח גולמי
 *     – Operating Expenses  הוצאות תפעוליות
 *   = Operating Profit      רווח תפעולי
 *     – Financial Expenses  הוצאות מימון
 *   = Profit Before Tax     רווח לפני מס
 *     – Income Tax          מס הכנסה
 *   = Net Profit            רווח נקי
 *
 * Naming uses bilingual labels per the skill: Hebrew (primary), English (secondary).
 * Negatives are stored as positive magnitudes; the UI renders them in parentheses.
 *
 * NOTE: This is a pure-function transformation — no React, no I/O. The dashboard
 * page renders the output; the same data could be exported to PDF/Excel later.
 */

import { Persona } from "@/lib/persona";
import { PLSummary } from "./index";
import { getTaxYearConstants } from "@/lib/calculators/types";

export interface PLLine {
  /** Hebrew label */
  he: string;
  /** English label */
  en: string;
  /** Amount as positive magnitude. Sign comes from `kind`. */
  amount: number;
  /** Inflow = revenue/profit (no parentheses); outflow = expense/tax (parentheses). */
  kind: "inflow" | "outflow";
  /** True for the visual subtotal rows (Gross/Operating/Pre-tax/Net). */
  isSubtotal?: boolean;
}

export interface IsraeliPLReport {
  business: {
    nameHe: string;
    nameEn: string;
    osekType: "patur" | "morshe";
    osekFileNumber?: string;
    primaryOccupation?: string;
  };
  period: {
    year: number;
    label: string;
  };
  lines: PLLine[];
  totals: {
    totalRevenue: number;
    costOfRevenue: number;
    grossProfit: number;
    operatingExpenses: number;
    operatingProfit: number;
    financialExpenses: number;
    profitBeforeTax: number;
    incomeTax: number;
    netProfit: number;
  };
}

/**
 * Estimate income tax using Israeli 2024 progressive brackets for self-employed.
 * Brackets per the calculators/types module; this is a rough estimate for the
 * report (not the official liability).
 */
function estimateIncomeTax(profitBeforeTax: number, year: number): number {
  if (profitBeforeTax <= 0) return 0;
  const brackets = getTaxYearConstants(year).taxBrackets;
  let tax = 0;
  for (const b of brackets) {
    if (profitBeforeTax <= b.from) break;
    const taxable = Math.min(profitBeforeTax, b.to) - b.from;
    if (taxable > 0) tax += taxable * b.rate;
  }
  return Math.round(tax);
}

/**
 * Split operating expenses from the PL summary into "cost of revenue" (direct)
 * vs "operating expenses" (indirect). The expense categories from
 * persona.income.expenses (or the demo fallback) don't carry that flag, so we
 * use a simple heuristic: equipment/computing is the direct cost line for a
 * service business; everything else is operating overhead. Real accounting
 * would split this per the chart of accounts.
 */
function splitExpenses(expenseBreakdown: { category: string; amount: number }[]): {
  costOfRevenue: number;
  operatingExpenses: number;
  operatingLines: { category: string; amount: number }[];
  costLines: { category: string; amount: number }[];
} {
  const COST_CATEGORIES = new Set(["ציוד ומחשוב", "ציוד", "מחשוב", "Equipment"]);
  let costOfRevenue = 0;
  let operatingExpenses = 0;
  const operatingLines: { category: string; amount: number }[] = [];
  const costLines: { category: string; amount: number }[] = [];
  for (const e of expenseBreakdown) {
    if (COST_CATEGORIES.has(e.category)) {
      costOfRevenue += e.amount;
      costLines.push(e);
    } else {
      operatingExpenses += e.amount;
      operatingLines.push(e);
    }
  }
  return { costOfRevenue, operatingExpenses, operatingLines, costLines };
}

const CATEGORY_EN: Record<string, string> = {
  "תוכנות ומנויים": "Software & Subscriptions",
  "השתלמות ולמידה": "Training & Education",
  "ציוד ומחשוב": "Equipment & Computing",
  "ביטוח לאומי": "National Insurance",
  "אחר": "Other",
  "ייעוץ": "Consulting",
  "עיצוב": "Design",
  "פיתוח": "Development",
  "הדרכה": "Training",
};

export function buildIsraeliPLReport(persona: Persona, pl: PLSummary): IsraeliPLReport {
  const split = splitExpenses(pl.expenseBreakdown);

  const grossProfit = pl.totalRevenue - split.costOfRevenue;
  const operatingProfit = grossProfit - split.operatingExpenses;

  // For a self-employed (patur/morshe), financial expenses are typically
  // bank fees + interest. We don't track those separately in the persona yet,
  // so the line shows 0 but the row exists per Israeli format.
  const financialExpenses = 0;
  const profitBeforeTax = operatingProfit - financialExpenses;
  const incomeTax = estimateIncomeTax(profitBeforeTax, persona.income.year);
  const netProfit = profitBeforeTax - incomeTax;

  const year = persona.income.year ?? new Date().getFullYear() - 1;

  const lines: PLLine[] = [];

  // Revenue section
  lines.push({
    he: "הכנסות משירותים",
    en: "Service Revenue",
    amount: pl.totalRevenue,
    kind: "inflow",
  });
  lines.push({
    he: "סך הכנסות",
    en: "Total Revenue",
    amount: pl.totalRevenue,
    kind: "inflow",
    isSubtotal: true,
  });

  // Cost of revenue
  if (split.costOfRevenue > 0) {
    for (const c of split.costLines) {
      lines.push({
        he: c.category,
        en: CATEGORY_EN[c.category] ?? c.category,
        amount: c.amount,
        kind: "outflow",
      });
    }
    lines.push({
      he: "סך עלות המכר",
      en: "Total Cost of Revenue",
      amount: split.costOfRevenue,
      kind: "outflow",
      isSubtotal: true,
    });
  }

  lines.push({
    he: "רווח גולמי",
    en: "Gross Profit",
    amount: grossProfit,
    kind: "inflow",
    isSubtotal: true,
  });

  // Operating expenses
  for (const o of split.operatingLines) {
    lines.push({
      he: o.category,
      en: CATEGORY_EN[o.category] ?? o.category,
      amount: o.amount,
      kind: "outflow",
    });
  }
  lines.push({
    he: "סך הוצאות תפעוליות",
    en: "Total Operating Expenses",
    amount: split.operatingExpenses,
    kind: "outflow",
    isSubtotal: true,
  });

  lines.push({
    he: "רווח תפעולי",
    en: "Operating Profit",
    amount: operatingProfit,
    kind: "inflow",
    isSubtotal: true,
  });

  // Financial expenses
  lines.push({
    he: "הוצאות מימון",
    en: "Financial Expenses",
    amount: financialExpenses,
    kind: "outflow",
  });

  lines.push({
    he: "רווח לפני מס",
    en: "Profit Before Tax",
    amount: profitBeforeTax,
    kind: "inflow",
    isSubtotal: true,
  });

  lines.push({
    he: "מס הכנסה (הערכה)",
    en: "Income Tax (estimate)",
    amount: incomeTax,
    kind: "outflow",
  });

  lines.push({
    he: "רווח נקי",
    en: "Net Profit",
    amount: netProfit,
    kind: "inflow",
    isSubtotal: true,
  });

  return {
    business: {
      nameHe: persona.business.tradeName || `${persona.personal.firstName} ${persona.personal.lastName}`,
      nameEn: `${persona.personal.firstName} ${persona.personal.lastName}`,
      osekType: persona.business.osekType,
      osekFileNumber: persona.business.osekFileNumber,
      primaryOccupation: persona.business.primaryOccupation,
    },
    period: {
      year,
      label: `1 בינואר – 31 בדצמבר ${year}`,
    },
    lines,
    totals: {
      totalRevenue: pl.totalRevenue,
      costOfRevenue: split.costOfRevenue,
      grossProfit,
      operatingExpenses: split.operatingExpenses,
      operatingProfit,
      financialExpenses,
      profitBeforeTax,
      incomeTax,
      netProfit,
    },
  };
}

/** Format a NIS amount per Israeli style with thousands separator. */
export function formatNIS(amount: number, kind: "inflow" | "outflow"): string {
  const formatted = Math.abs(amount).toLocaleString("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return kind === "outflow" ? `(${formatted})` : formatted;
}
