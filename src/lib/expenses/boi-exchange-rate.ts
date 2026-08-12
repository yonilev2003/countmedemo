/**
 * Bank of Israel representative exchange rate — best-effort lookup for
 * foreign-currency expense lines ("שער יציג של בנק ישראל בתאריך החשבונית").
 *
 * UNVERIFIED endpoint shape: this sandbox's outbound network policy blocks
 * boi.org.il, so the exact response shape below could not be confirmed live
 * before shipping (2026-08-12) — confirm against a real request once
 * deployed, and adjust the field names in `parseBoiResponse` if they drift.
 * This is why the fetch is defensive end-to-end (timeout, try/catch, no
 * throw) and every caller MUST treat a null return as "ask the user to type
 * the rate in manually" — never block on this succeeding. The Expense Object
 * stores whatever rate lands in the field regardless of source (fetched or
 * typed), per the spec — manual entry is a first-class path, not a fallback
 * hack.
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
    const url = `https://boi.org.il/PublicApi/GetExchangeRate?key=${key}&date=${dateIso}&asJson=true`;
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
