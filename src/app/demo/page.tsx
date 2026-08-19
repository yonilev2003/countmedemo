"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import type { Persona } from "@/lib/persona";
import { FormPreview } from "@/components/form-1301/form-preview";
import { getFormSchema } from "@/lib/form-1301/get-form-schema";
import { ChatPanel } from "@/components/agent/chat-panel";
import { estimateTaxLiability, TaxEstimate } from "@/lib/calculators";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { LegalNote, LEGAL_NOTE_ESTIMATE } from "@/components/brand/legal-note";
import { TaxEstimateBreakdown } from "@/components/tax-estimate/breakdown";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  SparklesIcon,
  ReceiptIcon,
  AlertTriangleIcon,
  XIcon,
} from "@/components/brand/icons";

type Phase = "form" | "estimate";

export default function DemoPage() {
  // Setup is mandatory — no anonymous demo viewing. useRequiredPersona()
  // checks the DB before redirecting, so a second device with an empty local
  // cache doesn't get bounced into the wizard while it has real server data.
  const { persona } = useRequiredPersona();
  const [phase, setPhase] = useState<Phase>("form");
  // Mobile-only (< lg): the chat panel lives as a bottom-sheet overlay,
  // closed by default so the form is the default scroll content. Ignored
  // at >= lg, where the chat is always visible in the sticky side column.
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Escape closes the mobile chat sheet (a11y: keyboard-only dismissal,
  // matching the click-outside/close-button affordances).
  useEffect(() => {
    if (!isChatOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsChatOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isChatOpen]);

  if (!persona) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-sm text-muted">טוען...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Brand header */}
      <header className="bg-paper border-b border-line">
        {/* flex-wrap on both rows: the actions row alone is ~630px of
            buttons — on a 390px phone an unwrappable row forced 430px of
            horizontal page scroll (caught by the five-osakim journey e2e). */}
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center">
              <Logo size={32} />
            </Link>
            <div className="border-s border-line ps-3 text-[11px] leading-tight text-muted">
              המלווה לדו״ח שלך · גרסת דמו
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {phase === "estimate" && (
              <button
                onClick={() => setPhase("form")}
                className={btn("ghost", "sm")}
              >
                ← חזור לדו״ח
              </button>
            )}
            <div className="rounded-full bg-cream px-3 py-1 text-xs text-muted">
              משתמש: {persona.displayName}
            </div>
            <Link href="/business-expenses" className={btn("ghost", "sm")}>
              <ReceiptIcon className="size-4" />
              הוצאות לעסק שלך
            </Link>
            <Link href="/setup" className={btn("secondary", "sm")}>
              ← עדכן נתונים
            </Link>
            <a
              href="https://www.gov.il/he/service/reporting-and-payment-2024-annual-tax-report-for-individuals"
              target="_blank"
              rel="noopener noreferrer"
              className={btn("primary", "sm")}
            >
              פתח טופס 1301 ב-gov.il →
            </a>
            <div className="border-s border-line ps-2">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Legal note — the ONE banner on this page (WS8 audit H1: one per page, max) */}
      <div className="mx-auto max-w-screen-2xl px-6 pt-4">
        <LegalNote variant="full" />
      </div>

      {/* Main content — split: right = main area, left = chat */}
      <main className="mx-auto max-w-screen-2xl px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Main area — form preview OR tax estimate summary */}
          <section className="col-span-12 lg:col-span-8">
            {phase === "form" ? (
              <div className="rounded-2xl border-2 border-dashed border-brand bg-beige-100/30 p-5">
                <div className="mb-3 flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2 text-muted">
                    <span className="inline-flex items-center gap-1 font-bold text-brand-deep">
                      <SparklesIcon className="size-4" /> countme
                    </span>
                    <span>·</span>
                    <span>כל ערך מחושב הוא לחיץ — לחץ לראות את הנוסחה והמקורות</span>
                  </div>
                  <button
                    onClick={() => setPhase("estimate")}
                    className={btn("primary", "sm")}
                  >
                    ראה הערכת מס שנתית →
                  </button>
                </div>
                <FormPreview
                  persona={persona}
                  schema={getFormSchema("1301", persona.income.year)}
                  onContinue={() => setPhase("estimate")}
                />
              </div>
            ) : (
              <TaxEstimateGate persona={persona} onContinue={() => setPhase("form")} />
            )}
          </section>

          {/* Chat panel — single ChatPanel instance, repositioned (not
              remounted) via responsive CSS: a mobile bottom-sheet overlay
              below lg, the original sticky side column at lg and up. Keeping
              one mount means conversation state never forks between the two
              layouts. */}
          <aside className="col-span-12 lg:col-span-4">
            {/* NOTE: plain template literal, deliberately NOT run through
                cn()/twMerge — twMerge dedupes same-property utilities (e.g.
                "h-[75vh] h-[75dvh]") and keeps only the last one, which
                would silently delete the vh fallback line before the
                browser ever sees it. The vh→dvh fallback only works if
                both declarations reach the stylesheet, so this class list
                is built the same way the rest of this file writes
                base+lg: pairs: as a literal string. */}
            <div
              className={`fixed inset-x-0 bottom-0 z-40 flex h-[75vh] h-[75dvh] flex-col rounded-t-3xl shadow-brand transition-transform duration-300 ease-out ${isChatOpen ? "translate-y-0" : "translate-y-full"} lg:sticky lg:inset-x-auto lg:bottom-auto lg:top-6 lg:z-auto lg:h-[calc(100vh-7rem)] lg:h-[calc(100dvh-7rem)] lg:translate-y-0 lg:rounded-none lg:shadow-none lg:transition-none`}
            >
              {/* Mobile-only sheet chrome: drag handle + close affordance */}
              <div className="relative flex flex-shrink-0 items-center justify-center rounded-t-3xl border-b border-line bg-paper px-4 py-2 lg:hidden">
                <span aria-hidden="true" className="h-1 w-10 rounded-full bg-line" />
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  aria-label="סגור צ׳אט"
                  className="absolute end-3 top-1.5 flex size-7 items-center justify-center rounded-full text-muted hover:bg-cream"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <ChatPanel persona={persona} />
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile floating toggle — opens the chat as a bottom sheet. Hidden
          at >= lg (chat is already visible there) and while the sheet is
          already open. */}
      {!isChatOpen && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center lg:hidden">
          <button type="button" onClick={() => setIsChatOpen(true)} className={btn("primary", "md")}>
            <SparklesIcon className="size-4" />
            שאל את countme
          </button>
        </div>
      )}

      {/* Mobile backdrop behind the open chat sheet — click to dismiss.
          Decorative only (aria-hidden): keyboard/AT users get the close
          button + Escape instead. */}
      {isChatOpen && (
        <div
          aria-hidden="true"
          onClick={() => setIsChatOpen(false)}
          className="fixed inset-0 z-30 bg-brand-navy/40 lg:hidden"
        />
      )}

      <footer className="mx-auto max-w-screen-2xl px-6 pb-8 pt-2 text-center text-[10px] leading-relaxed text-faint space-y-1">
        <p>countme · גרסת דמו · שנת מס {persona.income.year}</p>
        <LegalNote variant="line" />
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
    <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-brand">
      {/* Summary header */}
      <div className="bg-brand-navy px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-aqua">
              סיכום שנתי — מה זה אומר על המס שלך
            </div>
            <h2 className="font-display text-lg font-extrabold text-white">
              הערכת מס שנתית · {persona.income.year}
            </h2>
            <p className="mt-1 text-[12px] text-aqua">{LEGAL_NOTE_ESTIMATE}</p>
          </div>
          <div className={cn(
            "rounded-xl border-2 px-5 py-3 text-center",
            isRefund
              ? "border-success bg-success-light text-success"
              : "border-alert bg-overdue-bg text-alert",
          )}>
            <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider">
              {isRefund ? "החזר צפוי" : "חיוב נוסף צפוי"}
            </div>
            <div className="text-2xl font-extrabold tabular-nums">
              {formatCurrency(Math.abs(est.balance))}
            </div>
            {est.mikdamot > 0 && (
              <div className="mt-1 text-[10px] opacity-70">
                לאחר מקדמות {formatCurrency(est.mikdamot)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Osek Zeir banner */}
      {isOsekZeir && (
        <div className="border-y border-line bg-info px-6 py-2.5 text-[12px] text-brand-navy">
          <span className="font-bold">מסלול עוסק זעיר:</span>{" "}
          חישוב פושט — 70% מהמחזור נחשב כהכנסה חייבת (30% הוצאות אוטומטיות, כולל ב״ל).
        </div>
      )}

      {/* Breakdown — extracted to TaxEstimateBreakdown (FP-19) so the same
          walk-through can be mounted on /dashboard/pro. Computes its own
          estimate from `persona`; renders identically to the inline markup
          it replaced, except the old "זיכוי ביטוח לאומי — 48%" row (always
          0 — no such credit exists) is now a one-line footnote instead. */}
      <TaxEstimateBreakdown persona={persona} />

      {/* Important notes */}
      <div className="mx-6 mb-5 space-y-1.5 rounded-xl border border-line bg-due-bg px-4 py-3 text-[11px] leading-relaxed text-ink">
        <p className="flex items-center gap-1.5 text-[12px] font-bold">
          <AlertTriangleIcon className="size-4 text-due" /> הערות חשובות לפני המשך
        </p>
        <p>
          ההערכה מבוססת על הנתונים שהזנת בלבד. <strong>הסכום הסופי עשוי להשתנות</strong> בשל הפרשי
          הצמדה וריבית על מקדמות, הכנסות שלא הוזנו, זיכויים מיוחדים, שינויי מצב משפחתי, או מס שבח.
        </p>
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between border-t border-line bg-paper px-6 py-4">
        <p className="text-[11px] text-muted">
          רוצה לעדכן ערך? חזור/י לדו״ח, או עדכן/י את הנתונים בטופס ההגדרה
        </p>
        <button onClick={onContinue} className={btn("primary", "md")}>
          ← חזור לדו״ח
        </button>
      </div>
    </div>
  );
}
