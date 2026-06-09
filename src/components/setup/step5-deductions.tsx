import { OsekType } from "@/lib/persona";
import { cn } from "@/lib/utils";
import { InfoIcon } from "@/components/brand/icons";
import { FieldLabel, ErrorMsg, inputCls } from "./fields";
import type { Step5Data, Errors } from "./types";

export function Step5Deductions({
  data,
  onChange,
  errors,
  osekType,
  previewNet,
}: {
  data: Step5Data;
  onChange: (next: Step5Data) => void;
  errors: Errors;
  osekType: OsekType;
  previewNet: number | null;
}) {
  const s5 = data;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-brand-deep/20 bg-info/30 px-4 py-3 text-sm text-brand-navy flex gap-2 items-start">
        <InfoIcon className="size-4 mt-0.5 shrink-0 text-brand-deep" />
        <span>
          <span className="font-medium">הוצאות במטבע זר?</span>{" "}
          המר/י לשקלים לפי שער יציג של בנק ישראל בתאריך כל חשבונית בנפרד. אם
          השער השתנה במהלך השנה — כל חשבונית מקבלת שער המרה משלה. הסכום
          המסכם בשדה זה חייב להיות שקלי.
        </span>
      </div>
      <div>
        <FieldLabel htmlFor="expenses" required>
          {osekType === "morshe"
            ? "סך הוצאות מוכרות (ללא מע״מ)"
            : "סך הוצאות מוכרות (כולל מע״מ)"}
        </FieldLabel>
        <input
          id="expenses"
          type="number"
          min={0}
          value={s5.totalDeductibleExpenses}
          onChange={(e) =>
            onChange({
              ...s5,
              totalDeductibleExpenses: e.target.value,
            })
          }
          className={inputCls(!!errors.totalDeductibleExpenses)}
          dir="ltr"
          placeholder="47800"
        />
        <ErrorMsg msg={errors.totalDeductibleExpenses} />
        <p className="mt-1 text-xs text-muted">
          {osekType === "morshe"
            ? "עוסק/ת מורשה — מע״מ תשומות חוזר דרך דוח המע״מ, לא נחשב הוצאה למס הכנסה"
            : "עוסק/ת פטור/ה — מע״מ ששולם הוא חלק מהעלות, כלול בסכום"}
        </p>
      </div>

      <div className="border-t border-line pt-4 mt-2">
        <h3 className="text-sm font-semibold text-ink mb-3">
          ניכויים אישיים (אופציונלי)
        </h3>
        <div className="space-y-3">
          <div>
            <FieldLabel htmlFor="bituachLeumi">
              ביטוח לאומי ששילמת השנה (שדה 030)
            </FieldLabel>
            <input
              id="bituachLeumi"
              type="number"
              min={0}
              value={s5.bituachLeumiAnnualPaid}
              onChange={(e) =>
                onChange({
                  ...s5,
                  bituachLeumiAnnualPaid: e.target.value,
                })
              }
              className={inputCls(!!errors.bituachLeumiAnnualPaid)}
              dir="ltr"
              placeholder="22340"
            />
            <ErrorMsg msg={errors.bituachLeumiAnnualPaid} />
            <p className="mt-1 text-xs text-muted">
              52% מהסכום מוכר לניכוי
            </p>
          </div>

          <div>
            <FieldLabel htmlFor="kerenH">
              הפקדות לקרן השתלמות (שדה 137)
            </FieldLabel>
            <input
              id="kerenH"
              type="number"
              min={0}
              value={s5.kerenHishtalmut}
              onChange={(e) =>
                onChange({ ...s5, kerenHishtalmut: e.target.value })
              }
              className={inputCls(!!errors.kerenHishtalmut)}
              dir="ltr"
              placeholder="18375"
            />
            <ErrorMsg msg={errors.kerenHishtalmut} />
          </div>

          <div>
            <FieldLabel htmlFor="pension">
              הפקדות לקרן פנסיה / קופת גמל
            </FieldLabel>
            <input
              id="pension"
              type="number"
              min={0}
              value={s5.pensionContributions}
              onChange={(e) =>
                onChange({
                  ...s5,
                  pensionContributions: e.target.value,
                })
              }
              className={inputCls(!!errors.pensionContributions)}
              dir="ltr"
              placeholder="9000"
            />
            <ErrorMsg msg={errors.pensionContributions} />
          </div>

          <div>
            <FieldLabel htmlFor="donations">
              תרומות למוסדות מוכרים השנה
            </FieldLabel>
            <input
              id="donations"
              type="number"
              min={0}
              value={s5.donations}
              onChange={(e) => onChange({ ...s5, donations: e.target.value })}
              className={inputCls(!!errors.donations)}
              dir="ltr"
              placeholder="0"
            />
            <ErrorMsg msg={errors.donations} />
          </div>
        </div>
      </div>

      {previewNet !== null && (
        <div className="countme-frame px-4 py-3 mt-4">
          <div className="text-xs text-muted mb-1">
            הכנסה חייבת (הערכה לשדה 150)
          </div>
          <div
            className={cn(
              "text-2xl font-bold font-display",
              previewNet >= 0 ? "text-brand-navy" : "text-alert",
            )}
          >
            {previewNet.toLocaleString("he-IL")} ₪
          </div>
          {previewNet < 0 && (
            <p className="text-xs text-alert mt-1">
              הוצאות גבוהות מההכנסות, ייתכן הפסד עסקי לצורכי מס
            </p>
          )}
        </div>
      )}
    </div>
  );
}
