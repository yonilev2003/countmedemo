"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { computeVatReport, type VatReport } from "@/lib/vat-report";
import { ils } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LegalNote } from "@/components/brand/legal-note";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  DownloadIcon,
  PercentIcon,
  InfoIcon,
} from "@/components/brand/icons";

export default function VatReportPage() {
  const { persona } = useRequiredPersona();
  const [periodIndex, setPeriodIndex] = useState<number | null>(null);

  const report: VatReport | null = useMemo(() => {
    if (!persona) return null;
    return computeVatReport(persona, persona.income.year, periodIndex ?? undefined);
  }, [persona, periodIndex]);

  if (!persona || !report) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-[700px] space-y-3 animate-pulse">
        <div className="h-8 rounded-lg bg-sand w-1/2 mx-auto" />
        <div className="h-96 rounded-2xl bg-sand" />
      </div>
    </div>
  );

  const activeIndex = report.availablePeriods.findIndex(
    (p) => p.startMonth === report.period.startMonth && p.year === report.period.year,
  );

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-paper border-b border-line print:hidden">
        <div className="mx-auto flex max-w-screen-lg items-center justify-between px-6 py-4">
          <Link href="/dashboard/pro" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand-navy">
            <ArrowLeftIcon className="size-4" /> חזרה לדשבורד
          </Link>
          <span className="flex items-center gap-2 font-bold text-brand-navy">
            <Logo size={22} showWordmark={false} /> דוח מע&quot;מ תקופתי
          </span>
          <div className="flex items-center gap-2">
            {report.applicable && (
              <button onClick={() => window.print()} className={btn("primary", "sm")}>
                <DownloadIcon className="size-4" /> הדפס / שמור כ-PDF
              </button>
            )}
            <div className="border-s border-line ps-2">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[820px] px-8 py-10 print:py-0 print:px-0">
        {!report.applicable ? (
          <NotApplicableCard year={persona.income.year} />
        ) : (
          <>
            {/* Period switcher — not part of the printable article */}
            <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
              <button
                type="button"
                onClick={() => setPeriodIndex(Math.max(0, activeIndex - 1))}
                disabled={activeIndex <= 0}
                className="grid size-9 place-items-center rounded-full border border-line bg-paper text-brand-navy disabled:opacity-30"
                aria-label="תקופה קודמת"
              >
                <ArrowRightIcon className="size-4" />
              </button>
              <div className="text-center">
                <p className="text-xs text-muted">
                  {report.cadence === "monthly" ? "דיווח חודשי" : "דיווח דו-חודשי"} · שנת מס {persona.income.year}
                </p>
                <p className="font-display text-lg font-bold text-brand-navy">{report.period.labelHe}</p>
              </div>
              <button
                type="button"
                onClick={() => setPeriodIndex(Math.min(report.availablePeriods.length - 1, activeIndex + 1))}
                disabled={activeIndex >= report.availablePeriods.length - 1}
                className="grid size-9 place-items-center rounded-full border border-line bg-paper text-brand-navy disabled:opacity-30"
                aria-label="תקופה הבאה"
              >
                <ArrowLeftIcon className="size-4" />
              </button>
            </div>

            <article className="bg-paper rounded-2xl border border-line p-10 print:rounded-none print:border-none print:shadow-none shadow-brand">
              <header className="text-center border-b-2 border-brand-navy pb-5 mb-6">
                <h1 className="font-display text-3xl font-bold text-brand-navy">דוח מע&quot;מ תקופתי</h1>
                <p className="text-sm text-muted mt-1" dir="ltr">Periodic VAT Report (Doch Maam) — Form 874</p>
                <p className="text-sm font-medium text-ink mt-3">{report.period.labelHe}</p>
                <p className="text-xs text-muted">
                  מועד הגשה מקוון (SHAAM): {formatHe(report.onlineDueDate)}
                </p>
              </header>

              <section className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
                <Row labelHe="שם העסק" labelEn="Business Name" value={persona.business.tradeName} />
                <Row labelHe="מספר תיק" labelEn="File Number" value={persona.business.osekFileNumber} />
                <Row
                  labelHe="דיווח"
                  labelEn="Cadence"
                  value={report.cadence === "monthly" ? "חודשי" : "דו-חודשי"}
                />
                <Row labelHe="שיעור מע״מ" labelEn="VAT Rate" value={`${Math.round(report.vatRate * 100)}%`} />
              </section>

              <section className="border border-line rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-cream border-b border-line">
                      <th className="text-start px-4 py-2 font-bold text-brand-navy w-10">#</th>
                      <th className="text-start px-4 py-2 font-bold text-brand-navy">שדה</th>
                      <th className="text-start px-4 py-2 font-bold text-xs text-muted" dir="ltr">Field</th>
                      <th className="text-end px-4 py-2 font-bold text-brand-navy w-36">סכום (ש&quot;ח)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.fields.map((f, idx) => {
                      const isNet = f.code === 7;
                      const isFinal = f.code === 9;
                      return (
                        <tr
                          key={f.code}
                          className={[
                            isNet || isFinal ? "bg-info font-semibold border-t border-line" : "",
                            idx % 2 === 1 && !isNet && !isFinal ? "bg-cream/50" : "",
                          ].join(" ")}
                        >
                          <td className="px-4 py-1.5 text-faint text-xs">{f.code}</td>
                          <td className={`px-4 py-1.5 ${isNet || isFinal ? "text-brand-navy" : "text-ink"}`}>{f.labelHe}</td>
                          <td className={`px-4 py-1.5 text-xs ${isNet || isFinal ? "text-brand-navy/80" : "text-muted"}`} dir="ltr">
                            {f.labelEn}
                          </td>
                          <td
                            className={`px-4 py-1.5 text-end tabular-nums ${isNet || isFinal ? "font-display font-bold text-brand-navy" : "text-ink"}`}
                            dir="ltr"
                          >
                            {ils(f.amount)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-brand-navy text-white border-t-2 border-brand-navy">
                      <td colSpan={2} className="px-4 py-2.5 font-bold">
                        {report.amountDue >= 0 ? "לתשלום לרשות המסים" : "לזכותך (החזר)"}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-xs" dir="ltr">
                        {report.amountDue >= 0 ? "Amount Due" : "Refund Due"}
                      </td>
                      <td className="px-4 py-2.5 font-display font-extrabold text-end tabular-nums" dir="ltr">
                        {ils(Math.abs(report.amountDue))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <footer className="mt-6 text-[11px] text-muted space-y-1 leading-relaxed">
                <p>
                  <strong className="text-ink">הערות:</strong> {report.invoiceCount} מסמכי הכנסה ו-{report.expenseCount}{" "}
                  הוצאות נכללו בתקופה זו. {report.notesHe.join(" ")}
                </p>
                <p className="text-faint mt-3 text-center">
                  הופק באמצעות CountMe · {new Date().toLocaleDateString("he-IL")}
                </p>
              </footer>
            </article>

            <div className="mt-4 print:hidden">
              <LegalNote variant="full" />
              <p className="mt-2 text-[11px] leading-relaxed text-faint">
                הדוח מחושב אוטומטית מהחשבוניות וההוצאות שרשומות במערכת ואינו נשלח לרשות המסים —
                ההגשה בפועל (דרך פורטל שע&quot;ם) באחריותך. אם קיימות מכירות בשיעור אפס או פטורות
                שלא נכללות באוטומט, יש להוסיפן ידנית לפני ההגשה.
              </p>
            </div>
          </>
        )}
      </main>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 18mm;
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

function NotApplicableCard({ year }: { year: number }) {
  return (
    <div className="bg-paper rounded-2xl border border-line p-8 text-center shadow-brand">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-info text-brand-deep">
        <PercentIcon className="size-7" />
      </div>
      <h1 className="font-display text-2xl font-bold text-brand-navy mb-2">אין דוח מע&quot;מ תקופתי</h1>
      <p className="text-sm text-muted leading-relaxed max-w-md mx-auto">
        עוסק פטור אינו גובה או מדווח מע&quot;מ באופן שוטף — רק{" "}
        <Link href="/deadlines" className="text-brand-deep underline">
          הצהרת מחזור שנתית עד 31 בינואר
        </Link>
        . אם המחזור שלך חוצה את התקרה, תעבור/י לעוסק מורשה ותתחיל/י לגבות מע&quot;מ — ואז דוח זה
        יתמלא עבור שנת המס {year}.
      </p>
      <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-cream px-4 py-2.5 text-xs text-muted">
        <InfoIcon className="size-4 shrink-0" />
        <span>מסלול עוסק זעיר (תיקון 265) אינו משנה זאת — הוא מסלול מס הכנסה, לא מע&quot;מ.</span>
      </div>
      <Link href="/dashboard/pro" className={`${btn("secondary", "sm")} mt-6`}>
        חזרה לדשבורד
      </Link>
    </div>
  );
}

function Row({ labelHe, labelEn, value }: { labelHe: string; labelEn: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-muted text-xs whitespace-nowrap">{labelHe}</span>
      <span className="text-faint text-[10px]" dir="ltr">/ {labelEn}:</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

/** "YYYY-MM-DD" → "DD.MM.YYYY" without going through Date/timezone parsing. */
function formatHe(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}
