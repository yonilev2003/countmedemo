"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPersona, savePersona } from "@/lib/setup-storage";
import { nextInvoiceNumber, validateInvoice, calculateInvoiceTotals } from "@/lib/invoice-generator/index";
import { Persona, InvoiceLine, InvoiceDocType } from "@/lib/persona";

const DOC_TYPE_LABELS: Record<InvoiceDocType, { title: string; sub: string; cta: string }> = {
  "tax-invoice-receipt": {
    title: "חשבונית מס/קבלה",
    sub: "חשבונית מס + אישור על קבלת תשלום (305) — הנפוץ ביותר לעצמאיים",
    cta: "הפק חשבונית מס/קבלה",
  },
  receipt: {
    title: "קבלה",
    sub: "אישור על קבלת תשלום בלבד (320) — בעיקר אחרי הפקת חשבונית מס נפרדת",
    cta: "הפק קבלה",
  },
};

export default function NewInvoicePage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [docType, setDocType] = useState<InvoiceDocType>("tax-invoice-receipt");
  const [form, setForm] = useState({
    customerName: "",
    customerTaxId: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    category: "",
  });
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const p = loadPersona();
    if (!p) { router.push("/setup"); return; }
    setPersona(p);
  }, [router]);

  if (!persona) return null;

  const amount = Number(form.amount) || 0;
  const totals = calculateInvoiceTotals(amount, persona.business.osekType);

  function handleSubmit() {
    if (!persona) return;
    const errs = validateInvoice({ ...form, amount });
    if (errs.length > 0) { setErrors(errs); return; }

    const invoiceNumber = nextInvoiceNumber(persona);
    const newInvoice: InvoiceLine = {
      invoiceNumber,
      date: form.date,
      customerName: form.customerName,
      customerTaxId: form.customerTaxId || undefined,
      description: form.description,
      amount: totals.net,
      vat: totals.vat,
      total: totals.total,
      category: form.category || undefined,
      docType,
    };

    const updatedPersona = {
      ...persona,
      invoiceCounter: (persona.invoiceCounter ?? 1) + 1,
      income: {
        ...persona.income,
        invoices: [...(persona.income.invoices ?? []), newInvoice],
        totalRevenue: persona.income.totalRevenue + totals.total,
      },
    };

    savePersona(updatedPersona);
    router.push(`/invoices/${invoiceNumber}`);
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-stone-200">
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-6 py-4">
          <Link href="/invoices" className="text-sm text-stone-600 hover:text-brand-navy">&#x2190; חזרה לרשימה</Link>
          <span className="font-bold">חשבונית / קבלה חדשה</span>
          <div />
        </div>
      </header>

      <main className="mx-auto max-w-screen-md px-6 py-8">
        {/* Doc type selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {(Object.keys(DOC_TYPE_LABELS) as InvoiceDocType[]).map(t => {
            const labels = DOC_TYPE_LABELS[t];
            const active = docType === t;
            return (
              <button
                key={t}
                onClick={() => setDocType(t)}
                className={`text-right rounded-xl border-2 px-4 py-3 transition-colors ${
                  active ? "border-brand-navy bg-brand-navy/5" : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <div className={`text-sm font-bold ${active ? "text-brand-navy" : "text-stone-700"}`}>
                  {labels.title}
                </div>
                <div className="text-xs text-stone-500 mt-1 leading-snug">{labels.sub}</div>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl bg-white border border-stone-200 p-6 space-y-4">
          {errors.length > 0 && (
            <div className="rounded-lg bg-alert/10 border border-alert/20 p-3">
              {errors.map((e, i) => <p key={i} className="text-sm text-alert">{e}</p>)}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">תאריך</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-info" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">קטגוריה (אופציונלי)</label>
              <input type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                placeholder="ייעוץ, עיצוב, פיתוח..."
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-info" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">שם הלקוח</label>
            <input type="text" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})}
              placeholder='חברה בע"מ / שם פרטי'
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-info" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              ת.ז. / ח.פ. לקוח {amount > 5000 && <span className="text-alert text-xs">* נדרש מעל 5,000 &#x20AA;</span>}
            </label>
            <input type="text" value={form.customerTaxId} onChange={e => setForm({...form, customerTaxId: e.target.value})}
              placeholder="123456789"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-info" dir="ltr" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">תיאור השירות / המוצר</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              placeholder="פירוט השירות שניתן"
              rows={2}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-info resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              סכום {persona.business.osekType === "morshe" ? '(לפני מע"מ)' : ""}
            </label>
            <input type="number" min={0} value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
              placeholder="0"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-info" dir="ltr" />
            {amount > 0 && (
              <div className="mt-2 rounded-lg bg-info/20 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-stone-600">סכום נטו</span><span dir="ltr">&#x20AA;{totals.net.toLocaleString("he-IL")}</span></div>
                {totals.vat > 0 && <div className="flex justify-between"><span className="text-stone-600">מע&quot;מ 17%</span><span dir="ltr">&#x20AA;{totals.vat.toLocaleString("he-IL")}</span></div>}
                <div className="flex justify-between font-semibold text-brand-navy"><span>סה&quot;כ לתשלום</span><span dir="ltr">&#x20AA;{totals.total.toLocaleString("he-IL")}</span></div>
              </div>
            )}
          </div>

          <button onClick={handleSubmit}
            className="w-full rounded-full bg-brand-navy py-3 text-sm font-medium text-white hover:bg-brand-navy/90 transition-colors shadow-sm">
            {DOC_TYPE_LABELS[docType].cta} &#x2190;
          </button>
        </div>
      </main>
    </div>
  );
}
