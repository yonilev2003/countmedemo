"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { loadPersona } from "@/lib/setup-storage";
import { Persona, InvoiceLine } from "@/lib/persona";
import { formatHebrewDate } from "@/lib/invoice-generator/index";

export default function InvoicePrintPage() {
  const params = useParams();
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [invoice, setInvoice] = useState<InvoiceLine | null>(null);

  useEffect(() => {
    const p = loadPersona();
    if (!p) { router.push("/setup"); return; }
    const inv = p.income.invoices?.find(i => i.invoiceNumber === params.invoiceNumber);
    if (!inv) { router.push("/invoices"); return; }
    setPersona(p);
    setInvoice(inv);
  }, [params.invoiceNumber, router]);

  if (!persona || !invoice) return null;

  const isPatur = persona.business.osekType === "patur";
  const isInvoice = invoice.vat > 0 || !isPatur; // heuristic — can be improved

  return (
    <>
      {/* Print/screen header — hidden in print */}
      <div className="no-print bg-white border-b border-stone-200 px-6 py-3 flex items-center justify-between">
        <Link href="/invoices" className="text-sm text-stone-600 hover:text-brand-navy">&#x2190; חזרה לרשימה</Link>
        <button
          onClick={() => window.print()}
          className="rounded-full bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navy/90"
        >
          &#x1F5A8;&#xFE0F; הדפס / שמור כ-PDF
        </button>
      </div>

      {/* Invoice document — this is what prints */}
      <div className="invoice-document mx-auto max-w-2xl bg-white p-10 min-h-screen" dir="rtl">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-brand-navy">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-navy">
              {isInvoice ? "חשבונית מס" : "קבלה"}
            </h1>
            <p className="text-stone-500 text-sm mt-1">מספר: {invoice.invoiceNumber}</p>
            <p className="text-stone-500 text-sm">תאריך: {formatHebrewDate(invoice.date)}</p>
          </div>
          <div className="text-left">
            <p className="font-bold text-lg text-brand-navy">{persona.business.tradeName}</p>
            <p className="text-sm text-stone-600">
              {isPatur ? "עוסק פטור" : "עוסק מורשה"} מס&#x2019; {persona.business.osekFileNumber}
            </p>
            {persona.contact.phoneMobile && <p className="text-sm text-stone-500">{persona.contact.phoneMobile}</p>}
            {persona.contact.email && <p className="text-sm text-stone-500">{persona.contact.email}</p>}
          </div>
        </div>

        {/* Bill to */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">לכבוד</p>
          <p className="font-semibold text-stone-800">{invoice.customerName}</p>
          {invoice.customerTaxId && <p className="text-sm text-stone-600">ת.ז. / ח.פ.: {invoice.customerTaxId}</p>}
        </div>

        {/* Line items */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="bg-stone-100">
              <th className="px-3 py-2 text-right font-semibold text-stone-600">תיאור</th>
              <th className="px-3 py-2 text-left font-semibold text-stone-600">סכום</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-stone-200">
              <td className="px-3 py-3">{invoice.description}</td>
              <td className="px-3 py-3 text-left font-medium" dir="ltr">&#x20AA;{invoice.amount.toLocaleString("he-IL")}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-600">סכום לפני מע&quot;מ</span>
              <span dir="ltr">&#x20AA;{invoice.amount.toLocaleString("he-IL")}</span>
            </div>
            {invoice.vat > 0 && (
              <div className="flex justify-between">
                <span className="text-stone-600">מע&quot;מ (17%)</span>
                <span dir="ltr">&#x20AA;{invoice.vat.toLocaleString("he-IL")}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-brand-navy border-t border-stone-300 pt-1.5 text-base">
              <span>סה&quot;כ לתשלום</span>
              <span dir="ltr">&#x20AA;{invoice.total.toLocaleString("he-IL")}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-200 pt-4 text-xs text-stone-500">
          {isPatur && <p className="mb-1">עוסק פטור ממע&quot;מ לפי סעיף 31(1) לחוק מע&quot;מ — אין חיוב מע&quot;מ.</p>}
          <p>שולם ע&quot;י: {persona.bank.bankName} | חשבון: {persona.bank.accountNumber}</p>
          <p className="mt-1">הופק באמצעות countme · countmedemo.vercel.app</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .invoice-document {
            max-width: 100% !important;
            padding: 20mm !important;
            margin: 0 !important;
          }
          body { background: white !important; }
        }
      `}</style>
    </>
  );
}
