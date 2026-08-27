"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Persona, MaritalStatus, OsekType } from "@/lib/persona";
import {
  loadPersona,
  markPersonaContinueIntent,
  markShowSaveConfirmation,
  CONTINUE_INTENT_QUERY_PARAM,
  CONTINUE_INTENT_QUERY_VALUE,
} from "@/lib/setup-storage";
import {
  persistPersona,
  retryPersonaSave,
  getCurrentUserId,
  syncPersonaFromDb,
} from "@/lib/data/persona-store";
import { getTaxYearConstants } from "@/lib/calculators/types";
import { computeBusinessIncome } from "@/lib/calculators";
import { computeCeilingAlert } from "@/lib/alerts/ceiling";
import { CeilingAlertCard } from "@/components/alerts/ceiling-alert";
import { cn, ils, numberInputWheelGuard } from "@/lib/utils";
import { DocumentUpload } from "@/components/upload/document-upload";
import type { ExtractedData } from "@/app/api/upload/route";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { LegalNote, LEGAL_NOTE_FULL } from "@/components/brand/legal-note";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { OccupationPicker } from "@/components/setup/occupation-picker";
import { CityPicker } from "@/components/setup/city-picker";
import { StreetPicker } from "@/components/setup/street-picker";
import { BankNamePicker } from "@/components/setup/bank-name-picker";
import { StatusBadge } from "@/components/brand/status";
import { nextInvoiceNumber } from "@/lib/invoice-generator";
import {
  CheckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  InfoIcon,
  SparklesIcon,
  ChevronDownIcon,
  AlertTriangleIcon,
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

/**
 * Screen model (countme-journey-v5): the wizard renders as 7 screens grouped
 * into 5 named phases shown in the chip bar. Splitting the old step 3 (פרטי
 * עסק) into two screens — היכרות (tap questions) and העסק (identity fields)
 * — is a RENDERING split only: both screens read/write the same s3 state
 * object, and validateStep3 (below) is kept intact as the reference
 * definition; two new validators (validateStep3Intro / validateStep3Identity)
 * each check a subset of it for their own screen's "הבא" gate.
 *
 * The artifact's original phase 2 was אימות/SMS — we have no SMS auth, so
 * כספים honestly takes that slot (product decision, 2026-08-17): the finance
 * screens stay because they feed the Form-1301 demo.
 */
const TOTAL_SCREENS = 7;

const PHASES = ["פרטים", "היכרות", "העסק", "כספים", "סיום"] as const;

/** Which phase (0-indexed into PHASES) each screen (1-indexed) belongs to. */
const SCREEN_PHASE: number[] = [0, 0, 1, 2, 3, 3, 3];

/** [current, total] sub-step within the screen's phase — drives the header
 * badge and the "שלב X מתוך Y" line under the chip bar. */
const SCREEN_SUBSTEP: [number, number][] = [
  [1, 2],
  [2, 2],
  [1, 1],
  [1, 1],
  [1, 3],
  [2, 3],
  [3, 3],
];

const SCREEN_TITLES = [
  "פרטים אישיים",
  "מעמד ומשפחה",
  "היכרות עם העסק",
  "פרטי העסק",
  "הכנסות",
  "הוצאות וניכויים",
  "בנק וסיכום",
];
function getScreenSubtitles(year: number): string[] {
  return [
    "כמה פרטים בסיסיים כדי לזהות אותך",
    "מעמדים מיוחדים שמשפיעים על נקודות זיכוי",
    "כמה שאלות קצרות כדי להכיר את העסק שלך",
    "שם, מספר עוסק וכתובת — איך שיופיעו על המסמכים שלך",
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
  // "" = not yet chosen. It affects credit points (2.75 vs 2.25) so a silent
  // default is a wrong-tax risk (QA #12) — the wizard must force an explicit
  // pick before the persona is built (validateStep1 below), unlike the persona
  // type itself which stays "male" | "female" (no empty state downstream).
  gender: "male" | "female" | "";
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
  /** When the business's file was opened (מועד פתיחת תיק) — optional, feeds business.osekStartDate. */
  osekStartDate: string;
  /** Did the user already issue invoices/receipts elsewhere before starting with countme? */
  priorInvoicing: boolean;
  /** If so — the next number to continue from, so countme's numbering never collides with a prior series. */
  priorInvoiceNumber: string;
  /**
   * Whether the user has explicitly confirmed a real osek track (פטור/מורשה).
   * Required before Next — tapping the "חברה בע״מ"/"עדיין לא פתחתי עוסק"
   * explainer-only cards never sets this (onboarding-v5 §5).
   */
  osekTrackPicked: boolean;
  businessAgeBucket: "" | "pre" | "first-year" | "1-3" | "3-5" | "5plus";
  priorDocumentMethod: "" | "none" | "manual-book" | "other-digital" | "accountant";
  hasEcommerceSite: boolean;
  /** Editable, prefilled from the TZ in the UI (display fallback, not stored until touched). */
  osekFileNumber: string;
  tradeNameEn: string;
  addressCity: string;
  addressStreet: string;
  addressHouseNumber: string;
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

/**
 * countme-journey-v5 chip bar: 5 named phases (RTL — פרטים first from the
 * right, the natural flex order under dir="rtl"). Completed phases are navy
 * with a check icon, the active phase is navy + bold/slightly larger,
 * upcoming phases are a bordered paper pill. Below the chips: the
 * sub-progress label ("שלב X מתוך Y") for the active phase, and a slim track
 * that fills continuously across all 7 screens — replaces the old
 * 6-numbered-circles bar entirely.
 */
function PhaseChipBar({ screen }: { screen: number }) {
  const currentPhase = SCREEN_PHASE[screen - 1];
  const [subStep, subTotal] = SCREEN_SUBSTEP[screen - 1];
  const overallPct = ((screen - 1) / (TOTAL_SCREENS - 1)) * 100;

  return (
    <div className="mb-7">
      <div className="flex items-center gap-0.5 sm:gap-1.5 mb-3">
        {PHASES.map((name, i) => {
          const state =
            i < currentPhase ? "done" : i === currentPhase ? "active" : "upcoming";
          return (
            <div key={name} className="flex flex-1 min-w-0 items-center">
              <span
                className={cn(
                  "flex flex-1 min-w-0 items-center justify-center gap-0.5 rounded-full px-1 py-1.5 text-center text-[10px] transition-colors sm:gap-1 sm:px-3 sm:text-xs",
                  state === "done" && "bg-brand-navy text-white",
                  state === "active" &&
                    "bg-brand-navy text-white font-bold ring-2 ring-brand-navy/20 sm:scale-105",
                  state === "upcoming" &&
                    "border border-line bg-paper text-faint",
                )}
              >
                {state === "done" && (
                  <CheckCircleIcon className="size-2.5 shrink-0 sm:size-3.5" />
                )}
                <span className="truncate">{name}</span>
              </span>
              {i < PHASES.length - 1 && (
                <span
                  aria-hidden
                  className="h-px w-1 shrink-0 bg-line sm:w-3"
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs text-faint">
          שלב {subStep} מתוך {subTotal}
        </span>
        <span className="text-xs text-faint">
          {screen}/{TOTAL_SCREENS}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-sand">
        <div
          className="h-full rounded-full bg-gradient-to-l from-brand-deep to-brand-navy transition-all duration-500"
          style={{ width: `${overallPct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Beta / aid-tool notice — shown once, at the top of the wizard's actual
 * first screen (screen 1), only for genuinely first-time users (gated by
 * isReturningUser — a returning user's persona is detected in the load
 * effect and skips it). Reuses the existing /terms wording rather than
 * introducing new legal copy (product-scope directive, 2026-08-12): countme
 * is a beta aid tool, not a substitute for professional tax advice.
 */
function BetaNotice() {
  return (
    <div className="mb-5 rounded-xl border border-due/40 bg-due-bg/40 px-4 py-3">
      <p className="text-xs font-bold text-due-ink mb-1">
        גרסת בטא — כלי עזר, לא ייעוץ מס
      </p>
      <p className="text-xs leading-relaxed text-ink">{LEGAL_NOTE_FULL}</p>
      <p className="mt-1.5 text-[11px] text-muted">
        השירות בגרסת בטא ויכולותיו עשויות להשתנות. פרטים מלאים ב
        <Link href="/terms" className="underline hover:text-brand-deep">
          תנאי השימוש
        </Link>{" "}
        וב
        <Link href="/privacy" className="underline hover:text-brand-deep">
          מדיניות הפרטיות
        </Link>
        .
      </p>
    </div>
  );
}

/**
 * Compact collapsible entry point for the optional upload fast-track
 * (onboarding-v5: no longer a separate opening screen — collapsed by default
 * at the top of screen 1, for both new and returning users). Reuses
 * DocumentUpload and applyExtracted verbatim; onCollapse just closes the
 * card back up instead of advancing a step, since there's no separate step
 * to advance to anymore.
 */
function FastTrackCard({
  expanded,
  onToggle,
  onCollapse,
  onExtracted,
}: {
  expanded: boolean;
  onToggle: () => void;
  onCollapse: () => void;
  onExtracted: (kind: string, data: ExtractedData) => void;
}) {
  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-line bg-cream/60">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start"
      >
        <span className="flex items-center gap-2.5">
          <SparklesIcon className="size-4 shrink-0 text-brand-deep" />
          <span>
            <span className="block text-sm font-bold text-brand-navy">
              מסלול מהיר — יש לך מסמכים?
            </span>
            <span className="block text-xs text-muted">
              העלי ונמלא בשבילך
            </span>
          </span>
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded && (
        <div className="border-t border-line px-4 pb-4 pt-3">
          <DocumentUpload onExtracted={onExtracted} onSkip={onCollapse} />
        </div>
      )}
    </div>
  );
}

const BUSINESS_AGE_LABEL: Record<
  NonNullable<Persona["business"]["businessAgeBucket"]>,
  string
> = {
  pre: "טרם התחיל",
  "first-year": "שנה ראשונה",
  "1-3": "1-3 שנים",
  "3-5": "3-5 שנים",
  "5plus": "מעל 5 שנים",
};

/**
 * Post-submit screen — replaces the previous behaviour of redirecting to
 * /dashboard the instant the wizard is done. Onboarding-v5 shape: a business
 * summary card (what we now know) plus a numbered first-steps checklist,
 * instead of dropping the user straight into the dashboard with no
 * orientation. Still calls out that /setup itself never created a real
 * account — Google sign-in (kept exactly as before) is what makes the data
 * persist across devices.
 */
function DoneScreen({
  persona,
  isSignedIn,
}: {
  persona: Persona;
  /** Setup has no reactive session hook (unlike useRequiredPersona pages) —
   * this is a one-shot getCurrentUserId() check done by the parent on mount.
   * Gates the header SignOutButton: a not-yet-authenticated visitor (still
   * mid-wizard, about to hand off through Google in handleContinue below)
   * has no session to sign out of. */
  isSignedIn: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error" | "conflict">("idle");

  /**
   * The ONE finish path (Yoni's locked decision, 18/08 beta-feedback fix):
   * a single primary CTA that ALWAYS marks continue-intent before leaving —
   * whether the click resolves into persisting straight away (already
   * signed in on this device) or into a Google sign-in hand-off (not yet
   * signed in). Before this fix, a SECOND unsaved bare Link straight to
   * /dashboard existed alongside the Google-login CTA — clicking it never
   * called markPersonaContinueIntent(), so decidePersonaOwnership's
   * "adopt-unclaimed" gate (a LOCKED contract — see persona-store.ts) never
   * fired and the persona was silently never uploaded (exactly what
   * happened to Roy). That path is removed; this is the only way to finish.
   */
  async function handleContinue() {
    setPending(true);
    setSaveState("idle");
    // Set unconditionally, before either branch below — the one-shot signal
    // decidePersonaOwnership's "adopt-unclaimed" branch requires. Safe even
    // on the already-authenticated path: persistPersona() below consumes it
    // on the very next reconcile either way, so it never lingers.
    markPersonaContinueIntent();

    const userId = await getCurrentUserId();
    if (userId) {
      // Already signed in on this device (e.g. a returning session) —
      // persist right now, so the user gets an honest confirmation (or a
      // retryable error) before leaving, instead of hoping a later reconcile
      // silently picks it up. Also flag /dashboard to show its own
      // confirmation once it lands there (QA audit 25/08, item 3): this
      // screen's own "נשמר בענן" state below never carries over past the
      // router.push, so without this the user has no visible confirmation
      // at all once they reach the dashboard.
      markShowSaveConfirmation();
      const outcome = await persistPersona(persona);
      if (outcome === "error" || outcome === "conflict") {
        setPending(false);
        setSaveState(outcome);
        return;
      }
      setSaveState("saved");
      // Keep the confirmation visible for a beat before moving on — still
      // exactly one click, just not yanked away instantly.
      window.setTimeout(() => router.push("/dashboard"), 700);
      return;
    }

    // Not signed in — hand off through Google. Carry the SAME intent via the
    // OAuth redirect's own query string too (not only sessionStorage), so it
    // survives OAuth completing in a different tab/context on mobile (task
    // #2) — login-form.tsx forwards it into /auth/callback, which forwards
    // it onto the final landing URL.
    setPending(false);
    router.push(
      `/login?next=${encodeURIComponent("/dashboard")}&${CONTINUE_INTENT_QUERY_PARAM}=${CONTINUE_INTENT_QUERY_VALUE}`,
    );
  }

  async function handleRetrySave() {
    setPending(true);
    // Re-attempt the SAME failed save via the shared retryPersonaSave()
    // (persona-store.ts) instead of calling persistPersona() again here.
    // persistPersona() re-runs decidePersonaOwnership from scratch, including
    // consumeExplicitContinueIntent() — a ONE-SHOT read already spent by the
    // failed call this button is retrying. retryPersonaSave() re-runs
    // exactly what failed — a blind upload retry, or (2026-08-20) a
    // re-check-then-adopt when the first attempt's existence check itself
    // failed — with no reclassification and no risk of the intent flag
    // being gone on retry (the same path the dashboard's retry already
    // uses — see use-required-persona.ts).
    const outcome = await retryPersonaSave();
    setPending(false);
    if (outcome === "error" || outcome === "conflict") {
      setSaveState(outcome);
      return;
    }
    if (outcome !== "saved") {
      // "not-uploaded" — nothing was queued to retry (already superseded or
      // never failed). Nothing to show; leave the current state as-is.
      return;
    }
    setSaveState("saved");
    window.setTimeout(() => router.push("/dashboard"), 700);
  }

  const firstName = persona.personal.firstName;
  const ageLabel = persona.business.businessAgeBucket
    ? BUSINESS_AGE_LABEL[persona.business.businessAgeBucket]
    : null;
  const addressLine = [
    [persona.business.address.street, persona.business.address.houseNumber]
      .filter(Boolean)
      .join(" "),
    persona.business.address.city,
  ]
    .filter(Boolean)
    .join(", ");
  const nextDocNo = nextInvoiceNumber(persona);
  const osekLabel = persona.business.osekType === "morshe" ? "עוסק מורשה" : "עוסק פטור";

  const firstSteps: {
    n: number;
    title: string;
    desc: string;
    href?: string;
    cta?: string;
    badge?: string;
  }[] = [
    {
      n: 1,
      title: `מדריך הוצאות ל${persona.business.primaryOccupation || "העסק שלך"}`,
      desc: "אילו הוצאות מוכרות, באיזה שיעור, ומה כדאי לתעד — מותאם לעיסוק שלך.",
      href: "/business-expenses",
      cta: "למדריך ההוצאות",
    },
    {
      n: 2,
      title: "מספרי הקצאה מרשות המסים",
      desc: "בקרוב — נעדכן כשהחיבור יהיה זמין. עד אז המסמכים מופקים בלי מספר הקצאה.",
      badge: "בקרוב",
    },
    {
      n: 3,
      title: "המסמך הראשון שלך",
      desc: "חשבונית או קבלה — יוצא מוכן עם כל הפרטים שכבר יש לנו עליך.",
      href: "/invoices/new",
      cta: "ליצירת מסמך",
    },
  ];

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link
            href="/dashboard"
            // Same residual gap as the removed bare-Link CTA and the same fix
            // as the firstSteps shortcut cards below: this header logo is
            // still a second exit from DoneScreen, so it must mark the
            // one-shot adoption signal too — otherwise a visitor who leaves
            // this way and later signs in via a plain /login (not this
            // screen's own handleContinue CTA) has no continue-intent for
            // decidePersonaOwnership to consume, and useRequiredPersona
            // bounces them back to /setup with their data orphaned.
            onClick={() => markPersonaContinueIntent()}
            className="flex items-center gap-3"
          >
            <Logo size={32} />
          </Link>
          {isSignedIn && (
              <SignOutButton variant="ghost" size="sm" className="min-h-11" />
            )}
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <div className="rounded-2xl bg-paper border border-line shadow-brand p-7 md:p-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-light">
                <CheckCircleIcon className="size-7 text-success" />
              </div>
              <h1 className="text-2xl font-bold text-brand-navy">
                {firstName ? `הכל מוכן, ${firstName}` : "הכל מוכן"}
              </h1>
              <p className="mt-1.5 text-sm text-muted">
                הנתונים שלך שמורים ומוכנים. הנה מה שיש לנו עליך, ואיפה כדאי
                להתחיל.
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-line bg-cream/60 p-4 text-start">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center rounded-full bg-sand px-2.5 py-1 text-xs font-medium text-ink">
                  {osekLabel}
                </span>
                {persona.business.isOsekZeir && (
                  <span className="inline-flex items-center rounded-full bg-teal-100/60 px-2.5 py-1 text-xs font-medium text-brand-navy">
                    עוסק זעיר
                  </span>
                )}
              </div>
              <dl className="space-y-1.5 text-sm">
                {persona.business.primaryOccupation && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted">תחום</dt>
                    <dd className="font-medium text-ink text-end">
                      {persona.business.primaryOccupation}
                    </dd>
                  </div>
                )}
                {ageLabel && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted">ותק</dt>
                    <dd className="font-medium text-ink text-end">{ageLabel}</dd>
                  </div>
                )}
                {addressLine && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted">כתובת</dt>
                    <dd className="font-medium text-ink text-end">{addressLine}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">מסמך הבא</dt>
                  <dd
                    className="font-mono font-medium text-ink text-end"
                    dir="ltr"
                  >
                    {nextDocNo}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 space-y-3 text-start">
              {firstSteps.map((s) =>
                s.href ? (
                  <Link
                    key={s.n}
                    href={s.href}
                    // Same residual gap as the removed bare-Link CTA: leaving
                    // DoneScreen through a shortcut card must not skip the
                    // one-shot adoption signal, or the persona is never
                    // uploaded on the next auth reconcile (Roy's bug, 18/08).
                    onClick={() => markPersonaContinueIntent()}
                    className="flex items-start gap-3 rounded-xl border border-line bg-paper px-4 py-3 hover:border-brand-deep/40 hover:bg-cream transition-colors"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">
                      {s.n}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-brand-navy">{s.title}</div>
                      <div className="text-xs text-muted mt-0.5 leading-relaxed">
                        {s.desc}
                      </div>
                    </div>
                    <span className="shrink-0 self-center text-xs font-semibold text-brand-deep whitespace-nowrap">
                      {s.cta} ←
                    </span>
                  </Link>
                ) : (
                  <div
                    key={s.n}
                    className="flex items-start gap-3 rounded-xl border border-line bg-paper px-4 py-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sand text-xs font-bold text-ink">
                      {s.n}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-ink">{s.title}</div>
                      <div className="text-xs text-muted mt-0.5 leading-relaxed">
                        {s.desc}
                      </div>
                    </div>
                    {s.badge && (
                      <StatusBadge status="plan" className="shrink-0 self-center">
                        {s.badge}
                      </StatusBadge>
                    )}
                  </div>
                ),
              )}
            </div>

            {/* Single finish path (Yoni's locked decision, 18/08): exactly
                one primary CTA, and it ALWAYS marks continue-intent and
                either persists directly or hands off through Google —
                see handleContinue above. The copy below reflects what the
                click actually does (it no longer just describes a separate,
                optional Google button). */}
            <div className="mt-7 space-y-2.5">
              <button
                type="button"
                onClick={handleContinue}
                disabled={pending}
                aria-busy={pending}
                className={cn(btn("primary"), "w-full justify-center")}
              >
                {pending ? (
                  <span
                    aria-hidden
                    className="size-4 shrink-0 rounded-full border-2 border-white/35 border-t-white animate-spin"
                  />
                ) : (
                  <ArrowLeftIcon className="size-4" />
                )}
                {saveState === "saved" ? "נשמר — עוברים ללוח הבקרה" : "כניסה ללוח הבקרה"}
              </button>

              <p className="text-center text-xs text-muted leading-relaxed">
                הכניסה ללוח הבקרה שומרת את הנתונים שלך בענן (מתחברים עם
                Google אם עדיין לא) ומאפשרת להמשיך מכל מכשיר.
              </p>

              {saveState === "saved" && (
                <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-success">
                  <CheckCircleIcon className="size-3.5" />
                  נשמר בענן
                </div>
              )}

              {saveState === "error" && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-alert/30 bg-alert/10 px-3.5 py-2.5 text-start text-xs text-ink"
                >
                  <AlertTriangleIcon className="size-4 mt-0.5 shrink-0 text-alert" />
                  <div className="flex-1">
                    <p className="font-medium text-alert">השמירה בענן נכשלה</p>
                    <p className="mt-0.5 text-muted leading-relaxed">
                      הנתונים שלך שמורים בדפדפן הזה, אבל לא הצלחנו לשמור
                      אותם בענן. אפשר לנסות שוב.
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleRetrySave}
                        disabled={pending}
                        className="text-xs font-semibold text-brand-deep hover:underline disabled:opacity-60"
                      >
                        נסה/י שוב
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaveState("idle")}
                        className="text-xs text-muted hover:underline"
                      >
                        סגירה
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {saveState === "conflict" && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-due/30 bg-due-bg/40 px-3.5 py-2.5 text-start text-xs text-ink"
                >
                  <AlertTriangleIcon className="size-4 mt-0.5 shrink-0 text-due-ink" />
                  <div className="flex-1">
                    <p className="font-medium text-due-ink">
                      כבר קיים חשבון עם נתונים שמורים בחיבור הזה
                    </p>
                    <p className="mt-0.5 text-muted leading-relaxed">
                      כדי לא לדרוס נתונים קיימים, לא שמרנו את מה שמילאת כרגע.
                      אם זה לא החשבון שלך — התנתק/י ונסה/י שוב עם החשבון
                      הנכון. אם זה כן החשבון שלך ואת/ה מתכוון/ת לעדכן את
                      הנתונים הקיימים, זה נעשה מהדשבורד עצמו (״עדכן נתונים״),
                      לא כאן.
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <SignOutButton
                        variant="secondary"
                        size="sm"
                        className="min-h-11"
                      />
                      <button
                        type="button"
                        onClick={() => setSaveState("idle")}
                        className="text-xs text-muted hover:underline"
                      >
                        סגירה
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <LegalNote variant="line" className="mt-5" />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SetupPage() {
  const [screen, setScreen] = useState(1); // 1-7 = wizard screens (countme-journey-v5 phase model)
  // Detected in the load effect below — gates BetaNotice (shown once, to
  // genuinely first-time users only). The fast-track card's collapsed state
  // is NOT gated by this — it's collapsed by default for everyone.
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [uploadExpanded, setUploadExpanded] = useState(false);
  const currentYear = new Date().getFullYear();

  // /setup has no reactive session hook (unlike useRequiredPersona pages,
  // which are gated on a persona and always show SignOutButton) — a visitor
  // can be here signed OUT (first-time, about to sign in via Google in
  // DoneScreen's handleContinue) or signed IN (a returning user re-running
  // "עדכן נתונים"). One-shot check on mount so the header can show sign-out
  // only when there's actually a session to end (wave-2 sweep, 2026-08-18).
  const [isSignedIn, setIsSignedIn] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = await getCurrentUserId();
      if (!cancelled) setIsSignedIn(!!userId);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * The tax year the user is filing for.
   * Default: 2025 — the current calibration target (the pilot files the 2025
   * annual return) and confirmed in lib/calculators/types.ts. 2024 stays
   * selectable as a historical year. (Was 2024 while 2025 was provisional; that
   * reasoning is obsolete after the ty2025-alignment pass.)
   */
  // Default to the CURRENT calendar year (clamped to the modeled range): the
  // income question reads "כמה הכנסת השנה עד כה", so "השנה" must mean the year
  // the user is living in — a 2025 default in August 2026 filed real 2026
  // figures under 2025 (journey-scan finding).
  const [selectedYear, setSelectedYear] = useState<number>(() =>
    Math.min(Math.max(new Date().getFullYear(), 2024), 2026),
  );

  // Derive screen subtitles dynamically so they always show the current selected year
  const SCREEN_SUBTITLES = getScreenSubtitles(selectedYear);

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
    gender: "",
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
    osekStartDate: "",
    priorInvoicing: false,
    priorInvoiceNumber: "",
    osekTrackPicked: false,
    businessAgeBucket: "",
    priorDocumentMethod: "",
    hasEcommerceSite: false,
    osekFileNumber: "",
    tradeNameEn: "",
    addressCity: "",
    addressStreet: "",
    addressHouseNumber: "",
  });

  // Step-1 fields that don't map 1:1 onto persona.personal, kept separate from s1.
  const [phoneMobile, setPhoneMobile] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  // "Neither of these" explainer-only taps in the osek-type section — wizard-local
  // UI state, never written to the persona (see osekTrackPicked above).
  const [otherOsekCase, setOtherOsekCase] = useState<"" | "company" | "not-yet">("");

  // Holds the just-submitted persona so DoneScreen can read it directly —
  // avoids a second localStorage read racing persistPersona's write.
  const [doneData, setDoneData] = useState<Persona | null>(null);

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

  // `showValidation` gates whether the CURRENT screen's errors render at all;
  // once true, `errors` below is recomputed on every render (not just on the
  // "הבא" click), so a field that gets fixed clears its red state immediately
  // instead of waiting for the next step click (QA #5). Same live-recompute
  // pattern as /expenses/new's `missing`/`showValidation`.
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    // QA audit 25/08, item 5 (root cause distinct from the reported repro —
    // see plan): this used to be a synchronous, raw loadPersona() read
    // (localStorage), unlike every other protected page, which is why /setup
    // says in its own comments elsewhere it "has no reactive session hook."
    // On a new device / cleared cache / just a slow first paint, that
    // synchronous read can be empty or stale at the exact moment this
    // one-shot effect runs — silently skipping the ENTIRE restore below, not
    // just the year. syncPersonaFromDb() is the same DB-authoritative,
    // already-hardened function every other protected page awaits via
    // useRequiredPersona()/usePersona() (and the one PersonaHydrator itself
    // already kicked off for this route, deduped via its own inFlight
    // promise — so this rarely costs an extra round trip). For a signed-out
    // visitor it returns the local cache untouched, same as before.
    let cancelled = false;
    (async () => {
      const saved = await syncPersonaFromDb();
      if (cancelled || !saved) return;
      applyReturningUserData(saved);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function applyReturningUserData(saved: Persona) {
    // Returning user already has a persona — the fast-track card just stays
    // collapsed (no separate upload screen to skip anymore), and the beta
    // notice is suppressed.
    setIsReturningUser(true);
    setScreen(1);
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
      osekStartDate: saved.business.osekStartDate ?? "",
      // Prior-invoicing is a one-time onboarding question — a returning user
      // already has invoiceCounter carried over by buildPersona(), so there's
      // nothing to restore here.
      priorInvoicing: false,
      priorInvoiceNumber: "",
      // Returning user already has an explicit osekType from a prior session —
      // don't re-block Next on the "pick פטור/מורשה" gate.
      osekTrackPicked: true,
      businessAgeBucket: saved.business.businessAgeBucket ?? "",
      priorDocumentMethod: saved.business.priorDocumentMethod ?? "",
      hasEcommerceSite: saved.business.hasEcommerceSite ?? false,
      osekFileNumber: saved.business.osekFileNumber ?? "",
      tradeNameEn: saved.business.tradeNameEn ?? "",
      addressCity: saved.business.address?.city ?? "",
      addressStreet: saved.business.address?.street ?? "",
      addressHouseNumber: saved.business.address?.houseNumber ?? "",
    });
    setPhoneMobile(saved.contact?.phoneMobile ?? "");
    setMarketingOptIn(saved.contact?.consentDigitalNotices ?? false);
    // Terms were already accepted on this persona's first save — re-running
    // the wizard to update data shouldn't force re-consent every time.
    setTermsAccepted(true);
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
  }

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
    if (!s1.gender) e.gender = "שדה חובה";
    if (!termsAccepted) {
      e.termsAccepted = "יש לאשר את תנאי השימוש ומדיניות הפרטיות כדי להמשיך";
    }
    return e;
  }

  function validateStep2(): Errors {
    const e: Errors = {};
    if (s2.isSoldierDischarged && !s2.soldierDischargeDate) {
      e.soldierDischargeDate = "יש להזין תאריך שחרור";
    }
    if (s2.isNewResident && !s2.aliyahDate) {
      e.aliyahDate = "יש להזין תאריך עלייה";
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
    if (!s3.addressCity.trim()) e.addressCity = "שדה חובה";
    if (!s3.addressStreet.trim()) e.addressStreet = "שדה חובה";
    if (!s3.primaryOccupation.trim()) e.primaryOccupation = "שדה חובה";
    if (s3.priorInvoicing) {
      const n = Number(s3.priorInvoiceNumber);
      if (!s3.priorInvoiceNumber || isNaN(n) || n < 1) {
        e.priorInvoiceNumber = "יש להזין מספר חשבונית תקין (1 ומעלה)";
      }
    }
    if (!s3.osekTrackPicked) {
      e.osekType = "יש לבחור עוסק פטור או עוסק מורשה כדי להמשיך";
    }
    return e;
  }

  /**
   * Screen-split gate for היכרות (screen 3) — only the two facts that screen
   * actually collects: osek track picked + occupation. validateStep3 above
   * is kept intact as the reference definition of "all of step 3's rules"
   * (see the screen-model note near TOTAL_SCREENS) — it is not called
   * directly for gating anymore, that's split between this and
   * validateStep3Identity below.
   */
  function validateStep3Intro(): Errors {
    const e: Errors = {};
    if (!s3.primaryOccupation.trim()) e.primaryOccupation = "שדה חובה";
    if (!s3.osekTrackPicked) {
      e.osekType = "יש לבחור עוסק פטור או עוסק מורשה כדי להמשיך";
    }
    // The prior-invoice continuation number is RENDERED on this screen (the
    // prior-document-method sub-flow), so it must also be validated here —
    // validating it a screen later blocked העסק with an error the user
    // couldn't see (flagged by the restructure's own review).
    if (s3.priorInvoicing) {
      const n = Number(s3.priorInvoiceNumber);
      if (!s3.priorInvoiceNumber || isNaN(n) || n < 1) {
        e.priorInvoiceNumber = "יש להזין מספר חשבונית תקין (1 ומעלה)";
      }
    }
    return e;
  }

  /** Screen-split gate for העסק (screen 4): the business-identity fields. */
  function validateStep3Identity(): Errors {
    const e: Errors = {};
    if (!s3.tradeName.trim()) e.tradeName = "שדה חובה";
    // Address is required (product decision, Yoni 27/08): city/street are
    // picker-driven (CityPicker/StreetPicker still accept free text), only
    // the house number stays optional free entry.
    if (!s3.addressCity.trim()) e.addressCity = "שדה חובה";
    if (!s3.addressStreet.trim()) e.addressStreet = "שדה חובה";
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

  /** Validator for whatever screen is currently showing — single source of
   * truth for both the "הבא"/"שלח" gate and the live re-render below. */
  function validateCurrentScreen(): Errors {
    if (screen === 1) return validateStep1();
    if (screen === 2) return validateStep2();
    if (screen === 3) return validateStep3Intro();
    if (screen === 4) return validateStep3Identity();
    if (screen === 5) return validateStep4();
    if (screen === 6) return validateStep5();
    return validateStep6();
  }

  // Recomputed on every render (not only on "הבא"): once the user has hit an
  // invalid "הבא" for this screen, fixing the field must clear its error the
  // same render it becomes valid — not stay red until the next click (QA #5).
  const errors = showValidation ? validateCurrentScreen() : {};

  function handleNext() {
    const errs = validateCurrentScreen();
    if (Object.keys(errs).length > 0) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    setScreen((p) => p + 1);
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
          // isOsekZeir is intentionally left untouched by ...s — עוסק זעיר
          // is turnover-gated only, independent of osekType (murshe-זעיר
          // reform), so a document-derived osekType must not silently clear
          // an existing זעיר election.
          // A document-derived osekType is a real answer, not the unpicked
          // default — don't force the user to re-tap פטור/מורשה on step 3.
          osekTrackPicked: true,
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
    setShowValidation(false);
    setScreen((p) => p - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildPersona(): Persona {
    const totalRevenue = Number(s4.totalRevenue);
    const totalDeductibleExpenses = Number(s5.totalDeductibleExpenses);
    const netIncome = totalRevenue - totalDeductibleExpenses;
    const bituach = Number(s5.bituachLeumiAnnualPaid) || 0;

    // The wizard edits SETTINGS. It must never destroy transactional data:
    // a returning user re-running it (e.g. "עדכן נתונים") would otherwise lose
    // every invoice/receipt/quote/expense — on this device AND in the DB — and
    // reset the numbering counters so the next document reuses a used number.
    const existing = loadPersona();

    return {
      id: existing?.id ?? "user-" + Date.now(),
      displayName: `${s1.firstName} ${s1.lastName}`.trim(),
      personal: {
        firstName: s1.firstName,
        lastName: s1.lastName,
        fatherName: null,
        teudatZehut: s1.teudatZehut,
        birthDate: s1.birthDate,
        // Non-empty guaranteed: validateStep1 blocks screen 1 -> 2 while
        // s1.gender is "" (QA #12), and buildPersona only runs after every
        // screen up to the final "הבא"/submit has passed validation.
        gender: s1.gender as "male" | "female",
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
        phoneMobile: phoneMobile.trim(),
        phoneWork: null,
        phoneHome: null,
        consentDigitalNotices: marketingOptIn,
      },
      business: {
        tradeName: s3.tradeName,
        primaryOccupation: s3.primaryOccupation,
        osekType: s3.osekType,
        // Editable, prefilled from the TZ — falls back to it when the user
        // never touched the field (onboarding-v5 §6).
        osekFileNumber: s3.osekFileNumber.trim() || s1.teudatZehut,
        osekStartDate: s3.osekStartDate,
        address: {
          sameAsResidence: !(
            s3.addressCity.trim() ||
            s3.addressStreet.trim() ||
            s3.addressHouseNumber.trim()
          ),
          street: s3.addressStreet.trim() || null,
          houseNumber: s3.addressHouseNumber.trim() || null,
          city: s3.addressCity.trim() || null,
          zipCode: null,
        },
        bookkeepingMethod: "single-entry",
        bookkeepingType: "computerized",
        isSmallBusiness: totalRevenue < 100000,
        // Explicit toggle from step 3 — עוסק זעיר is a pure income-tax track
        // (תיקון 265), turnover-gated only and independent of VAT status, so
        // it's valid under EITHER osekType as long as turnover stays under
        // the year-keyed ceiling (120,000 for 2024–2025, 122,833 from 2026).
        isOsekZeir:
          s3.isOsekZeir &&
          totalRevenue <= getTaxYearConstants(selectedYear).osekZeirThreshold,
        hasEmployees: false,
        employerNames: [],
        tradeNameEn: s3.tradeNameEn.trim() || undefined,
        hasEcommerceSite: s3.hasEcommerceSite,
        businessAgeBucket: s3.businessAgeBucket || undefined,
        priorDocumentMethod: s3.priorDocumentMethod || undefined,
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
        // Preserve everything the wizard does not own (documents, expenses and
        // the derived monthly series) — see the note above buildPersona().
        invoices: existing?.income?.invoices ?? [],
        expenses: existing?.income?.expenses ?? [],
        invoiceCount: existing?.income?.invoices?.length ?? 0,
        expenseCount: existing?.income?.expenses?.length ?? 0,
        monthlyBreakdown: existing?.income?.monthlyBreakdown ?? [],
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
      // Document numbering counters + data the wizard never collects: carried
      // over verbatim so re-running setup can't reissue a used document number
      // or drop the capital declaration / contact details.
      ...(existing?.invoiceCounter !== undefined
        ? { invoiceCounter: existing.invoiceCounter }
        : s3.priorInvoicing && Number(s3.priorInvoiceNumber) > 0
          ? { invoiceCounter: Number(s3.priorInvoiceNumber) }
          : {}),
      ...(existing?.docCounters ? { docCounters: existing.docCounters } : {}),
      // Merge, don't overwrite: the wizard now OWNS phoneMobile + consentDigitalNotices
      // (collected in step 1), but everything else on contact (email, mailing
      // address, phoneWork/Home — none of which the wizard collects) still
      // needs to survive a re-run, same as invoiceCounter/docCounters above.
      ...(existing?.contact
        ? {
            contact: {
              ...existing.contact,
              phoneMobile: phoneMobile.trim(),
              consentDigitalNotices: marketingOptIn,
            },
          }
        : {}),
      ...(existing?.capitalDeclaration
        ? { capitalDeclaration: existing.capitalDeclaration }
        : {}),
    };
  }

  function handleSubmit() {
    const errs = validateStep6();
    if (Object.keys(errs).length > 0) {
      setShowValidation(true);
      return;
    }
    const persona = buildPersona();
    persistPersona(persona);
    setDoneData(persona);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  // Must match field 150's real formula, not a naive revenue-minus-expenses
  // guess — for עוסק זעיר the automatic 30%-of-turnover deduction applies
  // regardless of the expenses the user typed (Yoni, 27/08 QA: the preview
  // showed revenue-minus-expenses even under the זעיר track, contradicting
  // its own "חישוב לשדה 150" label). computeBusinessIncome is the same
  // function the real field-150 calculator and the dashboard use.
  const previewNet =
    s4.totalRevenue && s5.totalDeductibleExpenses
      ? computeBusinessIncome(buildPersona())
      : null;

  // FP-02: live ceiling warning on the revenue screen. Reuses the shared
  // computeCeilingAlert engine (covers patur, patur-זעיר, and morshe-זעיר —
  // each with its own copy) rather than re-deriving the ceiling math here —
  // buildPersona() already carries every field the alert needs (osekType,
  // isOsekZeir, income.year, totalRevenue).
  const ceilingAlert = computeCeilingAlert(buildPersona());

  // Soft heads-up (NOT a blocking error): the academic-degree year is in the
  // future. The credit applies once the degree is actually awarded — see the
  // DELIBERATION POINT note in validateStep2.
  const academicYearIsFuture =
    !!s2.academicDegreeYear &&
    !isNaN(Number(s2.academicDegreeYear)) &&
    Number(s2.academicDegreeYear) > currentYear;

  const creditPoints = (() => {
    // No silent default for unselected gender (QA #12) — by the time this
    // preview is visible (screen 7) validateStep1 already required a pick, but
    // stay defensive rather than assume "male" for an empty value.
    let pts = s1.gender === "female" ? 2.75 : s1.gender === "male" ? 2.25 : 0;
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

  // Live TZ feedback (step 1) — neutral while typing, green only once both the
  // digit-count and checksum are valid; the red error path is untouched (only
  // set/cleared by validateStep1 on Next).
  const tzLiveValid =
    /^\d{9}$/.test(s1.teudatZehut) && validateTeudatZehut(s1.teudatZehut);

  if (doneData) {
    return <DoneScreen persona={doneData} isSignedIn={isSignedIn} />;
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Logo size={32} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted">הגדרת פרופיל</div>
            {/* Unobtrusive ghost/sm — setup has no reactive session hook, so
                this only shows once the one-shot getCurrentUserId() check
                above resolves signed-in (a returning user re-running the
                wizard). A first-time visitor isn't signed in yet at this
                point (that happens in DoneScreen's handleContinue), so
                nothing renders here for them. */}
            {isSignedIn && (
              <SignOutButton variant="ghost" size="sm" className="min-h-11" />
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <div className="rounded-2xl bg-paper border border-line shadow-brand p-7 md:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-navy text-white font-bold shadow-brand-sm text-sm shrink-0">
                {SCREEN_SUBSTEP[screen - 1][0]}
              </div>
              <div>
                <h1 className="text-xl font-bold text-brand-navy leading-tight">
                  {SCREEN_TITLES[screen - 1]}
                </h1>
                <p className="text-xs text-muted mt-0.5">
                  {SCREEN_SUBTITLES[screen - 1]}
                </p>
              </div>
            </div>

            <PhaseChipBar screen={screen} />

            {/* Each wizard screen enters with the same CSS settle-in the
                route boundary uses (globals.css .cm-route-enter) — each
                block mounts fresh on a screen change, so the animation runs
                per step. Deliberately NOT <Reveal>: its lazy engine swap
                remounts the subtree when the framer chunk lands, which reads
                as a blink and detaches DOM mid-interaction on slow loads. */}
            {screen === 1 && (
              <div className="cm-route-enter">
              <div className="space-y-4">
                <FastTrackCard
                  expanded={uploadExpanded}
                  onToggle={() => setUploadExpanded((v) => !v)}
                  onCollapse={() => setUploadExpanded(false)}
                  onExtracted={applyExtracted}
                />
                {!isReturningUser && <BetaNotice />}

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
                  {!errors.teudatZehut && tzLiveValid && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-success">
                      <CheckIcon className="size-3.5" />
                      המספר תקין
                    </p>
                  )}
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
                  <FieldLabel required>מגדר (משפיע על נקודות זיכוי)</FieldLabel>
                  <div
                    className="flex gap-3"
                    role="radiogroup"
                    aria-required="true"
                  >
                    <label
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors text-sm",
                        s1.gender === "female"
                          ? "border-brand-deep bg-teal-100/40 text-brand-navy font-medium"
                          : errors.gender
                            ? "border-alert bg-paper hover:bg-cream"
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
                          : errors.gender
                            ? "border-alert bg-paper hover:bg-cream"
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
                  <ErrorMsg msg={errors.gender} />
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

                <div>
                  <FieldLabel htmlFor="phoneMobile">נייד (אופציונלי)</FieldLabel>
                  <input
                    id="phoneMobile"
                    type="tel"
                    value={phoneMobile}
                    onChange={(e) => setPhoneMobile(e.target.value)}
                    className={inputCls(false)}
                    dir="ltr"
                    placeholder="050-1234567"
                  />
                  <p className="mt-1 text-xs text-muted">
                    יופיע כפרט קשר על גבי המסמכים שתפיק/י — לא נשלח קוד אימות
                    למספר הזה.
                  </p>
                </div>

                <div className="border-t border-line pt-4 mt-1 space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-brand-navy"
                    />
                    <span className="text-sm text-ink">
                      קראתי ואישרתי את{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="underline hover:text-brand-deep"
                      >
                        תנאי השימוש
                      </Link>{" "}
                      ואת{" "}
                      <Link
                        href="/privacy"
                        target="_blank"
                        className="underline hover:text-brand-deep"
                      >
                        מדיניות הפרטיות
                      </Link>
                      <span className="text-alert ms-1">*</span>
                    </span>
                  </label>
                  <ErrorMsg msg={errors.termsAccepted} />

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marketingOptIn}
                      onChange={(e) => setMarketingOptIn(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-brand-navy"
                    />
                    <span className="text-sm text-ink">
                      עדכונים על המערכת והטבות. אפשר לבטל בכל רגע.
                    </span>
                  </label>
                </div>
              </div>
              </div>
            )}

            {screen === 2 && (
              <div className="cm-route-enter">
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
                          onWheel={numberInputWheelGuard}
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
                        className={inputCls(!!errors.aliyahDate)}
                        dir="ltr"
                        max={new Date().toISOString().split("T")[0]}
                      />
                      <ErrorMsg msg={errors.aliyahDate} />
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
                    onWheel={numberInputWheelGuard}
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
                    תואר ראשון/תעודה מקצועית: עד 3 שנים מהסיום (בוגרי 2023
                    ואילך) או שנת הסיום בלבד (בוגרי 2014–2022)
                  </p>
                </div>

                <div>
                  <FieldLabel htmlFor="combatReserveDays">
                    ימי מילואים כלוחם/ת בשנת {selectedYear} (אופציונלי)
                  </FieldLabel>
                  <input
                    id="combatReserveDays"
                    type="number"
                    onWheel={numberInputWheelGuard}
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
                            onWheel={numberInputWheelGuard}
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
              </div>
            )}

            {screen === 3 && (
              <div className="cm-route-enter">
              <div className="space-y-4">
                {/* ── Tap questions (onboarding-v5 היכרות) ─────────────────── */}
                <TapChoiceGroup
                  label="כמה זמן העסק קיים"
                  value={s3.businessAgeBucket}
                  onChange={(next) => setS3({ ...s3, businessAgeBucket: next })}
                  options={[
                    { key: "pre", title: "טרם התחלתי" },
                    { key: "first-year", title: "שנה ראשונה" },
                    { key: "1-3", title: "1-3 שנים" },
                    { key: "3-5", title: "3-5 שנים" },
                    { key: "5plus", title: "מעל 5 שנים" },
                  ]}
                />

                {/* ── Osek type (incl. explainer cards) ────────────────────── */}
                <div>
                  <FieldLabel>סוג עוסק</FieldLabel>
                  {/*
                    Two first-class radio options — פטור / מורשה — plus a
                    separate עוסק-זעיר toggle, shown once either track is
                    picked. Data-model note: the persona keeps
                    `osekType: "patur" | "morshe"` plus a separate
                    `isOsekZeir` flag.

                    Verified rule (תיקון 265; verified 2026-08-19 against
                    gov.il/kolzchut/CPA sources): עוסק זעיר is a pure
                    INCOME-TAX track — eligibility is turnover ≤ the same
                    ceiling as עוסק פטור, independent of VAT registration.
                    A מורשה under the ceiling may elect it too; VAT
                    collection/reporting is unaffected (מסלול מס-הכנסה
                    בלבד). An earlier version of this comment cited
                    "תיקון 257" and claimed murshe-זעיר was unsupported —
                    that was incorrect and has been corrected here. Still
                    verify with a tax professional before relying on this
                    in production.
                  */}
                  <OsekTypeChoice
                    osekType={s3.osekType}
                    isOsekZeir={s3.isOsekZeir}
                    picked={s3.osekTrackPicked}
                    ceilingHe={osekCeilingHe}
                    year={selectedYear}
                    onChange={(next) => {
                      setOtherOsekCase("");
                      setS3({ ...s3, ...next });
                    }}
                  />

                  {s3.osekTrackPicked && (
                    <label className="mt-2.5 flex items-start gap-3 rounded-xl border border-line bg-paper px-4 py-3 cursor-pointer transition-colors hover:bg-cream">
                      <input
                        type="checkbox"
                        checked={s3.isOsekZeir}
                        onChange={(e) =>
                          setS3({ ...s3, isOsekZeir: e.target.checked })
                        }
                        className="mt-0.5 h-4 w-4 accent-brand-navy"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-ink">
                          עוסק זעיר
                        </span>
                        <p className="text-xs text-muted mt-0.5 leading-relaxed">
                          30% מהמחזור מוכרים אוטומטית כהוצאות (כולל ביטוח
                          לאומי), בלי צורך לתעד הוצאות בפועל ובלי חובת מקדמות.
                          פתוח עד מחזור של {osekCeilingHe} ₪ (שנת מס{" "}
                          {selectedYear}) — אותה תקרה של עוסק פטור. יציאה
                          מהמסלול חוסמת חזרה אליו לשנתיים.
                          {s3.osekType === "morshe" &&
                            " גביית ודיווח המע״מ ממשיכים כרגיל — זהו מסלול מס-הכנסה בלבד."}
                        </p>
                      </div>
                    </label>
                  )}

                  <div className="mt-3">
                    <OsekOtherCasesPicker
                      value={otherOsekCase}
                      onChange={setOtherOsekCase}
                    />
                  </div>

                  <ErrorMsg msg={errors.osekType} />
                </div>

                {/* OsekZeirNote owns its own container and returns null until
                    there's actually something to say (checked + real revenue/
                    expenses entered, which only happens on later screens) —
                    wrapping it in an always-rendered bordered div here left an
                    empty cream rectangle right after checking "עוסק זעיר"
                    (Yoni, 27/08 QA). */}
                <OsekZeirNote
                  checked={s3.isOsekZeir}
                  totalRevenue={Number(s4.totalRevenue) || 0}
                  totalExpenses={Number(s5.totalDeductibleExpenses) || 0}
                  expenseRate={
                    getTaxYearConstants(selectedYear).osekZeirExpenseRate
                  }
                />

                <div>
                  <TapChoiceGroup
                    label="איך הפקת מסמכים עד עכשיו"
                    value={s3.priorDocumentMethod}
                    onChange={(next) => {
                      const needsNumberFlow =
                        next === "manual-book" || next === "other-digital";
                      setS3({
                        ...s3,
                        priorDocumentMethod: next,
                        // Hiding the sub-flow must also clear its state — otherwise
                        // a stale priorInvoicing=true with the box hidden could
                        // silently fail the priorInvoiceNumber check in validateStep3Intro.
                        priorInvoicing: needsNumberFlow ? s3.priorInvoicing : false,
                        priorInvoiceNumber: needsNumberFlow ? s3.priorInvoiceNumber : "",
                      });
                    }}
                    options={[
                      { key: "none", title: "עדיין לא הפקתי מסמכים בעסק" },
                      { key: "manual-book", title: "פנקס חשבוניות ידני" },
                      { key: "other-digital", title: "מערכת דיגיטלית אחרת" },
                      { key: "accountant", title: "רואה חשבון מפיק עבורי" },
                    ]}
                  />

                  {(s3.priorDocumentMethod === "manual-book" ||
                    s3.priorDocumentMethod === "other-digital") && (
                    <div className="mt-3 rounded-xl border border-line bg-paper p-4">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={s3.priorInvoicing}
                          onChange={(e) =>
                            setS3({ ...s3, priorInvoicing: e.target.checked })
                          }
                          className="mt-0.5 h-4 w-4 accent-brand-navy"
                        />
                        <span className="text-sm text-ink">
                          להמשיך את המספור מהמסמכים הקודמים
                        </span>
                      </label>
                      {s3.priorInvoicing && (
                        <div className="mt-3">
                          <FieldLabel htmlFor="priorInvoiceNumber" required>
                            להמשיך את המספור ממספר
                          </FieldLabel>
                          <input
                            id="priorInvoiceNumber"
                            type="number"
                            onWheel={numberInputWheelGuard}
                            min={1}
                            value={s3.priorInvoiceNumber}
                            onChange={(e) =>
                              setS3({ ...s3, priorInvoiceNumber: e.target.value })
                            }
                            className={inputCls(!!errors.priorInvoiceNumber)}
                            dir="ltr"
                            placeholder="לדוגמה: 42"
                          />
                          <ErrorMsg msg={errors.priorInvoiceNumber} />
                          <p className="mt-1 text-xs text-muted">
                            כדי שהמסמכים הבאים שתפיקי ב-countme לא יתנגשו במספור
                            קודם. (התקינות נבדקת בהמשך, במסך &quot;העסק&quot;.)
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer rounded-xl border border-line bg-cream p-4">
                  <input
                    type="checkbox"
                    checked={s3.hasEcommerceSite}
                    onChange={(e) =>
                      setS3({ ...s3, hasEcommerceSite: e.target.checked })
                    }
                    className="mt-0.5 h-4 w-4 accent-brand-navy"
                  />
                  <span className="text-sm text-ink">
                    יש לי אתר מכירות — איקומרס
                  </span>
                </label>

                <div>
                  <FieldLabel htmlFor="primaryOccupation" required>
                    תחום עיסוק
                  </FieldLabel>
                  <OccupationPicker
                    inputId="primaryOccupation"
                    value={s3.primaryOccupation}
                    onChange={(next) =>
                      setS3({ ...s3, primaryOccupation: next })
                    }
                    error={errors.primaryOccupation}
                  />
                  <ErrorMsg msg={errors.primaryOccupation} />
                </div>
              </div>
              </div>
            )}

            {screen === 4 && (
              <div className="cm-route-enter">
              <div className="space-y-4">
                {/* ── Business identity fields ──────────────────────────────── */}
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
                  <FieldLabel htmlFor="tradeNameEn">
                    שם העסק באנגלית (אופציונלי)
                  </FieldLabel>
                  <input
                    id="tradeNameEn"
                    type="text"
                    dir="ltr"
                    value={s3.tradeNameEn}
                    onChange={(e) =>
                      setS3({ ...s3, tradeNameEn: e.target.value })
                    }
                    className={inputCls(false)}
                    placeholder="Dana Cohen Design"
                  />
                  <p className="mt-1 text-xs text-muted">
                    לחשבוניות ללקוחות בחו״ל. אפשר להשלים בהמשך.
                  </p>
                </div>

                <div>
                  <FieldLabel htmlFor="osekFileNumber">מספר עוסק</FieldLabel>
                  <input
                    id="osekFileNumber"
                    type="text"
                    inputMode="numeric"
                    value={s3.osekFileNumber || s1.teudatZehut}
                    onChange={(e) =>
                      setS3({
                        ...s3,
                        osekFileNumber: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    className={inputCls(false)}
                    dir="ltr"
                  />
                  <p className="mt-1 text-xs text-muted">
                    מילאנו לך מתעודת הזהות — אצל רוב העצמאים המספרים זהים.
                    אפשר לשנות.
                  </p>
                </div>

                <div className="space-y-3">
                  <FieldLabel required>כתובת העסק</FieldLabel>
                  <div>
                    <CityPicker
                      value={s3.addressCity}
                      onChange={(next) =>
                        setS3({ ...s3, addressCity: next })
                      }
                      onSelect={(city) =>
                        setS3((prev) => ({ ...prev, addressCity: city, addressStreet: "" }))
                      }
                      error={errors.addressCity}
                    />
                    <ErrorMsg msg={errors.addressCity} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <StreetPicker
                        value={s3.addressStreet}
                        onChange={(next) =>
                          setS3({ ...s3, addressStreet: next })
                        }
                        city={s3.addressCity}
                        error={errors.addressStreet}
                      />
                      <ErrorMsg msg={errors.addressStreet} />
                    </div>
                    <input
                      id="addressHouseNumber"
                      type="text"
                      aria-label="מספר בית"
                      value={s3.addressHouseNumber}
                      onChange={(e) =>
                        setS3({ ...s3, addressHouseNumber: e.target.value })
                      }
                      className={inputCls(false)}
                      placeholder="מספר בית"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel htmlFor="osekStartDate">
                    מתי נפתח התיק? (אופציונלי)
                  </FieldLabel>
                  <input
                    id="osekStartDate"
                    type="date"
                    value={s3.osekStartDate}
                    onChange={(e) =>
                      setS3({ ...s3, osekStartDate: e.target.value })
                    }
                    className={inputCls(false)}
                    dir="ltr"
                  />
                </div>

                <DocHeaderPreview s1={s1} s3={s3} />
              </div>
              </div>
            )}

            {screen === 5 && (
              <div className="cm-route-enter">
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
                          aria-pressed={selectedYear === yr}
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
                    כמה הכנסת השנה עד כה? (ברוטו בש&quot;ח, ללא מע&quot;מ)
                  </FieldLabel>
                  <input
                    id="totalRevenue"
                    type="number"
                    onWheel={numberInputWheelGuard}
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
                  {step5Revenue > 0 && (
                    <p className="mt-1 text-xs font-semibold text-brand-navy">
                      {ils(step5Revenue)}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted">
                    זו נקודת ההתחלה — כל מסמך הכנסה שתפיק/י במערכת מכאן והלאה
                    יתווסף על הסכום הזה. (נכנס לשדות 238 ו-294 בטופס)
                  </p>
                </div>

                {/* FP-02: live ceiling warning — only once revenue is
                    actually approaching/over the year's ceiling ("safe"
                    stays quiet so an empty/low field isn't noisy). */}
                {ceilingAlert && ceilingAlert.level !== "safe" && (
                  <CeilingAlertCard alert={ceilingAlert} />
                )}

              </div>
              </div>
            )}

            {screen === 6 && (
              <div className="cm-route-enter">
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
                    onWheel={numberInputWheelGuard}
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
                  {step5Expenses > 0 && (
                    <p className="mt-1 text-xs font-semibold text-brand-navy">
                      {ils(step5Expenses)}
                    </p>
                  )}
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
                        onWheel={numberInputWheelGuard}
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
                        {/* Pending Roy: real fix is splitting the persona field
                            into ב"ל/בריאות (see FLAG(Roy) in lib/persona.ts) —
                            until then, tell the user what to type so the 52%
                            deduction isn't computed on an inflated base. */}
                        הזינו רק את רכיב הביטוח הלאומי מהשובר השנתי — לא כולל
                        דמי ביטוח בריאות. הניכוי (52%) חל רק על רכיב הביטוח
                        הלאומי; אם יוזן הסכום הכולל, הניכוי יחושב ביתר.
                      </p>
                    </div>

                    <div>
                      <FieldLabel htmlFor="kerenH">
                        הפקדות לקרן השתלמות (שדה 137)
                      </FieldLabel>
                      <input
                        id="kerenH"
                        type="number"
                        onWheel={numberInputWheelGuard}
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
                        onWheel={numberInputWheelGuard}
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
                        onWheel={numberInputWheelGuard}
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
              </div>
            )}

            {screen === 7 && (
              <div className="cm-route-enter">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-ink">
                  פרטי בנק
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel htmlFor="bankName">שם הבנק</FieldLabel>
                    <BankNamePicker
                      value={s6.bankName}
                      onChange={(next) =>
                        setS6({ ...s6, bankName: next })
                      }
                      onSelect={(bank) =>
                        setS6((prev) => ({
                          ...prev,
                          bankName: bank.bankName,
                          bankCode: String(bank.bankCode),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="bankCode">קוד בנק</FieldLabel>
                    {/* Read-only — driven entirely by the bank-name picker so
                        the two fields can never disagree (Yoni, 27/08: "קוד
                        בנק... צריך להיות בסליידרים" — the picker IS the
                        selection mechanism here, typing a code by hand would
                        just re-open the two-source-of-truth bug this avoids). */}
                    <input
                      id="bankCode"
                      type="text"
                      readOnly
                      value={s6.bankCode}
                      className={cn(inputCls(false), "bg-cream text-muted cursor-not-allowed")}
                      dir="ltr"
                      placeholder="נבחר אוטומטית לפי שם הבנק"
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
                    <p className="mt-1 text-[11px] text-faint">
                      עדיין ללא בורר סניפים — אין לנו מאגר סניפים מאומת
                      (בקרוב).
                    </p>
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
              </div>
            )}

            {/* Bottom nav — the fast-track card (screen 1) has its own
                internal "skip"/"continue" button that only collapses it. */}
            {/* min-h-11 (44px): QA audit 25/08, item 16 — measured 32px tall
                (btn("*","sm")'s py-1.5), under the 44px WCAG touch-target
                minimum, on the wizard's own primary action across all 7
                steps. Scoped to just these two buttons rather than raising
                every btn(...,"sm") site app-wide. */}
            <div className="mt-8 flex items-center justify-between gap-3">
              {screen > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className={btn("secondary", "sm", "min-h-11")}
                >
                  <ArrowRightIcon className="size-4" />
                  חזרה
                </button>
              ) : (
                <div />
              )}

              {screen < TOTAL_SCREENS ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className={btn("primary", "sm", "min-h-11")}
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
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Reusable compact tap-chip group — same active/inactive visual language as
 * OsekTypeChoice's radio cards (border-brand-deep + teal tint when active),
 * adapted to a wrapped row for short single-word/short-phrase options
 * (onboarding-v5 היכרות questions).
 */
function TapChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: T; title: string }[];
  value: T | "";
  onChange: (key: T) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              aria-pressed={active}
              className={cn(
                // min-h-11 (44px): QA audit 25/08, item 16 — measured 34px
                // tall (py-2 + text), under the WCAG touch-target minimum.
                "min-h-11 rounded-full border px-3.5 py-2 text-xs sm:text-sm transition-colors",
                active
                  ? "border-brand-deep bg-teal-100/40 text-brand-navy font-medium"
                  : "border-line bg-paper hover:bg-cream text-ink",
              )}
            >
              {opt.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Two osek-track selector: פטור / מורשה.
 *
 * The persona data model stores `osekType` ("patur" | "morshe") + a separate
 * `isOsekZeir` boolean (זעיר is an income-tax track, independent of VAT
 * status — turnover-gated, not osekType-gated — surfaced by the caller as
 * its own toggle once EITHER track is picked; see the verified-rule comment
 * at the call site). `picked` gates the active highlight AND is what
 * validateStep3 checks —
 * the persona always carries a concrete osekType (default "patur"), but the
 * UI must not treat that default as a real user choice until they tap one.
 */
function currentOsekChoice(osekType: OsekType): "patur" | "morshe" {
  return osekType === "morshe" ? "morshe" : "patur";
}

function OsekTypeChoice({
  osekType,
  isOsekZeir,
  picked,
  ceilingHe,
  year,
  onChange,
}: {
  osekType: OsekType;
  isOsekZeir: boolean;
  picked: boolean;
  ceilingHe: string;
  year: number;
  onChange: (next: { osekType: OsekType; osekTrackPicked: boolean }) => void;
}) {
  const selected = picked ? currentOsekChoice(osekType) : null;

  // Neither option sets `isOsekZeir` any more — the עוסק-זעיר checkbox lives
  // independently of the פטור/מורשה radio once a track is picked (murshe-זעיר
  // reform, 2026-08-19), so switching the radio must not silently clear it.
  const options: {
    key: "patur" | "morshe";
    title: string;
    desc: string;
    next: { osekType: OsekType };
  }[] = [
    {
      key: "patur",
      title: "עוסק פטור",
      desc: `פטור מגביית מע״מ, מדווח הוצאות בפועל. מחזור עד ${ceilingHe} ₪ (שנת מס ${year}).`,
      next: { osekType: "patur" },
    },
    {
      key: "morshe",
      title: "עוסק מורשה",
      desc: "גובה ומדווח מע״מ, מקזז מע״מ תשומות. ללא תקרת מחזור.",
      next: { osekType: "morshe" },
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
              onChange={() => onChange({ ...opt.next, osekTrackPicked: true })}
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
 * "Neither of these" explainer-only taps — חברה בע״מ and עדיין לא פתחתי עוסק.
 * Both are honest dead-ends for the current product scope: selecting one shows
 * an inline explainer and deliberately does NOT set osekType/osekTrackPicked,
 * so validateStep3 still requires the user to pick פטור/מורשה to continue
 * (onboarding-v5 §5 — "not silent").
 */
function OsekOtherCasesPicker({
  value,
  onChange,
}: {
  value: "" | "company" | "not-yet";
  onChange: (v: "" | "company" | "not-yet") => void;
}) {
  const cards: { key: "company" | "not-yet"; title: string; explainer: string }[] = [
    {
      key: "company",
      title: "חברה בע״מ",
      explainer:
        "המערכת כרגע מיועדת לעצמאים (יחידים) — טופס 1301 הוא לדיווח יחיד, וחברות מגישות טופס 1214. נעדכן כשהתמיכה בחברות תהיה זמינה.",
    },
    {
      key: "not-yet",
      title: "עדיין לא פתחתי עוסק",
      explainer:
        "אפשר לגלוש ולהכיר את המערכת גם בלי תיק עוסק פתוח — אבל הפקת מסמכים אמיתיים (חשבוניות/קבלות) דורשת תיק עוסק רשום ברשות המסים.",
    },
  ];

  return (
    <div>
      <p className="text-xs text-muted mb-2">אף אחת מהאפשרויות למעלה לא מתאימה?</p>
      <div className="flex flex-wrap gap-2">
        {cards.map((c) => {
          const active = value === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onChange(active ? "" : c.key)}
              aria-pressed={active}
              className={cn(
                "rounded-full border px-3.5 py-2 text-xs transition-colors",
                active
                  ? "border-brand-deep bg-teal-100/40 text-brand-navy font-medium"
                  : "border-line bg-paper hover:bg-cream text-ink",
              )}
            >
              {c.title}
            </button>
          );
        })}
      </div>
      {value && (
        <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-due/40 bg-due-bg/50 px-3.5 py-2.5 text-xs leading-relaxed text-ink">
          <InfoIcon className="size-3.5 mt-0.5 shrink-0 text-due" />
          <span>{cards.find((c) => c.key === value)!.explainer}</span>
        </div>
      )}
    </div>
  );
}

const OSEK_LABEL: Record<"patur" | "morshe", string> = {
  patur: "עוסק פטור",
  morshe: "עוסק מורשה",
};

/**
 * Live preview of the document header (business name, owner, VAT/business
 * number, address, next document number) as the user fills step 3 — the
 * osek number shown falls back to the TZ exactly like buildPersona() does,
 * and the next-document number reuses invoice-generator's own numbering
 * (imported directly — invoice-generator only depends on persona.ts +
 * calculators/types.ts, so there's no import cycle with this page).
 */
function DocHeaderPreview({ s1, s3 }: { s1: Step1Data; s3: Step3Data }) {
  const ownerName = `${s1.firstName} ${s1.lastName}`.trim();
  const businessName = s3.tradeName.trim() || ownerName || "העסק שלך";
  const osekLabel = OSEK_LABEL[currentOsekChoice(s3.osekType)];
  const osekNumber = s3.osekFileNumber.trim() || s1.teudatZehut;

  const addressLine = [
    [s3.addressStreet.trim(), s3.addressHouseNumber.trim()].filter(Boolean).join(" "),
    s3.addressCity.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  // Same shape invoice-generator reads (only invoiceCounter matters here) —
  // built locally rather than loading the full existing persona so the
  // preview never depends on step-6 state that hasn't been entered yet.
  const nextDocNo = nextInvoiceNumber({
    invoiceCounter: loadPersona()?.invoiceCounter,
  } as unknown as Persona);

  return (
    <div className="rounded-xl border border-dashed border-brand/60 bg-cream/60 p-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-brand-deep/70">
        ככה תיראה כותרת המסמכים שלך
      </p>
      <div className="rounded-lg bg-paper border border-line px-4 py-3">
        <div className="text-sm font-bold text-brand-navy">{businessName}</div>
        {ownerName && businessName !== ownerName && (
          <div className="text-xs text-muted mt-0.5">{ownerName}</div>
        )}
        {addressLine && (
          <div className="text-xs text-muted mt-0.5">{addressLine}</div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
          <span>
            ע.מ./ת.ז.:{" "}
            <span dir="ltr" className="font-mono text-ink">
              {osekNumber || "—"}
            </span>
          </span>
          <span className="inline-flex items-center rounded-full bg-sand px-2 py-0.5 text-[10px] text-ink">
            {osekLabel}
          </span>
          {s3.osekType === "patur" && (
            <span className="inline-flex items-center rounded-full bg-teal-100/60 px-2 py-0.5 text-[10px] text-brand-navy">
              פטור ממע״מ
            </span>
          )}
          <span dir="ltr" className="font-mono">
            #{nextDocNo}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * FACTUAL note (no advice) shown when osek zeir is selected but real expenses
 * exceed the 30% auto-recognition. States the numbers only — does not tell the
 * user what to do. The advice framing was intentionally removed (product
 * decision: "facts, not advice"). The legal disclaimer lives elsewhere.
 *
 * Reference: מסלול עוסק זעיר (תיקון 265 לפקודת מס הכנסה) — ניכוי אוטומטי
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
