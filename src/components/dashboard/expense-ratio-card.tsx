/**
 * Visual card for the expense-to-revenue ratio insight.
 * Reads the insight from computeExpenseRatio() and renders:
 *  - a big percent
 *  - a comparison bar (actual vs 30% zeir cap)
 *  - the headline + recommendation in Hebrew
 *
 * Color comes from `tone` ("ok" → success | "info" → teal | "warn" → due/gold | "alert" → alert).
 */

import { ExpenseRatioInsight } from "@/lib/p-and-l/expense-ratio";

const TONE_STYLES: Record<ExpenseRatioInsight["tone"], {
  accent: string; bar: string;
}> = {
  ok: {
    accent: "text-success",
    bar: "bg-success",
  },
  info: {
    accent: "text-brand-deep",
    bar: "bg-brand-deep",
  },
  warn: {
    accent: "text-due",
    bar: "bg-due",
  },
  alert: {
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
    <div className="rounded-2xl border border-line bg-paper p-4 sm:p-5 shadow-brand">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className={`text-xs uppercase tracking-wider ${t.accent} font-bold`}>
            יחס הוצאות / הכנסות
          </p>
          <p className="text-sm font-bold text-brand-navy mt-0.5">
            {insight.headlineHe}
          </p>
        </div>
        <div className="text-end shrink-0">
          <div className={`text-3xl font-display font-bold ${t.accent}`} dir="ltr">
            {insight.ratioPercent}%
          </div>
          <div className="text-[10px] text-muted" dir="ltr">
            {insight.totalExpenses.toLocaleString("he-IL")} / {insight.totalRevenue.toLocaleString("he-IL")} ₪
          </div>
        </div>
      </div>

      {/* Bar with 30% marker */}
      <div className="relative h-2 rounded-full bg-sand overflow-hidden mb-1">
        <div
          className={`absolute start-0 top-0 h-full ${t.bar} transition-all duration-500`}
          style={{ width: `${barFillPercent}%` }}
        />
        {/* 30% threshold tick */}
        <div
          className="absolute top-0 h-full w-px bg-brand-navy"
          style={{ insetInlineStart: `${zeirMarkPercent}%` }}
          title="סף 30% — מסלול עוסק זעיר"
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted mb-3" dir="ltr">
        <span>100%</span>
        <span>← 30% זעיר</span>
        <span>0%</span>
      </div>

      <p className="text-xs text-ink leading-relaxed">{insight.detailHe}</p>

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
    <div className="rounded-lg bg-cream border border-line-soft p-2">
      <div className={`text-sm font-bold ${cls}`} dir="ltr">
        {value.toLocaleString("he-IL")} ₪
      </div>
      <div className="text-[10px] text-muted leading-tight mt-0.5">{label}</div>
    </div>
  );
}
