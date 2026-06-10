/**
 * Visual card for the expense-to-revenue ratio insight.
 * Reads the insight from computeExpenseRatio() and renders:
 *  - a big percent
 *  - a comparison bar (actual vs 30% zeir cap)
 *  - the headline + factual detail in Hebrew
 *
 * Color comes from `tone` ("ok" → success | "info" → teal | "warn" → due/gold | "alert" → alert).
 *
 * "Facts, not advice" (product decision): the insight copy is produced in
 * lib/p-and-l/expense-ratio.ts (owned elsewhere) and still contains imperative
 * advice phrases ("מומלץ לבטל...", "שקול/י...", "כדאיות..."). We neutralize
 * those at the render layer via neutralizeAdvice() so this surface states facts
 * only. The numbers and the legal disclaimer are untouched. If the source copy
 * is later made factual, neutralizeAdvice() becomes a harmless no-op.
 */

import { ExpenseRatioInsight } from "@/lib/p-and-l/expense-ratio";
import { PercentIcon } from "@/components/brand/icons";

/**
 * Replace known advice/recommendation phrasing coming from the insight source
 * with neutral, factual equivalents. Keeps every number; removes only the
 * "what you should do" framing.
 */
function neutralizeAdvice(text: string): string {
  return text
    // "...מסלול זעיר יכיר רק ב-X ₪ — Y ₪ פשוט לא יוכרו. מומלץ לבטל את המסלול ולדווח כעוסק/ת פטור/ה רגיל/ה."
    .replace(
      /\s*מומלץ לבטל את המסלול ולדווח כעוסק\/ת פטור\/ה רגיל\/ה\.?/g,
      "",
    )
    // headline: "...— שקול/י מסלול זעיר" → neutral factual framing
    .replace(/—\s*שקול\/י מסלול זעיר/g, "— מתחת לסף מסלול זעיר")
    // above-80 detail advice → factual
    .replace(
      /סימן שיש כדאיות לבחון את מבנה ההוצאות\.\s*/g,
      "",
    )
    .replace(/\s+\./g, ".")
    .trim();
}

const TONE_STYLES: Record<ExpenseRatioInsight["tone"], {
  accent: string; bar: string; chip: string;
}> = {
  ok: {
    accent: "text-success",
    bar: "bg-success",
    chip: "bg-success-light text-success",
  },
  info: {
    accent: "text-brand-deep",
    bar: "bg-brand-deep",
    chip: "bg-teal-100 text-brand-deep",
  },
  warn: {
    accent: "text-due",
    bar: "bg-due",
    chip: "bg-due-bg text-due",
  },
  alert: {
    accent: "text-alert",
    bar: "bg-alert",
    chip: "bg-overdue-bg text-alert",
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
        <div className="flex items-start gap-2.5">
          <span className={`flex size-8 items-center justify-center rounded-xl ${t.chip}`}>
            <PercentIcon className="size-[18px]" />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-faint font-bold">
              יחס הוצאות / הכנסות
            </p>
            <p className="text-sm font-bold text-brand-navy mt-0.5">
              {neutralizeAdvice(insight.headlineHe)}
            </p>
          </div>
        </div>
        <div className="text-end shrink-0">
          <div className={`text-3xl font-display font-extrabold tabular-nums tracking-tight ${t.accent}`} dir="ltr">
            {insight.ratioPercent}%
          </div>
          <div className="text-[10px] text-muted tabular-nums" dir="ltr">
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
        <span className="tabular-nums">100%</span>
        <span className="flex items-center gap-1 font-semibold text-brand-navy">
          <span className="inline-block h-2.5 w-px bg-brand-navy" />
          <span className="tabular-nums">30%</span> זעיר
        </span>
        <span className="tabular-nums">0%</span>
      </div>

      <p className="text-xs text-ink leading-relaxed">
        {neutralizeAdvice(insight.detailHe)}
      </p>

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
    <div className="rounded-xl bg-cream border border-line-soft p-2.5">
      <div className={`font-display text-sm font-extrabold tabular-nums ${cls}`} dir="ltr">
        {value.toLocaleString("he-IL")} ₪
      </div>
      <div className="text-[10px] text-muted leading-tight mt-0.5">{label}</div>
    </div>
  );
}
