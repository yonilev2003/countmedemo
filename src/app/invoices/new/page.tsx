"use client";

import { useEffect, useRef, useState } from "react";
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
  // True while the user intends to keep recording. Lets onend auto-restart
  // recognition (the Web Speech API ends a session on its own after a pause)
  // and lets the stop button / fatal errors cleanly prevent the restart.
  const isRecordingRef = useRef(false);
  // Finalized transcript text accumulated across result events.
  const finalTranscriptRef = useRef("");

  useEffect(() => {
    const p = loadPersona();
    if (!p) { router.push("/setup"); return; }
    setPersona(p);
    setVoiceSupported(getRecognitionCtor() !== null);
  }, [router]);

  useEffect(() => {
    return () => {
      // Stop recognition on unmount (and prevent any onend auto-restart).
      isRecordingRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  if (!persona) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="space-y-3 w-96 animate-pulse">
        <div className="h-6 rounded-lg bg-stone-200 w-1/2 mx-auto" />
        <div className="h-12 rounded-xl bg-stone-200" />
        <div className="h-48 rounded-2xl bg-stone-200" />
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
    rec.continuous = true;
    rec.interimResults = true;

    // Reset accumulated text for a fresh session.
    finalTranscriptRef.current = "";
    setTranscript("");
    setVoiceMsg(null);

    rec.onresult = (e) => {
      // Append only the newly finalized segments to the durable transcript;
      // show interim (not-yet-final) text live on top of it.
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const chunk = result[0].transcript;
        if (result.isFinal) {
          finalTranscriptRef.current += chunk;
        } else {
          interim += chunk;
        }
      }
      setTranscript((finalTranscriptRef.current + interim).trim());
    };

    rec.onerror = (e) => {
      const err = e.error ?? "unknown";
      // Transient errors: let onend restart the session naturally.
      if (err === "no-speech" || err === "aborted") return;
      // Fatal errors (e.g. not-allowed, service-not-allowed, audio-capture):
      // stop for good and surface the message.
      isRecordingRef.current = false;
      setListening(false);
      setVoiceMsg(
        err === "not-allowed" || err === "service-not-allowed"
          ? "אין הרשאת מיקרופון — אשרי גישה למיקרופון בדפדפן ונסי שוב."
          : `שגיאת הקלטה: ${err}`,
      );
    };

    rec.onend = () => {
      // The Web Speech API ends a session on its own after a pause. While the
      // user still intends to record, restart it for continuous transcription.
      if (isRecordingRef.current) {
        try {
          rec.start();
        } catch {
          // start() throws if called too soon / already started — ignore.
        }
        return;
      }
      setListening(false);
    };

    recognitionRef.current = rec;
    isRecordingRef.current = true;
    rec.start();
    setListening(true);
  }

  function stopListening() {
    // Flag down first so onend does NOT auto-restart.
    isRecordingRef.current = false;
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
      setVoiceMsg("✓ מילאתי את הטופס מהדיבור — בדקי וערכי לפי הצורך.");
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

    const invoiceNumber = nextInvoiceNumber(persona, form.date);
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
    // monthlyBreakdown as authoritative when ≥ 6 months exist). monthlyBreakdown
    // is keyed by "YYYY-MM", so this entry is automatically tax-year-tagged and
    // personaForYear() can scope it to the correct year.
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

    // Year separation: the invoice belongs to the tax year derived from its
    // date — NOT necessarily the persona's declared year. The persona-level
    // scalar totals (totalRevenue / invoiceCount) describe ONLY the declared
    // year and feed the /file form-1301 + /demo calculators directly, so we
    // must only fold this invoice into them when its year matches. An invoice
    // for another year is still recorded in invoices[] (date-tagged) and in
    // monthlyBreakdown (YYYY-MM key); the dashboard / P&L surface it per year
    // via personaForYear(). This keeps a 2026 invoice out of the 2024 totals.
    const invoiceYear = new Date(form.date).getFullYear();
    const isDeclaredYear = invoiceYear === persona.income.year;

    const updatedPersona: Persona = {
      ...persona,
      invoiceCounter: (persona.invoiceCounter ?? 1) + 1,
      income: {
        ...persona.income,
        invoices: [...(persona.income.invoices ?? []), newInvoice],
        totalRevenue: isDeclaredYear
          ? persona.income.totalRevenue + totals.total
          : persona.income.totalRevenue,
        invoiceCount: isDeclaredYear
          ? (persona.income.invoiceCount ?? 0) + 1
          : (persona.income.invoiceCount ?? 0),
        monthlyBreakdown: mb,
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
        {/* Voice dictation card */}
        {voiceSupported && (
          <div className="mb-6 rounded-2xl border border-brand-navy/15 bg-info/40 p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="text-sm">
                <div className="font-bold text-brand-navy">דיבור במקום הקלדה 🎙️</div>
                <div className="text-xs text-stone-600 leading-relaxed mt-0.5">
                  לחצי על המיקרופון ואמרי משפט כמו: <span className="font-medium">"חשבונית מס קבלה לדנה כהן עבור ייעוץ עיצוב בסך 3,000 שקלים"</span>
                </div>
              </div>
              <button
                onClick={listening ? stopListening : startListening}
                disabled={parsing}
                className={`shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
                  listening
                    ? "bg-alert text-white animate-pulse"
                    : "bg-brand-navy text-white hover:bg-brand-navy/90"
                } disabled:opacity-50`}
              >
                <span className="text-base">{listening ? "■" : "🎙️"}</span>
                <span>{listening ? "עצור" : "התחל הקלטה"}</span>
              </button>
            </div>

            {(transcript || listening) && (
              <div className="rounded-lg bg-white border border-stone-200 px-3 py-2 text-sm text-stone-800 min-h-[40px]">
                {transcript || <span className="text-stone-400">מקשיב…</span>}
              </div>
            )}

            {transcript && !listening && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  onClick={parseTranscriptToForm}
                  disabled={parsing}
                  className="rounded-full bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {parsing ? "מפענח…" : "✦ מלא טופס מהדיבור"}
                </button>
                <button
                  onClick={() => { setTranscript(""); setVoiceMsg(null); }}
                  className="text-xs text-stone-500 hover:text-stone-800"
                >
                  נקה
                </button>
              </div>
            )}

            {voiceMsg && (
              <div className="mt-2 text-xs text-stone-700 bg-white rounded px-2 py-1 border border-stone-200">{voiceMsg}</div>
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

          <p className="text-[11px] text-stone-500 text-center leading-relaxed">
            ✦ עם השמירה — הסכום מתעדכן מיד גם בדשבורד, גם ב-/demo (שדה 238 / שדה 150) ובכל החישובים האישיים.
          </p>

          <button onClick={handleSubmit}
            className="w-full rounded-full bg-brand-navy py-3 text-sm font-medium text-white hover:bg-brand-navy/90 transition-colors shadow-sm">
            {DOC_TYPE_LABELS[docType].cta} &#x2190;
          </button>
        </div>
      </main>
    </div>
  );
}
