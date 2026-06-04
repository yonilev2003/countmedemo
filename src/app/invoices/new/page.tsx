"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPersona, savePersona } from "@/lib/setup-storage";
import { nextInvoiceNumber, validateInvoice, calculateInvoiceTotals } from "@/lib/invoice-generator/index";
import { Persona, InvoiceLine, InvoiceDocType } from "@/lib/persona";
import { Logo } from "@/components/brand/logo";
import { btn, Button } from "@/components/brand/button";
import {
  ArrowRightIcon,
  MicIcon,
  CheckCircleIcon,
  CalendarIcon,
  UserIcon,
  FileTextIcon,
  PercentIcon,
  SettingsIcon,
} from "@/components/brand/icons";

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
  const isPatur = persona.business.osekType === "patur";

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

  // Underline field, lifted from the mockup `.uline`: leading icon + input,
  // border-bottom that turns teal on focus.
  const ulineClass =
    "flex items-center gap-2.5 border-b-[1.5px] border-line px-0.5 py-2 transition-colors focus-within:border-brand-deep";
  const ulineInput =
    "flex-1 min-w-0 bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none text-end";
  const fieldLabel = "block text-[13px] font-semibold text-muted mb-2";

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-lg items-center justify-between px-6 py-4">
          <Link href="/invoices" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand-navy transition-colors">
            <ArrowRightIcon className="size-4" />
            חזרה לרשימה
          </Link>
          <Logo size={22} />
          <div className="w-24" />
        </div>
      </header>

      <main className="mx-auto max-w-screen-lg px-6 py-10">
        {/* Page head — mockup `.pagehead` with eyebrow */}
        <div className="mb-9">
          <div className="mb-3 inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.04em] text-teal-600">
            <span className="size-[7px] rounded-full bg-brand" />
            CountMe · Invoicing
          </div>
          <h1 className="font-display text-[32px] font-extrabold tracking-tight text-brand-navy">
            הפקת חשבונית / קבלה
          </h1>
          <p className="mt-2.5 max-w-2xl text-[15.5px] leading-relaxed text-muted">
            תהליך יצירת מסמך — מהעריכה ועד התוצאה הסופית. כל השדות פתוחים לעריכה, והסכום מתעדכן מיד בכל החישובים האישיים.
          </p>
        </div>

        {/* Voice dictation card */}
        {voiceSupported && (
          <div className="mb-7 rounded-2xl border border-line bg-paper shadow-brand p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MicIcon className="size-4 text-brand-deep" />
                  <span className="text-sm font-bold text-brand-navy">דיבור במקום הקלדה</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  לחצי על המיקרופון ואמרי משפט כמו:{" "}
                  <span className="font-medium text-ink">&quot;חשבונית מס קבלה לדנה כהן עבור ייעוץ עיצוב בסך 3,000 שקלים&quot;</span>
                </p>
              </div>
              <button
                onClick={listening ? stopListening : startListening}
                disabled={parsing}
                className={`shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-brand transition-all ${
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
              <div className="mt-3 text-xs text-ink bg-aqua-soft rounded-lg px-3 py-2 border border-line">{voiceMsg}</div>
            )}
          </div>
        )}

        {/* Editor shell — mockup `.editor` */}
        <div className="overflow-hidden rounded-[20px] border border-line bg-cream shadow-brand">
          {/* `.ed-top` — title + meta + settings */}
          <div className="flex items-start justify-between gap-4 border-b border-line bg-paper px-7 py-6">
            <div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-brand-navy">
                {DOC_TYPE_LABELS[docType].title} · {persona.business.tradeName}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[13.5px] text-muted">
                <span>מטבע: <b className="font-bold text-brand-navy">שקל</b></span>
                <span>שפה: <b className="font-bold text-brand-navy">עברית</b></span>
                <span>עוסק: <b className="font-bold text-brand-navy">{isPatur ? "פטור" : "מורשה"}</b></span>
              </div>
            </div>
            <Link
              href="/setup"
              className="inline-flex shrink-0 items-center gap-1.5 border-b-[1.5px] border-teal-100 pb-0.5 text-sm font-bold text-teal-600 transition-colors hover:border-brand-deep"
            >
              לעריכת ההגדרות
              <SettingsIcon className="size-3.5" />
            </Link>
          </div>

          {/* `.ed-body` */}
          <div className="px-7 pb-7 pt-3.5">
            {errors.length > 0 && (
              <div className="mt-5 rounded-xl bg-overdue-bg border border-alert/20 p-3">
                {errors.map((e, i) => <p key={i} className="text-sm text-alert">{e}</p>)}
              </div>
            )}

            {/* Document type block */}
            <div className="border-b border-line py-7">
              <h3 className="mb-5 text-end text-[19px] font-extrabold text-brand-navy">סוג המסמך</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(Object.keys(DOC_TYPE_LABELS) as InvoiceDocType[]).map(t => {
                  const labels = DOC_TYPE_LABELS[t];
                  const active = docType === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setDocType(t)}
                      className={`rounded-2xl border-2 px-4 py-3.5 text-end transition-all ${
                        active
                          ? "border-brand-navy bg-brand-navy/5 shadow-brand"
                          : "border-line bg-paper hover:border-brand-deep hover:bg-aqua-soft"
                      }`}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {active && <CheckCircleIcon className="size-4 text-brand-navy" />}
                        <span className={`text-sm font-bold ${active ? "text-brand-navy" : "text-ink"}`}>
                          {labels.title}
                        </span>
                      </div>
                      <div className="mt-1 text-xs leading-snug text-muted">{labels.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Document details block */}
            <div className="border-b border-line py-7">
              <h3 className="mb-5 text-end text-[19px] font-extrabold text-brand-navy">פרטי המסמך</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div>
                  <label className={fieldLabel}>
                    תאריך מסמך <span className="text-beige-600">*</span>
                  </label>
                  <div className={ulineClass}>
                    <CalendarIcon className="size-[18px] shrink-0 text-faint" />
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm({...form, date: e.target.value})}
                      className={ulineInput}
                      dir="ltr"
                    />
                  </div>
                </div>
                <div>
                  <label className={fieldLabel}>קטגוריה (לא חובה)</label>
                  <div className={ulineClass}>
                    <FileTextIcon className="size-[18px] shrink-0 text-faint" />
                    <input
                      type="text"
                      value={form.category}
                      onChange={e => setForm({...form, category: e.target.value})}
                      placeholder="ייעוץ, עיצוב, פיתוח…"
                      className={ulineInput}
                    />
                  </div>
                </div>
                <div>
                  <label className={fieldLabel}>שם הלקוח <span className="text-beige-600">*</span></label>
                  <div className={ulineClass}>
                    <UserIcon className="size-[18px] shrink-0 text-faint" />
                    <input
                      type="text"
                      value={form.customerName}
                      onChange={e => setForm({...form, customerName: e.target.value})}
                      placeholder="שם הלקוח (שמור או מזדמן)"
                      className={ulineInput}
                    />
                  </div>
                </div>
              </div>

              {/* Customer tax id — second row */}
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className={fieldLabel}>
                    ת.ז. / ח.פ. לקוח
                    {amount > 5000 && <span className="ms-1 text-xs text-alert">— נדרש מעל 5,000 ₪</span>}
                  </label>
                  <div className={ulineClass}>
                    <UserIcon className="size-[18px] shrink-0 text-faint" />
                    <input
                      type="text"
                      value={form.customerTaxId}
                      onChange={e => setForm({...form, customerTaxId: e.target.value})}
                      placeholder="123456789"
                      className={ulineInput}
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Service description block */}
            <div className="border-b border-line py-7">
              <h3 className="mb-5 text-end text-[19px] font-extrabold text-brand-navy">תיאור תכולת המסמך</h3>
              <label className={fieldLabel}>תיאור השירות / המוצר <span className="text-beige-600">*</span></label>
              <textarea
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="למשל, שם הפרויקט ופירוט השירות שניתן"
                rows={3}
                className="w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3.5 text-sm text-ink placeholder:text-faint transition-colors focus:border-brand-deep focus:outline-none"
              />
            </div>

            {/* Amount block — items/totals */}
            <div className="py-7">
              <h3 className="mb-5 flex items-center justify-end gap-2 text-end text-[19px] font-extrabold text-brand-navy">
                סכום{isPatur ? "" : " (לפני מע״מ)"}
                <PercentIcon className="size-5 text-brand-deep" />
              </h3>
              <label className={fieldLabel}>סכום <span className="text-beige-600">*</span></label>
              <div className={ulineClass}>
                <span className="text-[15px] font-bold text-faint">₪</span>
                <input
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={e => setForm({...form, amount: e.target.value})}
                  placeholder="0"
                  className={ulineInput}
                  dir="ltr"
                />
              </div>

              {amount > 0 && (
                <div className="mt-5 rounded-2xl border border-line bg-paper p-5">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">סכום נטו</span>
                      <span dir="ltr" className="font-medium text-ink tabular-nums">₪{totals.net.toLocaleString("he-IL")}</span>
                    </div>
                    {totals.vat > 0 ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted">מע&quot;מ 17%</span>
                        <span dir="ltr" className="font-medium text-ink tabular-nums">₪{totals.vat.toLocaleString("he-IL")}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted">מע&quot;מ 0% (עוסק פטור)</span>
                        <span dir="ltr" className="font-medium text-ink tabular-nums">₪0</span>
                      </div>
                    )}
                  </div>
                  {/* Navy total pill — mockup `.total-pill` */}
                  <div className="mt-4 flex items-center justify-between gap-6 rounded-[10px] bg-brand-navy px-6 py-3.5">
                    <span className="text-sm font-bold text-aqua">סה&quot;כ לתשלום</span>
                    <span dir="ltr" className="text-xl font-extrabold text-white tabular-nums">₪{totals.total.toLocaleString("he-IL")}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions — mockup `.ed-actions`: centered pills */}
            <div className="flex flex-col items-center gap-3 border-t border-line pt-7 sm:flex-row sm:justify-center">
              <button onClick={handleSubmit} className={btn("primary", "md")}>
                {DOC_TYPE_LABELS[docType].cta}
              </button>
              <Link href="/invoices" className={btn("secondary", "md")}>
                ביטול
              </Link>
            </div>

            <p className="mt-5 text-center text-[11px] leading-relaxed text-faint">
              עם השמירה — הסכום מתעדכן מיד גם בדשבורד, גם ב-/demo (שדה 238 / שדה 150) ובכל החישובים האישיים.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
