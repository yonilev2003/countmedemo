/**
 * Bank of Israel representative exchange rate — best-effort lookup for
 * foreign-currency expense lines ("שער יציג של בנק ישראל בתאריך החשבונית").
 *
 * Deliberately NOT swapped for a generic market-rate API (xe.com,
 * exchangerate-api, etc.) even though those are easier to reach — the
 * "representative rate" (שער יציג) is a specific legal figure Israeli tax
 * regulations anchor foreign-currency expense conversion to (an average of
 * bank buy/sell prices, published once daily), not just any live market
 * quote. A different provider's number can legitimately differ from BOI's
 * and wouldn't be the figure the regulation actually asks for — so a
 * "similar quality" alternative isn't really equivalent here. Manual entry
 * (always available, see below) stays the honest fallback instead of a
 * technically-working but not-quite-compliant swap.
 *
 * Endpoint confirmed via BOI's own documentation (boi.org.il, "Extracting
 * representative exchange rates from the new series database"; searched
 * 2026-08-12 — this sandbox's egress policy blocks boi.org.il itself, live
 * requests included, so the exact JSON field names below are still
 * UNVERIFIED and must be checked once deployed):
 *   https://boi.org.il/PublicApi/GetExchangeRate?key={currency}&asXml=false
 * `key` takes a lowercase currency code (usd/eur/gbp/chf/...). A `date`
 * param is expected to work for historical lookups (BOI's own docs mention
 * querying "one observation, a range of dates, or all observations" for a
 * series) but its exact name wasn't confirmable without live access.
 * Second official channel, undocumented in detail here but worth trying if
 * PublicApi changes shape: the SDMX endpoint at edge.boi.org.il.
 */

const TIMEOUT_MS = 6_000;

const CURRENCY_KEYS: Record<string, string> = {
  USD: "usd",
  EUR: "eur",
  GBP: "gbp",
};

export async function fetchBoiRate(
  currency: string,
  dateIso: string, // yyyy-mm-dd
): Promise<number | null> {
  const key = CURRENCY_KEYS[currency.toUpperCase()];
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `https://boi.org.il/PublicApi/GetExchangeRate?key=${key}&date=${dateIso}&asXml=false`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return parseBoiResponse(data);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseBoiResponse(data: unknown): number | null {
  if (typeof data !== "object" || data === null) return null;
  const rec = data as Record<string, unknown>;
  const candidates = [rec.currentExchangeRate, rec.exchangeRate, rec.rate, rec.value];
  for (const c of candidates) {
    if (typeof c === "number" && c > 0) return c;
    if (typeof c === "string") {
      const n = Number(c);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}
