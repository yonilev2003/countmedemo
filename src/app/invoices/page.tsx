"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadPersona } from "@/lib/setup-storage";
import { Persona, InvoiceLine } from "@/lib/persona";
import { formatHebrewDate } from "@/lib/invoice-generator/index";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { StatusBadge } from "@/components/brand/status";
import { SearchIcon, XIcon, PlusIcon } from "@/components/brand/icons";

const MONTH_LABELS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

function invoiceYear(inv: InvoiceLine) { return new Date(inv.date).getFullYear(); }
function invoiceMonth(inv: InvoiceLine) { return new Date(inv.date).getMonth() + 1; }

export default function InvoicesPage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterCustomer, setFilterCustomer] = useState("");

  useEffect(() => {
    const p = loadPersona();
    if (!p) { router.push("/setup"); return; }
    setPersona(p);
    // Default to the latest year
    const invoices = p.income.invoices ?? [];
    if (invoices.length > 0) {
      const years = [...new Set(invoices.map(invoiceYear))].sort((a, b) => b - a);
      setFilterYear(years[0]);
    }
  }, [router]);

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

  const filteredTotal = filtered.reduce((s, i) => s + i.total, 0);
  const filteredNet = filtered.reduce((s, i) => s + i.amount, 0);

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
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-base font-semibold text-muted">· חשבוניות</span>
          </Link>
          <Link href="/invoices/new" className={btn("primary", "sm")}>
            <PlusIcon className="size-4" />
            חשבונית חדשה
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-screen-lg px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-brand-navy">חשבוניות ותקבולים</h1>
          <span className="text-sm text-muted">{allInvoices.length} מסמכים בסה&quot;כ</span>
        </div>

        {allInvoices.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-line bg-paper py-12 text-center">
            <p className="text-muted mb-4">עוד אין חשבוניות</p>
            <Link href="/invoices/new" className={btn("primary", "sm")}>
              <PlusIcon className="size-4" />
              צור/י חשבונית ראשונה
            </Link>
          </div>
        ) : (
          <>
            {/* ── Filters ── */}
            <div className="mb-5 space-y-3">
              {/* Year filter */}
              {availableYears.length > 1 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-muted font-medium">שנה:</span>
                  {availableYears.map((y) => (
                    <button
                      key={y}
                      onClick={() => { setFilterYear(y); setFilterMonth(null); }}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                        filterYear === y
                          ? "bg-brand-navy text-white"
                          : "bg-paper border border-line text-ink hover:border-brand-deep hover:bg-aqua-soft"
                      }`}
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
                  <span className="text-xs text-muted font-medium">חודש:</span>
                  {availableMonths.map((m) => (
                    <button
                      key={m}
                      onClick={() => setFilterMonth(filterMonth === m ? null : m)}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                        filterMonth === m
                          ? "bg-brand-navy/80 text-white"
                          : "bg-paper border border-line text-ink hover:border-brand-deep hover:bg-aqua-soft"
                      }`}
                    >
                      {MONTH_LABELS[m - 1]}
                    </button>
                  ))}
                </div>
              )}

              {/* Customer search */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted font-medium">לקוח:</span>
                <div className="relative flex items-center">
                  <SearchIcon className="absolute end-3 size-4 text-faint pointer-events-none" />
                  <input
                    type="text"
                    value={filterCustomer}
                    onChange={(e) => setFilterCustomer(e.target.value)}
                    placeholder="חיפוש לפי שם לקוח..."
                    className="rounded-full border border-line bg-paper pe-9 ps-3 py-1 text-xs text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep w-52"
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
              <div className="mb-4 flex items-center gap-6 rounded-xl bg-info border border-line px-4 py-2.5 text-sm">
                <span className="text-muted">
                  <span className="font-bold text-brand-navy">{filtered.length}</span> חשבוניות
                </span>
                <span className="text-muted">
                  סה&quot;כ לפני מע&quot;מ: <span className="font-bold text-brand-navy">{filteredNet.toLocaleString("he-IL")} &#x20AA;</span>
                </span>
                {filteredNet !== filteredTotal && (
                  <span className="text-muted">
                    סה&quot;כ כולל מע&quot;מ: <span className="font-bold text-brand-navy">{filteredTotal.toLocaleString("he-IL")} &#x20AA;</span>
                  </span>
                )}
              </div>
            )}

            {/* ── Table ── */}
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-paper py-10 text-center text-sm text-muted">
                אין חשבוניות מתאימות לסינון
              </div>
            ) : (
              <div className="rounded-2xl bg-paper border border-line overflow-hidden shadow-brand">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-sand border-b border-line">
                      <th className="px-4 py-3 text-start font-bold text-brand-navy">מספר</th>
                      <th className="px-4 py-3 text-start font-bold text-brand-navy">סוג</th>
                      <th className="px-4 py-3 text-start font-bold text-brand-navy">תאריך</th>
                      <th className="px-4 py-3 text-start font-bold text-brand-navy">לקוח</th>
                      <th className="px-4 py-3 text-start font-bold text-brand-navy">תיאור</th>
                      <th className="px-4 py-3 text-end font-bold text-brand-navy">סכום</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv, idx) => {
                      const dt = inv.docType ?? "tax-invoice-receipt";
                      const dtLabel = dt === "receipt" ? "קבלה" : "חשבונית מס/קבלה";
                      return (
                        <tr key={inv.invoiceNumber} className={`border-b border-line-soft last:border-0 ${idx % 2 === 0 ? "bg-paper" : "bg-cream"}`}>
                          <td className="px-4 py-3 font-mono text-xs text-faint">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3">
                            <StatusBadge
                              status={dt === "receipt" ? "on-track" : "plan"}
                              showDot={false}
                            >
                              {dtLabel}
                            </StatusBadge>
                          </td>
                          <td className="px-4 py-3 text-muted">{formatHebrewDate(inv.date)}</td>
                          <td className="px-4 py-3 font-semibold text-ink">{inv.customerName}</td>
                          <td className="px-4 py-3 text-muted max-w-xs truncate">{inv.description}</td>
                          <td className="px-4 py-3 text-end font-bold text-brand-navy" dir="ltr">
                            &#x20AA;{inv.total.toLocaleString("he-IL")}
                          </td>
                          <td className="px-4 py-3 text-end">
                            <Link href={`/invoices/${inv.invoiceNumber}`} className="text-xs font-medium text-brand-deep hover:text-teal-600">
                              צפייה
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
    </div>
  );
}
