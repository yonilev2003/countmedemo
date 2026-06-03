"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { loadPersona } from "@/lib/setup-storage";
import { Persona } from "@/lib/persona";
import {
  calculatePL,
  filterByQuarter,
  filterByMonth,
  MonthlyPL,
  PLSummary,
} from "@/lib/p-and-l/index";
import { EitanInsights } from "@/components/dashboard/eitan-insights";
import { ExpenseRatioCard } from "@/components/dashboard/expense-ratio-card";
import { computeExpenseRatio } from "@/lib/p-and-l/expense-ratio";
import { CeilingAlertCard } from "@/components/alerts/ceiling-alert";
import { computeCeilingAlert } from "@/lib/alerts/ceiling";
import { ForecastCard } from "@/components/dashboard/forecast-card";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import {
  BellIcon,
  CalendarIcon,
  FileTextIcon,
  SparklesIcon,
  AlertTriangleIcon,
  DownloadIcon,
  ArrowLeftIcon,
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
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-4 shadow-brand">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className={`font-display text-2xl font-bold ${color ?? "text-brand-navy"}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-faint mt-0.5">{sub}</div>}
    </div>
  );
}

const MONTH_LABELS = ["ינו׳","פבר׳","מרץ","אפר׳","מאי","יוני","יולי","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳"];

export default function DashboardPage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [granularity, setGranularity] = useState<Granularity>("year");
  const [filter, setFilter] = useState<Filter>({ kind: "year" });
  const [pl, setPL] = useState<PLSummary | null>(null);

  useEffect(() => {
    const p = loadPersona();
    if (!p) {
      router.push("/setup");
      return;
    }
    setPersona(p);
    setPL(calculatePL(p));
  }, [router]);

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

  const fmt = (n: number) => `${n.toLocaleString("he-IL")} ₪`;

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

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-base font-semibold text-muted">· דשבורד</span>
          </Link>
          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-screen-xl px-6 pt-4">
        <div className="flex items-start gap-2 rounded-2xl border border-line bg-sand px-5 py-2.5 text-[11px] text-muted leading-relaxed">
          <AlertTriangleIcon className="size-4 shrink-0 text-due mt-px" />
          <span>
            <span className="font-semibold text-ink">הצהרת אחריות: </span>
            הנתונים המוצגים מבוססים על נתונים שהוזנו ידנית ועל הערכות — אינם מהווים ייעוץ מס או ייעוץ פיננסי מקצועי.{" "}
            לפני הגשת הדוח, מומלץ להתייעץ עם רואה חשבון מוסמך.
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-screen-xl px-6 py-8">
        {/* Title + filter */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-navy">
              דוח רווח והפסד — {persona.personal.firstName}{" "}
              {persona.personal.lastName}
            </h1>
            <p className="text-sm text-muted mt-0.5">שנת מס {persona.income.year}</p>
          </div>
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
        </div>

        {/* Period banner — explains what user is seeing */}
        <div className="mb-4 rounded-2xl bg-info border border-teal-100 px-4 py-2 text-xs text-brand-navy">
          תצוגה: <span className="font-bold">{periodLabel}</span>
          {pl.hasDatedData ? (
            <span className="text-muted"> · נתונים אמיתיים מתוך החשבוניות וההוצאות</span>
          ) : (
            <span className="text-muted"> · פילוג מוערך — יוצג מדויק עם העלאת חשבוניות תאריכיות</span>
          )}
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
          <KPI label="הכנסות" value={fmt(filteredRevenue)} color="text-brand-deep" />
          <KPI
            label="הוצאות"
            value={fmt(filteredExpenses)}
            color="text-ink"
          />
          <KPI
            label="רווח נקי"
            value={fmt(filteredNet)}
            color={filteredNet >= 0 ? "text-success" : "text-alert"}
          />
          <KPI
            label="מס הכנסה משוער"
            value={fmt(Math.round(filteredNet * 0.2))}
            sub="הערכה בלבד"
            color="text-muted"
          />
        </div>

        {/* עוסק פטור ceiling alert — only for patur */}
        {(() => {
          const ceilingAlert = computeCeilingAlert(persona);
          return ceilingAlert ? (
            <div className="mb-6">
              <CeilingAlertCard alert={ceilingAlert} />
            </div>
          ) : null;
        })()}

        {/* Expense-to-revenue ratio insight (zeir track 30% rule) */}
        <div className="mb-8">
          <ExpenseRatioCard insight={computeExpenseRatio(persona)} />
        </div>

        {/* Forward-looking advances forecast — plan vs actual, strong/weak basis */}
        <div className="mb-8">
          <ForecastCard persona={persona} />
        </div>

        {/* Charts + Eitan in a 2-col layout on large screens */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl bg-paper border border-line p-5 shadow-brand">
            <PLChart
              monthlyData={filteredMonthly}
              expenseBreakdown={pl.expenseBreakdown}
            />
          </div>
          <div className="space-y-4">
            <EitanInsights persona={persona} pl={pl} />
            <div className="rounded-2xl border border-line bg-paper p-4 shadow-brand">
              <h3 className="text-xs font-semibold text-muted mb-2">
                סיכום שנתי
              </h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: "מחזור לשדה 238", value: pl.totalRevenue },
                  { label: "הכנסה חייבת (שדה 150)", value: pl.netProfit },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-muted">{row.label}</span>
                    <span className="font-semibold text-brand-navy">
                      {fmt(row.value)}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/file"
                className={btn("primary", "sm", "mt-3 w-full")}
              >
                עבור/י למילוי הדוח <ArrowLeftIcon className="size-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Print button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => window.print()}
            className={btn("secondary", "md")}
          >
            <DownloadIcon className="size-[18px]" /> הדפס / שמור כ-PDF
          </button>
        </div>
      </main>

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
