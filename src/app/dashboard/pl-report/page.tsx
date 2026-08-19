"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { calculatePL } from "@/lib/p-and-l/index";
import { buildIsraeliPLReport, formatNIS, IsraeliPLReport } from "@/lib/p-and-l/israeli-report";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ArrowLeftIcon, DownloadIcon } from "@/components/brand/icons";

const OSEK_LABEL_HE: Record<"patur" | "morshe", string> = {
  patur: "עוסק פטור",
  morshe: "עוסק מורשה",
};
const OSEK_LABEL_EN: Record<"patur" | "morshe", string> = {
  patur: "Exempt Dealer",
  morshe: "Licensed Dealer",
};

export default function PLReportPage() {
  const { persona } = useRequiredPersona();
  const [report, setReport] = useState<IsraeliPLReport | null>(null);

  useEffect(() => {
    if (!persona) return;
    setReport(buildIsraeliPLReport(persona, calculatePL(persona)));
  }, [persona]);

  if (!persona || !report) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-[700px] space-y-3 animate-pulse">
        <div className="h-8 rounded-lg bg-sand w-1/2 mx-auto" />
        <div className="h-96 rounded-2xl bg-sand" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      {/* Top toolbar — hidden in print */}
      <header className="bg-paper border-b border-line print:hidden">
        <div className="mx-auto flex max-w-screen-lg items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand-navy">
            <ArrowLeftIcon className="size-4" /> חזרה לדשבורד
          </Link>
          <span className="flex items-center gap-2 font-bold text-brand-navy">
            <Logo size={22} showWordmark={false} /> דוח רווח והפסד · פורמט ישראלי תקני
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className={btn("primary", "sm")}
            >
              <DownloadIcon className="size-4" /> הדפס / שמור כ-PDF
            </button>
            <div className="border-s border-line ps-2">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* The printable area */}
      <main className="mx-auto max-w-[820px] px-8 py-10 print:py-0 print:px-0">
        <article className="bg-paper rounded-2xl border border-line p-10 print:rounded-none print:border-none print:shadow-none shadow-brand">
          {/* Title block */}
          <header className="text-center border-b-2 border-brand-navy pb-5 mb-6">
            <h1 className="font-display text-3xl font-bold text-brand-navy">דוח רווח והפסד</h1>
            <p className="text-sm text-muted mt-1" dir="ltr">Profit and Loss Statement (Doch Revach VeHefsed)</p>
            <p className="text-sm font-medium text-ink mt-3">{report.period.label}</p>
            <p className="text-xs text-muted" dir="ltr">For the year ended December 31, {report.period.year}</p>
          </header>

          {/* Business header */}
          <section className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
            <Row labelHe="שם העסק" labelEn="Business Name" valueHe={report.business.nameHe} valueEn={report.business.nameEn} />
            <Row
              labelHe="סוג עוסק"
              labelEn="Business Type"
              valueHe={OSEK_LABEL_HE[report.business.osekType]}
              valueEn={OSEK_LABEL_EN[report.business.osekType]}
            />
            {report.business.osekFileNumber && (
              <Row labelHe="מספר תיק" labelEn="File Number" valueHe={report.business.osekFileNumber} valueEn={report.business.osekFileNumber} />
            )}
            {report.business.primaryOccupation && (
              <Row labelHe="תחום עיסוק" labelEn="Occupation" valueHe={report.business.primaryOccupation} valueEn={report.business.primaryOccupation} />
            )}
            <Row labelHe="מטבע" labelEn="Currency" valueHe="ש&quot;ח" valueEn="NIS" />
          </section>

          {/* P&L table */}
          <section className="border border-line rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream border-b border-line">
                  <th className="text-start px-4 py-2 font-bold text-brand-navy">תיאור</th>
                  <th className="text-start px-4 py-2 font-bold text-xs text-muted" dir="ltr">Description</th>
                  <th className="text-end px-4 py-2 font-bold text-brand-navy w-40">סכום (ש&quot;ח)</th>
                </tr>
              </thead>
              <tbody>
                {report.lines.map((line, idx) => {
                  const isSubtotal = line.isSubtotal;
                  return (
                    <tr
                      key={idx}
                      className={[
                        isSubtotal ? "bg-info font-semibold border-t border-line" : "",
                        idx % 2 === 1 && !isSubtotal ? "bg-cream/50" : "",
                      ].join(" ")}
                    >
                      <td className={`px-4 py-1.5 ${isSubtotal ? "text-brand-navy" : "text-ink"} ${!isSubtotal ? "pe-8" : ""}`}>{line.he}</td>
                      <td className={`px-4 py-1.5 text-xs ${isSubtotal ? "text-brand-navy/80" : "text-muted"} ${!isSubtotal ? "pe-8" : ""}`} dir="ltr">{line.en}</td>
                      <td className={`px-4 py-1.5 text-end tabular-nums ${isSubtotal ? "font-display font-bold text-brand-navy" : "text-ink"}`} dir="ltr">
                        {formatNIS(line.amount, line.kind)}
                      </td>
                    </tr>
                  );
                })}
                {/* Final net-profit emphasis row */}
                <tr className="bg-brand-navy text-white border-t-2 border-brand-navy">
                  <td className="px-4 py-2.5 font-bold">רווח נקי לשנה</td>
                  <td className="px-4 py-2.5 font-bold text-xs" dir="ltr">Net Profit for the Year</td>
                  <td className="px-4 py-2.5 font-display font-extrabold text-end tabular-nums" dir="ltr">
                    {formatNIS(report.totals.netProfit, report.totals.netProfit < 0 ? "outflow" : "inflow")}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Footnotes */}
          <footer className="mt-6 text-[11px] text-muted space-y-1 leading-relaxed">
            <p>
              <strong className="text-ink">הערות:</strong> סכומים נוקבים בשקלים חדשים. סכומים שליליים בסוגריים.
              מס ההכנסה הוא הערכה לפי מדרגות {report.period.year}. ניכויים אישיים (ב&quot;ל, קרן השתלמות, פנסיה) מוצגים בנפרד כשהם זמינים; נקודות זיכוי אינן כלולות — לחישוב מדויק עיין/י ב-/file.
            </p>
            <p dir="ltr">
              <strong>Notes:</strong> Amounts in New Israeli Shekel (NIS). Negative amounts shown in parentheses.
              Income tax is an estimate per {report.period.year} brackets. Personal deductions (NI, study fund, pension) are shown separately when available; credit points are not included — refer to /file for the full calculation.
            </p>
            <p className="text-faint mt-3 text-center">
              הופק באמצעות CountMe · {new Date().toLocaleDateString("he-IL")}
            </p>
          </footer>
        </article>
      </main>

      {/* Print stylesheet — strip chrome, A4 margins */}
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

function Row({ labelHe, labelEn, valueHe, valueEn }: { labelHe: string; labelEn: string; valueHe: string; valueEn?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-muted text-xs whitespace-nowrap">{labelHe}</span>
      <span className="text-faint text-[10px]" dir="ltr">/ {labelEn}:</span>
      <span className="font-medium text-ink">{valueHe}</span>
      {valueEn && valueEn !== valueHe && (
        <span className="text-faint text-xs" dir="ltr">({valueEn})</span>
      )}
    </div>
  );
}
