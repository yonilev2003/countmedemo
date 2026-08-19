import type { Persona } from "@/lib/persona";
import { estimateTaxLiability } from "@/lib/calculators";
import { getTaxYearConstants } from "@/lib/calculators/types";
import { cn, formatCurrency } from "@/lib/utils";

/**
 * <TaxEstimateBreakdown> — the step-by-step revenue → deductions → taxable
 * income → brackets → credits → final itemized walk-through of the annual
 * tax estimate.
 *
 * Extracted from /demo's TaxEstimateGate (FP-19) so it can be mounted as a
 * standalone card on /dashboard/pro. Pure math — no API calls. Computes its
 * own estimate from `persona` via the same lib calls the /demo gate uses, so
 * callers only need to pass the persona; no props are threaded through from
 * a parent's own `estimateTaxLiability` call.
 *
 * Gate-only chrome (the navy summary header, the Osek Zeir banner, the
 * "important notes" box, and the continue CTA) stays in demo/page.tsx's
 * TaxEstimateGate — this component is only the itemized breakdown box, so
 * /demo renders unchanged (pure extraction).
 */
export function TaxEstimateBreakdown({
  persona,
  compact = false,
  className,
}: {
  persona: Persona;
  /** Tighter padding/type for card contexts (e.g. /dashboard/pro). Default false — matches /demo exactly. */
  compact?: boolean;
  className?: string;
}) {
  const est = estimateTaxLiability(persona);
  const TC = getTaxYearConstants(persona.income.year);
  const isRefund = est.balance < 0;
  const isOsekZeir = persona.business.isOsekZeir;

  return (
    <div
      className={cn(
        "space-y-1",
        compact ? "px-4 py-3 text-[12px]" : "px-6 py-5 text-[13px]",
        className,
      )}
    >
      <EstimateRow
        label={isOsekZeir ? "הכנסה חייבת — 70% ממחזור (שדה 150)" : "הכנסה מעסק (שדה 150)"}
        value={est.businessIncome}
      />
      <EstimateRow label="ניכוי קרן השתלמות (שדה 137)" value={est.kerenDeduction} deduct />
      {!isOsekZeir && (
        <EstimateRow label="ניכוי ביטוח לאומי — 52% (שדה 030)" value={est.blDeduction} deduct />
      )}
      <EstimateRow label="ניכוי פנסיה (סעיף 47)" value={est.pensionDeduction} deduct />
      <div className="mt-2 border-t border-line pt-2">
        <EstimateRow label="הכנסה חייבת (בקירוב)" value={est.taxableIncome} bold />
      </div>
      <EstimateRow label={`מס גולמי (לפי מדרגות ${persona.income.year})`} value={est.grossTax} />
      <EstimateRow
        label={`זיכוי נקודות (×${TC.pointValueAnnual.toLocaleString("he-IL")} ₪)`}
        value={est.creditPointsValue}
        deduct
      />
      {/* No "זיכוי ביטוח לאומי — 48%" row here (FP-19 fix). That credit does
          not exist in Israeli law — field048's calculator hardcodes 0 and
          says so in its own comment (lib/calculators/index.ts). A 0-valued
          row under a false-credit label was confusing users; replaced with
          this one-line footnote instead. est.blCredit itself is untouched. */}
      <p
        className={cn(
          "pt-0.5 leading-relaxed text-muted",
          compact ? "text-[10px]" : "text-[11px]",
        )}
      >
        אין זיכוי מס בגין ביטוח לאומי — 52% ממנו מוכר כניכוי (שדה 030)
      </p>

      {est.excessCredits > 0 && (
        <div className="flex justify-between rounded-lg border border-line bg-info px-3 py-2 text-[12px] text-teal-600">
          <span>עודף זיכויים שלא נוצל (לא ניתן להחזר)</span>
          <span className="font-bold tabular-nums text-brand-deep">
            {formatCurrency(est.excessCredits)}
          </span>
        </div>
      )}

      <div className="mt-2 border-t-2 border-line pt-2">
        <EstimateRow label="מס אחרי זיכויים" value={est.taxAfterCredits} bold />
      </div>
      {est.mikdamot > 0 && (
        <EstimateRow label="מקדמות ששולמו השנה" value={est.mikdamot} deduct />
      )}
      <div className="mt-2 border-t-2 border-brand pt-2">
        <div className="flex justify-between text-[15px] font-extrabold">
          <span className={isRefund ? "text-success" : "text-alert"}>
            {isRefund ? "החזר מס צפוי" : "חיוב נוסף צפוי"}
          </span>
          <span className={cn("tabular-nums", isRefund ? "text-success" : "text-alert")}>
            {formatCurrency(Math.abs(est.balance))}
          </span>
        </div>
      </div>
    </div>
  );
}

function EstimateRow({
  label,
  value,
  deduct = false,
  bold = false,
}: {
  label: string;
  value: number;
  deduct?: boolean;
  bold?: boolean;
}) {
  return (
    <div className={cn("flex justify-between text-ink", bold && "font-semibold")}>
      <span>{deduct ? `− ${label}` : label}</span>
      <span className="tabular-nums">
        {deduct ? `(${formatCurrency(value)})` : formatCurrency(value)}
      </span>
    </div>
  );
}
