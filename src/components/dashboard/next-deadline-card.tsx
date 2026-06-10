"use client";

/**
 * "המועד הקרוב" — the dark navy hero card from both mockups
 * (CountMe Dashboard Web.html `.c-next` / Dashboard App.html `.hero`).
 *
 * Data: the single nearest upcoming deadline from `getUpcomingDeadlines`
 * (lib/deadlines/calendar). No amounts live in that calendar, so we surface
 * the days-remaining countdown + the due-date + the authority + the due rule,
 * and link straight to /deadlines. Kept faithful to the mockup's hierarchy
 * (tag → title → big countdown → meta rows → CTA) using brand primitives.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, CalendarIcon, ClockIcon } from "@/components/brand/icons";
import type { UpcomingDeadline } from "@/lib/deadlines/calendar";
import {
  AUTHORITY_LABEL,
  deadlineStatus,
  daysRemainingLabel,
} from "./deadline-meta";

export function NextDeadlineCard({
  deadline,
  className,
}: {
  deadline: UpcomingDeadline | null;
  className?: string;
}) {
  if (!deadline) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-line bg-paper p-6 shadow-brand",
          className,
        )}
      >
        <h3 className="text-base font-bold text-brand-navy">המועד הקרוב</h3>
        <p className="mt-3 text-sm text-muted">
          אין מועדים קרובים בטווח הקרוב. כל הכבוד — את/ה מעודכן/ת.
        </p>
      </section>
    );
  }

  const status = deadlineStatus(deadline.daysUntilDue);
  const dueLabel = deadline.nextDueDate.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // The "tag" tone mirrors traffic-light urgency in the mockup's gold/aqua chip.
  const tagDot =
    status === "overdue"
      ? "bg-alert"
      : status === "due"
        ? "bg-due"
        : "bg-aqua";

  return (
    <section
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl p-6 text-white shadow-brand",
        "bg-gradient-to-br from-navy-700 via-brand-navy to-navy-900",
        className,
      )}
    >
      {/* soft beige glow, top-inline-end — matches the mockup's top-left radial highlight (left = inline-end in RTL) */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 end-[-70px] size-60 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(200,181,154,.4), transparent 70%)",
        }}
      />

      <div className="relative flex items-center justify-between">
        <h3 className="text-base font-bold">המועד הקרוב</h3>
        <span className="inline-flex items-center gap-2 rounded-full border border-aqua/30 bg-aqua/15 px-3 py-1 text-[12px] font-bold text-aqua">
          <span className={cn("size-[7px] rounded-full", tagDot)} />
          {status === "overdue" ? "דחוף" : status === "due" ? "מתקרב" : "מתוכנן"}
        </span>
      </div>

      <div className="relative mt-4 text-[22px] font-extrabold leading-tight tracking-tight">
        {deadline.titleHe}
      </div>
      <div className="relative mt-1 text-[13px] text-aqua/85">
        {AUTHORITY_LABEL[deadline.authority]}
      </div>

      {/* Big countdown */}
      <div className="relative mt-5 flex items-end gap-2">
        <span className="font-display text-[56px] font-extrabold leading-none tabular-nums">
          {Math.max(0, deadline.daysUntilDue)}
        </span>
        <span className="pb-2 text-sm font-semibold text-aqua">
          {daysRemainingLabel(deadline.daysUntilDue)}
        </span>
      </div>

      {/* Meta rows */}
      <div className="relative mt-5 space-y-3 text-[13.5px]">
        <div className="flex items-center justify-between border-b border-aqua/15 pb-3">
          <span className="flex items-center gap-2 text-aqua/80">
            <CalendarIcon className="size-4" /> מועד הגשה
          </span>
          <span className="font-bold tabular-nums">{dueLabel}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="flex shrink-0 items-center gap-2 text-aqua/80">
            <ClockIcon className="size-4" /> כלל
          </span>
          <span className="text-end text-[12px] leading-snug text-aqua/90">
            {deadline.dueRule}
          </span>
        </div>
      </div>

      <Link
        href="/deadlines"
        className="relative mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-bold text-brand-navy transition-colors hover:bg-beige-600"
      >
        לצפייה בכל המועדים <ArrowLeftIcon className="size-4" />
      </Link>
    </section>
  );
}
