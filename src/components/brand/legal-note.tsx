/**
 * <LegalNote> — the single shared legal/scope note for countme surfaces.
 *
 * Canonical texts per docs/reviews/2026-07-02-ws8-copy-audit.md §2.
 * Register: "מחשבון מדויק. לא ייעוץ מס." — confident about the arithmetic,
 * honest about scope.
 *
 * Component rules (audit §2):
 * 1. One <LegalNote> banner per page, max.
 * 2. Gender-neutral phrasing is baked in here — do not fork local copies.
 * 3. The texts are exported as string constants so gov.il-styled surfaces
 *    (form-preview.tsx — brand-exempt per CLAUDE.md) can import the STRING
 *    without the brand styling.
 * 4. No tax-year hardcoding inside the note.
 */

import { cn } from "@/lib/utils";

// DRAFT — NEEDS LEGAL REVIEW (canonical 2-sentence banner text, audit §2)
export const LEGAL_NOTE_FULL =
  "countme מחשב במדויק לפי הנתונים שהזנת וכללי המס הרשמיים — מחשבון מדויק, לא ייעוץ מס. האחריות על הדוח המוגש לרשות המסים היא שלך, ושאלה שדורשת שיקול דעת מקצועי — מקומה אצל רואה חשבון או יועץ מס מוסמך.";

// DRAFT — NEEDS LEGAL REVIEW (one-line variant — footers, tooltips, chat underline)
export const LEGAL_NOTE_LINE =
  "מחשבון מדויק, לא ייעוץ מס — ההגשה לרשות המסים באחריותך.";

// DRAFT — NEEDS LEGAL REVIEW (estimate-surface variant — genuine estimates ONLY)
export const LEGAL_NOTE_ESTIMATE =
  "הערכה לפי הנתונים שהזנת — הסכום הסופי נקבע בשומה של רשות המסים.";

const VARIANT_TEXT = {
  full: LEGAL_NOTE_FULL,
  line: LEGAL_NOTE_LINE,
  estimate: LEGAL_NOTE_ESTIMATE,
} as const;

export type LegalNoteVariant = keyof typeof VARIANT_TEXT;

export function LegalNote({
  variant,
  className,
}: {
  variant: LegalNoteVariant;
  className?: string;
}) {
  if (variant === "full") {
    return (
      <div
        className={cn(
          "rounded-xl border border-line bg-paper px-5 py-3 text-[11px] leading-relaxed text-muted",
          className,
        )}
      >
        {LEGAL_NOTE_FULL}
      </div>
    );
  }
  return (
    <p className={cn("text-[10px] leading-relaxed text-faint", className)}>
      {VARIANT_TEXT[variant]}
    </p>
  );
}
