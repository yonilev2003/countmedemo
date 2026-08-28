"use client";

/**
 * Bank-name autocomplete for /setup step 7's bank-details field, built on
 * SearchPicker + the bundled 21-bank list (israeli-geo-dataset.ts — research
 * 26/08). Picking a result also fills the numeric bank code (`onSelect`),
 * since the two fields must agree — free text that matches nothing leaves
 * the code field untouched, same "don't block on an unmatched value"
 * convention as OccupationPicker/CityPicker.
 */

import { SearchPicker } from "./search-picker";
import { searchBanks, type IsraeliBank } from "@/lib/geo/israeli-geo-dataset";

export function BankNamePicker({
  value,
  onChange,
  onSelect,
  error,
  inputId = "bankName",
}: {
  value: string;
  onChange: (next: string) => void;
  onSelect: (bank: IsraeliBank) => void;
  error?: string;
  inputId?: string;
}) {
  return (
    <SearchPicker<IsraeliBank>
      value={value}
      onChange={onChange}
      onSelect={onSelect}
      search={searchBanks}
      getKey={(bank) => bank.bankCode}
      getLabel={(bank) => bank.bankName}
      renderOption={(bank) => (
        <span className="flex w-full items-center justify-between gap-2">
          <span className="text-ink">{bank.bankName}</span>
          <span className="text-[11px] text-faint" dir="ltr">
            {bank.bankCode}
          </span>
        </span>
      )}
      inputId={inputId}
      placeholder="בנק הפועלים"
      error={error}
    />
  );
}
