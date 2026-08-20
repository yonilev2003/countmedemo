"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { getTaxYearConstants } from "@/lib/calculators/types";
import { DATASET } from "@/lib/business-expenses/occupation-dataset";
import type { Persona } from "@/lib/persona";
import {
  ExpenseDraft,
  ExpenseSource,
  ExpenseFieldConfidence,
  emptyExpenseDraft,
  missingRequiredFields,
  computeExpenseStatus,
  draftToExpenseLine,
  applyConfidenceGate,
  validateAmount,
  deriveVat,
  AMBIGUOUS_CATEGORY_IDS,
  REQUIRED_EXPENSE_FIELDS,
  OCR_CONFIDENCE_THRESHOLD,
} from "@/lib/expenses/types";
import { addExpense, activeExpenses, attachReceiptToExpense } from "@/lib/expenses/store";
import { uploadReceiptImage } from "@/lib/expenses/receipt-storage";
import { fetchBoiRate } from "@/lib/expenses/boi-exchange-rate";
import { cn, numberInputWheelGuard } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
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
  FileTextIcon,
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
  businessPurpose: "מטרה עסקית",
};

/** Same cap as the server enforces (MAX_FILE_BYTES in /api/parse-expense) —
 * checked client-side too so a too-large PDF fails fast with a Hebrew
 * message instead of waiting on a round-trip to find out. */
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function normalizeVendorName(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Spec §5: same normalized vendor + same amount + same date, among active
 * (non-deleted) expenses only — a soft-deleted line shouldn't block a re-save. */
function findDuplicateExpense(persona: Persona, draft: ExpenseDraft): boolean {
  const vendor = normalizeVendorName(draft.vendorName);
  const amount = Number(draft.amount);
  if (!vendor || !draft.date || !Number.isFinite(amount)) return false;
  return activeExpenses(persona).some(
    (e) => normalizeVendorName(e.vendorName) === vendor && Number(e.amount) === amount && e.date === draft.date,
  );
}

export default function NewExpensePage() {
  const router = useRouter();
  const { persona, setPersona } = useRequiredPersona();

  const [stage, setStage] = useState<"source" | "review">("source");
  const [draft, setDraft] = useState<ExpenseDraft>(emptyExpenseDraft("manual"));
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [boiLoading, setBoiLoading] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Reclaimable-input-VAT rate: an עוסק פטור can't reclaim any input VAT, so
  // their effective rate is 0 (the gross amount is simply the cost). Keeps the
  // stored vat field honest on /expenses instead of showing a phantom מע"מ.
  const vatRate =
    persona.business.osekType === "morshe"
      ? getTaxYearConstants(persona.income.year).vatRate
      : 0;

  async function handleImageSelected(file: File, source: ExpenseSource) {
    setOcrError(null);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (isPdf && file.size > MAX_UPLOAD_BYTES) {
      setOcrError("קובץ ה-PDF גדול מדי (מקסימום 8MB) — מלא/י ידנית.");
      setDraft({ ...emptyExpenseDraft(source) });
      setStage("review");
      return;
    }
    setPendingFile(file);
    setOcrLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const body = isPdf
        ? { pdfBase64: base64 }
        : { imageBase64: base64, imageMediaType: file.type || "image/jpeg" };
      const resp = await fetch("/api/parse-expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        confidence?: ExpenseFieldConfidence;
      };
      // Confidence gating (spec §1): blank out any field the parser wasn't
      // confident about rather than prefilling a guess.
      const gated = applyConfidenceGate(
        {
          vendorName: parsed.vendorName || "",
          docNumber: parsed.docNumber || "",
          date: parsed.date || "",
          amount: parsed.amount > 0 ? parsed.amount : 0,
        },
        parsed.confidence,
      );
      const category = DATASET.categories.find((c) => c.id === parsed.categoryId);
      setDraft({
        ...emptyExpenseDraft(source),
        vendorName: gated.fields.vendorName,
        docNumber: gated.fields.docNumber,
        date: gated.fields.date || emptyExpenseDraft(source).date,
        amount: gated.fields.amount > 0 ? String(gated.fields.amount) : "",
        categoryId: category ? category.id : "",
        category: category ? category.nameHe : "",
        confidence: gated.confidence,
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
        confidence?: ExpenseFieldConfidence;
      };
      // The parser never sends confidence for a voice transcript today, but
      // gate it anyway (spec §1) in case that ever changes — a no-op when
      // `parsed.confidence` is absent.
      const gated = applyConfidenceGate(
        {
          vendorName: parsed.vendorName || "",
          docNumber: parsed.docNumber || "",
          date: parsed.date || "",
          amount: parsed.amount > 0 ? parsed.amount : 0,
        },
        parsed.confidence,
      );
      const category = DATASET.categories.find((c) => c.id === parsed.categoryId);
      setDraft({
        ...emptyExpenseDraft("voice"),
        vendorName: gated.fields.vendorName,
        docNumber: gated.fields.docNumber,
        date: gated.fields.date || emptyExpenseDraft("voice").date,
        amount: gated.fields.amount > 0 ? String(gated.fields.amount) : "",
        categoryId: category ? category.id : "",
        category: category ? category.nameHe : "",
        confidence: gated.confidence,
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

  // Spec §2: editing a field the parser detected means it's no longer an
  // unverified auto-detected guess — drop its confidence entry (so its
  // "זוהה" hint disappears) and mark the draft as user-reviewed.
  function updateDraft(patch: Partial<ExpenseDraft>) {
    setDraft((d) => {
      const nextConfidence = { ...d.confidence };
      let clearedAny = false;
      for (const key of Object.keys(patch) as (keyof ExpenseDraft)[]) {
        if (key in nextConfidence) {
          delete nextConfidence[key as keyof ExpenseFieldConfidence];
          clearedAny = true;
        }
      }
      return {
        ...d,
        ...patch,
        confidence: nextConfidence,
        reviewedByUser: d.reviewedByUser || clearedAny,
      };
    });
  }

  async function handleSave(opts?: { skipDuplicateCheck?: boolean }) {
    if (!persona) return;
    const missing = missingRequiredFields(draft);
    const amountError = validateAmount(draft.amount);
    if (missing.length > 0 || amountError) {
      setShowValidation(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // Duplicate check (spec §5) is a non-blocking, skippable confirmation —
    // never folded into the missing/amount validation above.
    if (!opts?.skipDuplicateCheck && findDuplicateExpense(persona, draft)) {
      setShowDuplicateConfirm(true);
      return;
    }
    setShowDuplicateConfirm(false);
    setSaving(true);
    // Optimistic save (efficiency-audit finding, 2026-08-20): the receipt
    // upload is a real Storage round-trip — every OTHER save path in this app
    // (invoices/new, addExpense itself) writes and navigates without waiting
    // on the network, so this flow (the flagship "צילום קבלה" capture path)
    // shouldn't be the one exception that blocks on it. Save without a
    // receiptPath right away, navigate immediately, then patch the path in
    // once the upload resolves in the background — uploadReceiptImage's own
    // contract already says callers must save either way on failure, this
    // just stops blocking on success too.
    const line = draftToExpenseLine(draft, {
      vatRate,
      deductionRule: "full",
      receiptPath: undefined,
    });
    const next = addExpense(persona, line);
    setPersona(next);
    router.push("/expenses");
    if (pendingFile) {
      const fileToUpload = pendingFile;
      const newIndex = (next.income.expenses ?? []).length - 1;
      void uploadReceiptImage(fileToUpload, fileToUpload.type || "image/jpeg").then((receiptPath) => {
        if (receiptPath) attachReceiptToExpense(next, newIndex, receiptPath);
      });
    }
  }

  // Live (not gated by showValidation) — drives the always-visible required-
  // fields counter (spec §4), which needs to update as the user types, not
  // only after a failed save attempt.
  const liveMissing = missingRequiredFields(draft);
  const totalRequiredCount = REQUIRED_EXPENSE_FIELDS.length + (AMBIGUOUS_CATEGORY_IDS.has(draft.categoryId) ? 1 : 0);
  const filledRequiredCount = totalRequiredCount - liveMissing.length;

  const missing = showValidation ? liveMissing : [];
  const amountError = showValidation ? validateAmount(draft.amount) : null;
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
          <div className="flex items-center gap-2">
            <Logo size={26} />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-sm px-4 py-6 pb-28">
        {stage === "source" && (
          <SourceStage
            cameraInputRef={cameraInputRef}
            galleryInputRef={galleryInputRef}
            fileInputRef={fileInputRef}
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
            amountError={amountError}
            status={status}
            amountIls={amountIls}
            vatRate={vatRate}
            filledRequiredCount={filledRequiredCount}
            totalRequiredCount={totalRequiredCount}
            boiLoading={boiLoading}
            saving={saving}
            showDuplicateConfirm={showDuplicateConfirm}
            onSave={() => handleSave()}
            onSaveAnyway={() => handleSave({ skipDuplicateCheck: true })}
            onCancelDuplicate={() => setShowDuplicateConfirm(false)}
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
  fileInputRef,
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
  fileInputRef: React.RefObject<HTMLInputElement | null>;
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
        <SourceCard
          icon={<FileTextIcon className="size-6" />}
          label="קובץ מהמכשיר"
          hint="תמונה או PDF"
          disabled={ocrLoading}
          onClick={() => fileInputRef.current?.click()}
        />
      </div>
      <p className="text-[11px] text-faint">קובץ PDF מרובה עמודים ייקרא מהעמוד הראשון בלבד.</p>

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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f, "file");
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
  amountError,
  status,
  amountIls,
  vatRate,
  filledRequiredCount,
  totalRequiredCount,
  boiLoading,
  saving,
  showDuplicateConfirm,
  onSave,
  onSaveAnyway,
  onCancelDuplicate,
}: {
  draft: ExpenseDraft;
  update: (patch: Partial<ExpenseDraft>) => void;
  missing: string[];
  amountError: string | null;
  status: ReturnType<typeof computeExpenseStatus>;
  amountIls: number;
  vatRate: number;
  filledRequiredCount: number;
  totalRequiredCount: number;
  boiLoading: boolean;
  saving: boolean;
  showDuplicateConfirm: boolean;
  onSave: () => void;
  onSaveAnyway: () => void;
  onCancelDuplicate: () => void;
}) {
  const hasError = (field: string) => missing.includes(field) || (field === "amount" && !!amountError);
  const businessPurposeRequired = AMBIGUOUS_CATEGORY_IDS.has(draft.categoryId);
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

      <p className="text-xs font-medium text-muted">
        {filledRequiredCount} מתוך {totalRequiredCount} שדות חובה מולאו
      </p>

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
                onWheel={numberInputWheelGuard}
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
              onWheel={numberInputWheelGuard}
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
        <Field label="סכום כולל (₪)" required error={missing.includes("amount")}>
          <input
            type="number"
            min={0}
            value={draft.amount}
            onChange={(e) => update({ amount: e.target.value })}
            onWheel={numberInputWheelGuard}
            className={inputCls(hasError("amount"))}
            dir="ltr"
          />
          {confidenceHint("amount")}
          {amountError && <p className="mt-1 text-xs text-alert">{amountError}</p>}
        </Field>
      )}

      <VatLine amountIls={amountIls} isForeignCurrency={draft.isForeignCurrency} vatRate={vatRate} />

      <Field
        label={businessPurposeRequired ? "מטרה עסקית" : "מטרה עסקית (מומלץ)"}
        required={businessPurposeRequired}
        error={hasError("businessPurpose")}
      >
        <textarea
          value={draft.businessPurpose}
          onChange={(e) => update({ businessPurpose: e.target.value })}
          className={cn(inputCls(hasError("businessPurpose")), "min-h-[70px] resize-none")}
          placeholder="למה זו הוצאה עסקית? (עוזר בבדיקה מול רו״ח בהמשך)"
        />
        {businessPurposeRequired && (
          <p className="mt-1 text-[11px] text-due-ink">
            קטגוריה זו נבדקת לרוב מקרוב — כדאי לתעד למה זו הוצאה עסקית.
          </p>
        )}
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

      {showDuplicateConfirm && (
        <div
          role="alert"
          className="rounded-xl border border-due/40 bg-due-bg/40 px-4 py-3 space-y-2.5"
        >
          <div className="flex items-start gap-2 text-xs text-due-ink leading-relaxed">
            <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
            נראה שההוצאה הזאת כבר קיימת — לשמור בכל זאת?
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSaveAnyway}
              disabled={saving}
              className={cn(btn("secondary", "sm"), "flex-1 justify-center")}
            >
              {saving ? "שומר/ת..." : "שמירה בכל זאת"}
            </button>
            <button
              type="button"
              onClick={onCancelDuplicate}
              disabled={saving}
              className={cn(btn("ghost", "sm"), "flex-1 justify-center")}
            >
              ביטול
            </button>
          </div>
        </div>
      )}

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

/**
 * Spec §3: VAT is shown, never entered — a read-only derived line under the
 * amount, tagged "חושב" so it's never mistaken for an editable field.
 * Foreign currency: always 0, with the reason (no Israeli input-VAT on a
 * foreign invoice). עוסק פטור (vatRate 0, local currency): still shown, but
 * flagged as informational only — they have nothing to reclaim.
 */
function VatLine({
  amountIls,
  isForeignCurrency,
  vatRate,
}: {
  amountIls: number;
  isForeignCurrency: boolean;
  vatRate: number;
}) {
  const vat = deriveVat(amountIls, isForeignCurrency, vatRate);
  return (
    <div className="rounded-xl border border-line-soft bg-cream/60 px-3 py-2.5 text-xs space-y-1">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-muted">
          מע״מ גלום בסכום
          <span className="rounded-full bg-brand-deep/10 px-2 py-0.5 text-[10px] font-semibold text-brand-deep">
            חושב
          </span>
        </span>
        <span className="font-bold text-ink">
          {vat.toLocaleString("he-IL", { maximumFractionDigits: 2 })} ₪
        </span>
      </div>
      {isForeignCurrency && (
        <p className="text-[11px] text-muted leading-relaxed">
          חשבונית במטבע זר אינה כוללת מע״מ תשומות ישראלי לניכוי — לכן מוצג כאן 0.
        </p>
      )}
      {!isForeignCurrency && vatRate === 0 && (
        <p className="text-[11px] text-muted leading-relaxed">
          כעוסק פטור אין לך מע״מ תשומות לניכוי — הערך מוצג לצורך מידע בלבד.
        </p>
      )}
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
