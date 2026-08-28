"use client";

/**
 * Generic search-as-you-type combobox, factored out of OccupationPicker's
 * proven pattern (ARIA combobox/listbox/option + full keyboard nav — arrow
 * keys/Enter/Escape + aria-activedescendant, fixed 25/08 QA audit item 15)
 * so CityPicker/BankNamePicker (research 26/08) don't duplicate it a second
 * and third time. Purely a text-input + filtered-list UI; callers own their
 * own dataset and search function.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function SearchPicker<T>({
  value,
  onChange,
  onSelect,
  search,
  getKey,
  getLabel,
  renderOption,
  inputId,
  placeholder,
  error,
  emptyHint,
  ariaLabel,
}: {
  /** Current text in the input (controlled). */
  value: string;
  /** Fires on every keystroke — callers typically also call this from onSelect via getLabel(item). */
  onChange: (next: string) => void;
  /** Fires when an option is picked (click or Enter on the active option). */
  onSelect: (item: T) => void;
  /**
   * Returns up to N matches for the current query; empty query should return
   * []. May return a promise (e.g. StreetPicker's server-backed lookup) —
   * results are applied only if the query that produced them is still current.
   */
  search: (query: string) => T[] | Promise<T[]>;
  getKey: (item: T) => string | number;
  /** The text to fill into the input when `item` is picked. */
  getLabel: (item: T) => string;
  /** How to render one result row. */
  renderOption: (item: T) => React.ReactNode;
  inputId: string;
  placeholder?: string;
  error?: string;
  /** Optional helper line under the input, shown only while the list isn't open. */
  emptyHint?: string;
  /** Falls back to a visible FieldLabel if omitted — pass when the field has none. */
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [results, setResults] = useState<T[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const outcome = search(value);
    if (outcome instanceof Promise) {
      outcome.then((items) => {
        if (!cancelled) setResults(items);
      });
    } else {
      setResults(outcome);
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

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

  useEffect(() => {
    setActiveIndex(-1);
  }, [value, open]);

  function selectResult(index: number) {
    const picked = results[index];
    if (!picked) return;
    onChange(getLabel(picked));
    onSelect(picked);
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
        aria-label={ariaLabel}
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
        placeholder={placeholder}
        autoComplete="off"
      />

      {emptyHint && !open && (
        <p className="mt-1 text-[11px] text-faint">{emptyHint}</p>
      )}

      {listboxOpen && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-line bg-paper shadow-brand"
        >
          {results.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={getKey(item)}
                id={optionId(index)}
                type="button"
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectResult(index)}
                className={cn(
                  "flex w-full items-center px-3 py-2 text-start text-sm transition-colors",
                  isActive ? "bg-cream" : "hover:bg-cream",
                )}
              >
                {renderOption(item)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
