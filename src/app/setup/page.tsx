"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Persona, MaritalStatus, OsekType } from "@/lib/persona";
import { savePersona, loadPersona } from "@/lib/setup-storage";
import { cn } from "@/lib/utils";

// ─── Teudat Zehut validation ─────────────────────────────────────────────────
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

// ─── Form state types ─────────────────────────────────────────────────────────
interface Step1Data {
  firstName: string;
  lastName: string;
  teudatZehut: string;
  birthDate: string;
  maritalStatus: MaritalStatus;
  isSoldierDischarged: boolean;
  isNewResident: boolean;
}

interface Step2Data {
  tradeName: string;
  primaryOccupation: string;
  osekType: OsekType;
}

interface Step3Data {
  totalRevenue: string;
  invoiceCount: string;
}

interface Step4Data {
  totalDeductibleExpenses: string;
  expenseCount: string;
}

type Errors = Record<string, string>;

// ─── Input / Label helpers ────────────────────────────────────────────────────
function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-stone-700 mb-1">
      {children}
      {required && <span className="text-red-500 mr-1">*</span>}
    </label>
  );
}

function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

function textInputClass(hasError: boolean) {
  return cn(
    "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "border-stone-300 focus:border-blue-500 focus:ring-blue-200"
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step, total }: { step: number; total: number }) {
  const steps = [
    "פרטים אישיים",
    "פרטי עסק",
    "הכנסות",
    "הוצאות",
  ];
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        {steps.map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-1" style={{ width: `${100 / total}%` }}>
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
                i + 1 < step
                  ? "bg-blue-600 text-white"
                  : i + 1 === step
                  ? "bg-blue-600 text-white ring-4 ring-blue-100"
                  : "bg-stone-200 text-stone-400"
              )}
            >
              {i + 1 < step ? "✓" : i + 1}
            </div>
            <span
              className={cn(
                "hidden sm:block text-[10px] text-center leading-tight",
                i + 1 === step ? "text-blue-700 font-medium" : "text-stone-400"
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
          style={{ width: `${((step - 1) / (total - 1)) * 100}%` }}
        />
      </div>
      <div className="mt-2 text-left text-xs text-stone-400">{step}/{total}</div>
    </div>
  );
}

// ─── Main wizard component ────────────────────────────────────────────────────
export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [step1, setStep1] = useState<Step1Data>({
    firstName: "",
    lastName: "",
    teudatZehut: "",
    birthDate: "",
    maritalStatus: "single",
    isSoldierDischarged: false,
    isNewResident: false,
  });

  const [step2, setStep2] = useState<Step2Data>({
    tradeName: "",
    primaryOccupation: "",
    osekType: "patur",
  });

  const [step3, setStep3] = useState<Step3Data>({
    totalRevenue: "",
    invoiceCount: "",
  });

  const [step4, setStep4] = useState<Step4Data>({
    totalDeductibleExpenses: "",
    expenseCount: "",
  });

  const [errors, setErrors] = useState<Errors>({});

  // Pre-fill from localStorage if available
  useEffect(() => {
    const saved = loadPersona();
    if (!saved) return;
    setStep1({
      firstName: saved.personal.firstName,
      lastName: saved.personal.lastName,
      teudatZehut: saved.personal.teudatZehut,
      birthDate: saved.personal.birthDate,
      maritalStatus: saved.personal.maritalStatus,
      isSoldierDischarged: saved.personal.isSoldierDischarged,
      isNewResident: saved.personal.isNewResident,
    });
    setStep2({
      tradeName: saved.business.tradeName,
      primaryOccupation: saved.business.primaryOccupation,
      osekType: saved.business.osekType,
    });
    setStep3({
      totalRevenue: String(saved.income.totalRevenue),
      invoiceCount: String(saved.income.invoiceCount),
    });
    setStep4({
      totalDeductibleExpenses: String(saved.income.totalDeductibleExpenses),
      expenseCount: String(saved.income.expenseCount),
    });
  }, []);

  // ── Validation ──────────────────────────────────────────────────────────────
  function validateStep1(): Errors {
    const e: Errors = {};
    if (!step1.firstName.trim()) e.firstName = "שדה חובה";
    if (!step1.lastName.trim()) e.lastName = "שדה חובה";
    if (!step1.teudatZehut.trim()) {
      e.teudatZehut = "שדה חובה";
    } else if (!/^\d{9}$/.test(step1.teudatZehut)) {
      e.teudatZehut = "תעודת זהות חייבת להכיל בדיוק 9 ספרות";
    } else if (!validateTeudatZehut(step1.teudatZehut)) {
      e.teudatZehut = "מספר תעודת הזהות אינו תקין";
    }
    if (!step1.birthDate) e.birthDate = "שדה חובה";
    return e;
  }

  function validateStep2(): Errors {
    const e: Errors = {};
    if (!step2.tradeName.trim()) e.tradeName = "שדה חובה";
    if (!step2.primaryOccupation.trim()) e.primaryOccupation = "שדה חובה";
    return e;
  }

  function validateStep3(): Errors {
    const e: Errors = {};
    if (!step3.totalRevenue) {
      e.totalRevenue = "שדה חובה";
    } else if (isNaN(Number(step3.totalRevenue)) || Number(step3.totalRevenue) < 0) {
      e.totalRevenue = "יש להזין מספר חיובי";
    }
    if (!step3.invoiceCount) {
      e.invoiceCount = "שדה חובה";
    } else if (isNaN(Number(step3.invoiceCount)) || Number(step3.invoiceCount) < 0) {
      e.invoiceCount = "יש להזין מספר חיובי";
    }
    return e;
  }

  function validateStep4(): Errors {
    const e: Errors = {};
    if (!step4.totalDeductibleExpenses) {
      e.totalDeductibleExpenses = "שדה חובה";
    } else if (isNaN(Number(step4.totalDeductibleExpenses)) || Number(step4.totalDeductibleExpenses) < 0) {
      e.totalDeductibleExpenses = "יש להזין מספר חיובי";
    }
    if (!step4.expenseCount) {
      e.expenseCount = "שדה חובה";
    } else if (isNaN(Number(step4.expenseCount)) || Number(step4.expenseCount) < 0) {
      e.expenseCount = "יש להזין מספר חיובי";
    }
    return e;
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  function handleNext() {
    let errs: Errors = {};
    if (step === 1) errs = validateStep1();
    if (step === 2) errs = validateStep2();
    if (step === 3) errs = validateStep3();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setStep((s) => s + 1);
  }

  function handleBack() {
    setErrors({});
    setStep((s) => s - 1);
  }

  function handleSubmit() {
    const errs = validateStep4();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const totalRevenue = Number(step3.totalRevenue);
    const totalDeductibleExpenses = Number(step4.totalDeductibleExpenses);
    const netIncome = totalRevenue - totalDeductibleExpenses;

    const persona: Persona = {
      id: "user-" + Date.now(),
      displayName: `${step1.firstName} ${step1.lastName}`,
      personal: {
        firstName: step1.firstName,
        lastName: step1.lastName,
        fatherName: null,
        teudatZehut: step1.teudatZehut,
        birthDate: step1.birthDate,
        maritalStatus: step1.maritalStatus,
        spouse: null,
        isNewResident: step1.isNewResident,
        isReturningResident: false,
        isEilatResident: false,
        isSoldierDischarged: step1.isSoldierDischarged,
        soldierDischargeDate: step1.isSoldierDischarged
          ? new Date().toISOString().split("T")[0]
          : null,
        academicDegreeYear: null,
      },
      contact: {
        mailingAddress: { street: "", houseNumber: "", city: "", zipCode: "" },
        residenceSameAsMailing: true,
        email: "",
        phoneMobile: "",
        phoneWork: null,
        phoneHome: null,
        consentDigitalNotices: false,
      },
      business: {
        tradeName: step2.tradeName,
        primaryOccupation: step2.primaryOccupation,
        osekType: step2.osekType,
        osekFileNumber: "",
        osekStartDate: "2020-01-01",
        address: {
          sameAsResidence: true,
          street: null,
          houseNumber: null,
          city: null,
          zipCode: null,
        },
        bookkeepingMethod: "single-entry",
        bookkeepingType: "computerized",
        isSmallBusiness: true,
        hasEmployees: false,
        employerNames: [],
      },
      bank: {
        bankCode: "",
        bankName: "",
        branchCode: "",
        accountNumber: "",
        accountOwnerName: `${step1.firstName} ${step1.lastName}`,
      },
      income: {
        year: 2024,
        totalRevenue,
        totalDeductibleExpenses,
        netIncome,
        invoiceCount: Number(step3.invoiceCount),
        expenseCount: Number(step4.expenseCount),
        monthlyBreakdown: [],
      },
      deductionsAndCredits: {
        kerenHishtalmut: { annualContribution: 0 },
        kupatGemel: { annualContribution: 0 },
        bituachLeumiSelfEmployed: {
          annualPaid: Math.round(netIncome * 0.12),
        },
        bituachLifeOrCancerPolicy: 0,
        donations: { currentYear: 0, carriedFromPriorYears: 0 },
        academicDegreeCredit: false,
      },
      vatAndTurnover: {
        annualTurnoverWithoutVat: totalRevenue,
        isAbove6111Threshold: totalRevenue > 256410,
      },
    };

    savePersona(persona);
    router.push("/demo");
  }

  // ── Computed preview (Step 4) ────────────────────────────────────────────────
  const previewNet =
    step === 4 &&
    !isNaN(Number(step3.totalRevenue)) &&
    !isNaN(Number(step4.totalDeductibleExpenses))
      ? Number(step3.totalRevenue) - Number(step4.totalDeductibleExpenses)
      : null;

  // ── Render ───────────────────────────────────────────────────────────────────
  const stepTitles = [
    "פרטים אישיים",
    "פרטי עסק",
    "הכנסות",
    "הוצאות",
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
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

      {/* Wizard card */}
      <main className="flex flex-1 items-start justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Card */}
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-8">
            {/* Title */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold shadow-sm text-sm">
                {step}
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight">{stepTitles[step - 1]}</h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  {step === 1 && "כמה פרטים בסיסיים כדי לזהות אותך"}
                  {step === 2 && "ספר/י לנו על העסק שלך"}
                  {step === 3 && "נתוני הכנסות לשנת המס 2024"}
                  {step === 4 && "נתוני הוצאות לשנת המס 2024"}
                </p>
              </div>
            </div>

            <ProgressBar step={step} total={4} />

            {/* ── Step 1 ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel htmlFor="firstName" required>שם פרטי</FieldLabel>
                    <input
                      id="firstName"
                      type="text"
                      value={step1.firstName}
                      onChange={(e) => setStep1({ ...step1, firstName: e.target.value })}
                      className={textInputClass(!!errors.firstName)}
                      placeholder="דנה"
                      autoComplete="given-name"
                    />
                    <ErrorMsg msg={errors.firstName} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="lastName" required>שם משפחה</FieldLabel>
                    <input
                      id="lastName"
                      type="text"
                      value={step1.lastName}
                      onChange={(e) => setStep1({ ...step1, lastName: e.target.value })}
                      className={textInputClass(!!errors.lastName)}
                      placeholder="כהן"
                      autoComplete="family-name"
                    />
                    <ErrorMsg msg={errors.lastName} />
                  </div>
                </div>

                <div>
                  <FieldLabel htmlFor="teudatZehut" required>תעודת זהות</FieldLabel>
                  <input
                    id="teudatZehut"
                    type="text"
                    inputMode="numeric"
                    maxLength={9}
                    value={step1.teudatZehut}
                    onChange={(e) =>
                      setStep1({ ...step1, teudatZehut: e.target.value.replace(/\D/g, "") })
                    }
                    className={textInputClass(!!errors.teudatZehut)}
                    placeholder="9 ספרות"
                    dir="ltr"
                  />
                  <ErrorMsg msg={errors.teudatZehut} />
                </div>

                <div>
                  <FieldLabel htmlFor="birthDate" required>תאריך לידה</FieldLabel>
                  <input
                    id="birthDate"
                    type="date"
                    value={step1.birthDate}
                    onChange={(e) => setStep1({ ...step1, birthDate: e.target.value })}
                    className={cn(textInputClass(!!errors.birthDate), "dir-ltr")}
                    dir="ltr"
                    max={new Date().toISOString().split("T")[0]}
                  />
                  <ErrorMsg msg={errors.birthDate} />
                </div>

                <div>
                  <FieldLabel htmlFor="maritalStatus">מצב משפחתי</FieldLabel>
                  <select
                    id="maritalStatus"
                    value={step1.maritalStatus}
                    onChange={(e) =>
                      setStep1({ ...step1, maritalStatus: e.target.value as MaritalStatus })
                    }
                    className={textInputClass(false)}
                  >
                    <option value="single">רווק/ה</option>
                    <option value="married">נשוי/ה</option>
                    <option value="divorced">גרוש/ה</option>
                    <option value="widowed">אלמן/ה</option>
                  </select>
                </div>

                <div className="space-y-3 pt-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={step1.isSoldierDischarged}
                      onChange={(e) =>
                        setStep1({ ...step1, isSoldierDischarged: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-stone-700">
                      שוחררתי מהצבא בשלוש השנים האחרונות
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={step1.isNewResident}
                      onChange={(e) =>
                        setStep1({ ...step1, isNewResident: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-stone-700">
                      עולה חדש/ה (עליתי בשלוש השנים האחרונות)
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <FieldLabel htmlFor="tradeName" required>שם העסק שלך</FieldLabel>
                  <input
                    id="tradeName"
                    type="text"
                    value={step2.tradeName}
                    onChange={(e) => setStep2({ ...step2, tradeName: e.target.value })}
                    className={textInputClass(!!errors.tradeName)}
                    placeholder='לדוגמה: "דנה כהן פרילנסר"'
                  />
                  <ErrorMsg msg={errors.tradeName} />
                </div>

                <div>
                  <FieldLabel htmlFor="primaryOccupation" required>תחום עיסוק</FieldLabel>
                  <input
                    id="primaryOccupation"
                    type="text"
                    value={step2.primaryOccupation}
                    onChange={(e) => setStep2({ ...step2, primaryOccupation: e.target.value })}
                    className={textInputClass(!!errors.primaryOccupation)}
                    placeholder="לדוגמה: עיצוב UX, פיתוח תוכנה"
                  />
                  <ErrorMsg msg={errors.primaryOccupation} />
                </div>

                <div>
                  <FieldLabel htmlFor="osekType">סוג עוסק</FieldLabel>
                  <select
                    id="osekType"
                    value={step2.osekType}
                    onChange={(e) =>
                      setStep2({ ...step2, osekType: e.target.value as OsekType })
                    }
                    className={textInputClass(false)}
                  >
                    <option value="patur">עוסק פטור</option>
                    <option value="morshe">עוסק מורשה</option>
                    <option value="company">חברה בע&quot;מ</option>
                  </select>
                </div>
              </div>
            )}

            {/* ── Step 3 ── */}
            {step === 3 && (
              <div className="space-y-4">
                {/* Read-only tax year */}
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 font-medium">
                  שנת המס: 2024
                </div>

                <div>
                  <FieldLabel htmlFor="totalRevenue" required>
                    סה&quot;כ הכנסות ברוטו מהעסק (בש&quot;ח)
                  </FieldLabel>
                  <input
                    id="totalRevenue"
                    type="number"
                    min={0}
                    value={step3.totalRevenue}
                    onChange={(e) => setStep3({ ...step3, totalRevenue: e.target.value })}
                    className={cn(textInputClass(!!errors.totalRevenue), "dir-ltr")}
                    dir="ltr"
                    placeholder="120000"
                  />
                  <ErrorMsg msg={errors.totalRevenue} />
                </div>

                <div>
                  <FieldLabel htmlFor="invoiceCount" required>
                    מספר חשבוניות שהוצאת בשנה
                  </FieldLabel>
                  <input
                    id="invoiceCount"
                    type="number"
                    min={0}
                    value={step3.invoiceCount}
                    onChange={(e) => setStep3({ ...step3, invoiceCount: e.target.value })}
                    className={cn(textInputClass(!!errors.invoiceCount), "dir-ltr")}
                    dir="ltr"
                    placeholder="48"
                  />
                  <ErrorMsg msg={errors.invoiceCount} />
                </div>
              </div>
            )}

            {/* ── Step 4 ── */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <FieldLabel htmlFor="totalDeductibleExpenses" required>
                      סה&quot;כ הוצאות מוכרות (בש&quot;ח)
                    </FieldLabel>
                    <div className="relative group">
                      <span className="text-stone-400 text-sm cursor-help">?</span>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-60 rounded-lg bg-stone-800 text-white text-xs p-2.5 leading-relaxed z-10 shadow-lg text-right">
                        הוצאות שהמס מכיר בהן: ציוד, תחבורה עסקית, טלפון, שיווק וכו&apos;
                      </div>
                    </div>
                  </div>
                  <input
                    id="totalDeductibleExpenses"
                    type="number"
                    min={0}
                    value={step4.totalDeductibleExpenses}
                    onChange={(e) =>
                      setStep4({ ...step4, totalDeductibleExpenses: e.target.value })
                    }
                    className={cn(textInputClass(!!errors.totalDeductibleExpenses), "dir-ltr")}
                    dir="ltr"
                    placeholder="30000"
                  />
                  <ErrorMsg msg={errors.totalDeductibleExpenses} />
                </div>

                <div>
                  <FieldLabel htmlFor="expenseCount" required>
                    מספר קבלות / הוצאות מוכרות
                  </FieldLabel>
                  <input
                    id="expenseCount"
                    type="number"
                    min={0}
                    value={step4.expenseCount}
                    onChange={(e) => setStep4({ ...step4, expenseCount: e.target.value })}
                    className={cn(textInputClass(!!errors.expenseCount), "dir-ltr")}
                    dir="ltr"
                    placeholder="24"
                  />
                  <ErrorMsg msg={errors.expenseCount} />
                </div>

                {/* Live preview card */}
                {previewNet !== null && (
                  <div className="countme-frame px-4 py-3 mt-2">
                    <div className="text-xs text-stone-500 mb-1">
                      הכנסה חייבת (הערכה לשדה 150):
                    </div>
                    <div
                      className={cn(
                        "text-2xl font-bold font-display",
                        previewNet >= 0 ? "text-blue-700" : "text-red-600"
                      )}
                    >
                      {previewNet.toLocaleString("he-IL")} ₪
                    </div>
                    {previewNet < 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        הוצאות גבוהות מההכנסות — ייתכן הפסד עסקי לצורכי מס
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Navigation buttons ── */}
            <div className="mt-8 flex items-center justify-between gap-3">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-full border border-stone-300 px-5 py-2 text-sm text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  ← חזור
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
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
                  הצג את הדו&quot;ח שלי →
                </button>
              )}
            </div>
          </div>

          {/* Skip link */}
          <p className="mt-4 text-center text-xs text-stone-400">
            רוצה לראות דמו עם נתונים בדיוניים?{" "}
            <Link href="/demo" className="text-blue-600 hover:underline">
              דלג/י לדמו ←
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
