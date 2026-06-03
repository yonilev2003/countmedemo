"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPersona, savePersona } from "@/lib/setup-storage";
import { nextInvoiceNumber, validateInvoice, calculateInvoiceTotals } from "@/lib/invoice-generator/index";
import { Persona, InvoiceLine, InvoiceDocType } from "@/lib/persona";
import { Logo } from "@/components/brand/logo";
import { btn, Button } from "@/components/brand/button";
import { ArrowRightIcon, MicIcon, CheckCircleIcon, CalendarIcon, UserIcon, FileTextIcon, PercentIcon } from "@/components/brand/icons";

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

/* Minimal types for the Web Speech API — TS lib.dom doesn't ship them. */
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: { 0: { transcript: string }; isFinal: boolean; length: number };
  };
};
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function monthFromIsoDate(iso: string): string | null {
  // "YYYY-MM-DD" → "YYYY-MM"
  const parts = iso.split("-");
  if (parts.length < 2) return null;
  return `${parts[0]}-${parts[1]}`;
}

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

  // Voice input state
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceMsg, setVoiceMsg] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const p = loadPersona();
    if (!p) { router.push("/setup"); return; }
    setPersona(p);
    setVoiceSupported(getRecognitionCtor() !== null);
  }, [router]);

  useEffect(() => {
    return () => {
      // Stop recognition on unmount
      recognitionRef.current?.stop();
    };
  }, []);

  if (!persona) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="space-y-3 w-96 animate-pulse">
        <div className="h-6 rounded-lg bg-sand w-1/2 mx-auto" />
        <div className="h-12 rounded-xl bg-sand" />
        <div className="h-48 rounded-2xl bg-sand" />
      </div>
    </div>
  );

  const amount = Number(form.amount) || 0;
  const totals = calculateInvoiceTotals(amount, persona.business.osekType);

  function startListening() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setVoiceMsg("הדפדפן הזה לא תומך בהקראה — Chrome או Edge יעבדו טוב.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "he-IL";
    rec.continuous = false;
    rec.interimResults = true;
    setTranscript("");
    setVoiceMsg(null);

    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text);
    };
    rec.onerror = (e) => {
      setListening(false);
      setVoiceMsg(`שגיאת הקלטה: ${e.error ?? "לא ידוע"}`);
    };
    rec.onend = () => {
      setListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function parseTranscriptToForm() {
    if (!transcript.trim()) return;
    setParsing(true);
    setVoiceMsg(null);
    try {
      const resp = await fetch("/api/parse-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "תשובה לא תקינה מהשרת" }));
        setVoiceMsg(`לא הצלחתי לפענח: ${err.error ?? resp.status}`);
        return;
      }
      const parsed = await resp.json() as {
        customerName: string; customerTaxId: string; description: string;
        amount: number; category: string; docType: InvoiceDocType;
      };
      setForm((f) => ({
        ...f,
        customerName: parsed.customerName || f.customerName,
        customerTaxId: parsed.customerTaxId || f.customerTaxId,
        description: parsed.description || f.description,
        amount: parsed.amount > 0 ? String(parsed.amount) : f.amount,
        category: parsed.category || f.category,
      }));
      if (parsed.docType) setDocType(parsed.docType);
      setVoiceMsg("מילאתי את הטופס מהדיבור — בדקי וערכי לפי הצורך.");
    } catch {
      setVoiceMsg("שגיאת רשת בפענוח הדיבור. נסי שוב או הקלידי ידנית.");
    } finally {
      setParsing(false);
    }
  }

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

    // Sync: also push the revenue into monthlyBreakdown so the dashboard
    // chart reflects the new invoice immediately (it currently uses
    // monthlyBreakdown as authoritative when ≥ 6 months exist).
    const monthKey = monthFromIsoDate(form.date);
    const mb = [...(persona.income.monthlyBreakdown ?? [])];
    if (monthKey) {
      const idx = mb.findIndex((r) => String(r.month) === monthKey);
      if (idx >= 0) {
        mb[idx] = { ...mb[idx], revenue: mb[idx].revenue + totals.total };
      } else {
        mb.push({ month: monthKey, revenue: totals.total, expenses: 0 });
      }
    }

    const updatedPersona: Persona = {
      ...persona,
      invoiceCounter: (persona.invoiceCounter ?? 1) + 1,
      income: {
        ...persona.income,
        invoices: [...(persona.income.invoices ?? []), newInvoice],
        totalRevenue: persona.income.totalRevenue + totals.total,
        invoiceCount: (persona.income.invoiceCount ?? 0) + 1,
        monthlyBreakdown: mb,
      },
    };

    savePersona(updatedPersona);
    router.push(`/invoices/${invoiceNumber}`);
  }

  const inputClass = "w-full border-b border-line bg-transparent px-1 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-brand-deep transition-colors";
  const labelClass = "block text-xs font-semibold text-muted mb-1";

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-6 py-4">
          <Link href="/invoices" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand-navy transition-colors">
            <ArrowRightIcon className="size-4" />
            חזרה לרשימה
          </Link>
          <Logo size={22} />
          <div />
        </div>
      </header>

      <main className="mx-auto max-w-screen-md px-6 py-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-deep mb-1">הפקת מסמך חדש</p>
          <h1 className="font-display text-2xl font-bold text-brand-navy">חשבונית / קבלה חדשה</h1>
        </div>

        {/* Voice dictation card */}
        {voiceSupported && (
          <div className="mb-6 rounded-2xl border border-line bg-paper shadow-brand-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MicIcon className="size-4 text-brand-deep" />
                  <span className="text-sm font-bold text-brand-navy">דיבור במקום הקלדה</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  לחצי על המיקרופון ואמרי משפט כמו:{" "}
                  <span className="font-medium text-ink">"חשבונית מס קבלה לדנה כהן עבור ייעוץ עיצוב בסך 3,000 שקלים"</span>
                </p>
              </div>
              <button
                onClick={listening ? stopListening : startListening}
                disabled={parsing}
                className={`shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-brand-sm transition-all ${
                  listening
                    ? "bg-alert text-white animate-pulse"
                    : "bg-brand-navy text-white hover:bg-navy-900"
                } disabled:opacity-50`}
              >
                <MicIcon className="size-4" />
                <span>{listening ? "עצור" : "הקלטה"}</span>
              </button>
            </div>

            {(transcript || listening) && (
              <div className="rounded-xl border border-line bg-cream px-3 py-2.5 text-sm text-ink min-h-[40px]">
                {transcript || <span className="text-faint">מקשיב…</span>}
              </div>
            )}

            {transcript && !listening && (
              <div className="mt-3 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={parseTranscriptToForm}
                  disabled={parsing}
                  className="bg-teal-100 text-teal-600 hover:bg-teal-100"
                >
                  <CheckCircleIcon className="size-4" />
                  {parsing ? "מפענח…" : "מלא טופס מהדיבור"}
                </Button>
                <button
                  onClick={() => { setTranscript(""); setVoiceMsg(null); }}
                  className="text-xs text-faint hover:text-muted transition-colors"
                >
                  נקה
                </button>
              </div>
            )}

            {voiceMsg && (
              <div className="mt-3 text-xs text-ink bg-info/30 rounded-lg px-3 py-2 border border-line">{voiceMsg}</div>
            )}
          </div>
        )}

        {/* Doc type selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {(Object.keys(DOC_TYPE_LABELS) as InvoiceDocType[]).map(t => {
            const labels = DOC_TYPE_LABELS[t];
            const active = docType === t;
            return (
              <button
                key={t}
                onClick={() => setDocType(t)}
                className={`text-end rounded-2xl border-2 px-4 py-3.5 transition-all ${
                  active
                    ? "border-brand-navy bg-brand-navy/5 shadow-brand-sm"
                    : "border-line bg-paper hover:border-brand-deep hover:bg-aqua-soft"
                }`}
              >
                <div className={`text-sm font-bold ${active ? "text-brand-navy" : "text-ink"}`}>
                  {labels.title}
                </div>
                <div className="text-xs text-muted mt-1 leading-snug">{labels.sub}</div>
              </button>
            );
          })}
        </div>

        {/* Main form card */}
        <div className="rounded-2xl bg-paper border border-line shadow-brand p-6 space-y-6">
          {errors.length > 0 && (
            <div className="rounded-xl bg-overdue-bg border border-alert/20 p-3">
              {errors.map((e, i) => <p key={i} className="text-sm text-alert">{e}</p>)}
            </div>
          )}

          {/* Document details block */}
          <div className="pb-6 border-b border-line">
            <h2 className="text-sm font-bold text-brand-navy mb-4">פרטי המסמך</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1"><CalendarIcon className="size-3.5" />תאריך</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                  className={inputClass}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1"><FileTextIcon className="size-3.5" />קטגוריה (אופציונלי)</span>
                </label>
                <input
                  type="text"
                  value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}
                  placeholder="ייעוץ, עיצוב, פיתוח..."
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Customer block */}
          <div className="pb-6 border-b border-line">
            <h2 className="text-sm font-bold text-brand-navy mb-4">פרטי הלקוח</h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1"><UserIcon className="size-3.5" />שם הלקוח <span className="text-alert">*</span></span>
                </label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={e => setForm({...form, customerName: e.target.value})}
                  placeholder='חברה בע"מ / שם פרטי'
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  ת.ז. / ח.פ. לקוח{amount > 5000 && <span className="text-alert text-xs me-1"> — נדרש מעל 5,000 &#x20AA;</span>}
                </label>
                <input
                  type="text"
                  value={form.customerTaxId}
                  onChange={e => setForm({...form, customerTaxId: e.target.value})}
                  placeholder="123456789"
                  className={inputClass}
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Service description block */}
          <div className="pb-6 border-b border-line">
            <h2 className="text-sm font-bold text-brand-navy mb-4">פירוט השירות</h2>
            <div>
              <label className={labelClass}>תיאור השירות / המוצר <span className="text-alert">*</span></label>
              <textarea
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="פירוט השירות שניתן"
                rows={2}
                className="w-full border-b border-line bg-transparent px-1 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-brand-deep transition-colors resize-none"
              />
            </div>
          </div>

          {/* Amount block */}
          <div>
            <h2 className="text-sm font-bold text-brand-navy mb-4">
              <span className="inline-flex items-center gap-1.5">
                <PercentIcon className="size-4 text-brand-deep" />
                סכום{persona.business.osekType === "morshe" ? ' (לפני מע"מ)' : ""}
              </span>
            </h2>
            <div>
              <label className={labelClass}>סכום <span className="text-alert">*</span></label>
              <input
                type="number"
                min={0}
                value={form.amount}
                onChange={e => setForm({...form, amount: e.target.value})}
                placeholder="0"
                className={inputClass}
                dir="ltr"
              />
              {amount > 0 && (
                <div className="mt-3 rounded-xl bg-info/30 border border-line p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">סכום נטו</span>
                    <span dir="ltr" className="font-medium text-ink">&#x20AA;{totals.net.toLocaleString("he-IL")}</span>
                  </div>
                  {totals.vat > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">מע&quot;מ 17%</span>
                      <span dir="ltr" className="font-medium text-ink">&#x20AA;{totals.vat.toLocaleString("he-IL")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-brand-navy border-t border-line pt-2">
                    <span>סה&quot;כ לתשלום</span>
                    <span dir="ltr">&#x20AA;{totals.total.toLocaleString("he-IL")}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-faint text-center leading-relaxed">
            עם השמירה — הסכום מתעדכן מיד גם בדשבורד, גם ב-/demo (שדה 238 / שדה 150) ובכל החישובים האישיים.
          </p>

          <button
            onClick={handleSubmit}
            className={btn("primary", "md", "w-full")}
          >
            {DOC_TYPE_LABELS[docType].cta}
          </button>
        </div>
      </main>
    </div>
  );
}
