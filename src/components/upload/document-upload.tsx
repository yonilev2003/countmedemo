"use client";

import { useState, useRef } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import type { ExtractedData } from "@/app/api/upload/route";
import { btn } from "@/components/brand/button";
import {
  FileTextIcon,
  UploadIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  BarChartIcon,
  WalletIcon,
  ReceiptIcon,
  InfoIcon,
  XIcon,
} from "@/components/brand/icons";

type Kind = "income-report" | "expenses-excel" | "form-106" | "donations";

interface SlotConfig {
  kind: Kind;
  title: string;
  hint: string;
  accept: string;
  Icon: React.FC<{ className?: string }>;
}

const SLOTS: SlotConfig[] = [
  {
    kind: "income-report",
    title: "דו״ח הכנסות תקופתי",
    hint: "PDF — מתוכנת הנהלת חשבונות / מאזן",
    accept: ".pdf,application/pdf",
    Icon: FileTextIcon,
  },
  {
    kind: "expenses-excel",
    title: "אקסל הוצאות",
    hint: "XLSX — קבלות וחשבוניות שאוסיף לקטגוריות",
    accept: ".xlsx,.xls",
    Icon: BarChartIcon,
  },
  {
    kind: "form-106",
    title: "טופס 106",
    hint: "PDF — תלוש שכר שנתי (אם יש הכנסה כשכיר)",
    accept: ".pdf,application/pdf",
    Icon: WalletIcon,
  },
  {
    kind: "donations",
    title: "קבלות תרומה (סעיף 46)",
    hint: "PDF — אישור על תרומה למוסד מוכר",
    accept: ".pdf,application/pdf",
    Icon: ReceiptIcon,
  },
];

interface SlotState {
  status: "idle" | "uploading" | "done" | "error";
  fileName?: string;
  data?: ExtractedData;
  error?: string;
}

interface Props {
  onExtracted: (kind: Kind, data: ExtractedData) => void;
  /** When all extractions are applied, the parent moves on. */
  onSkip?: () => void;
}

export function DocumentUpload({ onExtracted, onSkip }: Props) {
  const [slots, setSlots] = useState<Record<Kind, SlotState>>({
    "income-report": { status: "idle" },
    "expenses-excel": { status: "idle" },
    "form-106": { status: "idle" },
    donations: { status: "idle" },
  });

  async function handleFile(kind: Kind, file: File) {
    setSlots((s) => ({ ...s, [kind]: { status: "uploading", fileName: file.name } }));

    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "שגיאה בעיבוד");
      }
      const data: ExtractedData = json.data;
      setSlots((s) => ({
        ...s,
        [kind]: { status: "done", fileName: file.name, data },
      }));
      onExtracted(kind, data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה";
      setSlots((s) => ({
        ...s,
        [kind]: { status: "error", fileName: file.name, error: msg },
      }));
    }
  }

  const anyDone = Object.values(slots).some((s) => s.status === "done");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-brand-deep/20 bg-teal-100/40 px-4 py-3 text-[13px] text-brand-navy leading-relaxed flex gap-2 items-start">
        <InfoIcon className="size-4 shrink-0 mt-0.5 text-brand-deep" />
        <div>
          <p className="font-bold mb-1">מסלול מהיר — חסכי זמן</p>
          <p>
            העלי מסמכים שכבר יש לך (דו״ח הכנסות, אקסל הוצאות, טופס 106) ואני אחלץ
            את הנתונים אוטומטית. כל מה שלא תעלי — תוכלי למלא ידנית בהמשך.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SLOTS.map((cfg) => (
          <SlotCard
            key={cfg.kind}
            config={cfg}
            state={slots[cfg.kind]}
            onFile={(f) => handleFile(cfg.kind, f)}
            onClear={() =>
              setSlots((s) => ({ ...s, [cfg.kind]: { status: "idle" } }))
            }
          />
        ))}
      </div>

      {onSkip && (
        <div className="flex items-center justify-between pt-2 border-t border-line">
          <p className="text-xs text-muted">
            {anyDone
              ? "הנתונים יעברו לשלבים הבאים — תוכלי לערוך אותם שם."
              : "אין לך מסמכים כרגע? אפשר לדלג ולמלא הכל ידנית."}
          </p>
          <button
            type="button"
            onClick={onSkip}
            className={btn("primary", "sm")}
          >
            {anyDone ? "המשך עם הנתונים שחילצתי" : "דלג על העלאה"}
          </button>
        </div>
      )}
    </div>
  );
}

function SlotCard({
  config,
  state,
  onFile,
  onClear,
}: {
  config: SlotConfig;
  state: SlotState;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  const { Icon } = config;

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 transition-colors",
        state.status === "done"
          ? "border-success/40 bg-success-light/30"
          : state.status === "error"
            ? "border-alert/40 bg-overdue-bg/30"
            : isDragging
              ? "border-brand-deep bg-teal-100/40"
              : "border-dashed border-line bg-cream hover:border-brand-deep/50 hover:bg-teal-100/20",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="flex items-start gap-3 mb-3">
        <Icon className="size-5 shrink-0 text-brand-deep mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-brand-navy">{config.title}</h4>
          <p className="text-[11px] text-muted mt-0.5 leading-tight">
            {config.hint}
          </p>
        </div>
      </div>

      {state.status === "idle" && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={config.accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={btn("secondary", "sm", "w-full")}
          >
            <UploadIcon className="size-3.5" />
            גררי קובץ או לחצי לבחירה
          </button>
        </>
      )}

      {state.status === "uploading" && (
        <div className="flex items-center gap-2 text-xs text-brand-deep">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-brand-deep/30 border-t-brand-deep animate-spin" />
          מחלץ נתונים מ-{state.fileName}...
        </div>
      )}

      {state.status === "done" && state.data && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-success font-bold flex items-center gap-1">
              <CheckCircleIcon className="size-3.5" />
              חולץ בהצלחה
            </span>
            <button
              type="button"
              onClick={onClear}
              className={btn("ghost", "sm")}
            >
              החלף קובץ
            </button>
          </div>
          <ExtractedSummary data={state.data} />
        </div>
      )}

      {state.status === "error" && (
        <div className="space-y-2">
          <p className="text-xs text-alert flex items-center gap-1">
            <AlertTriangleIcon className="size-3.5 shrink-0" />
            {state.error}
          </p>
          <button
            type="button"
            onClick={onClear}
            className={btn("ghost", "sm")}
          >
            נסי קובץ אחר
          </button>
        </div>
      )}
    </div>
  );
}

function ExtractedSummary({ data }: { data: ExtractedData }) {
  const lines: { label: string; value: string }[] = [];
  if (data.totalRevenue != null)
    lines.push({ label: "סך הכנסות", value: formatCurrency(data.totalRevenue) });
  if (data.osekFileNumber)
    lines.push({ label: "מספר עוסק", value: data.osekFileNumber });
  if (data.osekType)
    lines.push({
      label: "סוג עוסק",
      value: data.osekType === "patur" ? "פטור" : "מורשה",
    });
  if (data.fullName) lines.push({ label: "שם מלא", value: data.fullName });
  if (data.email) lines.push({ label: 'דוא"ל', value: data.email });
  if (data.phone) lines.push({ label: "טלפון", value: data.phone });
  if (data.totalExpenses != null)
    lines.push({
      label: "סך הוצאות",
      value: formatCurrency(data.totalExpenses),
    });
  if (data.expensesByCategory && data.expensesByCategory.length > 0) {
    lines.push({
      label: "קטגוריות",
      value: `${data.expensesByCategory.length} קטגוריות`,
    });
  }
  if (data.salaryGross != null)
    lines.push({
      label: "שכר ברוטו",
      value: formatCurrency(data.salaryGross),
    });
  if (data.donationsTotal != null)
    lines.push({
      label: "סך תרומות",
      value: formatCurrency(data.donationsTotal),
    });

  if (lines.length === 0) {
    return (
      <p className="text-muted italic">לא חולצו נתונים מובנים מהקובץ.</p>
    );
  }

  return (
    <ul className="space-y-1">
      {lines.map((l, i) => (
        <li key={i} className="flex justify-between gap-2">
          <span className="text-muted">{l.label}:</span>
          <span className="font-semibold text-ink tabular-nums">
            {l.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
