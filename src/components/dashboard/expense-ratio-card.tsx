/**
 * Visual card for the expense-to-revenue ratio insight.
 * Reads the insight from computeExpenseRatio() and renders:
 *  - a big percent
 *  - a comparison bar (actual vs 30% zeir cap)
 *  - the headline + recommendation in Hebrew
 *
 * Color comes from `tone` ("ok" → success | "info" → info | "warn" → amber | "alert" → alert).
 */

import { ExpenseRatioInsight } from "@/lib/p-and-l/expense-ratio";

const TONE_STYLES: Record<ExpenseRatioInsight["tone"], {
  border: string; bg: string; accent: string; bar: string;
}> = {
  ok: {
    border: "border-success/40",
    bg: "bg-success-light/30",
    accent: "text-success",
    bar: "bg-success",
  },
  info: {
    border: "border-brand-navy/20",
    bg: "bg-info/30",
    accent: "text-brand-navy",
    bar: "bg-brand-navy",
  },
  warn: {
    border: "border-amber-300",
    bg: "bg-amber-50",
    accent: "text-amber-700",
    bar: "bg-amber-500",
  },
  alert: {
    border: "border-alert/40",
    bg: "bg-alert/10",
    accent: "text-alert",
    bar: "bg-alert",
  },
};

export function ExpenseRatioCard({ insight }: { insight: ExpenseRatioInsight }) {
  if (insight.totalRevenue === 0) return null;
  const t = TONE_STYLES[insight.tone];

  // Cap the bar at 100% width visually so a 150% ratio doesn't blow the layout.
  const barFillPercent = Math.min(100, insight.ratioPercent);
  // The 30% mark on the bar (always at 30/maxBar in our normalised 0–100 scale)
  const zeirMarkPercent = 30;

  return (
    <div className={`rounded-2xl border ${t.border} ${t.bg} p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className={`text-xs uppercase tracking-wider ${t.accent} font-bold`}>
            יחס הוצאות / הכנסות
          </p>
          <p className="text-sm font-bold text-stone-800 mt-0.5">
            {insight.headlineHe}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-3xl font-display font-bold ${t.accent}`} dir="ltr">
            {insight.ratioPercent}%
          </div>
          <div className="text-[10px] text-stone-500" dir="ltr">
            {insight.totalExpenses.toLocaleString("he-IL")} / {insight.totalRevenue.toLocaleString("he-IL")} ₪
          </div>
        </div>
      </div>

      {/* Bar with 30% marker */}
      <div className="relative h-2 rounded-full bg-stone-200 overflow-hidden mb-1">
        <div
          className={`absolute right-0 top-0 h-full ${t.bar} transition-all duration-500`}
          style={{ width: `${barFillPercent}%` }}
        />
        {/* 30% threshold tick */}
        <div
          className="absolute top-0 h-full w-px bg-stone-700"
          style={{ right: `${zeirMarkPercent}%` }}
          title="סף 30% — מסלול עוסק זעיר"
        />
      </div>
      <div className="flex justify-between text-[10px] text-stone-500 mb-3" dir="ltr">
        <span>100%</span>
        <span>← 30% זעיר</span>
        <span>0%</span>
      </div>

      <p className="text-xs text-stone-700 leading-relaxed">{insight.detailHe}</p>

      {insight.isMarkedZeir && !insight.isZeirFavorable && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat
            label="מוכר במסלול זעיר"
            value={insight.zeirRecognized}
            tone="ok"
          />
          <Stat
            label="לא יוכר"
            value={insight.zeirLostDeduction}
            tone="alert"
          />
          <Stat
            label="הוצאות בפועל"
            value={insight.totalExpenses}
            tone="info"
          />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "ok" | "info" | "alert" }) {
  const cls = tone === "ok" ? "text-success" : tone === "alert" ? "text-alert" : "text-brand-navy";
  return (
    <div className="rounded-lg bg-white/70 p-2">
      <div className={`text-sm font-bold ${cls}`} dir="ltr">
        {value.toLocaleString("he-IL")} ₪
      </div>
      <div className="text-[10px] text-stone-500 leading-tight mt-0.5">{label}</div>
    </div>
  );
}
