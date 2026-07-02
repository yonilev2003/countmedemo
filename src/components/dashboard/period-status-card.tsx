"use client";

/**
 * "מצב התקופה" — the period-status card.
 *   Mobile mockup: a progress ring + a short "on-track" caption.
 *   Web mockup:    a big % + a legend of upcoming obligations by urgency.
 *
 * The deadline calendar (lib/deadlines) has no paid/unpaid state, so we
 * express "התקדמות" as the share of the next obligations that are still
 * comfortably scheduled (status === "plan") vs. those that need attention
 * (due / overdue). This is an honest, data-derived read of the period —
 * "how many of your near-term obligations are under control".
 *
 * One component, layout adapts: the ring + caption render always; the urgency
 * legend is shown on `lg+` via the `showLegend` prop the page passes.
 */

import { cn } from "@/lib/utils";
import { BRAND_COLORS } from "@/components/brand/colors";
import type { UpcomingDeadline } from "@/lib/deadlines/calendar";
import { deadlineStatus } from "./deadline-meta";

interface Bucket {
  label: string;
  count: number;
  dot: string;
  text: string;
}

export function PeriodStatusCard({
  deadlines,
  showLegend = false,
  className,
}: {
  /** Imminent deadlines (already filtered to a near-term window by the page). */
  deadlines: UpcomingDeadline[];
  showLegend?: boolean;
  className?: string;
}) {
  const total = deadlines.length;
  const scheduled = deadlines.filter(
    (d) => deadlineStatus(d.daysUntilDue) === "plan",
  ).length;
  const due = deadlines.filter(
    (d) => deadlineStatus(d.daysUntilDue) === "due",
  ).length;
  const urgent = deadlines.filter(
    (d) => deadlineStatus(d.daysUntilDue) === "overdue",
  ).length;

  // % "under control" = comfortably-scheduled share. 100% when nothing presses.
  const pct = total === 0 ? 100 : Math.round((scheduled / total) * 100);

  const caption =
    urgent > 0
      ? "יש מועדים דחופים"
      : due > 0
        ? "מתקרבים מועדים"
        : "הכול תחת שליטה";

  const buckets: Bucket[] = [
    { label: "מתוכנן", count: scheduled, dot: "bg-brand-deep", text: "text-teal-600" },
    { label: "מתקרב", count: due, dot: "bg-due", text: "text-due" },
    { label: "דחוף", count: urgent, dot: "bg-alert", text: "text-alert" },
  ];

  // Ring geometry — r=31, matching the mobile mockup's SVG ring.
  const r = 31;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;
  // Ring color follows the most pressing bucket.
  const ringColor =
    urgent > 0 ? BRAND_COLORS.alert : due > 0 ? BRAND_COLORS.due : BRAND_COLORS.success;

  return (
    <section
      className={cn(
        "rounded-2xl border border-line bg-paper p-5 shadow-brand",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-brand-navy">מצב התקופה</h3>
        <span className="text-xs font-semibold text-faint tabular-nums">
          {total} מועדים קרובים
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative size-[78px] shrink-0">
          <svg width="78" height="78" viewBox="0 0 74 74" aria-hidden>
            <circle
              cx="37"
              cy="37"
              r={r}
              fill="none"
              stroke={BRAND_COLORS.line}
              strokeWidth="9"
            />
            <circle
              cx="37"
              cy="37"
              r={r}
              fill="none"
              stroke={ringColor}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              transform="rotate(-90 37 37)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="font-display text-lg font-extrabold tabular-nums text-brand-navy">
              {pct}%
            </span>
            <span className="mt-0.5 text-[9.5px] font-semibold text-muted">
              בשליטה
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-ink">{caption}</div>
          <div className="mt-1 text-xs leading-relaxed text-muted">
            {scheduled} מתוך {total || 0} מועדים מתוכננים בנחת
            {urgent > 0 && <span className="text-alert"> · {urgent} דחופים</span>}
          </div>
        </div>
      </div>

      {showLegend && total > 0 && (
        <div className="mt-4 space-y-2 border-t border-line-soft pt-4">
          {buckets.map((b) => (
            <div
              key={b.label}
              className="flex items-center justify-between text-[13px]"
            >
              <span className="flex items-center gap-2 font-semibold text-ink">
                <span className={cn("size-2.5 rounded-full", b.dot)} />
                {b.label}
              </span>
              <span className={cn("font-bold tabular-nums", b.text)}>
                {b.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
