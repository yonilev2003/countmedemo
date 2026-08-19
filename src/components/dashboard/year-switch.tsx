"use client";

import { useEffect, useRef, useState } from "react";
import type { Persona } from "@/lib/persona";
import { persistPersona } from "@/lib/data/persona-store";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "@/components/brand/icons";
import { isAnnualFilingDeadlinePassed } from "@/lib/deadlines/calendar";

/**
 * Selectable filing years. Mirrors the range lib/calculators/types.ts
 * actually defines (TAX_YEAR_2024 / TAX_YEAR_2025 / TAX_YEAR_2026, resolved
 * per-year via getTaxYearConstants) — extend both together when a new year
 * is added there.
 */
const SELECTABLE_TAX_YEARS = [2024, 2025, 2026] as const;

interface YearSwitchProps {
  persona: Persona;
  /**
   * Called with the updated persona right after the year change is
   * persisted (write-through via persistPersona — the same pattern the
   * pages already use for their own edits: persistPersona(next) then
   * setPersona(next)). Wire this straight to the page's setPersona.
   *
   * With `persist={false}` the write-through is skipped and this fires with
   * the year-overridden persona as a plain view-model — nothing reaches
   * storage.
   */
  onPersonaChange: (next: Persona) => void;
  /**
   * Whether picking a year writes the persona through to storage
   * (persistPersona). Default true — the declared-year mutation contract
   * pro/page.tsx relies on. The plain dashboard passes false (FP-10): there
   * a year pick is a VIEW filter over a synthetic persona clone, and
   * persisting that clone would silently promote the viewing year into the
   * real declared year on the next reload — re-attributing the whole setup
   * baseline to the wrong year (integration mismatch caught 2026-08-19).
   */
  persist?: boolean;
  className?: string;
}

/**
 * A small tag-button ("שנת מס {year}") that opens a compact popover for
 * switching the persona's filing year. Every year-keyed reader
 * (getTaxYearConstants, computeCeilingAlert, getFormSchema, …) resolves off
 * persona.income.year, so picking a year here re-keys the whole app —
 * nothing else needs to know this component exists. A brand-new user never
 * has to think about it: it just shows the current year until touched.
 */
export function YearSwitch({ persona, onPersonaChange, persist = true, className }: YearSwitchProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const year = persona.income.year;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function selectYear(nextYear: number) {
    if (nextYear !== year) {
      const next: Persona = {
        ...persona,
        income: { ...persona.income, year: nextYear },
      };
      if (persist) persistPersona(next);
      onPersonaChange(next);
    }
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <span className={cn("relative inline-block align-middle", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-0.5",
          "font-semibold text-ink transition-colors hover:border-brand-deep hover:bg-teal-100/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep focus-visible:ring-offset-1",
        )}
      >
        <span>שנת מס {year}</span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 shrink-0 text-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="listbox"
          aria-label="בחר שנת מס"
          className="absolute end-0 top-full z-20 mt-2 w-52 rounded-xl border border-line bg-paper p-1.5 text-start shadow-brand"
        >
          {SELECTABLE_TAX_YEARS.map((y) => (
            <button
              key={y}
              type="button"
              role="option"
              aria-selected={y === year}
              onClick={() => selectYear(y)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm",
                y === year
                  ? "bg-teal-100 font-bold text-brand-deep"
                  : "font-medium text-ink hover:bg-cream",
              )}
            >
              <span>שנת מס {y}</span>
              {/* FP-25: presentation-only past-deadline flag — does NOT touch
                  persona.income.year or any calculator; isAnnualFilingDeadlinePassed
                  is the same helper the pro dashboard (FP-18) reads for its
                  historical-year banner, so this stays consistent with it. */}
              {isAnnualFilingDeadlinePassed(y) && (
                <span className="shrink-0 rounded-full bg-line-soft px-1.5 py-0.5 text-[10px] font-semibold text-faint">
                  מועד הגשה עבר
                </span>
              )}
            </button>
          ))}
          <p className="mt-1.5 border-t border-line px-3 pt-1.5 text-[11px] leading-snug text-faint">
            הנתונים הקיימים יוצגו ויחושבו לפי שנת המס שתיבחר.
          </p>
        </div>
      )}
    </span>
  );
}
