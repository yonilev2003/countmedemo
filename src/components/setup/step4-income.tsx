import { cn } from "@/lib/utils";
import { FieldLabel, ErrorMsg, inputCls } from "./fields";
import type { Step4Data, Errors } from "./types";

/** Tax years available in the selector. Add future years here when constants are confirmed. */
export const AVAILABLE_TAX_YEARS: number[] = [2024, 2025];

export function Step4Income({
  data,
  onChange,
  errors,
  selectedYear,
  onYearChange,
}: {
  data: Step4Data;
  onChange: (next: Step4Data) => void;
  errors: Errors;
  selectedYear: number;
  onYearChange: (year: number) => void;
}) {
  const s4 = data;
  return (
    <div className="space-y-4">
      {/* ── Tax-year selector ─────────────────────────────────── */}
      <div className="rounded-xl bg-info/30 border border-brand-deep/20 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-brand-navy">
            שנת המס
          </span>
          <div className="flex gap-2">
            {AVAILABLE_TAX_YEARS.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => onYearChange(yr)}
                className={cn(
                  "rounded-full px-4 py-1 text-sm font-semibold transition-colors border",
                  selectedYear === yr
                    ? "bg-brand-navy text-white border-brand-navy shadow-brand-sm"
                    : "bg-paper text-brand-navy border-line hover:bg-cream hover:border-brand-deep/40",
                )}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>
        {selectedYear === 2025 && (
          <p className="mt-2 text-xs text-due bg-due-bg/60 border border-due/30 rounded-lg px-3 py-1.5 leading-relaxed">
            חלק מנתוני 2025 (תקרות קרן השתלמות, ביטוח לאומי ופנסיה)
            הם ערכים זמניים הממתינים לאישור רשמי — יעודכנו עם פרסום
            נתוני האינדקס הסופיים.
          </p>
        )}
      </div>

      <div>
        <FieldLabel htmlFor="totalRevenue" required>
          סך הכנסות ברוטו מהעסק (בש&quot;ח, ללא מע&quot;מ)
        </FieldLabel>
        <input
          id="totalRevenue"
          type="number"
          min={0}
          value={s4.totalRevenue}
          onChange={(e) => onChange({ ...s4, totalRevenue: e.target.value })}
          className={inputCls(!!errors.totalRevenue)}
          dir="ltr"
          placeholder="248500"
        />
        <ErrorMsg msg={errors.totalRevenue} />
        <p className="mt-1 text-xs text-muted">
          זה מה שייכנס לשדות 238 ו-294 בטופס
        </p>
      </div>
    </div>
  );
}
