import type {
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  Errors,
} from "./types";

export function validateTeudatZehut(id: string): boolean {
  if (!/^\d{9}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(id[i]) * (i % 2 === 0 ? 1 : 2);
    if (digit > 9) digit -= 9;
    sum += digit;
  }
  return sum % 10 === 0;
}

export function validateStep1(s1: Step1Data): Errors {
  const e: Errors = {};
  if (!s1.firstName.trim()) e.firstName = "שדה חובה";
  if (!s1.lastName.trim()) e.lastName = "שדה חובה";
  if (!s1.teudatZehut.trim()) {
    e.teudatZehut = "שדה חובה";
  } else if (!/^\d{9}$/.test(s1.teudatZehut)) {
    e.teudatZehut = "תעודת זהות חייבת להכיל בדיוק 9 ספרות";
  } else if (!validateTeudatZehut(s1.teudatZehut)) {
    e.teudatZehut = "מספר תעודת הזהות אינו תקין";
  }
  if (!s1.birthDate) e.birthDate = "שדה חובה";
  return e;
}

export function validateStep2(s2: Step2Data, currentYear: number): Errors {
  const e: Errors = {};
  if (s2.isSoldierDischarged && !s2.soldierDischargeDate) {
    e.soldierDischargeDate = "יש להזין תאריך שחרור";
  }
  if (s2.academicDegreeYear) {
    const y = Number(s2.academicDegreeYear);
    if (isNaN(y) || y < 1950 || y > currentYear) {
      e.academicDegreeYear = "שנה לא תקינה";
    }
  }
  s2.children.forEach((c, i) => {
    if (!c.birthYear) {
      e[`child-${i}`] = "יש להזין שנה";
    } else {
      const y = Number(c.birthYear);
      if (isNaN(y) || y < 1980 || y > currentYear) {
        e[`child-${i}`] = "שנה לא תקינה";
      }
    }
  });
  return e;
}

export function validateStep3(s3: Step3Data): Errors {
  const e: Errors = {};
  if (!s3.tradeName.trim()) e.tradeName = "שדה חובה";
  if (!s3.primaryOccupation.trim()) e.primaryOccupation = "שדה חובה";
  return e;
}

function validateNumber(v: string, label: string): string | undefined {
  if (!v) return "שדה חובה";
  if (isNaN(Number(v)) || Number(v) < 0) return `${label} חייב להיות מספר חיובי`;
  return undefined;
}

export function validateStep4(s4: Step4Data): Errors {
  const e: Errors = {};
  const r = validateNumber(s4.totalRevenue, "מחזור");
  if (r) e.totalRevenue = r;
  return e;
}

export function validateStep5(s5: Step5Data): Errors {
  const e: Errors = {};
  const ex = validateNumber(s5.totalDeductibleExpenses, "הוצאות");
  if (ex) e.totalDeductibleExpenses = ex;
  for (const key of [
    "bituachLeumiAnnualPaid",
    "kerenHishtalmut",
    "pensionContributions",
    "donations",
  ] as const) {
    if (s5[key]) {
      const v = Number(s5[key]);
      if (isNaN(v) || v < 0) e[key] = "מספר לא תקין";
    }
  }
  return e;
}

export function validateStep6(): Errors {
  return {};
}
