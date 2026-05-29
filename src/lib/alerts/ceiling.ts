/**
 * עוסק פטור / מחזור שנתי — threshold alert.
 *
 * 2024 ceiling: 120,000 NIS. Exceeding it triggers mandatory morshe registration.
 * Shows at 80 / 90 / 100% milestones; component handles display.
 *
 * Pure function — no React.
 */

import { Persona } from "@/lib/persona";
import { getTaxYearConstants } from "@/lib/calculators/types";

export type CeilingLevel = "safe" | "approaching" | "warning" | "critical" | "exceeded";

export interface CeilingAlert {
  turnover: number;
  threshold: number;
  percent: number;
  remaining: number;
  level: CeilingLevel;
  headlineHe: string;
  detailHe: string;
  /** "ok" | "info" | "warn" | "alert" — drives card colour. */
  tone: "ok" | "info" | "warn" | "alert";
}

export function computeCeilingAlert(persona: Persona): CeilingAlert | null {
  // Only relevant for עוסק פטור
  if (persona.business.osekType !== "patur") return null;

  const TC = getTaxYearConstants(persona.income.year);
  const threshold = TC.osekPaturThreshold;
  const turnover = persona.income.totalRevenue;
  const percent = threshold > 0 ? Math.round((turnover / threshold) * 100) : 0;
  const remaining = Math.max(0, threshold - turnover);

  let level: CeilingLevel;
  if (percent >= 100) level = "exceeded";
  else if (percent >= 90) level = "critical";
  else if (percent >= 80) level = "warning";
  else if (percent >= 60) level = "approaching";
  else level = "safe";

  const fmt = (n: number) => `${n.toLocaleString("he-IL")} ₪`;

  const headlineHe: string = {
    safe: `מחזור ${percent}% מהתקרה — בטווח עוסק פטור`,
    approaching: `מחזור ${percent}% מהתקרה — מתקרב לגבול`,
    warning: `${fmt(remaining)} עד תקרת עוסק פטור`,
    critical: `קריטי: נותרו ${fmt(remaining)} בלבד לתקרה`,
    exceeded: `חרגת מתקרת עוסק פטור — נדרשת רישום כמורשה`,
  }[level];

  const detailHe: string = {
    safe: `המחזור השנתי שלך (${fmt(turnover)}) רחוק מהתקרה (${fmt(threshold)}). אין צורך בפעולה.`,
    approaching: `המחזור שלך (${fmt(turnover)}) מתקרב לתקרת עוסק פטור (${fmt(threshold)}). בשלב זה אין חובה, אבל כדאי לעקוב.`,
    warning: `עברת 80% מהתקרה. בדוק/י: האם צפויות הכנסות נוספות השנה? אם כן, התחל/י תהליך העברה לעוסק מורשה.`,
    critical: `90% מהתקרה — מכאן כל חשבונית מקרבת חובת עוסק מורשה. הוסף/י מע"מ מיידית כשחורג/ת.`,
    exceeded: `המחזור (${fmt(turnover)}) חורג מ-${fmt(threshold)}. יש לפנות לרשות המסים לרישום כעוסק מורשה, ולרשום 17% מע"מ על כל חשבונית מרגע החריגה.`,
  }[level];

  const tone: CeilingAlert["tone"] = {
    safe: "ok",
    approaching: "info",
    warning: "warn",
    critical: "alert",
    exceeded: "alert",
  }[level] as CeilingAlert["tone"];

  return { turnover, threshold, percent, remaining, level, headlineHe, detailHe, tone };
}
