/**
 * Year-keyed registry of deductions & benefits — the connective tissue between
 * the four things that must move together when the regulator updates a year:
 *
 *   tax constants (calculators/types.ts)  ─ rate/cap come from here, never hardcoded
 *        │
 *        ▼
 *   DeductionDef ──► formFields   : which Form 1301 codes the item feeds
 *               ──► plImpact      : how it flows through the P&L report
 *               ──► skill         : the domain skill that owns the rule (knowledge source)
 *
 * Consumed by business-expenses/profiles.ts (the user-facing expense guide) so
 * the percentages and ceilings shown there are always the year's real values,
 * and so each expense visibly maps to the form field + report line it affects.
 *
 * To support a new tax year: add it to calculators/types.ts — this table reads
 * from getTaxYearConstants(year), so the rates/caps update automatically.
 */

import { getTaxYearConstants } from "@/lib/calculators/types";

/** How a recognised item is treated for income-tax purposes. */
export type DeductionRule =
  | "full" // 100% recognised expense
  | "partial" // partial recognition (see ratePercent)
  | "depreciation"; // capital expenditure, depreciated over years

/** Where an item lands in the annual reports / calculations. */
export type PLImpact =
  | "cost-of-revenue" // direct cost — above gross profit in the P&L
  | "operating-expense" // operating overhead — reduces business income (field 150)
  | "deduction-from-income" // ניכוי — reduces taxable income
  | "tax-credit"; // זיכוי — reduces tax directly

export interface DeductionDef {
  id: string;
  /** Hebrew label. */
  he: string;
  rule: DeductionRule;
  /** Percent recognised (resolved from the year's constants for "partial"). */
  ratePercent?: number;
  /** Annual cap in NIS, resolved from the year's constants where applicable. */
  capNis?: number;
  /** Useful life in years for capital ("depreciation") items. */
  depreciationYears?: number;
  /** Form 1301 field codes this item feeds. */
  formFields: string[];
  /** How the item flows through the annual reports. */
  plImpact: PLImpact;
  /** Domain skill that owns this rule — consult it before changing the logic. */
  skill: string;
}

/** Round a 0–1 rate to a clean percent (0.045 → 4.5, 0.52 → 52). */
const pct = (rate: number) => Math.round(rate * 1000) / 10;

/**
 * The deductions & benefits in scope for the demo, resolved for a given year.
 * Rates/caps come from getTaxYearConstants — change a year there and every
 * downstream consumer (expense guide, calculators, reports) follows.
 */
export function getDeductionsTable(year: number): DeductionDef[] {
  const TC = getTaxYearConstants(year);
  return [
    {
      id: "bituach-leumi",
      he: "ביטוח לאומי לעצמאי",
      rule: "partial",
      ratePercent: pct(TC.bituachLeumiDeductibleRate),
      formFields: ["030", "048"],
      plImpact: "deduction-from-income",
      skill: "israeli-bituach-leumi",
    },
    {
      id: "keren-hishtalmut",
      he: "קרן השתלמות לעצמאי",
      rule: "partial",
      ratePercent: pct(TC.kerenHishtalmutRate),
      capNis: TC.kerenHishtalmutCap,
      formFields: ["137"],
      plImpact: "deduction-from-income",
      skill: "israeli-tax-returns",
    },
    {
      id: "pension",
      he: "הפקדות לפנסיה",
      rule: "full",
      capNis: TC.pensionDeductionCap,
      formFields: ["135"],
      plImpact: "deduction-from-income",
      skill: "israeli-tax-returns",
    },
    {
      id: "internet-phone",
      he: "אינטרנט וטלפון נייד",
      rule: "partial",
      ratePercent: 80, // recognition convention for mixed business/personal use
      formFields: ["150"],
      plImpact: "operating-expense",
      skill: "israeli-expense-categorizer",
    },
    {
      id: "vehicle",
      he: "רכב",
      rule: "partial",
      // Flat convention rate for a single business-use vehicle (skill:
      // israeli-expense-categorizer — "car expenses at 45%"); a second
      // vehicle is 0% unless proven business-essential, not modelled here.
      // risk-gap.md §7.4 #2: this category previously had NO registry entry
      // at all, so every vehicle expense was silently counted as 100%.
      ratePercent: 45,
      formFields: ["150"],
      plImpact: "operating-expense",
      skill: "israeli-expense-categorizer",
    },
    {
      id: "professional-services",
      he: "ייעוץ מקצועי",
      rule: "full",
      formFields: ["150"],
      plImpact: "operating-expense",
      skill: "israeli-expense-categorizer",
    },
  ];
}

/** Look up a single deduction definition for a year by id. */
export function getDeduction(id: string, year: number): DeductionDef | undefined {
  return getDeductionsTable(year).find((d) => d.id === id);
}

/* ──────────────────────────────────────────────────────────────────────────
 * Expense-category → P&L routing.
 *
 * The P&L report (lib/p-and-l/israeli-report.ts) needs to know where each
 * expense lands: a direct cost, operating overhead, or a personal deduction
 * applied below the business result. That destination is the item's plImpact,
 * so the registry is the authority. A free-text expense category is matched to
 * a registered deduction via a short alias list, and the matched item's
 * declared plImpact wins. Categories the registry doesn't own fall back to the
 * cost-vs-operating heuristic for a service business.
 * ────────────────────────────────────────────────────────────────────────── */

/** Free-text expense-category nouns → a registered deduction id. */
const CATEGORY_DEDUCTION_ALIASES: { id: string; match: string[] }[] = [
  { id: "bituach-leumi", match: ["ביטוח לאומי", "בטוח לאומי"] },
  { id: "keren-hishtalmut", match: ["קרן השתלמות", "השתלמות לעצמאי"] },
  { id: "pension", match: ["פנסיה", "קופת גמל", "קופ״ג", "גמל"] },
  { id: "internet-phone", match: ["אינטרנט", "טלפון", "סלולר", "תקשורת"] },
  { id: "professional-services", match: ["ייעוץ", "רואה חשבון", "עורך דין", "יועץ מס", "רו״ח"] },
  { id: "vehicle", match: ["רכב", "דלק", "תדלוק", "חניה", "ביטוח רכב", "טסט"] },
];

/**
 * KNOWN, DELIBERATELY UNMODELLED GAP (risk-gap.md §7.4 #2): home-office
 * expenses ("משרד ביתי") are recognised at the ratio of the home area actually
 * used for business — a per-user fraction, not a fixed percentage — and
 * Persona has no square-footage/ratio field to compute it from today. Adding
 * a flat rate here would repeat exactly the kind of fabricated-number bug
 * this registry exists to prevent, so home-office is intentionally left OFF
 * this alias list — it falls through to the generic operating-expense/100%
 * default below, same as before this fix, until a ratio-input feature exists.
 */

/** Category nouns that mark a direct cost of revenue (capital / equipment). */
const COST_OF_REVENUE_HINTS = ["ציוד ומחשוב", "ציוד", "מחשוב", "equipment"];

export interface ExpensePLRouting {
  plImpact: PLImpact;
  /**
   * Statutorily recognised fraction of the recorded amount, taken from the
   * matched deduction's rule/ratePercent (1 for full or unmatched categories).
   * The P&L uses this so a partial deduction-from-income item reduces the
   * taxable base only by its deductible portion — e.g. ביטוח לאומי לעצמאי is
   * 52% deductible, not 100%.
   */
  recognizedRate: number;
}

/**
 * Resolve how an expense category flows through the P&L. Registry-owned items
 * inherit their declared plImpact and deductible fraction; everything else uses
 * the service-business heuristic (equipment = direct cost, otherwise operating
 * overhead) at full recognition.
 */
export function classifyExpensePLImpact(category: string, year: number): ExpensePLRouting {
  const alias = CATEGORY_DEDUCTION_ALIASES.find((a) =>
    a.match.some((m) => category.includes(m)),
  );
  if (alias) {
    const def = getDeduction(alias.id, year);
    if (def) {
      const recognizedRate =
        def.rule === "partial" && def.ratePercent != null ? def.ratePercent / 100 : 1;
      return { plImpact: def.plImpact, recognizedRate };
    }
  }
  const lower = category.toLowerCase();
  const plImpact: PLImpact = COST_OF_REVENUE_HINTS.some((h) =>
    lower.includes(h.toLowerCase()),
  )
    ? "cost-of-revenue"
    : "operating-expense";
  return { plImpact, recognizedRate: 1 };
}

/** Hebrew label for a P&L impact — used by the expense guide. */
export const PL_IMPACT_LABEL: Record<PLImpact, string> = {
  "cost-of-revenue": "עלות המכר",
  "operating-expense": "מקטין הכנסה חייבת",
  "deduction-from-income": "ניכוי מההכנסה",
  "tax-credit": "זיכוי ממס",
};
