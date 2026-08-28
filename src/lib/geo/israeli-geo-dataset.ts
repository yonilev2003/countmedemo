/**
 * Israeli cities + banks — compact, client-bundleable datasets for the
 * CityPicker/BankNamePicker autocomplete components (`/setup` step 3/6,
 * research 26/08 — Yoni asked for the same search-as-you-type experience
 * OccupationPicker already has, for city/address/bank fields).
 *
 * Sources:
 * - `data/israeli-cities.json` — every city name that appears in the street
 *   dataset below (so a CityPicker selection always has a matching street
 *   list), derived from data.gov.il's "רשימת רחובות ישראל" dataset
 *   (resource_id a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3), via the community
 *   mirror github.com/GabMic/israeli-cities-and-streets-list (updated
 *   05/2026 per its own README — data.gov.il itself is unreachable from
 *   this sandboxed session's network egress, confirmed via the proxy).
 * - `data/israeli-banks.json` — the 21 Israeli banks + bank codes,
 *   transcribed verbatim from the israeli-bank-autocomplete npm package's
 *   README (github.com/ElishaMayer/israeli-bank-autocomplete), which itself
 *   sources from data.gov.il's "סניפים של בנקים" dataset
 *   (resource_id 2202bada-4baf-45f5-aa61-8c5bad9646d3). Branch-level data
 *   (branch code/name/address per bank) is NOT included here — see
 *   scripts/fetch-bank-branches.mjs's own doc comment for why.
 */

import cities from "./data/israeli-cities.json";
import banks from "./data/israeli-banks.json";

export interface IsraeliBank {
  bankCode: number;
  bankName: string;
}

const CITIES: string[] = cities;
const BANKS: IsraeliBank[] = banks;
const bankByCode = new Map(BANKS.map((b) => [b.bankCode, b]));

/** All city names, in canonical (Hebrew-collated) order — for a picker that shows everything until the user types. */
export function allCities(): string[] {
  return CITIES;
}

/** Search-first lookup for CityPicker: Hebrew substring match, same convention as searchProfessions. */
export function searchCities(query: string, limit = 40): string[] {
  const q = query.trim();
  if (!q) return [];
  return CITIES.filter((c) => c.includes(q)).slice(0, limit);
}

/** All banks, in data.gov.il's own order. */
export function allBanks(): IsraeliBank[] {
  return BANKS;
}

/** Search-first lookup for BankNamePicker: Hebrew substring match on bank name. */
export function searchBanks(query: string, limit = 40): IsraeliBank[] {
  const q = query.trim();
  if (!q) return [];
  return BANKS.filter((b) => b.bankName.includes(q)).slice(0, limit);
}

export function getBankByCode(bankCode: number): IsraeliBank | undefined {
  return bankByCode.get(bankCode);
}
