"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Persona, MaritalStatus, OsekType } from "@/lib/persona";
import { savePersona, loadPersona } from "@/lib/setup-storage";
import { TAX_YEAR_2024 } from "@/lib/calculators/types";
import { cn } from "@/lib/utils";

function validateTeudatZehut(id: string): boolean {
  if (!/^\d{9}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(id[i]) * (i % 2 === 0 ? 1 : 2);
    if (digit > 9) digit -= 9;
    sum += digit;
  }
  return sum % 10 === 0;
}

const TOTAL_STEPS = 6;
const STEP_TITLES = [
  "פרטים אישיים",
  "מעמד ומשפחה",
  "פרטי עסק",
  "הכנסות",
  "הוצאות וניכויים",
  "בנק וסיכום",
];
const STEP_SUBTITLES = [
  "כמה פרטים בסיסיים כדי לזהות אותך",
  "מעמדים מיוחדים שמשפיעים על נקודות זיכוי",
  "ספרי לנו על העסק שלך",
  "נתוני הכנסות לשנת המס 2024",
  "הוצאות מוכרות, ביטוחים ותרומות",
  "פרטי בנק לזיכוי, וסיכום מהיר",
];

interface Step1Data {
  firstName: string;
  lastName: string;
  teudatZehut: string;
  birthDate: string;
  gender: "male" | "female";
  maritalStatus: MaritalStatus;
}

interface Step2Data {
  isSoldierDischarged: boolean;
  soldierDischargeDate: string;
  isNewResident: boolean;
  academicDegreeYear: string;
  children: { birthYear: string }[];
}

interface Step3Data {
  tradeName: string;
  primaryOccupation: string;
  osekType: OsekType;
  osekStartDate: string;
}

interface Step4Data {
  totalRevenue: string;
  invoiceCount: string;
}

interface Step5Data {
  totalDeductibleExpenses: string;
  expenseCount: string;
  bituachLeumiAnnualPaid: string;
  kerenHishtalmut: string;
  pensionContributions: string;
  donations: string;
}

interface Step6Data {
  bankName: string;
  bankCode: string;
  branchCode: string;
  accountNumber: string;
}

type Errors = Record<string, string>;

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-stone-700 mb-1"
    >
      {children}
      {required && <span className="text-red-500 mr-1">*</span>}
    </label>
  );
}

function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

function inputCls(hasError: boolean) {
  return cn(
    "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "border-stone-300 focus:border-blue-500 focus:ring-blue-200",
  );
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-7">
      <div className="flex items-center justify-between mb-3 gap-1">
        {STEP_TITLES.map((label, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1 flex-1 min-w-0"
          >
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                i + 1 < step
                  ? "bg-blue-600 text-white"
                  : i + 1 === step
                    ? "bg-blue-600 text-white ring-4 ring-blue-100"
                    : "bg-stone-200 text-stone-400",
              )}
            >
              {i + 1 < step ? "✓" : i + 1}
            </div>
            <span
              className={cn(
                "hidden md:block text-[10px] text-center leading-tight truncate w-full",
                i + 1 === step
                  ? "text-blue-700 font-medium"
                  : "text-stone-400",
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-l from-blue-500 to-blue-700 rounded-full transition-all duration-500"
          style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
        />
      </div>
      <div className="mt-2 text-left text-xs text-stone-400">
        {step}/{TOTAL_STEPS}
      </div>
    </div>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const currentYear = new Date().getFullYear();

  const [s1, setS1] = useState<Step1Data>({
    firstName: "",
    lastName: "",
    teudatZehut: "",
    birthDate: "",
    gender: "female",
    maritalStatus: "single",
  });

  const [s2, setS2] = useState<Step2Data>({
    isSoldierDischarged: false,
    soldierDischargeDate: "",
    isNewResident: false,
    academicDegreeYear: "",
    children: [],
  });

  const [s3, setS3] = useState<Step3Data>({
    tradeName: "",
    primaryOccupation: "",
    osekType: "patur",
    osekStartDate: "",
  });

  const [s4, setS4] = useState<Step4Data>({
    totalRevenue: "",
    invoiceCount: "",
  });

  const [s5, setS5] = useState<Step5Data>({
    totalDeductibleExpenses: "",
    expenseCount: "",
    bituachLeumiAnnualPaid: "",
    kerenHishtalmut: "",
    pensionContributions: "",
    donations: "",
  });

  const [s6, setS6] = useState<Step6Data>({
    bankName: "",
    bankCode: "",
    branchCode: "",
    accountNumber: "",
  });

  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    const saved = loadPersona();
    if (!saved) return;
    setS1({
      firstName: saved.personal.firstName,
      lastName: saved.personal.lastName,
      teudatZehut: saved.personal.teudatZehut,
      birthDate: saved.personal.birthDate,
      gender: saved.personal.gender,
      maritalStatus: saved.personal.maritalStatus,
    });
    setS2({
      isSoldierDischarged: saved.personal.isSoldierDischarged,
      soldierDischargeDate: saved.personal.soldierDischargeDate ?? "",
      isNewResident: saved.personal.isNewResident,
      academicDegreeYear: saved.personal.academicDegreeYear?.toString() ?? "",
      children: saved.personal.children.map((c) => ({
        birthYear: c.birthYear.toString(),
      })),
    });
    setS3({
      tradeName: saved.business.tradeName,
      primaryOccupation: saved.business.primaryOccupation,
      osekType: saved.business.osekType,
      osekStartDate: saved.business.osekStartDate,
    });
    setS4({
      totalRevenue: String(saved.income.totalRevenue),
      invoiceCount: String(saved.income.invoiceCount),
    });
    setS5({
      totalDeductibleExpenses: String(saved.income.totalDeductibleExpenses),
      expenseCount: String(saved.income.expenseCount),
      bituachLeumiAnnualPaid: String(
        saved.deductionsAndCredits.bituachLeumiSelfEmployed.annualPaid,
      ),
      kerenHishtalmut: String(
        saved.deductionsAndCredits.kerenHishtalmut.annualContribution,
      ),
      pensionContributions: String(
        saved.deductionsAndCredits.pensionContributions.annualContribution,
      ),
      donations: String(saved.deductionsAndCredits.donations.currentYear),
    });
    setS6({
      bankName: saved.bank.bankName,
      bankCode: saved.bank.bankCode,
      branchCode: saved.bank.branchCode,
      accountNumber: saved.bank.accountNumber,
    });
  }, []);

  function validateStep1(): Errors {
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

  function validateStep2(): Errors {
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

  function validateStep3(): Errors {
    const e: Errors = {};
    if (!s3.tradeName.trim()) e.tradeName = "שדה חובה";
    if (!s3.primaryOccupation.trim()) e.primaryOccupation = "שדה חובה";
    if (!s3.osekStartDate) e.osekStartDate = "שדה חובה";
    return e;
  }

  function validateNumber(v: string, label: string): string | undefined {
    if (!v) return "שדה חובה";
    if (isNaN(Number(v)) || Number(v) < 0) return `${label} חייב להיות מספר חיובי`;
    return undefined;
  }

  function validateStep4(): Errors {
    const e: Errors = {};
    const r = validateNumber(s4.totalRevenue, "מחזור");
    if (r) e.totalRevenue = r;
    const i = validateNumber(s4.invoiceCount, "מספר חשבוניות");
    if (i) e.invoiceCount = i;
    return e;
  }

  function validateStep5(): Errors {
    const e: Errors = {};
    const ex = validateNumber(s5.totalDeductibleExpenses, "הוצאות");
    if (ex) e.totalDeductibleExpenses = ex;
    const ec = validateNumber(s5.expenseCount, "מספר קבלות");
    if (ec) e.expenseCount = ec;
    if (s5.bituachLeumiAnnualPaid) {
      const v = Number(s5.bituachLeumiAnnualPaid);
      if (isNaN(v) || v < 0) e.bituachLeumiAnnualPaid = "מספר לא תקין";
    }
    if (s5.kerenHishtalmut) {
      const v = Number(s5.kerenHishtalmut);
      if (isNaN(v) || v < 0) e.kerenHishtalmut = "מספר לא תקין";
    }
    if (s5.pensionContributions) {
      const v = Number(s5.pensionContributions);
      if (isNaN(v) || v < 0) e.pensionContributions = "מספר לא תקין";
    }
    if (s5.donations) {
      const v = Number(s5.donations);
      if (isNaN(v) || v < 0) e.donations = "מספר לא תקין";
    }
    return e;
  }

  function validateStep6(): Errors {
    return {};
  }

  function handleNext() {
    let errs: Errors = {};
    if (step === 1) errs = validateStep1();
    if (step === 2) errs = validateStep2();
    if (step === 3) errs = validateStep3();
    if (step === 4) errs = validateStep4();
    if (step === 5) errs = validateStep5();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setStep((p) => p + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setErrors({});
    setStep((p) => p - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildPersona(): Persona {
    const totalRevenue = Number(s4.totalRevenue);
    const totalDeductibleExpenses = Number(s5.totalDeductibleExpenses);
    const netIncome = totalRevenue - totalDeductibleExpenses;
    const bituach = Number(s5.bituachLeumiAnnualPaid) || 0;

    return {
      id: "user-" + Date.now(),
      displayName: `${s1.firstName} ${s1.lastName}`.trim(),
      personal: {
        firstName: s1.firstName,
        lastName: s1.lastName,
        fatherName: null,
        teudatZehut: s1.teudatZehut,
        birthDate: s1.birthDate,
        gender: s1.gender,
        maritalStatus: s1.maritalStatus,
        spouse: null,
        isNewResident: s2.isNewResident,
        isReturningResident: false,
        isEilatResident: false,
        isSoldierDischarged: s2.isSoldierDischarged,
        soldierDischargeDate: s2.isSoldierDischarged
          ? s2.soldierDischargeDate || null
          : null,
        academicDegreeYear: s2.academicDegreeYear
          ? Number(s2.academicDegreeYear)
          : null,
        children: s2.children
          .filter((c) => c.birthYear)
          .map((c) => ({ birthYear: Number(c.birthYear) })),
      },
      contact: {
        mailingAddress: {
          street: "",
          houseNumber: "",
          city: "",
          zipCode: "",
        },
        residenceSameAsMailing: true,
        email: "",
        phoneMobile: "",
        phoneWork: null,
        phoneHome: null,
        consentDigitalNotices: false,
      },
      business: {
        tradeName: s3.tradeName,
        primaryOccupation: s3.primaryOccupation,
        osekType: s3.osekType,
        osekFileNumber: s1.teudatZehut,
        osekStartDate: s3.osekStartDate,
        address: {
          sameAsResidence: true,
          street: null,
          houseNumber: null,
          city: null,
          zipCode: null,
        },
        bookkeepingMethod: "single-entry",
        bookkeepingType: "computerized",
        isSmallBusiness: totalRevenue < 100000,
        hasEmployees: false,
        employerNames: [],
      },
      bank: {
        bankCode: s6.bankCode,
        bankName: s6.bankName,
        branchCode: s6.branchCode,
        accountNumber: s6.accountNumber,
        accountOwnerName: `${s1.firstName} ${s1.lastName}`.trim(),
      },
      income: {
        year: 2024,
        totalRevenue,
        totalDeductibleExpenses,
        netIncome,
        invoiceCount: Number(s4.invoiceCount),
        expenseCount: Number(s5.expenseCount),
        monthlyBreakdown: [],
      },
      deductionsAndCredits: {
        kerenHishtalmut: {
          annualContribution: Number(s5.kerenHishtalmut) || 0,
        },
        kupatGemel: { annualContribution: 0 },
        pensionContributions: {
          annualContribution: Number(s5.pensionContributions) || 0,
        },
        bituachLeumiSelfEmployed: {
          annualPaid: bituach || Math.round(netIncome * 0.12),
        },
        bituachLifeOrCancerPolicy: 0,
        lifeInsurancePremium: 0,
        donations: {
          currentYear: Number(s5.donations) || 0,
          carriedFromPriorYears: 0,
        },
        academicDegreeCredit: !!s2.academicDegreeYear,
      },
      vatAndTurnover: {
        annualTurnoverWithoutVat: totalRevenue,
        isAbove6111Threshold: totalRevenue > TAX_YEAR_2024.form6111Threshold,
      },
    };
  }

  function handleSubmit() {
    const errs = validateStep6();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const persona = buildPersona();
    savePersona(persona);
    router.push("/demo");
  }

  function addChild() {
    setS2({ ...s2, children: [...s2.children, { birthYear: "" }] });
  }
  function removeChild(idx: number) {
    setS2({ ...s2, children: s2.children.filter((_, i) => i !== idx) });
  }
  function setChildYear(idx: number, year: string) {
    const next = [...s2.children];
    next[idx] = { birthYear: year };
    setS2({ ...s2, children: next });
  }

  const previewNet =
    s4.totalRevenue && s5.totalDeductibleExpenses
      ? Number(s4.totalRevenue) - Number(s5.totalDeductibleExpenses)
      : null;

  const creditPoints = (() => {
    let pts = s1.gender === "female" ? 2.75 : 2.25;
    if (s2.isNewResident) pts += 3;
    if (s2.isSoldierDischarged) pts += 1;
    pts += s2.children.filter((c) => c.birthYear).length * 0.5;
    return pts;
  })();

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="bg-white border-b border-stone-200">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-bold text-white shadow-sm">
              c
            </div>
            <span className="text-lg font-bold">countme</span>
          </Link>
          <div className="text-sm text-stone-500">הגדרת פרופיל</div>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-7 md:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold shadow-sm text-sm">
                {step}
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight">
                  {STEP_TITLES[step - 1]}
                </h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  {STEP_SUBTITLES[step - 1]}
                </p>
              </div>
            </div>

            <ProgressBar step={step} />

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel htmlFor="firstName" required>
                      שם פרטי
                    </FieldLabel>
                    <input
                      id="firstName"
                      type="text"
                      value={s1.firstName}
                      onChange={(e) =>
                        setS1({ ...s1, firstName: e.target.value })
                      }
                      className={inputCls(!!errors.firstName)}
                      placeholder="דנה"
                    />
                    <ErrorMsg msg={errors.firstName} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="lastName" required>
                      שם משפחה
                    </FieldLabel>
                    <input
                      id="lastName"
                      type="text"
                      value={s1.lastName}
                      onChange={(e) =>
                        setS1({ ...s1, lastName: e.target.value })
                      }
                      className={inputCls(!!errors.lastName)}
                      placeholder="כהן"
                    />
                    <ErrorMsg msg={errors.lastName} />
                  </div>
                </div>

                <div>
                  <FieldLabel htmlFor="teudatZehut" required>
                    תעודת זהות
                  </FieldLabel>
                  <input
                    id="teudatZehut"
                    type="text"
                    inputMode="numeric"
                    maxLength={9}
                    value={s1.teudatZehut}
                    onChange={(e) =>
                      setS1({
                        ...s1,
                        teudatZehut: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    className={inputCls(!!errors.teudatZehut)}
                    placeholder="9 ספרות"
                    dir="ltr"
                  />
                  <ErrorMsg msg={errors.teudatZehut} />
                </div>

                <div>
                  <FieldLabel htmlFor="birthDate" required>
                    תאריך לידה
                  </FieldLabel>
                  <input
                    id="birthDate"
                    type="date"
                    value={s1.birthDate}
                    onChange={(e) =>
                      setS1({ ...s1, birthDate: e.target.value })
                    }
                    className={inputCls(!!errors.birthDate)}
                    dir="ltr"
                    max={new Date().toISOString().split("T")[0]}
                  />
                  <ErrorMsg msg={errors.birthDate} />
                </div>

                <div>
                  <FieldLabel>מגדר (משפיע על נקודות זיכוי)</FieldLabel>
                  <div className="flex gap-3">
                    <label
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 cursor-pointer transition-colors text-sm",
                        s1.gender === "female"
                          ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                          : "border-stone-300 hover:bg-stone-50",
                      )}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value="female"
                        checked={s1.gender === "female"}
                        onChange={() => setS1({ ...s1, gender: "female" })}
                        className="sr-only"
                      />
                      נקבה (2.75 נקודות)
                    </label>
                    <label
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 cursor-pointer transition-colors text-sm",
                        s1.gender === "male"
                          ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                          : "border-stone-300 hover:bg-stone-50",
                      )}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value="male"
                        checked={s1.gender === "male"}
                        onChange={() => setS1({ ...s1, gender: "male" })}
                        className="sr-only"
                      />
                      זכר (2.25 נקודות)
                    </label>
                  </div>
                </div>

                <div>
                  <FieldLabel htmlFor="maritalStatus">מצב משפחתי</FieldLabel>
                  <select
                    id="maritalStatus"
                    value={s1.maritalStatus}
                    onChange={(e) =>
                      setS1({
                        ...s1,
                        maritalStatus: e.target.value as MaritalStatus,
                      })
                    }
                    className={inputCls(false)}
                  >
                    <option value="single">רווק/ה</option>
                    <option value="married">נשוי/ה</option>
                    <option value="divorced">גרוש/ה</option>
                    <option value="widowed">אלמן/ה</option>
                    <option value="separated">פרוד/ה</option>
                  </select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="rounded-lg border border-stone-200 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s2.isSoldierDischarged}
                      onChange={(e) =>
                        setS2({
                          ...s2,
                          isSoldierDischarged: e.target.checked,
                        })
                      }
                      className="h-4 w-4 mt-0.5 rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-stone-800">
                        חייל/ת משוחרר/ת
                      </span>
                      <p className="text-xs text-stone-500 mt-0.5">
                        זכאות לנקודת זיכוי במשך 36 חודשים מהשחרור (שדה 068)
                      </p>
                    </div>
                  </label>
                  {s2.isSoldierDischarged && (
                    <div className="mt-3 mr-7">
                      <FieldLabel htmlFor="dischargeDate" required>
                        תאריך שחרור
                      </FieldLabel>
                      <input
                        id="dischargeDate"
                        type="date"
                        value={s2.soldierDischargeDate}
                        onChange={(e) =>
                          setS2({
                            ...s2,
                            soldierDischargeDate: e.target.value,
                          })
                        }
                        className={inputCls(!!errors.soldierDischargeDate)}
                        dir="ltr"
                        max={new Date().toISOString().split("T")[0]}
                      />
                      <ErrorMsg msg={errors.soldierDischargeDate} />
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-stone-200 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s2.isNewResident}
                      onChange={(e) =>
                        setS2({ ...s2, isNewResident: e.target.checked })
                      }
                      className="h-4 w-4 mt-0.5 rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-stone-800">
                        עולה חדש/ה
                      </span>
                      <p className="text-xs text-stone-500 mt-0.5">
                        זכאות ל-3 נקודות זיכוי בשלוש השנים הראשונות (שדה 044)
                      </p>
                    </div>
                  </label>
                </div>

                <div>
                  <FieldLabel htmlFor="academicYear">
                    שנת סיום תואר אקדמי (אופציונלי)
                  </FieldLabel>
                  <input
                    id="academicYear"
                    type="number"
                    min={1950}
                    max={currentYear}
                    value={s2.academicDegreeYear}
                    onChange={(e) =>
                      setS2({ ...s2, academicDegreeYear: e.target.value })
                    }
                    className={inputCls(!!errors.academicDegreeYear)}
                    dir="ltr"
                    placeholder="לדוגמה: 2022"
                  />
                  <ErrorMsg msg={errors.academicDegreeYear} />
                  <p className="mt-1 text-xs text-stone-500">
                    זכאות לנקודת זיכוי על תואר ראשון (שנה אחת) או תואר שני
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <FieldLabel>ילדים (שנת לידה)</FieldLabel>
                    <button
                      type="button"
                      onClick={addChild}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      + הוסיפי ילד/ה
                    </button>
                  </div>
                  {s2.children.length === 0 ? (
                    <p className="text-xs text-stone-400 py-2">
                      אין ילדים. נקודות זיכוי לילדים תלויות בגיל
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {s2.children.map((c, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <input
                            type="number"
                            min={1980}
                            max={currentYear}
                            value={c.birthYear}
                            onChange={(e) => setChildYear(i, e.target.value)}
                            className={inputCls(!!errors[`child-${i}`])}
                            dir="ltr"
                            placeholder="שנת לידה"
                          />
                          <button
                            type="button"
                            onClick={() => removeChild(i)}
                            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
                          >
                            הסירי
                          </button>
                        </div>
                      ))}
                      {s2.children.map(
                        (_, i) =>
                          errors[`child-${i}`] && (
                            <ErrorMsg key={i} msg={errors[`child-${i}`]} />
                          ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <FieldLabel htmlFor="tradeName" required>
                    שם העסק
                  </FieldLabel>
                  <input
                    id="tradeName"
                    type="text"
                    value={s3.tradeName}
                    onChange={(e) =>
                      setS3({ ...s3, tradeName: e.target.value })
                    }
                    className={inputCls(!!errors.tradeName)}
                    placeholder="דנה כהן, עיצוב חוויית משתמש"
                  />
                  <ErrorMsg msg={errors.tradeName} />
                </div>

                <div>
                  <FieldLabel htmlFor="primaryOccupation" required>
                    תחום עיסוק
                  </FieldLabel>
                  <input
                    id="primaryOccupation"
                    type="text"
                    value={s3.primaryOccupation}
                    onChange={(e) =>
                      setS3({ ...s3, primaryOccupation: e.target.value })
                    }
                    className={inputCls(!!errors.primaryOccupation)}
                    placeholder="עיצוב UX, פיתוח תוכנה, יעוץ"
                  />
                  <ErrorMsg msg={errors.primaryOccupation} />
                </div>

                <div>
                  <FieldLabel htmlFor="osekType">סוג עוסק</FieldLabel>
                  <select
                    id="osekType"
                    value={s3.osekType}
                    onChange={(e) =>
                      setS3({ ...s3, osekType: e.target.value as OsekType })
                    }
                    className={inputCls(false)}
                  >
                    <option value="patur">עוסק פטור</option>
                    <option value="morshe">עוסק מורשה</option>
                    <option value="company">חברה בע&quot;מ</option>
                  </select>
                </div>

                <div>
                  <FieldLabel htmlFor="osekStartDate" required>
                    תאריך פתיחת תיק
                  </FieldLabel>
                  <input
                    id="osekStartDate"
                    type="date"
                    value={s3.osekStartDate}
                    onChange={(e) =>
                      setS3({ ...s3, osekStartDate: e.target.value })
                    }
                    className={inputCls(!!errors.osekStartDate)}
                    dir="ltr"
                    max={new Date().toISOString().split("T")[0]}
                  />
                  <ErrorMsg msg={errors.osekStartDate} />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 font-medium">
                  שנת המס: 2024
                </div>

                <div>
                  <FieldLabel htmlFor="totalRevenue" required>
                    סך הכנסות ברוטו מהעסק (בש&quot;ח, ללא מע&quot;מ)
                  </FieldLabel>
                  <input
                    id="totalRevenue"
                    type="number"
                    min={0}
                    value={s4.totalRevenue}
                    onChange={(e) =>
                      setS4({ ...s4, totalRevenue: e.target.value })
                    }
                    className={inputCls(!!errors.totalRevenue)}
                    dir="ltr"
                    placeholder="248500"
                  />
                  <ErrorMsg msg={errors.totalRevenue} />
                  <p className="mt-1 text-xs text-stone-500">
                    זה מה שייכנס לשדות 238 ו-294 בטופס
                  </p>
                </div>

                <div>
                  <FieldLabel htmlFor="invoiceCount" required>
                    מספר חשבוניות שהוצאת השנה
                  </FieldLabel>
                  <input
                    id="invoiceCount"
                    type="number"
                    min={0}
                    value={s4.invoiceCount}
                    onChange={(e) =>
                      setS4({ ...s4, invoiceCount: e.target.value })
                    }
                    className={inputCls(!!errors.invoiceCount)}
                    dir="ltr"
                    placeholder="38"
                  />
                  <ErrorMsg msg={errors.invoiceCount} />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel htmlFor="expenses" required>
                      סך הוצאות מוכרות
                    </FieldLabel>
                    <input
                      id="expenses"
                      type="number"
                      min={0}
                      value={s5.totalDeductibleExpenses}
                      onChange={(e) =>
                        setS5({
                          ...s5,
                          totalDeductibleExpenses: e.target.value,
                        })
                      }
                      className={inputCls(!!errors.totalDeductibleExpenses)}
                      dir="ltr"
                      placeholder="47800"
                    />
                    <ErrorMsg msg={errors.totalDeductibleExpenses} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="expenseCount" required>
                      מספר קבלות
                    </FieldLabel>
                    <input
                      id="expenseCount"
                      type="number"
                      min={0}
                      value={s5.expenseCount}
                      onChange={(e) =>
                        setS5({ ...s5, expenseCount: e.target.value })
                      }
                      className={inputCls(!!errors.expenseCount)}
                      dir="ltr"
                      placeholder="91"
                    />
                    <ErrorMsg msg={errors.expenseCount} />
                  </div>
                </div>

                <div className="border-t border-stone-200 pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-stone-800 mb-3">
                    ניכויים אישיים (אופציונלי)
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <FieldLabel htmlFor="bituachLeumi">
                        ביטוח לאומי ששילמת השנה (שדה 030)
                      </FieldLabel>
                      <input
                        id="bituachLeumi"
                        type="number"
                        min={0}
                        value={s5.bituachLeumiAnnualPaid}
                        onChange={(e) =>
                          setS5({
                            ...s5,
                            bituachLeumiAnnualPaid: e.target.value,
                          })
                        }
                        className={inputCls(!!errors.bituachLeumiAnnualPaid)}
                        dir="ltr"
                        placeholder="22340"
                      />
                      <ErrorMsg msg={errors.bituachLeumiAnnualPaid} />
                      <p className="mt-1 text-xs text-stone-500">
                        52% מהסכום מוכר לניכוי
                      </p>
                    </div>

                    <div>
                      <FieldLabel htmlFor="kerenH">
                        הפקדות לקרן השתלמות (שדה 137)
                      </FieldLabel>
                      <input
                        id="kerenH"
                        type="number"
                        min={0}
                        value={s5.kerenHishtalmut}
                        onChange={(e) =>
                          setS5({ ...s5, kerenHishtalmut: e.target.value })
                        }
                        className={inputCls(!!errors.kerenHishtalmut)}
                        dir="ltr"
                        placeholder="18375"
                      />
                      <ErrorMsg msg={errors.kerenHishtalmut} />
                    </div>

                    <div>
                      <FieldLabel htmlFor="pension">
                        הפקדות לקרן פנסיה / קופת גמל
                      </FieldLabel>
                      <input
                        id="pension"
                        type="number"
                        min={0}
                        value={s5.pensionContributions}
                        onChange={(e) =>
                          setS5({
                            ...s5,
                            pensionContributions: e.target.value,
                          })
                        }
                        className={inputCls(!!errors.pensionContributions)}
                        dir="ltr"
                        placeholder="9000"
                      />
                      <ErrorMsg msg={errors.pensionContributions} />
                    </div>

                    <div>
                      <FieldLabel htmlFor="donations">
                        תרומות למוסדות מוכרים השנה
                      </FieldLabel>
                      <input
                        id="donations"
                        type="number"
                        min={0}
                        value={s5.donations}
                        onChange={(e) =>
                          setS5({ ...s5, donations: e.target.value })
                        }
                        className={inputCls(!!errors.donations)}
                        dir="ltr"
                        placeholder="0"
                      />
                      <ErrorMsg msg={errors.donations} />
                    </div>
                  </div>
                </div>

                {previewNet !== null && (
                  <div className="countme-frame px-4 py-3 mt-4">
                    <div className="text-xs text-stone-500 mb-1">
                      הכנסה חייבת (הערכה לשדה 150)
                    </div>
                    <div
                      className={cn(
                        "text-2xl font-bold font-display",
                        previewNet >= 0 ? "text-blue-700" : "text-red-600",
                      )}
                    >
                      {previewNet.toLocaleString("he-IL")} ₪
                    </div>
                    {previewNet < 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        הוצאות גבוהות מההכנסות, ייתכן הפסד עסקי לצורכי מס
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-stone-800">
                  פרטי בנק להחזר
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel htmlFor="bankName">שם הבנק</FieldLabel>
                    <input
                      id="bankName"
                      type="text"
                      value={s6.bankName}
                      onChange={(e) =>
                        setS6({ ...s6, bankName: e.target.value })
                      }
                      className={inputCls(false)}
                      placeholder="בנק הפועלים"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="bankCode">קוד בנק</FieldLabel>
                    <input
                      id="bankCode"
                      type="text"
                      maxLength={3}
                      value={s6.bankCode}
                      onChange={(e) =>
                        setS6({
                          ...s6,
                          bankCode: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      className={inputCls(false)}
                      dir="ltr"
                      placeholder="12"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel htmlFor="branchCode">קוד סניף</FieldLabel>
                    <input
                      id="branchCode"
                      type="text"
                      maxLength={4}
                      value={s6.branchCode}
                      onChange={(e) =>
                        setS6({
                          ...s6,
                          branchCode: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      className={inputCls(false)}
                      dir="ltr"
                      placeholder="538"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="account">מספר חשבון</FieldLabel>
                    <input
                      id="account"
                      type="text"
                      value={s6.accountNumber}
                      onChange={(e) =>
                        setS6({
                          ...s6,
                          accountNumber: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      className={inputCls(false)}
                      dir="ltr"
                      placeholder="489203"
                    />
                  </div>
                </div>

                <div className="border-t border-stone-200 pt-5 mt-4">
                  <h3 className="text-sm font-semibold text-stone-800 mb-3">
                    סיכום מהיר
                  </h3>
                  <div className="countme-frame px-5 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-600">
                        הכנסה חייבת (שדה 150)
                      </span>
                      <span className="text-lg font-bold font-display text-blue-700">
                        {previewNet !== null
                          ? `${previewNet.toLocaleString("he-IL")} ₪`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-600">
                        מחזור שנתי (שדות 238/294)
                      </span>
                      <span className="text-sm font-semibold">
                        {s4.totalRevenue
                          ? `${Number(s4.totalRevenue).toLocaleString("he-IL")} ₪`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-600">
                        נקודות זיכוי משוערות
                      </span>
                      <span className="text-sm font-semibold">
                        {creditPoints.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-600">
                        טופס 6111
                      </span>
                      <span className="text-sm font-semibold">
                        {Number(s4.totalRevenue) >
                        TAX_YEAR_2024.form6111Threshold
                          ? "חייבת בהגשה"
                          : "פטורה"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-stone-500 text-center">
                    הנתונים נשמרים מקומית בדפדפן שלך, אין שמירה בשרת
                  </p>
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-full border border-stone-300 px-5 py-2 text-sm text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  ← חזרה
                </button>
              ) : (
                <div />
              )}

              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm font-medium transition-colors shadow-sm"
                >
                  הבא →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm font-medium transition-colors shadow-md shadow-blue-600/20"
                >
                  הציגי את הדוח שלי →
                </button>
              )}
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-stone-400">
            רוצה לראות דמו עם נתונים בדיוניים?{" "}
            <Link href="/demo" className="text-blue-600 hover:underline">
              דלגי לדמו ←
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
