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
  // Virtual focus index for keyboard navigation (QA audit 25/08, item 15):
  // the ARIA combobox/listbox/option structure was already correct, but
  // nothing moved this — arrow keys/Enter did nothing, so a keyboard-only
  // user couldn't select an option at all, only a mouse click worked.
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = value.trim().length >= 2 ? searchProfessions(value, 8) : [];
  const matched = matchProfessionByFreeText(value);
  const listboxId = `${inputId}-listbox`;
  const listboxOpen = open && results.length > 0;
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Reset the virtual focus whenever the result set changes (new query) or
  // the list closes, so a stale index never points at a since-changed option.
  useEffect(() => {
    setActiveIndex(-1);
  }, [value, open]);

  function selectResult(index: number) {
    const picked = results[index];
    if (!picked) return;
    onChange(picked.nameHe);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!listboxOpen) {
      if (e.key === "ArrowDown" && results.length > 0) {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
        break;
      case "Enter":
        if (activeIndex >= 0) {
          e.preventDefault();
          selectResult(activeIndex);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  }

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
        aria-activedescendant={
          listboxOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined
        }
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
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
          {results.map((p, index) => {
            const vertical = getVerticalById(p.verticalId);
            const isActive = index === activeIndex;
            return (
              <button
                key={p.professionId}
                id={optionId(index)}
                type="button"
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectResult(index)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-start text-sm transition-colors",
                  isActive ? "bg-cream" : "hover:bg-cream",
                )}
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
