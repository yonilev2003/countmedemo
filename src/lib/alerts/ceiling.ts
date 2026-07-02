/**
 * עוסק פטור / מחזור שנתי — threshold alert.
 *
 * The ceiling is read PER TAX YEAR from getTaxYearConstants(persona.income.year)
 * — 120,000 ₪ for 2024–2025, 122,833 ₪ from 2026 (CPI-indexed). Exceeding it
 * triggers mandatory עוסק מורשה registration. Shows at 80 / 90 / 100% milestones;
 * the component handles display.
 *
 * Pure function — no React.
 */

import { Persona } from "@/lib/persona";
import { ils } from "@/lib/utils";
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

  // Level from EXACT figures, not the display-rounded percent: 119,999 ₪ is
  // 99.999% (rounds to 100) but has NOT exceeded the ceiling. "Exceeded" means
  // strictly above the ceiling — the ceiling itself is still within עוסק פטור.
  let level: CeilingLevel;
  if (turnover > threshold) level = "exceeded";
  else if (turnover * 10 >= threshold * 9) level = "critical"; // ≥90%
  else if (turnover * 10 >= threshold * 8) level = "warning"; // ≥80%
  else if (turnover * 10 >= threshold * 6) level = "approaching"; // ≥60%
  else level = "safe";

  const fmt = ils;

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
    exceeded: `המחזור (${fmt(turnover)}) חורג מ-${fmt(threshold)}. יש לפנות לרשות המסים לרישום כעוסק מורשה, ולרשום 18% מע"מ על כל חשבונית מרגע החריגה.`,
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
