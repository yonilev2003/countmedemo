"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { persistPersona } from "@/lib/data/persona-store";
import {
  nextDocNumber,
  bumpDocCounter,
  initialDocStatus,
  isRevenueDoc,
  allowedDocTypesFor,
  validateInvoice,
  calculateInvoiceTotals,
  formatHebrewDate,
} from "@/lib/invoice-generator/index";
import { Persona, InvoiceLine, InvoiceDocType } from "@/lib/persona";
import { trackClient } from "@/lib/analytics/track-client";
import { cn, numberInputWheelGuard } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { btn, Button } from "@/components/brand/button";
import {
  ArrowRightIcon,
  MicIcon,
  CheckCircleIcon,
  CalendarIcon,
  UserIcon,
  FileTextIcon,
  ReceiptIcon,
  CreditCardIcon,
  ClipboardCheckIcon,
  PercentIcon,
  AlertTriangleIcon,
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
  "business-account": {
    title: "חשבון עסקה",
    sub: "דרישת תשלום לפני קבלת הכסף — לא מסמך מס; קבלה מופקת כשמשולם",
    cta: "הפק חשבון עסקה",
  },
  quote: {
    title: "הצעת מחיר",
    sub: "הצעה לא מחייבת ללקוח — ספרור נפרד, לא נספרת כהכנסה",
    cta: "הפק הצעת מחיר",
  },
};

const DOC_TYPE_ICONS: Record<InvoiceDocType, (props: { className?: string }) => React.ReactElement> = {
  "tax-invoice-receipt": FileTextIcon,
  receipt: ReceiptIcon,
  "business-account": CreditCardIcon,
  quote: ClipboardCheckIcon,
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
  const { persona } = useRequiredPersona();

  // Stage 1 ("סוג המסמך") → stage 2 ("פרטי המסמך"). A ?type=/?from= deep link
  // skips straight to stage 2 with the type preselected (see the prefill
  // effect below).
  const [stage, setStage] = useState<"type" | "details">("type");
  const [typePicked, setTypePicked] = useState(false);

  const [docType, setDocType] = useState<InvoiceDocType>("tax-invoice-receipt");
  const [form, setForm] = useState({
    customerName: "",
    customerTaxId: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    category: "",
    dueDate: "",      // business-account only — user-chosen, no default (Yoni 19/07)
    validUntil: "",   // quote only
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
    setVoiceSupported(getRecognitionCtor() !== null);
  }, []);

  // ?type= deep link from the dashboard action buttons (needs the persona to
  // know which document kinds this osek type may issue).
  // ?from=<docNumber> prefills the form from an existing document — used by
  // /receivables' "סמן כשולם" to hand the user a ready receipt (the payment
  // must become recorded income, not just a flipped status — journey scan).
  // Either param means the type is already decided, so stage 1 is skipped.
  const didPrefillRef = useRef(false);
  const [relatedDocNumber, setRelatedDocNumber] = useState<string | undefined>();
  useEffect(() => {
    if (!persona || didPrefillRef.current) return;
    didPrefillRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("type");
    if (
      requested &&
      allowedDocTypesFor(persona.business.osekType).includes(requested as InvoiceDocType)
    ) {
      setDocType(requested as InvoiceDocType);
      setTypePicked(true);
      setStage("details");
    }
    const from = params.get("from");
    const source = from
      ? (persona.income.invoices ?? []).find((i) => i.invoiceNumber === from)
      : undefined;
    if (source) {
      setRelatedDocNumber(source.invoiceNumber);
      setTypePicked(true);
      setStage("details");
      setForm((f) => ({
        ...f,
        customerName: source.customerName,
        customerTaxId: source.customerTaxId ?? "",
        description: source.description,
        amount: String(source.amount),
        category: source.category ?? "",
      }));
    }
  }, [persona]);

  useEffect(() => {
    return () => {
      // Stop recognition on unmount
      recognitionRef.current?.stop();
    };
  }, []);

  if (!persona) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="space-y-3 w-96 max-w-[90vw] animate-pulse">
        <div className="h-6 rounded-lg bg-sand w-1/2 mx-auto" />
        <div className="h-12 rounded-xl bg-sand" />
        <div className="h-48 rounded-2xl bg-sand" />
      </div>
    </div>
  );

  const amount = Number(form.amount) || 0;
  const totals = calculateInvoiceTotals(amount, persona.business.osekType);
  const isPatur = persona.business.osekType === "patur";
  // עוסק פטור אינו מפיק חשבונית מס (חסימה רגולטורית, 2026-07-19).
  const allowedDocTypes = allowedDocTypesFor(persona.business.osekType);
  // A stale preselected/restored tax-invoice type for a patur user falls back safely.
  const effectiveDocType: InvoiceDocType =
    isPatur && docType === "tax-invoice-receipt" ? "receipt" : docType;

  // Live required-fields tracking (spec: counter updates as you type, not
  // only after a failed submit) — mirrors validateInvoice's own rules.
  const taxIdRequired = amount > 5000 && isRevenueDoc(effectiveDocType);
  const missingCustomerName = !form.customerName.trim();
  const missingDescription = !form.description.trim();
  const missingAmount = amount <= 0;
  const missingDate = !form.date;
  const missingTaxId = taxIdRequired && !form.customerTaxId.trim();
  const totalRequiredCount = 4 + (taxIdRequired ? 1 : 0);
  const filledRequiredCount =
    totalRequiredCount -
    [missingCustomerName, missingDescription, missingAmount, missingDate, ...(taxIdRequired ? [missingTaxId] : [])]
      .filter(Boolean).length;
  // Field-level red borders only appear after a submit attempt (errors banner
  // populated) — otherwise every required field would show red on first paint.
  const showFieldErrors = errors.length > 0;

  function selectType(t: InvoiceDocType) {
    setDocType(t);
    setTypePicked(true);
    setErrors([]);
    setStage("details");
  }

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
    const errs = validateInvoice({ ...form, amount, docType: effectiveDocType });
    if (errs.length > 0) {
      setErrors(errs);
      // The banner renders at the top of stage 2 while the submit button
      // sits at the bottom — without scrolling it into view, a sighted user
      // clicks and "nothing happens" (journey-scan finding: banner at
      // y=-338 with scrollY=892). rAF waits for the banner to actually
      // render before scrolling.
      requestAnimationFrame(() => {
        document
          .querySelector('[role="alert"]')
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    const invoiceNumber = nextDocNumber(persona, effectiveDocType);
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
      docType: effectiveDocType,
      status: initialDocStatus(effectiveDocType),
      ...(effectiveDocType === "business-account" && form.dueDate
        ? { dueDate: form.dueDate }
        : {}),
      ...(effectiveDocType === "quote" && form.validUntil
        ? { validUntil: form.validUntil }
        : {}),
      // Conversion chain (quote → business-account → receipt) when this doc
      // was prefilled from another via ?from=.
      ...(relatedDocNumber ? { relatedDocNumber } : {}),
    };
    const countsAsRevenue = isRevenueDoc(effectiveDocType);

    // Sync: also push the revenue into monthlyBreakdown so the dashboard
    // chart reflects the new invoice immediately (it currently uses
    // monthlyBreakdown as authoritative when ≥ 6 months exist).
    // Only payment docs count as revenue, and turnover is EX-VAT (net) —
    // the previous code added the VAT-inclusive total (inflated מחזור for morshe).
    const monthKey = monthFromIsoDate(form.date);
    const mb = [...(persona.income.monthlyBreakdown ?? [])];
    if (countsAsRevenue && monthKey) {
      const idx = mb.findIndex((r) => String(r.month) === monthKey);
      if (idx >= 0) {
        mb[idx] = { ...mb[idx], revenue: mb[idx].revenue + totals.net };
      } else {
        mb.push({ month: monthKey, revenue: totals.net, expenses: 0 });
      }
    }

    const updatedPersona: Persona = {
      ...persona,
      ...bumpDocCounter(persona, effectiveDocType),
      income: {
        ...persona.income,
        invoices: [...(persona.income.invoices ?? []), newInvoice],
        totalRevenue:
          persona.income.totalRevenue + (countsAsRevenue ? totals.net : 0),
        invoiceCount:
          (persona.income.invoiceCount ?? 0) + (countsAsRevenue ? 1 : 0),
        monthlyBreakdown: mb,
      },
    };

    persistPersona(updatedPersona);
    trackClient("doc_created", { docType: effectiveDocType });
    router.push(`/invoices/${invoiceNumber}`);
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-sm items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => (stage === "details" ? setStage("type") : router.push("/invoices"))}
            className="flex items-center gap-2 text-sm text-muted hover:text-brand-navy"
          >
            <ArrowRightIcon className="size-4" />
            {stage === "details" ? "חזרה" : "לרשימת המסמכים"}
          </button>
          <Logo size={26} />
        </div>
      </header>

      <main className="mx-auto max-w-screen-sm px-4 py-6 pb-28">
        {stage === "type" && (
          <TypeStage
            allowedDocTypes={allowedDocTypes}
            selected={typePicked ? effectiveDocType : null}
            isPatur={isPatur}
            onSelect={selectType}
          />
        )}

        {stage === "details" && (
          <DetailsStage
            persona={persona}
            docType={effectiveDocType}
            form={form}
            setForm={setForm}
            amount={amount}
            totals={totals}
            isPatur={isPatur}
            errors={errors}
            showFieldErrors={showFieldErrors}
            missing={{ missingCustomerName, missingDescription, missingAmount, missingDate, missingTaxId, taxIdRequired }}
            filledRequiredCount={filledRequiredCount}
            totalRequiredCount={totalRequiredCount}
            voiceSupported={voiceSupported}
            listening={listening}
            parsing={parsing}
            transcript={transcript}
            voiceMsg={voiceMsg}
            onStartListening={startListening}
            onStopListening={stopListening}
            onParseTranscript={parseTranscriptToForm}
            onClearTranscript={() => { setTranscript(""); setVoiceMsg(null); }}
            onSubmit={handleSubmit}
          />
        )}
      </main>
    </div>
  );
}

/* ── Stage 1: document-type picker ──────────────────────────────────────── */

function TypeStage({
  allowedDocTypes,
  selected,
  isPatur,
  onSelect,
}: {
  allowedDocTypes: InvoiceDocType[];
  selected: InvoiceDocType | null;
  isPatur: boolean;
  onSelect: (t: InvoiceDocType) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-navy">סוג המסמך</h1>
        <p className="text-sm text-muted mt-1">איזה מסמך תרצה/י להפיק?</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {allowedDocTypes.map((t) => {
          const labels = DOC_TYPE_LABELS[t];
          const Icon = DOC_TYPE_ICONS[t];
          const active = selected === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onSelect(t)}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl border-2 px-5 py-4 text-start transition-all min-h-11",
                active
                  ? "border-brand-navy bg-brand-navy/5 shadow-brand"
                  : "border-line bg-paper hover:border-brand-deep hover:bg-aqua-soft",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-10 shrink-0 place-items-center rounded-full",
                  active ? "bg-brand-navy text-white" : "bg-teal-100 text-brand-deep",
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className={cn("text-[15px] font-bold", active ? "text-brand-navy" : "text-ink")}>
                    {labels.title}
                  </span>
                  {active && <CheckCircleIcon className="size-4 shrink-0 text-brand-navy" />}
                </span>
                <span className="mt-1 block text-xs leading-snug text-muted">{labels.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      {isPatur && (
        <p className="text-xs leading-relaxed text-muted">
          {/* DRAFT — NEEDS LEGAL REVIEW */}
          עוסק פטור מפיק קבלה, לא חשבונית מס.
        </p>
      )}
    </div>
  );
}

/* ── Stage 2: document details + live preview ───────────────────────────── */

type InvoiceFormState = {
  customerName: string;
  customerTaxId: string;
  description: string;
  amount: string;
  date: string;
  category: string;
  dueDate: string;
  validUntil: string;
};

function DetailsStage({
  persona,
  docType,
  form,
  setForm,
  amount,
  totals,
  isPatur,
  errors,
  showFieldErrors,
  missing,
  filledRequiredCount,
  totalRequiredCount,
  voiceSupported,
  listening,
  parsing,
  transcript,
  voiceMsg,
  onStartListening,
  onStopListening,
  onParseTranscript,
  onClearTranscript,
  onSubmit,
}: {
  persona: Persona;
  docType: InvoiceDocType;
  form: InvoiceFormState;
  setForm: React.Dispatch<React.SetStateAction<InvoiceFormState>>;
  amount: number;
  totals: { net: number; vat: number; total: number };
  isPatur: boolean;
  errors: string[];
  showFieldErrors: boolean;
  missing: {
    missingCustomerName: boolean;
    missingDescription: boolean;
    missingAmount: boolean;
    missingDate: boolean;
    missingTaxId: boolean;
    taxIdRequired: boolean;
  };
  filledRequiredCount: number;
  totalRequiredCount: number;
  voiceSupported: boolean;
  listening: boolean;
  parsing: boolean;
  transcript: string;
  voiceMsg: string | null;
  onStartListening: () => void;
  onStopListening: () => void;
  onParseTranscript: () => void;
  onClearTranscript: () => void;
  onSubmit: () => void;
}) {
  const labels = DOC_TYPE_LABELS[docType];
  const hasError = (field: keyof typeof missing) => showFieldErrors && missing[field];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-brand-navy">{labels.title}</h1>
        <p className="text-sm text-muted mt-1">מלא/י את פרטי המסמך — הכל ניתן לעריכה עד ההפקה</p>
      </div>

      <p className="text-xs font-medium text-muted">
        {filledRequiredCount} מתוך {totalRequiredCount} שדות חובה מולאו
      </p>

      {errors.length > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-alert/40 bg-overdue-bg px-4 py-3 flex items-start gap-2"
        >
          <AlertTriangleIcon className="size-4 text-alert shrink-0 mt-0.5" />
          <div className="text-xs text-alert-ink leading-relaxed space-y-0.5">
            {errors.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        </div>
      )}

      {voiceSupported && (
        <div className="rounded-2xl border border-line bg-paper shadow-brand p-5">
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
              onClick={listening ? onStopListening : onStartListening}
              disabled={parsing}
              className={cn(
                "shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-brand transition-all disabled:opacity-50",
                listening ? "bg-alert text-white animate-pulse" : "bg-brand-navy text-white hover:bg-navy-900",
              )}
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
                onClick={onParseTranscript}
                disabled={parsing}
                className="bg-teal-100 text-teal-600 hover:bg-teal-100"
              >
                <CheckCircleIcon className="size-4" />
                {parsing ? "מפענח…" : "מלא טופס מהדיבור"}
              </Button>
              <button onClick={onClearTranscript} className="text-xs text-faint hover:text-muted transition-colors">
                נקה
              </button>
            </div>
          )}

          {voiceMsg && (
            <div className="mt-3 text-xs text-ink bg-aqua-soft rounded-lg px-3 py-2 border border-line">{voiceMsg}</div>
          )}
        </div>
      )}

      <DocPreviewCard persona={persona} docType={docType} form={form} totals={totals} isPatur={isPatur} />

      {/* Document details card */}
      <div className="rounded-2xl border border-line bg-paper p-5 space-y-4">
        <h3 className="text-[15px] font-extrabold text-brand-navy">פרטי המסמך</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="תאריך מסמך" required error={hasError("missingDate")}>
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 shrink-0 text-faint" />
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={inputCls(hasError("missingDate"))}
                dir="ltr"
                aria-required="true"
              />
            </div>
          </Field>
          <Field label="קטגוריה (לא חובה)">
            <div className="flex items-center gap-2">
              <FileTextIcon className="size-4 shrink-0 text-faint" />
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="ייעוץ, עיצוב, פיתוח…"
                className={inputCls(false)}
              />
            </div>
          </Field>
        </div>

        <Field label="שם הלקוח" required error={hasError("missingCustomerName")}>
          <div className="flex items-center gap-2">
            <UserIcon className="size-4 shrink-0 text-faint" />
            <input
              type="text"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              placeholder="שם הלקוח (שמור או מזדמן)"
              className={inputCls(hasError("missingCustomerName"))}
              aria-required="true"
            />
          </div>
        </Field>

        {docType === "business-account" && (
          <Field label="תאריך יעד לתשלום (לא חובה)">
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 shrink-0 text-faint" />
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className={inputCls(false)}
                dir="ltr"
              />
            </div>
            <p className="mt-1 text-[11px] text-faint">
              כשעובר התאריך, המסמך יסומן ב&quot;מי לא שילם לי&quot; כבאיחור
            </p>
          </Field>
        )}
        {docType === "quote" && (
          <Field label="ההצעה בתוקף עד (לא חובה)">
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 shrink-0 text-faint" />
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                className={inputCls(false)}
                dir="ltr"
              />
            </div>
          </Field>
        )}

        <Field
          label={`ת.ז. / ח.פ. לקוח${missing.taxIdRequired ? "" : " (לא חובה)"}`}
          required={missing.taxIdRequired}
          error={hasError("missingTaxId")}
        >
          <div className="flex items-center gap-2">
            <UserIcon className="size-4 shrink-0 text-faint" />
            <input
              type="text"
              inputMode="numeric"
              value={form.customerTaxId}
              onChange={(e) => setForm({ ...form, customerTaxId: e.target.value })}
              placeholder="123456789"
              className={inputCls(hasError("missingTaxId"))}
              dir="ltr"
            />
          </div>
          {missing.taxIdRequired && (
            <p className="mt-1 text-[11px] text-due-ink">נדרש לחשבוניות מעל 5,000 ₪</p>
          )}
        </Field>
      </div>

      {/* Service description card */}
      <div className="rounded-2xl border border-line bg-paper p-5">
        <h3 className="mb-3 text-[15px] font-extrabold text-brand-navy">תיאור תכולת המסמך</h3>
        <Field label="תיאור השירות / המוצר" required error={hasError("missingDescription")}>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="למשל, שם הפרויקט ופירוט השירות שניתן"
            rows={3}
            aria-required="true"
            className={cn(inputCls(hasError("missingDescription")), "resize-none")}
          />
        </Field>
      </div>

      {/* Amount card */}
      <div className="rounded-2xl border border-line bg-paper p-5">
        <h3 className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-brand-navy">
          סכום{isPatur ? "" : " (לפני מע״מ)"}
          <PercentIcon className="size-4 text-brand-deep" />
        </h3>
        <Field label="סכום" required error={hasError("missingAmount")}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-faint" aria-hidden="true">₪</span>
            <input
              type="number"
              min={0}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              onWheel={numberInputWheelGuard}
              placeholder="0"
              className={inputCls(hasError("missingAmount"))}
              dir="ltr"
              aria-required="true"
            />
          </div>
        </Field>
      </div>

      <button type="button" onClick={onSubmit} className={cn(btn("primary"), "w-full justify-center")}>
        {labels.cta}
      </button>
      <Link href="/invoices" className={cn(btn("secondary"), "w-full justify-center")}>
        ביטול
      </Link>

      <p className="text-center text-[11px] leading-relaxed text-faint">
        עם השמירה — הסכום מתעדכן מיד גם בדשבורד, גם ב-/demo (שדה 238 / שדה 150) ובכל החישובים האישיים.
      </p>
    </div>
  );
}

/**
 * Live document preview — same pattern as setup's DocHeaderPreview: trade
 * name, doc-type label, next document number, customer + date as typed so
 * far, and the totals block (VAT tagged "חושב" since it's derived, never
 * entered). Re-renders on every keystroke since it just reads current props.
 */
function DocPreviewCard({
  persona,
  docType,
  form,
  totals,
  isPatur,
}: {
  persona: Persona;
  docType: InvoiceDocType;
  form: InvoiceFormState;
  totals: { net: number; vat: number; total: number };
  isPatur: boolean;
}) {
  const nextNumber = nextDocNumber(persona, docType);
  const label = DOC_TYPE_LABELS[docType].title;

  return (
    <div className="rounded-2xl border border-dashed border-brand/60 bg-cream/60 p-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-brand-deep/70">
        ככה ייראה המסמך שלך
      </p>
      <div className="rounded-xl bg-paper border border-line px-4 py-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-brand-navy">{persona.business.tradeName}</div>
            <div className="text-xs text-muted mt-0.5">{label}</div>
          </div>
          <span dir="ltr" className="shrink-0 font-mono text-xs text-muted">#{nextNumber}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft pt-2 text-xs text-muted">
          <span>
            לקוח: <span className="text-ink">{form.customerName.trim() || "—"}</span>
          </span>
          <span dir="ltr">{form.date ? formatHebrewDate(form.date) : "—"}</span>
        </div>

        <div className="space-y-1.5 border-t border-line-soft pt-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">סכום</span>
            <span dir="ltr" className="font-medium text-ink tabular-nums">₪{totals.net.toLocaleString("he-IL")}</span>
          </div>
          {isPatur ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">ללא מע&quot;מ — עוסק פטור</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted">
                מע&quot;מ
                <span className="rounded-full bg-brand-deep/10 px-2 py-0.5 text-[10px] font-semibold text-brand-deep">
                  חושב
                </span>
              </span>
              <span dir="ltr" className="font-medium text-ink tabular-nums">₪{totals.vat.toLocaleString("he-IL")}</span>
            </div>
          )}
          <div className="mt-1.5 flex items-center justify-between rounded-lg bg-brand-navy px-3 py-2">
            <span className="text-xs font-bold text-aqua">סה&quot;כ</span>
            <span dir="ltr" className="text-sm font-extrabold text-white tabular-nums">₪{totals.total.toLocaleString("he-IL")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-muted mb-1.5">
        {label}
        {required && <span className="text-alert-ink ms-1" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-alert">שדה חובה</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return cn(
    "w-full min-w-0 rounded-xl border bg-cream px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 transition-colors",
    hasError
      ? "border-alert focus:border-alert focus:ring-alert/20"
      : "border-line focus:border-brand-deep focus:ring-brand-deep/15",
  );
}
