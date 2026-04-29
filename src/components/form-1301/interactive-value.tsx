"use client";

import { useState } from "react";
import { CalcResult } from "@/lib/calculators";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

interface Props {
  result: CalcResult;
  /** How to render the value. Defaults to currency for numbers. */
  variant?: "currency" | "integer" | "raw";
  /** Optional label to show next to the value. */
  fieldCode?: string;
}

/**
 * The "clickable number" — the wow factor of the demo.
 * Click → shows formula, sources, confidence.
 */
export function InteractiveValue({ result, variant = "currency", fieldCode }: Props) {
  const [open, setOpen] = useState(false);

  const display = (() => {
    if (typeof result.value === "number") {
      if (variant === "currency") return formatCurrency(result.value);
      if (variant === "integer") return formatNumber(result.value);
      return String(result.value);
    }
    if (typeof result.value === "boolean") {
      return result.value ? "כן" : "לא";
    }
    return String(result.value ?? "—");
  })();

  const confidenceColor = {
    high: "bg-emerald-100 text-emerald-900 border-emerald-300",
    medium: "bg-amber-100 text-amber-900 border-amber-300",
    low: "bg-rose-100 text-rose-900 border-rose-300",
  }[result.confidence];

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "calculated-value inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-sm font-semibold tabular-nums",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {fieldCode && (
          <span className="text-[10px] font-mono text-blue-700">
            {fieldCode}
          </span>
        )}
        <span>{display}</span>
        <svg
          aria-hidden
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={cn(
            "text-blue-700 transition-transform",
            open && "rotate-180",
          )}
        >
          <path
            d="M3 4.5l3 3 3-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="פרטי החישוב"
          className="absolute z-30 mt-2 w-[min(360px,calc(100vw-2rem))] right-0 rounded-xl border border-stone-200 bg-white p-4 text-right shadow-lg"
        >
          <div className="mb-3 flex items-center justify-between">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-medium",
                confidenceColor,
              )}
            >
              {result.confidence === "high" && "ביטחון גבוה"}
              {result.confidence === "medium" && "ביטחון בינוני"}
              {result.confidence === "low" && "ביטחון נמוך"}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-stone-400 hover:text-stone-700"
              aria-label="סגור"
            >
              ✕
            </button>
          </div>

          <div className="mb-3">
            <div className="mb-1 text-xs font-medium text-stone-500">
              איך הגענו לזה
            </div>
            <div className="rounded-md bg-stone-50 p-2.5 text-sm text-stone-800">
              {result.formula}
            </div>
          </div>

          <div className="mb-3">
            <div className="mb-1.5 text-xs font-medium text-stone-500">מקור</div>
            <ul className="space-y-1.5">
              {result.sources.map((s, i) => (
                <li key={i} className="text-sm text-stone-700">
                  <span className="font-medium">{s.label}</span>
                  {s.detail && (
                    <span className="block text-xs text-stone-500">
                      {s.detail}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {result.notes && result.notes.length > 0 && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-900">
              <div className="mb-1 font-semibold">שווה לדעת</div>
              <ul className="space-y-1">
                {result.notes.map((n, i) => (
                  <li key={i}>• {n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
