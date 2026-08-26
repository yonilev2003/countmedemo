/**
 * Server-only street lookup — the full street dataset is 63,563 rows
 * (~2.3MB minified). It must never be imported from a "use client" module or
 * it ships to every /setup visitor; instead the StreetPicker component calls
 * the /api/geo/streets route, which imports this file. See
 * israeli-geo-dataset.ts's doc comment for the data's provenance.
 */

import streetsData from "./data/israeli-streets.json";

const STREETS = streetsData as [city: string, street: string][];

const streetsByCity = new Map<string, string[]>();
for (const [city, street] of STREETS) {
  const list = streetsByCity.get(city);
  if (list) {
    list.push(street);
  } else {
    streetsByCity.set(city, [street]);
  }
}

/** Streets in `city` matching `query` (substring, Hebrew). Empty query returns the city's full list, capped at `limit`. */
export function searchStreetsForCity(
  city: string,
  query: string,
  limit = 40,
): string[] {
  const list = streetsByCity.get(city.trim());
  if (!list) return [];
  const q = query.trim();
  const matches = q ? list.filter((street) => street.includes(q)) : list;
  return matches.slice(0, limit);
}
