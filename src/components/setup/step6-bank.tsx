import { getTaxYearConstants } from "@/lib/calculators/types";
import { FieldLabel, inputCls } from "./fields";
import type { Step6Data } from "./types";

export function Step6Bank({
  data,
  onChange,
  previewNet,
  totalRevenue,
  creditPoints,
  selectedYear,
}: {
  data: Step6Data;
  onChange: (next: Step6Data) => void;
  previewNet: number | null;
  totalRevenue: string;
  creditPoints: number;
  selectedYear: number;
}) {
  const s6 = data;
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-ink">
        פרטי בנק להחזר
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="bankName">שם הבנק</FieldLabel>
          <input
            id="bankName"
            type="text"
            value={s6.bankName}
            onChange={(e) => onChange({ ...s6, bankName: e.target.value })}
            className={inputCls(false)}
            placeholder="בנק הפועלים"
          />
        </div>
        <div>
          <FieldLabel htmlFor="bankCode">קוד בנק</FieldLabel>
          <input
            id="bankCode"
            type="text"
            maxLength={3}
            value={s6.bankCode}
            onChange={(e) =>
              onChange({
                ...s6,
                bankCode: e.target.value.replace(/\D/g, ""),
              })
            }
            className={inputCls(false)}
            dir="ltr"
            placeholder="12"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="branchCode">קוד סניף</FieldLabel>
          <input
            id="branchCode"
            type="text"
            maxLength={4}
            value={s6.branchCode}
            onChange={(e) =>
              onChange({
                ...s6,
                branchCode: e.target.value.replace(/\D/g, ""),
              })
            }
            className={inputCls(false)}
            dir="ltr"
            placeholder="538"
          />
        </div>
        <div>
          <FieldLabel htmlFor="account">מספר חשבון</FieldLabel>
          <input
            id="account"
            type="text"
            value={s6.accountNumber}
            onChange={(e) =>
              onChange({
                ...s6,
                accountNumber: e.target.value.replace(/\D/g, ""),
              })
            }
            className={inputCls(false)}
            dir="ltr"
            placeholder="489203"
          />
        </div>
      </div>

      <div className="border-t border-line pt-5 mt-4">
        <h3 className="text-sm font-semibold text-ink mb-3">
          סיכום מהיר
        </h3>
        <div className="countme-frame px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">
              הכנסה חייבת (שדה 150)
            </span>
            <span className="text-lg font-bold font-display text-brand-navy">
              {previewNet !== null
                ? `${previewNet.toLocaleString("he-IL")} ₪`
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">
              מחזור שנתי (שדות 238/294)
            </span>
            <span className="text-sm font-semibold text-ink">
              {totalRevenue
                ? `${Number(totalRevenue).toLocaleString("he-IL")} ₪`
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">
              נקודות זיכוי משוערות
            </span>
            <span className="text-sm font-semibold text-ink">
              {creditPoints.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">
              טופס 6111
            </span>
            <span className="text-sm font-semibold text-ink">
              {Number(totalRevenue) >
              getTaxYearConstants(selectedYear).form6111Threshold
                ? "חייבת בהגשה"
                : "פטורה"}
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs text-faint text-center">
          הנתונים נשמרים מקומית בדפדפן שלך, אין שמירה בשרת
        </p>
      </div>
    </div>
  );
}
