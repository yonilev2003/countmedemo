/**
 * עוסק פטור / מחזור שנתי — threshold alert.
 *
 * The ceiling is read PER TAX YEAR from getTaxYearConstants(year) — 120,000 ₪
 * for 2024–2025, 122,833 ₪ from 2026 (CPI-indexed). For an עוסק פטור, exceeding
 * it triggers mandatory עוסק מורשה registration. Shows at 80 / 90 / 100%
 * milestones; the component handles display.
 *
 * MURSHE-ZEIR (Amendment 265, verified 2026-08-19): מסלול עוסק זעיר is an
 * INCOME-TAX-ONLY track, gated purely on turnover — independent of VAT
 * registration. An עוסק מורשה marked isOsekZeir gets this SAME alert (same
 * threshold/levels), but with distinct copy: crossing the ceiling costs them
 * the מסלול זעיר income-tax eligibility, NOT VAT registration (they're
 * already registered and already charge VAT). A plain (non-זעיר) מורשה has
 * no turnover ceiling and still gets null.
 *
 * FP-07 (2026-08-19): optional `year` param, default persona.income.year —
 * every existing call site is unaffected. When a DIFFERENT year is
 * requested, the setup-wizard baseline (persona.income.totalRevenue)
 * contributes 0 turnover (it describes the declared year only) and only
 * revenue documents dated in the requested year count — same scoping rule
 * as dashboard/summary.ts's computeYearSummary; kept as a local duplicate
 * per this module's ownership boundary, not a cross-module import.
 *
 * Pure function — no React.
 */

import { Persona } from "@/lib/persona";
import { ils } from "@/lib/utils";
import { getTaxYearConstants } from "@/lib/calculators/types";
import { isRevenueDoc } from "@/lib/invoice-generator";

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

/** True when an ISO date's year matches `year` — local copy of the same
 *  convention p-and-l/index.ts's isInTaxYear / dashboard/summary.ts's
 *  isInYear use (module-ownership boundaries keep this a duplicate). */
function isInYear(iso: string, year: number): boolean {
  return iso.startsWith(String(year));
}

export function computeCeilingAlert(
  persona: Persona,
  year: number = persona.income.year,
): CeilingAlert | null {
  // A plain (non-זעיר) עוסק מורשה has no turnover ceiling here. Everyone
  // else does: every עוסק פטור (זעיר sub-registration or not — same
  // threshold, distinguished only in copy below) AND an עוסק מורשה marked
  // isOsekZeir (MURSHE-ZEIR, Amendment 265 — verified 2026-08-19).
  const isMursheZeir = persona.business.osekType === "morshe" && persona.business.isOsekZeir;
  if (persona.business.osekType !== "patur" && !isMursheZeir) return null;

  const TC = getTaxYearConstants(year);
  const threshold = persona.business.isOsekZeir ? TC.osekZeirThreshold : TC.osekPaturThreshold;
  const isDeclaredYear = year === persona.income.year;
  // FP-07: the baseline scalar describes ONLY the declared year — for any
  // other requested year, sum only revenue docs dated in that year instead
  // (baseline contributes 0), same rule as computeYearSummary.
  const turnover = isDeclaredYear
    ? persona.income.totalRevenue
    : Math.round(
        (persona.income.invoices ?? [])
          .filter((inv) => isRevenueDoc(inv.docType) && isInYear(inv.date, year))
          .reduce((sum, inv) => sum + inv.amount, 0) * 100,
      ) / 100;
  const percent = threshold > 0 ? Math.round((turnover / threshold) * 100) : 0;
  const remaining = Math.max(0, threshold - turnover);
  // Reader-facing category word — a זעיר user reading "עוסק פטור" copy about
  // THEIR OWN registration reads as a typo, not a category they're in
  // (journey-scan/audit finding, 2026-08-18). Applies whether the זעיר
  // track sits on top of a פטור or (MURSHE-ZEIR) a מורשה registration.
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
  //
  // MURSHE-ZEIR gets its OWN copy from "warning" onward: a plain/patur-זעיר
  // filer who crosses this ceiling must register as עוסק מורשה AND start
  // charging VAT — but a murshe-זעיר is already registered and already
  // charges VAT, so those two instructions would be actively wrong for them.
  // What they actually lose is the מסלול זעיר income-tax eligibility itself.
  const headlineHe: string = isMursheZeir
    ? {
        safe: `מחזור ${percent}% מהתקרה — בטווח מסלול ${category} (שנת מס ${year})`,
        approaching: `מחזור ${percent}% מהתקרה — מתקרב לגבול מסלול ${category} (שנת מס ${year})`,
        warning: `${fmt(remaining)} עד תקרת מסלול ${category} לשנת ${year}`,
        critical: `קריטי: נותרו ${fmt(remaining)} בלבד לתקרת מסלול ${category} לשנת ${year}`,
        exceeded: `חרגת מתקרת מסלול ${category} לשנת ${year} — מסלול ${category} כבר לא זמין`,
      }[level]
    : {
        safe: `מחזור ${percent}% מהתקרה — בטווח ${category} (שנת מס ${year})`,
        approaching: `מחזור ${percent}% מהתקרה — מתקרב לגבול (שנת מס ${year})`,
        warning: `${fmt(remaining)} עד תקרת ${category} לשנת ${year}`,
        critical: `קריטי: נותרו ${fmt(remaining)} בלבד לתקרת ${category} לשנת ${year}`,
        exceeded: `חרגת מתקרת ${category} לשנת ${year} — נדרשת רישום כמורשה`,
      }[level];

  const detailHe: string = isMursheZeir
    ? {
        safe: `המחזור השנתי שלך (${fmt(turnover)}) רחוק מתקרת מסלול ${category} ל-${year} (${fmt(threshold)}). אין צורך בפעולה.`,
        approaching: `המחזור שלך (${fmt(turnover)}) מתקרב לתקרת מסלול ${category} לשנת ${year} (${fmt(threshold)}). בשלב זה אין חובה, אבל כדאי לעקוב.`,
        warning: `עברת 80% מתקרת מסלול ${category} ל-${year}. חריגה מהתקרה לא נוגעת לרישום המע"מ שלך (את/ה כבר עוסק מורשה וגובה/ת מע"מ כרגיל) — היא שוללת את הזכאות למסלול ${category} בדיווח מס ההכנסה (30% הוצאות אוטומטיות).`,
        critical: `${percent}% מתקרת מסלול ${category} לשנת ${year} — מכאן כל חשבונית מקרבת אובדן זכאות למסלול ${category} במס הכנסה. אין השפעה על הרישום כעוסק מורשה או על גביית המע"מ.`,
        exceeded: `המחזור (${fmt(turnover)}) חורג מתקרת מסלול ${category} לשנת ${year} (${fmt(threshold)}). מעתה יש לדווח את הכנסת העסק לפי הוצאות בפועל (לא 30% אוטומטי) — הרישום כעוסק מורשה והמע"מ שאת/ה כבר גובה/ת אינם משתנים.`,
      }[level]
    : {
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
