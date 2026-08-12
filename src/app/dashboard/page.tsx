"use client";

/**
 * /dashboard — the light daily-life dashboard (CEO plan §3.2 + §5).
 *
 * One screen. Three numbers: הכנסות, הוצאות, יחס. Four action buttons:
 * חשבון עסקה, קבלה, הצעת מחיר, העלאת הוצאה. No tabs, no charts.
 * The empty state is THE most important screen of the beta — honest zeros,
 * a warm Eitan line, and an obvious first action.
 *
 * Everything is deterministic (lib/dashboard/summary + lib/receivables) —
 * zero LLM calls from this screen. The rich tax dashboard lives at
 * /dashboard/pro ("מצב מורחב").
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { persistPersona } from "@/lib/data/persona-store";
import { Persona, ExpenseLine } from "@/lib/persona";
import { allowedDocTypesFor } from "@/lib/invoice-generator";
import { computeMonthSummary, eitanMonthLine } from "@/lib/dashboard/summary";
import { getReceivablesSummary } from "@/lib/receivables/summary";
import { trackClient } from "@/lib/analytics/track-client";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Reveal, Stagger, StaggerItem } from "@/components/brand/motion";
import {
  WalletIcon,
  ReceiptIcon,
  FileTextIcon,
  PlusIcon,
  SparklesIcon,
  ArrowLeftIcon,
  TrendingUpIcon,
} from "@/components/brand/icons";

const MONTH_NAMES = [
  "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר",
];

export default function DashboardPage() {
  const { persona, setPersona } = useRequiredPersona();
  const [expenseOpen, setExpenseOpen] = useState(false);

  useEffect(() => {
    trackClient("dashboard_viewed");
  }, []);

  const summary = useMemo(
    () => (persona ? computeMonthSummary(persona) : null),
    [persona],
  );
  const receivables = useMemo(
    () => (persona ? getReceivablesSummary(persona) : null),
    [persona],
  );

  if (!persona || !summary || !receivables)
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-full max-w-md space-y-4 px-6 animate-pulse">
          <div className="h-8 w-40 rounded-lg bg-sand" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-sand" />
            ))}
          </div>
          <div className="h-40 rounded-2xl bg-sand" />
        </div>
      </div>
    );

  const monthName = MONTH_NAMES[new Date().getMonth()];
  const firstName = persona.personal.firstName?.trim();
  const canTaxInvoice = allowedDocTypesFor(persona.business.osekType).includes(
    "tax-invoice-receipt",
  );

  // The ratio, phrased so it feels informative — never alarming (CEO §3.2).
  const ratioLine =
    summary.ratio === null
      ? "עוד אין ממה לחשב יחס החודש"
      : `על כל 100 ₪ שנכנסו, יצאו ${Math.round(summary.ratio * 100)} ₪`;

  const actions = [
    {
      href: "/invoices/new?type=business-account",
      label: "חשבון עסקה",
      hint: "דרישת תשלום ללקוח",
      icon: <WalletIcon className="size-5" />,
      tone: "bg-teal-100 text-brand-deep",
    },
    {
      href: "/invoices/new?type=receipt",
      label: canTaxInvoice ? "קבלה / חשבונית" : "קבלה",
      hint: "התקבל תשלום? מתעדים",
      icon: <ReceiptIcon className="size-5" />,
      tone: "bg-success-light text-success",
      highlight: summary.isFirstUse,
    },
    {
      href: "/invoices/new?type=quote",
      label: "הצעת מחיר",
      hint: "הצעה ללקוח חדש",
      icon: <FileTextIcon className="size-5" />,
      tone: "bg-cream text-beige-600",
    },
    {
      onClick: () => setExpenseOpen(true),
      label: "העלאת הוצאה",
      hint: "קבלה מספק? שומרים",
      icon: <PlusIcon className="size-5" />,
      tone: "bg-overdue-bg/40 text-alert-ink",
    },
  ];

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size={26} />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/coach" className={btn("gold", "sm")}>
              <SparklesIcon className="size-4" /> שקל
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-md px-4 pb-16 pt-6 sm:px-6">
        <Reveal>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
            {firstName ? `שלום, ${firstName}` : "שלום"}
          </h1>
          <p className="mt-1 text-sm text-muted">{monthName} · {persona.business.tradeName}</p>
        </Reveal>

        {/* ── The three numbers ── */}
        <Stagger className="mt-6 grid grid-cols-3 gap-3">
          <StaggerItem>
            <div className="rounded-2xl border border-line bg-paper p-4 shadow-brand">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <span className="size-2 rounded-full bg-brand-deep" />
                הכנסות
              </div>
              <div className="mt-1.5 font-display text-xl font-extrabold tabular-nums text-brand-deep sm:text-2xl" dir="ltr">
                ₪{summary.revenue.toLocaleString("he-IL")}
              </div>
              <div className="mt-0.5 text-[11px] text-faint">החודש, לפני מע&quot;מ</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="rounded-2xl border border-line bg-paper p-4 shadow-brand">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <span className="size-2 rounded-full bg-brand" />
                הוצאות
              </div>
              <div className="mt-1.5 font-display text-xl font-extrabold tabular-nums text-ink sm:text-2xl" dir="ltr">
                ₪{summary.expenses.toLocaleString("he-IL")}
              </div>
              <div className="mt-0.5 text-[11px] text-faint">החודש</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="rounded-2xl border border-line bg-paper p-4 shadow-brand">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <span className="size-2 rounded-full bg-brand-navy" />
                היחס
              </div>
              <div className="mt-1.5 font-display text-xl font-extrabold tabular-nums text-brand-navy sm:text-2xl">
                {summary.ratio === null ? "—" : `${Math.round(summary.ratio * 100)}%`}
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-faint">{ratioLine}</div>
            </div>
          </StaggerItem>
        </Stagger>

        {/* ── Eitan line (deterministic — no LLM on this screen) ── */}
        <Reveal className="mt-4">
          <div className="flex items-start gap-3 rounded-2xl border border-line bg-aqua-soft p-4 shadow-brand">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-brand shadow-brand">
              <SparklesIcon className="size-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-brand-deep">
                שקל אומר
              </div>
              <p className="mt-0.5 text-sm leading-relaxed text-ink">
                {eitanMonthLine(summary, firstName)}
              </p>
            </div>
          </div>
        </Reveal>

        {/* ── מי לא שילם לי chip ── */}
        <Reveal className="mt-4">
          <Link
            href="/receivables"
            className="flex items-center justify-between rounded-2xl border border-line bg-paper p-4 shadow-brand transition-all hover:-translate-y-0.5 hover:border-brand-deep"
          >
            <div>
              <div className="text-sm font-bold text-brand-navy">מי לא שילם לי</div>
              <div className="mt-0.5 text-xs text-muted">
                {receivables.openCount === 0
                  ? "אין תשלומים פתוחים"
                  : `${receivables.openCount} חשבונות פתוחים` +
                    (receivables.overdueCount > 0
                      ? ` · ${receivables.overdueCount} באיחור`
                      : "")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`font-display text-lg font-extrabold tabular-nums ${
                  receivables.overdueTotal > 0 ? "text-alert-ink" : "text-brand-navy"
                }`}
                dir="ltr"
              >
                ₪{receivables.outstandingTotal.toLocaleString("he-IL")}
              </span>
              <ArrowLeftIcon className="size-4 text-brand-deep" />
            </div>
          </Link>
        </Reveal>

        {/* ── The four actions ── */}
        <h2 className="mt-7 mb-3 text-sm font-bold text-brand-navy">מה עושים עכשיו?</h2>
        <Stagger className="grid grid-cols-2 gap-3">
          {actions.map((a) => (
            <StaggerItem key={a.label}>
              {a.href ? (
                <Link
                  href={a.href}
                  className={`group flex min-h-[104px] flex-col justify-between rounded-2xl border bg-paper p-4 shadow-brand transition-all hover:-translate-y-0.5 hover:border-brand-deep ${
                    a.highlight ? "border-brand ring-2 ring-brand/30" : "border-line"
                  }`}
                >
                  <span className={`grid size-10 place-items-center rounded-xl ${a.tone}`}>
                    {a.icon}
                  </span>
                  <span className="mt-2">
                    <span className="block text-sm font-bold text-brand-navy">{a.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{a.hint}</span>
                  </span>
                </Link>
              ) : (
                <button
                  onClick={a.onClick}
                  className="group flex min-h-[104px] w-full flex-col justify-between rounded-2xl border border-line bg-paper p-4 text-start shadow-brand transition-all hover:-translate-y-0.5 hover:border-brand-deep"
                >
                  <span className={`grid size-10 place-items-center rounded-xl ${a.tone}`}>
                    {a.icon}
                  </span>
                  <span className="mt-2">
                    <span className="block text-sm font-bold text-brand-navy">{a.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{a.hint}</span>
                  </span>
                </button>
              )}
            </StaggerItem>
          ))}
        </Stagger>

        {/* ── First-use welcome (the most important screen of the beta) ── */}
        {summary.isFirstUse && (
          <Reveal className="mt-6">
            <div className="rounded-2xl border-2 border-dashed border-brand/60 bg-paper p-5 text-center shadow-brand">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-aqua-soft">
                <TrendingUpIcon className="size-6 text-brand-deep" />
              </div>
              <p className="text-sm font-bold text-brand-navy">
                המספרים למעלה אמיתיים — פשוט עוד לא קרה כלום
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted">
                ברגע שתפיקו קבלה ראשונה או תתעדו הוצאה, הכול מתחיל לזוז.
                שתי דקות, מבטיחים.
              </p>
            </div>
          </Reveal>
        )}
      </main>

      {expenseOpen && (
        <ExpenseSheet
          persona={persona}
          onClose={() => setExpenseOpen(false)}
          onSaved={(p) => {
            setPersona(p);
            setExpenseOpen(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * Minimal expense capture (DSH-9): vendor, amount, date, note. Appends an
 * ExpenseLine to persona.income.expenses (localStorage + DB write-through).
 * Category refinement comes with Tomi's occupation lists (CEO §3.5 phase 2).
 */
function ExpenseSheet({
  persona,
  onClose,
  onSaved,
}: {
  persona: Persona;
  onClose: () => void;
  onSaved: (p: Persona) => void;
}) {
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function save() {
    const amt = Number(amount);
    if (!vendor.trim()) return setError("ממי ההוצאה? שם ספק חסר");
    if (!amt || amt <= 0) return setError("סכום חייב להיות גדול מ-0");
    if (!date) return setError("תאריך חסר");

    const line: ExpenseLine = {
      date,
      vendorName: vendor.trim(),
      description: note.trim() || vendor.trim(),
      amount: amt,
      category: "כללי",
      deductionRule: "full",
    };
    const updated: Persona = {
      ...persona,
      income: {
        ...persona.income,
        expenses: [...(persona.income.expenses ?? []), line],
      },
    };
    persistPersona(updated);
    onSaved(updated);
  }

  const field =
    "w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-faint focus:border-brand-deep focus:outline-none";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-navy/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border border-line bg-cream p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-brand sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />
        <h3 className="font-display text-lg font-bold text-brand-navy">העלאת הוצאה</h3>
        <p className="mt-0.5 text-xs text-muted">
          תיעוד מהיר — קטגוריות מפורטות מגיעות בקרוב.
        </p>
        <div className="mt-4 space-y-3">
          <input
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="שם הספק / בית העסק"
            className={field}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="סכום ₪"
              type="number"
              min={0}
              dir="ltr"
              className={field}
            />
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              type="date"
              dir="ltr"
              className={field}
            />
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="מה קניתם? (לא חובה)"
            className={field}
          />
          {error && <p className="text-sm text-alert">{error}</p>}
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={save} className={btn("primary", "md", "flex-1")}>
            שמירת הוצאה
          </button>
          <button onClick={onClose} className={btn("ghost", "md")}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
