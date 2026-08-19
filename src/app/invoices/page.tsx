"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { InvoiceLine } from "@/lib/persona";
import { formatHebrewDate, isRevenueDoc } from "@/lib/invoice-generator/index";
import { effectiveStatus } from "@/lib/receivables/summary";
import { AppHeader } from "@/components/brand/app-header";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { btn } from "@/components/brand/button";
import { StatusBadge } from "@/components/brand/status";
import { EitanFab } from "@/components/agent/eitan-fab";
import { SearchIcon, XIcon, PlusIcon, ReceiptIcon, ArrowLeftIcon } from "@/components/brand/icons";

const MONTH_LABELS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

function invoiceYear(inv: InvoiceLine) { return new Date(inv.date).getFullYear(); }
function invoiceMonth(inv: InvoiceLine) { return new Date(inv.date).getMonth() + 1; }

export default function InvoicesPage() {
  const { persona } = useRequiredPersona();
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterCustomer, setFilterCustomer] = useState("");

  // Default the year filter to the latest year that actually has documents.
  useEffect(() => {
    const invoices = persona?.income.invoices ?? [];
    if (invoices.length === 0) return;
    const years = [...new Set(invoices.map(invoiceYear))].sort((a, b) => b - a);
    setFilterYear(years[0]);
  }, [persona]);

  const allInvoices: InvoiceLine[] = useMemo(
    () => [...(persona?.income.invoices ?? [])].reverse(),
    [persona],
  );

  const availableYears = useMemo(
    () => [...new Set(allInvoices.map(invoiceYear))].sort((a, b) => b - a),
    [allInvoices],
  );

  const availableMonths = useMemo(
    () =>
      filterYear
        ? [
            ...new Set(
              allInvoices
                .filter((i) => invoiceYear(i) === filterYear)
                .map(invoiceMonth),
            ),
          ].sort((a, b) => a - b)
        : [],
    [allInvoices, filterYear],
  );

  const filtered = useMemo(() => {
    return allInvoices.filter((inv) => {
      if (filterYear && invoiceYear(inv) !== filterYear) return false;
      if (filterMonth && invoiceMonth(inv) !== filterMonth) return false;
      if (filterCustomer && !inv.customerName.includes(filterCustomer)) return false;
      return true;
    });
  }, [allInvoices, filterYear, filterMonth, filterCustomer]);

  // Money strip counts PAYMENT docs only — quotes/business-accounts are not income.
  const filteredPayment = filtered.filter((i) => isRevenueDoc(i.docType));
  const filteredTotal = filteredPayment.reduce((s, i) => s + i.total, 0);
  const filteredNet = filteredPayment.reduce((s, i) => s + i.amount, 0);

  // Chip class helper — mockup uses navy pill for active, paper outline otherwise.
  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1 text-xs font-bold transition-colors ${
      active
        ? "bg-brand-navy text-white"
        : "bg-paper border border-line text-ink hover:border-brand-deep hover:bg-aqua-soft"
    }`;

  if (!persona) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="space-y-3 w-96 animate-pulse">
        <div className="h-6 rounded-lg bg-sand w-1/2 mx-auto" />
        <div className="h-64 rounded-2xl bg-sand" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      {/* AppHeader wraps on narrow phones — the hand-rolled non-wrapping row
          forced a 421px layout viewport at 390px (journey scan round 2). */}
      <AppHeader
        pageLabel="חשבוניות"
        actions={
          <>
            <Link href="/receivables" className={btn("secondary", "sm")}>
              מי לא שילם לי
            </Link>
            <Link href="/invoices/new" className={btn("primary", "sm")}>
              <PlusIcon className="size-4" />
              מסמך חדש
            </Link>
          </>
        }
      />

      {/* pb-28: clearance for QuickActionsBar's fixed mobile bottom bar
          (2026-08-19 global-nav sweep, FP-23); lg:pb-10 resets it back since
          the bar is lg:hidden. */}
      <main className="mx-auto max-w-screen-lg px-6 py-10 pb-28 lg:pb-10">
        {/* Page head — mockup `.pagehead` with eyebrow */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.04em] text-teal-600">
              <span className="size-[7px] rounded-full bg-brand" />
              CountMe · Invoicing
            </div>
            <h1 className="font-display text-[32px] font-extrabold tracking-tight text-brand-navy">
              חשבוניות ותקבולים
            </h1>
            <p className="mt-2 text-[15px] text-muted">
              כל המסמכים שהפקת — חשבוניות מס/קבלה וקבלות, מסוננים לפי שנה, חודש ולקוח.
            </p>
          </div>
          <span className="rounded-full bg-paper border border-line px-3.5 py-1 text-xs font-bold text-muted">
            {allInvoices.length} מסמכים בסה&quot;כ
          </span>
        </div>

        {allInvoices.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-line bg-paper py-14 text-center shadow-brand">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-aqua-soft">
              <ReceiptIcon className="size-7 text-brand-deep" />
            </div>
            <p className="text-muted mb-5">עוד אין חשבוניות</p>
            <Link href="/invoices/new" className={btn("primary", "sm")}>
              <PlusIcon className="size-4" />
              צור/י חשבונית ראשונה
            </Link>
          </div>
        ) : (
          <>
            {/* ── Filters ── */}
            <div className="mb-6 space-y-3">
              {/* Year filter */}
              {availableYears.length > 1 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-muted font-semibold">שנה:</span>
                  {availableYears.map((y) => (
                    <button
                      key={y}
                      onClick={() => { setFilterYear(y); setFilterMonth(null); }}
                      className={chip(filterYear === y)}
                    >
                      {y}
                    </button>
                  ))}
                  {filterYear && (
                    <button
                      onClick={() => { setFilterYear(null); setFilterMonth(null); }}
                      className="text-xs text-faint hover:text-muted"
                    >
                      הצג הכל
                    </button>
                  )}
                </div>
              )}

              {/* Month filter */}
              {availableMonths.length > 1 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-muted font-semibold">חודש:</span>
                  {availableMonths.map((m) => (
                    <button
                      key={m}
                      onClick={() => setFilterMonth(filterMonth === m ? null : m)}
                      className={chip(filterMonth === m)}
                    >
                      {MONTH_LABELS[m - 1]}
                    </button>
                  ))}
                </div>
              )}

              {/* Customer search */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted font-semibold">לקוח:</span>
                <div className="relative flex items-center">
                  <SearchIcon className="absolute end-3 size-4 text-faint pointer-events-none" />
                  <input
                    type="text"
                    value={filterCustomer}
                    onChange={(e) => setFilterCustomer(e.target.value)}
                    placeholder="חיפוש לפי שם לקוח…"
                    className="rounded-full border border-line bg-paper pe-9 ps-3.5 py-1.5 text-xs text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep w-56"
                    dir="rtl"
                  />
                </div>
                {filterCustomer && (
                  <button onClick={() => setFilterCustomer("")} className="text-faint hover:text-muted">
                    <XIcon className="size-4" />
                  </button>
                )}
              </div>
            </div>

            {/* ── Summary strip ── */}
            {filtered.length > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-aqua-soft border border-line px-5 py-3 text-sm">
                <span className="text-muted">
                  <span className="font-bold text-brand-navy">{filtered.length}</span> מסמכים
                  {filteredPayment.length !== filtered.length && (
                    <span className="text-faint"> ({filteredPayment.length} תקבולים)</span>
                  )}
                </span>
                <span className="text-muted">
                  סה&quot;כ לפני מע&quot;מ:{" "}
                  <span dir="ltr" className="font-bold text-brand-navy tabular-nums">₪{filteredNet.toLocaleString("he-IL")}</span>
                </span>
                {filteredNet !== filteredTotal && (
                  <span className="text-muted">
                    סה&quot;כ כולל מע&quot;מ:{" "}
                    <span dir="ltr" className="font-bold text-brand-navy tabular-nums">₪{filteredTotal.toLocaleString("he-IL")}</span>
                  </span>
                )}
              </div>
            )}

            {/* ── Table ── */}
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-paper py-12 text-center text-sm text-muted">
                אין חשבוניות מתאימות לסינון
              </div>
            ) : (
              <div className="rounded-2xl bg-paper border border-line shadow-brand overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="px-5 py-3.5 text-start text-[13px] font-bold text-muted">מספר</th>
                      <th className="px-5 py-3.5 text-start text-[13px] font-bold text-muted">סוג</th>
                      <th className="px-5 py-3.5 text-start text-[13px] font-bold text-muted">תאריך</th>
                      <th className="px-5 py-3.5 text-start text-[13px] font-bold text-muted">לקוח</th>
                      <th className="px-5 py-3.5 text-start text-[13px] font-bold text-muted">תיאור</th>
                      <th className="px-5 py-3.5 text-end text-[13px] font-bold text-muted">סכום</th>
                      <th className="px-5 py-3.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv) => {
                      const dt = inv.docType ?? "tax-invoice-receipt";
                      const dtLabel =
                        dt === "receipt"
                          ? "קבלה"
                          : dt === "business-account"
                            ? "חשבון עסקה"
                            : dt === "quote"
                              ? "הצעת מחיר"
                              : "חשבונית מס/קבלה";
                      const st = effectiveStatus(inv);
                      const stBadge =
                        st === "paid"
                          ? { status: "on-track" as const, label: "שולם" }
                          : st === "overdue"
                            ? { status: "overdue" as const, label: "באיחור" }
                            : st === "expired"
                              ? { status: "due" as const, label: "פג תוקף" }
                              : { status: "plan" as const, label: "פתוח" };
                      return (
                        <tr key={inv.invoiceNumber} className="border-b border-line-soft last:border-0 transition-colors hover:bg-aqua-soft/40">
                          <td className="px-5 py-3.5 font-mono text-xs text-faint tabular-nums">{inv.invoiceNumber}</td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1.5">
                              <StatusBadge status="plan" showDot={false}>
                                {dtLabel}
                              </StatusBadge>
                              {!isRevenueDoc(dt) && (
                                <StatusBadge status={stBadge.status} showDot={false}>
                                  {stBadge.label}
                                </StatusBadge>
                              )}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-muted tabular-nums">{formatHebrewDate(inv.date)}</td>
                          <td className="px-5 py-3.5 font-semibold text-ink">{inv.customerName}</td>
                          <td className="px-5 py-3.5 text-muted max-w-xs truncate">{inv.description}</td>
                          <td className="px-5 py-3.5 text-end font-bold text-brand-navy tabular-nums" dir="ltr">
                            ₪{inv.total.toLocaleString("he-IL")}
                          </td>
                          <td className="px-5 py-3.5 text-end">
                            <Link
                              href={`/invoices/${inv.invoiceNumber}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-brand-deep hover:text-teal-600"
                            >
                              צפייה
                              <ArrowLeftIcon className="size-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* Canonical bottom bar (2026-08-19 global-nav sweep, FP-23). Note:
          its "שקל" shortcut now sits alongside the pre-existing EitanFab
          below, a double chat affordance on this page specifically — left
          in place since removing EitanFab wasn't part of this sweep's
          scope; flagged for Yoni to decide. */}
      <QuickActions variant="bar" className="lg:hidden" currentHref="/invoices" />
      <EitanFab />
    </div>
  );
}
