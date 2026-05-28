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

  if (!persona || !invoice) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="space-y-3 w-96 animate-pulse">
        <div className="h-8 rounded-lg bg-stone-200 w-1/2 mx-auto" />
        <div className="h-96 rounded-2xl bg-stone-200" />
      </div>
    </div>
  );

  const isPatur = persona.business.osekType === "patur";
  // Default legacy invoices to combined "tax-invoice-receipt" (305 — most common)
  const docType = invoice.docType ?? "tax-invoice-receipt";
  const docTitle = docType === "receipt" ? "קבלה" : "חשבונית מס/קבלה";
  // SHAAM allocation number — required for invoices > 25K from 2024+. Mock for demo.
  const showAllocation = docType === "tax-invoice-receipt" && invoice.total > 25000;
  const mockAllocation = showAllocation
    ? `IL${invoice.invoiceNumber.replace(/\D/g, "")}${String(
        invoice.invoiceNumber.replace(/\D/g, "").split("").reduce((a, c) => (a + Number(c)) % 900, 1) + 100
      ).padStart(3, "0")}`
    : null;

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
            <h1 className="font-display text-2xl font-bold text-brand-navy">{docTitle}</h1>
            <p className="text-stone-600 text-sm mt-1 font-mono">מספר: {invoice.invoiceNumber}</p>
            <p className="text-stone-500 text-sm">תאריך: {formatHebrewDate(invoice.date)}</p>
            {mockAllocation && (
              <p className="text-xs text-stone-500 mt-1 font-mono">מספר הקצאה (שע&quot;מ): {mockAllocation}</p>
            )}
          </div>
          <div className="text-left">
            <p className="font-bold text-lg text-brand-navy">{persona.business.tradeName}</p>
            <p className="text-sm text-stone-600">
              {isPatur ? "עוסק פטור" : "עוסק מורשה"} · ח.פ./ע.פ.: {persona.business.osekFileNumber}
            </p>
            {persona.contact?.mailingAddress && (
              <p className="text-xs text-stone-500">
                {persona.contact.mailingAddress.street} {persona.contact.mailingAddress.houseNumber}, {persona.contact.mailingAddress.city}
              </p>
            )}
            {persona.contact?.phoneMobile && <p className="text-xs text-stone-500">{persona.contact.phoneMobile}</p>}
            {persona.contact?.email && <p className="text-xs text-stone-500">{persona.contact.email}</p>}
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

        {/* Payment confirmation block — for receipt + combined */}
        <div className="mb-6 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-bold text-emerald-800">✓ קבלת תשלום מאושרת</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            מאשרים בזאת קבלת סך {invoice.total.toLocaleString("he-IL")} &#x20AA; עבור השירות המפורט לעיל.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-200 pt-4 text-xs text-stone-500 leading-relaxed space-y-1">
          {isPatur && <p>עוסק פטור ממע&quot;מ לפי סעיף 31(1) לחוק מע&quot;מ — אין חיוב מע&quot;מ.</p>}
          {!isPatur && <p>חשבונית מס זו מהווה אסמכתא לקיזוז מע&quot;מ תשומות ולפי סעיף 38 לחוק מע&quot;מ.</p>}
          <p>חתימה דיגיטלית: {persona.business.tradeName} · {new Date().toISOString().split("T")[0]}</p>
          <p className="text-stone-400 text-[10px] mt-2">הופק באמצעות countme · countmedemo.vercel.app</p>
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
