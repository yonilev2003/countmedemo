"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { defaultPersona, Persona } from "@/lib/persona";
import { loadPersona } from "@/lib/setup-storage";
import { FormPreview } from "@/components/form-1301/form-preview";
import { ChatPanel } from "@/components/agent/chat-panel";
import { estimateTaxLiability, TaxEstimate } from "@/lib/calculators";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Phase = "form" | "estimate";

export default function DemoPage() {
  const [persona, setPersona] = useState<Persona>(defaultPersona);
  const [phase, setPhase] = useState<Phase>("form");

  useEffect(() => {
    const saved = loadPersona();
    if (saved) setPersona(saved);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Brand header */}
      <header className="bg-white border-b border-stone-200">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-bold text-white shadow-sm"
            >
              c
            </Link>
            <div>
              <div className="text-base font-bold leading-tight">countme</div>
              <div className="text-[11px] text-stone-500 leading-tight">
                המלווה לדו״ח שלך · גרסת דמו
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {phase === "estimate" && (
              <button
                onClick={() => setPhase("form")}
                className="rounded-full border border-blue-300 px-3 py-1 text-xs text-blue-700 hover:bg-blue-50 transition-colors"
              >
                ← חזור לדו״ח
              </button>
            )}
            <div className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
              משתמש: {persona.displayName}
            </div>
            <Link
              href="/setup"
              className="rounded-full border border-blue-300 px-3 py-1 text-xs text-blue-700 hover:bg-blue-50 transition-colors"
            >
              ← עדכן נתונים
            </Link>
            <a
              href="https://www.gov.il/he/service/reporting-and-payment-2024-annual-tax-report-for-individuals"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-700 hover:bg-stone-100"
            >
              פתח טופס 1301 ב-gov.il →
            </a>
          </div>
        </div>
      </header>

      {/* Legal disclaimer banner */}
      <div className="mx-auto max-w-screen-2xl px-6 pt-4">
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-5 py-3 text-[11px] text-stone-500 leading-relaxed">
          <span className="font-semibold text-stone-600">⚠ הצהרת אחריות: </span>
          המידע המוצג מבוסס על נתונים שהוזנו ידנית ועל מקורות ציבוריים ברשת — הוא אינו מהווה
          ייעוץ מס, ייעוץ משפטי, או ייעוץ פיננסי מקצועי.{" "}
          <strong>האחריות על נכונות כל הפרטים המוגשים לרשות המסים חלה על הממלא/ת בלבד.</strong>{" "}
          לפני הגשת הדוח, מומלץ להתייעץ עם רואה חשבון מוסמך.
        </div>
      </div>

      {/* Main content — split: right = main area, left = chat */}
      <main className="mx-auto max-w-screen-2xl px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Main area — form preview OR tax estimate summary */}
          <section className="col-span-12 lg:col-span-8">
            {phase === "form" ? (
              <div className="rounded-2xl border-2 border-yellow-300 bg-yellow-50 p-5">
                <div className="mb-3 flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2 text-amber-700">
                    <span className="font-bold">✦ countme</span>
                    <span>·</span>
                    <span>כל ערך מחושב הוא לחיץ — לחץ לראות פירוט, מקורות וביטחון החישוב</span>
                  </div>
                  <button
                    onClick={() => setPhase("estimate")}
                    className="rounded-full bg-[#1a3f6a] hover:bg-[#1e4d8c] text-white font-bold px-4 py-1.5 text-xs transition-colors shadow-sm whitespace-nowrap"
                  >
                    ראה הערכת מס שנתית →
                  </button>
                </div>
                <FormPreview persona={persona} />
              </div>
            ) : (
              <TaxEstimateGate persona={persona} onContinue={() => setPhase("form")} />
            )}
          </section>

          {/* Chat panel — always visible */}
          <aside className="col-span-12 lg:col-span-4">
            <div className="sticky top-6 h-[calc(100vh-7rem)]">
              <ChatPanel persona={persona} />
            </div>
          </aside>
        </div>
      </main>

      <footer className="mx-auto max-w-screen-2xl px-6 pb-8 pt-2 text-center text-[10px] text-stone-400 leading-relaxed space-y-1">
        <p>countme · גרסת דמו · שנת מס {persona.income.year}</p>
        <p>
          המידע אינו מהווה ייעוץ מס או ייעוץ משפטי. countme מבוסס על מידע זמין לציבור
          ואינו אחראי לטעויות, שינויי חקיקה, או אי-דיוקים בנתונים. הגשת הדוח ומילוי הפרטים
          הנכונים הינה באחריות הממלא/ת בלבד.
        </p>
      </footer>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Tax Estimate Gate — shown before the form.
   User must click "אישור והמשך לטופס" to proceed.
   Pure math — no API calls.
   ────────────────────────────────────────────────────────── */
function TaxEstimateGate({
  persona,
  onContinue,
}: {
  persona: Persona;
  onContinue: () => void;
}) {
  const est = estimateTaxLiability(persona);
  const isRefund = est.balance < 0;
  const isOsekZeir = persona.business.isOsekZeir;

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 shadow-sm overflow-hidden">
      {/* Summary header */}
      <div className="bg-amber-400 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-0.5">
              סיכום שנתי — מה זה אומר על המס שלך
            </div>
            <h2 className="text-lg font-extrabold text-amber-950">
              הערכת מס שנתית · {persona.income.year}
            </h2>
            <p className="text-[12px] text-amber-800 mt-1">
              לפי הנתונים והערכים בדו״ח — ההערכה אינה מחייבת ואינה מהווה ייעוץ מס
            </p>
          </div>
          <div className={cn(
            "rounded-xl px-5 py-3 text-center border-2",
            isRefund
              ? "bg-emerald-100 border-emerald-400 text-emerald-800"
              : "bg-red-100 border-red-400 text-red-800",
          )}>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5">
              {isRefund ? "החזר צפוי" : "חיוב נוסף צפוי"}
            </div>
            <div className="text-2xl font-extrabold tabular-nums">
              {formatCurrency(Math.abs(est.balance))}
            </div>
            {est.mikdamot > 0 && (
              <div className="text-[10px] mt-1 opacity-70">
                לאחר מקדמות {formatCurrency(est.mikdamot)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Osek Zeir banner */}
      {isOsekZeir && (
        <div className="border-y border-blue-200 bg-blue-50 px-6 py-2.5 text-[12px] text-blue-900">
          <span className="font-bold">מסלול עוסק זעיר:</span>{" "}
          חישוב פושט — 70% מהמחזור נחשב כהכנסה חייבת (30% הוצאות אוטומטיות, כולל ב״ל).
        </div>
      )}

      {/* Breakdown */}
      <div className="px-6 py-5 space-y-1 text-[13px]">
        <EstimateRow
          label={isOsekZeir ? "הכנסה חייבת — 70% ממחזור (שדה 150)" : "הכנסה מעסק (שדה 150)"}
          value={est.businessIncome}
        />
        <EstimateRow label="ניכוי קרן השתלמות (שדה 137)" value={est.kerenDeduction} deduct />
        {!isOsekZeir && (
          <EstimateRow label="ניכוי ביטוח לאומי — 52% (שדה 030)" value={est.blDeduction} deduct />
        )}
        <EstimateRow label="ניכוי פנסיה (סעיף 47)" value={est.pensionDeduction} deduct />
        <div className="border-t border-amber-300 pt-2 mt-2">
          <EstimateRow label="הכנסה חייבת (בקירוב)" value={est.taxableIncome} bold />
        </div>
        <EstimateRow label="מס גולמי (לפי מדרגות 2024)" value={est.grossTax} />
        <EstimateRow label="זיכוי נקודות (×2,904 ₪)" value={est.creditPointsValue} deduct />
        <EstimateRow label="זיכוי ביטוח לאומי — 48% (שדה 048)" value={est.blCredit} deduct />

        {est.excessCredits > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] text-blue-800 flex justify-between">
            <span>עודף זיכויים שלא נוצל (לא ניתן להחזר)</span>
            <span className="font-mono font-bold text-blue-700">
              {formatCurrency(est.excessCredits)}
            </span>
          </div>
        )}

        <div className="border-t-2 border-amber-400 pt-2 mt-2">
          <EstimateRow label="מס אחרי זיכויים" value={est.taxAfterCredits} bold />
        </div>
        {est.mikdamot > 0 && (
          <EstimateRow label="מקדמות ששולמו השנה" value={est.mikdamot} deduct />
        )}
        <div className="border-t-2 border-amber-500 pt-2 mt-2">
          <div className="flex justify-between font-extrabold text-[15px]">
            <span className={isRefund ? "text-emerald-700" : "text-red-700"}>
              {isRefund ? "החזר מס צפוי" : "חיוב נוסף צפוי"}
            </span>
            <span className={isRefund ? "text-emerald-700" : "text-red-700"}>
              {formatCurrency(Math.abs(est.balance))}
            </span>
          </div>
        </div>
      </div>

      {/* Important notes */}
      <div className="mx-6 mb-5 rounded-xl border border-amber-300 bg-amber-100 px-4 py-3 text-[11px] text-amber-900 leading-relaxed space-y-1.5">
        <p className="font-bold text-[12px]">⚠ הערות חשובות לפני המשך</p>
        <p>
          ההערכה מבוססת על הנתונים שהזנת בלבד. <strong>הסכום הסופי עשוי להשתנות</strong> בשל הפרשי
          הצמדה וריבית על מקדמות, הכנסות שלא הוזנו, זיכויים מיוחדים, שינויי מצב משפחתי, או מס שבח.
        </p>
        <p>
          ערכים אלה <strong>אינם מחייבים ואינם מהווים ייעוץ מס</strong>. לפני הגשה — התייעץ עם רואה חשבון.
        </p>
      </div>

      {/* CTA */}
      <div className="border-t-2 border-amber-300 bg-white px-6 py-4 flex items-center justify-between">
        <p className="text-[11px] text-stone-500">
          רוצה לעדכן ערך? חזור/י לדו״ח, או עדכן/י את הנתונים בטופס ההגדרה
        </p>
        <button
          onClick={onContinue}
          className="rounded-xl bg-[#1a3f6a] hover:bg-[#1e4d8c] text-white font-bold px-6 py-3 text-sm transition-colors shadow-md"
        >
          ← חזור לדו״ח
        </button>
      </div>
    </div>
  );
}

function EstimateRow({
  label,
  value,
  deduct = false,
  bold = false,
}: {
  label: string;
  value: number;
  deduct?: boolean;
  bold?: boolean;
}) {
  return (
    <div className={cn("flex justify-between text-amber-900", bold && "font-semibold")}>
      <span>{deduct ? `− ${label}` : label}</span>
      <span className="font-mono tabular-nums">
        {deduct ? `(${formatCurrency(value)})` : formatCurrency(value)}
      </span>
    </div>
  );
}
