"use client";

/**
 * "מועדים קרובים" — compact upcoming-deadlines list, the App mockup's `.dl`
 * row pattern (icon cell + title + meta, status edge-stripe + days pill).
 * Reuses the exact row language of the /deadlines page so the two read the
 * same. Renders identically at every breakpoint; the page places it in the
 * mobile stack and in the desktop grid column.
 *
 * Data: getUpcomingDeadlines (lib/deadlines/calendar) — passed in by the page.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  StatusBadge,
  statusStripe,
  type Status,
} from "@/components/brand/status";
import {
  CalendarIcon,
  FileTextIcon,
  PercentIcon,
  ShieldIcon,
  ArrowLeftIcon,
} from "@/components/brand/icons";
import type { Authority, UpcomingDeadline } from "@/lib/deadlines/calendar";
import { AUTHORITY_LABEL, AUTHORITY_CHIP, deadlineStatus, daysBadge } from "./deadline-meta";

const ICON_CELL_TINT: Record<Status, string> = {
  "on-track": "bg-success-light text-success",
  due: "bg-due-bg text-due-ink",
  overdue: "bg-overdue-bg text-alert",
  plan: "bg-teal-100 text-teal-600",
};

function AuthorityIcon({ authority, className }: { authority: Authority; className?: string }) {
  if (authority === "maam") return <PercentIcon className={className} />;
  if (authority === "bituach-leumi") return <ShieldIcon className={className} />;
  return <FileTextIcon className={className} />;
}

export function DeadlinesTimeline({
  deadlines,
  className,
}: {
  deadlines: UpcomingDeadline[];
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-line bg-paper p-5 shadow-brand",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-brand-navy">מועדים קרובים</h3>
        <Link
          href="/deadlines"
          className="inline-flex items-center gap-1 text-[13px] font-bold text-teal-600 transition-colors hover:text-brand-deep"
        >
          הצג הכל <ArrowLeftIcon className="size-3.5" />
        </Link>
      </div>

      {deadlines.length === 0 ? (
        <p className="text-sm text-muted">אין מועדים קרובים בטווח הקרוב.</p>
      ) : (
        <ul className="space-y-2.5">
          {deadlines.map((d) => {
            const status = deadlineStatus(d.daysUntilDue);
            const dueShort = d.nextDueDate.toLocaleDateString("he-IL", {
              day: "numeric",
              month: "numeric",
            });
            return (
              <li
                key={d.id}
                className="relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-line-soft bg-cream/50 p-3 ps-4"
              >
                <span
                  className={cn(
                    "absolute inset-y-0 end-0 w-1.5",
                    statusStripe(status),
                  )}
                />
                <span
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-xl",
                    ICON_CELL_TINT[status],
                  )}
                >
                  <AuthorityIcon authority={d.authority} className="size-[22px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-bold text-brand-navy">
                      {d.titleHe}
                    </span>
                    <span
                      className={cn(
                        "hidden shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold sm:inline",
                        AUTHORITY_CHIP[d.authority],
                      )}
                    >
                      {AUTHORITY_LABEL[d.authority]}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
                    <CalendarIcon className="size-3.5 shrink-0 text-faint" />
                    <span className="tabular-nums">{dueShort}</span>
                  </div>
                </div>
                <StatusBadge status={status} showDot={false} className="shrink-0">
                  {daysBadge(d.daysUntilDue)}
                </StatusBadge>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
