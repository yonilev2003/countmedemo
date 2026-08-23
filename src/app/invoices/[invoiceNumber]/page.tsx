"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { InvoiceLine } from "@/lib/persona";
import {
  formatHebrewDate,
  requiresAllocationNumber,
  allocationNumberThreshold,
} from "@/lib/invoice-generator/index";
import { getBusinessAssetSignedUrl } from "@/lib/documents/asset-storage";
import { ils } from "@/lib/utils";
import { getSiteOrigin } from "@/lib/site";
import { LogoMark } from "@/components/brand/logo";
import { AppHeader } from "@/components/brand/app-header";
import { btn } from "@/components/brand/button";
import { ArrowRightIcon, DownloadIcon, CheckCircleIcon } from "@/components/brand/icons";

export default function InvoicePrintPage() {
  const params = useParams();
  const router = useRouter();
  const { persona } = useRequiredPersona();
  const [invoice, setInvoice] = useState<InvoiceLine | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!persona) return;
    const inv = persona.income.invoices?.find(
      (i) => i.invoiceNumber === params.invoiceNumber,
    );
    if (!inv) { router.replace("/invoices"); return; }
    setInvoice(inv);
  }, [persona, params.invoiceNumber, router]);

  // Signed URLs for the optional logo/signature (set in /invoices/settings) —
  // fetched client-side same as the receipt-image pattern elsewhere; absent
  // ⇒ null, falls back to the existing monogram / text-only footer.
  useEffect(() => {
    let cancelled = false;
    const logoPath = persona?.business.logoPath;
    if (!logoPath) { setLogoUrl(null); return; }
    getBusinessAssetSignedUrl(logoPath).then((url) => { if (!cancelled) setLogoUrl(url); });
    return () => { cancelled = true; };
  }, [persona?.business.logoPath]);

  useEffect(() => {
    let cancelled = false;
    const signaturePath = persona?.business.signaturePath;
    if (!signaturePath) { setSignatureUrl(null); return; }
    getBusinessAssetSignedUrl(signaturePath).then((url) => { if (!cancelled) setSignatureUrl(url); });
    return () => { cancelled = true; };
  }, [persona?.business.signaturePath]);

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
  const docTitle =
    docType === "receipt"
      ? "קבלה"
      : docType === "business-account"
        ? "חשבון עסקה"
        : docType === "quote"
          ? "הצעת מחיר"
          : "חשבונית מס/קבלה";
  const isReceipt = docType === "receipt";
  // Payment-received tax docs; quotes/business-accounts are NOT tax documents.
  const isPaymentDoc = docType === "receipt" || docType === "tax-invoice-receipt";
  // SHAAM allocation numbers: a REAL allocation must come from the Tax
  // Authority API (phase 2). Never display an invented number on a document —
  // the previous mock here was a regulatory exposure (removed 2026-07-19).
  // Legal-blocker fix (audit, 2026-08-18): above the current-dated allocation
  // threshold (₪5,000 net from 2026-06-01), the document must NOT claim
  // unconditional input-VAT-deduction backing — countme has no live
  // allocation-number issuance, so a real accountant relying on that wording
  // above threshold could have the deduction rejected by the Tax Authority.
  const needsAllocationNumber =
    isPaymentDoc && !isPatur && requiresAllocationNumber(invoice.amount, invoice.date);

  // Initial of the trade name for the issuer monogram (mockup: navy circle, beige glyph).
  const monogram = persona.business.tradeName?.trim().charAt(0) || "C";

  // Share via signed public link (approved 19/07); falls back to text-only
  // when DOC_LINK_SECRET is not configured on the server.
  async function shareDoc(channel: "whatsapp" | "email") {
    if (!persona || !invoice) return;
    const shareTitle = `${docTitle} ${invoice.invoiceNumber} — ${persona.business.tradeName}`;
    let link = "";
    try {
      const res = await fetch("/api/doc-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc: {
            invoiceNumber: invoice.invoiceNumber,
            date: invoice.date,
            customerName: invoice.customerName,
            description: invoice.description,
            amount: invoice.amount,
            vat: invoice.vat,
            total: invoice.total,
            docType,
            ...(invoice.dueDate ? { dueDate: invoice.dueDate } : {}),
            ...(invoice.validUntil ? { validUntil: invoice.validUntil } : {}),
          },
          business: {
            tradeName: persona.business.tradeName,
            osekType: persona.business.osekType,
          },
        }),
      });
      if (res.ok) {
        const { token, shortId } = (await res.json()) as {
          token: string;
          shortId: string | null;
        };
        // Prefer the short /s/{id} link — the long /d/{token} link is long
        // enough (~479 chars) that WhatsApp's own message-linkifier only
        // recognizes part of it as a URL, leaving recipients with a dead
        // partial link (QA #32). Falls back to the long link when the
        // short-id mint failed server-side (e.g. DB unavailable).
        link = shortId
          ? `${window.location.origin}/s/${shortId}`
          : `${window.location.origin}/d/${encodeURIComponent(token)}`;
      }
    } catch {
      /* text-only fallback */
    }
    const text =
      `שלום ${invoice.customerName}, מצורף ${docTitle} ${invoice.invoiceNumber} ` +
      `על סך ${invoice.total.toLocaleString("he-IL")} ₪ מאת ${persona.business.tradeName}.` +
      (link ? `\nלצפייה במסמך: ${link}` : "");
    const encoded = encodeURIComponent(text);
    if (channel === "whatsapp") {
      window.open(`https://wa.me/?text=${encoded}`, "_blank", "noopener");
    } else {
      window.location.href = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encoded}`;
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Print/screen header — hidden in print */}
      <AppHeader
        pageLabel={docTitle}
        className="no-print"
        actions={
          <>
            <Link
              href="/invoices"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand-navy transition-colors"
            >
              <ArrowRightIcon className="size-4" />
              חזרה לרשימה
            </Link>
            <button onClick={() => shareDoc("whatsapp")} className={btn("primary", "sm")}>
              שיתוף בוואטסאפ
            </button>
            <button onClick={() => shareDoc("email")} className={btn("ghost", "sm")}>
              במייל
            </button>
            <button
              onClick={() => window.print()}
              className={btn("secondary", "sm")}
            >
              <DownloadIcon className="size-4" />
              הדפס / PDF
            </button>
          </>
        }
      />

      {/* Invoice document — this is what prints */}
      <div className="docwrap mx-auto max-w-3xl px-6 py-10">
        <div className="invoice-document mx-auto bg-paper shadow-brand border border-line rounded-xl overflow-hidden no-print-shadow" dir="rtl">

          {/* Document header: two columns — issuer (right) + recipient/title (left, navy bg) */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.1fr]">
            {/* Issuer column */}
            <div className="px-8 py-10 flex flex-col items-center text-center">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- private signed URL, not an optimizable static asset
                <img
                  src={logoUrl}
                  alt={persona.business.tradeName}
                  className="size-24 rounded-full border border-line object-contain bg-paper mb-4"
                />
              ) : (
                <div className="size-24 rounded-full bg-brand-navy flex items-center justify-center mb-4">
                  <span className="font-display text-4xl font-extrabold text-brand leading-none">{monogram}</span>
                </div>
              )}
              <p className="text-[17px] font-extrabold text-brand-navy leading-snug">{persona.business.tradeName}</p>
              <p className="text-[13px] text-muted mt-2.5 leading-[1.7]">
                {isPatur ? "עוסק פטור" : "עוסק מורשה"} {persona.business.osekFileNumber}
                {persona.contact?.mailingAddress && (
                  <><br />{persona.contact.mailingAddress.street} {persona.contact.mailingAddress.houseNumber}, {persona.contact.mailingAddress.city}</>
                )}
                {persona.contact?.phoneMobile && <><br />{persona.contact.phoneMobile}</>}
                {persona.contact?.email && <><br />{persona.contact.email}</>}
              </p>
            </div>

            {/* Recipient + document title column (navy) */}
            <div className="invoice-head bg-brand-navy px-8 py-10 text-white">
              <div className="flex justify-between text-[13px] text-aqua mb-1.5">
                <span className="tabular-nums">{formatHebrewDate(invoice.date)}</span>
                <span>לכבוד:</span>
              </div>
              <p className="text-[15px] font-bold text-white text-end">{invoice.customerName}</p>
              {invoice.customerTaxId && (
                <p className="text-[13px] text-aqua text-end mt-3.5">ח.פ / ת.ז {invoice.customerTaxId}</p>
              )}
              <div className="h-px bg-aqua/30 my-[22px]" />
              <h1 className="font-display text-[30px] font-extrabold tracking-tight leading-tight">{docTitle} {invoice.invoiceNumber}</h1>
              {isPaymentDoc && (
                <p className="text-[13.5px] text-aqua mt-1">העתק נאמן למקור</p>
              )}
              {docType === "tax-invoice-receipt" && (
                <p className="text-[13px] text-aqua mt-[18px]">לתשלום עד {formatHebrewDate(invoice.date)}</p>
              )}
              {docType === "business-account" && (
                <p className="text-[13px] text-aqua mt-[18px]">
                  {invoice.dueDate
                    ? `לתשלום עד ${formatHebrewDate(invoice.dueDate)}`
                    : "דרישת תשלום"}
                </p>
              )}
              {docType === "quote" && (
                <p className="text-[13px] text-aqua mt-[18px]">
                  {invoice.validUntil
                    ? `ההצעה בתוקף עד ${formatHebrewDate(invoice.validUntil)}`
                    : "הצעה ללא התחייבות"}
                </p>
              )}
              {isReceipt && (
                <p className="text-[13px] text-aqua mt-[18px]">התקבל במלואו · תודה על התשלום</p>
              )}
            </div>
          </div>

          {/* Document body */}
          <div className="px-8 pt-9 pb-8">
            {invoice.description && (
              <p className="text-[15px] font-extrabold text-brand-navy text-start mb-[18px]">{invoice.description}</p>
            )}

            {/* Line items table */}
            <table className="w-full mb-6 text-sm border-collapse">
              <thead>
                <tr className="border-b border-line">
                  {isReceipt ? (
                    <>
                      <th className="px-1.5 pb-3 text-end font-bold text-muted text-[13px]">תאריך</th>
                      <th className="px-1.5 pb-3 text-end font-bold text-muted text-[13px] w-full">אופן התקבול</th>
                      <th className="px-1.5 pb-3 text-start font-bold text-muted text-[13px]">סכום</th>
                    </>
                  ) : (
                    <>
                      <th className="px-1.5 pb-3 text-end font-bold text-muted text-[13px]">כמות</th>
                      <th className="px-1.5 pb-3 text-end font-bold text-muted text-[13px] w-full">פירוט</th>
                      <th className="px-1.5 pb-3 text-start font-bold text-muted text-[13px]">מחיר</th>
                      <th className="px-1.5 pb-3 text-start font-bold text-muted text-[13px]">סה&quot;כ</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {isReceipt ? (
                  <tr className="border-b border-line-soft">
                    <td className="px-1.5 py-[13px] text-center text-muted text-[13px] tabular-nums">{formatHebrewDate(invoice.date)}</td>
                    <td className="px-1.5 py-[13px] text-end font-semibold text-ink">{invoice.description}</td>
                    <td className="px-1.5 py-[13px] text-start font-medium text-ink tabular-nums" dir="ltr">&#x20AA;{invoice.total.toLocaleString("he-IL")}</td>
                  </tr>
                ) : (
                  <tr className="border-b border-line-soft">
                    <td className="px-1.5 py-[13px] text-center text-muted">1</td>
                    <td className="px-1.5 py-[13px] text-end font-semibold text-ink">{invoice.description}</td>
                    <td className="px-1.5 py-[13px] text-start font-medium text-ink tabular-nums" dir="ltr">&#x20AA;{invoice.amount.toLocaleString("he-IL")}</td>
                    <td className="px-1.5 py-[13px] text-start font-medium text-ink tabular-nums" dir="ltr">&#x20AA;{invoice.amount.toLocaleString("he-IL")}</td>
                  </tr>
                )}
                {/* Sub-total row */}
                {!isReceipt && (
                  <tr className="border-b border-line-soft">
                    <td colSpan={2} className="px-1.5 py-2 text-end font-semibold text-muted text-sm">סה&quot;כ</td>
                    <td colSpan={2} className="px-1.5 py-2 text-start font-bold text-brand-navy text-sm tabular-nums" dir="ltr">&#x20AA;{invoice.amount.toLocaleString("he-IL")}</td>
                  </tr>
                )}
                {/* VAT row */}
                {!isReceipt && (
                  <tr className="border-b border-line-soft">
                    <td colSpan={2} className="px-1.5 py-2 text-end font-semibold text-muted text-sm">
                      מע&quot;מ {isPatur ? "0% (עוסק פטור)" : `${Math.round((invoice.vat / (invoice.amount || 1)) * 100)}%`}
                    </td>
                    <td colSpan={2} className="px-1.5 py-2 text-start font-bold text-brand-navy text-sm tabular-nums" dir="ltr">&#x20AA;{invoice.vat.toLocaleString("he-IL")}</td>
                  </tr>
                )}
                {/* Receipt total label */}
                {isReceipt && (
                  <tr>
                    <td colSpan={2} className="px-1.5 py-2 text-end font-semibold text-muted text-sm">סה&quot;כ התקבל</td>
                    <td className="px-1.5 py-2 text-start font-bold text-brand-navy text-sm tabular-nums" dir="ltr">&#x20AA;{invoice.total.toLocaleString("he-IL")}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Total pill + bank details */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="text-[13px] text-muted leading-relaxed max-w-[55%]">
                {persona.bank?.bankName && (
                  <p>בנק {persona.bank.bankName} ({persona.bank.bankCode}), סניף {persona.bank.branchCode}, חשבון {persona.bank.accountNumber}{persona.bank.accountOwnerName ? `, מוטב: ${persona.bank.accountOwnerName}` : ""}</p>
                )}
                {isReceipt && (
                  <p className="mt-1">קבלה זו מהווה אישור על קבלת התשלום.</p>
                )}
              </div>
              <div className="bg-brand-navy text-white rounded-[10px] px-6 py-3.5 flex items-center gap-7 shrink-0">
                <span className="text-sm font-bold text-aqua">{isReceipt ? "סה״כ שולם" : "סה״כ לתשלום"}</span>
                <span className="text-xl font-extrabold tabular-nums" dir="ltr">&#x20AA;{invoice.total.toLocaleString("he-IL")}</span>
              </div>
            </div>

            {/* Payment confirmation block — payment docs ONLY (a quote or a
                business-account attests nothing about payment) */}
            {isPaymentDoc && (
              <div className="mb-4 rounded-xl border border-success/30 bg-success-light px-4 py-3 flex items-start gap-3">
                <CheckCircleIcon className="size-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-success">קבלת תשלום מאושרת</p>
                  <p className="text-xs text-success/80 mt-0.5">
                    מאשרים בזאת קבלת סך {invoice.total.toLocaleString("he-IL")} &#x20AA; עבור השירות המפורט לעיל.
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Fixed footer note (set in /invoices/settings) — part of the
              printable document, not just an on-screen aside. */}
          {persona.business.documentFooterNote && (
            <div className="border-t border-line px-8 py-4 text-[13px] text-ink leading-relaxed whitespace-pre-wrap">
              {persona.business.documentFooterNote}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-line px-8 py-[22px] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {signatureUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- private signed URL, not an optimizable static asset
                <img
                  src={signatureUrl}
                  alt="חתימה"
                  className="h-10 w-auto object-contain"
                />
              )}
              <div>
                <p className="text-base font-extrabold text-brand-navy">חתימה דיגיטלית מאובטחת</p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-faint">
                  <span>מסמך ממוחשב הופק על ידי</span>
                  <LogoMark size={12} className="text-brand" />
                  <span className="font-extrabold text-teal-600">CountMe</span>
                </div>
              </div>
            </div>
            <p className="text-[11.5px] text-faint tabular-nums">
              הופק {formatHebrewDate(invoice.date)} | {docTitle} {invoice.invoiceNumber} | עמוד 1 מתוך 1
            </p>
          </div>
        </div>

        {/* Legal footer text — visible below card */}
        <div className="no-print mx-auto mt-6 px-2 text-xs text-faint leading-relaxed space-y-1">
          {isPaymentDoc && isPatur && <p>עוסק פטור ממע&quot;מ לפי סעיף 31(1) לחוק מע&quot;מ — אין חיוב מע&quot;מ.</p>}
          {isPaymentDoc && !isPatur && !needsAllocationNumber && (
            <p>חשבונית מס זו מהווה אסמכתא לקיזוז מע&quot;מ תשומות ולפי סעיף 38 לחוק מע&quot;מ.</p>
          )}
          {/* DRAFT — NEEDS LEGAL REVIEW: countme has no live SHAAM allocation-
              number issuance (phase 2) — above the current threshold the
              document must say so instead of asserting unconditional
              deduction support (legal-blocker fix, audit 2026-08-18). */}
          {needsAllocationNumber && (
            <p>
              חשבונית מס מעל {ils(allocationNumberThreshold(invoice.date))} (ללא מע&quot;מ) מחייבת מספר
              הקצאה מרשות המסים כדי לשמש לקיזוז מע&quot;מ תשומות — countme אינה מנפיקה עדיין מספר הקצאה
              (בקרוב). יש לוודא מול רואה החשבון כיצד להשלים את הדרישה עד אז.
            </p>
          )}
          {/* DRAFT — NEEDS LEGAL REVIEW (Roy: חשבונית ישראל / doc requirements) */}
          {docType === "business-account" && (
            <p>חשבון עסקה — דרישת תשלום בלבד; אינו מסמך מס. קבלה תופק עם קבלת התשלום.</p>
          )}
          {docType === "quote" && (
            <p>הצעת מחיר — אינה מסמך מס ואינה מחייבת עד לאישור ההזמנה.</p>
          )}
          <p>חתימה דיגיטלית: {persona.business.tradeName} · {new Date().toISOString().split("T")[0]}</p>
          <p className="text-[10px]">
            הופק באמצעות countme
            {` · ${new URL(getSiteOrigin()).hostname}`}
          </p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .no-print-shadow { box-shadow: none !important; border-radius: 0 !important; }
          .docwrap { padding: 0 !important; max-width: 100% !important; }
          .invoice-document {
            max-width: 100% !important;
            margin: 0 !important;
            border: none !important;
          }
          /* Keep navy recipient/title block ink-true when printing. */
          .invoice-head { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
