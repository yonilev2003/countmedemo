"use client";

import { CeilingAlert } from "@/lib/alerts/ceiling";
import { cn, ils } from "@/lib/utils";

export function CeilingAlertCard({ alert }: { alert: CeilingAlert }) {
  const bar = Math.min(alert.percent, 100);

  const colors = {
    ok:   { card: "bg-success-light border-success/30", text: "text-ink",        bar: "bg-success",    badge: "bg-success-light text-success" },
    info: { card: "bg-info border-line",                text: "text-brand-navy", bar: "bg-brand-deep", badge: "bg-teal-100 text-teal-600" },
    warn: { card: "bg-due-bg border-due/40",            text: "text-ink",        bar: "bg-due",        badge: "bg-due-bg text-due-ink" },
    alert:{ card: "bg-overdue-bg border-alert/40",      text: "text-ink",        bar: "bg-alert",      badge: "bg-overdue-bg text-alert-ink" },
  }[alert.tone];

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", colors.card)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={cn("text-sm font-semibold leading-tight", colors.text)}>
            {alert.headlineHe}
          </div>
          <div className={cn("mt-1 text-xs leading-relaxed", colors.text, "opacity-80")}>
            {alert.detailHe}
          </div>
        </div>
        <div className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums", colors.badge)}>
          {alert.percent}%
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-sand overflow-hidden">
        <div
          className={cn("h-2 rounded-full transition-all", colors.bar)}
          style={{ width: `${bar}%` }}
        />
      </div>

      {/* The scale used to label its origin "₪0" — read twice (user + QA) as
          a broken remaining-amount. Show the USEFUL number instead: distance
          to the ceiling, or the overage once crossed. */}
      <div className="flex justify-between text-[10px] text-muted">
        <span className="font-medium tabular-nums">
          {alert.turnover > alert.threshold
            ? `חריגה של ${ils(alert.turnover - alert.threshold)}`
            : `נותרו ${ils(alert.remaining)}`}
        </span>
        <span className="font-medium">תקרה {ils(alert.threshold)}</span>
      </div>
    </div>
  );
}
