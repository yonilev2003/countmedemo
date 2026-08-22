"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { YearSwitch } from "@/components/dashboard/year-switch";
import { ils } from "@/lib/utils";
import {
  calculatePL,
  filterByQuarter,
  filterByMonth,
  MonthlyPL,
  PLSummary,
} from "@/lib/p-and-l/index";
import {
  getUpcomingDeadlines,
  isAnnualFilingDeadlinePassed,
  type FilerType,
  type UpcomingDeadline,
} from "@/lib/deadlines/calendar";
import { EitanInsights } from "@/components/dashboard/eitan-insights";
import { ExpenseRatioCard } from "@/components/dashboard/expense-ratio-card";
import { computeExpenseRatio } from "@/lib/p-and-l/expense-ratio";
import { CeilingAlertCard } from "@/components/alerts/ceiling-alert";
import { computeCeilingAlert } from "@/lib/alerts/ceiling";
import { ForecastCard } from "@/components/dashboard/forecast-card";
import { IncomeCeilingCard } from "@/components/dashboard/income-ceiling-card";
import { NextDeadlineCard } from "@/components/dashboard/next-deadline-card";
import { PeriodStatusCard } from "@/components/dashboard/period-status-card";
import { DeadlinesTimeline } from "@/components/dashboard/deadlines-timeline";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { LegalNote } from "@/components/brand/legal-note";
import { Reveal } from "@/components/brand/motion";
import { TaxEstimateBreakdown } from "@/components/tax-estimate/breakdown";
import { calculate, computePersonalDeductions, estimateTaxLiability } from "@/lib/calculators";
import {
  BellIcon,
  CalendarIcon,
  FileTextIcon,
  SparklesIcon,
  DownloadIcon,
  ArrowLeftIcon,
  WalletIcon,
  ReceiptIcon,
  TrendingUpIcon,
  PercentIcon,
  ChevronDownIcon,
  XIcon,
} from "@/components/brand/icons";

// Dynamic import to avoid SSR issues with Recharts
const PLChart = dynamic(
  () => import("@/components/dashboard/pl-chart").then((m) => ({ default: m.PLChart })),
  { ssr: false },
);

type Granularity = "year" | "quarter" | "month";
type Filter =
  | { kind: "year" }
  | { kind: "quarter"; q: 1 | 2 | 3 | 4 }
  | { kind: "month"; m: number };

function KPI({
  label,
  value,
  sub,
  color,
  dot,
  icon,
  iconChip,
  href,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  /** Tailwind bg-* class for the accent dot next to the label (mockup `.stat .sd`). */
  dot?: string;
  /** Optional line-icon rendered in the top-corner chip (mockup stat accent). */
  icon?: React.ReactNode;
  /** Tailwind classes for the icon chip (bg + text). */
  iconChip?: string;
  /**
   * FP-13: wraps the tile in a Link to the underlying record list (הכנסות →
   * /invoices, הוצאות → /expenses) — same quiet card-link hover treatment
   * (hover:-translate-y-0.5 hover:border-brand-deep) the main /dashboard
   * already uses for its own card-links. Mutually exclusive with onClick.
   */
  href?: string;
  /**
   * FP-14: makes the tile a button that expands the calculation breakdown
   * ("אני רוצה להבין איך הגעת לחישוב" — Yoni). Mutually exclusive with href.
   */
  onClick?: () => void;
}) {
  const interactive = Boolean(href || onClick);
  const inner = (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted">
          {dot && <span className={`size-2 shrink-0 rounded-full ${dot}`} />}
          {label}
          {onClick && (
            <ChevronDownIcon className="size-3 shrink-0 text-faint" aria-hidden="true" />
          )}
        </div>
        {icon && (
          <span
            className={`flex size-7 items-center justify-center rounded-lg ${iconChip ?? "bg-teal-100 text-brand-deep"}`}
          >
            {icon}
          </span>
        )}
      </div>
      <div
        className={`truncate font-display text-lg font-extrabold tabular-nums tracking-tight sm:text-2xl ${color ?? "text-brand-navy"}`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-faint">{sub}</div>}
    </>
  );
  const className = `block w-full rounded-2xl border border-line bg-paper p-4 text-start shadow-brand${
    interactive ? " transition-all hover:-translate-y-0.5 hover:border-brand-deep" : ""
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      // dashboard-kpi-button: this page's print stylesheet hides every plain
      // <button> (the granularity toggle, the print button itself) with a
      // blanket `button { display: none }` rule — without this class
      // overriding it, turning this tile into a <button> for FP-14 would
      // make the "מס הכנסה משוער" figure silently vanish from the printed /
      // PDF report. A class selector beats the element selector regardless
      // of rule order, so this survives even though the blanket rule is
      // also `!important`.
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        className={`dashboard-kpi-button ${className}`}
      >
        {inner}
      </button>
    );
  }
  return <div className={className}>{inner}</div>;
}

const MONTH_LABELS = ["ינו׳","פבר׳","מרץ","אפר׳","מאי","יוני","יולי","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳"];

/** Time-of-day Hebrew greeting, matching the mockups' "בוקר טוב". */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "בוקר טוב";
  if (h < 17) return "צהריים טובים";
  if (h < 21) return "ערב טוב";
  return "לילה טוב";
}

export default function DashboardPage() {
  const { persona, setPersona } = useRequiredPersona();
  const [granularity, setGranularity] = useState<Granularity>("year");
  const [filter, setFilter] = useState<Filter>({ kind: "year" });
  const [pl, setPL] = useState<PLSummary | null>(null);
  // FP-14: the "מס הכנסה משוער" KPI expands into <TaxEstimateBreakdown> in a modal.
  const [showTaxDetail, setShowTaxDetail] = useState(false);

  useEffect(() => {
    if (!persona) return;
    setPL(calculatePL(persona));
  }, [persona]);

  useEffect(() => {
    if (!showTaxDetail) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowTaxDetail(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showTaxDetail]);

  // Upcoming deadlines, derived from the persona's filer type (no new plumbing).
  const deadlines: UpcomingDeadline[] = useMemo(() => {
    if (!persona) return [];
    const filer: FilerType =
      persona.business.osekType === "patur" ? "osek-patur" : "osek-murshe";
    return getUpcomingDeadlines(new Date(), filer, 12);
  }, [persona]);

  // The near-term window the status ring + list summarize.
  const imminentDeadlines = useMemo(
    () => deadlines.filter((d) => d.daysUntilDue >= 0 && d.daysUntilDue <= 45),
    [deadlines],
  );
  const nextDeadline = imminentDeadlines[0] ?? deadlines[0] ?? null;

  if (!persona || !pl) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="space-y-4 w-full max-w-screen-xl px-6 animate-pulse">
        <div className="h-8 rounded-lg bg-sand w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-sand" />)}
        </div>
        <div className="h-64 rounded-2xl bg-sand" />
      </div>
    </div>
  );

  const filteredMonthly: MonthlyPL[] =
    filter.kind === "year"
      ? pl.monthlyData
      : filter.kind === "quarter"
        ? filterByQuarter(pl.monthlyData, filter.q)
        : filterByMonth(pl.monthlyData, filter.m);

  // "Whole year" reads pl.totalRevenue/totalExpenses directly (the same
  // baseline+docs YTD figures every other card on this page — and the
  // light dashboard — already show). monthlyData only ever holds REAL
  // DATED activity, by design (the chart's one job is showing where that
  // activity actually happened, never a smoothed estimate) — summing it
  // for "the whole year" silently dropped the undated setup-wizard
  // baseline the moment even one dated document existed (audit,
  // 2026-08-18: showed ₪6,500/₪3,009 next to a ₪119,500/₪23,009 total on
  // the same screen). Quarter/month views correctly stay dated-only —
  // that IS what "activity in this specific quarter/month" means.
  const filteredRevenue =
    filter.kind === "year" ? pl.totalRevenue : filteredMonthly.reduce((s, m) => s + m.revenue, 0);
  const filteredExpenses =
    filter.kind === "year" ? pl.totalExpenses : filteredMonthly.reduce((s, m) => s + m.expenses, 0);
  const filteredNet = filteredRevenue - filteredExpenses;

  const fmt = ils;

  // Auto-detected active months — only show period buttons for months with activity
  const activeMonths = pl.hasDatedData
    ? pl.monthlyData.filter((m) => m.revenue > 0 || m.expenses > 0).map((m) => m.month)
    : Array.from({ length: 12 }, (_, i) => i + 1);
  const activeQuarters = Array.from(
    new Set(activeMonths.map((m) => Math.ceil(m / 3))),
  ).sort();

  function setGranularityAndFilter(g: Granularity) {
    setGranularity(g);
    if (g === "year") setFilter({ kind: "year" });
    else if (g === "quarter") setFilter({ kind: "quarter", q: (activeQuarters[0] ?? 1) as 1 | 2 | 3 | 4 });
    else setFilter({ kind: "month", m: activeMonths[0] ?? 1 });
  }

  const periodLabel =
    filter.kind === "year"
      ? "כל השנה"
      : filter.kind === "quarter"
        ? `רבעון ${filter.q}`
        : MONTH_LABELS[filter.m - 1];

  // FP-18: explicit year param — was already the default (computeCeilingAlert
  // defaults to persona.income.year), but explicit here to match the other
  // year-scoped reads on this page and keep the wiring self-documenting as
  // the selected year (via YearSwitch, above) flows through.
  const ceilingAlert = computeCeilingAlert(persona, persona.income.year);

  // FP-15: single computation reused by the annual summary card's ביטוח
  // לאומי row below — same canonical source estimateTaxLiability/the P&L
  // report use, so the figures can't diverge.
  const personalDeductions = computePersonalDeductions(persona);

  // FP-18: the annual Form 1301 filing deadline for the SELECTED tax year —
  // when the user has switched to a past year (YearSwitch, above), the
  // deadline/next-occurrence cards below still show REAL, current-date
  // deadlines (by design — they answer "what's due soon", not "what was due
  // for that old year"), so a viewer must be told this data is historical
  // and those cards don't describe the year they're looking at.
  const pastYearDeadlinePassed = isAnnualFilingDeadlinePassed(persona.income.year);

  // ── Reusable blocks shared by both layouts ───────────────────────────────

  // The period banner above already states the active filter, but a reader
  // who only scans the big bold number (or a screenshot cropped to just the
  // tiles — exactly how the 82,000-vs-125,500 "mismatch" got flagged, verified
  // 2026-08-18: both read the identical pl.totalRevenue, it was the quarter
  // filter showing Q1-only) never sees it. Same principle as the tax-year
  // labeling requirement: every number carries its own scope, not just a
  // banner someone can miss.
  const periodQualifier = filter.kind === "year" ? "" : ` (${periodLabel})`;

  const kpiStrip = (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {/* FP-13: linked to the underlying record list, same treatment as the
          main dashboard's card-links. */}
      <KPI
        label={`הכנסות${periodQualifier}`}
        value={fmt(filteredRevenue)}
        color="text-brand-deep"
        dot="bg-brand-deep"
        icon={<WalletIcon className="size-4" />}
        iconChip="bg-teal-100 text-brand-deep"
        href="/invoices"
      />
      <KPI
        label={`הוצאות${periodQualifier}`}
        value={fmt(filteredExpenses)}
        color="text-ink"
        dot="bg-brand"
        icon={<ReceiptIcon className="size-4" />}
        iconChip="bg-beige-100 text-beige-600"
        href="/expenses"
      />
      <KPI
        label={`רווח נקי${periodQualifier}`}
        value={fmt(filteredNet)}
        color={filteredNet >= 0 ? "text-success" : "text-alert"}
        dot={filteredNet >= 0 ? "bg-success" : "bg-alert"}
        icon={<TrendingUpIcon className="size-4" />}
        iconChip={filteredNet >= 0 ? "bg-success-light text-success" : "bg-overdue-bg text-alert"}
      />
      <KPI
        label="מס הכנסה משוער"
        // Real annual estimate (zeir-aware taxable + brackets + credit points +
        // deductions) — income tax is annual, so this is the yearly figure, not
        // net×20%. Was a flat 20% of net profit, which ignored zeir + brackets.
        //
        // SCOPE (Yoni, 18/08 audit): this is computed on ACTUAL YTD data
        // (persona.income.totalRevenue as recorded so far) — unlike the
        // forecast card's "מקדמות שנתיות צפויות", which runs the same tax
        // engine on the PROJECTED annual revenue. Both are correct; without a
        // scope label they read as two unlabeled, disagreeing tax figures on
        // the same page. Same principle as the KPI strip's periodQualifier.
        value={fmt(estimateTaxLiability(persona).taxAfterCredits)}
        // FP-16: this KPI ALWAYS runs on full-year data (estimateTaxLiability
        // reads persona.income.totalRevenue directly) regardless of the
        // granularity filter above (year/quarter/month) — unlike the KPI
        // strip's own periodQualifier, this figure never narrows to the
        // selected period, so it needs its own explicit label to avoid
        // reading as "this quarter/month's tax" next to a filtered strip.
        sub="חישוב שנתי מלא · לפי הנתונים עד כה"
        color="text-muted"
        dot="bg-due"
        icon={<PercentIcon className="size-4" />}
        iconChip="bg-due-bg text-due"
        // FP-14 — expands into <TaxEstimateBreakdown> so "אני רוצה להבין איך
        // הגעת לחישוב" (Yoni) is answered in-product, not just as a number.
        onClick={() => setShowTaxDetail(true)}
      />
    </div>
  );

  const granularityControls = (
    <div className="flex flex-col gap-2 items-end">
      {/* Granularity toggle */}
      <div className="flex gap-1 rounded-full bg-cream p-1">
        {(["year", "quarter", "month"] as Granularity[]).map((g) => (
          <button
            key={g}
            onClick={() => setGranularityAndFilter(g)}
            aria-pressed={granularity === g}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              granularity === g
                ? "bg-paper text-brand-navy shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            {g === "year" ? "שנה" : g === "quarter" ? "רבעון" : "חודש"}
          </button>
        ))}
      </div>
      {/* Period selector — shown only for quarter/month */}
      {granularity === "quarter" && (
        <div className="flex gap-1">
          {activeQuarters.map((q) => (
            <button
              key={q}
              onClick={() => setFilter({ kind: "quarter", q: q as 1 | 2 | 3 | 4 })}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                filter.kind === "quarter" && filter.q === q
                  ? "bg-brand-navy text-white"
                  : "bg-paper border border-line text-muted hover:border-brand-deep hover:bg-aqua-soft"
              }`}
            >
              Q{q}
            </button>
          ))}
        </div>
      )}
      {granularity === "month" && (
        <div className="flex flex-wrap gap-1 max-w-[400px] justify-end">
          {activeMonths.map((m) => (
            <button
              key={m}
              onClick={() => setFilter({ kind: "month", m })}
              className={`rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${
                filter.kind === "month" && filter.m === m
                  ? "bg-brand-navy text-white"
                  : "bg-paper border border-line text-muted hover:border-brand-deep hover:bg-aqua-soft"
              }`}
            >
              {MONTH_LABELS[m - 1]}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const periodBanner = (
    <div className="flex items-center gap-2 rounded-2xl bg-info border border-teal-100 px-4 py-2.5 text-xs text-brand-navy">
      <CalendarIcon className="size-4 shrink-0 text-brand-deep" />
      <span>
        תצוגה: <span className="font-bold">{periodLabel}</span>
        {pl.hasDatedData ? (
          <span className="text-muted"> · נתונים אמיתיים מתוך החשבוניות וההוצאות</span>
        ) : (
          <span className="text-muted"> · פילוג מוערך — יוצג מדויק עם העלאת חשבוניות תאריכיות</span>
        )}
      </span>
    </div>
  );

  const plChartCard = (
    <div className="rounded-2xl bg-paper border border-line p-5 shadow-brand">
      <PLChart
        monthlyData={filteredMonthly}
        expenseBreakdown={pl.expenseBreakdown}
      />
    </div>
  );

  const annualSummaryCard = (
    <div className="rounded-2xl border border-line bg-paper p-5 shadow-brand">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-brand-navy">סיכום שנתי</h3>
        <span className="text-xs font-semibold text-faint">
          שנת {persona.income.year}
        </span>
      </div>
      <div className="space-y-2.5 text-sm">
        {[
          { label: "מחזור לשדה 238", value: pl.totalRevenue },
          {
            // Field 150 is business income BEFORE personal deductions — NOT
            // taxable income (computeBusinessIncome's own doc comment says
            // so explicitly; audit, 2026-08-18, found this card mislabeled
            // "הכנסה חייבת"/taxable-income, which field 150 never is — the
            // canonical taxable figure is computeTaxableIncome, shown in
            // the tax-estimate card elsewhere, not duplicated here).
            label: "הכנסה מעסק (שדה 150)",
            // Use the canonical field-150 calculator (zeir-aware: 70% of turnover
            // for עוסק זעיר), NOT raw netProfit which ignores the 30% rule.
            value: Number(calculate("field-150-business-income", persona)?.value ?? pl.netProfit),
          },
          {
            // FP-15 (Yoni: "בסקירה הכספית אני רוצה גם ביטוח לאומי") — the
            // recognised 52% portion of self-employed Bituach Leumi (שדה 030),
            // from the SAME canonical source estimateTaxLiability/the P&L
            // report use (computePersonalDeductions), so this can't diverge
            // from the deduction actually applied in the tax estimate above.
            label: "ביטוח לאומי — 52% מוכר (שדה 030)",
            value: personalDeductions.bituachLeumi,
          },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-xl border border-line-soft bg-cream px-3 py-2.5"
          >
            <span className="font-semibold text-muted">{row.label}</span>
            <span className="font-display font-extrabold tabular-nums text-brand-navy">
              {fmt(row.value)}
            </span>
          </div>
        ))}
      </div>
      <Link href="/file" className={btn("primary", "sm", "mt-3 w-full")}>
        עבור/י למילוי הדוח <ArrowLeftIcon className="size-4" />
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size={28} />
            <span className="hidden text-base font-semibold text-muted sm:inline">· מצב מורחב</span>
          </Link>
          {/* Desktop toolbar */}
          <div className="hidden items-center gap-2 lg:flex">
            {/* FP-17: quick way back to the setup wizard to update source
                data — every KPI on this page derives from it. */}
            <Link href="/setup" className={btn("ghost", "sm")}>
              עדכן נתונים
            </Link>
            <Link href="/alerts" className={btn("secondary", "sm")}>
              <BellIcon className="size-4" /> התראות
            </Link>
            <Link href="/deadlines" className={btn("secondary", "sm")}>
              <CalendarIcon className="size-4" /> מועדים
            </Link>
            <Link
              href="/dashboard/pl-report"
              className={btn("secondary", "sm")}
              title="דוח רווח והפסד בפורמט ישראלי תקני, מוכן להדפסה / שמירה כ-PDF"
            >
              <FileTextIcon className="size-4" /> דוח רו&quot;ה תקני
            </Link>
            {/* עוסק פטור אינו מגיש דוח מע"מ תקופתי — רק הצהרת מחזור שנתית
                (vat-osek-patur-annual). כולל murshe-זעיר: תיקון 265 הוא
                מסלול מס-הכנסה בלבד, אינו משנה חובת מע"מ. */}
            {persona.business.osekType === "morshe" && (
              <Link
                href="/dashboard/vat-report"
                className={btn("secondary", "sm")}
                title="דוח מע״מ תקופתי — מחושב מהחשבוניות וההוצאות שלך, לא מוגש אוטומטית"
              >
                <PercentIcon className="size-4" /> דוח מע&quot;מ
              </Link>
            )}
            <Link href="/file" className={btn("secondary", "sm")}>
              מילוי הדוח <ArrowLeftIcon className="size-4" />
            </Link>
            <Link href="/coach" className={btn("gold", "sm")}>
              <SparklesIcon className="size-4" /> שוחח עם שקל
            </Link>
            <SignOutButton />
          </div>
          {/* Mobile: condensed — the rest of the actions live in the bottom bar */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              href="/alerts"
              aria-label="התראות"
              className="relative grid size-10 place-items-center rounded-full border border-line bg-paper text-brand-navy"
            >
              <BellIcon className="size-5" />
              <span className="absolute end-2.5 top-2.5 size-2 rounded-full border-[1.5px] border-paper bg-alert" />
            </Link>
            <Link href="/coach" className={btn("gold", "sm")}>
              <SparklesIcon className="size-4" /> שקל
            </Link>
          </div>
        </div>
      </header>

      {/* Legal note — the ONE banner on this page (WS8 audit H5) */}
      <div className="mx-auto max-w-screen-xl px-4 pt-4 sm:px-6">
        <LegalNote variant="full" />
      </div>

      <main className="mx-auto max-w-screen-xl px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:pb-8">
        {/* Greeting */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[26px] font-extrabold tracking-tight text-brand-navy sm:text-[30px]">
              {greeting()}, {persona.personal.firstName}
            </h1>
            <p className="mt-0.5 text-sm font-medium text-muted">
              {imminentDeadlines.length > 0 ? (
                <>
                  יש לך{" "}
                  <b className="font-bold text-due">
                    {imminentDeadlines.length} מועדים
                  </b>{" "}
                  שדורשים מעקב ·{" "}
                  <YearSwitch persona={persona} onPersonaChange={setPersona} />
                </>
              ) : (
                <>
                  <YearSwitch persona={persona} onPersonaChange={setPersona} /> · אין מועדים
                  דחופים כרגע
                </>
              )}
            </p>
          </div>
        </div>

        {/* FP-18: viewing a past tax year (via YearSwitch above) whose annual
            filing deadline already passed — the deadline/next-occurrence
            cards further down still show REAL, current-date deadlines (by
            design), so this makes explicit that they don't describe the
            year being viewed here. */}
        {pastYearDeadlinePassed && (
          <Reveal className="mb-5">
            <div className="flex items-center gap-2 rounded-2xl bg-info border border-teal-100 px-4 py-2.5 text-xs text-brand-navy">
              <CalendarIcon className="size-4 shrink-0 text-brand-deep" />
              <span>
                מוצגים נתוני <span className="font-bold">שנת מס {persona.income.year}</span> —
                מועד ההגשה השנתי לשנה זו כבר עבר.
                <span className="text-muted">
                  {" "}
                  מועדי ההגשה הקרובים בהמשך הדף מתייחסים למועדים הנוכחיים, לא לשנה זו.
                </span>
              </span>
            </div>
          </Reveal>
        )}

        {/*
          ── Desktop (lg+): multi-column dashboard, per CountMe Dashboard Web ──
          Top: income-vs-ceiling spans full width. Then a 3-col row:
            [ period status ] | [ next-deadline hero ] | [ deadlines list ].
          Finance below (filter + KPIs + chart) with a side column carrying
          Eitan insights, the quick-actions rail, and the annual summary.

          ── Mobile (<lg): stacked, per CountMe Dashboard App ──
          income → next-deadline hero → period status → deadlines list →
          finance KPIs/chart → forecast → insights/summary. Quick-actions
          live in a fixed bottom bar (rendered once, outside the grid).
        */}

        {/* Top: income vs ceiling */}
        <Reveal className="mb-5">
          <IncomeCeilingCard persona={persona} />
        </Reveal>

        {/* Hero + status + list. Order utilities honor each mockup:
            mobile = hero first; desktop = status | hero | list. */}
        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="order-1 lg:order-2">
            <NextDeadlineCard deadline={nextDeadline} className="h-full" />
          </div>
          <div className="order-2 lg:order-1">
            <PeriodStatusCard deadlines={imminentDeadlines} showLegend className="h-full" />
          </div>
          <div className="order-3 lg:order-3">
            <DeadlinesTimeline deadlines={imminentDeadlines.slice(0, 5)} className="h-full" />
          </div>
        </div>

        {/* עוסק פטור ceiling alert — only for patur */}
        {ceilingAlert && (
          <div className="mb-5">
            <CeilingAlertCard alert={ceilingAlert} />
          </div>
        )}

        {/* Finance section: title + filter, KPIs, chart, side column */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-brand-navy">
            סקירה כספית — רווח והפסד
          </h2>
          {granularityControls}
        </div>

        <div className="mb-4">{periodBanner}</div>

        <div className="mb-5">{kpiStrip}</div>

        {/* Expense-ratio insight (zeir track 30% rule) */}
        <Reveal className="mb-5">
          <ExpenseRatioCard insight={computeExpenseRatio(persona)} />
        </Reveal>

        {/* Forward-looking advances forecast */}
        <Reveal className="mb-5">
          <ForecastCard persona={persona} />
        </Reveal>

        {/* Charts + Eitan + quick-actions rail (rail only shows on lg) */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">{plChartCard}</div>
          <div className="space-y-5">
            <EitanInsights persona={persona} pl={pl} />
            {/* Quick-actions side rail — desktop only (mobile uses the bottom bar) */}
            <QuickActions variant="rail" className="hidden lg:block" />
            {annualSummaryCard}
          </div>
        </div>

        {/* Print button */}
        <div className="mt-6 text-center no-print">
          <button onClick={() => window.print()} className={btn("secondary", "md")}>
            <DownloadIcon className="size-[18px]" /> הדפס / שמור כ-PDF
          </button>
        </div>
      </main>

      {/* Quick-actions bottom bar — mobile only (desktop uses the side rail) */}
      <QuickActions variant="bar" className="lg:hidden" />

      {/* FP-14: "מס הכנסה משוער" KPI expander — renders the shared
          <TaxEstimateBreakdown> (wave-1, extracted from /demo's
          TaxEstimateGate) in a modal, so "אני רוצה להבין איך הגעת לחישוב"
          (Yoni) is answered without leaving the dashboard. Backdrop +
          role="dialog" mirror the mobile chat overlay pattern already used
          on /demo (bg-brand-navy/40 scrim, click-outside + Escape to close). */}
      {showTaxDetail && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-brand-navy/40 p-4 no-print"
          onClick={() => setShowTaxDetail(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="איך הגענו להערכת המס"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-paper shadow-brand"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h3 className="font-display text-base font-bold text-brand-navy">
                איך הגענו להערכת המס — שנת {persona.income.year}
              </h3>
              <button
                type="button"
                onClick={() => setShowTaxDetail(false)}
                aria-label="סגירה"
                className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-paper text-muted hover:text-brand-navy"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <TaxEstimateBreakdown persona={persona} compact />
          </div>
        </div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          header,
          button,
          .no-print {
            display: none !important;
          }
          /* FP-14: keep the "מס הכנסה משוער" KPI (now a button element)
             visible in print/PDF — class selector outranks the blanket
             button-element rule above regardless of source order. */
          .dashboard-kpi-button {
            display: block !important;
          }
          main {
            padding: 0 !important;
          }
          .bg-cream {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
