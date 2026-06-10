/**
 * Shared deadline presentation helpers for the dashboard cards
 * (next-deadline hero, timeline, period-status). Keeps the authority labels,
 * traffic-light mapping and Hebrew countdown copy in ONE place so the hero,
 * the list and the status ring stay consistent.
 *
 * Pure — no React. Data source: lib/deadlines/calendar (UpcomingDeadline).
 */

import type { Authority } from "@/lib/deadlines/calendar";
import type { Status } from "@/components/brand/status";

export const AUTHORITY_LABEL: Record<Authority, string> = {
  "mas-hachnasa": "מס הכנסה",
  maam: 'מע"מ',
  "bituach-leumi": "ביטוח לאומי",
};

/**
 * Per-authority brand chip tone — the kit's `.ttl-*` palette (teal/beige/navy),
 * distinct from the row's traffic-light status so the two don't clash.
 */
export const AUTHORITY_CHIP: Record<Authority, string> = {
  "mas-hachnasa": "bg-aqua-soft text-brand-navy",
  maam: "bg-beige-100 text-beige-600",
  "bituach-leumi": "bg-teal-100 text-brand-deep",
};

/** Map days-until-due to the kit's traffic-light status (mirrors /deadlines). */
export function deadlineStatus(days: number): Status {
  if (days <= 3) return "overdue";
  if (days <= 10) return "due";
  return "plan";
}

/** Hebrew unit label for the big countdown number. */
export function daysRemainingLabel(days: number): string {
  if (days <= 0) return "היום";
  if (days === 1) return "יום נותר";
  return "ימים נותרו";
}

/** Short "in N days" / "today" badge text. */
export function daysBadge(days: number): string {
  if (days <= 0) return "היום";
  if (days === 1) return "מחר";
  return `בעוד ${days} ימים`;
}
