/**
 * Server-only street lookup behind /api/geo/streets (StreetPicker's data
 * source). Kept out of the client bundle deliberately — see
 * src/lib/geo/streets-server.ts's own doc comment — this test exercises the
 * module directly rather than through the route.
 */

import { describe, it, expect } from "vitest";
import { searchStreetsForCity } from "@/lib/geo/streets-server";
import cities from "@/lib/geo/data/israeli-cities.json";

// Every city in israeli-cities.json is derived FROM the streets dataset
// (israeli-geo-dataset.ts's doc comment), so any real city name is
// guaranteed to have at least one street.
const [sampleCity] = cities as string[];

describe("searchStreetsForCity", () => {
  it("returns an empty array for a city not in the dataset", () => {
    expect(searchStreetsForCity("עיר שלא קיימת בשום מקום", "")).toEqual([]);
  });

  it("returns an empty array for a blank city", () => {
    expect(searchStreetsForCity("", "")).toEqual([]);
  });

  it("returns streets for a known city with an empty query", () => {
    const results = searchStreetsForCity(sampleCity, "");
    expect(results.length).toBeGreaterThan(0);
  });

  it("substring-filters within the city's own streets when a query is given", () => {
    const all = searchStreetsForCity(sampleCity, "", 1000);
    const [firstStreet] = all;
    const needle = firstStreet.slice(0, Math.min(2, firstStreet.length));
    const filtered = searchStreetsForCity(sampleCity, needle, 1000);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((s) => s.includes(needle))).toBe(true);
  });

  it("respects the limit parameter", () => {
    const results = searchStreetsForCity(sampleCity, "", 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("scopes results to the requested city — a street unique to city B never appears when searching city A", () => {
    const allCityNames = cities as string[];
    const cityA = allCityNames[0];
    const cityB = allCityNames.find((c) => c !== cityA);
    if (!cityB) return; // single-city dataset edge case, not expected

    const streetsA = new Set(searchStreetsForCity(cityA, "", 100000));
    const cityBOnlyStreet = searchStreetsForCity(cityB, "", 100000).find(
      (s) => !streetsA.has(s),
    );
    if (!cityBOnlyStreet) return; // every street happens to be shared; nothing to assert

    expect(searchStreetsForCity(cityA, cityBOnlyStreet, 100000)).toEqual([]);
  });
});
