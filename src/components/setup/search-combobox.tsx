"use client";

/**
 * Shared search-combobox shell for /setup's "type or pick a suggestion"
 * fields (bank name -> code, business-address city). Mirrors
 * OccupationPicker's accessibility pattern (role="combobox" on the input,
 * role="listbox"/"option" on the suggestion list, click-outside close) so
 * every picker in the wizard behaves identically to a screen reader —
 * extracted here once a THIRD picker needed the same shape rather than
 * duplicating the a11y wiring a third time. OccupationPicker itself is left
 * as-is (already shipped, already accessibility-reviewed) — not worth the
 * churn of migrating it onto this shell too.
 *
 * Always allows free text: selecting a suggestion is a shortcut, never a
 * restriction — `options` is whatever the caller already filtered for the
 * current input value.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  key: string;
  label: string;
  sublabel?: string;
}

export function SearchCombobox({
  inputId,
  value,
  onInputChange,
  onSelect,
  options,
  error,
  placeholder,
  ariaLabel,
}: {
  inputId: string;
  value: string;
  onInputChange: (next: string) => void;
  onSelect: (opt: ComboboxOption) => void;
  options: ComboboxOption[];
  error?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = `${inputId}-listbox`;
  const listboxOpen = open && options.length > 0;

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
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => {
          onInputChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={cn(
          "w-full rounded-xl border px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 transition-colors",
          error
            ? "border-alert focus:border-alert focus:ring-alert/20"
            : "border-line focus:border-brand-deep focus:ring-brand-deep/15",
        )}
        placeholder={placeholder}
        autoComplete="off"
      />

      {listboxOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="הצעות"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-line bg-paper shadow-brand"
        >
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="option"
              aria-selected={value === opt.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(opt);
                setOpen(false);
              }}
              className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-start text-sm hover:bg-cream transition-colors"
            >
              <span className="font-medium text-ink">{opt.label}</span>
              {opt.sublabel && (
                <span className="text-[11px] text-faint">{opt.sublabel}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
