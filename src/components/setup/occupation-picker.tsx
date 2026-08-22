"use client";

/**
 * Search-first occupation input for /setup step 3 — matches free text against
 * the 113-profession regulatory dataset (business-expenses/occupation-dataset.ts)
 * so the expense guide (/business-expenses) can show profession-specific,
 * confidence-graded categories instead of the 3 generic buckets. Still a plain
 * text field underneath (persona.business.primaryOccupation stays a string) —
 * picking a suggestion just fills it with the profession's exact name; free
 * text that matches nothing is a normal, un-blocked value.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  searchProfessions,
  matchProfessionByFreeText,
  getVerticalById,
} from "@/lib/business-expenses/occupation-dataset";
import { CheckCircleIcon } from "@/components/brand/icons";

export function OccupationPicker({
  value,
  onChange,
  error,
  inputId = "primaryOccupation",
}: {
  value: string;
  onChange: (next: string) => void;
  error?: string;
  inputId?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = value.trim().length >= 2 ? searchProfessions(value, 8) : [];
  const matched = matchProfessionByFreeText(value);
  const listboxId = `${inputId}-listbox`;
  const listboxOpen = open && results.length > 0;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={listboxOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={cn(
          "w-full rounded-xl border px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 transition-colors",
          error
            ? "border-alert focus:border-alert focus:ring-alert/20"
            : "border-line focus:border-brand-deep focus:ring-brand-deep/15",
        )}
        placeholder="עיצוב UX, פיתוח תוכנה, ייעוץ..."
        autoComplete="off"
      />

      {matched && !open && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-success">
          <CheckCircleIcon className="size-3.5 shrink-0" />
          מזוהה במאגר הנתונים — הוצאות מוכרות מותאמות למקצוע יופיעו במדריך ההוצאות
        </p>
      )}

      {listboxOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="הצעות מקצוע"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-line bg-paper shadow-brand"
        >
          {results.map((p) => {
            const vertical = getVerticalById(p.verticalId);
            return (
              <button
                key={p.professionId}
                type="button"
                role="option"
                aria-selected={value === p.nameHe}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(p.nameHe);
                  setOpen(false);
                }}
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-start text-sm hover:bg-cream transition-colors"
              >
                <span className="font-medium text-ink">{p.nameHe}</span>
                {vertical && (
                  <span className="text-[11px] text-faint">{vertical.nameHe}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
