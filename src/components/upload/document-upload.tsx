"use client";

import { useState, useRef } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import type { ExtractedData } from "@/app/api/upload/route";

type Kind = "income-report" | "expenses-excel" | "form-106" | "donations";

interface SlotConfig {
  kind: Kind;
  title: string;
  hint: string;
  accept: string;
  icon: string;
}

const SLOTS: SlotConfig[] = [
  {
    kind: "income-report",
    title: "דו״ח הכנסות תקופתי",
    hint: "PDF — מתוכנת הנהלת חשבונות / מאזן",
    accept: ".pdf,application/pdf",
    icon: "📄",
  },
  {
    kind: "expenses-excel",
    title: "אקסל הוצאות",
    hint: "XLSX — קבלות וחשבוניות שאוסיף לקטגוריות",
    accept: ".xlsx,.xls",
    icon: "📊",
  },
  {
    kind: "form-106",
    title: "טופס 106",
    hint: "PDF — תלוש שכר שנתי (אם יש הכנסה כשכיר)",
    accept: ".pdf,application/pdf",
    icon: "💼",
  },
  {
    kind: "donations",
    title: "קבלות תרומה (סעיף 46)",
    hint: "PDF — אישור על תרומה למוסד מוכר",
    accept: ".pdf,application/pdf",
    icon: "❤️",
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
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] text-blue-900 leading-relaxed">
        <p className="font-bold mb-1">⚡ מסלול מהיר — חסכי זמן</p>
        <p>
          העלי מסמכים שכבר יש לך (דו״ח הכנסות, אקסל הוצאות, טופס 106) ואני אחלץ
          את הנתונים אוטומטית. כל מה שלא תעלי — תוכלי למלא ידנית בהמשך.
        </p>
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
        <div className="flex items-center justify-between pt-2 border-t border-stone-200">
          <p className="text-xs text-stone-500">
            {anyDone
              ? "הנתונים יעברו לשלבים הבאים — תוכלי לערוך אותם שם."
              : "אין לך מסמכים כרגע? אפשר לדלג ולמלא הכל ידנית."}
          </p>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 transition-colors"
          >
            {anyDone ? "המשך עם הנתונים שחילצתי" : "דלג על העלאה →"}
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

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 transition-colors",
        state.status === "done"
          ? "border-emerald-300 bg-emerald-50"
          : state.status === "error"
            ? "border-red-300 bg-red-50"
            : isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-dashed border-stone-300 bg-stone-50 hover:border-blue-400 hover:bg-blue-50",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl shrink-0">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-stone-800">{config.title}</h4>
          <p className="text-[11px] text-stone-500 mt-0.5 leading-tight">
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
            className="w-full rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium py-2 transition-colors"
          >
            גררי קובץ או לחצי לבחירה
          </button>
        </>
      )}

      {state.status === "uploading" && (
        <div className="flex items-center gap-2 text-xs text-blue-700">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-blue-300 border-t-blue-700 animate-spin" />
          מחלץ נתונים מ-{state.fileName}...
        </div>
      )}

      {state.status === "done" && state.data && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-emerald-700 font-bold">✓ חולץ בהצלחה</span>
            <button
              type="button"
              onClick={onClear}
              className="text-stone-500 hover:text-stone-700 text-[11px] underline"
            >
              החלף קובץ
            </button>
          </div>
          <ExtractedSummary data={state.data} />
        </div>
      )}

      {state.status === "error" && (
        <div className="space-y-2">
          <p className="text-xs text-red-700">⚠ {state.error}</p>
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-red-700 underline"
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
      <p className="text-stone-500 italic">לא חולצו נתונים מובנים מהקובץ.</p>
    );
  }

  return (
    <ul className="space-y-1">
      {lines.map((l, i) => (
        <li key={i} className="flex justify-between gap-2">
          <span className="text-stone-600">{l.label}:</span>
          <span className="font-semibold text-stone-800 tabular-nums">
            {l.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
