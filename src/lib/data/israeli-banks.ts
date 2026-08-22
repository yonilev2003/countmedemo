/**
 * Israeli bank registry — name -> BOI (Bank of Israel) code lookup for the
 * setup wizard's bank-details step (Tomi's onboarding notes, 2026-08-22,
 * item 7: "קוד בנק זה נגזרת אוטומטית משם הבנק").
 *
 * Source: BOI identification codes as listed in the `israeli-bank-connector`
 * skill's `references/supported-banks.md` (itself sourced from the
 * `israeli-bank-scrapers` library's `CompanyTypes` enum + BOI's own
 * identification-code page). Limited to entities that actually serve retail
 * current accounts (excludes pure card issuers like Visa Cal/Max/Isracard —
 * persona.bank is a deposit account, not a card). Behatsdaa/Beyahad Bishvilha
 * carry no independently-assigned BOI code and are omitted for the same
 * reason auto-derivation exists: there's nothing to derive.
 *
 * Not exhaustive (a few very small/institutional banks are omitted) — the
 * bank-name field stays free text; this only powers the optional
 * name -> code autofill.
 */

export interface IsraeliBank {
  code: string;
  nameHe: string;
  aliases: string[];
}

export const ISRAELI_BANKS: IsraeliBank[] = [
  { code: "10", nameHe: "בנק לאומי", aliases: ["לאומי"] },
  { code: "12", nameHe: "בנק הפועלים", aliases: ["הפועלים", "פועלים"] },
  { code: "11", nameHe: "בנק דיסקונט", aliases: ["דיסקונט"] },
  { code: "17", nameHe: "בנק מרכנתיל דיסקונט", aliases: ["מרכנתיל"] },
  { code: "20", nameHe: "בנק מזרחי טפחות", aliases: ["מזרחי טפחות", "מזרחי"] },
  { code: "31", nameHe: "הבנק הבינלאומי הראשון", aliases: ["הבינלאומי", "בינלאומי", "בנק בינלאומי"] },
  { code: "04", nameHe: "בנק יהב", aliases: ["יהב"] },
  { code: "13", nameHe: "בנק איגוד", aliases: ["איגוד", "אגוד"] },
  { code: "14", nameHe: "בנק אוצר החייל", aliases: ["אוצר החייל", "אוצר החיל"] },
  { code: "46", nameHe: "בנק מסד", aliases: ["מסד"] },
  { code: "52", nameHe: "בנק פועלי אגודת ישראל", aliases: ["פאג\"י", "פאגי"] },
  { code: "18", nameHe: "וואן זירו", aliases: ["one zero", "וואן זירו", "בנק דיגיטלי"] },
];

/**
 * Substring match against name + aliases, Hebrew (no case-folding needed).
 * Empty/short query returns no suggestions — matches OccupationPicker's
 * 2-character threshold convention.
 */
export function findBanksByQuery(query: string, limit = 6): IsraeliBank[] {
  const q = query.trim();
  if (q.length < 1) return [];
  return ISRAELI_BANKS.filter(
    (b) => b.nameHe.includes(q) || b.aliases.some((a) => a.includes(q)),
  ).slice(0, limit);
}

export function findBankByCode(code: string): IsraeliBank | undefined {
  return ISRAELI_BANKS.find((b) => b.code === code);
}
