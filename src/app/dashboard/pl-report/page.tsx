"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPersona } from "@/lib/setup-storage";
import { Persona } from "@/lib/persona";
import { calculatePL, personaForYear, availableTaxYears } from "@/lib/p-and-l/index";
import { buildIsraeliPLReport, formatNIS, IsraeliPLReport } from "@/lib/p-and-l/israeli-report";

const OSEK_LABEL_HE: Record<"patur" | "morshe", string> = {
  patur: "עוסק פטור",
  morshe: "עוסק מורשה",
};
const OSEK_LABEL_EN: Record<"patur" | "morshe", string> = {
  patur: "Exempt Dealer",
  morshe: "Licensed Dealer",
};

export default function PLReportPage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [activeYear, setActiveYear] = useState<number | null>(null);

  useEffect(() => {
    const p = loadPersona();
    if (!p) { router.push("/setup"); return; }
    setPersona(p);
    // Default to the persona's declared tax year (2024 for the demo). For a
    // single-year persona this is the only year; for multi-year data it scopes
    // the report so a 2026 invoice never bleeds into the 2024 report.
    setActiveYear(p.income.year);
  }, [router]);

  // Project the persona onto the selected tax year before building the report.
  // For the single-year demo persona personaForYear is a no-op, so the numbers
  // are byte-for-byte identical to before.
  const yearPersona =
    persona && activeYear !== null ? personaForYear(persona, activeYear) : null;
  const report: IsraeliPLReport | null = yearPersona
    ? buildIsraeliPLReport(yearPersona, calculatePL(yearPersona))
    : null;
  const taxYears = persona ? availableTaxYears(persona) : [];

  if (!persona || !report || activeYear === null) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-[700px] space-y-3 animate-pulse">
        <div className="h-8 rounded-lg bg-stone-200 w-1/2 mx-auto" />
        <div className="h-96 rounded-2xl bg-stone-200" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      {/* Top toolbar — hidden in print */}
      <header className="bg-white border-b border-stone-200 print:hidden">
        <div className="mx-auto flex max-w-screen-lg items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-sm text-stone-600 hover:text-brand-navy">&#x2190; חזרה לדשבורד</Link>
          <span className="font-bold text-brand-navy">דוח רווח והפסד · פורמט ישראלי תקני</span>
          <div className="flex items-center gap-3">
            {/* Tax-year selector — shown only when data spans more than one year */}
            {taxYears.length > 1 && (
              <div className="flex gap-1 items-center">
                <span className="text-xs text-stone-500 font-medium">שנת מס:</span>
                {taxYears.map((y) => (
                  <button
                    key={y}
                    onClick={() => setActiveYear(y)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      activeYear === y
                        ? "bg-brand-navy text-white"
                        : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => window.print()}
              className="rounded-full bg-brand-navy text-white px-4 py-2 text-sm font-medium hover:bg-brand-navy/90"
            >
              🖨 הדפס / שמור כ-PDF
            </button>
          </div>
        </div>
      </header>

      {/* The printable area */}
      <main className="mx-auto max-w-[820px] px-8 py-10 print:py-0 print:px-0">
        <article className="bg-white rounded-2xl border border-stone-200 p-10 print:rounded-none print:border-none print:shadow-none shadow-sm">
          {/* Title block */}
          <header className="text-center border-b-2 border-brand-navy pb-5 mb-6">
            <h1 className="font-display text-3xl font-bold text-brand-navy">דוח רווח והפסד</h1>
            <p className="text-sm text-stone-500 mt-1" dir="ltr">Profit and Loss Statement (Doch Revach VeHefsed)</p>
            <p className="text-sm font-medium text-stone-700 mt-3">{report.period.label}</p>
            <p className="text-xs text-stone-500" dir="ltr">For the year ended December 31, {report.period.year}</p>
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
          <section className="border border-stone-300">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-300">
                  <th className="text-right px-4 py-2 font-bold text-brand-navy">תיאור</th>
                  <th className="text-right px-4 py-2 font-bold text-brand-navy text-xs text-stone-500" dir="ltr">Description</th>
                  <th className="text-left px-4 py-2 font-bold text-brand-navy w-40">סכום (ש&quot;ח)</th>
                </tr>
              </thead>
              <tbody>
                {report.lines.map((line, idx) => {
                  const isSubtotal = line.isSubtotal;
                  return (
                    <tr
                      key={idx}
                      className={[
                        isSubtotal ? "bg-info/30 font-semibold border-t border-stone-300" : "",
                        idx % 2 === 1 && !isSubtotal ? "bg-stone-50/50" : "",
                      ].join(" ")}
                    >
                      <td className={`px-4 py-1.5 ${isSubtotal ? "text-brand-navy" : "text-stone-800"} ${!isSubtotal ? "pr-8" : ""}`}>{line.he}</td>
                      <td className={`px-4 py-1.5 text-xs ${isSubtotal ? "text-brand-navy/80" : "text-stone-500"} ${!isSubtotal ? "pr-8" : ""}`} dir="ltr">{line.en}</td>
                      <td className={`px-4 py-1.5 text-left ${isSubtotal ? "text-brand-navy" : "text-stone-700"}`} dir="ltr">
                        {formatNIS(line.amount, line.kind)}
                      </td>
                    </tr>
                  );
                })}
                {/* Final net-profit emphasis row */}
                <tr className="bg-brand-navy text-white border-t-2 border-brand-navy">
                  <td className="px-4 py-2.5 font-bold">רווח נקי לשנה</td>
                  <td className="px-4 py-2.5 font-bold text-xs" dir="ltr">Net Profit for the Year</td>
                  <td className="px-4 py-2.5 font-bold text-left" dir="ltr">
                    {formatNIS(report.totals.netProfit, report.totals.netProfit < 0 ? "outflow" : "inflow")}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Footnotes */}
          <footer className="mt-6 text-[11px] text-stone-500 space-y-1 leading-relaxed">
            <p>
              <strong className="text-stone-700">הערות:</strong> סכומים נוקבים בשקלים חדשים. סכומים שליליים בסוגריים.
              מס ההכנסה הוא הערכה לפי מדרגות {report.period.year}. ניכויים אישיים (ב&quot;ל, קרן השתלמות, פנסיה) מוצגים בנפרד כשהם זמינים; נקודות זיכוי אינן כלולות — לחישוב מדויק עיין/י ב-/file.
            </p>
            <p dir="ltr">
              <strong>Notes:</strong> Amounts in New Israeli Shekel (NIS). Negative amounts shown in parentheses.
              Income tax is an estimate per {report.period.year} brackets. Personal deductions (NI, study fund, pension) are shown separately when available; credit points are not included — refer to /file for the full calculation.
            </p>
            <p className="text-stone-400 mt-3 text-center">
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
      <span className="text-stone-500 text-xs whitespace-nowrap">{labelHe}</span>
      <span className="text-stone-300 text-[10px]" dir="ltr">/ {labelEn}:</span>
      <span className="font-medium text-stone-800">{valueHe}</span>
      {valueEn && valueEn !== valueHe && (
        <span className="text-stone-400 text-xs" dir="ltr">({valueEn})</span>
      )}
    </div>
  );
}
