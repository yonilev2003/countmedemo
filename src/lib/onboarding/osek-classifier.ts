/**
 * "מה אתה היום, או רוצה להיות?" onboarding classifier — Tomi's onboarding
 * notes, 2026-08-22, item 3. Produces a RESULT from a few short answers
 * (profession, projected turnover, expected expense %), explicitly NOT
 * framed as a recommendation: it's a mechanical read of the same rules the
 * rest of the app already enforces (ceiling + mandatory-morshe professions),
 * applied to numbers the user hasn't confirmed yet.
 *
 * Reuses the app's single sources of truth rather than re-deriving them:
 *   - getTaxYearConstants(year) for the ceiling + זעיר recognition rate
 *     (lib/calculators/types.ts) — never hardcode a threshold here.
 *   - matchProfessionByFreeText (lib/business-expenses/occupation-dataset.ts)
 *     for the mandatory-osek-morshe profession tag.
 *
 * Legal precision this module exists to protect (verified against
 * lib/persona.ts's isOsekZeir doc comment + lib/alerts/ceiling.ts's
 * MURSHE-ZEIR note during the 2026-08-22 research round): "no VAT-collection
 * duty" belongs to osekType === "patur" ALONE. עוסק זעיר is a pure
 * income-tax expense-recognition track, independent of VAT status — a
 * morshe-זעיר result still owes VAT. `hasVatCollectionDuty` is therefore
 * derived from `osekType` only, never from the זעיר suggestion.
 */

import { getTaxYearConstants } from "@/lib/calculators/types";
import { matchProfessionByFreeText } from "@/lib/business-expenses/occupation-dataset";
import { OsekType } from "@/lib/persona";

/**
 * The exact statusNoteHe tag the regulatory dataset uses for professions
 * that must register as עוסק מורשה regardless of turnover (8 professions
 * as of the 2026 dataset). NOT asserted as the complete statutory
 * second-schedule list — see the 2026-08-22 research note this module was
 * built from; flagged as a DRAFT — NEEDS LEGAL REVIEW gap in the onboarding
 * session's summary.
 */
const MANDATORY_MORSHE_NOTE = "חייב עוסק מורשה ללא קשר למחזור";

/**
 * The 8 mandatory-morshe profession names, exported so the UI can show them
 * to the user OUTRIGHT as a caveat — the free-text matcher below is a
 * best-effort convenience, not a guarantee (see isMandatoryOsekMorsheProfession's
 * doc comment), so the safest disclosure is naming the professions directly
 * rather than relying entirely on string matching to catch every phrasing.
 */
export const MANDATORY_MORSHE_PROFESSIONS_HE = [
  "עורך דין",
  "רואה חשבון",
  "יועץ מס",
  "שמאי מקרקעין",
  "רופא",
  "רופא שיניים",
  "וטרינר",
  "פסיכיאטר",
];

/**
 * Common formal-abbreviation aliases for the two mandatory-morshe
 * professions most often self-described that way in free text ("עו״ד",
 * "רו״ח") — matchProfessionByFreeText's substring match against the full
 * "עורך דין"/"רואה חשבון" strings would otherwise miss these. Deliberately
 * small and conservative: NOT an attempt at exhaustive Hebrew
 * gender/plural-form coverage (a genuinely open-ended problem) — see the
 * function's doc comment for why the UI-level caveat is the real safety net.
 */
const MANDATORY_MORSHE_ALIASES = [/עו["׳'״]?ד/, /רו["׳'״]?ח/];

/**
 * Best-effort check, NOT a guarantee: relies on matchProfessionByFreeText's
 * substring matching (handles many but not all Hebrew gender/plural
 * variants) plus a small alias list for the two most common formal
 * abbreviations. A negative result here does NOT mean "definitely not
 * mandatory-morshe" — callers must always show the full profession list
 * (MANDATORY_MORSHE_PROFESSIONS_HE) as an explicit caveat alongside any
 * result, not rely on this function catching every phrasing.
 */
export function isMandatoryOsekMorsheProfession(occupationText: string): boolean {
  const text = occupationText.trim();
  if (!text) return false;
  if (MANDATORY_MORSHE_ALIASES.some((re) => re.test(text))) return true;
  const match = matchProfessionByFreeText(text);
  return match?.statusNoteHe === MANDATORY_MORSHE_NOTE;
}

export interface OsekClassificationInput {
  occupationText: string;
  /** Declared or expected annual turnover, ₪, excl. VAT. */
  projectedTurnover: number;
  /**
   * Expected expenses as a % of turnover (0-100). Omit (undefined) when the
   * user didn't answer — this is NOT the same as "0%": leaving it blank
   * must never silently bias the result toward the זעיר suggestion (an
   * earlier version of this function defaulted a blank answer to 0%, which
   * made every eligible user look zeir-favorable by construction).
   */
  expensePercent?: number;
  year: number;
}

export interface OsekClassificationResult {
  osekType: OsekType;
  /** Purely osekType-derived — see the module doc comment above. */
  hasVatCollectionDuty: boolean;
  isOsekZeirSuggested: boolean;
  mandatoryMorsheReason: boolean;
  overCeiling: boolean;
  threshold: number;
  year: number;
  /** Short factual trace of how the result was reached — not advice copy. */
  reasonsHe: string[];
}

export function classifyOsek(input: OsekClassificationInput): OsekClassificationResult {
  const TC = getTaxYearConstants(input.year);
  // osekPaturThreshold === osekZeirThreshold by invariant (see types.ts) —
  // read the patur one since it's the registration-status threshold.
  const threshold = TC.osekPaturThreshold;
  const turnover = Math.max(0, input.projectedTurnover);

  const mandatoryMorshe = isMandatoryOsekMorsheProfession(input.occupationText);
  const overCeiling = turnover > threshold;
  const osekType: OsekType = mandatoryMorshe || overCeiling ? "morshe" : "patur";

  const reasonsHe: string[] = [];
  if (mandatoryMorshe) {
    reasonsHe.push("המקצוע שציינת מחייב עוסק מורשה ללא קשר למחזור.");
  } else if (overCeiling) {
    reasonsHe.push(
      `המחזור שציינת (${turnover.toLocaleString("he-IL")} ₪) מעל התקרה (${threshold.toLocaleString("he-IL")} ₪ לשנת מס ${input.year}) — מעבר לתקרה מחייב עוסק מורשה.`,
    );
  } else {
    reasonsHe.push(
      `המחזור שציינת מתחת לתקרה (${threshold.toLocaleString("he-IL")} ₪ לשנת מס ${input.year}) — עוסק פטור אפשרי.`,
    );
  }

  // isOsekZeirSuggested — turnover-only eligibility gate (matches
  // lib/p-and-l/expense-ratio.ts's isZeirEligible exactly), THEN a
  // favorability check against the entered expense %: the זעיר track only
  // helps when it recognises MORE than the user's real expenses. Without an
  // answer to the expense question there is nothing to compare — never
  // suggest זעיר on an unanswered/assumed-0% basis.
  const isZeirEligible = turnover > 0 && turnover <= threshold;
  const zeirCapAmount = Math.round(turnover * TC.osekZeirExpenseRate);
  const hasExpenseAnswer = input.expensePercent != null && !isNaN(input.expensePercent);
  const estimatedExpenses = hasExpenseAnswer
    ? Math.round(turnover * (Math.max(0, Math.min(100, input.expensePercent as number)) / 100))
    : null;
  const isOsekZeirSuggested =
    isZeirEligible && estimatedExpenses !== null && estimatedExpenses < zeirCapAmount;

  if (isOsekZeirSuggested) {
    reasonsHe.push(
      `ההוצאות שציינת (כ-${Math.round(input.expensePercent as number)}% מהמחזור) נמוכות מ-${Math.round(TC.osekZeirExpenseRate * 100)}% — מסלול עוסק זעיר מכיר אוטומטית ${zeirCapAmount.toLocaleString("he-IL")} ₪, יותר ממה שציינת.`,
    );
  } else if (isZeirEligible && !hasExpenseAnswer) {
    reasonsHe.push(
      "המחזור שציינת מאפשר מסלול עוסק זעיר — לא ציינת אחוז הוצאות, כך שלא נבדק אם המסלול משתלם עבורך.",
    );
  }

  return {
    osekType,
    hasVatCollectionDuty: osekType === "morshe",
    isOsekZeirSuggested,
    mandatoryMorsheReason: mandatoryMorshe,
    overCeiling,
    threshold,
    year: input.year,
    reasonsHe,
  };
}
