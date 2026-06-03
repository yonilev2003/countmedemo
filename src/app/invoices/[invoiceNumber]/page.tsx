"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { loadPersona } from "@/lib/setup-storage";
import { Persona, InvoiceLine } from "@/lib/persona";
import { formatHebrewDate } from "@/lib/invoice-generator/index";
import { Logo, LogoMark } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { ArrowRightIcon, DownloadIcon, CheckCircleIcon } from "@/components/brand/icons";

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
        <div className="h-8 rounded-lg bg-sand w-1/2 mx-auto" />
        <div className="h-96 rounded-2xl bg-sand" />
      </div>
    </div>
  );

  const isPatur = persona.business.osekType === "patur";
  // Default legacy invoices to combined "tax-invoice-receipt" (305 — most common)
  const docType = invoice.docType ?? "tax-invoice-receipt";
  const docTitle = docType === "receipt" ? "קבלה" : "חשבונית מס/קבלה";
  const isReceipt = docType === "receipt";
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
      <div className="no-print bg-paper border-b border-line px-6 py-3 flex items-center justify-between">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand-navy transition-colors"
        >
          <ArrowRightIcon className="size-4" />
          חזרה לרשימה
        </Link>
        <Logo size={22} />
        <button
          onClick={() => window.print()}
          className={btn("secondary", "sm")}
        >
          <DownloadIcon className="size-4" />
          הדפס / שמור כ-PDF
        </button>
      </div>

      {/* Invoice document — this is what prints */}
      <div className="invoice-document mx-auto max-w-2xl bg-paper shadow-brand-lg border border-line rounded-2xl overflow-hidden my-8 no-print-shadow" dir="rtl">

        {/* Document header: two columns — issuer (right) + recipient/title (left, navy bg) */}
        <div className="grid grid-cols-2">
          {/* Issuer column */}
          <div className="p-8 flex flex-col items-center text-center border-e border-line">
            <div className="w-16 h-16 rounded-full bg-brand-navy flex items-center justify-center mb-3">
              <LogoMark size={28} className="text-brand" />
            </div>
            <p className="text-sm font-bold text-brand-navy leading-snug">{persona.business.tradeName}</p>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              {isPatur ? "עוסק פטור" : "עוסק מורשה"} · {persona.business.osekFileNumber}
              {persona.contact?.mailingAddress && (
                <><br />{persona.contact.mailingAddress.street} {persona.contact.mailingAddress.houseNumber}, {persona.contact.mailingAddress.city}</>
              )}
              {persona.contact?.phoneMobile && <><br />{persona.contact.phoneMobile}</>}
              {persona.contact?.email && <><br />{persona.contact.email}</>}
            </p>
          </div>

          {/* Recipient + document title column (navy) */}
          <div className="bg-brand-navy p-8 text-white">
            <div className="flex justify-between text-xs text-aqua mb-1">
              <span>{formatHebrewDate(invoice.date)}</span>
              <span>לכבוד:</span>
            </div>
            <p className="text-sm font-bold text-white text-end">{invoice.customerName}</p>
            {invoice.customerTaxId && (
              <p className="text-xs text-aqua text-end mt-1">ח.פ / ת.ז {invoice.customerTaxId}</p>
            )}
            <div className="h-px bg-aqua/20 my-4" />
            <h1 className="text-2xl font-bold tracking-tight">{docTitle} {invoice.invoiceNumber}</h1>
            <p className="text-xs text-aqua mt-1">העתק נאמן למקור</p>
            {!isReceipt && (
              <p className="text-xs text-aqua mt-3">לתשלום עד {formatHebrewDate(invoice.date)}</p>
            )}
            {isReceipt && (
              <p className="text-xs text-aqua mt-3">התקבל במלואו · תודה על התשלום</p>
            )}
          </div>
        </div>

        {/* Document body */}
        <div className="p-8">
          {invoice.description && (
            <p className="text-sm font-bold text-brand-navy text-start mb-4">{invoice.description}</p>
          )}

          {/* Line items table */}
          <table className="w-full mb-6 text-sm border-collapse">
            <thead>
              <tr className="border-b border-line">
                {isReceipt ? (
                  <>
                    <th className="px-3 py-2 text-end font-bold text-muted text-xs">תאריך</th>
                    <th className="px-3 py-2 text-end font-bold text-muted text-xs w-full">אופן התקבול</th>
                    <th className="px-3 py-2 text-start font-bold text-muted text-xs">סכום</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2 text-end font-bold text-muted text-xs">כמות</th>
                    <th className="px-3 py-2 text-end font-bold text-muted text-xs w-full">פירוט</th>
                    <th className="px-3 py-2 text-start font-bold text-muted text-xs">מחיר</th>
                    <th className="px-3 py-2 text-start font-bold text-muted text-xs">סה&quot;כ</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {isReceipt ? (
                <tr className="border-b border-line-soft">
                  <td className="px-3 py-3 text-end text-muted text-xs">{formatHebrewDate(invoice.date)}</td>
                  <td className="px-3 py-3 text-end font-semibold text-ink">{invoice.description}</td>
                  <td className="px-3 py-3 text-start font-medium text-ink" dir="ltr">&#x20AA;{invoice.total.toLocaleString("he-IL")}</td>
                </tr>
              ) : (
                <tr className="border-b border-line-soft">
                  <td className="px-3 py-3 text-end text-muted text-center">1</td>
                  <td className="px-3 py-3 text-end font-semibold text-ink">{invoice.description}</td>
                  <td className="px-3 py-3 text-start font-medium text-ink" dir="ltr">&#x20AA;{invoice.amount.toLocaleString("he-IL")}</td>
                  <td className="px-3 py-3 text-start font-medium text-ink" dir="ltr">&#x20AA;{invoice.amount.toLocaleString("he-IL")}</td>
                </tr>
              )}
              {/* Sub-total row */}
              {!isReceipt && (
                <tr className="border-b border-line-soft">
                  <td colSpan={2} className="px-3 py-2 text-end font-semibold text-muted text-sm">סה&quot;כ</td>
                  <td colSpan={2} className="px-3 py-2 text-start font-bold text-brand-navy text-sm" dir="ltr">&#x20AA;{invoice.amount.toLocaleString("he-IL")}</td>
                </tr>
              )}
              {/* VAT row */}
              {!isReceipt && (
                <tr className="border-b border-line-soft">
                  <td colSpan={2} className="px-3 py-2 text-end font-semibold text-muted text-sm">
                    מע&quot;מ {isPatur ? "0% (עוסק פטור)" : "17%"}
                  </td>
                  <td colSpan={2} className="px-3 py-2 text-start font-bold text-brand-navy text-sm" dir="ltr">&#x20AA;{invoice.vat.toLocaleString("he-IL")}</td>
                </tr>
              )}
              {/* Receipt total label */}
              {isReceipt && (
                <tr>
                  <td colSpan={2} className="px-3 py-2 text-end font-semibold text-muted text-sm">סה&quot;כ התקבל</td>
                  <td className="px-3 py-2 text-start font-bold text-brand-navy text-sm" dir="ltr">&#x20AA;{invoice.total.toLocaleString("he-IL")}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Total pill + bank details */}
          <div className="flex items-end justify-between mb-6">
            <div className="text-xs text-muted leading-relaxed max-w-[55%]">
              {persona.bank?.bankName && (
                <p>בנק {persona.bank.bankName} ({persona.bank.bankCode}), סניף {persona.bank.branchCode}, חשבון {persona.bank.accountNumber}</p>
              )}
              {isReceipt && (
                <p className="mt-1">קבלה זו מהווה אישור על קבלת התשלום.</p>
              )}
            </div>
            <div className="bg-brand-navy text-white rounded-xl px-5 py-3 flex items-center gap-6 shrink-0">
              <span className="text-xs font-bold text-aqua">{isReceipt ? "סההך שולם" : "סההך לתשלום"}</span>
              <span className="text-lg font-bold" dir="ltr">&#x20AA;{invoice.total.toLocaleString("he-IL")}</span>
            </div>
          </div>

          {/* Payment confirmation block — for receipt + combined */}
          <div className="mb-4 rounded-xl border border-success/30 bg-success-light px-4 py-3 flex items-start gap-3">
            <CheckCircleIcon className="size-5 text-success shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-success">קבלת תשלום מאושרת</p>
              <p className="text-xs text-success/80 mt-0.5">
                מאשרים בזאת קבלת סך {invoice.total.toLocaleString("he-IL")} &#x20AA; עבור השירות המפורט לעיל.
              </p>
            </div>
          </div>

          {/* SHAAM allocation */}
          {mockAllocation && (
            <p className="text-xs text-faint mb-4 font-mono">מספר הקצאה (שע&quot;מ): {mockAllocation}</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-line px-8 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-brand-navy">חתימה דיגיטלית מאובטחת</p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-faint">
              <span>מסמך ממוחשב הופק על ידי</span>
              <LogoMark size={12} className="text-brand" />
              <span className="font-bold text-teal-600">CountMe</span>
            </div>
          </div>
          <p className="text-[11px] text-faint">
            הופק {formatHebrewDate(invoice.date)} | {docTitle} {invoice.invoiceNumber} | עמוד 1 מתוך 1
          </p>
        </div>
      </div>

      {/* Legal footer text — visible below card */}
      <div className="no-print mx-auto max-w-2xl px-8 pb-12 text-xs text-faint leading-relaxed space-y-1">
        {isPatur && <p>עוסק פטור ממע&quot;מ לפי סעיף 31(1) לחוק מע&quot;מ — אין חיוב מע&quot;מ.</p>}
        {!isPatur && <p>חשבונית מס זו מהווה אסמכתא לקיזוז מע&quot;מ תשומות ולפי סעיף 38 לחוק מע&quot;מ.</p>}
        <p>חתימה דיגיטלית: {persona.business.tradeName} · {new Date().toISOString().split("T")[0]}</p>
        <p className="text-[10px]">הופק באמצעות countme · countmedemo.vercel.app</p>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .no-print-shadow { box-shadow: none !important; border-radius: 0 !important; }
          .invoice-document {
            max-width: 100% !important;
            margin: 0 !important;
            border: none !important;
          }
          body { background: white !important; }
        }
      `}</style>
    </>
  );
}
