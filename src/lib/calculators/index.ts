/**
 * Calculator engines for the eight "star fields" of Form 1301.
 *
 * Each engine is a pure function. Named after the field code so they're easy
 * to look up against the live form. The israeli-tax-returns skill defines
 * the rules; tomorrow we'll cross-check against it before going live.
 */

import { Persona } from "@/lib/persona";
import { Calculator, CalcResult, TaxEstimate, TAX_YEAR_2024 } from "./types";

export type { CalcResult, TaxEstimate } from "./types";

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
  const income = p.income.totalRevenue - p.income.totalDeductibleExpenses;
  const incomeBased = Math.round(
    Math.min(income, TAX_YEAR_2024.kerenHishtalmutIncomeCeiling) *
      TAX_YEAR_2024.kerenHishtalmutRate,
  );
  const allowed = Math.min(contribution, incomeBased, TAX_YEAR_2024.kerenHishtalmutCap);
  return {
    value: allowed,
    formula: `min(הפקדה ${ils(contribution)}, 4.5% × min(הכנסה, תקרה ${ils(TAX_YEAR_2024.kerenHishtalmutIncomeCeiling)}) = ${ils(incomeBased)}, תקרת ניכוי ${ils(TAX_YEAR_2024.kerenHishtalmutCap)}) = ${ils(allowed)}`,
    sources: [{ label: "אישור הפקדה שנתי מקרן ההשתלמות" }],
    confidence: "high",
    notes: [
      `תקרת הפקדה לפטור ממס רווחי הון: ${ils(20566)} (ניתן להפקיד יותר מהחלק המוכר).`,
      ...(contribution > allowed ? [`הסכום הנותר (${ils(contribution - allowed)}) אינו מוכר כהוצאה אך גדל פטור ממס.`] : []),
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

/* ============================================================
 * שדה 048 — זיכוי בגין תשלומים לביטוח לאומי כעצמאי (48%)
 * 52% ניכוי כבר נדרש בשדה 030; הנותר נכנס כזיכוי ישיר מהמס
 * ============================================================ */
export const field048BituachLeumiCredit: Calculator = (p) => {
  const paid = p.deductionsAndCredits.bituachLeumiSelfEmployed.annualPaid;
  const credit = Math.round(paid * TAX_YEAR_2024.bituachLeumiCreditRate);
  return {
    value: credit,
    formula: `${ils(paid)} (סה"כ ב"ל ששולם) × 48% = ${ils(credit)} (חלק הזיכוי)`,
    sources: [
      {
        label: 'תקבולים מהמוסד לביטוח לאומי',
        detail: '52% ניכוי כבר נדרש בשדה 030 — חלק זה מוחת ישירות מהמס',
      },
    ],
    confidence: "high",
    notes: ['זיכוי זה מופחת מהמס — לא מהכנסה החייבת.'],
  };
};

/* ============================================================
 * שדה 045 — זיכוי בגין תרומות מוכרות (סעיף 46)
 * 35% מהתרומות למוסדות מוכרים; מינימום 200 ₪
 * ============================================================ */
export const field045Donations: Calculator = (p) => {
  const current = p.deductionsAndCredits.donations.currentYear;
  const carried = p.deductionsAndCredits.donations.carriedFromPriorYears ?? 0;
  const total = current + carried;
  if (total < 200) {
    return {
      value: 0,
      formula: `תרומות ${ils(total)} < מינימום 200 ₪ — אין זיכוי`,
      sources: [{ label: 'תרומות שנת המס' }],
      confidence: "high",
    };
  }
  const credit = Math.round(total * 0.35);
  return {
    value: credit,
    formula: `${ils(total)} × 35% = ${ils(credit)}`,
    sources: [
      {
        label: `תרומות ${ils(current)} (שנה שוטפת)${carried > 0 ? ` + ${ils(carried)} (מועבר משנה קודמת)` : ""}`,
        detail: 'למוסדות מוכרים לפי סעיף 46 בלבד',
      },
    ],
    confidence: "high",
    notes: ['שמור קבלות תרומות. רלוונטי למוסדות שקיבלו אישור מרשות המסים.'],
  };
};

/* ============================================================
 * שדה 072 — זיכוי בגין פרמיית ביטוח חיים (סעיף 40)
 * 5% מהפרמיה ששולמה; לא רלוונטי אם פרמיה = 0
 * ============================================================ */
export const field072LifeInsurance: Calculator = (p) => {
  const premium = p.deductionsAndCredits.lifeInsurancePremium ?? 0;
  if (!premium || premium === 0) {
    return {
      value: false,
      formula: 'לא רלוונטי — אין פרמיית ביטוח חיים בנתוני הלקוח',
      sources: [{ label: 'deductionsAndCredits.lifeInsurancePremium = 0' }],
      confidence: "high",
    };
  }
  const credit = Math.round(premium * 0.05);
  return {
    value: credit,
    formula: `${ils(premium)} × 5% = ${ils(credit)} זיכוי`,
    sources: [{ label: 'פרמיית ביטוח חיים (סעיף 40)', detail: 'שמור את הפוליסה ואישורי תשלום שנתיים' }],
    confidence: "high",
    notes: ['תקרת הזיכוי: 5% מהפרמיה ששולמה בפועל.'],
  };
};

/** Map of all calculators by their identifier in the form schema. */
export const calculators: Record<string, Calculator> = {
  "field-150-business-income": field150BusinessIncome,
  "field-238-turnover": field238Turnover,
  "field-030-bituach-leumi": field030BituachLeumi,
  "field-048-bituach-leumi-credit": field048BituachLeumiCredit,
  "field-045-donations": field045Donations,
  "field-072-life-insurance": field072LifeInsurance,
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

/**
 * Pure function — no API calls.
 * Estimates income tax liability for the demo persona.
 * This is NOT part of Form 1301; shown as a bonus card with a disclaimer.
 */
export function estimateTaxLiability(persona: Persona): TaxEstimate {
  const businessIncome = persona.income.totalRevenue - persona.income.totalDeductibleExpenses;

  // Deductions from taxable income
  const kerenDeduction = Math.min(
    persona.deductionsAndCredits.kerenHishtalmut.annualContribution,
    Math.round(Math.min(businessIncome, TAX_YEAR_2024.kerenHishtalmutIncomeCeiling) * TAX_YEAR_2024.kerenHishtalmutRate),
    TAX_YEAR_2024.kerenHishtalmutCap,
  );
  const blDeduction = Math.round(persona.deductionsAndCredits.bituachLeumiSelfEmployed.annualPaid * TAX_YEAR_2024.bituachLeumiDeductibleRate);
  const pensionDeduction = Math.min(
    persona.deductionsAndCredits.pensionContributions.annualContribution,
    Math.round(businessIncome * TAX_YEAR_2024.pensionDeductionRate),
    TAX_YEAR_2024.pensionDeductionCap,
  );

  const taxableIncome = Math.max(0, businessIncome - kerenDeduction - blDeduction - pensionDeduction);

  // Progressive tax brackets
  let grossTax = 0;
  for (const bracket of TAX_YEAR_2024.taxBrackets) {
    if (taxableIncome <= bracket.from) break;
    const inBracket = Math.min(taxableIncome, bracket.to === Infinity ? taxableIncome : bracket.to) - bracket.from;
    grossTax += inBracket * bracket.rate;
  }
  grossTax = Math.round(grossTax);

  // Tax credits
  let creditPoints = persona.personal.gender === "female" ? 2.75 : 2.25;
  if (persona.personal.isNewResident) creditPoints += 3.0;
  if (persona.personal.isSoldierDischarged) creditPoints += 0.5;
  creditPoints += (persona.personal.children ?? []).length * (persona.personal.children?.some(c => {
    const age = persona.income.year - c.birthYear;
    return age >= 1 && age <= 5;
  }) ? 2.5 : 1.0);

  const creditPointsValue = Math.round(creditPoints * TAX_YEAR_2024.pointValueAnnual);
  const blCredit = Math.round(persona.deductionsAndCredits.bituachLeumiSelfEmployed.annualPaid * TAX_YEAR_2024.bituachLeumiCreditRate);

  const totalCredits = creditPointsValue + blCredit;
  const excessCredits = Math.max(0, totalCredits - grossTax);
  const taxAfterCredits = Math.max(0, grossTax - totalCredits);
  const mikdamot = persona.income.mikdamot ?? 0;
  const balance = taxAfterCredits - mikdamot;

  return { businessIncome, kerenDeduction, blDeduction, pensionDeduction, taxableIncome, grossTax, creditPointsValue, blCredit, excessCredits, taxAfterCredits, mikdamot, balance };
}

/** Rules for the עוסק זעיר simplified tax track (2024). */
export const OSEK_ZEIR_RULES = {
  threshold: TAX_YEAR_2024.osekZeirThreshold,
  expenseRate: TAX_YEAR_2024.osekZeirExpenseRate,
  notes: [
    "30% מהמחזור מוכרים אוטומטית כהוצאות — ההכנסה החייבת היא 70% מהמחזור",
    "כולל בתוכו הוצאות ביטוח לאומי — לא ניתן לנכות אותן בנוסף",
    "לא ניתן לדרוש הפסדים מועברים",
    "אין חובת מקדמות; קיים מסלול וולונטרי לתשלום מקדמות",
    "פטור מהגשת הצהרת הון (רשות המסים רשאית לדרוש במקרים מיוחדים)",
    "יציאה מהמסלול: לא ניתן לחזור אליו בשנתיים הבאות",
    "חריגה מהתקרה = יציאה אוטומטית; ניכוי 30% חל גם בשנת היציאה",
    "הפטור חל רק במסלול הדיווח המקוצר",
  ],
};
