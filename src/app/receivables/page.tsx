"use client";

/**
 * /receivables — "מי לא שילם לי" (CEO plan §3.6).
 *
 * Open business-accounts (payment demands) + open quotes, the total amount
 * "outside", aging, one-tap graded reminders (wa.me / mailto — no WhatsApp API
 * in beta), and mark-as-paid that offers a prefilled receipt.
 * All statuses are DERIVED at render (lib/receivables/summary) — no cron.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { persistPersona } from "@/lib/data/persona-store";
import { Persona, InvoiceLine } from "@/lib/persona";
import { formatHebrewDate } from "@/lib/invoice-generator/index";
import {
  effectiveStatus,
  getReceivablesSummary,
  isOpenReceivable,
  buildReminder,
  ReminderTone,
} from "@/lib/receivables/summary";
import { trackClient } from "@/lib/analytics/track-client";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { StatusBadge } from "@/components/brand/status";
import { EitanFab } from "@/components/agent/eitan-fab";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  WalletIcon,
} from "@/components/brand/icons";

const TONE_LABELS: Record<ReminderTone, string> = {
  gentle: "עדין",
  matter: "ענייני",
  assertive: "אסרטיבי",
};

export default function ReceivablesPage() {
  const { persona, setPersona } = useRequiredPersona();
  const [reminderFor, setReminderFor] = useState<string | null>(null);
  const [tone, setTone] = useState<ReminderTone>("gentle");
  /** The doc just marked paid — drives the "הפק/י קבלה" follow-up banner. */
  const [justPaid, setJustPaid] = useState<InvoiceLine | null>(null);

  useEffect(() => {
    trackClient("receivables_viewed");
  }, []);

  const summary = useMemo(
    () => (persona ? getReceivablesSummary(persona) : null),
    [persona],
  );

  const openAccounts = useMemo(
    () =>
      (persona?.income.invoices ?? [])
        .filter((i) => isOpenReceivable(i))
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [persona],
  );

  const openQuotes = useMemo(
    () =>
      (persona?.income.invoices ?? []).filter(
        (i) => i.docType === "quote" && effectiveStatus(i) === "sent",
      ),
    [persona],
  );

  function markPaid(invoiceNumber: string) {
    if (!persona) return;
    const today = new Date().toISOString().split("T")[0];
    const paidDoc =
      (persona.income.invoices ?? []).find((i) => i.invoiceNumber === invoiceNumber) ??
      null;
    const updated: Persona = {
      ...persona,
      income: {
        ...persona.income,
        invoices: (persona.income.invoices ?? []).map((i) =>
          i.invoiceNumber === invoiceNumber
            ? { ...i, status: "paid" as const, paidDate: today }
            : i,
        ),
      },
    };
    persistPersona(updated);
    setPersona(updated);
    // Flipping the status is NOT enough — the payment only becomes recorded
    // income when a receipt is issued, so hand the user a prefilled one
    // (journey-scan round 2: paid ₪5,900 vanished from receivables but never
    // reached הכנסות השנה; this page's own promise is "מפיקים קבלה והכסף נספר").
    setJustPaid(paidDoc);
    trackClient("doc_marked_paid", { invoiceNumber });
  }

  function logReminder(inv: InvoiceLine, sentTone: ReminderTone) {
    if (!persona) return;
    const today = new Date().toISOString().split("T")[0];
    const updated: Persona = {
      ...persona,
      income: {
        ...persona.income,
        invoices: (persona.income.invoices ?? []).map((i) =>
          i.invoiceNumber === inv.invoiceNumber
            ? {
                ...i,
                remindersSent: [
                  ...(i.remindersSent ?? []),
                  { date: today, tone: sentTone },
                ],
              }
            : i,
        ),
      },
    };
    persistPersona(updated);
    setPersona(updated);
    trackClient("reminder_sent", { invoiceNumber: inv.invoiceNumber, tone: sentTone });
  }

  if (!persona || !summary)
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="space-y-3 w-96 animate-pulse">
          <div className="h-6 rounded-lg bg-sand w-1/2 mx-auto" />
          <div className="h-64 rounded-2xl bg-sand" />
        </div>
      </div>
    );

  const businessName = persona.business.tradeName || "העסק שלי";

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size={24} />
            <span className="hidden text-base font-semibold text-muted sm:inline">
              · מי לא שילם לי
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/invoices" className={btn("secondary", "sm")}>
              כל המסמכים
            </Link>
            <Link href="/invoices/new?type=business-account" className={btn("primary", "sm")}>
              חשבון עסקה חדש
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-display text-[26px] font-extrabold tracking-tight text-brand-navy sm:text-[32px]">
          מי לא שילם לי
        </h1>
        <p className="mt-1.5 text-sm text-muted sm:text-[15px]">
          חשבונות עסקה פתוחים, הצעות מחיר ממתינות — וכמה כסף בחוץ.
        </p>

        {/* Post-payment follow-up: the money is only COUNTED once a receipt
            exists, so the very next step is handed over prefilled. */}
        {justPaid && (
          <div
            role="status"
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-success/40 bg-success-light/40 p-4 shadow-brand"
          >
            <div className="min-w-0">
              <div className="text-sm font-bold text-brand-navy">
                {justPaid.invoiceNumber} סומן כשולם — נשאר רק להפיק קבלה
              </div>
              <div className="mt-0.5 text-xs text-muted">
                התשלום נספר כהכנסה רק כשמופקת עליו קבלה. הכנו אותה מראש עם
                הפרטים של {justPaid.customerName}.
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/invoices/new?type=${
                  persona.business.osekType === "morshe"
                    ? "tax-invoice-receipt"
                    : "receipt"
                }&from=${encodeURIComponent(justPaid.invoiceNumber)}`}
                className={btn("primary", "sm")}
              >
                להפקת הקבלה
              </Link>
              <button
                onClick={() => setJustPaid(null)}
                className={btn("ghost", "sm")}
              >
                אחר כך
              </button>
            </div>
          </div>
        )}

        {/* Summary tiles */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-2xl border border-line bg-paper p-4 shadow-brand">
            <div className="text-xs font-semibold text-muted">כסף בחוץ</div>
            <div className="mt-1 font-display text-2xl font-extrabold tabular-nums text-brand-navy" dir="ltr">
              ₪{summary.outstandingTotal.toLocaleString("he-IL")}
            </div>
            <div className="mt-0.5 text-xs text-faint">
              {summary.openCount === 0
                ? "אין חשבונות פתוחים"
                : `${summary.openCount} חשבונות פתוחים`}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-4 shadow-brand">
            <div className="text-xs font-semibold text-muted">מזה באיחור</div>
            <div
              className={`mt-1 font-display text-2xl font-extrabold tabular-nums ${summary.overdueTotal > 0 ? "text-alert-ink" : "text-brand-navy"}`}
              dir="ltr"
            >
              ₪{summary.overdueTotal.toLocaleString("he-IL")}
            </div>
            <div className="mt-0.5 text-xs text-faint">
              {summary.overdueCount === 0 ? "כלום, נהדר" : `${summary.overdueCount} באיחור`}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-4 shadow-brand">
            <div className="text-xs font-semibold text-muted">הצעות ממתינות</div>
            <div className="mt-1 font-display text-2xl font-extrabold tabular-nums text-brand-navy" dir="ltr">
              ₪{summary.openQuotesTotal.toLocaleString("he-IL")}
            </div>
            <div className="mt-0.5 text-xs text-faint">{summary.openQuotesCount} הצעות מחיר</div>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-4 shadow-brand">
            <div className="text-xs font-semibold text-muted">התיישנות החוב</div>
            <div className="mt-1 space-y-0.5 text-xs text-muted tabular-nums">
              <div>עד 30 יום: ₪{summary.aging.current.toLocaleString("he-IL")}</div>
              <div>30–60: ₪{summary.aging.over30.toLocaleString("he-IL")}</div>
              <div className={summary.aging.over60 > 0 ? "text-alert-ink font-semibold" : ""}>
                מעל 60: ₪{summary.aging.over60.toLocaleString("he-IL")}
              </div>
            </div>
          </div>
        </div>

        {/* Open business accounts */}
        <h2 className="mt-9 mb-3 font-display text-lg font-bold text-brand-navy">
          חשבונות עסקה פתוחים
        </h2>
        {openAccounts.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-line bg-paper py-12 text-center shadow-brand">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-success-light">
              <CheckCircleIcon className="size-6 text-success" />
            </div>
            <p className="text-sm text-muted">
              אין חשבונות פתוחים — כל מה שנדרש שולם.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {openAccounts.map((inv) => {
              const st = effectiveStatus(inv);
              const reminderText = buildReminder(inv, tone, businessName);
              const encoded = encodeURIComponent(reminderText);
              const isReminderOpen = reminderFor === inv.invoiceNumber;
              return (
                <div
                  key={inv.invoiceNumber}
                  className="rounded-2xl border border-line bg-paper p-4 shadow-brand sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-brand-navy">{inv.customerName}</span>
                        <StatusBadge
                          status={st === "overdue" ? "overdue" : "due"}
                          showDot={false}
                        >
                          {st === "overdue" ? "באיחור" : "ממתין לתשלום"}
                        </StatusBadge>
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {inv.invoiceNumber} · הופק {formatHebrewDate(inv.date)}
                        {inv.dueDate ? ` · לתשלום עד ${formatHebrewDate(inv.dueDate)}` : ""}
                        {(inv.remindersSent?.length ?? 0) > 0
                          ? ` · נשלחו ${inv.remindersSent!.length} תזכורות`
                          : ""}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="font-display text-xl font-extrabold tabular-nums text-brand-navy" dir="ltr">
                        ₪{inv.total.toLocaleString("he-IL")}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setReminderFor(isReminderOpen ? null : inv.invoiceNumber)}
                      className={btn("secondary", "sm")}
                    >
                      שליחת תזכורת
                    </button>
                    <button onClick={() => markPaid(inv.invoiceNumber)} className={btn("ghost", "sm")}>
                      <CheckCircleIcon className="size-4" />
                      סמן כשולם
                    </button>
                    <Link
                      href={`/invoices/${inv.invoiceNumber}`}
                      className="ms-auto inline-flex items-center gap-1 text-xs font-bold text-brand-deep hover:text-teal-600"
                    >
                      צפייה במסמך
                      <ArrowLeftIcon className="size-3.5" />
                    </Link>
                  </div>

                  {isReminderOpen && (
                    <div className="mt-4 rounded-xl border border-line bg-cream p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted">סגנון:</span>
                        {(Object.keys(TONE_LABELS) as ReminderTone[]).map((t) => (
                          <button
                            key={t}
                            onClick={() => setTone(t)}
                            className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                              tone === t
                                ? "bg-brand-navy text-white"
                                : "bg-paper border border-line text-ink hover:border-brand-deep"
                            }`}
                          >
                            {TONE_LABELS[t]}
                          </button>
                        ))}
                      </div>
                      {/* DRAFT — reminder copy pending Tomi (TOMI-1) */}
                      <p className="whitespace-pre-wrap rounded-lg border border-line bg-paper p-3 text-sm leading-relaxed text-ink">
                        {reminderText}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={`https://wa.me/?text=${encoded}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => logReminder(inv, tone)}
                          className={btn("primary", "sm")}
                        >
                          שליחה בוואטסאפ
                        </a>
                        <a
                          href={`mailto:?subject=${encodeURIComponent(
                            `תזכורת תשלום — ${inv.invoiceNumber}`,
                          )}&body=${encoded}`}
                          onClick={() => logReminder(inv, tone)}
                          className={btn("secondary", "sm")}
                        >
                          שליחה במייל
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Open quotes */}
        {openQuotes.length > 0 && (
          <>
            <h2 className="mt-9 mb-3 font-display text-lg font-bold text-brand-navy">
              הצעות מחיר ממתינות
            </h2>
            <div className="space-y-3">
              {openQuotes.map((q) => (
                <div
                  key={q.invoiceNumber}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper p-4 shadow-brand"
                >
                  <div>
                    <span className="font-bold text-brand-navy">{q.customerName}</span>
                    <div className="mt-0.5 text-xs text-muted">
                      {q.invoiceNumber} · {formatHebrewDate(q.date)}
                      {q.validUntil ? ` · בתוקף עד ${formatHebrewDate(q.validUntil)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg font-extrabold tabular-nums text-brand-navy" dir="ltr">
                      ₪{q.total.toLocaleString("he-IL")}
                    </span>
                    <Link
                      href={`/invoices/${q.invoiceNumber}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand-deep hover:text-teal-600"
                    >
                      צפייה
                      <ArrowLeftIcon className="size-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Empty-everything state */}
        {openAccounts.length === 0 && openQuotes.length === 0 && summary.openCount === 0 && (
          <div className="mt-6 text-center">
            <Link href="/invoices/new?type=business-account" className={btn("gold", "sm")}>
              <WalletIcon className="size-4" />
              הפקת חשבון עסקה ראשון
            </Link>
            <p className="mt-3 text-xs text-faint">
              חשבון עסקה הוא דרישת תשלום — ברגע שהלקוח משלם, מפיקים קבלה והכסף נספר.
            </p>
          </div>
        )}
      </main>
      <EitanFab />
    </div>
  );
}
