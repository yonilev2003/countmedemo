/**
 * Israeli city/locality reference for address autocomplete (Tomi's
 * onboarding notes, 2026-08-22, item 7: "כנ"ל בכתובת לגבי עיר ורחוב").
 *
 * Source: the `israeli-address-autocomplete` skill's top-30-by-population
 * CBS reference (`references/city-codes.md`). Deliberately NOT a full
 * ~1,200-settlement CBS list — that dataset is large, changes more often
 * than the tax constants, and this repo's discipline (see the onboarding
 * research round, 2026-08-22) is to not hand-type government reference data
 * we can't verify against the live source. This is a "top cities" picker,
 * not a closed list: the underlying input always stays free text, so a
 * smaller town not in this list is just typed normally, no dead end.
 *
 * Street-level autocomplete is explicitly OUT of scope here (same research
 * round): Israel's street dataset runs into the tens of thousands of
 * entries and goes stale continuously — a live data.gov.il/CKAN integration
 * would be the correct source if that becomes a real requirement, not a
 * static file. addressStreet stays plain free text.
 */

export const ISRAELI_CITIES: string[] = [
  "ירושלים",
  "תל אביב-יפו",
  "חיפה",
  "ראשון לציון",
  "פתח תקווה",
  "אשדוד",
  "נתניה",
  "באר שבע",
  "חולון",
  "בני ברק",
  "רמת גן",
  "בת ים",
  "רחובות",
  "אשקלון",
  "הרצליה",
  "כפר סבא",
  "רעננה",
  "מודיעין-מכבים-רעות",
  "חדרה",
  "בית שמש",
  "לוד",
  "רמלה",
  "נצרת",
  "גבעתיים",
  "אילת",
  "טבריה",
  "עכו",
  "נהריה",
  "כרמיאל",
  "עפולה",
];

/** Substring match, limited — free-text fallback stays available to callers
 *  regardless of whether anything here matches (this list is a shortcut,
 *  not a gate). */
export function searchCities(query: string, limit = 8): string[] {
  const q = query.trim();
  if (q.length < 1) return [];
  return ISRAELI_CITIES.filter((c) => c.includes(q)).slice(0, limit);
}
