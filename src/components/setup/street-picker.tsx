"use client";

/**
 * Street autocomplete for /setup step 3's business-address field, scoped to
 * the currently-typed city. Unlike CityPicker/BankNamePicker, the street
 * dataset is too large to bundle client-side (63,563 rows) — this queries
 * /api/geo/streets, which reads the server-only streets-server.ts module.
 * Free text is still accepted with no city selected or no match, same
 * convention as the other pickers.
 */

import { useCallback } from "react";
import { SearchPicker } from "./search-picker";

async function fetchStreets(city: string, query: string): Promise<string[]> {
  if (!city.trim()) return [];
  const params = new URLSearchParams({ city, q: query });
  try {
    const res = await fetch(`/api/geo/streets?${params.toString()}`);
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
  // Stable across renders unless `city` itself changes, so SearchPicker's
  // effect doesn't refetch on every unrelated parent re-render.
  const search = useCallback(
    (query: string) => fetchStreets(city, query),
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
