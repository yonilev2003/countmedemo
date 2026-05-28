"use client";

import { CeilingAlert } from "@/lib/alerts/ceiling";
import { cn } from "@/lib/utils";

export function CeilingAlertCard({ alert }: { alert: CeilingAlert }) {
  const bar = Math.min(alert.percent, 100);

  const colors = {
    ok:   { card: "bg-emerald-50 border-emerald-200",   text: "text-emerald-900",   bar: "bg-emerald-500",  badge: "bg-emerald-100 text-emerald-800" },
    info: { card: "bg-blue-50   border-blue-200",       text: "text-blue-900",     bar: "bg-blue-500",     badge: "bg-blue-100 text-blue-800" },
    warn: { card: "bg-amber-50  border-amber-300",      text: "text-amber-900",    bar: "bg-amber-500",    badge: "bg-amber-100 text-amber-800" },
    alert:{ card: "bg-red-50    border-red-300",        text: "text-red-900",      bar: "bg-red-600",      badge: "bg-red-100 text-red-800" },
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
      <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
        <div
          className={cn("h-2 rounded-full transition-all", colors.bar)}
          style={{ width: `${bar}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-stone-500">
        <span>₪0</span>
        <span className="font-medium">תקרה {alert.threshold.toLocaleString("he-IL")} ₪</span>
      </div>
    </div>
  );
}
