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
  // Only relevant for עוסק פטור (עוסק זעיר is a sub-registration of patur —
  // same threshold, distinguished only in copy below).
  if (persona.business.osekType !== "patur") return null;

  const TC = getTaxYearConstants(persona.income.year);
  const threshold = TC.osekPaturThreshold;
  const turnover = persona.income.totalRevenue;
  const percent = threshold > 0 ? Math.round((turnover / threshold) * 100) : 0;
  const remaining = Math.max(0, threshold - turnover);
  const year = persona.income.year;
  // Reader-facing category word — a זעיר user reading "עוסק פטור" copy about
  // THEIR OWN registration reads as a typo, not a category they're in
  // (journey-scan/audit finding, 2026-08-18).
  const category = persona.business.isOsekZeir ? "עוסק זעיר" : "עוסק פטור";
  const vatPercent = Math.round(TC.vatRate * 100);

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

  // Every level names the tax year the threshold belongs to (₪120,000 for
  // 2024-2025 vs ₪122,833 from 2026 are BOTH correct — the ambiguity was
  // never in the number, only in which year it applied to; see
  // memory/decisions.md's tax-year model + the 2026-08-18 audit).
  const headlineHe: string = {
    safe: `מחזור ${percent}% מהתקרה — בטווח ${category} (שנת מס ${year})`,
    approaching: `מחזור ${percent}% מהתקרה — מתקרב לגבול (שנת מס ${year})`,
    warning: `${fmt(remaining)} עד תקרת ${category} לשנת ${year}`,
    critical: `קריטי: נותרו ${fmt(remaining)} בלבד לתקרת ${category} לשנת ${year}`,
    exceeded: `חרגת מתקרת ${category} לשנת ${year} — נדרשת רישום כמורשה`,
  }[level];

  const detailHe: string = {
    safe: `המחזור השנתי שלך (${fmt(turnover)}) רחוק מתקרת ${year} (${fmt(threshold)}). אין צורך בפעולה.`,
    approaching: `המחזור שלך (${fmt(turnover)}) מתקרב לתקרת ${category} לשנת ${year} (${fmt(threshold)}). בשלב זה אין חובה, אבל כדאי לעקוב.`,
    warning: `עברת 80% מתקרת ${year}. בדוק/י: האם צפויות הכנסות נוספות השנה? אם כן, התחל/י תהליך העברה לעוסק מורשה.`,
    critical: `${percent}% מתקרת ${category} לשנת ${year} — מכאן כל חשבונית מקרבת חובת עוסק מורשה. הוסף/י מע"מ מיידית כשחורג/ת.`,
    exceeded: `המחזור (${fmt(turnover)}) חורג מתקרת שנת ${year} (${fmt(threshold)}). יש לפנות לרשות המסים לרישום כעוסק מורשה, ולרשום ${vatPercent}% מע"מ על כל חשבונית מרגע החריגה.`,
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
