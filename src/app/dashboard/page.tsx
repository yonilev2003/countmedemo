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
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="text-xs text-stone-500 mb-1">{label}</div>
      <div className={`font-display text-2xl font-bold ${color ?? "text-brand-navy"}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-stone-400 mt-0.5">{sub}</div>}
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
        <div className="h-8 rounded-lg bg-stone-200 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-stone-200" />)}
        </div>
        <div className="h-64 rounded-2xl bg-stone-200" />
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
      <header className="bg-white border-b border-stone-200">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/countme-logo.svg" alt="CountMe" className="h-10 w-10" />
            <span className="text-lg font-bold">CountMe · דשבורד</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/pl-report"
              className="rounded-full border border-brand-navy/20 px-3 py-1 text-xs text-brand-navy hover:bg-info/20"
              title="דוח רווח והפסד בפורמט ישראלי תקני, מוכן להדפסה / שמירה כ-PDF"
            >
              📄 דוח רו&quot;ה תקני
            </Link>
            <Link
              href="/file"
              className="rounded-full border border-brand-navy/20 px-3 py-1 text-xs text-brand-navy hover:bg-info/20"
            >
              מילוי הדוח ←
            </Link>
            <Link
              href="/coach"
              className="rounded-full border border-success/30 px-3 py-1 text-xs text-success hover:bg-success/10"
            >
              ✦ שוחח עם איתן
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-8">
        {/* Title + filter */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-navy">
              דוח רווח והפסד — {persona.personal.firstName}{" "}
              {persona.personal.lastName}
            </h1>
            <p className="text-sm text-stone-500 mt-0.5">שנת מס 2024</p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {/* Granularity toggle */}
            <div className="flex gap-1 rounded-lg bg-stone-100 p-1">
              {(["year", "quarter", "month"] as Granularity[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularityAndFilter(g)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    granularity === g
                      ? "bg-white text-brand-navy shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
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
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      filter.kind === "quarter" && filter.q === q
                        ? "bg-brand-navy text-white"
                        : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
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
                    className={`rounded-lg px-2 py-0.5 text-xs font-medium transition-colors ${
                      filter.kind === "month" && filter.m === m
                        ? "bg-brand-navy text-white"
                        : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
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
        <div className="mb-4 rounded-lg bg-info/30 border border-brand-navy/10 px-4 py-2 text-xs text-brand-navy">
          תצוגה: <span className="font-bold">{periodLabel}</span>
          {pl.hasDatedData ? (
            <span className="text-stone-500"> · נתונים אמיתיים מתוך החשבוניות וההוצאות</span>
          ) : (
            <span className="text-stone-500"> · פילוג מוערך — יוצג מדויק עם העלאת חשבוניות תאריכיות</span>
          )}
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
          <KPI label="הכנסות" value={fmt(filteredRevenue)} />
          <KPI
            label="הוצאות"
            value={fmt(filteredExpenses)}
            color="text-stone-600"
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
            color="text-stone-500"
          />
        </div>

        {/* Charts + Eitan in a 2-col layout on large screens */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl bg-white border border-stone-200 p-5">
            <PLChart
              monthlyData={filteredMonthly}
              expenseBreakdown={pl.expenseBreakdown}
            />
          </div>
          <div className="space-y-4">
            <EitanInsights persona={persona} pl={pl} />
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <h3 className="text-xs font-semibold text-stone-500 mb-2">
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
                    <span className="text-stone-600">{row.label}</span>
                    <span className="font-semibold text-brand-navy">
                      {fmt(row.value)}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/file"
                className="mt-3 block text-center rounded-lg bg-brand-navy/10 px-3 py-2 text-xs font-medium text-brand-navy hover:bg-brand-navy/20 transition-colors"
              >
                עבור/י למילוי הדוח ←
              </Link>
            </div>
          </div>
        </div>

        {/* Print button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => window.print()}
            className="rounded-full border border-stone-300 px-5 py-2 text-sm text-stone-600 hover:bg-stone-100 transition-colors"
          >
            🖨️ הדפס / שמור כ-PDF
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
