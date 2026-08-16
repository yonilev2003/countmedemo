/**
 * Calculator engines for the eight "star fields" of Form 1301.
 *
 * Each engine is a pure function. Named after the field code so they're easy
 * to look up against the live form. The israeli-tax-returns skill defines
 * the rules; tomorrow we'll cross-check against it before going live.
 */

import { Persona } from "@/lib/persona";
import {
  Calculator,
  CalcResult,
  TaxEstimate,
  getTaxYearConstants,
  miluimCreditPoints,
  miluimServiceYear,
  MILUIM_CREDIT_FIRST_YEAR,
  MILUIM_CREDIT_POINT_VALUE,
} from "./types";
import { capitalCalculators } from "./capital";
import { ils } from "@/lib/utils";

export type { CalcResult, TaxEstimate } from "./types";

/* ──────────────────────────────────────────────────────────────────────────
 * Shared credit-point helpers — ONE source of truth for nekudot zikui so the
 * form fields, the tax estimate, and the setup wizard cannot drift. Each
 * returns a precise point count (not a boolean), prorated where the law
 * prorates. Owned by israeli-tax-returns. (Accuracy audit 2026-06.)
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Combat reserve days that feed the miluim credit on the persona's FILING year.
 * The credit in tax year N is based on days served in N-1 (תיקון 283), so we read
 * reserveDaysByYear[N-1].combatDays, falling back to the legacy single-year
 * `combatReserveDays` field, then 0.
 */
function combatReserveDaysForFiling(p: Persona): number {
  const serviceYear = String(miluimServiceYear(p.income.year));
  const entry = p.personal.reserveDaysByYear?.[serviceYear];
  if (entry) return entry.combatDays ?? 0;
  return p.personal.combatReserveDays ?? 0;
}

/** Base resident points: female 2.75, male 2.25 (israeli-tax-returns). */
function residentCreditPoints(p: Persona): number {
  const TC = getTaxYearConstants(p.income.year);
  // Female gets the bonus over the male base; TC.residentCreditPoints is the male base.
  return p.personal.gender === "female"
    ? TC.residentCreditPoints + TC.femaleResidentBonusPoints
    : TC.residentCreditPoints;
}

/**
 * Discharged-soldier credit points for the given tax year, PRORATED by the
 * number of eligible months that fall within that year.
 *
 * Rule (israeli-tax-returns / kolzchut, סעיף 67/39א): 1/6 point per eligible
 * month for full service (men 23+, women 22+ months) or 1/12 for partial
 * qualifying service (12–22 months), for the 36 months starting the month AFTER
 * discharge. The discharge year and the year the window closes are partial.
 *
 * Needs the discharge date to locate the eligibility window. When the date is
 * missing we fall back to a full tax year of eligibility (12 months) so the
 * demo still shows a sensible figure, and the caller surfaces the assumption.
 */
function soldierCreditPoints(p: Persona): number {
  if (!p.personal.isSoldierDischarged) return 0;
  const TC = getTaxYearConstants(p.income.year);
  const year = p.income.year;

  // Per-month fraction depends on service length. Absent → assume full service.
  const months = p.personal.soldierServiceMonths;
  const fullThreshold =
    p.personal.gender === "female"
      ? TC.soldierFullServiceMonthsFemale
      : TC.soldierFullServiceMonthsMale;
  const perMonth =
    months != null && months < fullThreshold
      ? TC.soldierReducedFractionPerMonth
      : TC.soldierFractionPerMonth;

  const eligibleMonths = soldierEligibleMonthsInYear(
    p.personal.soldierDischargeDate,
    year,
    TC.soldierMonthsCredit,
  );
  return round2(eligibleMonths * perMonth);
}

/**
 * How many of the 36 eligibility months fall inside the given tax year.
 * The window opens the month AFTER discharge and runs `windowMonths` months.
 * Returns 12 (a full year) when the discharge date is unknown.
 */
function soldierEligibleMonthsInYear(
  dischargeDate: string | null | undefined,
  year: number,
  windowMonths: number,
): number {
  if (!dischargeDate) return 12; // unknown date → assume a full eligible year
  const d = new Date(dischargeDate);
  if (Number.isNaN(d.getTime())) return 12;

  // Eligibility starts the first day of the month after discharge.
  const startMonthIndex = d.getFullYear() * 12 + d.getMonth() + 1; // +1 = next month
  const endMonthIndex = startMonthIndex + windowMonths - 1; // inclusive last month

  // The tax year spans these absolute month indices.
  const yearStart = year * 12 + 0; // January
  const yearEnd = year * 12 + 11; // December

  const overlapStart = Math.max(startMonthIndex, yearStart);
  const overlapEnd = Math.min(endMonthIndex, yearEnd);
  return Math.max(0, overlapEnd - overlapStart + 1);
}

/** Child credit points by age within the tax year (israeli-tax-returns). */
function childCreditPoints(p: Persona): number {
  const year = p.income.year;
  const bands = getTaxYearConstants(year).childCreditPointsByAge;
  let pts = 0;
  for (const c of p.personal.children ?? []) {
    const age = year - c.birthYear;
    if (age < 0) continue;
    if (age === 0) pts += bands.bornDuringYear;
    else if (age >= 1 && age <= 5) pts += bands.age1to5;
    else if (age >= 6 && age <= 17) pts += bands.age6to17;
    else if (age === 18) pts += bands.age18;
  }
  return pts;
}

/** New-immigrant credit is date-windowed; without an aliyah date we can't
 * place the year, so this returns the year-1 rate as a conservative display
 * value only when flagged. The tax estimate uses this same helper. */
function newOlehCreditPoints(p: Persona): number {
  if (!p.personal.isNewResident) return 0;
  const TC = getTaxYearConstants(p.income.year);
  // Without an aliyah date we cannot tell which of the 3 benefit years applies.
  // Default to year-1 (3.0) as the headline figure; FLAG via the calculator.
  return TC.newOlehCreditYear1;
}

/** Round to 2 decimals (credit points are quoted to 1/4 / 1/12 granularity). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Total nekudot zikui for the persona in its tax year — the SINGLE aggregation
 * used by the tax estimate. Resident + soldier (prorated) + children + oleh +
 * miluim (2026+). Academic-degree points are intentionally excluded here
 * (handled as a separate field with its own eligibility window).
 */
export function totalCreditPoints(p: Persona): number {
  return round2(
    residentCreditPoints(p) +
      soldierCreditPoints(p) +
      childCreditPoints(p) +
      newOlehCreditPoints(p) +
      miluimCreditPoints(p.income.year, combatReserveDaysForFiling(p)),
  );
}

/** Breakdown of the §46 donations credit — shared by fields 045/046 and the tax estimate. */
export interface DonationsCredit {
  /** Donations paid: current year + carried from prior years. */
  total: number;
  /** §46 floor for the persona's tax year (below it → no credit). */
  minimum: number;
  /** Ceiling: 30% of taxable income (the ~9.35M ₪ absolute cap is not modelled). */
  ceiling: number;
  /** The recognised amount after floor + ceiling. */
  recognized: number;
  /** The credit: recognised × 35%. */
  credit: number;
}

/**
 * Canonical §46 donations credit — ONE implementation so the two form fields and
 * the tax estimate cannot drift (they previously re-implemented 35%/floor 3×).
 * Rules (kolzchut, verified 2026-07-02): 35% of recognised donations; floor
 * 207 ₪ (2024–2025); ceiling = 30% of taxable income.
 */
export function computeDonationsCredit(p: Persona): DonationsCredit {
  const TC = getTaxYearConstants(p.income.year);
  const total =
    p.deductionsAndCredits.donations.currentYear +
    (p.deductionsAndCredits.donations.carriedFromPriorYears ?? 0);
  const ceiling = Math.round(
    computeTaxableIncome(p) * TC.donationsCreditIncomeCeilingRate,
  );
  const recognized =
    total >= TC.donationsCreditMinimum ? Math.min(total, ceiling) : 0;
  const credit = Math.round(recognized * TC.donationsCreditPercent);
  return { total, minimum: TC.donationsCreditMinimum, ceiling, recognized, credit };
}

/* ============================================================
 * שדה 150 — מיגיעה אישית מעסק או משלח יד
 * עוסק זעיר: 70% מהמחזור (30% מוכרים אוטומטית כהוצאות)
 * רגיל: מחזור פחות הוצאות מוכרות
 * ============================================================ */
export const field150BusinessIncome: Calculator = (p) => {
  const TC = getTaxYearConstants(p.income.year);
  if (p.business.isOsekZeir) {
    const revenue = p.income.totalRevenue;
    const value = Math.round(revenue * (1 - TC.osekZeirExpenseRate));
    return {
      value,
      formula: `מסלול עוסק זעיר: מחזור ${ils(revenue)} × ${Math.round((1 - TC.osekZeirExpenseRate) * 100)}% = ${ils(value)}`,
      sources: [
        {
          label: `${p.income.invoiceCount} חשבוניות בשנת ${p.income.year}`,
          detail: "מסלול מקוצר — 30% מהמחזור מוכרים אוטומטית כהוצאות",
        },
      ],
      confidence: "high",
      notes: [
        "ה-30% המוכרים אוטומטית כוללים את הוצאות הביטוח הלאומי — לא ניתן לנכות בנוסף בשדה 030.",
        "לא ניתן לדרוש הפסדים מועברים במסלול זה.",
      ],
    };
  }

  const value = p.income.totalRevenue - p.income.totalDeductibleExpenses;
  return {
    value,
    formula: `סה"כ הכנסות (${ils(p.income.totalRevenue)}) − הוצאות מוכרות (${ils(
      p.income.totalDeductibleExpenses,
    )}) = ${ils(value)}`,
    sources: [
      {
        label: `${p.income.invoiceCount} חשבוניות שהוצאת בשנת ${p.income.year}`,
        detail: 'מתוך ספרי החשבונות (לחץ לראות פירוט)',
      },
      {
        label: `${p.income.expenseCount} הוצאות מוכרות`,
        detail: 'אחרי קטלוג ע"י israeli-expense-categorizer (תקרות וניכויים חלקיים יושמו)',
      },
    ],
    confidence: "high",
    notes: [
      'שדה 150 הוא ההכנסה מהעסק לפני ניכויים אישיים. הניכויים האישיים (קרן השתלמות שדה 137, ביטוח לאומי 52% שדה 030, פנסיה סעיף 47) מקטינים את ההכנסה החייבת בשדות נפרדים — ראה אומדן המס.',
      'תרומות (סעיף 46) והפקדות פנסיה (סעיף 45א) הם זיכויים מהמס עצמו, לא ניכוי מההכנסה.',
    ],
  };
};

/* ============================================================
 * שדות 238 ו-294 — סך מחזור עסקי (ללא מע"מ)
 * שני השדות מכילים את אותו ערך - הצלבת אימות
 * ============================================================ */
export const field238Turnover: Calculator = (p) => {
  return {
    value: p.income.totalRevenue,
    formula: `סכום כל החשבוניות שלך מ-1.1 עד 31.12 (לפני ניכוי הוצאות, ללא מע"מ)`,
    sources: [
      {
        label: `${p.income.invoiceCount} חשבוניות בשנת ${p.income.year}`,
        detail: "מצורף פירוט חודשי",
      },
    ],
    confidence: "high",
    notes: [
      "אותו ערך גם בשדה 294 (מחזור למקדמות, ניכויים במקור).",
    ],
  };
};

/* ============================================================
 * שדה 030 — ניכוי בגין תשלומי ביטוח לאומי לעצמאי
 * רגיל: 52% מהתשלום מותר בניכוי
 * עוסק זעיר: לא ניתן — כלול ב-30% ההוצאות האוטומטיות
 * ============================================================ */
export const field030BituachLeumi: Calculator = (p) => {
  const TC = getTaxYearConstants(p.income.year);
  if (p.business.isOsekZeir) {
    return {
      value: false,
      formula: 'מסלול עוסק זעיר: ניכוי הב"ל כלול ב-30% ההוצאות האוטומטיות — לא ניתן לנכות בנוסף',
      sources: [{ label: 'business.isOsekZeir = true' }],
      confidence: "high",
      notes: ['ה-48% הנותרים מדמי הביטוח הלאומי אינם מוכרים — לא כניכוי ולא כזיכוי (סעיף 47א).'],
    };
  }

  const paid = p.deductionsAndCredits.bituachLeumiSelfEmployed.annualPaid;
  const deductible = Math.round(paid * TC.bituachLeumiDeductibleRate);
  return {
    value: deductible,
    formula: `${ils(paid)} (סה"כ ב"ל ששולם) × 52% = ${ils(deductible)} (חלק מותר בניכוי)`,
    sources: [
      {
        label: 'תקבולים מהמוסד לביטוח לאומי',
        detail: 'מבוסס על שובר שנתי / חיובים בכרטיס אשראי',
      },
    ],
    confidence: "high",
    notes: [
      "רק 52% מדמי הביטוח הלאומי מוכרים כניכוי מההכנסה (סעיף 47א). ה-48% הנותרים אינם מוכרים — לא כניכוי ולא כזיכוי. (תוקן ביוני 2026.)",
      "מס בריאות אינו מוכר כלל — הניכוי חל על דמי ביטוח לאומי בלבד.",
    ],
  };
};

/* ============================================================
 * שדה 137 — קרן השתלמות לעצמאים
 * ניכוי עד 4.5% מההכנסה, תקרת ניכוי מוכר 13,203 ₪ (2024–2026, מוקפא)
 * תקרת הפקדה לפטור ממס רווחי הון: 20,520 ₪ (2024–2025) / 20,566 ₪ (2026) — נקרא מקבוע השנה
 * ============================================================ */
export const field137KerenHishtalmut: Calculator = (p) => {
  const TC = getTaxYearConstants(p.income.year);
  const contribution = p.deductionsAndCredits.kerenHishtalmut.annualContribution;
  const income = computeBusinessIncome(p);
  const incomeBased = Math.round(
    Math.min(income, TC.kerenHishtalmutIncomeCeiling) *
      TC.kerenHishtalmutRate,
  );
  const allowed = Math.min(contribution, incomeBased, TC.kerenHishtalmutCap);
  return {
    value: allowed,
    formula: `min(הפקדה ${ils(contribution)}, ${Math.round(TC.kerenHishtalmutRate * 100)}% × min(הכנסה, תקרה ${ils(TC.kerenHishtalmutIncomeCeiling)}) = ${ils(incomeBased)}, תקרת ניכוי ${ils(TC.kerenHishtalmutCap)}) = ${ils(allowed)}`,
    sources: [{ label: "אישור הפקדה שנתי מקרן ההשתלמות" }],
    confidence: "high",
    notes: [
      `תקרת הפקדה לפטור ממס רווחי הון: ${ils(TC.kerenExemptDepositCap)} (ניתן להפקיד יותר מהחלק המוכר).`,
      ...(contribution > allowed ? [`הסכום הנותר (${ils(contribution - allowed)}) אינו מוכר כהוצאה אך גדל פטור ממס.`] : []),
    ],
  };
};

/* ============================================================
 * שדה 020 — נקודת זיכוי תושב
 * אישה: 2.75 נקודות, גבר: 2.25 נקודות
 * ============================================================ */
export const field020Resident: Calculator = (p) => {
  const TC = getTaxYearConstants(p.income.year);
  const points = residentCreditPoints(p);
  return {
    value: true,
    formula: `${points} נקודות זיכוי × ${ils(TC.pointValueAnnual)} = ${ils(
      Math.round(points * TC.pointValueAnnual),
    )} זיכוי שנתי`,
    sources: [
      {
        label: `סטטוס תושב ישראל (${p.personal.gender === "female" ? "אישה" : "גבר"}: ${points} נקודות)`,
      },
    ],
    confidence: "high",
  };
};

/* ============================================================
 * שדה 044 — עולה חדש
 * שלוש שנים ראשונות: 1/4 + 1/6 + 1/12 נקודות זיכוי לשנה
 * FLAG(Roy) — אימות-רשת 2026-07-03 (~81–91%, מתחת ל-95%): תיקון 262 (עלייה מ-1.1.2022)
 * החליף את המסלול השנתי במסלול חודשי — 54 חודשים / 8.5 נק': חודשים 1–12 ב-1/12,
 * 13–30 ב-1/4 (18 חודשים), 31–42 ב-1/6, 43–54 ב-1/12. זהה ל-2025 ול-2026 (נקבע לפי
 * מועד העלייה, לא שנת המס). לא מיושם — דנה אינה עולה (אפס השפעה על הדמו); ממתין לאישור Roy.
 * ============================================================ */
export const field044OlehHadash: Calculator = (p) => {
  if (!p.personal.isNewResident) {
    return {
      value: false,
      formula: 'לא רלוונטי — אין סטטוס "עולה חדש"',
      sources: [{ label: "person.isNewResident = false" }],
      confidence: "high",
    };
  }
  return {
    value: true,
    formula:
      '1/4 + 1/6 + 1/12 נקודות זיכוי בשלוש השנים הראשונות (לפי "תקופת ההסתגלות")',
    sources: [{ label: "תאריך עלייה במרשם האוכלוסין" }],
    confidence: "medium",
  };
};

/* ============================================================
 * שדה 068 — חייל משוחרר
 * 1/6 נקודת זיכוי לכל חודש זכאות (שירות מלא: גבר 23+, אישה 22+ חודשים) =
 * 2 נקודות לשנת זכאות מלאה, או 1/12 לחודש לשירות חלקי (12–22 חודשים).
 * הזכאות ל-36 חודשים מהחודש שאחרי השחרור; שנת השחרור ושנת סיום החלון יחסיות.
 * ============================================================ */
export const field068Soldier: Calculator = (p) => {
  if (!p.personal.isSoldierDischarged) {
    return {
      value: false,
      formula: "לא בעל/ת זכאות לזיכוי חייל משוחרר",
      sources: [{ label: "personal.isSoldierDischarged = false" }],
      confidence: "high",
    };
  }
  const TC = getTaxYearConstants(p.income.year);
  const months = p.personal.soldierServiceMonths;
  const fullThreshold =
    p.personal.gender === "female"
      ? TC.soldierFullServiceMonthsFemale
      : TC.soldierFullServiceMonthsMale;
  const isFull = months == null || months >= fullThreshold;
  const perMonthLabel = isFull ? "1/6" : "1/12";
  const eligibleMonths = soldierEligibleMonthsInYear(
    p.personal.soldierDischargeDate,
    p.income.year,
    TC.soldierMonthsCredit,
  );
  const points = soldierCreditPoints(p);
  const dateKnown = !!p.personal.soldierDischargeDate;

  const notes: string[] = [];
  if (months == null) {
    notes.push("לא הוזן אורך שירות — חושב לפי שירות מלא (1/6 נקודה לחודש). הזן/י אורך שירות לדיוק.");
  }
  if (!dateKnown) {
    notes.push("לא הוזן תאריך שחרור — חושבה שנת זכאות מלאה (12 חודשים). הזן/י תאריך שחרור לחישוב יחסי מדויק.");
  }

  return {
    value: points > 0,
    formula:
      `${perMonthLabel} נקודה × ${eligibleMonths} חודשי זכאות בשנת ${p.income.year} = ` +
      `${points} נקודות זיכוי (${ils(Math.round(points * TC.pointValueAnnual))})`,
    sources: [
      {
        label: dateKnown
          ? `תאריך שחרור: ${p.personal.soldierDischargeDate}`
          : "תאריך שחרור משירות סדיר",
        detail: isFull ? "שירות מלא — 2 נקודות לשנת זכאות מלאה" : "שירות חלקי — נקודה אחת לשנת זכאות מלאה",
      },
    ],
    confidence: dateKnown ? "high" : "medium",
    notes: notes.length ? notes : undefined,
  };
};

/* ============================================================
 * זיכוי נקודות למשרתי מילואים (לוחמים) — תיקון 283
 * הזיכוי בשנת מס N מבוסס על ימי המילואים שבוצעו בשנה הקודמת (N-1).
 * רלוונטי משנת המס 2026 (בגין מילואים 2025) ואילך.
 * סולם בסיס: 30–39 ימים → 0.5 · 40–49 → 0.75 · 50 → 1.0,
 * ועוד 0.25 לכל 5 ימים מעל 50, עד תקרה של 4.0 נקודות (110 ימים).
 * ============================================================ */
export const fieldMiluimCredit: Calculator = (p) => {
  const year = p.income.year;
  const serviceYear = miluimServiceYear(year);
  const days = combatReserveDaysForFiling(p);

  // Pre-2026 return: no active credit line. If days were recorded for THIS year
  // (which feeds the NEXT year's return), surface a forward-looking forecast so
  // the user can plan cash-flow — value, not just a passive note.
  if (year < MILUIM_CREDIT_FIRST_YEAR) {
    const nextYear = year + 1;
    const daysThisYear = p.personal.reserveDaysByYear?.[String(year)]?.combatDays ?? 0;
    const forecastPoints = miluimCreditPoints(nextYear, daysThisYear);
    const notes = ["ההטבה אושרה בכנסת ב-19.11.2025 וחלה על שנות המס 2026–2027 (בגין שירות 2025–2026)."];
    if (forecastPoints > 0) {
      notes.unshift(
        `צפי לדוח ${nextYear}: על בסיס ${daysThisYear} ימי מילואים כלוחם ב-${year} מחכה לך זיכוי של ` +
          `${forecastPoints} נק' (${ils(Math.round(forecastPoints * MILUIM_CREDIT_POINT_VALUE))}).`,
      );
    }
    return {
      value: false,
      formula: `זיכוי מילואים חל משנת המס ${MILUIM_CREDIT_FIRST_YEAR} ואילך — לא רלוונטי לדוח ${year}`,
      sources: [{ label: "תיקון 283 — תחילה משנת המס 2026" }],
      confidence: "high",
      notes,
    };
  }

  const points = miluimCreditPoints(year, days);
  if (points === 0) {
    return {
      value: false,
      formula:
        days > 0
          ? `${days} ימי מילואים (${serviceYear}) < סף מינימלי (30 ימים) — אין זיכוי`
          : `לא הוזנו ימי מילואים כלוחם לשנת השירות ${serviceYear}`,
      sources: [{ label: `ימי מילואים כלוחם ${serviceYear}`, detail: days > 0 ? `${days} ימים` : "0" }],
      confidence: "high",
      notes: [`נדרשים לפחות 30 ימי מילואים כלוחם בשנת ${serviceYear} לקבלת הזיכוי בדוח ${year}.`],
    };
  }

  return {
    value: true,
    formula: `${days} ימי מילואים כלוחם (${serviceYear}) → ${points} נק' זיכוי בדוח ${year} (${ils(Math.round(points * MILUIM_CREDIT_POINT_VALUE))})`,
    sources: [{ label: `ימי מילואים כלוחם בשנת ${serviceYear}`, detail: `${days} ימים` }],
    confidence: "high",
    notes: [
      "סולם 2026–2027: 30–39=0.5 · 40–49=0.75 · 50=1.0 · +0.25 לכל 5 ימים מעל 50, עד 4.0 (110 ימים).",
      "מדרגת-כניסה מקלה של 20 ימים תחל רק בשנת המס 2028 (לא 2027) — לא ממודלת כאן; 2026–2027 משתמשות בסולם הבסיס בלבד.",
    ],
  };
};

/* ============================================================
 * שדה 297 — חייב/לא חייב בטופס 6111
 * חייב כשהמחזור (ללא מע"מ) > הסף השנתי: 254,237 ₪ ב-2025/2026 (=300,000 כולל מע"מ ÷ 1.18), 256,410 ₪ ב-2024 (17%). נקרא מקבועי השנה.
 * ============================================================ */
export const field297Form6111: Calculator = (p) => {
  const turnover = p.income.totalRevenue;
  const TC = getTaxYearConstants(p.income.year);
  const required = turnover > TC.form6111Threshold;
  return {
    value: required ? "חייב בטופס 6111" : "לא חייב",
    formula: `מחזור ${ils(turnover)} ${
      required ? ">" : "<"
    } סף ${ils(TC.form6111Threshold)} → ${
      required ? "חייב" : "לא חייב"
    }`,
    sources: [{ label: "מחזור שנתי כפי שחושב בשדה 238" }],
    confidence: "high",
    notes: required
      ? ["טופס 6111 דורש דוח מאזן ורווח-והפסד מסודר. יידרש מסמך נוסף."]
      : [`חיסכון: לא תידרש להגיש טופס 6111 השנה. שמור מרווח של ${ils(
          TC.form6111Threshold - turnover,
        )} עד הסף.`],
  };
};

/* ============================================================
 * ביטוח לאומי לעצמאי — אין "זיכוי 48%"
 * תוקן ביוני 2026: בניגוד למה שהוצג קודם, אין זיכוי ממס בגין 48% מדמי הביטוח
 * הלאומי. סעיף 47א מתיר ניכוי של 52% בלבד מההכנסה (שדה 030); ה-48% הנותרים
 * אינם מוכרים — לא כניכוי ולא כזיכוי. אומדן המס כבר אינו זוקף זיכוי זה.
 * נשמר רק לתאימות לאחור עם הסכמה והקוראים הקיימים; הערך הוא 0.
 * מקורות: claltax (סעיף 47א), prisha, kolzchut — אומת 2026-06.
 * ============================================================ */
export const field048BituachLeumiCredit: Calculator = (p) => {
  const paid = p.deductionsAndCredits.bituachLeumiSelfEmployed.annualPaid;
  return {
    value: 0,
    formula: 'אין זיכוי ממס בגין ביטוח לאומי. רק 52% ממנו מוכרים כניכוי מההכנסה (שדה 030); ה-48% הנותרים אינם מוכרים כלל.',
    sources: [
      {
        label: 'תקבולים מהמוסד לביטוח לאומי',
        detail: `מתוך ${ils(paid)} ששולמו — 52% נוכו בשדה 030, ו-48% אינם מקנים הטבה.`,
      },
    ],
    confidence: "high",
    notes: ['שונה מהגרסה הקודמת שהציגה בטעות "זיכוי 48%". אין סעיף כזה בפקודה.'],
  };
};

/* ============================================================
 * שדה 045 — זיכוי בגין תרומות מוכרות (סעיף 46)
 * 35% מהתרומות למוסדות מוכרים; מינימום ותקרה נקראים מקבועי השנה
 * ============================================================ */
export const field045Donations: Calculator = (p) => {
  const current = p.deductionsAndCredits.donations.currentYear;
  const carried = p.deductionsAndCredits.donations.carriedFromPriorYears ?? 0;
  const d = computeDonationsCredit(p);
  if (d.recognized === 0) {
    return {
      value: 0,
      formula: `תרומות ${ils(d.total)} < מינימום ${ils(d.minimum)} — אין זיכוי`,
      sources: [{ label: 'תרומות שנת המס' }],
      confidence: "high",
    };
  }
  const capped = d.recognized < d.total;
  return {
    value: d.credit,
    formula: `${ils(d.recognized)} × 35% = ${ils(d.credit)}`,
    sources: [
      {
        label: `תרומות ${ils(current)} (שנה שוטפת)${carried > 0 ? ` + ${ils(carried)} (מועבר משנה קודמת)` : ""}`,
        detail: 'למוסדות מוכרים לפי סעיף 46 בלבד',
      },
    ],
    confidence: "high",
    notes: [
      'שמור קבלות תרומות. רלוונטי למוסדות שקיבלו אישור מרשות המסים.',
      ...(capped
        ? [`הוכר ${ils(d.recognized)} מתוך ${ils(d.total)} — תקרת הזיכוי היא 30% מההכנסה החייבת; היתרה ניתנת להעברה לשנים הבאות.`]
        : []),
    ],
  };
};

/* ============================================================
 * שדה 072 — זיכוי בגין פרמיית ביטוח חיים (סעיף 45א(א)(1))
 * 25% מהפרמיה ששולמה; לא רלוונטי אם פרמיה = 0
 * תוקן 2026-07: השיעור הקודם (5%) היה שגוי — הזיכוי הוא 25% מהפרמיה
 * (חוזר מס הכנסה 19/2004, kolzchut). תקרת הפרמיה המזכה לפי 45א טרם
 * ממודלת — FLAG(Roy).
 * ============================================================ */
export const field072LifeInsurance: Calculator = (p) => {
  const TC = getTaxYearConstants(p.income.year);
  const premium = p.deductionsAndCredits.lifeInsurancePremium ?? 0;
  if (!premium || premium === 0) {
    return {
      value: false,
      formula: 'לא רלוונטי — אין פרמיית ביטוח חיים בנתוני הלקוח',
      sources: [{ label: 'deductionsAndCredits.lifeInsurancePremium = 0' }],
      confidence: "high",
    };
  }
  const ratePct = Math.round(TC.lifeInsuranceCreditRate * 100);
  const credit = Math.round(premium * TC.lifeInsuranceCreditRate);
  return {
    value: credit,
    formula: `${ils(premium)} × ${ratePct}% = ${ils(credit)} זיכוי`,
    sources: [{ label: 'פרמיית ביטוח חיים (סעיף 45א)', detail: 'שמור את הפוליסה ואישורי תשלום שנתיים' }],
    confidence: "medium",
    notes: [`הזיכוי: ${ratePct}% מהפרמיה ששולמה. קיימת תקרת פרמיה מזכה לפי סעיף 45א שטרם משוקללת כאן — בפרמיות גבוהות הזיכוי בפועל עשוי להיות נמוך יותר.`],
  };
};

/* ============================================================
 * שדה 032 — הכנסות מריבית/דיבידנד ממוסד כספי
 * ============================================================ */
export const field032FinancialInstitution: Calculator = (p) => {
  const income = p.income.financialInstitutionsIncome ?? 0;
  return {
    value: income,
    formula: "הכנסות ריבית/דיבידנד ממוסד כספי",
    sources: [{ label: "הכנסות ממוסד כספי", detail: income === 0 ? "לא צוינו הכנסות" : String(income) }],
    confidence: "high",
    notes: income === 0 ? ["לא צוינו הכנסות ממוסדות כספיים"] : undefined,
  };
};

/* ============================================================
 * שדה 112 — ניכוי ביטוח אובדן כושר עבודה
 * 100% ניכוי מהפרמיה ששולמה
 * ============================================================ */
export const field112LossOfWorkCapacity: Calculator = (p) => {
  const premium = p.deductionsAndCredits.lossOfWorkCapacityPremium ?? 0;
  return {
    value: premium,
    formula: "פרמיית ביטוח אובדן כושר עבודה — 100% ניכוי",
    sources: [{ label: "ביטוח אובדן כושר עבודה", detail: premium === 0 ? "לא הוזנה פרמיה" : `${ils(premium)} פרמיה שנתית` }],
    confidence: "high",
  };
};

/* ============================================================
 * שדה 135 — הפקדות לקופת גמל לקיצבה
 * ============================================================ */
export const field135KupatGemel: Calculator = (p) => {
  const amount = p.deductionsAndCredits.kupatGemel.annualContribution;
  return {
    value: amount,
    formula: "הפקדות לקופ״ג — לפי הסכום שהופקד",
    sources: [{ label: "קופת גמל", detail: `${ils(amount)} הופקד` }],
    confidence: "high",
  };
};

/* ============================================================
 * שדה 181 — נקודת זיכוי בגין תואר אקדמי
 * ============================================================ */
export const field181AcademicDegree: Calculator = (p) => {
  const TC = getTaxYearConstants(p.income.year);
  const year = p.personal.academicDegreeYear;
  const creditValue = TC.pointValueAnnual;
  const value = year ? creditValue : 0;
  return {
    value,
    formula: year
      ? `תואר אקדמי (${year}) — נקודת זיכוי אחת = ${creditValue.toLocaleString("he-IL")} ₪`
      : "אין תואר אקדמי",
    sources: year
      ? [{ label: `תואר אקדמי ${year}`, detail: `${ils(value)} זיכוי` }]
      : [{ label: "personal.academicDegreeYear = null" }],
    confidence: "high",
  };
};

/* ============================================================
 * שדה 037 — תרומות — סכום ששולם השנה
 * ============================================================ */
export const field037DonationsCurrent: Calculator = (p) => {
  const amount = p.deductionsAndCredits.donations.currentYear;
  return {
    value: amount,
    formula: "תרומות שנתיות — ייכנסו לחישוב הזיכוי בשדה 046",
    sources: [{ label: "תרומות השנה", detail: ils(amount) }],
    confidence: "high",
  };
};

/* ============================================================
 * שדה 046 — זיכוי ממס על תרומות (35%)
 * ============================================================ */
export const field046DonationsCredit: Calculator = (p) => {
  const current = p.deductionsAndCredits.donations.currentYear;
  const carried = p.deductionsAndCredits.donations.carriedFromPriorYears ?? 0;
  const d = computeDonationsCredit(p);
  return {
    value: d.credit,
    formula: `${ils(d.recognized)} × 35% = ${ils(d.credit)} זיכוי`,
    sources: [
      { label: "תרומות השנה", detail: ils(current) },
      { label: "תרומות מועברות", detail: ils(carried) },
    ],
    confidence: "high",
    notes:
      d.total > 0 && d.recognized === 0
        ? [`סכום תרומות מתחת לסף המינימום (${ils(d.minimum)})`]
        : d.recognized < d.total
          ? [`הוכר ${ils(d.recognized)} מתוך ${ils(d.total)} — תקרת 30% מההכנסה החייבת.`]
          : undefined,
  };
};

/* ============================================================
 * שדה 364 — תרומות — הועברו משנים קודמות
 * ============================================================ */
export const field364DonationsCarried: Calculator = (p) => {
  const amount = p.deductionsAndCredits.donations.carriedFromPriorYears ?? 0;
  return {
    value: amount,
    formula: "תרומות שהועברו משנים קודמות",
    sources: [{ label: "תרומות מועברות", detail: ils(amount) }],
    confidence: "high",
  };
};

/* ============================================================
 * שדה 042 — מקדמות ששולמו השנה
 * ============================================================ */
export const field042Mikdamot: Calculator = (p) => {
  const amount = p.income.mikdamot ?? 0;
  return {
    value: amount,
    formula: "מקדמות מס הכנסה ששולמו במהלך השנה",
    sources: [{ label: "מקדמות", detail: ils(amount) }],
    confidence: "high",
  };
};

/* ============================================================
 * שדה 115 — ניכוי מס במקור
 * ============================================================ */
export const field115TaxWithheld: Calculator = (p) => {
  const amount = p.income.taxWithheldAtSource ?? 0;
  return {
    value: amount,
    formula: "ניכוי מס במקור שבוצע על ידי לקוחות",
    sources: [{ label: "ניכוי במקור", detail: amount === 0 ? "לא בוצע ניכוי במקור" : ils(amount) }],
    confidence: "high",
  };
};

/** Map of all calculators by their identifier in the form schema. */
export const calculators: Record<string, Calculator> = {
  "field-150-business-income": field150BusinessIncome,
  "field-238-turnover": field238Turnover,
  "field-030-bituach-leumi": field030BituachLeumi,
  "field-032-financial-institution": field032FinancialInstitution,
  "field-042-mikdamot": field042Mikdamot,
  "field-046-donations-credit": field046DonationsCredit,
  "field-048-bituach-leumi-credit": field048BituachLeumiCredit,
  "field-037-donations-current": field037DonationsCurrent,
  "field-045-donations": field045Donations,
  "field-072-life-insurance": field072LifeInsurance,
  "field-112-loss-of-work-capacity": field112LossOfWorkCapacity,
  "field-115-tax-withheld": field115TaxWithheld,
  "field-135-kupat-gemel": field135KupatGemel,
  "field-137-keren-hishtalmut": field137KerenHishtalmut,
  "field-181-academic-degree": field181AcademicDegree,
  "field-020-resident": field020Resident,
  "field-044-oleh-hadash": field044OlehHadash,
  "field-068-soldier": field068Soldier,
  "field-miluim-credit": fieldMiluimCredit,
  "field-297-form-6111": field297Form6111,
  "field-364-donations-carried": field364DonationsCarried,
  // הצהרת הון (Form 1219) — asset/liability subtotals + net capital.
  ...capitalCalculators,
};

/** Run a calculator by its identifier in the form schema. */
export function calculate(
  calculatorId: string,
  persona: Persona,
): CalcResult | null {
  const fn = calculators[calculatorId];
  return fn ? fn(persona) : null;
}

/**
 * Business income (field 150) — the income from business BEFORE personal
 * deductions (B"L 52%, keren, pension). For עוסק זעיר it's 70% of turnover.
 *
 * This is the value the dashboard's "שדה 150" card shows; it is NOT the taxable
 * income (which is after personal deductions — see computeTaxableIncome).
 */
export function computeBusinessIncome(persona: Persona): number {
  const TC = getTaxYearConstants(persona.income.year);
  return persona.business.isOsekZeir
    ? Math.round(persona.income.totalRevenue * (1 - TC.osekZeirExpenseRate))
    : persona.income.totalRevenue - persona.income.totalDeductibleExpenses;
}

/** The recognised personal DEDUCTIONS (reduce taxable income, not tax). */
export interface PersonalDeductions {
  /** Keren hishtalmut (137): min(contribution, 4.5%×min(income,ceiling), cap). */
  keren: number;
  /** Bituach Leumi (030): 52% of paid — 0 for עוסק זעיר (bundled in the 30%). */
  bituachLeumi: number;
  /** Pension Section 47 (135): min(contribution, 11%×income, cap). */
  pension: number;
}

/**
 * Canonical recognised personal deductions for a persona. ONE source of truth so
 * the tax estimate and the P&L report deduct exactly the same recognised
 * amounts (was a source of the dashboard↔P&L divergence). israeli-tax-returns.
 */
export function computePersonalDeductions(persona: Persona): PersonalDeductions {
  const TC = getTaxYearConstants(persona.income.year);
  const businessIncome = computeBusinessIncome(persona);
  const keren = Math.min(
    persona.deductionsAndCredits.kerenHishtalmut.annualContribution,
    Math.round(Math.min(businessIncome, TC.kerenHishtalmutIncomeCeiling) * TC.kerenHishtalmutRate),
    TC.kerenHishtalmutCap,
  );
  // 52% of B"L is the only recognised portion (סעיף 47א). For עוסק זעיר it is
  // already bundled into the automatic 30% expense, so it is NOT deducted again.
  const bituachLeumi = persona.business.isOsekZeir
    ? 0
    : Math.round(
        persona.deductionsAndCredits.bituachLeumiSelfEmployed.annualPaid *
          TC.bituachLeumiDeductibleRate,
      );
  const pension = Math.min(
    persona.deductionsAndCredits.pensionContributions.annualContribution,
    Math.round(businessIncome * TC.pensionDeductionRate),
    TC.pensionDeductionCap,
  );
  return { keren, bituachLeumi, pension };
}

/**
 * Canonical TAXABLE income = business income − recognised personal deductions.
 * This is the single definition the tax estimate AND the P&L report use, so the
 * two surfaces cannot diverge. (Resolves the dashboard↔P&L "הכנסה חייבת" mismatch
 * — Issue 5, audit 2026-06.)
 */
export function computeTaxableIncome(persona: Persona): number {
  const businessIncome = computeBusinessIncome(persona);
  const d = computePersonalDeductions(persona);
  return Math.max(0, businessIncome - d.keren - d.bituachLeumi - d.pension);
}

/** Progressive income tax on a taxable-income figure, for a given year. */
export function grossIncomeTax(taxableIncome: number, year: number): number {
  const TC = getTaxYearConstants(year);
  let tax = 0;
  for (const bracket of TC.taxBrackets) {
    if (taxableIncome <= bracket.from) break;
    const upper = bracket.to === Infinity ? taxableIncome : bracket.to;
    const inBracket = Math.min(taxableIncome, upper) - bracket.from;
    if (inBracket > 0) tax += inBracket * bracket.rate;
  }
  return Math.round(tax);
}

/**
 * Pure function — no API calls.
 * Estimates income tax liability for the demo persona.
 * This is NOT part of Form 1301; shown as a bonus card with a disclaimer.
 *
 * Rewritten in the 2026-06 accuracy audit:
 *  - credit points now come from the shared, correctly-prorated aggregator
 *    (totalCreditPoints) instead of an ad-hoc inline sum that over-counted
 *    soldiers and mis-multiplied child points;
 *  - the bogus "48% B"L tax credit" is REMOVED (no such benefit exists — only
 *    52% is a deduction; the other 48% gets nothing). blCredit is held at 0;
 *  - real tax CREDITS are added: donations §46 (35%) and pension §45A (35% of
 *    up to 5.5% of income), per israeli-tax-returns.
 */
export function estimateTaxLiability(persona: Persona): TaxEstimate {
  const TC = getTaxYearConstants(persona.income.year);

  const businessIncome = computeBusinessIncome(persona);
  const d = computePersonalDeductions(persona);
  const kerenDeduction = d.keren;
  const blDeduction = d.bituachLeumi;
  const pensionDeduction = d.pension;

  const taxableIncome = computeTaxableIncome(persona);
  const grossTax = grossIncomeTax(taxableIncome, persona.income.year);

  // ── Tax credits (reduce tax directly, after brackets) ──────────────────────
  const creditPoints = totalCreditPoints(persona);
  const creditPointsValue = Math.round(creditPoints * TC.pointValueAnnual);

  // §46 donations credit — canonical helper (35%, floor + 30%-of-income ceiling).
  const donationsCredit = computeDonationsCredit(persona).credit;

  // §45A pension credit — 35% of the qualifying contribution, qualifying base
  // capped at 5.5% of business income AND at TC.pensionCreditCap (the fixed NIS
  // ceiling on the credit base itself, e.g. 12,804 = 5.5% x the 232,800 qualifying-
  // income ceiling). SEPARATE from the §47 deduction above. The cap was previously
  // missing from this min() — found by an audit workflow (13/08/2026) that traced
  // it against the sibling §47 deduction (computePersonalDeductions), which DOES
  // apply its analogous cap as a third min() term; without it, high earners
  // (businessIncome > 232,800) got an overstated §45A credit.
  const pensionCreditBase = Math.min(
    persona.deductionsAndCredits.pensionContributions.annualContribution,
    Math.round(businessIncome * TC.pensionCreditRate),
    TC.pensionCreditCap,
  );
  const pensionCredit = Math.round(pensionCreditBase * TC.pensionCreditPercent);

  // There is NO 48% B"L credit — held at 0 (see TaxEstimate.blCredit doc).
  const blCredit = 0;

  const totalCredits = creditPointsValue + donationsCredit + pensionCredit + blCredit;
  const excessCredits = Math.max(0, totalCredits - grossTax);
  const taxAfterCredits = Math.max(0, grossTax - totalCredits);
  const mikdamot = persona.income.mikdamot ?? 0;
  const balance = taxAfterCredits - mikdamot;

  return {
    businessIncome,
    kerenDeduction,
    blDeduction,
    pensionDeduction,
    taxableIncome,
    grossTax,
    creditPointsValue,
    pensionCredit,
    donationsCredit,
    blCredit,
    excessCredits,
    taxAfterCredits,
    mikdamot,
    balance,
  };
}

