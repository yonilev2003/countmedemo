"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadPersona } from "@/lib/setup-storage";
import { Persona, InvoiceLine } from "@/lib/persona";
import { formatHebrewDate } from "@/lib/invoice-generator/index";
import { ACTIVE_FILING_YEAR } from "@/lib/calculators/types";

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
    // Default to the year open for filing now (2025); fall back to the latest
    // year that actually has invoices if the active year has none yet.
    const invoices = p.income.invoices ?? [];
    if (invoices.length > 0) {
      const years = [...new Set(invoices.map(invoiceYear))].sort((a, b) => b - a);
      setFilterYear(years.includes(ACTIVE_FILING_YEAR) ? ACTIVE_FILING_YEAR : years[0]);
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
        <div className="h-6 rounded-lg bg-stone-200 w-1/2 mx-auto" />
        <div className="h-64 rounded-2xl bg-stone-200" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-stone-200">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/countme-logo.svg" alt="CountMe" className="h-10 w-10" />
            <span className="text-lg font-bold">CountMe · חשבוניות</span>
          </Link>
          <Link
            href="/invoices/new"
            className="rounded-full bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navy/90 transition-colors"
          >
            + חשבונית חדשה
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-screen-lg px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-brand-navy">חשבוניות ותקבולים</h1>
          <span className="text-sm text-stone-500">{allInvoices.length} מסמכים בסה&quot;כ</span>
        </div>

        {allInvoices.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-white py-12 text-center">
            <p className="text-stone-500 mb-4">עוד אין חשבוניות</p>
            <Link href="/invoices/new" className="rounded-full bg-brand-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-navy/90">
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
                  <span className="text-xs text-stone-500 font-medium">שנה:</span>
                  {availableYears.map((y) => (
                    <button
                      key={y}
                      onClick={() => { setFilterYear(y); setFilterMonth(null); }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        filterYear === y
                          ? "bg-brand-navy text-white"
                          : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                  {filterYear && (
                    <button
                      onClick={() => { setFilterYear(null); setFilterMonth(null); }}
                      className="text-xs text-stone-400 hover:text-stone-600"
                    >
                      הצג הכל
                    </button>
                  )}
                </div>
              )}

              {/* Month filter */}
              {availableMonths.length > 1 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-stone-500 font-medium">חודש:</span>
                  {availableMonths.map((m) => (
                    <button
                      key={m}
                      onClick={() => setFilterMonth(filterMonth === m ? null : m)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        filterMonth === m
                          ? "bg-brand-navy/80 text-white"
                          : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {MONTH_LABELS[m - 1]}
                    </button>
                  ))}
                </div>
              )}

              {/* Customer search */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-500 font-medium">לקוח:</span>
                <input
                  type="text"
                  value={filterCustomer}
                  onChange={(e) => setFilterCustomer(e.target.value)}
                  placeholder="חיפוש לפי שם לקוח..."
                  className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-navy/20 w-52"
                  dir="rtl"
                />
                {filterCustomer && (
                  <button onClick={() => setFilterCustomer("")} className="text-xs text-stone-400 hover:text-stone-600">
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* ── Summary strip ── */}
            {filtered.length > 0 && (
              <div className="mb-4 flex items-center gap-6 rounded-xl bg-brand-navy/5 border border-brand-navy/10 px-4 py-2.5 text-sm">
                <span className="text-stone-600">
                  <span className="font-semibold text-brand-navy">{filtered.length}</span> חשבוניות
                </span>
                <span className="text-stone-600">
                  סה&quot;כ לפני מע&quot;מ: <span className="font-semibold text-brand-navy">{filteredNet.toLocaleString("he-IL")} ₪</span>
                </span>
                {filteredNet !== filteredTotal && (
                  <span className="text-stone-600">
                    סה&quot;כ כולל מע&quot;מ: <span className="font-semibold text-brand-navy">{filteredTotal.toLocaleString("he-IL")} ₪</span>
                  </span>
                )}
              </div>
            )}

            {/* ── Table ── */}
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-10 text-center text-sm text-stone-500">
                אין חשבוניות מתאימות לסינון
              </div>
            ) : (
              <div className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="px-4 py-3 text-right font-semibold text-stone-600">מספר</th>
                      <th className="px-4 py-3 text-right font-semibold text-stone-600">סוג</th>
                      <th className="px-4 py-3 text-right font-semibold text-stone-600">תאריך</th>
                      <th className="px-4 py-3 text-right font-semibold text-stone-600">לקוח</th>
                      <th className="px-4 py-3 text-right font-semibold text-stone-600">תיאור</th>
                      <th className="px-4 py-3 text-left font-semibold text-stone-600">סכום</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv, idx) => {
                      const dt = inv.docType ?? "tax-invoice-receipt";
                      const dtLabel = dt === "receipt" ? "קבלה" : "חשבונית מס/קבלה";
                      return (
                        <tr key={inv.invoiceNumber} className={idx % 2 === 0 ? "bg-white" : "bg-stone-50/50"}>
                          <td className="px-4 py-3 font-mono text-xs text-stone-500">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              dt === "receipt" ? "bg-success/15 text-success" : "bg-info text-brand-navy"
                            }`}>
                              {dtLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-stone-600">{formatHebrewDate(inv.date)}</td>
                          <td className="px-4 py-3 font-medium text-stone-800">{inv.customerName}</td>
                          <td className="px-4 py-3 text-stone-600 max-w-xs truncate">{inv.description}</td>
                          <td className="px-4 py-3 text-left font-semibold text-brand-navy" dir="ltr">
                            &#x20AA;{inv.total.toLocaleString("he-IL")}
                          </td>
                          <td className="px-4 py-3 text-left">
                            <Link href={`/invoices/${inv.invoiceNumber}`} className="text-xs text-brand-navy hover:underline">
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
