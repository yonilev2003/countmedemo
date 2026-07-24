"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Persona, MaritalStatus, OsekType } from "@/lib/persona";
import { loadPersona } from "@/lib/setup-storage";
import { persistPersona } from "@/lib/data/persona-store";
import { getTaxYearConstants } from "@/lib/calculators/types";
import { cn } from "@/lib/utils";
import { DocumentUpload } from "@/components/upload/document-upload";
import type { ExtractedData } from "@/app/api/upload/route";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import {
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  InfoIcon,
  SparklesIcon,
} from "@/components/brand/icons";

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
function getStepSubtitles(year: number): string[] {
  return [
    "כמה פרטים בסיסיים כדי לזהות אותך",
    "מעמדים מיוחדים שמשפיעים על נקודות זיכוי",
    "ספרי לנו על העסק שלך",
    `נתוני הכנסות לשנת המס ${year}`,
    "הוצאות מוכרות, ביטוחים ותרומות",
    "פרטי בנק לזיכוי, וסיכום מהיר",
  ];
}

/** Tax years available in the selector. Add future years here when constants are confirmed.
 * 2026 exposes the in-year/forecast flow (miluim credit, expanded brackets, indexed
 * ceiling); some 2026 constants still carry FLAG(Roy) in lib/calculators/types.ts. */
const AVAILABLE_TAX_YEARS: number[] = [2024, 2025, 2026];

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
  soldierServiceMonths: string;
  isNewResident: boolean;
  aliyahDate: string;
  academicDegreeYear: string;
  /** Combat ("לוחם") reserve days served in the filing year — feeds the miluim
   * credit (תיקון 283). For a 2025 filing this drives the forward-looking 2026
   * forecast; from a 2026 filing it is the qualifying-year input. */
  combatReserveDays: string;
  children: { birthYear: string }[];
}

interface Step3Data {
  tradeName: string;
  primaryOccupation: string;
  osekType: OsekType;
  isOsekZeir: boolean;
}

interface Step4Data {
  totalRevenue: string;
}

interface Step5Data {
  totalDeductibleExpenses: string;
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
      className="block text-sm font-medium text-ink mb-1"
    >
      {children}
      {required && <span className="text-alert ms-1">*</span>}
    </label>
  );
}

function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-alert">{msg}</p>;
}

function inputCls(hasError: boolean) {
  return cn(
    "w-full rounded-xl border px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 transition-colors",
    hasError
      ? "border-alert focus:border-alert focus:ring-alert/20"
      : "border-line focus:border-brand-deep focus:ring-brand-deep/15",
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
                  ? "bg-brand-deep text-white"
                  : i + 1 === step
                    ? "bg-brand-navy text-white ring-4 ring-brand-navy/15"
                    : "bg-sand text-muted",
              )}
            >
              {i + 1 < step ? (
                <CheckIcon className="size-3.5" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                "hidden md:block text-[10px] text-center leading-tight truncate w-full",
                i + 1 === step
                  ? "text-brand-navy font-medium"
                  : "text-faint",
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="h-1.5 bg-sand rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-l from-brand-deep to-brand-navy rounded-full transition-all duration-500"
          style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
        />
      </div>
      <div className="mt-2 text-start text-xs text-faint">
        {step}/{TOTAL_STEPS}
      </div>
    </div>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 = optional fast-track upload, 1-6 = wizard steps
  const currentYear = new Date().getFullYear();

  /**
   * The tax year the user is filing for.
   * Default: 2025 — the current calibration target (the pilot files the 2025
   * annual return) and confirmed in lib/calculators/types.ts. 2024 stays
   * selectable as a historical year. (Was 2024 while 2025 was provisional; that
   * reasoning is obsolete after the ty2025-alignment pass.)
   */
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  // Derive step subtitles dynamically so they always show the current selected year
  const STEP_SUBTITLES = getStepSubtitles(selectedYear);

  // עוסק זעיר / עוסק פטור share ONE ceiling (invariant in lib/calculators/types.ts).
  // Read it from the year constants — never hardcode (it is CPI-indexed: 120,000
  // for 2024–2025, 122,833 for 2026).
  const osekCeiling = getTaxYearConstants(selectedYear).osekZeirThreshold;
  const osekCeilingHe = osekCeiling.toLocaleString("he-IL");

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
    soldierServiceMonths: "",
    isNewResident: false,
    aliyahDate: "",
    academicDegreeYear: "",
    combatReserveDays: "",
    children: [],
  });

  const [s3, setS3] = useState<Step3Data>({
    tradeName: "",
    primaryOccupation: "",
    osekType: "patur",
    isOsekZeir: false,
  });

  const [s4, setS4] = useState<Step4Data>({
    totalRevenue: "",
  });

  const [s5, setS5] = useState<Step5Data>({
    totalDeductibleExpenses: "",
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
    // Returning user already has a persona — skip the upload step and go straight to the wizard
    setStep(1);
    // Restore the saved tax year too — otherwise a returning 2024 filer silently
    // re-saves everything as the default year (risk-gap #6).
    if (AVAILABLE_TAX_YEARS.includes(saved.income.year)) {
      setSelectedYear(saved.income.year);
    }
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
      soldierServiceMonths: saved.personal.soldierServiceMonths?.toString() ?? "",
      isNewResident: saved.personal.isNewResident,
      aliyahDate: saved.personal.aliyahDate ?? "",
      academicDegreeYear: saved.personal.academicDegreeYear?.toString() ?? "",
      combatReserveDays:
        saved.personal.reserveDaysByYear?.[String(saved.income.year)]?.combatDays?.toString() ??
        saved.personal.combatReserveDays?.toString() ??
        "",
      children: saved.personal.children.map((c) => ({
        birthYear: c.birthYear.toString(),
      })),
    });
    setS3({
      tradeName: saved.business.tradeName,
      primaryOccupation: saved.business.primaryOccupation,
      osekType: saved.business.osekType,
      isOsekZeir: saved.business.isOsekZeir,
    });
    setS4({
      totalRevenue: String(saved.income.totalRevenue),
    });
    setS5({
      totalDeductibleExpenses: String(saved.income.totalDeductibleExpenses),
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
      // DELIBERATION POINT: a FUTURE graduation year is intentionally NOT a hard
      // error. A user filing in advance, or who already knows their expected
      // graduation year, can enter a future year — we surface a soft heads-up
      // (academicYearNote below) instead of blocking. Only structurally
      // impossible values (non-numeric, or absurdly early) block "next".
      // Revisit if product decides a future degree year must hard-block.
      if (isNaN(y) || y < 1950) {
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
    return e;
  }

  function validateStep5(): Errors {
    const e: Errors = {};
    const ex = validateNumber(s5.totalDeductibleExpenses, "הוצאות");
    if (ex) e.totalDeductibleExpenses = ex;
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
    if (step === 0) {
      // Fast-track step has no required fields — always pass
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
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

  function applyExtracted(kind: string, data: ExtractedData) {
    if (kind === "income-report") {
      if (data.fullName) {
        const parts = data.fullName.trim().split(/\s+/);
        if (parts.length >= 2) {
          setS1((s) => ({
            ...s,
            firstName: s.firstName || parts[0],
            lastName: s.lastName || parts.slice(1).join(" "),
          }));
        }
      }
      if (data.osekType) {
        setS3((s) => ({
          ...s,
          osekType: data.osekType!,
          isOsekZeir: data.osekType === "patur" ? s.isOsekZeir : false,
        }));
      }
      if (data.totalRevenue != null) {
        setS4((s) => ({ ...s, totalRevenue: String(data.totalRevenue) }));
      }
    }
    if (kind === "expenses-excel") {
      if (data.totalExpenses != null) {
        setS5((s) => ({
          ...s,
          totalDeductibleExpenses: String(data.totalExpenses),
        }));
      }
    }
    if (kind === "donations" && data.donationsTotal != null) {
      setS5((s) => ({ ...s, donations: String(data.donationsTotal) }));
    }
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
        soldierServiceMonths:
          s2.isSoldierDischarged && s2.soldierServiceMonths
            ? Number(s2.soldierServiceMonths)
            : null,
        academicDegreeYear: s2.academicDegreeYear
          ? Number(s2.academicDegreeYear)
          : null,
        aliyahDate: s2.isNewResident ? s2.aliyahDate || null : null,
        // Combat reserve days, keyed by the filing (service) year. The miluim
        // credit for tax year N reads N-1; for the 2025 demo this feeds the
        // forward-looking 2026 forecast. TODO: capture multiple service years
        // once filings span >1 year.
        reserveDaysByYear:
          Number(s2.combatReserveDays) > 0
            ? { [String(selectedYear)]: { combatDays: Number(s2.combatReserveDays), nonCombatDays: 0 } }
            : undefined,
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
        osekStartDate: "",
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
        // Explicit toggle from step 3 — only valid if עוסק פטור AND under the
        // year-keyed ceiling (120,000 for 2024–2025, 122,833 from 2026).
        isOsekZeir:
          s3.isOsekZeir &&
          s3.osekType === "patur" &&
          totalRevenue <= getTaxYearConstants(selectedYear).osekZeirThreshold,
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
        year: selectedYear,
        totalRevenue,
        totalDeductibleExpenses,
        netIncome,
        invoiceCount: 0,
        expenseCount: 0,
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
          // Only what the user actually entered — never invent an estimate
          // (the old 12%-of-net fallback fabricated a "paid" amount; risk-gap #3).
          annualPaid: bituach,
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
        isAbove6111Threshold: totalRevenue > getTaxYearConstants(selectedYear).form6111Threshold,
      },
    };
  }

  function handleSubmit() {
    const errs = validateStep6();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const persona = buildPersona();
    persistPersona(persona);
    router.push("/dashboard");
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

  // Soft heads-up (NOT a blocking error): the academic-degree year is in the
  // future. The credit applies once the degree is actually awarded — see the
  // DELIBERATION POINT note in validateStep2.
  const academicYearIsFuture =
    !!s2.academicDegreeYear &&
    !isNaN(Number(s2.academicDegreeYear)) &&
    Number(s2.academicDegreeYear) > currentYear;

  const creditPoints = (() => {
    let pts = s1.gender === "female" ? 2.75 : 2.25;
    if (s2.isNewResident) pts += 3;
    if (s2.isSoldierDischarged) pts += 1;
    pts += s2.children.filter((c) => c.birthYear).length * 0.5;
    return pts;
  })();

  /*
   * Step-5 expense-ratio facts (NO advice — facts only, product decision).
   * The 30% threshold is the עוסק-זעיר normative-expense rate, read from the
   * year constants (never hardcoded). Two mirror cases:
   *   • זעיר  + expenses ABOVE 30% → only 30% is recognised in the זעיר track.
   *   • פטור  + expenses BELOW 30% → states the זעיר track would auto-recognise
   *     30% (more than reported). Both are neutral statements of fact.
   */
  const zeirExpenseRate =
    getTaxYearConstants(selectedYear).osekZeirExpenseRate;
  const step5Revenue = Number(s4.totalRevenue) || 0;
  const step5Expenses = Number(s5.totalDeductibleExpenses) || 0;
  const step5Ratio = step5Revenue > 0 ? step5Expenses / step5Revenue : 0;
  const showZeirOverNote =
    s3.isOsekZeir &&
    step5Revenue > 0 &&
    step5Expenses > 0 &&
    step5Ratio > zeirExpenseRate;
  const showPaturUnderNote =
    s3.osekType === "patur" &&
    !s3.isOsekZeir &&
    step5Revenue > 0 &&
    step5Expenses > 0 &&
    step5Ratio < zeirExpenseRate;
  const zeirRatePct = Math.round(zeirExpenseRate * 100);
  const zeirCapAmount = Math.round(step5Revenue * zeirExpenseRate);

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={32} />
          </Link>
          <div className="text-sm text-muted">הגדרת פרופיל</div>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <div className="rounded-2xl bg-paper border border-line shadow-brand p-7 md:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-navy text-white font-bold shadow-brand-sm text-sm shrink-0">
                {step === 0 ? (
                  <SparklesIcon className="size-4" />
                ) : (
                  step
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-brand-navy leading-tight">
                  {step === 0
                    ? "מסלול מהיר — אופציונלי"
                    : STEP_TITLES[step - 1]}
                </h1>
                <p className="text-xs text-muted mt-0.5">
                  {step === 0
                    ? "העלי מסמכים שיש לך — אחלץ נתונים ואחסוך לך מילוי ידני"
                    : STEP_SUBTITLES[step - 1]}
                </p>
              </div>
            </div>

            {step > 0 && <ProgressBar step={step} />}

            {step === 0 && (
              <DocumentUpload
                onExtracted={applyExtracted}
                onSkip={() => {
                  setStep(1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            )}

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
                        "flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors text-sm",
                        s1.gender === "female"
                          ? "border-brand-deep bg-teal-100/40 text-brand-navy font-medium"
                          : "border-line bg-paper hover:bg-cream",
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
                        "flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors text-sm",
                        s1.gender === "male"
                          ? "border-brand-deep bg-teal-100/40 text-brand-navy font-medium"
                          : "border-line bg-paper hover:bg-cream",
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
                <div className="rounded-xl border border-line bg-cream p-4">
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
                      className="h-4 w-4 mt-0.5 rounded border-line accent-brand-navy"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-ink">
                        חייל/ת משוחרר/ת
                      </span>
                      <p className="text-xs text-muted mt-0.5">
                        זכאות לנקודת זיכוי במשך 36 חודשים מהשחרור (שדה 068)
                      </p>
                    </div>
                  </label>
                  {s2.isSoldierDischarged && (
                    <div className="mt-3 me-7">
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

                      <div className="mt-3">
                        <FieldLabel htmlFor="serviceMonths">
                          כמה חודשי שירות סדיר שירת/ה?
                        </FieldLabel>
                        <input
                          id="serviceMonths"
                          type="number"
                          min={0}
                          max={60}
                          value={s2.soldierServiceMonths}
                          onChange={(e) =>
                            setS2({
                              ...s2,
                              soldierServiceMonths: e.target.value,
                            })
                          }
                          className={inputCls(false)}
                          dir="ltr"
                          placeholder="לדוגמה: 32"
                        />
                        <p className="mt-1 text-xs text-muted">
                          שירות מלא (גברים 23+ ח׳, נשים 22+ ח׳) → 2 נק׳ זיכוי לשנה;
                          שירות חלקי → 1 נק׳ לשנה. יחסי למספר החודשים בחלון 36 ח׳ מהשחרור.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-line bg-cream p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s2.isNewResident}
                      onChange={(e) =>
                        setS2({ ...s2, isNewResident: e.target.checked })
                      }
                      className="h-4 w-4 mt-0.5 rounded border-line accent-brand-navy"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-ink">
                        עולה חדש/ה
                      </span>
                      <p className="text-xs text-muted mt-0.5">
                        זכאות ל-3 נקודות זיכוי בשלוש השנים הראשונות (שדה 044)
                      </p>
                    </div>
                  </label>
                  {s2.isNewResident && (
                    <div className="mt-3 me-7">
                      <FieldLabel htmlFor="aliyahDate" required>
                        תאריך עלייה
                      </FieldLabel>
                      <input
                        id="aliyahDate"
                        type="date"
                        value={s2.aliyahDate}
                        onChange={(e) => setS2({ ...s2, aliyahDate: e.target.value })}
                        className={inputCls(false)}
                        dir="ltr"
                        max={new Date().toISOString().split("T")[0]}
                      />
                      <p className="mt-1 text-xs text-muted">
                        נדרש לחישוב מספר שנות הזכאות לנקודות עולה חדש/ה
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <FieldLabel htmlFor="academicYear">
                    שנת סיום תואר אקדמי (אופציונלי)
                  </FieldLabel>
                  <input
                    id="academicYear"
                    type="number"
                    min={1950}
                    value={s2.academicDegreeYear}
                    onChange={(e) =>
                      setS2({ ...s2, academicDegreeYear: e.target.value })
                    }
                    className={inputCls(!!errors.academicDegreeYear)}
                    dir="ltr"
                    placeholder="לדוגמה: 2022"
                  />
                  <ErrorMsg msg={errors.academicDegreeYear} />
                  {academicYearIsFuture && !errors.academicDegreeYear && (
                    <div className="mt-1.5 flex items-start gap-2 rounded-lg border border-due/30 bg-due-bg/50 px-3 py-2 text-xs text-ink">
                      <InfoIcon className="size-3.5 mt-0.5 shrink-0 text-due" />
                      <span>
                        שנת סיום עתידית — ודא/י שהתואר כבר הוענק. נקודת הזיכוי
                        ניתנת רק מהשנה שבה התואר הוענק בפועל.
                      </span>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-muted">
                    זכאות לנקודת זיכוי על תואר ראשון (שנה אחת) או תואר שני
                  </p>
                </div>

                <div>
                  <FieldLabel htmlFor="combatReserveDays">
                    ימי מילואים כלוחם/ת בשנת {selectedYear} (אופציונלי)
                  </FieldLabel>
                  <input
                    id="combatReserveDays"
                    type="number"
                    min={0}
                    max={400}
                    value={s2.combatReserveDays}
                    onChange={(e) =>
                      setS2({ ...s2, combatReserveDays: e.target.value })
                    }
                    className={inputCls(false)}
                    dir="ltr"
                    placeholder="לדוגמה: 45"
                  />
                  <p className="mt-1 text-xs text-muted">
                    נקודות זיכוי למשרתי מילואים כלוחמים (תיקון 283). הזיכוי חל מדוח
                    2026 בגין שירות 2025 — בדוח {selectedYear} יוצג כצפי בלבד.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <FieldLabel>ילדים (שנת לידה)</FieldLabel>
                    <button
                      type="button"
                      onClick={addChild}
                      className="text-xs text-brand-deep hover:underline font-medium"
                    >
                      + הוסיפי ילד/ה
                    </button>
                  </div>
                  {s2.children.length === 0 ? (
                    <p className="text-xs text-faint py-2">
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
                            className="rounded-xl border border-line px-3 py-2 text-sm text-muted hover:bg-cream hover:text-ink transition-colors"
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
                  <FieldLabel>סוג עוסק</FieldLabel>
                  {/*
                    Three osek tracks offered as first-class choices: זעיר / פטור / מורשה.
                    Data-model note: the persona keeps `osekType: "patur" | "morshe"`
                    plus a separate `isOsekZeir` flag (זעיר is an income-tax track
                    layered on עוסק פטור — both share the same VAT ceiling). So we map:
                      • "zeir"   → osekType="patur", isOsekZeir=true
                      • "patur"  → osekType="patur", isOsekZeir=false
                      • "morshe" → osekType="morshe", isOsekZeir=false
                    Facts per israeli-vat-reporting + israeli-freelancer-ops skills
                    (תיקון 257): עוסק זעיר = 30% normative expense recognition +
                    simplified reporting, SAME revenue ceiling as עוסק פטור.

                    FLAG (product decision needed): the user asked whether choosing
                    מורשה should expose an "עוסק מורשה זעיר" path. The skills do NOT
                    support a זעיר track for an עוסק מורשה — עוסק זעיר shares the
                    עוסק-פטור ceiling and is unavailable above it. We therefore do
                    NOT offer זעיר under מורשה. Confirm with a tax professional
                    before adding any murshe→zeir behavior.
                  */}
                  <OsekTypeChoice
                    osekType={s3.osekType}
                    isOsekZeir={s3.isOsekZeir}
                    ceilingHe={osekCeilingHe}
                    onChange={(next) => setS3({ ...s3, ...next })}
                  />
                </div>

                {s3.isOsekZeir && (
                  <div className="rounded-xl border border-line bg-cream p-4">
                    <p className="text-xs text-muted leading-relaxed">
                      <span className="font-medium text-ink">מסלול עוסק זעיר:</span>{" "}
                      30% מהמחזור מוכרים אוטומטית כהוצאות (כולל ביטוח לאומי), בלי
                      צורך לתעד הוצאות בפועל. אין חובת מקדמות. המסלול פתוח עד מחזור
                      של {osekCeilingHe} ₪ — אותה תקרה של עוסק פטור. יציאה מהמסלול
                      חוסמת חזרה אליו לשנתיים.
                    </p>
                    <OsekZeirNote
                      checked={s3.isOsekZeir}
                      totalRevenue={Number(s4.totalRevenue) || 0}
                      totalExpenses={Number(s5.totalDeductibleExpenses) || 0}
                      expenseRate={
                        getTaxYearConstants(selectedYear).osekZeirExpenseRate
                      }
                    />
                  </div>
                )}

              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                {/* ── Tax-year selector ─────────────────────────────────── */}
                <div className="rounded-xl bg-info/30 border border-brand-deep/20 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-brand-navy">
                      שנת המס
                    </span>
                    <div className="flex gap-2">
                      {AVAILABLE_TAX_YEARS.map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => setSelectedYear(yr)}
                          className={cn(
                            "rounded-full px-4 py-1 text-sm font-semibold transition-colors border",
                            selectedYear === yr
                              ? "bg-brand-navy text-white border-brand-navy shadow-brand-sm"
                              : "bg-paper text-brand-navy border-line hover:bg-cream hover:border-brand-deep/40",
                          )}
                        >
                          {yr}
                        </button>
                      ))}
                    </div>
                  </div>
                  {selectedYear === 2025 && (
                    <p className="mt-2 text-xs text-muted leading-relaxed">
                      נתוני 2025 מאומתים (מדרגות מס, נקודות זיכוי, תקרות קרן
                      השתלמות וביטוח לאומי). תקרות הניכוי לפנסיה ממתינות לאישור
                      סופי ויעודכנו עם פרסום נתוני האינדקס.
                    </p>
                  )}
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
                  <p className="mt-1 text-xs text-muted">
                    זה מה שייכנס לשדות 238 ו-294 בטופס
                  </p>
                </div>

              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-brand-deep/20 bg-info/30 px-4 py-3 text-sm text-brand-navy flex gap-2 items-start">
                  <InfoIcon className="size-4 mt-0.5 shrink-0 text-brand-deep" />
                  <span>
                    <span className="font-medium">הוצאות במטבע זר?</span>{" "}
                    המר/י לשקלים לפי שער יציג של בנק ישראל בתאריך כל חשבונית בנפרד. אם
                    השער השתנה במהלך השנה — כל חשבונית מקבלת שער המרה משלה. הסכום
                    המסכם בשדה זה חייב להיות שקלי.
                  </span>
                </div>
                <div>
                  <FieldLabel htmlFor="expenses" required>
                    {s3.osekType === "morshe"
                      ? "סך הוצאות מוכרות (ללא מע״מ)"
                      : "סך הוצאות מוכרות (כולל מע״מ)"}
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
                  <p className="mt-1 text-xs text-muted">
                    {s3.osekType === "morshe"
                      ? "עוסק/ת מורשה — מע״מ תשומות חוזר דרך דוח המע״מ, לא נחשב הוצאה למס הכנסה"
                      : "עוסק/ת פטור/ה — מע״מ ששולם הוא חלק מהעלות, כלול בסכום"}
                  </p>

                  {/* Factual 30% note — osek ZEIR with expenses ABOVE 30% (facts, no advice) */}
                  {showZeirOverNote && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-due/40 bg-due-bg/60 px-3 py-2.5 text-xs leading-relaxed text-ink">
                      <InfoIcon className="size-4 mt-0.5 shrink-0 text-due" />
                      <span>
                        <span className="font-semibold text-due">שים/י לב: </span>
                        במסלול עוסק זעיר מוכרים רק {zeirRatePct}% מההוצאות
                        ({zeirCapAmount.toLocaleString("he-IL")} ₪). המספרים שהזנת
                        ({step5Expenses.toLocaleString("he-IL")} ₪) גבוהים יותר —{" "}
                        {Math.round(step5Ratio * 100)}% מהמחזור.
                      </span>
                    </div>
                  )}

                  {/* Mirror factual note — osek PATUR (not zeir) with expenses BELOW 30% */}
                  {showPaturUnderNote && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-brand-deep/25 bg-info/30 px-3 py-2.5 text-xs leading-relaxed text-ink">
                      <InfoIcon className="size-4 mt-0.5 shrink-0 text-brand-deep" />
                      <span>
                        <span className="font-semibold text-brand-deep">
                          לידיעתך:{" "}
                        </span>
                        ההוצאות שהזנת ({step5Expenses.toLocaleString("he-IL")} ₪)
                        הן {Math.round(step5Ratio * 100)}% מהמחזור — נמוכות מסף
                        ה-{zeirRatePct}% של מסלול עוסק זעיר, שבו מוכרים אוטומטית{" "}
                        {zeirCapAmount.toLocaleString("he-IL")} ₪.
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-line pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-ink mb-3">
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
                      <p className="mt-1 text-xs text-muted">
                        {/* DRAFT — pending Roy: ב"ל/בריאות split (persona.ts FLAG) */}
                        שימו לב: הסכום בשובר השנתי כולל גם דמי ביטוח בריאות —
                        הניכוי (52%) חל על רכיב דמי הביטוח הלאומי בלבד
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
                    {/* WS8 audit H11 — exact calculator output, not an estimate;
                        the honest caveat is input-completeness only. */}
                    <div className="text-xs text-muted mb-1">
                      הכנסה חייבת (חישוב לשדה 150, לפי הנתונים שהזנת עד כה)
                    </div>
                    <div
                      className={cn(
                        "text-2xl font-bold font-display",
                        previewNet >= 0 ? "text-brand-navy" : "text-alert",
                      )}
                    >
                      {previewNet.toLocaleString("he-IL")} ₪
                    </div>
                    {previewNet < 0 && (
                      <p className="text-xs text-alert mt-1">
                        הוצאות גבוהות מההכנסות, ייתכן הפסד עסקי לצורכי מס
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-ink">
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

                <div className="border-t border-line pt-5 mt-4">
                  <h3 className="text-sm font-semibold text-ink mb-3">
                    סיכום מהיר
                  </h3>
                  <div className="countme-frame px-5 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted">
                        הכנסה חייבת (שדה 150)
                      </span>
                      <span className="text-lg font-bold font-display text-brand-navy">
                        {previewNet !== null
                          ? `${previewNet.toLocaleString("he-IL")} ₪`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted">
                        מחזור שנתי (שדות 238/294)
                      </span>
                      <span className="text-sm font-semibold text-ink">
                        {s4.totalRevenue
                          ? `${Number(s4.totalRevenue).toLocaleString("he-IL")} ₪`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted">
                        נקודות זיכוי משוערות
                      </span>
                      <span className="text-sm font-semibold text-ink">
                        {creditPoints.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted">
                        טופס 6111
                      </span>
                      <span className="text-sm font-semibold text-ink">
                        {Number(s4.totalRevenue) >
                        getTaxYearConstants(selectedYear).form6111Threshold
                          ? "חייבת בהגשה"
                          : "פטורה"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-faint text-center">
                    {/* DRAFT — NEEDS LEGAL REVIEW (storage/consent line) */}
                    הנתונים נשמרים בדפדפן שלך, ולמחוברים — גם בחשבון האישי, לפי{" "}
                    <a href="/privacy" className="underline hover:text-brand-deep">
                      מדיניות הפרטיות
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* Bottom nav — DocumentUpload has its own "skip"/"continue" button at step 0 */}
            {step > 0 && (
              <div className="mt-8 flex items-center justify-between gap-3">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className={btn("secondary", "sm")}
                  >
                    <ArrowRightIcon className="size-4" />
                    חזרה
                  </button>
                ) : (
                  <div />
                )}

                {step < TOTAL_STEPS ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className={btn("primary", "sm")}
                  >
                    הבא
                    <ArrowLeftIcon className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className={btn("primary")}
                  >
                    הציגי את הדוח שלי
                    <ArrowLeftIcon className="size-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-faint">
            רוצה לראות דמו עם נתונים בדיוניים?{" "}
            <Link href="/demo" className="text-brand-deep hover:underline">
              דלגי לדמו
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

/**
 * Three osek-track selector: זעיר / פטור / מורשה.
 *
 * The persona data model stores `osekType` ("patur" | "morshe") + a separate
 * `isOsekZeir` boolean (זעיר is an income-tax track layered on עוסק פטור). This
 * component presents all three as first-class radio options and maps the chosen
 * one back onto that model. See the FLAG comment at the call site re: why מורשה
 * does NOT expose a זעיר sub-track.
 */
type OsekChoice = "zeir" | "patur" | "morshe";

function currentOsekChoice(osekType: OsekType, isOsekZeir: boolean): OsekChoice {
  if (osekType === "morshe") return "morshe";
  return isOsekZeir ? "zeir" : "patur";
}

function OsekTypeChoice({
  osekType,
  isOsekZeir,
  ceilingHe,
  onChange,
}: {
  osekType: OsekType;
  isOsekZeir: boolean;
  ceilingHe: string;
  onChange: (next: { osekType: OsekType; isOsekZeir: boolean }) => void;
}) {
  const selected = currentOsekChoice(osekType, isOsekZeir);

  const options: {
    key: OsekChoice;
    title: string;
    desc: string;
    next: { osekType: OsekType; isOsekZeir: boolean };
  }[] = [
    {
      key: "zeir",
      title: "עוסק זעיר",
      desc: `מסלול מס פשוט לעוסק פטור — 30% מהמחזור מוכרים אוטומטית כהוצאות. מחזור עד ${ceilingHe} ₪.`,
      next: { osekType: "patur", isOsekZeir: true },
    },
    {
      key: "patur",
      title: "עוסק פטור",
      desc: `פטור מגביית מע״מ, מדווח הוצאות בפועל. מחזור עד ${ceilingHe} ₪.`,
      next: { osekType: "patur", isOsekZeir: false },
    },
    {
      key: "morshe",
      title: "עוסק מורשה",
      desc: "גובה ומדווח מע״מ, מקזז מע״מ תשומות. ללא תקרת מחזור.",
      next: { osekType: "morshe", isOsekZeir: false },
    },
  ];

  return (
    <div className="space-y-2.5" role="radiogroup" aria-label="סוג עוסק">
      {options.map((opt) => {
        const active = selected === opt.key;
        return (
          <label
            key={opt.key}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors",
              active
                ? "border-brand-deep bg-teal-100/40"
                : "border-line bg-paper hover:bg-cream",
            )}
          >
            <input
              type="radio"
              name="osekChoice"
              value={opt.key}
              checked={active}
              onChange={() => onChange(opt.next)}
              className="mt-0.5 h-4 w-4 accent-brand-navy"
            />
            <div className="flex-1">
              <span
                className={cn(
                  "text-sm font-medium",
                  active ? "text-brand-navy" : "text-ink",
                )}
              >
                {opt.title}
              </span>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">
                {opt.desc}
              </p>
            </div>
          </label>
        );
      })}
    </div>
  );
}

/**
 * FACTUAL note (no advice) shown when osek zeir is selected but real expenses
 * exceed the 30% auto-recognition. States the numbers only — does not tell the
 * user what to do. The advice framing was intentionally removed (product
 * decision: "facts, not advice"). The legal disclaimer lives elsewhere.
 *
 * Reference: מסלול עוסק זעיר (תיקון 257 לפקודת מס הכנסה, 2024) — ניכוי אוטומטי
 * של 30% מהמחזור כהוצאות במקום הוצאות בפועל. The 30% rate flows in via
 * `expenseRate` from the year constants (never hardcoded here).
 */
function OsekZeirNote({
  checked,
  totalRevenue,
  totalExpenses,
  expenseRate,
}: {
  checked: boolean;
  totalRevenue: number;
  totalExpenses: number;
  expenseRate: number;
}) {
  if (!checked) return null;
  if (totalRevenue <= 0 || totalExpenses <= 0) return null;

  const ratio = totalExpenses / totalRevenue;
  if (ratio <= expenseRate) return null;
  const recognized = Math.round(totalRevenue * expenseRate);
  const notRecognized = Math.round(totalExpenses - recognized);

  return (
    <div className="mt-3 rounded-xl border border-due/40 bg-due-bg/60 p-3">
      <div className="flex items-start gap-2">
        <InfoIcon className="size-4 text-due shrink-0 mt-0.5" />
        <div className="flex-1 text-xs leading-relaxed text-ink">
          <p className="font-bold mb-1 text-due">
            שים/י לב: במסלול עוסק זעיר מוכרים רק {Math.round(expenseRate * 100)}%
            מההוצאות
          </p>
          <p>
            במסלול זעיר מוכרים אוטומטית {recognized.toLocaleString("he-IL")} ₪
            ({Math.round(expenseRate * 100)}% מהמחזור). ההוצאות שהזנת
            ({totalExpenses.toLocaleString("he-IL")} ₪) גבוהות יותר — הן{" "}
            <strong>{Math.round(ratio * 100)}%</strong> מהמחזור, כך
            ש-<strong>{notRecognized.toLocaleString("he-IL")} ₪</strong> מעבר
            לתקרת ה-{Math.round(expenseRate * 100)}% לא נכללים בחישוב המסלול.
          </p>
        </div>
      </div>
    </div>
  );
}
