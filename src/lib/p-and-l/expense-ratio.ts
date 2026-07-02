/**
 * Expense-to-revenue ratio + the עוסק זעיר 30% recognition rule.
 *
 * Per תיקון 257 לפקודת מס הכנסה (2024 "green track" reform):
 * a sole proprietor in the עוסק פטור flow can opt into the
 * "מסלול עוסק זעיר" track, which auto-recognises **30% of revenue
 * as expenses** — no need to keep receipts. Sounds great until you
 * realise that real expenses above 30% are simply not deducted.
 *
 * This module is the single source of truth for that logic. Reuse it
 * anywhere we want to surface the trade-off (dashboard, business-
 * expenses, setup, coach, P&L report).
 *
 * Pure functions — no React.
 */

import { Persona } from "@/lib/persona";
import { getTaxYearConstants } from "@/lib/calculators/types";

export type RatioStatus = "below-30" | "around-30" | "30-to-50" | "50-to-80" | "above-80";

export interface ExpenseRatioInsight {
  /** revenue & expenses inputs as-recorded (NIS) */
  totalRevenue: number;
  totalExpenses: number;
  /** ratio of expenses to revenue (0–1, can exceed 1 if losing money) */
  ratio: number;
  /** integer percent, e.g. 47 for 47% */
  ratioPercent: number;
  /** 30% of revenue — the cap under the zeir track */
  zeirCapAmount: number;
  /** what actually gets recognised under zeir (min of real expenses and 30% cap) */
  zeirRecognized: number;
  /** what the zeir track would NOT recognise (positive iff real expenses > 30%) */
  zeirLostDeduction: number;
  /** true iff actualExpenses < cap → zeir is favourable (rare for service businesses with real costs) */
  isZeirFavorable: boolean;
  /** is the persona currently marked as zeir? */
  isMarkedZeir: boolean;
  /** is the persona eligible to be zeir (patur + revenue ≤ 120k)? */
  isZeirEligible: boolean;
  status: RatioStatus;
  /** One-line headline in Hebrew. Different copy for zeir-marked vs not. */
  headlineHe: string;
  /** Longer factual explanation in Hebrew — facts only, no advice verbs (WS8). */
  detailHe: string;
  /** "ok" | "info" | "warn" | "alert" — drives card colour. */
  tone: "ok" | "info" | "warn" | "alert";
}

function statusFromRatio(ratioPercent: number): RatioStatus {
  if (ratioPercent < 25) return "below-30";
  if (ratioPercent < 35) return "around-30";
  if (ratioPercent < 50) return "30-to-50";
  if (ratioPercent < 80) return "50-to-80";
  return "above-80";
}

export function computeExpenseRatio(persona: Persona): ExpenseRatioInsight {
  // Year-keyed: the זעיר recognition rate AND the revenue ceiling come from the
  // persona's tax year — never the module-level baseline constants (which would
  // silently show 120,000 for a 2026 persona that should see 122,833).
  const TC = getTaxYearConstants(persona.income.year);
  const recognitionRate = TC.osekZeirExpenseRate;
  const revenueCeiling = TC.osekZeirThreshold;

  const totalRevenue = persona.income.totalRevenue || 0;
  const totalExpenses = persona.income.totalDeductibleExpenses || 0;
  const ratio = totalRevenue > 0 ? totalExpenses / totalRevenue : 0;
  const ratioPercent = Math.round(ratio * 100);

  const zeirCapAmount = Math.round(totalRevenue * recognitionRate);
  const zeirRecognized = Math.min(totalExpenses, zeirCapAmount);
  const zeirLostDeduction = Math.max(0, totalExpenses - zeirCapAmount);
  const isZeirFavorable = totalExpenses < zeirCapAmount;

  const isMarkedZeir = !!persona.business.isOsekZeir;
  const isZeirEligible =
    persona.business.osekType === "patur" &&
    totalRevenue > 0 &&
    totalRevenue <= revenueCeiling;

  const status = statusFromRatio(ratioPercent);

  // Compose Hebrew copy based on (marked? × ratio status)
  let headlineHe: string;
  let detailHe: string;
  let tone: ExpenseRatioInsight["tone"];

  // Copy is facts-only at source (WS8 audit O8-O10) — numbers, no advice verbs.
  // Any consumer of this lib renders it as-is; no render-layer neutralizing.
  if (isMarkedZeir) {
    if (isZeirFavorable) {
      tone = "ok";
      headlineHe = `יחס הוצאות ${ratioPercent}% — מסלול זעיר משתלם לך`;
      detailHe = `ההוצאות שלך (${totalExpenses.toLocaleString("he-IL")} ₪) נמוכות מסף ה-30% (${zeirCapAmount.toLocaleString("he-IL")} ₪) — זעיר מכיר לך ${zeirCapAmount.toLocaleString("he-IL")} ₪, יותר מ-${totalExpenses.toLocaleString("he-IL")} ₪ ההוצאות שצברת בפועל.`;
    } else {
      tone = "alert";
      headlineHe = `יחס הוצאות ${ratioPercent}% — את מפסידה במסלול זעיר`;
      detailHe = `הוצאותיך (${totalExpenses.toLocaleString("he-IL")} ₪) גבוהות מסף ה-30% (${zeirCapAmount.toLocaleString("he-IL")} ₪). במסלול זעיר יוכרו ${zeirRecognized.toLocaleString("he-IL")} ₪ בלבד; ${zeirLostDeduction.toLocaleString("he-IL")} ₪ מעבר לתקרה לא ייכללו בחישוב המסלול. בדיווח רגיל מוכרות ההוצאות בפועל.`;
    }
  } else if (isZeirEligible && isZeirFavorable) {
    tone = "info";
    headlineHe = `יחס הוצאות ${ratioPercent}% — מתחת לסף מסלול זעיר`;
    detailHe = `הוצאותיך נמוכות מ-30% מהמחזור. במסלול זעיר מוכרים ${zeirCapAmount.toLocaleString("he-IL")} ₪ (30% מהמחזור); ההוצאות שדיווחת: ${totalExpenses.toLocaleString("he-IL")} ₪.`;
  } else {
    // not marked, not favorable — just a healthy informational summary
    if (status === "below-30") {
      tone = "ok";
      headlineHe = `יחס הוצאות נמוך (${ratioPercent}%)`;
      detailHe = `ההוצאות שלך נמוכות יחסית להכנסות — שולי רווח רחבים. ודאי שלא פספסת הוצאות לגיטימיות לפני ההגשה.`;
    } else if (status === "around-30") {
      tone = "info";
      headlineHe = `יחס הוצאות סביר (${ratioPercent}%)`;
      detailHe = `יחס בריא לרוב העסקים הקטנים. ההוצאות שלך מוכרות במלואן בדיווח רגיל.`;
    } else if (status === "30-to-50") {
      tone = "info";
      headlineHe = `יחס הוצאות תקין (${ratioPercent}%)`;
      detailHe = `יחס סטנדרטי לעסק שירותים עם הוצאות תוכנה/ציוד/לימודים. ההוצאות שלך מוכרות במלואן.`;
    } else if (status === "50-to-80") {
      tone = "warn";
      headlineHe = `יחס הוצאות גבוה (${ratioPercent}%)`;
      detailHe = `שולי הרווח שלך דקים. בדקי אם חלק מההוצאות הן הון (השקעה חד-פעמית שיש לפחת על-פני שנים), לא הוצאה שוטפת.`;
    } else {
      tone = "alert";
      headlineHe = `יחס הוצאות חריג (${ratioPercent}%)`;
      detailHe = `ההוצאות עולות על 80% מההכנסות — אם זה לא טעות בדיווח, רשות המסים נוטה לבדיקה ביחסים חריגים.`;
    }
  }

  return {
    totalRevenue,
    totalExpenses,
    ratio,
    ratioPercent,
    zeirCapAmount,
    zeirRecognized,
    zeirLostDeduction,
    isZeirFavorable,
    isMarkedZeir,
    isZeirEligible,
    status,
    headlineHe,
    detailHe,
    tone,
  };
}
