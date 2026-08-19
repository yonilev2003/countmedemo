"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CalcResult } from "@/lib/calculators";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { ArrowLeftIcon } from "@/components/brand/icons";

interface Props {
  result: CalcResult;
  /** How to render the value. Defaults to currency for numbers. */
  variant?: "currency" | "integer" | "raw";
  /** Optional label to show next to the value. */
  fieldCode?: string;
}

/**
 * The "clickable number" — the wow factor of the demo.
 * Click → shows formula, sources, and data coverage (full/partial inputs).
 * Tooltip renders via React portal to escape any overflow clipping.
 */
export function InteractiveValue({ result, variant = "currency", fieldCode }: Props) {
  const [open, setOpen] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  // WS8 audit H10 — the chip describes DATA COVERAGE, not calculation
  // confidence: the arithmetic is deterministic; at most the inputs are
  // incomplete. For the normal (full-data) case no chip is shown — the
  // formula + sources are the trust signal.
  const coverageChipColor = {
    medium: "bg-amber-100 text-amber-900 border-amber-300",
    low: "bg-rose-100 text-rose-900 border-rose-300",
  } as const;

  // Measure button position and set tooltip position
  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(360, window.innerWidth - 32);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const showAbove = spaceBelow < 280 && spaceAbove > spaceBelow;

    // Align right edge of tooltip with right edge of button (RTL friendly)
    let right = window.innerWidth - rect.right;
    // Clamp so tooltip doesn't overflow left edge
    if (rect.right - tooltipWidth < 16) {
      right = window.innerWidth - tooltipWidth - 16;
    }

    setTooltipStyle({
      position: "fixed",
      width: tooltipWidth,
      right,
      ...(showAbove
        ? { bottom: window.innerHeight - rect.top + 8 }
        : { top: rect.bottom + 8 }),
      zIndex: 9999,
    });
  }, [open]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const tooltip = open
    ? createPortal(
        <div
          role="dialog"
          aria-label="פרטי החישוב"
          style={tooltipStyle}
          className="rounded-xl border border-stone-200 bg-white p-4 text-right shadow-brand"
        >
          <div className="mb-3 flex items-center justify-between">
            {result.confidence === "high" ? (
              <span
                className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900"
              >
                מבוסס על נתונים מלאים
              </span>
            ) : (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs font-medium",
                  coverageChipColor[result.confidence],
                )}
              >
                מבוסס על נתונים חלקיים
              </span>
            )}
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
              {result.sources.map((s, i) =>
                s.href ? (
                  <li key={i}>
                    <Link
                      href={s.href}
                      onClick={() => setOpen(false)}
                      className="group flex items-center justify-between gap-2 rounded-md border border-stone-200 bg-stone-50 p-2 text-sm text-stone-700 transition-colors hover:border-brand-deep hover:bg-blue-50"
                    >
                      <span>
                        <span className="font-medium">{s.label}</span>
                        {s.detail && (
                          <span className="block text-xs text-stone-500">
                            {s.detail}
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-deep">
                        לצפייה בפירוט
                        <ArrowLeftIcon className="size-3.5 transition-transform group-hover:translate-x-[-2px]" />
                      </span>
                    </Link>
                  </li>
                ) : (
                  <li key={i} className="text-sm text-stone-700">
                    <span className="font-medium">{s.label}</span>
                    {s.detail && (
                      <span className="block text-xs text-stone-500">
                        {s.detail}
                      </span>
                    )}
                  </li>
                ),
              )}
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
        </div>,
        document.body,
      )
    : null;

  return (
    <span className="relative inline-block">
      <button
        ref={buttonRef}
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
      {tooltip}
    </span>
  );
}
