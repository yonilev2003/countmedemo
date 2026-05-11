/**
 * Shared formatter for Form 1301 field values.
 *
 * Translates raw persona values (enums, ISO dates, numbers) into the
 * Hebrew/Israeli-formatted strings that appear in the UI. Used by both
 * the gov.il-faithful /demo preview and the guided/companion tracks so
 * that what you read in one place is identical to what you read in another.
 */

import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

const ENUM_LABELS: Record<string, string> = {
  // osek type
  morshe: "מורשה",
  patur: "פטור",
  // bookkeeping
  "single-entry": "חד-צדדית",
  "double-entry": "כפולה",
  manual: "ידני",
  computerized: "ממוחשב",
  // marital status
  single: "רווק/ה",
  married: "נשוי/אה",
  divorced: "גרוש/ה",
  widowed: "אלמן/ה",
  // gender
  male: "זכר",
  female: "נקבה",
};

export function formatFieldValue(
  value: unknown,
  field?: { kind?: string },
): string {
  if (value === null || value === undefined || value === "") return "—";

  if (typeof value === "string") {
    if (field?.kind === "date") return formatDate(value);
    if (ENUM_LABELS[value]) return ENUM_LABELS[value];
    if (value === "true") return "כן";
    if (value === "false") return "לא";
    return value;
  }
  if (typeof value === "number") {
    if (field?.kind === "currency") return formatCurrency(value);
    return formatNumber(value);
  }
  if (typeof value === "boolean") return value ? "כן" : "לא";
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if ("street" in o) {
      return `${o.street ?? ""} ${o.houseNumber ?? ""}, ${o.city ?? ""}`.trim();
    }
    return JSON.stringify(value);
  }
  return String(value);
}
