/**
 * Calculator engines for the eight "star fields" of Form 1301.
 *
 * Each engine is a pure function. Named after the field code so they're easy
 * to look up against the live form. The israeli-tax-returns skill defines
 * the rules; tomorrow we'll cross-check against it before going live.
 */

import { Persona } from "@/lib/persona";
import { Calculator, CalcResult, TAX_YEAR_2024 } from "./types";

export type { CalcResult } from "./types";

const ils = (n: number) => `${n.toLocaleString("he-IL")} ₪`;

/* ============================================================
 * שדה 150 — מיגיעה אישית מעסק או משלח יד
 * ============================================================ */
export const field150BusinessIncome: Calculator = (p) => {
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
 * 52% מהתשלום מותר בניכוי (יתרת 48% נכנסת כזיכוי בשדה 089)
 * ============================================================ */
export const field030BituachLeumi: Calculator = (p) => {
  const paid = p.deductionsAndCredits.bituachLeumiSelfEmployed.annualPaid;
  const deductible = Math.round(paid * TAX_YEAR_2024.bituachLeumiDeductibleRate);
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
      "החלק הנותר (48%) נכנס כזיכוי בשדה 089 — נחשב בנפרד.",
    ],
  };
};

/* ============================================================
 * שדה 137 — קרן השתלמות לעצמאים
 * ניכוי עד 4.5% מההכנסה החייבת, תקרה 19,920 ₪ (2024)
 * ============================================================ */
export const field137KerenHishtalmut: Calculator = (p) => {
  const contribution = p.deductionsAndCredits.kerenHishtalmut.annualContribution;
  const incomeBased = Math.round(
    (p.income.totalRevenue - p.income.totalDeductibleExpenses) *
      TAX_YEAR_2024.kerenHishtalmutRate,
  );
  const allowed = Math.min(
    contribution,
    incomeBased,
    TAX_YEAR_2024.kerenHishtalmutCap,
  );
  return {
    value: allowed,
    formula: `min(הפקדה ${ils(contribution)}, 4.5% × הכנסה = ${ils(
      incomeBased,
    )}, תקרה ${ils(TAX_YEAR_2024.kerenHishtalmutCap)}) = ${ils(allowed)}`,
    sources: [
      { label: "אישור הפקדה שנתי מקרן ההשתלמות" },
    ],
    confidence: "high",
    notes: [
      `הסכום הנותר (${ils(contribution - allowed)}) — אם יש — לא ינוכה אבל יישמר בקרן ויהיה זמין למשיכה.`,
    ],
  };
};

/* ============================================================
 * שדה 020 — נקודת זיכוי תושב
 * אישה: 2.75 נקודות, גבר: 2.25 נקודות
 * ============================================================ */
export const field020Resident: Calculator = (p) => {
  const points = p.personal.gender === "female" ? 2.75 : 2.25;
  return {
    value: true,
    formula: `${points} נקודות זיכוי × ${ils(TAX_YEAR_2024.pointValueAnnual)} = ${ils(
      Math.round(points * TAX_YEAR_2024.pointValueAnnual),
    )} זיכוי שנתי`,
    sources: [
      {
        label: `סטטוס תושב ישראל (${p.personal.gender === "female" ? "אישה: 2.75 נקודות" : "גבר: 2.25 נקודות"})`,
      },
    ],
    confidence: "high",
  };
};

/* ============================================================
 * שדה 044 — עולה חדש
 * שלוש שנים ראשונות: 1/4 + 1/6 + 1/12 נקודות זיכוי לשנה
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
 * 1/6 נקודות זיכוי × 36 חודשים מהשחרור (= חצי נקודה לשנה לתקופה זו)
 * ============================================================ */
export const field068Soldier: Calculator = (p) => {
  if (!p.personal.isSoldierDischarged) {
    return {
      value: false,
      formula: "לא בעלת זכאות לזיכוי חייל משוחרר",
      sources: [{ label: "personal.isSoldierDischarged = false" }],
      confidence: "high",
    };
  }
  return {
    value: true,
    formula: "1/6 נקודות זיכוי × 36 חודשים מתאריך השחרור",
    sources: [{ label: "תאריך שחרור משירות סדיר" }],
    confidence: "medium",
  };
};

/* ============================================================
 * שדה 297 — חייב/לא חייב בטופס 6111
 * חייב כשהמחזור > 256,410 ₪ (2024)
 * ============================================================ */
export const field297Form6111: Calculator = (p) => {
  const turnover = p.income.totalRevenue;
  const required = turnover > TAX_YEAR_2024.form6111Threshold;
  return {
    value: required ? "חייב בטופס 6111" : "לא חייב",
    formula: `מחזור ${ils(turnover)} ${
      required ? ">" : "<"
    } סף ${ils(TAX_YEAR_2024.form6111Threshold)} → ${
      required ? "חייב" : "לא חייב"
    }`,
    sources: [{ label: "מחזור שנתי כפי שחושב בשדה 238" }],
    confidence: "high",
    notes: required
      ? ["טופס 6111 דורש דוח מאזן ורווח-והפסד מסודר. יידרש מסמך נוסף."]
      : [`חיסכון: לא תידרש להגיש טופס 6111 השנה. שמור מרווח של ${ils(
          TAX_YEAR_2024.form6111Threshold - turnover,
        )} עד הסף.`],
  };
};

/** Map of all calculators by their identifier in the form schema. */
export const calculators: Record<string, Calculator> = {
  "field-150-business-income": field150BusinessIncome,
  "field-238-turnover": field238Turnover,
  "field-030-bituach-leumi": field030BituachLeumi,
  "field-137-keren-hishtalmut": field137KerenHishtalmut,
  "field-020-resident": field020Resident,
  "field-044-oleh-hadash": field044OlehHadash,
  "field-068-soldier": field068Soldier,
  "field-297-form-6111": field297Form6111,
};

/** Run a calculator by its identifier in the form schema. */
export function calculate(
  calculatorId: string,
  persona: Persona,
): CalcResult | null {
  const fn = calculators[calculatorId];
  return fn ? fn(persona) : null;
}
