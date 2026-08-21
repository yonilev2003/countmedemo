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

import { Persona, MikdamotPlan, effectiveDeductibleExpenses } from "@/lib/persona";
import { ils } from "@/lib/utils";
import { calculatePL } from "@/lib/p-and-l/index";
import { estimateTaxLiability } from "@/lib/calculators/index";
import { computeCeilingAlert } from "@/lib/alerts/ceiling";

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
  /** True when persona.income.year is a past/completed tax year relative to
   *  today — the "forecast" then just reports the final actual figure
   *  (monthsElapsed=12), it is not extrapolating anything. */
  yearIsComplete: boolean;
  /** How many months of persona.income.year have elapsed (1-12) — the honest
   *  denominator for a YTD run-rate. 12 whenever the year is complete. */
  monthsElapsed: number;
  /** For an in-progress patur/zeir year projected to cross the turnover
   *  ceiling: the calendar month (1-12, within income.year) the "average"
   *  scenario's run-rate implies the crossing. Null when not patur/zeir,
   *  the year is already complete, or the average projection stays under
   *  the ceiling. */
  projectedCeilingCrossingMonth: number | null;
  /** The advances-plan comparison (task #24) — null when the persona has no
   *  mikdamotPlan on file yet (the UI shows the "create a plan" mini-form). */
  planComparison: PlanComparison | null;
}

const clamp0 = (n: number) => (n > 0 ? n : 0);

/** Months of `year` that have elapsed as of `today` — 12 when `year` is
 *  already in the past (a completed, filed-or-filing year has no "months
 *  remaining" to project), the current month number when `year` is the
 *  present calendar year, and 0 for a not-yet-started future year (never
 *  actually reachable via the wizard's clamped year range, guarded anyway). */
function monthsElapsedInYear(year: number, today: Date = new Date()): number {
  const currentYear = today.getFullYear();
  if (year < currentYear) return 12;
  if (year > currentYear) return 0;
  return today.getMonth() + 1;
}

/** Clone the persona with a hypothetical annual revenue, scaling deductible
 *  expenses to keep the same expense ratio. */
function withProjectedRevenue(persona: Persona, projectedRevenue: number): Persona {
  const actualRevenue = persona.income.totalRevenue || 1;
  const expenseRatio = effectiveDeductibleExpenses(persona.income) / actualRevenue;
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

/** Clone the persona with the PLANNED annual revenue/expenses from a
 *  mikdamotPlan — same expense-ratio fallback as withProjectedRevenue when
 *  the plan doesn't state its own expense figure. */
function withPlannedFigures(
  persona: Persona,
  plannedRevenue: number,
  plannedExpenses?: number,
): Persona {
  const actualRevenue = persona.income.totalRevenue || 1;
  const expenseRatio = effectiveDeductibleExpenses(persona.income) / actualRevenue;
  const expenses =
    plannedExpenses != null ? plannedExpenses : Math.round(plannedRevenue * expenseRatio);
  return {
    ...persona,
    income: {
      ...persona.income,
      totalRevenue: Math.round(plannedRevenue),
      totalDeductibleExpenses: Math.round(expenses),
    },
  };
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

export type SettlementDirection = "due" | "refund" | "even";

/**
 * One year-end שומה settlement estimate: an estimated annual tax figure
 * minus the advances the year is projected to have accumulated by December,
 * on ONE of two bases (see PlanComparison.yearEndSettlement). Positive
 * balance = still owed at settlement (plus הצמדה); negative = refund due
 * (plus הצמדה/ריבית where entitled). This is an ESTIMATE ONLY — it excludes
 * ריביות, הצמדות וקנסות; the UI must always pair it with that disclaimer.
 */
export interface SettlementEstimate {
  estimatedAnnualTax: number;
  projectedAdvances: number;
  balance: number;
  direction: SettlementDirection;
}

/**
 * The advances-plan mechanic (task #24, Yoni 18/08): a filer plans expected
 * annual revenue/expenses (or the Tax Authority sets a rate for them) and
 * pays a MONTHLY ADVANCE accordingly. This compares that plan against the
 * system's own recommendation and what's actually been paid, then estimates
 * where the year is heading.
 */
export interface PlanComparison {
  plan: MikdamotPlan;
  /** plan.monthlyAdvance, or null when the plan doesn't state one (e.g. an
   *  authority-set plan the filer only knows the revenue assumption for). */
  plannedMonthlyAdvance: number | null;
  /** The system-forecast recommended monthly advance (average-basis scenario). */
  recommendedMonthlyAdvance: number;
  /** What's actually been paid so far this year (persona.income.mikdamot). */
  paidSoFar: number;
  /** The monthly rate assumed for the months still remaining this year —
   *  the plan's own monthlyAdvance when set, else the system recommendation. */
  assumedMonthlyAdvanceForRemainder: number;
  /** 12 − monthsElapsed, floored at 0. */
  remainingMonths: number;
  /** paidSoFar + assumedMonthlyAdvanceForRemainder × remainingMonths — the
   *  advances the FULL YEAR is projected to accumulate if the current pace
   *  continues. This (not just paidSoFar) is what a year-end settlement
   *  estimate must compare the annual tax against. */
  projectedTotalAdvances: number;
  yearEndSettlement: {
    /** Estimated tax on the actual-YTD-annualized (average scenario) basis. */
    actualBasis: SettlementEstimate;
    /** Estimated tax on the plan's own revenue/expenses — null when the plan
     *  has no plannedAnnualRevenue to run the tax engine on. */
    planBasis: SettlementEstimate | null;
  };
}

function settlementEstimate(estimatedAnnualTax: number, projectedAdvances: number): SettlementEstimate {
  const tax = Math.round(estimatedAnnualTax);
  const advances = Math.round(projectedAdvances);
  const balance = tax - advances;
  const direction: SettlementDirection = balance > 0 ? "due" : balance < 0 ? "refund" : "even";
  return { estimatedAnnualTax: tax, projectedAdvances: advances, balance, direction };
}

function buildPlanComparison(
  persona: Persona,
  monthsElapsed: number,
  averageScenario: ForecastScenario,
): PlanComparison | null {
  const plan = persona.income.mikdamotPlan;
  if (!plan) return null;

  const paidSoFar = persona.income.mikdamot ?? 0;
  const recommendedMonthlyAdvance = averageScenario.recommendedMonthlyMikdama;
  const plannedMonthlyAdvance = plan.monthlyAdvance ?? null;
  const remainingMonths = Math.max(0, 12 - monthsElapsed);
  const assumedMonthlyAdvanceForRemainder = plannedMonthlyAdvance ?? recommendedMonthlyAdvance;
  const projectedTotalAdvances = paidSoFar + assumedMonthlyAdvanceForRemainder * remainingMonths;

  const actualBasis = settlementEstimate(averageScenario.projectedAdvancesDue, projectedTotalAdvances);

  let planBasis: SettlementEstimate | null = null;
  if (plan.plannedAnnualRevenue != null) {
    const planPersona = withPlannedFigures(persona, plan.plannedAnnualRevenue, plan.plannedAnnualExpenses);
    const est = estimateTaxLiability(planPersona);
    planBasis = settlementEstimate(est.taxAfterCredits, projectedTotalAdvances);
  }

  return {
    plan,
    plannedMonthlyAdvance,
    recommendedMonthlyAdvance,
    paidSoFar,
    assumedMonthlyAdvanceForRemainder,
    remainingMonths,
    projectedTotalAdvances,
    yearEndSettlement: { actualBasis, planBasis },
  };
}

export function buildForecast(persona: Persona, today: Date = new Date()): ForecastResult {
  const pl = calculatePL(persona);
  const active: MonthStat[] = pl.monthlyData
    .filter((m) => m.revenue > 0)
    .map((m) => ({ month: m.month, label: m.label, revenue: m.revenue }));

  // Sort high → low to split strong / weak thirds.
  const sorted = [...active].sort((a, b) => b.revenue - a.revenue);
  const third = Math.max(1, Math.floor(sorted.length / 3));
  const strongMonths = sorted.slice(0, third);
  const weakMonths = sorted.slice(-third);

  const strongRateDated = mean(strongMonths.map((m) => m.revenue));
  const weakRateDated = mean(weakMonths.map((m) => m.revenue));
  const avgRateDated = mean(active.map((m) => m.revenue));
  const hasEnoughData = pl.hasDatedData && active.length >= 3 && strongRateDated > weakRateDated;

  // The honest run-rate anchor: totalRevenue is a YTD figure (baseline +
  // documents, "how much you've earned this year so far" — never a
  // completed-year total on its own), so the denominator must be how many
  // months have actually elapsed, not a blind /12. For a COMPLETED year
  // (income.year in the past) monthsElapsed is 12, so this collapses to
  // exactly totalRevenue with zero extrapolation — no special-casing
  // needed. For an in-progress year this is the fix for the reported bug:
  // ₪119,500 in August (month 8) used to show as "מחזור שנתי צפוי 119,500"
  // (dividing by 12, i.e. a no-op); it now correctly implies a run-rate of
  // ₪119,500/8 ≈ ₪14,937/month → ≈ ₪179,250 for the full year (audit,
  // 2026-08-18).
  const monthsElapsed = Math.max(1, monthsElapsedInYear(persona.income.year, today));
  const yearIsComplete = monthsElapsed >= 12 && persona.income.year < today.getFullYear();
  const anchorRate = (persona.income.totalRevenue || 0) / monthsElapsed;

  // hasEnoughData scenarios: anchor the ABSOLUTE level to the true YTD pace
  // (anchorRate), but keep the REAL strong/weak SHAPE from dated months by
  // applying their ratio to the dated average — instead of using the dated
  // months' absolute mean directly, which silently ignored any undated
  // setup-wizard baseline revenue and could understate the run-rate by a
  // large factor once a few dated months existed alongside a big baseline
  // (audit finding, second bug in the same root cause).
  const sRate = hasEnoughData && avgRateDated > 0 ? anchorRate * (strongRateDated / avgRateDated) : anchorRate;
  const wRate = hasEnoughData && avgRateDated > 0 ? anchorRate * (weakRateDated / avgRateDated) : anchorRate;
  const aRate = anchorRate;

  // Projected ceiling-crossing month (patur/zeir, in-progress year only):
  // at the average run-rate, which month within income.year would
  // cumulative revenue first exceed the threshold? Also covers מורשה-זעיר
  // (Amendment 265, adversarial-review finding 2026-08-20) — this gate used
  // to be patur-only, so a מורשה-זעיר never got a projection at all even
  // though computeCeilingAlert has fully supported them since the reform.
  const isMursheZeirForecast =
    persona.business.osekType === "morshe" && persona.business.isOsekZeir;
  let projectedCeilingCrossingMonth: number | null = null;
  if (!yearIsComplete && (persona.business.osekType === "patur" || isMursheZeirForecast)) {
    const ceiling = computeCeilingAlert(persona);
    if (ceiling && ceiling.level !== "exceeded" && aRate > 0) {
      const monthsToStillEarn = Math.ceil(ceiling.remaining / aRate);
      const crossingMonth = monthsElapsed + monthsToStillEarn;
      if (crossingMonth <= 12) projectedCeilingCrossingMonth = crossingMonth;
    }
  }

  const scenarios = {
    strong: makeScenario(persona, "strong", clamp0(sRate)),
    average: makeScenario(persona, "average", clamp0(aRate)),
    weak: makeScenario(persona, "weak", clamp0(wRate)),
  };

  return {
    hasEnoughData,
    activeMonths: active.sort((a, b) => a.month - b.month),
    strongMonths,
    weakMonths,
    scenarios,
    paidMikdamot: persona.income.mikdamot ?? 0,
    yearIsComplete,
    monthsElapsed,
    projectedCeilingCrossingMonth,
    planComparison: buildPlanComparison(persona, monthsElapsed, scenarios.average),
  };
}

export type PlanVsActualTone = "ok" | "under" | "over" | "neutral";

export interface PlanVsActual {
  due: number;
  paid: number;
  gap: number; // due - paid; positive = underpaid
  tone: PlanVsActualTone;
  headlineHe: string;
  detailHe: string;
}

/**
 * Compare a chosen scenario's recommended advances against what's been paid.
 *
 * `hasPlan` (Yoni, 18/08): when NOTHING has been paid AND there's no
 * mikdamotPlan on file either, there is no real signal of under-payment —
 * it's just that we don't have data yet. The old copy showed a gap equal to
 * the ENTIRE forecast and called it "תת-תשלום מקדמות צפוי", which reads as an
 * alarm for a brand-new persona that hasn't recorded anything. Once a plan
 * IS on file, paid=0 against it is a real signal again (the plan says
 * advances should be flowing) — so this calm branch only fires when both
 * paid AND hasPlan are absent.
 */
export function planVsActual(
  scenario: ForecastScenario,
  paid: number,
  hasPlan: boolean = false,
): PlanVsActual {
  const due = scenario.projectedAdvancesDue;
  const gap = due - paid;
  // 8% band counts as "on track".
  const band = Math.max(2000, due * 0.08);
  const fmt = (n: number) => ils(Math.abs(Math.round(n)));

  if (paid === 0 && !hasPlan) {
    return {
      due, paid, gap, tone: "neutral",
      headlineHe: "אין עדיין נתוני מקדמות",
      detailHe: `לפי התחזית, מקדמה שנתית של כ-${fmt(due)}. הזנת תשלומי מקדמות תדייק את התמונה.`,
    };
  }

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
