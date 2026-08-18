/**
 * Year-keyed resolver for form schemas — same pattern as
 * `getTaxYearConstants(year)` in lib/calculators/types.ts, one level up the
 * stack: that function resolves the RATES/CAPS for a filing year; this one
 * resolves the FORM STRUCTURE (tabs/sections/fields) for a filing year.
 *
 * Today every year of every supported form shares ONE static schema — this
 * is pure future-proofing, not a real branch yet. The day a year's wording,
 * field set, or codes genuinely diverge (the way tax constants already do
 * across TAX_YEAR_2024/2025/2026 — see types.ts's TAX_YEAR_REGISTRY), add a
 * year-keyed entry here in the same shape and every caller that resolves
 * through `getFormSchema` (instead of importing `form1301`/`form1219`
 * directly) picks up the change automatically. Until then this function is
 * deliberately a no-op with respect to `year`.
 */

import { form1301, type FormTab } from "@/lib/form-1301/schema";
import { form1219, type Form1219Tab } from "@/lib/form-1219/schema";

export type SupportedFormId = "1301" | "1219";

export function getFormSchema(formId: "1301", year: number): FormTab[];
export function getFormSchema(formId: "1219", year: number): Form1219Tab[];
export function getFormSchema(
  formId: SupportedFormId,
  year: number,
): FormTab[] | Form1219Tab[] {
  // `year` is unused today — see the doc comment above. Kept as an explicit
  // parameter (not folded away) so every call site is already correct once a
  // year genuinely needs its own schema.
  void year;

  switch (formId) {
    case "1301":
      return form1301;
    case "1219":
      return form1219;
  }
}
