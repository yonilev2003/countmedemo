/**
 * P&L calculation functions for the dashboard.
 * Pure functions — no React, no side effects.
 *
 * Note on monthlyBreakdown: the Persona type declares it as
 * `{ month: string; revenue: number; expenses: number }[]`
 * where month is an ISO year-month string like "2024-01".
 */

import { Persona } from "@/lib/persona";

export interface MonthlyPL {
  month: number; // 1-12
  label: string; // "ינו׳", "פבר׳", etc.
  revenue: number;
  expenses: number;
  net: number;
}

export interface PLSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  expenseBreakdown: { category: string; amount: number }[];
  monthlyData: MonthlyPL[];
}

const MONTH_LABELS = [
  "ינו׳",
  "פבר׳",
  "מרץ",
  "אפר׳",
  "מאי",
  "יוני",
  "יולי",
  "אוג׳",
  "ספט׳",
  "אוק׳",
  "נוב׳",
  "דצמ׳",
];

export function calculatePL(persona: Persona): PLSummary {
  const totalRevenue = persona.income.totalRevenue;
  const totalExpenses = persona.income.totalDeductibleExpenses;
  const netProfit = totalRevenue - totalExpenses;

  // Monthly data — use monthlyBreakdown if available, otherwise distribute evenly.
  // monthlyBreakdown.month is a string like "2024-01" (ISO year-month).
  const monthlyData: MonthlyPL[] = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    // Match "YYYY-MM" where MM is the 1-indexed month (zero-padded)
    const mb = persona.income.monthlyBreakdown?.find((m) => {
      const monthStr = String(m.month);
      // Handle both numeric months (legacy) and ISO "YYYY-MM" strings
      if (typeof m.month === "number") return m.month === monthNum;
      // Extract month from "YYYY-MM" format
      const parts = monthStr.split("-");
      return parts.length === 2 && parseInt(parts[1], 10) === monthNum;
    });
    const rev = mb?.revenue ?? Math.round(totalRevenue / 12);
    const exp = mb?.expenses ?? Math.round(totalExpenses / 12);
    return {
      month: monthNum,
      label: MONTH_LABELS[i],
      revenue: rev,
      expenses: exp,
      net: rev - exp,
    };
  });

  // Expense breakdown by category — use line items if available, else rough demo split.
  let expenseBreakdown: { category: string; amount: number }[] = [];
  if (persona.income.expenses && persona.income.expenses.length > 0) {
    const byCategory: Record<string, number> = {};
    for (const exp of persona.income.expenses) {
      byCategory[exp.category] = (byCategory[exp.category] ?? 0) + exp.amount;
    }
    expenseBreakdown = Object.entries(byCategory).map(([category, amount]) => ({
      category,
      amount,
    }));
  } else {
    // Default rough split for demo when no expense lines exist
    expenseBreakdown = [
      {
        category: "תוכנות ומנויים",
        amount: Math.round(totalExpenses * 0.25),
      },
      {
        category: "השתלמות ולמידה",
        amount: Math.round(totalExpenses * 0.15),
      },
      { category: "ציוד ומחשוב", amount: Math.round(totalExpenses * 0.3) },
      { category: "ביטוח לאומי", amount: Math.round(totalExpenses * 0.2) },
      { category: "אחר", amount: Math.round(totalExpenses * 0.1) },
    ];
  }

  return { totalRevenue, totalExpenses, netProfit, expenseBreakdown, monthlyData };
}

export function filterByQuarter(
  data: MonthlyPL[],
  quarter: 1 | 2 | 3 | 4,
): MonthlyPL[] {
  const start = (quarter - 1) * 3 + 1;
  return data.filter((m) => m.month >= start && m.month <= start + 2);
}
