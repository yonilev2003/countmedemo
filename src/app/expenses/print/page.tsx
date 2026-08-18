"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { activeExpenses } from "@/lib/expenses/store";
import {
  expensePillLabel,
  filterExpensesByPill,
  groupExpensesByMonth,
  parseExpensePillFilter,
} from "@/lib/expenses/export";
import type { ExpenseLine } from "@/lib/persona";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { ArrowRightIcon, DownloadIcon, AlertTriangleIcon } from "@/components/brand/icons";

/**
 * Clean print-styled summary — expenses grouped by month, monthly + grand
 * totals, needs_review rows flagged. Reads the persona client-side exactly
 * like /expenses (localStorage-first). The ?filter= query param carries the
 * active pill over from /expenses so "PDF of what I'm looking at" actually
 * matches (spec §3) — filtering logic lives in lib/expenses/export.ts, never
 * reimplemented here.
 */
export default function ExpensesPrintPage() {
  return (
    <Suspense fallback={<PrintSkeleton />}>
      <ExpensesPrintContent />
    </Suspense>
  );
}

/**
 * QA #26: the header used to always read `סיכום הוצאות לשנת {persona.income.year}`
 * — but the table underneath is grouped from the ACTUAL expense dates
 * (`groupExpensesByMonth`, keyed "YYYY-MM"), which can land in a different
 * calendar year than `persona.income.year` (e.g. a persona whose income.year
 * is the filing year 2025 while its recorded expense rows are dated across
 * calendar 2024 — the tax-year label and the transaction dates are simply
 * two different things). The header must describe what's actually printed
 * below it, so it's derived from the same `months` groups the table renders
 * from, not from the persona's tax year. Falls back to `persona.income.year`
 * only when there's no data to derive a year from (empty filter result).
 */
function expensesPeriodLabel(
  months: { key: string }[],
  fallbackYear: number,
): string {
  if (months.length === 0) return `לשנת ${fallbackYear}`;

  const years = Array.from(new Set(months.map((m) => Number(m.key.slice(0, 4))))).sort(
    (a, b) => a - b,
  );

  return years.length === 1 ? `לשנת ${years[0]}` : `לתקופה ${years[0]}–${years[years.length - 1]}`;
}

function PrintSkeleton() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-[700px] space-y-3 animate-pulse">
        <div className="h-8 rounded-lg bg-sand w-1/2 mx-auto" />
        <div className="h-96 rounded-2xl bg-sand" />
      </div>
    </div>
  );
}

function ExpensesPrintContent() {
  const { persona } = useRequiredPersona();
  const searchParams = useSearchParams();
  const filter = parseExpensePillFilter(searchParams.get("filter"));

  if (!persona) return <PrintSkeleton />;

  const filtered = filterExpensesByPill(activeExpenses(persona), filter);
  const months = groupExpensesByMonth(filtered);

  const grandTotal = filtered.reduce((s, e) => s + e.amount, 0);
  const grandVat = filtered.reduce((s, e) => s + (e.vat ?? 0), 0);
  const foreign = filtered.filter((e) => e.isForeignCurrency);
  const foreignTotal = foreign.reduce((s, e) => s + e.amount, 0);
  const needsReviewCount = filtered.filter((e) => e.status === "needs_review").length;

  return (
    <div className="min-h-screen bg-cream">
      {/* Toolbar — never printed */}
      <header className="bg-paper border-b border-line print:hidden">
        <div className="mx-auto flex max-w-screen-lg flex-wrap items-center justify-between gap-y-2 px-6 py-4">
          <Link href="/expenses" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand-navy">
            <ArrowRightIcon className="size-4" />
            חזרה לרשימת ההוצאות
          </Link>
          <span className="flex items-center gap-2 font-bold text-brand-navy">
            <Logo size={22} showWordmark={false} />
            סיכום הוצאות להדפסה
          </span>
          <button onClick={() => window.print()} className={btn("primary", "sm")}>
            <DownloadIcon className="size-4" />
            שמירה כ-PDF
          </button>
        </div>
      </header>

      {/* Printable area */}
      <main className="mx-auto max-w-[860px] px-8 py-10 print:py-0 print:px-0">
        <article className="bg-paper rounded-2xl border border-line p-10 print:rounded-none print:border-none print:shadow-none shadow-brand">
          <header className="text-center border-b-2 border-brand-navy pb-5 mb-6">
            <h1 className="font-display text-3xl font-bold text-brand-navy">
              {persona.business.tradeName || persona.displayName}
            </h1>
            <p className="text-sm text-muted mt-1">
              סיכום הוצאות {expensesPeriodLabel(months, persona.income.year)}
            </p>
            {filter !== "all" && (
              <p className="text-xs text-faint mt-1">מסונן לפי: {expensePillLabel(filter)}</p>
            )}
          </header>

          {months.length === 0 ? (
            <p className="text-center text-sm text-muted py-10">אין הוצאות מתאימות לסינון הזה.</p>
          ) : (
            <div className="space-y-8">
              {months.map((group) => (
                <MonthSection key={group.key} label={group.label} expenses={group.expenses} />
              ))}
            </div>
          )}

          {/* Grand totals */}
          <section className="mt-8 border-t-2 border-brand-navy pt-4">
            <table className="w-full text-sm">
              <tbody>
                <TotalRow label='סה"כ הוצאות לתקופה' value={grandTotal} emphasize />
                <TotalRow label='מזה מע"מ' value={grandVat} />
                <TotalRow label='מזה הוצאות חו"ל' value={foreignTotal} />
              </tbody>
            </table>
            {needsReviewCount > 0 && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-alert-ink">
                <AlertTriangleIcon className="size-3.5" />
                {needsReviewCount} שורות מסומנות &quot;דורש בדיקה&quot; — פרטים חסרים לפני מסירה לרו&quot;ח.
              </p>
            )}
          </section>

          <footer className="mt-8 text-[11px] text-muted leading-relaxed space-y-1">
            <p>
              המערכת מרכזת ומסווגת הוצאות לצורך מעקב וניהול פנימי בלבד — אינה מהווה ייעוץ מס ואינה
              מפיקה חשבונית מס תואמת חוק.
            </p>
            <p className="text-faint text-center mt-3">הופק באמצעות countme · {new Date().toLocaleDateString("he-IL")}</p>
          </footer>
        </article>
      </main>

      {/* Print stylesheet — A4 margins, strip chrome */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 16mm;
          }
          body {
            background: white !important;
          }
          html, body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}

function MonthSection({ label, expenses }: { label: string; expenses: ExpenseLine[] }) {
  const monthTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const monthVat = expenses.reduce((s, e) => s + (e.vat ?? 0), 0);
  return (
    <section className="break-inside-avoid">
      <h2 className="font-display text-lg font-bold text-brand-navy mb-2">{label}</h2>
      <table className="w-full text-[13px] border border-line rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-cream border-b border-line">
            <th className="text-start px-3 py-2 font-bold text-brand-navy">תאריך</th>
            <th className="text-start px-3 py-2 font-bold text-brand-navy">ספק</th>
            <th className="text-start px-3 py-2 font-bold text-brand-navy">קטגוריה</th>
            <th className="text-end px-3 py-2 font-bold text-brand-navy">סכום</th>
            <th className="text-end px-3 py-2 font-bold text-brand-navy">מע&quot;מ</th>
            <th className="text-start px-3 py-2 font-bold text-brand-navy">סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e, i) => (
            <tr key={i} className={i % 2 === 1 ? "bg-cream/40" : ""}>
              <td className="px-3 py-1.5 text-ink tabular-nums">{e.date}</td>
              <td className="px-3 py-1.5 text-ink">{e.vendorName || "ללא שם ספק"}</td>
              <td className="px-3 py-1.5 text-muted">{e.category || "ללא קטגוריה"}</td>
              <td className="px-3 py-1.5 text-end tabular-nums" dir="ltr">{e.amount.toLocaleString("he-IL")} ₪</td>
              <td className="px-3 py-1.5 text-end tabular-nums text-muted" dir="ltr">{(e.vat ?? 0).toLocaleString("he-IL")} ₪</td>
              <td className="px-3 py-1.5">
                {e.status === "needs_review" ? (
                  <span className="text-alert-ink font-bold">דורש בדיקה</span>
                ) : (
                  <span className="text-faint">{e.status === "partial" ? "חסרים פרטים" : "מלא"}</span>
                )}
              </td>
            </tr>
          ))}
          <tr className="bg-info border-t border-line font-semibold">
            <td className="px-3 py-2 text-brand-navy" colSpan={3}>
              סה&quot;כ חודש
            </td>
            <td className="px-3 py-2 text-end tabular-nums text-brand-navy" dir="ltr">{monthTotal.toLocaleString("he-IL")} ₪</td>
            <td className="px-3 py-2 text-end tabular-nums text-brand-navy" dir="ltr">{monthVat.toLocaleString("he-IL")} ₪</td>
            <td className="px-3 py-2" />
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function TotalRow({ label, value, emphasize }: { label: string; value: number; emphasize?: boolean }) {
  return (
    <tr>
      <td className={`px-1 py-1.5 ${emphasize ? "font-bold text-brand-navy" : "text-muted"}`}>{label}</td>
      <td
        className={`px-1 py-1.5 text-end tabular-nums ${emphasize ? "font-display font-extrabold text-brand-navy text-lg" : "text-ink"}`}
        dir="ltr"
      >
        {value.toLocaleString("he-IL")} ₪
      </td>
    </tr>
  );
}
