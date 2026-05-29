/**
 * Forward-looking forecast for advance payments (מקדמות) — task #9.
 *
 * Pure functions, no React. Builds on the existing engines:
 *   - calculatePL(persona)          → real monthly revenue breakdown
 *   - estimateTaxLiability(persona) → annual tax-after-credits (= the advances a
 *                                      full year of this income should cover)
 *
 * The product question (Yoni, from the working session): "based on the past,
 * look forward — plan vs actual of advances; and if some months were stronger
 * or weaker, ask whether to project on a strong month or a weak month."
 *
 * So we annualise the observed monthly revenue under three bases — strong /
 * average / weak — re-run the tax engine on each projection, and compare the
 * recommended annual advances against what the user has actually paid so far
 * (persona.income.mikdamot). The UI lets the user flip the basis.
 */

import { Persona } from "@/lib/persona";
import { calculatePL } from "@/lib/p-and-l/index";
import { estimateTaxLiability } from "@/lib/calculators/index";

export type ForecastBasis = "strong" | "average" | "weak";

export interface MonthStat {
  month: number; // 1-12
  label: string;
  revenue: number;
}

export interface ForecastScenario {
  basis: ForecastBasis;
  /** Projected revenue per month under this basis. */
  monthlyRunRate: number;
  /** Run-rate × 12 — the annual revenue this basis implies. */
  projectedAnnualRevenue: number;
  projectedTaxableIncome: number;
  /** Annual tax after credits = the advances a full year should cover. */
  projectedAdvancesDue: number;
  /** projectedAdvancesDue / 12. */
  recommendedMonthlyMikdama: number;
}

export interface ForecastResult {
  /** False when there isn't enough real dated month data to tell months apart. */
  hasEnoughData: boolean;
  activeMonths: MonthStat[];
  strongMonths: MonthStat[];
  weakMonths: MonthStat[];
  scenarios: Record<ForecastBasis, ForecastScenario>;
  /** What the user has actually paid in advances so far. */
  paidMikdamot: number;
}

const clamp0 = (n: number) => (n > 0 ? n : 0);

/** Clone the persona with a hypothetical annual revenue, scaling deductible
 *  expenses to keep the same expense ratio. */
function withProjectedRevenue(persona: Persona, projectedRevenue: number): Persona {
  const actualRevenue = persona.income.totalRevenue || 1;
  const expenseRatio = persona.income.totalDeductibleExpenses / actualRevenue;
  return {
    ...persona,
    income: {
      ...persona.income,
      totalRevenue: Math.round(projectedRevenue),
      totalDeductibleExpenses: Math.round(projectedRevenue * expenseRatio),
    },
  };
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

function makeScenario(persona: Persona, basis: ForecastBasis, runRate: number): ForecastScenario {
  const projectedAnnualRevenue = Math.round(runRate * 12);
  // Single tax-engine run on the projected persona (reused for both figures).
  const est = estimateTaxLiability(withProjectedRevenue(persona, projectedAnnualRevenue));
  return {
    basis,
    monthlyRunRate: Math.round(runRate),
    projectedAnnualRevenue,
    projectedTaxableIncome: est.taxableIncome,
    projectedAdvancesDue: est.taxAfterCredits,
    recommendedMonthlyMikdama: Math.round(est.taxAfterCredits / 12),
  };
}

export function buildForecast(persona: Persona): ForecastResult {
  const pl = calculatePL(persona);
  const active: MonthStat[] = pl.monthlyData
    .filter((m) => m.revenue > 0)
    .map((m) => ({ month: m.month, label: m.label, revenue: m.revenue }));

  // Sort high → low to split strong / weak thirds.
  const sorted = [...active].sort((a, b) => b.revenue - a.revenue);
  const third = Math.max(1, Math.floor(sorted.length / 3));
  const strongMonths = sorted.slice(0, third);
  const weakMonths = sorted.slice(-third);

  // Enough data to distinguish months: real dated data + at least 3 active months
  // whose strong/weak run-rates actually differ.
  const strongRate = mean(strongMonths.map((m) => m.revenue));
  const weakRate = mean(weakMonths.map((m) => m.revenue));
  const avgRate = mean(active.map((m) => m.revenue));
  const hasEnoughData = pl.hasDatedData && active.length >= 3 && strongRate > weakRate;

  // Fallback when we can't tell months apart: use the even annual run-rate so the
  // projection still equals the actual annual figure.
  const evenRate = (persona.income.totalRevenue || 0) / 12;
  const sRate = hasEnoughData ? strongRate : evenRate;
  const wRate = hasEnoughData ? weakRate : evenRate;
  const aRate = hasEnoughData ? avgRate : evenRate;

  return {
    hasEnoughData,
    activeMonths: active.sort((a, b) => a.month - b.month),
    strongMonths,
    weakMonths,
    scenarios: {
      strong: makeScenario(persona, "strong", clamp0(sRate)),
      average: makeScenario(persona, "average", clamp0(aRate)),
      weak: makeScenario(persona, "weak", clamp0(wRate)),
    },
    paidMikdamot: persona.income.mikdamot ?? 0,
  };
}

export type PlanVsActualTone = "ok" | "under" | "over";

export interface PlanVsActual {
  due: number;
  paid: number;
  gap: number; // due - paid; positive = underpaid
  tone: PlanVsActualTone;
  headlineHe: string;
  detailHe: string;
}

/** Compare a chosen scenario's recommended advances against what's been paid. */
export function planVsActual(scenario: ForecastScenario, paid: number): PlanVsActual {
  const due = scenario.projectedAdvancesDue;
  const gap = due - paid;
  // 8% band counts as "on track".
  const band = Math.max(2000, due * 0.08);
  const fmt = (n: number) => `${Math.abs(Math.round(n)).toLocaleString("he-IL")} ₪`;

  if (Math.abs(gap) <= band) {
    return {
      due, paid, gap, tone: "ok",
      headlineHe: "המקדמות בקנה אחד עם התחזית",
      detailHe: `שולמו ${fmt(paid)} מתוך תחזית של ${fmt(due)} — בטווח התקין.`,
    };
  }
  if (gap > 0) {
    return {
      due, paid, gap, tone: "under",
      headlineHe: "תת-תשלום מקדמות צפוי",
      detailHe: `לפי התחזית חסרים כ-${fmt(gap)} — שקול/י להגדיל את המקדמה כדי להימנע מהפרש לתשלום בסוף השנה.`,
    };
  }
  return {
    due, paid, gap, tone: "over",
    headlineHe: "עודף תשלום מקדמות צפוי",
    detailHe: `שולמו כ-${fmt(-gap)} מעבר לתחזית — ייתכן החזר, או שניתן להקטין את המקדמה הבאה.`,
  };
}
