"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { getTaxYearConstants } from "@/lib/calculators/types";
import { DATASET } from "@/lib/business-expenses/occupation-dataset";
import {
  ExpenseDraft,
  ExpenseSource,
  emptyExpenseDraft,
  missingRequiredFields,
  computeExpenseStatus,
  draftToExpenseLine,
  OCR_CONFIDENCE_THRESHOLD,
} from "@/lib/expenses/types";
import { addExpense } from "@/lib/expenses/store";
import { uploadReceiptImage } from "@/lib/expenses/receipt-storage";
import { fetchBoiRate } from "@/lib/expenses/boi-exchange-rate";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { LegalNote } from "@/components/brand/legal-note";
import {
  ArrowRightIcon,
  CameraIcon,
  UploadIcon,
  MicIcon,
  PencilIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
  MailIcon,
} from "@/components/brand/icons";

/* Minimal Web Speech API types — TS lib.dom doesn't ship them (cloned from
 * invoices/new/page.tsx, the same voice-entry pattern). */
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // "data:image/jpeg;base64,AAAA..." → just the base64 part
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const FIELD_LABELS: Record<string, string> = {
  vendorName: "שם הספק",
  docNumber: "מספר מסמך",
  date: "תאריך",
  amount: "סכום",
  categoryId: "קטגוריה",
};

export default function NewExpensePage() {
  const router = useRouter();
  const { persona, setPersona } = useRequiredPersona();

  const [stage, setStage] = useState<"source" | "review">("source");
  const [draft, setDraft] = useState<ExpenseDraft>(emptyExpenseDraft("manual"));
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [boiLoading, setBoiLoading] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Voice state — cloned from invoices/new/page.tsx
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceMsg, setVoiceMsg] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setVoiceSupported(getRecognitionCtor() !== null);
  }, []);
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  // Best-effort Bank-of-Israel rate fetch — never blocks; manual entry always works.
  useEffect(() => {
    if (!draft.isForeignCurrency || draft.exchangeRateIsManual) return;
    if (!draft.originalCurrency || !draft.date) return;
    let cancelled = false;
    setBoiLoading(true);
    fetchBoiRate(draft.originalCurrency, draft.date).then((rate) => {
      if (cancelled) return;
      setBoiLoading(false);
      if (rate != null) {
        setDraft((d) => (d.exchangeRateIsManual ? d : { ...d, exchangeRate: String(rate) }));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.isForeignCurrency, draft.originalCurrency, draft.date]);

  // Foreign-currency lines: `amount` (the ILS total, what validation/save
  // actually use) is DERIVED from originalAmount × exchangeRate, never typed
  // directly — keep it in sync so a filled-in foreign-currency expense isn't
  // permanently flagged as "missing amount".
  useEffect(() => {
    if (!draft.isForeignCurrency) return;
    const computed = (Number(draft.originalAmount) || 0) * (Number(draft.exchangeRate) || 0);
    const next = computed > 0 ? String(Math.round(computed * 100) / 100) : "";
    setDraft((d) => (d.isForeignCurrency && d.amount !== next ? { ...d, amount: next } : d));
  }, [draft.isForeignCurrency, draft.originalAmount, draft.exchangeRate]);

  if (!persona) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-sm text-muted">טוען...</div>
      </div>
    );
  }

  const vatRate = getTaxYearConstants(persona.income.year).vatRate;

  async function handleImageSelected(file: File, source: ExpenseSource) {
    setOcrError(null);
    setPendingFile(file);
    setOcrLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const mediaType = file.type || "image/jpeg";
      const resp = await fetch("/api/parse-expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, imageMediaType: mediaType }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "תשובה לא תקינה מהשרת" }));
        setOcrError(`לא הצלחתי לקרוא את הקבלה אוטומטית (${err.error ?? resp.status}) — מלא/י ידנית.`);
        setDraft({ ...emptyExpenseDraft(source) });
        setStage("review");
        return;
      }
      const parsed = await resp.json() as {
        vendorName: string; docNumber: string; date: string; amount: number;
        currency: string; categoryId: string;
        confidence?: Partial<Record<"vendorName" | "docNumber" | "date" | "amount", number>>;
      };
      const category = DATASET.categories.find((c) => c.id === parsed.categoryId);
      setDraft({
        ...emptyExpenseDraft(source),
        vendorName: parsed.vendorName || "",
        docNumber: parsed.docNumber || "",
        date: parsed.date || emptyExpenseDraft(source).date,
        amount: parsed.amount > 0 ? String(parsed.amount) : "",
        categoryId: category ? category.id : "",
        category: category ? category.nameHe : "",
        confidence: parsed.confidence ?? {},
      });
      setStage("review");
    } catch {
      setOcrError("שגיאת רשת בקריאת הקבלה — מלא/י ידנית.");
      setDraft({ ...emptyExpenseDraft(source) });
      setStage("review");
    } finally {
      setOcrLoading(false);
    }
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
      for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
    };
    rec.onerror = (e) => {
      setListening(false);
      setVoiceMsg(`שגיאת הקלטה: ${e.error ?? "לא ידוע"}`);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }
  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function parseTranscript() {
    if (!transcript.trim()) return;
    setOcrLoading(true);
    setVoiceMsg(null);
    try {
      const resp = await fetch("/api/parse-expense", {
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
        vendorName: string; docNumber: string; date: string; amount: number;
        currency: string; categoryId: string;
      };
      const category = DATASET.categories.find((c) => c.id === parsed.categoryId);
      setDraft({
        ...emptyExpenseDraft("voice"),
        vendorName: parsed.vendorName || "",
        docNumber: parsed.docNumber || "",
        date: parsed.date || emptyExpenseDraft("voice").date,
        amount: parsed.amount > 0 ? String(parsed.amount) : "",
        categoryId: category ? category.id : "",
        category: category ? category.nameHe : "",
      });
      setStage("review");
    } catch {
      setVoiceMsg("שגיאת רשת בפענוח הדיבור. נסי שוב או הזיני ידנית.");
    } finally {
      setOcrLoading(false);
    }
  }

  function startManual() {
    setDraft(emptyExpenseDraft("manual"));
    setPendingFile(null);
    setOcrError(null);
    setStage("review");
  }

  function updateDraft(patch: Partial<ExpenseDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  async function handleSave() {
    if (!persona) return;
    const missing = missingRequiredFields(draft);
    if (missing.length > 0) {
      setShowValidation(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSaving(true);
    try {
      let receiptPath: string | undefined;
      if (pendingFile) {
        receiptPath = (await uploadReceiptImage(pendingFile, pendingFile.type || "image/jpeg")) ?? undefined;
      }
      const line = draftToExpenseLine(draft, {
        vatRate,
        deductionRule: "full",
        receiptPath,
      });
      const next = addExpense(persona, line);
      setPersona(next);
      router.push("/expenses");
    } finally {
      setSaving(false);
    }
  }

  const missing = showValidation ? missingRequiredFields(draft) : [];
  const status = computeExpenseStatus(draft);
  // `draft.amount` is the single source of truth (kept in sync with
  // originalAmount × exchangeRate for foreign-currency lines by the effect
  // above) — reusing it here instead of recomputing guarantees the "total in
  // ILS" display and the saved amount can never drift apart.
  const amountIls = Number(draft.amount) || 0;

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-sm items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => (stage === "review" ? setStage("source") : router.push("/dashboard"))}
            className="flex items-center gap-2 text-sm text-muted hover:text-brand-navy"
          >
            <ArrowRightIcon className="size-4" />
            {stage === "review" ? "חזרה" : "לוח הבקרה"}
          </button>
          <Logo size={26} />
        </div>
      </header>

      <main className="mx-auto max-w-screen-sm px-4 py-6 pb-28">
        {stage === "source" && (
          <SourceStage
            cameraInputRef={cameraInputRef}
            galleryInputRef={galleryInputRef}
            onFile={handleImageSelected}
            onManual={startManual}
            ocrLoading={ocrLoading}
            ocrError={ocrError}
            voiceSupported={voiceSupported}
            listening={listening}
            transcript={transcript}
            voiceMsg={voiceMsg}
            onStartListening={startListening}
            onStopListening={stopListening}
            onParseTranscript={parseTranscript}
          />
        )}

        {stage === "review" && (
          <ReviewStage
            draft={draft}
            update={updateDraft}
            missing={missing}
            status={status}
            amountIls={amountIls}
            boiLoading={boiLoading}
            saving={saving}
            onSave={handleSave}
          />
        )}
      </main>
    </div>
  );
}

/* ── Stage 1: source picker ─────────────────────────────────────────────── */

function SourceStage({
  cameraInputRef,
  galleryInputRef,
  onFile,
  onManual,
  ocrLoading,
  ocrError,
  voiceSupported,
  listening,
  transcript,
  voiceMsg,
  onStartListening,
  onStopListening,
  onParseTranscript,
}: {
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  galleryInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File, source: ExpenseSource) => void;
  onManual: () => void;
  ocrLoading: boolean;
  ocrError: string | null;
  voiceSupported: boolean;
  listening: boolean;
  transcript: string;
  voiceMsg: string | null;
  onStartListening: () => void;
  onStopListening: () => void;
  onParseTranscript: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-navy">תיעוד הוצאה</h1>
        <p className="text-sm text-muted mt-1">איך נוח לך להזין את ההוצאה?</p>
      </div>

      {ocrError && (
        <div className="rounded-xl border border-due/40 bg-due-bg/40 px-4 py-3 text-xs text-due-ink">
          {ocrError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <SourceCard
          icon={<CameraIcon className="size-6" />}
          label="צילום קבלה"
          hint="מהמצלמה עכשיו"
          disabled={ocrLoading}
          onClick={() => cameraInputRef.current?.click()}
        />
        <SourceCard
          icon={<UploadIcon className="size-6" />}
          label="מהגלריה"
          hint="תמונה קיימת"
          disabled={ocrLoading}
          onClick={() => galleryInputRef.current?.click()}
        />
        <SourceCard
          icon={<MicIcon className="size-6" />}
          label="הקלטה קולית"
          hint="ספר/י על ההוצאה"
          disabled={ocrLoading}
          onClick={onStartListening}
        />
        <SourceCard
          icon={<PencilIcon className="size-6" />}
          label="הזנה ידנית"
          hint="מילוי טופס"
          disabled={ocrLoading}
          onClick={onManual}
        />
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f, "camera");
          e.target.value = "";
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f, "gallery");
          e.target.value = "";
        }}
      />

      {ocrLoading && (
        <div className="rounded-xl border border-line bg-paper px-4 py-3 text-sm text-muted flex items-center gap-2">
          <span className="size-4 rounded-full border-2 border-brand-deep/30 border-t-brand-deep animate-spin" />
          קורא/ת את הקבלה...
        </div>
      )}

      {(listening || transcript) && (
        <div className="rounded-2xl border border-line bg-paper p-4 space-y-3 shadow-brand">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-brand-navy">הקלטה קולית</span>
            <button
              type="button"
              onClick={listening ? onStopListening : onStartListening}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                listening ? "bg-alert text-white" : "bg-brand-navy text-white",
              )}
            >
              <MicIcon className="size-3.5" />
              {listening ? "עצירה" : "הקלטה מחדש"}
            </button>
          </div>
          {transcript && (
            <p className="rounded-xl bg-cream px-3 py-2 text-sm text-ink leading-relaxed">{transcript}</p>
          )}
          {voiceMsg && <p className="text-xs text-due-ink">{voiceMsg}</p>}
          {!listening && transcript && (
            <button type="button" onClick={onParseTranscript} className={cn(btn("primary", "sm"), "w-full justify-center")}>
              פענוח לטופס
            </button>
          )}
        </div>
      )}

      {!voiceSupported && (
        <p className="text-[11px] text-faint">
          הקלטה קולית זמינה ב-Chrome או Edge. בדפדפנים אחרים — צילום, גלריה או הזנה ידנית עובדים תמיד.
        </p>
      )}
    </div>
  );
}

function SourceCard({
  icon,
  label,
  hint,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-paper p-5 text-center shadow-brand transition-colors hover:border-brand-deep/40 hover:bg-cream disabled:opacity-50"
    >
      <span className="grid size-12 place-items-center rounded-full bg-teal-100 text-brand-deep">{icon}</span>
      <span className="text-sm font-bold text-brand-navy">{label}</span>
      <span className="text-[11px] text-muted">{hint}</span>
    </button>
  );
}

/* ── Stage 2: review + blocking validation ──────────────────────────────── */

function ReviewStage({
  draft,
  update,
  missing,
  status,
  amountIls,
  boiLoading,
  saving,
  onSave,
}: {
  draft: ExpenseDraft;
  update: (patch: Partial<ExpenseDraft>) => void;
  missing: string[];
  status: ReturnType<typeof computeExpenseStatus>;
  amountIls: number;
  boiLoading: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const hasError = (field: string) => missing.includes(field);
  const confidenceHint = (field: keyof NonNullable<ExpenseDraft["confidence"]>) => {
    const c = draft.confidence[field];
    if (c == null) return null;
    if (c >= OCR_CONFIDENCE_THRESHOLD) {
      return (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-success">
          <CheckCircleIcon className="size-3.5 shrink-0" />
          זוהה אוטומטית ({Math.round(c * 100)}%) — בדוק/בדקי לפני שמירה
        </p>
      );
    }
    return (
      <p className="mt-1 text-[11px] text-due-ink">זוהה בוודאות נמוכה — כדאי לבדוק</p>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-brand-navy">פרטי ההוצאה</h1>
        <p className="text-sm text-muted mt-1">בדוק/בדקי את הפרטים לפני שמירה</p>
      </div>

      {missing.length > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-alert/40 bg-overdue-bg px-4 py-3 flex items-start gap-2"
        >
          <AlertTriangleIcon className="size-4 text-alert shrink-0 mt-0.5" />
          <div className="text-xs text-alert-ink leading-relaxed">
            <p className="font-bold mb-0.5">חסרים שדות חובה:</p>
            <p>{missing.map((f) => FIELD_LABELS[f] ?? f).join(", ")}</p>
          </div>
        </div>
      )}

      <Field label="שם הספק" required error={hasError("vendorName")}>
        <input
          type="text"
          value={draft.vendorName}
          onChange={(e) => update({ vendorName: e.target.value })}
          className={inputCls(hasError("vendorName"))}
          placeholder="לדוגמה: office depot"
        />
        {confidenceHint("vendorName")}
      </Field>

      <Field label="מספר מסמך" required error={hasError("docNumber")}>
        <input
          type="text"
          value={draft.docNumber}
          onChange={(e) => update({ docNumber: e.target.value })}
          className={inputCls(hasError("docNumber"))}
          dir="ltr"
        />
        {confidenceHint("docNumber")}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="תאריך" required error={hasError("date")}>
          <input
            type="date"
            value={draft.date}
            onChange={(e) => update({ date: e.target.value })}
            className={inputCls(hasError("date"))}
            dir="ltr"
          />
          {confidenceHint("date")}
        </Field>
        <Field label="קטגוריה" required error={hasError("categoryId")}>
          <select
            value={draft.categoryId}
            onChange={(e) => {
              const cat = DATASET.categories.find((c) => c.id === e.target.value);
              update({ categoryId: e.target.value, category: cat?.nameHe ?? "" });
            }}
            className={inputCls(hasError("categoryId"))}
          >
            <option value="">בחר/י קטגוריה</option>
            {DATASET.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nameHe}</option>
            ))}
          </select>
        </Field>
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={draft.isForeignCurrency}
          onChange={(e) => update({ isForeignCurrency: e.target.checked })}
          className="h-4 w-4 accent-brand-navy"
        />
        <span className="text-sm text-ink">הוצאה במטבע זר</span>
      </label>

      {draft.isForeignCurrency ? (
        <div className="rounded-xl border border-line bg-paper p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="סכום במטבע מקור" required error={hasError("amount") && !draft.originalAmount}>
              <input
                type="number"
                min={0}
                value={draft.originalAmount}
                onChange={(e) => update({ originalAmount: e.target.value })}
                className={inputCls(false)}
                dir="ltr"
              />
            </Field>
            <Field label="מטבע">
              <select
                value={draft.originalCurrency}
                onChange={(e) => update({ originalCurrency: e.target.value })}
                className={inputCls(false)}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </Field>
          </div>
          <Field label="שער המרה (בנק ישראל, בתאריך המסמך)">
            <input
              type="number"
              min={0}
              step="0.0001"
              value={draft.exchangeRate}
              onChange={(e) => update({ exchangeRate: e.target.value, exchangeRateIsManual: true })}
              className={inputCls(false)}
              dir="ltr"
              placeholder={boiLoading ? "מחפש שער..." : "הזן/י שער"}
            />
            <p className="mt-1 text-[11px] text-muted">
              {boiLoading
                ? "מנסה לשלוף שער יציג אוטומטית..."
                : draft.exchangeRateIsManual
                  ? "שער שהוזן ידנית."
                  : draft.exchangeRate
                    ? "שער אוטומטי מבנק ישראל — ניתן לערוך."
                    : "לא נמצא שער אוטומטי — הזן/י ידנית."}
            </p>
          </Field>
          <p className="text-sm font-bold text-brand-navy">
            סה״כ בשקלים: {amountIls > 0 ? amountIls.toLocaleString("he-IL", { maximumFractionDigits: 0 }) : "—"} ₪
          </p>
        </div>
      ) : (
        <Field label="סכום כולל (₪)" required error={hasError("amount")}>
          <input
            type="number"
            min={0}
            value={draft.amount}
            onChange={(e) => update({ amount: e.target.value })}
            className={inputCls(hasError("amount"))}
            dir="ltr"
          />
          {confidenceHint("amount")}
        </Field>
      )}

      <Field label="מטרה עסקית (אופציונלי)">
        <textarea
          value={draft.businessPurpose}
          onChange={(e) => update({ businessPurpose: e.target.value })}
          className={cn(inputCls(false), "min-h-[70px] resize-none")}
          placeholder="למה זו הוצאה עסקית? (עוזר בבדיקה מול רו״ח בהמשך)"
        />
      </Field>

      {status === "needs_review" && (
        <div className="rounded-xl border border-due/40 bg-due-bg/40 px-4 py-3 text-xs text-due-ink flex items-start gap-2">
          <InfoIcon className="size-4 shrink-0 mt-0.5" />
          כמעט ולא זוהו פרטים — כדאי למלא ידנית לפני שמירה.
        </div>
      )}

      <LegalNote variant="dataset" />

      <div className="rounded-xl border border-line-soft bg-cream/60 px-4 py-3 text-[11px] text-muted leading-relaxed">
        המערכת מרכזת ומסווגת הוצאות לצורך מעקב וניהול פנימי בלבד. הפקת חשבונית מס תואמת חוק (לרבות מספרי הקצאה
        מעל התקרה החוקית) מול רשות המסים אינה חלק מהמערכת בשלב זה.
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className={cn(btn("primary"), "w-full justify-center")}
      >
        {saving ? "שומר/ת..." : "שמירת הוצאה"}
      </button>

      <a
        href="mailto:countme5555@gmail.com?subject=דיווח%20על%20תקלה%20-%20תיעוד%20הוצאה"
        className="flex items-center justify-center gap-1.5 text-[11px] text-faint hover:text-brand-deep"
      >
        <MailIcon className="size-3.5" />
        נתקלת בבעיה? דווח/י לנו
      </a>
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
      <label className="block text-sm font-medium text-ink mb-1">
        {label}
        {required && <span className="text-alert ms-1">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-alert">שדה חובה</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return cn(
    "w-full rounded-xl border px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 transition-colors",
    hasError
      ? "border-alert focus:border-alert focus:ring-alert/20"
      : "border-line focus:border-brand-deep focus:ring-brand-deep/15",
  );
}
