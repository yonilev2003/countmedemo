"use client";

/**
 * Street autocomplete for /setup step 3's business-address field, scoped to
 * the currently-typed city. Unlike CityPicker/BankNamePicker, the street
 * dataset is too large to bundle client-side (63,563 rows) — this queries
 * /api/geo/streets, which reads the server-only streets-server.ts module.
 * Free text is still accepted with no city selected or no match, same
 * convention as the other pickers.
 *
 * Debounced + abortable (27/08 QA critic): SearchPicker's own effect fires
 * `search(value)` on every keystroke with no delay — fine for the other
 * pickers (in-memory array filters), but a real network round-trip per
 * character on a real phone connection would visibly lag while typing. The
 * fetch itself is delayed here, and a superseded in-flight request is
 * aborted rather than left to resolve into a stale result.
 */

import { useCallback, useRef } from "react";
import { SearchPicker } from "./search-picker";

const DEBOUNCE_MS = 250;

async function fetchStreets(
  city: string,
  query: string,
  signal: AbortSignal,
): Promise<string[]> {
  if (!city.trim()) return [];
  const params = new URLSearchParams({ city, q: query });
  try {
    const res = await fetch(`/api/geo/streets?${params.toString()}`, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function StreetPicker({
  value,
  onChange,
  city,
  error,
  inputId = "addressStreet",
}: {
  value: string;
  onChange: (next: string) => void;
  /** The currently-typed city — streets are looked up scoped to it. */
  city: string;
  error?: string;
  inputId?: string;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);

  // Stable across renders unless `city` itself changes, so SearchPicker's
  // effect doesn't refetch on every unrelated parent re-render. Debounces
  // the actual fetch (not just its result) and aborts a superseded in-flight
  // request — a new keystroke both cancels the pending timer and aborts
  // whatever request is already on the wire.
  const search = useCallback(
    (query: string) =>
      new Promise<string[]>((resolve) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        abortRef.current?.abort();
        timerRef.current = setTimeout(() => {
          const controller = new AbortController();
          abortRef.current = controller;
          fetchStreets(city, query, controller.signal).then(resolve);
        }, DEBOUNCE_MS);
      }),
    [city],
  );

  return (
    <SearchPicker<string>
      value={value}
      onChange={onChange}
      onSelect={() => {}}
      search={search}
      getKey={(street) => street}
      getLabel={(street) => street}
      renderOption={(street) => <span className="text-ink">{street}</span>}
      inputId={inputId}
      ariaLabel="רחוב"
      placeholder="רחוב"
      error={error}
      emptyHint={city.trim() ? undefined : "בחר/י יישוב כדי לראות הצעות רחוב"}
    />
  );
}
