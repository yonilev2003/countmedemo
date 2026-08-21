"use client";

/**
 * /dashboard — the light daily-life dashboard (CEO plan §3.2 + §5).
 *
 * One screen. Three numbers: הכנסות, הוצאות, יחס. Four action buttons:
 * חשבון עסקה, קבלה, הצעת מחיר, העלאת הוצאה. No tabs, no charts.
 * The empty state is THE most important screen of the beta — honest zeros,
 * a warm Eitan line, and an obvious first action.
 *
 * Everything is deterministic (lib/dashboard/summary + lib/receivables) —
 * zero LLM calls from this screen. The rich tax dashboard lives at
 * /dashboard/pro ("מצב מורחב").
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Persona } from "@/lib/persona";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { YearSwitch } from "@/components/dashboard/year-switch";
import { allowedDocTypesFor } from "@/lib/invoice-generator";
import {
  computeMonthSummary,
  computeYearSummary,
  eitanMonthLine,
} from "@/lib/dashboard/summary";
import { getReceivablesSummary } from "@/lib/receivables/summary";
import { computeCeilingAlert } from "@/lib/alerts/ceiling";
import { isAnnualFilingDeadlinePassed } from "@/lib/deadlines/calendar";
import { trackClient } from "@/lib/analytics/track-client";
import { AppHeader } from "@/components/brand/app-header";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { btn } from "@/components/brand/button";
import { Reveal, Stagger, StaggerItem } from "@/components/brand/motion";
import {
  WalletIcon,
  ReceiptIcon,
  FileTextIcon,
  PlusIcon,
  SparklesIcon,
  ArrowLeftIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
} from "@/components/brand/icons";

const MONTH_NAMES = [
  "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר",
];

export default function DashboardPage() {
  const { persona, saveStatus, retrySave } = useRequiredPersona();

  // Transient "נשמר בענן" toast: fires on the transition INTO "saved" (the
  // post-OAuth adoption lands here mid-mount), never on a status that was
  // already "saved" when the page mounted, and clears itself after a beat.
  const [showSaved, setShowSaved] = useState(false);
  const prevSaveStatus = useRef(saveStatus);
  useEffect(() => {
    if (prevSaveStatus.current === "saving" && saveStatus === "saved") {
      setShowSaved(true);
      const t = window.setTimeout(() => setShowSaved(false), 4000);
      return () => window.clearTimeout(t);
    }
    prevSaveStatus.current = saveStatus;
  }, [saveStatus]);

  useEffect(() => {
    trackClient("dashboard_viewed");
  }, []);

  const summary = useMemo(
    () => (persona ? computeMonthSummary(persona) : null),
    [persona],
  );

  // FP-10 (Yoni's live finding, "אין הפרדה לנתונים"): with YearSwitch's
  // default write-through, persona.income.year always equals whatever was
  // just picked, so computeYearSummary(persona)/computeCeilingAlert(persona)
  // with no explicit `year` always hit the "declared year" branch (baseline
  // + every row) — every year looked identical: the wizard baseline never
  // actually changed.
  //
  // Here a year pick is a VIEW filter, not a declaration change:
  // `selectedYear` is tracked LOCALLY, onYearSwitchChange below only updates
  // this state and never calls setPersona, and YearSwitch gets
  // `persist={false}` so nothing reaches storage either (without that flag
  // its internal persistPersona would silently promote the viewing year into
  // the real declared year on the next reload). `persona.income.year` stays
  // at its true declared value while `selectedYear` can genuinely differ
  // from it. Passing BOTH into computeYearSummary/computeCeilingAlert is
  // what actually lets year !== persona.income.year happen — the branch that
  // scopes a non-declared year to real dated documents only (baseline
  // excluded), verified in tests/unit/dashboard/summary.test.ts.
  // `yearSwitchPersona` below feeds YearSwitch a persona whose displayed
  // income.year matches selectedYear, so its own chip/popover stay visually
  // in sync even though the underlying `persona` object is never mutated.
  // (pro/page.tsx deliberately keeps the opposite contract — a pick there IS
  // a declared-year change, persisted — until the persona.income.year
  // semantics question is settled with Yoni.)
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const activeYear = selectedYear ?? persona?.income.year ?? new Date().getFullYear();

  const yearSwitchPersona: Persona | null = useMemo(() => {
    if (!persona) return null;
    return activeYear === persona.income.year
      ? persona
      : { ...persona, income: { ...persona.income, year: activeYear } };
  }, [persona, activeYear]);

  function onYearSwitchChange(next: Persona) {
    setSelectedYear(next.income.year);
  }

  const yearSummary = useMemo(
    () => (persona ? computeYearSummary(persona, activeYear) : null),
    [persona, activeYear],
  );
  const receivables = useMemo(
    () => (persona ? getReceivablesSummary(persona) : null),
    [persona],
  );
  // null for עוסק מורשה (no ceiling) or when nowhere near it — computeCeilingAlert
  // is the SAME engine /alerts and the chat's get_ceiling_status tool use, so
  // the dashboard's reaction can never disagree with theirs. Year-aware (FP-10):
  // scoped to activeYear exactly like yearSummary above.
  const ceiling = useMemo(
    () => (persona ? computeCeilingAlert(persona, activeYear) : null),
    [persona, activeYear],
  );

  if (!persona || !summary || !yearSummary || !receivables)
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-full max-w-md space-y-4 px-6 animate-pulse">
          <div className="h-8 w-40 rounded-lg bg-sand" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-sand" />
            ))}
          </div>
          <div className="h-40 rounded-2xl bg-sand" />
        </div>
      </div>
    );

  const monthName = MONTH_NAMES[new Date().getMonth()];
  const firstName = persona.personal.firstName?.trim();
  const canTaxInvoice = allowedDocTypesFor(persona.business.osekType).includes(
    "tax-invoice-receipt",
  );
  // FP-10: the annual Form 1301 online deadline for the year being VIEWED
  // (not necessarily persona's true declared year) — same engine
  // src/lib/deadlines/calendar.ts's other consumers use.
  const filingDeadlinePassed = isAnnualFilingDeadlinePassed(activeYear);

  // The ratio, phrased so it feels informative — never alarming (CEO §3.2).
  const ratioLine =
    yearSummary.ratioYtd === null
      ? "עוד אין ממה לחשב יחס השנה"
      : `על כל 100 ₪ שנכנסו השנה, יצאו ${Math.round(yearSummary.ratioYtd * 100)} ₪`;

  const actions = [
    {
      href: "/invoices/new?type=business-account",
      label: "חשבון עסקה",
      hint: "דרישת תשלום ללקוח",
      icon: <WalletIcon className="size-5" />,
      tone: "bg-teal-100 text-brand-deep",
    },
    {
      href: "/invoices/new?type=receipt",
      label: canTaxInvoice ? "קבלה / חשבונית" : "קבלה",
      hint: "התקבל תשלום? מתעדים",
      icon: <ReceiptIcon className="size-5" />,
      tone: "bg-success-light text-success",
      highlight: summary.isFirstUse,
    },
    {
      href: "/invoices/new?type=quote",
      label: "הצעת מחיר",
      hint: "הצעה ללקוח חדש",
      icon: <FileTextIcon className="size-5" />,
      tone: "bg-cream text-beige-600",
    },
    {
      // Source-picker (camera/gallery/file/voice/manual) lives at /expenses/new —
      // this used to open a manual-only bottom sheet, making the camera flow
      // unreachable from the dashboard (the user-reported bug).
      href: "/expenses/new",
      label: "העלאת הוצאה",
      hint: "קבלה מספק? שומרים",
      icon: <PlusIcon className="size-5" />,
      tone: "bg-overdue-bg/40 text-alert-ink",
    },
  ];

  return (
    <div className="min-h-screen bg-cream">
      {/* AppHeader (2026-08-19, FP-11) supplies "עדכן נתונים" → /setup and
          sign-out for free, same as every other logged-in page — this page
          used to hand-roll its own header with neither. No pageLabel: this
          IS the dashboard (AppHeader's own convention for that case). */}
      <AppHeader
        actions={
          <>
            {/* Re-linked 2026-08-16 (was URL-only since the beta-lean pivot,
                6c9d16a): the rich tax dashboard was unreachable by click. */}
            <Link href="/dashboard/pro" className={btn("ghost", "sm")}>
              מצב מורחב
            </Link>
            <Link href="/coach" className={btn("gold", "sm")}>
              <SparklesIcon className="size-4" /> שקל
            </Link>
          </>
        }
      />

      {/* pb-28: clearance for the fixed a11y-widget button AND the
          QuickActionsBar bottom nav (FP-12), which otherwise cover the last
          action tile on phone heights (journey scan). */}
      <main className="mx-auto w-full max-w-screen-md px-4 pb-28 pt-6 sm:px-6">
        {/* Cloud-save outcome of the post-OAuth persona adoption (beta-feedback
            task #3, 18/08). DoneScreen shows its own inline confirmation for
            the already-signed-in path; this covers the OAuth-redirect path,
            which lands here without ever revisiting DoneScreen. Success is a
            transient toast (transition-triggered, auto-dismissed) because the
            shared status also flips on routine background saves (year switch,
            document edits) — only errors stay pinned until resolved. */}
        {showSaved && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success-light/60 px-3.5 py-2.5 text-xs font-medium text-success">
            <CheckCircleIcon className="size-4 shrink-0" />
            הנתונים שלך נשמרו בענן — אפשר להמשיך מכל מכשיר.
          </div>
        )}
        {saveStatus === "error" && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-alert/30 bg-overdue-bg/40 px-3.5 py-2.5 text-xs text-ink"
          >
            <AlertTriangleIcon className="size-4 mt-0.5 shrink-0 text-alert" />
            <div className="flex-1">
              <p className="font-medium text-alert-ink">השמירה בענן נכשלה</p>
              <p className="mt-0.5 text-muted leading-relaxed">
                הנתונים שמורים בדפדפן הזה בינתיים.
              </p>
            </div>
            <button
              type="button"
              onClick={retrySave}
              className="shrink-0 self-center text-xs font-semibold text-brand-deep hover:underline"
            >
              נסה/י שוב
            </button>
          </div>
        )}
        <Reveal>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
            {firstName ? `שלום, ${firstName}` : "שלום"}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
            {monthName} · {persona.business.tradeName} ·{" "}
            <YearSwitch
              persona={yearSwitchPersona ?? persona}
              onPersonaChange={onYearSwitchChange}
              persist={false}
            />
          </p>
        </Reveal>

        {/* FP-10: only for a year whose Form 1301 online deadline already
            passed (2024/2025 as of 2026-08-19 — see calendar.ts) — a past
            year is still fully viewable, this just sets expectations. */}
        {filingDeadlinePassed && (
          <Reveal className="mt-4">
            <div className="flex items-center gap-2 rounded-2xl bg-info border border-teal-100 px-4 py-2.5 text-xs text-brand-navy">
              <InfoIcon className="size-4 shrink-0 text-brand-deep" />
              <span>
                תאריך הגשת הדוח השנתי ל-{activeYear} עבר — ניתן למלא נתוני עבר
                לצרכי נוחות.
              </span>
            </div>
          </Reveal>
        )}

        {/* ── The three numbers ── */}
        <Stagger className="mt-6 grid grid-cols-3 gap-3">
          {/* YTD-with-baseline model (Yoni, 16/08): the big numbers are the
              year so far — the setup baseline + everything added in the app —
              matching /dashboard/pro and the ceiling alert. The month figure
              (real dated documents only) is the small line underneath.
              FP-09: cards are links now (with a subtle hover affordance) —
              they used to be plain, undiscoverable divs. */}
          <StaggerItem>
            <Link
              href="/invoices"
              className="group block rounded-2xl border border-line bg-paper p-3 shadow-brand transition-all hover:-translate-y-0.5 hover:border-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep focus-visible:ring-offset-2 sm:p-4"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <span className="size-2 rounded-full bg-brand-deep" />
                  הכנסות השנה
                </div>
                <ArrowLeftIcon className="size-3.5 shrink-0 text-faint transition-colors group-hover:text-brand-deep" />
              </div>
              <div
                className="mt-1.5 truncate font-display text-sm font-extrabold tabular-nums text-brand-deep sm:text-2xl"
                dir="ltr"
              >
                ₪{yearSummary.revenueYtd.toLocaleString("he-IL")}
              </div>
              <div className="mt-0.5 text-[11px] text-faint">
                לפני מע&quot;מ · החודש: ₪{summary.revenue.toLocaleString("he-IL")}
              </div>
            </Link>
          </StaggerItem>
          <StaggerItem>
            <Link
              href="/expenses"
              className="group block rounded-2xl border border-line bg-paper p-3 shadow-brand transition-all hover:-translate-y-0.5 hover:border-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep focus-visible:ring-offset-2 sm:p-4"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <span className="size-2 rounded-full bg-brand" />
                  הוצאות השנה
                </div>
                <ArrowLeftIcon className="size-3.5 shrink-0 text-faint transition-colors group-hover:text-brand-deep" />
              </div>
              <div
                className="mt-1.5 truncate font-display text-sm font-extrabold tabular-nums text-ink sm:text-2xl"
                dir="ltr"
              >
                ₪{yearSummary.expensesYtd.toLocaleString("he-IL")}
              </div>
              <div className="mt-0.5 text-[11px] text-faint">
                {/* morshe expenses are net of reclaimable input VAT — same
                    basis as the revenue card, so the ratio compares like
                    with like (patur has no VAT to reclaim, nothing to note) */}
                {persona.business.osekType === "morshe" && "לפני מע\"מ · "}
                החודש: ₪{summary.expenses.toLocaleString("he-IL")}
              </div>
            </Link>
          </StaggerItem>
          <StaggerItem>
            <Link
              href="/dashboard/pro"
              className="group block rounded-2xl border border-line bg-paper p-3 shadow-brand transition-all hover:-translate-y-0.5 hover:border-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep focus-visible:ring-offset-2 sm:p-4"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <span className="size-2 rounded-full bg-brand-navy" />
                  היחס
                </div>
                <ArrowLeftIcon className="size-3.5 shrink-0 text-faint transition-colors group-hover:text-brand-deep" />
              </div>
              <div className="mt-1.5 truncate font-display text-sm font-extrabold tabular-nums text-brand-navy sm:text-2xl">
                {yearSummary.ratioYtd === null
                  ? "—"
                  : `${Math.round(yearSummary.ratioYtd * 100)}%`}
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-faint">{ratioLine}</div>
            </Link>
          </StaggerItem>
        </Stagger>

        {/* ── Eitan line (deterministic — no LLM on this screen) ── */}
        <Reveal className="mt-4">
          <div className="flex items-start gap-3 rounded-2xl border border-line bg-aqua-soft p-4 shadow-brand">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-brand shadow-brand">
              <SparklesIcon className="size-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-brand-deep">
                שקל אומר
              </div>
              <p className="mt-0.5 text-sm leading-relaxed text-ink">
                {eitanMonthLine(summary, firstName, ceiling)}
              </p>
            </div>
          </div>
        </Reveal>

        {/* ── needs-review nudge — same card language as the receivables
            chip below, gently persistent (not dismissible: the pending
            receipts stay pending until the user actually reviews them). ── */}
        {summary.needsReviewCount > 0 && (
          <Reveal className="mt-4">
            <Link
              href="/expenses"
              className="flex items-center gap-3 rounded-2xl border border-line bg-overdue-bg/40 p-4 shadow-brand transition-all hover:-translate-y-0.5 hover:border-brand-deep"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-paper text-alert-ink">
                <AlertTriangleIcon className="size-5" />
              </span>
              <div>
                <div className="text-sm font-bold text-brand-navy">
                  {summary.needsReviewCount === 1
                    ? "קבלה אחת מחכה לבדיקה שלך"
                    : `${summary.needsReviewCount} קבלות מחכות לבדיקה שלך`}
                </div>
                <div className="mt-0.5 text-xs text-muted">חסרים בהן פרטים — כדאי להשלים</div>
              </div>
            </Link>
          </Reveal>
        )}

        {/* ── ceiling strip — warning/critical/exceeded only ("approaching"
            already speaks through the שקל line above; this is the
            unmissable version for when action is genuinely needed). For a
            עוסק פטור/זעיר, crossing the ceiling forces עוסק מורשה
            registration — losing the פטור/זעיר benefits — so this must not
            be buried on /alerts alone (Yoni, 18/08). A מורשה-זעיר (Amendment
            265) crossing the SAME ceiling does NOT need to register as
            מורשה — they already are — so their headline/detail already
            reflect that (ceiling.ts's isMursheZeir branch); only the
            "/guides/morshe" CTA below (adversarial-review finding,
            2026-08-20) still assumed the old patur-only case. ── */}
        {ceiling && (ceiling.level === "warning" || ceiling.level === "critical" || ceiling.level === "exceeded") && (
          <Reveal className="mt-4">
            <div
              className={`rounded-2xl border p-4 shadow-brand ${
                ceiling.level === "warning"
                  ? "border-due/40 bg-due-bg/40"
                  : "border-alert/40 bg-overdue-bg/40"
              }`}
            >
              <Link
                href="/alerts"
                className="flex items-center gap-3 transition-all hover:-translate-y-0.5"
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-paper ${
                    ceiling.level === "warning" ? "text-due-ink" : "text-alert-ink"
                  }`}
                >
                  <AlertTriangleIcon className="size-5" />
                </span>
                <div>
                  <div className="text-sm font-bold text-brand-navy">{ceiling.headlineHe}</div>
                  <div className="mt-0.5 text-xs text-muted">{ceiling.detailHe}</div>
                </div>
              </Link>
              {/* CTA to the פטור→מורשה transition guide — only relevant when
                  crossing the ceiling actually forces new מורשה registration.
                  A מורשה-זעיר is already registered/VAT-charging — the guide's
                  content (register as מורשה, start charging VAT) would be
                  actively wrong for them (adversarial-review finding, 2026-08-20).
                  belongs alongside the strip, not buried inside /alerts alone
                  (Yoni, 18/08, task #22). */}
              {!ceiling.isMursheZeir && (
                <Link href="/guides/morshe" className={`${btn("secondary", "sm")} mt-3`}>
                  למדריך המעבר למורשה
                </Link>
              )}
            </div>
          </Reveal>
        )}

        {/* ── מי לא שילם לי chip ── */}
        <Reveal className="mt-4">
          <Link
            href="/receivables"
            className="flex items-center justify-between rounded-2xl border border-line bg-paper p-4 shadow-brand transition-all hover:-translate-y-0.5 hover:border-brand-deep"
          >
            <div>
              <div className="text-sm font-bold text-brand-navy">מי לא שילם לי</div>
              <div className="mt-0.5 text-xs text-muted">
                {receivables.openCount === 0
                  ? "אין תשלומים פתוחים"
                  : `${receivables.openCount} חשבונות פתוחים` +
                    (receivables.overdueCount > 0
                      ? ` · ${receivables.overdueCount} באיחור`
                      : "")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`font-display text-lg font-extrabold tabular-nums ${
                  receivables.overdueTotal > 0 ? "text-alert-ink" : "text-brand-navy"
                }`}
                dir="ltr"
              >
                ₪{receivables.outstandingTotal.toLocaleString("he-IL")}
              </span>
              <ArrowLeftIcon className="size-4 text-brand-deep" />
            </div>
          </Link>
        </Reveal>

        {/* ── The four actions ── */}
        <h2 className="mt-7 mb-3 text-sm font-bold text-brand-navy">מה עושים עכשיו?</h2>
        <Stagger className="grid grid-cols-2 gap-3">
          {actions.map((a) => (
            <StaggerItem key={a.label}>
              <Link
                href={a.href}
                className={`group flex min-h-[104px] flex-col justify-between rounded-2xl border bg-paper p-4 shadow-brand transition-all hover:-translate-y-0.5 hover:border-brand-deep ${
                  a.highlight ? "border-brand ring-2 ring-brand/30" : "border-line"
                }`}
              >
                <span className={`grid size-10 place-items-center rounded-xl ${a.tone}`}>
                  {a.icon}
                </span>
                <span className="mt-2">
                  <span className="block text-sm font-bold text-brand-navy">{a.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{a.hint}</span>
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>

        {/* ── Quiet links to the list screens — previously unreachable from
            the light dashboard (/expenses had no inbound link at all). ── */}
        <nav
          aria-label="אזורים נוספים"
          className="mt-7 flex flex-wrap items-center justify-center gap-x-1 gap-y-2 border-t border-line pt-4 text-sm"
        >
          {[
            { href: "/invoices", label: "המסמכים שלי" },
            { href: "/expenses", label: "ההוצאות שלי" },
            { href: "/alerts", label: "התראות" },
            { href: "/deadlines", label: "תאריכים חשובים" },
          ].map((l, i) => (
            <span key={l.href} className="flex items-center gap-1">
              {i > 0 && (
                <span aria-hidden="true" className="text-faint">
                  ·
                </span>
              )}
              <Link
                href={l.href}
                className="rounded-full px-2 py-1 font-semibold text-brand-deep hover:bg-aqua-soft"
              >
                {l.label}
              </Link>
            </span>
          ))}
        </nav>

        {/* ── First-use welcome (the most important screen of the beta) ── */}
        {summary.isFirstUse && (
          <Reveal className="mt-6">
            <div className="rounded-2xl border-2 border-dashed border-brand/60 bg-paper p-5 text-center shadow-brand">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-aqua-soft">
                <TrendingUpIcon className="size-6 text-brand-deep" />
              </div>
              <p className="text-sm font-bold text-brand-navy">
                המספרים למעלה אמיתיים — פשוט עוד לא קרה כלום
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted">
                ברגע שתפיקו קבלה ראשונה או תתעדו הוצאה, הכול מתחיל לזוז.
                שתי דקות, מבטיחים.
              </p>
            </div>
          </Reveal>
        )}
      </main>

      {/* Quick-actions bottom bar (FP-12, mobile only) — the page already
          reserves pb-28 above for it, same clearance pattern /deadlines and
          /dashboard/pro use for the same component. */}
      <QuickActions variant="bar" className="lg:hidden" currentHref="/dashboard" />
    </div>
  );
}
