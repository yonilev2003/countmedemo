"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadPersona } from "@/lib/setup-storage";
import { Persona, InvoiceLine } from "@/lib/persona";
import { formatHebrewDate } from "@/lib/invoice-generator/index";

export default function InvoicesPage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);

  useEffect(() => {
    const p = loadPersona();
    if (!p) { router.push("/setup"); return; }
    setPersona(p);
  }, [router]);

  if (!persona) return null;

  const invoices: InvoiceLine[] = [...(persona.income.invoices ?? [])].reverse();

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-stone-200">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-bold text-white shadow-sm">c</div>
            <span className="text-lg font-bold">countme · חשבוניות</span>
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
          <span className="text-sm text-stone-500">{invoices.length} מסמכים</span>
        </div>

        {invoices.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-white py-12 text-center">
            <p className="text-stone-500 mb-4">עוד אין חשבוניות</p>
            <Link href="/invoices/new" className="rounded-full bg-brand-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-navy/90">
              צור/י חשבונית ראשונה
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="px-4 py-3 text-right font-semibold text-stone-600">מספר</th>
                  <th className="px-4 py-3 text-right font-semibold text-stone-600">תאריך</th>
                  <th className="px-4 py-3 text-right font-semibold text-stone-600">לקוח</th>
                  <th className="px-4 py-3 text-right font-semibold text-stone-600">תיאור</th>
                  <th className="px-4 py-3 text-left font-semibold text-stone-600">סכום</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, idx) => (
                  <tr key={inv.invoiceNumber} className={idx % 2 === 0 ? "bg-white" : "bg-stone-50/50"}>
                    <td className="px-4 py-3 font-mono text-xs text-stone-500">{inv.invoiceNumber}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
