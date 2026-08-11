"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { persistPersona } from "@/lib/data/persona-store";
import type { Persona, ExpenseLine, ExpenseCurrency } from "@/lib/persona";
import type { ExtractedReceiptData } from "@/app/api/upload/route";
import {
  matchProfession,
  classifyExpense,
  explainFormula,
} from "@/lib/expense-engine";
import type { Confidence } from "@/lib/expense-engine";
import {
  EXPENSE_CATEGORIES,
  isBusinessPurposeRequired,
  DEMO_RATES,
  convertToIls,
  computeVatAmount,
  deriveRuleFromEntry,
  validateDraftExpense,
  findPossibleDuplicate,
  withNewExpenseLine,
  buildExpensesCsv,
  filterExpenses,
  computeExpenseTotals,
  expenseStatus,
  type ExpenseFilter,
  type DerivedRule,
} from "@/lib/expense-upload";
import { cn, ils, formatDate } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { LegalNote } from "@/components/brand/legal-note";
import { StatusBadge, type Status } from "@/components/brand/status";
import {
  ArrowLeftIcon,
  SettingsIcon,
  UploadIcon,
  ReceiptIcon,
  PaperclipIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XIcon,
  InfoIcon,
  PercentIcon,
  DownloadIcon,
  PlusIcon,
} from "@/components/brand/icons";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB — same convention as api/upload/route.ts
const ACCEPTED_EXT = [".jpg", ".jpeg", ".png", ".pdf"];

/* ──────────────────────────────────────────────────────────────────────────
   Field<T> — one OCR-sourced (or manually entered) value + its provenance.
   `confidence` is the ORIGINAL detection confidence and never changes once
   set (needed for the needs_review average, spec §2); `edited` flips true
   the moment the user changes it, which removes the "זוהה" chip per the
   spec's edge-case table ("המשתמשת עורכת שדה שזוהה → מסירים תגית זוהה").
   ────────────────────────────────────────────────────────────────────────── */
interface Field<T> {
  value: T;
  confidence: number;
  edited: boolean;
}

function field<T>(value: T, confidence = 0): Field<T> {
  return { value, confidence, edited: false };
}

function editField<T>(f: Field<T>, value: T): Field<T> {
  return { value, confidence: f.confidence, edited: true };
}

/** confidence ≥ 0.75 AND not since edited — spec §3.7 display threshold. */
function isDetected<T>(f: Field<T>): boolean {
  return !f.edited && f.confidence >= 0.75;
}

interface ReviewItem {
  id: string;
  fileName: string;
  previewUrl: string | null;
  source: "upload" | "manual";
  status: "uploading" | "ready" | "error" | "saved";
  errorMsg?: string;
  saveAttempted: boolean;

  vendorName: Field<string>;
  documentNumber: Field<string>;
  date: Field<string>;
  totalAmount: Field<string>; // controlled input — parsed to number on save
  currency: Field<ExpenseCurrency>;
  description: Field<string>;

  category: string;
  businessPurpose: string;
  manualDeductionRule: "full" | "partial" | "depreciation" | "";
  manualPartialPercent: string;
}

function emptyReviewItem(id: string, fileName: string, previewUrl: string | null, source: "upload" | "manual"): ReviewItem {
  return {
    id,
    fileName,
    previewUrl,
    source,
    status: "ready",
    saveAttempted: false,
    vendorName: field(""),
    documentNumber: field(""),
    date: field(source === "manual" ? new Date().toISOString().slice(0, 10) : ""),
    totalAmount: field(""),
    currency: field<ExpenseCurrency>("ILS"),
    description: field(""),
    category: "",
    businessPurpose: "",
    manualDeductionRule: "",
    manualPartialPercent: "",
  };
}

function reviewItemFromExtraction(
  id: string,
  fileName: string,
  previewUrl: string | null,
  data: ExtractedReceiptData,
): ReviewItem {
  const base = emptyReviewItem(id, fileName, previewUrl, "upload");
  return {
    ...base,
    status: "ready",
    vendorName: field(data.vendorName.value ?? "", data.vendorName.confidence),
    documentNumber: field(data.documentNumber.value ?? "", data.documentNumber.confidence),
    date: field(data.date.value ?? "", data.date.confidence),
    totalAmount: field(
      data.totalAmount.value != null ? String(data.totalAmount.value) : "",
      data.totalAmount.confidence,
    ),
    currency: field<ExpenseCurrency>(data.currency.value ?? "ILS", data.currency.confidence),
    description: field(data.description.value ?? "", data.description.confidence),
  };
}

const CONFIDENCE_STATUS: Record<Confidence, Status> = {
  A: "on-track",
  B: "due",
  C: "overdue",
};

const CURRENCY_LABEL: Record<ExpenseCurrency, string> = { ILS: "₪", USD: "$", EUR: "€" };

export default function ExpensesPage() {
  const { persona, setPersona } = useRequiredPersona();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [filter, setFilter] = useState<ExpenseFilter>("all");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  if (!persona) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="space-y-3 w-96 animate-pulse">
          <div className="h-6 rounded-lg bg-sand w-1/2 mx-auto" />
          <div className="h-12 rounded-xl bg-sand" />
          <div className="h-48 rounded-2xl bg-sand" />
        </div>
      </div>
    );
  }

  // Explicit non-null alias: `persona` narrows to non-null above, but that
  // narrowing doesn't reach into nested closures (handleSave etc.) below —
  // same pattern as business-expenses/page.tsx's `currentPersona`.
  const currentPersona: Persona = persona;
  const year = persona.income.year;
  const profession = matchProfession(persona.business.primaryOccupation, year);
  const expenses = persona.income.expenses ?? [];
  const pendingItems = items.filter((i) => i.status !== "saved");

  function updateItem(id: string, patch: Partial<ReviewItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }

  function addManualItem() {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, emptyReviewItem(id, "הזנה ידנית", null, "manual")]);
  }

  async function handleFiles(fileList: FileList | File[]) {
    for (const file of Array.from(fileList)) {
      const id = crypto.randomUUID();
      const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;

      if (!ACCEPTED_EXT.includes(ext)) {
        setItems((prev) => [
          ...prev,
          {
            ...emptyReviewItem(id, file.name, previewUrl, "upload"),
            status: "error",
            errorMsg: "פורמט לא נתמך — צרי JPG, PNG או PDF",
          },
        ]);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setItems((prev) => [
          ...prev,
          {
            ...emptyReviewItem(id, file.name, previewUrl, "upload"),
            status: "error",
            errorMsg: "קובץ גדול מדי (מקסימום 5MB)",
          },
        ]);
        continue;
      }

      setItems((prev) => [
        ...prev,
        { ...emptyReviewItem(id, file.name, previewUrl, "upload"), status: "uploading" },
      ]);

      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", "receipt");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error ?? "שגיאה בעיבוד הקובץ");
        const data: ExtractedReceiptData = json.data;
        setItems((prev) =>
          prev.map((it) => (it.id === id ? reviewItemFromExtraction(id, file.name, previewUrl, data) : it)),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "שגיאת רשת";
        updateItem(id, { status: "error", errorMsg: msg });
      }
    }
  }

  function handleSave(item: ReviewItem) {
    const amountNum = Number(item.totalAmount.value);
    const clf = classifyExpense(item.description.value, profession?.id ?? null, year);
    const derived = deriveRuleFromEntry(clf.entry);
    const hasRecognitionRate =
      derived.auto ||
      item.manualDeductionRule === "full" ||
      ((item.manualDeductionRule === "partial" || item.manualDeductionRule === "depreciation") &&
        item.manualPartialPercent.trim() !== "" &&
        Number.isFinite(Number(item.manualPartialPercent)));

    const validation = validateDraftExpense({
      vendorName: item.vendorName.value,
      documentNumber: item.documentNumber.value,
      date: item.date.value,
      totalAmount: Number.isFinite(amountNum) && amountNum > 0 ? amountNum : null,
      category: item.category,
      businessPurpose: item.businessPurpose,
      hasRecognitionRate,
    });

    updateItem(item.id, { saveAttempted: true });

    if (!validation.isValid) {
      const el = bannerRefs.current.get(item.id);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const { ilsAmount, exchangeRate } = convertToIls(amountNum, item.currency.value);
    const vat = computeVatAmount(ilsAmount, item.currency.value, year);

    const { rule, percent } = derived.auto
      ? { rule: derived.rule, percent: derived.partialPercent }
      : {
          rule: item.manualDeductionRule as "full" | "partial" | "depreciation",
          percent:
            item.manualDeductionRule === "full"
              ? undefined
              : Number(item.manualPartialPercent),
        };

    const ocrConfidences = [
      item.vendorName.confidence,
      item.documentNumber.confidence,
      item.date.confidence,
      item.totalAmount.confidence,
    ];
    const avgConfidence = ocrConfidences.reduce((a, b) => a + b, 0) / ocrConfidences.length;
    const needsReview = item.source === "upload" && avgConfidence < 0.7;

    const newLine: ExpenseLine = {
      date: item.date.value,
      vendorName: item.vendorName.value.trim(),
      description: item.description.value.trim() || item.category,
      amount: ilsAmount,
      vat,
      category: item.category,
      deductionRule: rule,
      partialPercent: percent,
      documentNumber: item.documentNumber.value.trim(),
      businessPurpose: item.businessPurpose.trim() || undefined,
      currency: item.currency.value,
      originalAmount: amountNum,
      exchangeRate,
      needsReview,
    };

    const updated = withNewExpenseLine(currentPersona, newLine);
    persistPersona(updated);
    setPersona(updated);
    updateItem(item.id, { status: "saved" });
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  }

  function handleExportCsv() {
    const csv = buildExpensesCsv(expenses);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `הוצאות-${year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const filtered = filterExpenses(expenses, filter);
  const totals = computeExpenseTotals(filtered);
  const needsReviewCount = expenses.filter((e) => expenseStatus(e) === "needs-review").length;

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center">
              <Logo size={28} />
            </Link>
            <span className="text-[11px] text-muted leading-tight">הוצאות וקבלות</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className={btn("secondary", "sm")}>
              <ArrowLeftIcon className="size-3.5" />
              חזור ללוח הבית
            </Link>
            <Link href="/business-expenses" className={btn("ghost", "sm")}>
              <SettingsIcon className="size-3.5" />
              מדריך הוצאות
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-8 space-y-8">
        {/* Hero */}
        <div className="rounded-2xl border border-line bg-paper shadow-brand p-6">
          <div className="text-[11px] font-bold text-brand-deep uppercase tracking-wider mb-1">
            הוצאות עסקיות
          </div>
          <h1 className="text-2xl font-extrabold text-brand-navy mb-1">קבלות והוצאות</h1>
          <p className="text-sm text-muted">
            העלי קבלות — countme תזהה את הפרטים אוטומטית ותציע שיעור הכרה לפי מנוע ההוצאות של
            {" "}{year}. את/ה תמיד מאשר/ת לפני שמירה.
          </p>
        </div>

        {needsReviewCount > 0 && (
          <div className="rounded-xl border border-due/30 bg-due-bg/40 px-4 py-3 text-[13px] text-ink flex items-center gap-2">
            <AlertTriangleIcon className="size-4 shrink-0 text-due" />
            <span>
              יש לך <strong>{needsReviewCount}</strong>{" "}
              {needsReviewCount === 1 ? "קבלה שמחכה" : "קבלות שמחכות"} לבדיקה שלך (זיהוי חלקי).
            </span>
          </div>
        )}

        {/* Upload panel */}
        <section>
          <h2 className="text-base font-bold text-brand-navy mb-3">העלאת קבלות</h2>
          <div
            className={cn(
              "rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
              isDragging ? "border-brand-deep bg-teal-100/40" : "border-line bg-paper hover:border-brand-deep/50",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
            }}
          >
            <UploadIcon className="size-8 mx-auto text-brand-deep mb-2" />
            <p className="text-sm font-semibold text-brand-navy mb-1">
              גררי קבלות לכאן, או בחרי קבצים
            </p>
            <p className="text-[12px] text-muted mb-4">
              JPG, PNG או PDF (עמוד יחיד) — עד 5MB לקובץ, אפשר כמה קבלות ברצף
            </p>
            <div className="flex items-center justify-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXT.join(",")}
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) void handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button type="button" onClick={() => fileInputRef.current?.click()} className={btn("primary", "sm")}>
                <PaperclipIcon className="size-3.5" />
                בחר/י קבצים
              </button>
              <button type="button" onClick={addManualItem} className={btn("secondary", "sm")}>
                <PlusIcon className="size-3.5" />
                הזנה ידנית
              </button>
            </div>
          </div>
        </section>

        {/* Review-and-confirm cards */}
        {pendingItems.length > 0 && (
          <section className="space-y-5">
            <h2 className="text-base font-bold text-brand-navy">בדיקת פרטים ({pendingItems.length})</h2>
            {pendingItems.map((item) => (
              <ReviewCard
                key={item.id}
                item={item}
                year={year}
                professionId={profession?.id ?? null}
                existingExpenses={expenses}
                bannerRef={(el) => {
                  if (el) bannerRefs.current.set(item.id, el);
                  else bannerRefs.current.delete(item.id);
                }}
                onChange={(patch) => updateItem(item.id, patch)}
                onRemove={() => removeItem(item.id)}
                onSave={() => handleSave(item)}
              />
            ))}
          </section>
        )}

        {/* Summary / list */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-base font-bold text-brand-navy">כל ההוצאות</h2>
            <button type="button" onClick={handleExportCsv} className={btn("gold", "sm")} disabled={expenses.length === 0}>
              <DownloadIcon className="size-3.5" />
              ייצוא קובץ מסכם ל-{year}
            </button>
          </div>

          {/* Totals card — updates live with the active filter */}
          <div className="rounded-2xl bg-brand-navy text-white shadow-brand p-5 flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <TotalStat label="סה״כ (לפי סינון)" value={ils(Math.round(totals.totalAmount))} />
            <TotalStat label="מזה מע״מ" value={ils(Math.round(totals.totalVat))} accent />
            <TotalStat label="קבלות" value={String(totals.count)} />
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(
              [
                ["all", "הכל"],
                ["this-month", "חודש נוכחי"],
                ["full", "מוכר במלואו"],
                ["partial", "מוכר חלקית"],
                ["needs-review", "דורש בדיקה"],
              ] as [ExpenseFilter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors",
                  filter === key
                    ? "bg-brand-navy text-white border-brand-navy"
                    : "bg-paper text-ink border-line hover:border-brand-deep",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-line bg-paper px-4 py-8 text-center text-[13px] text-muted">
              אין הוצאות להצגה בסינון הזה.
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-paper shadow-brand overflow-hidden">
              {filtered.map((e, i) => (
                <ExpenseRow key={i} line={e} />
              ))}
            </div>
          )}

          <p className="text-[11px] text-faint leading-relaxed">
            הייצוא כולל שכבת סיכום לפי קטגוריה (למה שנכנס לדוח השנתי) ושכבת פירוט מלאה עם כל שדה,
            כולל הוצאות שסומנו &quot;דורש בדיקה&quot; — הן לא מדולגות בשקט.
          </p>
        </section>

        <FooterDisclaimer year={year} />
      </main>
    </div>
  );
}

function TotalStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10.5px] opacity-70 mb-0.5">{label}</div>
      <div className={cn("text-2xl font-extrabold", accent && "text-aqua")}>{value}</div>
    </div>
  );
}

function ExpenseRow({ line }: { line: ExpenseLine }) {
  const status = expenseStatus(line);
  const statusMap: Record<typeof status, { label: string; s: Status }> = {
    full: { label: "מוכר במלואו", s: "on-track" },
    partial: { label: line.deductionRule === "depreciation" ? "פחת" : "מוכר חלקית", s: "plan" },
    "needs-review": { label: "דורש בדיקה", s: "overdue" },
  };
  const meta = statusMap[status];
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-b-0">
      <ReceiptIcon className="size-4 shrink-0 text-faint" />
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-ink truncate">{line.vendorName}</div>
        <div className="text-[11px] text-muted truncate">
          {formatDate(line.date)} · {line.category}
          {line.currency && line.currency !== "ILS" && ` · ${CURRENCY_LABEL[line.currency]}${line.originalAmount}`}
        </div>
      </div>
      <StatusBadge status={meta.s} showDot={false} className="shrink-0">
        {meta.label}
      </StatusBadge>
      <div className="text-end shrink-0 w-24">
        <div className="text-[13.5px] font-bold text-ink tabular-nums">{ils(Math.round(line.amount))}</div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Review card — one card per pending file/manual entry.
   ────────────────────────────────────────────────────────────────────────── */
function ReviewCard({
  item,
  year,
  professionId,
  existingExpenses,
  bannerRef,
  onChange,
  onRemove,
  onSave,
}: {
  item: ReviewItem;
  year: number;
  professionId: string | null;
  existingExpenses: ExpenseLine[];
  bannerRef: (el: HTMLDivElement | null) => void;
  onChange: (patch: Partial<ReviewItem>) => void;
  onRemove: () => void;
  onSave: () => void;
}) {
  const clf = useMemo(
    () => classifyExpense(item.description.value, professionId, year),
    [item.description.value, professionId, year],
  );
  const derived: DerivedRule = useMemo(() => deriveRuleFromEntry(clf.entry), [clf.entry]);

  const amountNum = Number(item.totalAmount.value);
  const hasRecognitionRate =
    derived.auto ||
    item.manualDeductionRule === "full" ||
    ((item.manualDeductionRule === "partial" || item.manualDeductionRule === "depreciation") &&
      item.manualPartialPercent.trim() !== "" &&
      Number.isFinite(Number(item.manualPartialPercent)));

  const validation = validateDraftExpense({
    vendorName: item.vendorName.value,
    documentNumber: item.documentNumber.value,
    date: item.date.value,
    totalAmount: Number.isFinite(amountNum) && amountNum > 0 ? amountNum : null,
    category: item.category,
    businessPurpose: item.businessPurpose,
    hasRecognitionRate,
  });
  const missingSet = new Set(validation.missing.map((m) => m.field));

  const duplicate =
    item.vendorName.value.trim() && Number.isFinite(amountNum) && amountNum > 0 && item.date.value
      ? findPossibleDuplicate(existingExpenses, {
          vendorName: item.vendorName.value,
          amount: amountNum,
          date: item.date.value,
        })
      : null;

  const vatAmount =
    Number.isFinite(amountNum) && amountNum > 0
      ? computeVatAmount(
          item.currency.value === "ILS" ? amountNum : convertToIls(amountNum, item.currency.value).ilsAmount,
          item.currency.value,
          year,
        )
      : 0;

  if (item.status === "uploading") {
    return (
      <div className="rounded-2xl border border-line bg-paper shadow-brand p-5 flex items-center gap-3">
        <span className="inline-block h-4 w-4 rounded-full border-2 border-brand-deep/30 border-t-brand-deep animate-spin" />
        <span className="text-sm text-brand-navy">מזהה נתונים מ־{item.fileName}...</span>
      </div>
    );
  }

  if (item.status === "error") {
    return (
      <div className="rounded-2xl border border-alert/40 bg-overdue-bg/30 shadow-brand p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-alert text-sm">
          <AlertTriangleIcon className="size-4 shrink-0" />
          <span>
            {item.fileName}: {item.errorMsg}
          </span>
        </div>
        <button type="button" onClick={onRemove} className={btn("ghost", "sm")}>
          <XIcon className="size-3.5" />
          הסר
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-paper shadow-brand overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line bg-cream/60">
        <div className="flex items-center gap-2 min-w-0">
          {item.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.previewUrl} alt="" className="size-9 rounded-lg object-cover border border-line shrink-0" />
          ) : (
            <div className="size-9 rounded-lg bg-sand flex items-center justify-center shrink-0">
              <ReceiptIcon className="size-4 text-faint" />
            </div>
          )}
          <span className="text-[12.5px] font-semibold text-brand-navy truncate">{item.fileName}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-muted whitespace-nowrap">
            {validation.filledCount} מתוך {validation.requiredCount} שדות חובה מולאו
          </span>
          <button type="button" onClick={onRemove} aria-label="הסר" className="text-faint hover:text-alert transition-colors">
            <XIcon className="size-4" />
          </button>
        </div>
      </div>

      {item.saveAttempted && !validation.isValid && (
        <div
          ref={bannerRef}
          className="mx-5 mt-4 rounded-xl border border-alert/40 bg-overdue-bg/60 px-4 py-3 text-[12.5px] text-alert-ink flex items-start gap-2"
        >
          <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
          <span>
            <strong>אי אפשר לשמור עדיין</strong> — חסרים: {validation.missing.map((m) => m.label).join(", ")}.
          </span>
        </div>
      )}

      {duplicate && (
        <div className="mx-5 mt-4 rounded-xl border border-due/30 bg-due-bg/40 px-4 py-3 text-[12px] text-ink flex items-start gap-2">
          <InfoIcon className="size-4 shrink-0 mt-0.5 text-due" />
          <span>נראה שזה כבר קיים — יש כבר הוצאה דומה (אותו ספק וסכום) בסביבות אותו תאריך. אפשר לשמור בכל זאת.</span>
        </div>
      )}

      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ReviewField
          label="ספק / עסק"
          required
          value={item.vendorName.value}
          onChange={(v) => onChange({ vendorName: editField(item.vendorName, v) })}
          detected={isDetected(item.vendorName)}
          error={item.saveAttempted && missingSet.has("vendorName") ? "שדה חובה" : undefined}
          placeholder="שם הספק"
        />
        <ReviewField
          label="מספר קבלה / חשבונית"
          required
          value={item.documentNumber.value}
          onChange={(v) => onChange({ documentNumber: editField(item.documentNumber, v) })}
          detected={isDetected(item.documentNumber)}
          error={item.saveAttempted && missingSet.has("documentNumber") ? "שדה חובה" : undefined}
          placeholder="INV-2026-..."
          dir="ltr"
        />
        <ReviewField
          label="תאריך"
          required
          type="date"
          value={item.date.value}
          onChange={(v) => onChange({ date: editField(item.date, v) })}
          detected={isDetected(item.date)}
          error={item.saveAttempted && missingSet.has("date") ? "שדה חובה" : undefined}
          dir="ltr"
        />

        {/* Amount + currency */}
        <div>
          <label className="block text-[12px] font-semibold text-muted mb-1.5">
            סכום כולל <span className="text-alert ms-1">*</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                min={0}
                step="0.01"
                dir="ltr"
                value={item.totalAmount.value}
                onChange={(e) => onChange({ totalAmount: editField(item.totalAmount, e.target.value) })}
                placeholder="0.00"
                className={cn(
                  "w-full rounded-xl border px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-deep/15",
                  item.saveAttempted && missingSet.has("totalAmount")
                    ? "border-alert bg-overdue-bg/30"
                    : isDetected(item.totalAmount)
                      ? "border-brand-deep/40 bg-info/40"
                      : "border-line bg-paper focus:border-brand-deep",
                )}
              />
              {isDetected(item.totalAmount) && !(item.saveAttempted && missingSet.has("totalAmount")) && (
                <span className="absolute inset-y-0 end-3 flex items-center text-[10px] font-bold text-brand-deep">
                  זוהה
                </span>
              )}
            </div>
            <select
              value={item.currency.value}
              onChange={(e) =>
                onChange({ currency: editField(item.currency, e.target.value as ExpenseCurrency) })
              }
              className={cn(
                "rounded-xl border px-2.5 py-2.5 text-sm bg-paper",
                isDetected(item.currency) ? "border-brand-deep/40 bg-info/40" : "border-line",
              )}
            >
              <option value="ILS">₪ שקל</option>
              <option value="USD">$ דולר</option>
              <option value="EUR">€ יורו</option>
            </select>
          </div>
          {item.saveAttempted && missingSet.has("totalAmount") && (
            <p className="mt-1 text-[11px] text-alert">שדה חובה</p>
          )}
          {item.currency.value !== "ILS" && (
            <p className="mt-1 text-[11px] text-muted">
              שער המרה לדוגמה: 1 {item.currency.value} = {DEMO_RATES[item.currency.value]} ₪ (דמו — לא שער בנק ישראל
              רשמי)
            </p>
          )}
        </div>

        {/* VAT — read-only, computed */}
        <div>
          <label className="block text-[12px] font-semibold text-muted mb-1.5">מזה מע״מ</label>
          <div className="rounded-xl border border-dashed border-brand-deep/40 bg-cream px-3.5 py-2.5 text-sm flex items-center justify-between">
            <span className="tabular-nums">{ils(Math.round(vatAmount))}</span>
            <span className="text-[10px] font-bold text-brand-deep">חושב</span>
          </div>
          {item.currency.value !== "ILS" && (
            <p className="mt-1 text-[11px] text-muted">
              אין מע״מ ישראלי על חשבונית מספק זר — אין מס תשומות לקזז (המע״מ מוצג כ-₪0 בכוונה, לא שדה ריק).
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-[12px] font-semibold text-muted mb-1.5">
            קטגוריה <span className="text-alert ms-1">*</span>
          </label>
          <select
            value={item.category}
            onChange={(e) => onChange({ category: e.target.value })}
            className={cn(
              "w-full rounded-xl border px-3.5 py-2.5 text-sm bg-paper transition-colors focus:outline-none focus:ring-2 focus:ring-brand-deep/15",
              item.saveAttempted && missingSet.has("category") ? "border-alert bg-overdue-bg/30" : "border-line",
            )}
          >
            <option value="">בחר/י קטגוריה...</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {item.saveAttempted && missingSet.has("category") && (
            <p className="mt-1 text-[11px] text-alert">שדה חובה</p>
          )}
        </div>

        {/* Description — free text, feeds classifyExpense */}
        <div className="sm:col-span-2">
          <label className="block text-[12px] font-semibold text-muted mb-1.5">תיאור ההוצאה</label>
          <input
            type="text"
            value={item.description.value}
            onChange={(e) => onChange({ description: editField(item.description, e.target.value) })}
            placeholder="למשל: Adobe Creative Cloud, ארוחת עסקים עם לקוח..."
            className={cn(
              "w-full rounded-xl border px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-deep/15",
              isDetected(item.description) ? "border-brand-deep/40 bg-info/40" : "border-line bg-paper focus:border-brand-deep",
            )}
          />
        </div>

        {/* Business purpose — dynamically required */}
        <div className="sm:col-span-2">
          <label className="block text-[12px] font-semibold text-muted mb-1.5">
            מה זה שימש בעסק?{" "}
            {isBusinessPurposeRequired(item.category) ? (
              <span className="text-alert ms-1">*</span>
            ) : (
              <span className="text-faint font-normal">(מומלץ)</span>
            )}
          </label>
          <input
            type="text"
            value={item.businessPurpose}
            onChange={(e) => onChange({ businessPurpose: e.target.value })}
            placeholder="למשל: פגישה עם לקוח על פרויקט X"
            className={cn(
              "w-full rounded-xl border px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-deep/15",
              item.saveAttempted && missingSet.has("businessPurpose")
                ? "border-alert bg-overdue-bg/30"
                : "border-line bg-paper focus:border-brand-deep",
            )}
          />
          {item.saveAttempted && missingSet.has("businessPurpose") && (
            <p className="mt-1 text-[11px] text-alert">
              שדה חובה עבור קטגוריה &quot;{item.category}&quot; — הקשר עסקי לא מובן מאליו
            </p>
          )}
        </div>

        {/* Recognition rate */}
        <div className="sm:col-span-2">
          <label className="block text-[12px] font-semibold text-muted mb-1.5">שיעור הכרה</label>
          {derived.auto ? (
            <div className="rounded-xl border border-brand-deep/25 bg-info/25 px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <PercentIcon className="size-3.5 shrink-0 text-brand-deep" />
                <span className="text-[12.5px] font-bold text-brand-navy">
                  {clf.entry ? explainFormula(clf.entry.formula) : ruleFallbackLabel(derived)}
                </span>
              </div>
              <div className="text-[10.5px] text-faint">השיעור: קבוע בדין</div>
              {clf.entry && (
                <div className="flex items-center gap-2 pt-0.5">
                  <StatusBadge status={CONFIDENCE_STATUS[clf.entry.eligibilityConfidence]} showDot={false}>
                    התאמה {clf.entry.eligibilityConfidence}
                  </StatusBadge>
                  <span className="text-[10.5px] text-faint">
                    ההתאמה למקצוע שלך: הערכה, רמת ביטחון {clf.entry.eligibilityConfidence}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              className={cn(
                "rounded-xl border px-4 py-3 space-y-2",
                item.saveAttempted && missingSet.has("recognitionRate")
                  ? "border-alert bg-overdue-bg/40"
                  : "border-due/30 bg-due-bg/30",
              )}
            >
              <p className="text-[12px] text-ink flex items-start gap-1.5">
                <AlertTriangleIcon className="size-3.5 shrink-0 mt-0.5 text-due" />
                <span>
                  {clf.entry
                    ? explainFormula(clf.entry.formula)
                    : "לא נמצאה התאמה אוטומטית לפי התיאור — בחר/י שיעור הכרה ידנית. countme לא מנחשת בשמך."}
                </span>
              </p>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={item.manualDeductionRule}
                  onChange={(e) =>
                    onChange({ manualDeductionRule: e.target.value as ReviewItem["manualDeductionRule"] })
                  }
                  className="rounded-lg border border-line bg-paper px-3 py-2 text-[12.5px]"
                >
                  <option value="">בחר/י כלל...</option>
                  <option value="full">מוכר במלואו (100%)</option>
                  <option value="partial">מוכר חלקית</option>
                  <option value="depreciation">פחת שנתי</option>
                </select>
                {(item.manualDeductionRule === "partial" || item.manualDeductionRule === "depreciation") && (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    dir="ltr"
                    value={item.manualPartialPercent}
                    onChange={(e) => onChange({ manualPartialPercent: e.target.value })}
                    placeholder="אחוז %"
                    className="w-24 rounded-lg border border-line bg-paper px-3 py-2 text-[12.5px]"
                  />
                )}
              </div>
              {item.saveAttempted && missingSet.has("recognitionRate") && (
                <p className="text-[11px] text-alert">יש לבחור שיעור הכרה לפני שמירה</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pb-5">
        <button type="button" onClick={onSave} className={cn(btn("primary", "md"), "w-full")}>
          <CheckCircleIcon className="size-4" />
          שמירה ברשימת ההוצאות
        </button>
      </div>
    </div>
  );
}

function ruleFallbackLabel(derived: DerivedRule): string {
  if (derived.rule === "full") return "מוכר במלואו (100%)";
  if (derived.rule === "depreciation") return `פחת שנתי ${derived.partialPercent ?? 0}%`;
  return `מוכר ${derived.partialPercent ?? 0}%`;
}

function ReviewField({
  label,
  required,
  value,
  onChange,
  detected,
  error,
  placeholder,
  type = "text",
  dir,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  detected?: boolean;
  error?: string;
  placeholder?: string;
  type?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-muted mb-1.5">
        {label}
        {required && <span className="text-alert ms-1">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          dir={dir}
          className={cn(
            "w-full rounded-xl border px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-deep/15",
            error
              ? "border-alert bg-overdue-bg/30 focus:border-alert"
              : detected
                ? "border-brand-deep/40 bg-info/40 focus:border-brand-deep"
                : "border-line bg-paper focus:border-brand-deep",
          )}
        />
        {detected && !error && (
          <span className="absolute inset-y-0 end-3 flex items-center text-[10px] font-bold text-brand-deep">
            זוהה
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-alert">{error}</p>}
    </div>
  );
}

function FooterDisclaimer({ year }: { year: number }) {
  return (
    <div className="mt-4 text-center text-[11px] text-faint leading-relaxed">
      <p>
        זיהוי הפרטים והשיעורים המוצגים מבוססים על מנוע ההוצאות ({year}) ופרסומים פומביים של רשות
        המסים. יש לבדוק ולערוך כל שדה לפני שמירה — countme לא מגישה דבר בשמך.
      </p>
      <LegalNote variant="line" className="mt-1 text-[11px]" />
    </div>
  );
}
