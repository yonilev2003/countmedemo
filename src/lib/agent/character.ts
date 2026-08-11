/**
 * Single source of truth for the product's mascot/chat-assistant character.
 *
 * The founder is swapping the old "איתן" character for a new mascot (a
 * smiling coin with a ₪ face, Duolingo-style — full "world" of characters
 * planned later). Neither the final name nor the final illustration has
 * been delivered yet, so every user-visible reference and every LLM system
 * prompt reads from here instead of a hardcoded string — swap the two
 * fields below and the whole product picks it up.
 *
 * Code identifiers (SYSTEM_EITAN, EITAN_TOOLS, eitan-fab.tsx, the /coach
 * route, analytics events, etc.) intentionally still say "eitan" — renaming
 * those is a separate, deliberate pass, not part of this swap.
 */
export const CHARACTER = {
  /** Placeholder — Yoni will provide the real name; change here only. */
  name: "שקל",
  /** One-line tagline used in a couple of intro/about spots. */
  shortDescription:
    "בן הבית שלך למספרים — עוזר קטן שמסביר איך כל סכום מחושב.",
  /** Placeholder illustration until the founder uploads the real asset. */
  avatarSrc: "/mascot/mascot.svg",
} as const;
