"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
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
import { calculate, estimateTaxLiability } from "@/lib/calculators";
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
}) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-4 shadow-brand">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted">
          {dot && <span className={`size-2 shrink-0 rounded-full ${dot}`} />}
          {label}
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
        className={`font-display text-2xl font-extrabold tabular-nums tracking-tight ${color ?? "text-brand-navy"}`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-faint">{sub}</div>}
    </div>
  );
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
  const { persona } = useRequiredPersona();
  const [granularity, setGranularity] = useState<Granularity>("year");
  const [filter, setFilter] = useState<Filter>({ kind: "year" });
  const [pl, setPL] = useState<PLSummary | null>(null);

  useEffect(() => {
    if (!persona) return;
    setPL(calculatePL(persona));
  }, [persona]);

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

  const filteredRevenue = filteredMonthly.reduce((s, m) => s + m.revenue, 0);
  const filteredExpenses = filteredMonthly.reduce((s, m) => s + m.expenses, 0);
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

  const ceilingAlert = computeCeilingAlert(persona);

  // ── Reusable blocks shared by both layouts ───────────────────────────────

  const kpiStrip = (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <KPI
        label="הכנסות"
        value={fmt(filteredRevenue)}
        color="text-brand-deep"
        dot="bg-brand-deep"
        icon={<WalletIcon className="size-4" />}
        iconChip="bg-teal-100 text-brand-deep"
      />
      <KPI
        label="הוצאות"
        value={fmt(filteredExpenses)}
        color="text-ink"
        dot="bg-brand"
        icon={<ReceiptIcon className="size-4" />}
        iconChip="bg-beige-100 text-beige-600"
      />
      <KPI
        label="רווח נקי"
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
        value={fmt(estimateTaxLiability(persona).taxAfterCredits)}
        sub="הערכה שנתית"
        color="text-muted"
        dot="bg-due"
        icon={<PercentIcon className="size-4" />}
        iconChip="bg-due-bg text-due"
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
            label: "הכנסה חייבת (שדה 150)",
            // Use the canonical field-150 calculator (zeir-aware: 70% of turnover
            // for עוסק זעיר), NOT raw netProfit which ignores the 30% rule.
            value: Number(calculate("field-150-business-income", persona)?.value ?? pl.netProfit),
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
            <Link href="/file" className={btn("secondary", "sm")}>
              מילוי הדוח <ArrowLeftIcon className="size-4" />
            </Link>
            <Link href="/coach" className={btn("gold", "sm")}>
              <SparklesIcon className="size-4" /> שוחח עם איתן
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
              <SparklesIcon className="size-4" /> איתן
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
                  שדורשים מעקב · שנת מס {persona.income.year}
                </>
              ) : (
                <>שנת מס {persona.income.year} · אין מועדים דחופים כרגע</>
              )}
            </p>
          </div>
        </div>

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

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          header,
          button,
          .no-print {
            display: none !important;
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
