/**
 * Israeli geo dataset — search/lookup helpers behind CityPicker and
 * BankNamePicker (/setup step 3/7, research 26/08). See
 * src/lib/geo/israeli-geo-dataset.ts's own doc comment for data provenance.
 */

import { describe, it, expect } from "vitest";
import {
  allCities,
  searchCities,
  allBanks,
  searchBanks,
  getBankByCode,
} from "@/lib/geo/israeli-geo-dataset";

describe("israeli-geo-dataset — cities", () => {
  it("has a non-trivial, deduplicated city list", () => {
    const cities = allCities();
    expect(cities.length).toBeGreaterThan(1000);
    expect(new Set(cities).size).toBe(cities.length);
  });

  it("returns nothing for an empty/blank query — a picker shouldn't dump the full list on focus", () => {
    expect(searchCities("")).toEqual([]);
    expect(searchCities("   ")).toEqual([]);
  });

  it("substring-matches a known major city", () => {
    const results = searchCities("תל אביב");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((c) => c.includes("תל אביב"))).toBe(true);
  });

  it("respects the limit parameter", () => {
    // "א" alone matches a huge share of Hebrew city names.
    const results = searchCities("א", 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });
});

describe("israeli-geo-dataset — banks", () => {
  it("has the 21 Israeli banks, each with a unique code", () => {
    const banks = allBanks();
    expect(banks.length).toBe(21);
    expect(new Set(banks.map((b) => b.bankCode)).size).toBe(banks.length);
  });

  it("returns nothing for an empty query", () => {
    expect(searchBanks("")).toEqual([]);
  });

  it("finds בנק הפועלים by partial name and getBankByCode agrees on its code", () => {
    const results = searchBanks("הפועלים");
    expect(results.length).toBe(1);
    expect(results[0].bankCode).toBe(12);
    expect(getBankByCode(12)?.bankName).toBe(results[0].bankName);
  });

  it("getBankByCode returns undefined for an unknown code", () => {
    expect(getBankByCode(9999)).toBeUndefined();
  });
});
