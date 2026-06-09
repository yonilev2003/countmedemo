"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Persona } from "@/lib/persona";
import { savePersona, loadPersona } from "@/lib/setup-storage";
import { getTaxYearConstants } from "@/lib/calculators/types";
import { DocumentUpload } from "@/components/upload/document-upload";
import type { ExtractedData } from "@/app/api/upload/route";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  SparklesIcon,
} from "@/components/brand/icons";
import {
  ProgressBar,
  STEP_TITLES,
  TOTAL_STEPS,
  getStepSubtitles,
} from "@/components/setup/progress";
import type {
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  Step6Data,
  Errors,
} from "@/components/setup/types";
import {
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  validateStep5,
  validateStep6,
} from "@/components/setup/validation";
import { Step1Personal } from "@/components/setup/step1-personal";
import { Step2Status } from "@/components/setup/step2-status";
import { Step3Business } from "@/components/setup/step3-business";
import { Step4Income } from "@/components/setup/step4-income";
import { Step5Deductions } from "@/components/setup/step5-deductions";
import { Step6Bank } from "@/components/setup/step6-bank";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 = optional fast-track upload, 1-6 = wizard steps
  const currentYear = new Date().getFullYear();

  /**
   * The tax year the user is filing for.
   * Default: 2024 — because 2025 indexed values are provisional (TODO(Roy) markers).
   */
  const [selectedYear, setSelectedYear] = useState<number>(2024);

  // Derive step subtitles dynamically so they always show the current selected year
  const STEP_SUBTITLES = getStepSubtitles(selectedYear);

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
    aliyahDate: "",
    academicDegreeYear: "",
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
      aliyahDate: saved.personal.aliyahDate ?? "",
      academicDegreeYear: saved.personal.academicDegreeYear?.toString() ?? "",
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

  function handleNext() {
    let errs: Errors = {};
    if (step === 0) {
      // Fast-track step has no required fields — always pass
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (step === 1) errs = validateStep1(s1);
    if (step === 2) errs = validateStep2(s2, currentYear);
    if (step === 3) errs = validateStep3(s3);
    if (step === 4) errs = validateStep4(s4);
    if (step === 5) errs = validateStep5(s5);
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
        academicDegreeYear: s2.academicDegreeYear
          ? Number(s2.academicDegreeYear)
          : null,
        aliyahDate: s2.isNewResident ? s2.aliyahDate || null : null,
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
        // Explicit toggle from step 3 — only valid if עוסק פטור AND under 120k threshold
        isOsekZeir:
          s3.isOsekZeir && s3.osekType === "patur" && totalRevenue <= 120000,
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
        isAbove6111Threshold: totalRevenue > getTaxYearConstants(selectedYear).form6111Threshold,
      },
    };
  }

  function handleSubmit() {
    const errs = validateStep6();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const persona = buildPersona();
    savePersona(persona);
    router.push("/dashboard");
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
              <Step1Personal data={s1} onChange={setS1} errors={errors} />
            )}

            {step === 2 && (
              <Step2Status
                data={s2}
                onChange={setS2}
                errors={errors}
                currentYear={currentYear}
              />
            )}

            {step === 3 && (
              <Step3Business
                data={s3}
                onChange={setS3}
                errors={errors}
                totalRevenue={Number(s4.totalRevenue) || 0}
                totalExpenses={Number(s5.totalDeductibleExpenses) || 0}
              />
            )}

            {step === 4 && (
              <Step4Income
                data={s4}
                onChange={setS4}
                errors={errors}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
              />
            )}

            {step === 5 && (
              <Step5Deductions
                data={s5}
                onChange={setS5}
                errors={errors}
                osekType={s3.osekType}
                previewNet={previewNet}
              />
            )}

            {step === 6 && (
              <Step6Bank
                data={s6}
                onChange={setS6}
                previewNet={previewNet}
                totalRevenue={s4.totalRevenue}
                creditPoints={creditPoints}
                selectedYear={selectedYear}
              />
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
