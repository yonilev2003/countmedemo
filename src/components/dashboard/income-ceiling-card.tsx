"use client";

/**
 * "מצב הכנסות השנה" — income-vs-ceiling card, faithful to both mockups
 * (Web `.c-income` / App `.inc-card`).
 *
 *   Left/top:  annual turnover, a progress bar toward the עוסק פטור ceiling,
 *              and the remaining-to-ceiling line.
 *   Right/bottom (after a divider): the expense-to-revenue ratio.
 *
 * Data comes from the existing pure calculators — no new plumbing:
 *   • computeCeilingAlert(persona)  → turnover / threshold / remaining / %
 *   • computeExpenseRatio(persona)  → ratioPercent / revenue / expenses
 *
 * עוסק מורשה has no patur ceiling, so for morshe we drop the ceiling bar and
 * show turnover + ratio only (still matching the card's two-pane shape).
 *
 * Responsive: stacked on mobile (App), side-by-side with a vertical rule on
 * `sm+` (Web). Links "פרטים" to /dashboard/pl-report for the full breakdown.
 */

import Link from "next/link";
import { cn, ils } from "@/lib/utils";
import { ArrowLeftIcon } from "@/components/brand/icons";
import type { Persona } from "@/lib/persona";
import { computeCeilingAlert } from "@/lib/alerts/ceiling";
import { computeExpenseRatio } from "@/lib/p-and-l/expense-ratio";

const fmt = ils;

export function IncomeCeilingCard({
  persona,
  className,
}: {
  persona: Persona;
  className?: string;
}) {
  const ceiling = computeCeilingAlert(persona); // null for morshe
  const ratio = computeExpenseRatio(persona);

  const turnover = persona.income.totalRevenue;
  const fillPercent = ceiling ? Math.min(100, ceiling.percent) : 0;

  // Ratio accent follows the kit's traffic-light tone.
  const ratioAccent =
    ratio.tone === "ok"
      ? "text-success"
      : ratio.tone === "alert"
        ? "text-alert"
        : ratio.tone === "warn"
          ? "text-due"
          : "text-brand-deep";

  return (
    <section
      className={cn(
        "rounded-2xl border border-line bg-paper p-5 shadow-brand",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-brand-navy">מצב הכנסות השנה</h3>
        <Link
          href="/dashboard/pl-report"
          className="inline-flex items-center gap-1 text-[13px] font-bold text-teal-600 transition-colors hover:text-brand-deep"
        >
          פרטים <ArrowLeftIcon className="size-3.5" />
        </Link>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
        {/* Turnover + ceiling */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[30px] font-extrabold leading-none tracking-tight text-brand-navy tabular-nums">
              {fmt(turnover)}
            </span>
            {ceiling && (
              <span className="text-sm font-semibold text-muted">
                מתוך {fmt(ceiling.threshold)}
              </span>
            )}
          </div>

          {ceiling ? (
            <>
              <div className="relative my-3.5 h-3 overflow-hidden rounded-full border border-line-soft bg-cream">
                <div
                  className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-l from-brand-deep to-teal-600 transition-all duration-500"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
              <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                <span className="size-2 rounded-full bg-brand-deep" />
                {ceiling.remaining > 0
                  ? `נותרו ${fmt(ceiling.remaining)} עד לתקרת הפטור`
                  : "חרגת מתקרת עוסק פטור — נדרשת רישום כמורשה"}
              </div>
            </>
          ) : (
            <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
              עוסק מורשה — אין תקרת פטור. המחזור מדווח לשדה 238 בדוח השנתי.
            </p>
          )}
        </div>

        {/* Vertical rule on sm+ (mockup `.inc-vline`); horizontal divider on mobile */}
        <div className="h-px w-full bg-line sm:h-20 sm:w-px" />

        {/* Expense ratio */}
        <div className="shrink-0 sm:w-44">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[14px] font-semibold text-muted">
              יחס הוצאות
            </span>
            <span
              className={cn(
                "font-display text-3xl font-extrabold leading-none tracking-tight tabular-nums",
                ratioAccent,
              )}
              dir="ltr"
            >
              {ratio.ratioPercent}%
            </span>
          </div>
          <div className="mt-2 flex justify-between text-[12.5px] text-muted">
            <span>
              הכנסות{" "}
              <b className="font-bold text-brand-navy tabular-nums">
                {fmt(ratio.totalRevenue)}
              </b>
            </span>
          </div>
          <div className="text-[12.5px] text-muted">
            הוצאות{" "}
            <b className="font-bold text-brand-navy tabular-nums">
              {fmt(ratio.totalExpenses)}
            </b>
          </div>
        </div>
      </div>
    </section>
  );
}
