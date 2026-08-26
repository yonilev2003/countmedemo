"use client";

/**
 * City autocomplete for /setup step 3's business-address field, built on
 * SearchPicker + the bundled city list (israeli-geo-dataset.ts — research
 * 26/08). Free text that matches nothing is still accepted (the address is
 * optional and not validated against the dataset), same convention as
 * OccupationPicker.
 */

import { SearchPicker } from "./search-picker";
import { searchCities } from "@/lib/geo/israeli-geo-dataset";

export function CityPicker({
  value,
  onChange,
  onSelect,
  error,
  inputId = "addressCity",
}: {
  value: string;
  onChange: (next: string) => void;
  /** Fires when a city is picked — callers typically clear/reset a dependent street field here. */
  onSelect?: (city: string) => void;
  error?: string;
  inputId?: string;
}) {
  return (
    <SearchPicker<string>
      value={value}
      onChange={onChange}
      onSelect={(city) => onSelect?.(city)}
      search={searchCities}
      getKey={(city) => city}
      getLabel={(city) => city}
      renderOption={(city) => <span className="text-ink">{city}</span>}
      inputId={inputId}
      ariaLabel="יישוב"
      placeholder="יישוב"
      error={error}
    />
  );
}
