import { OsekType } from "@/lib/persona";
import { AlertTriangleIcon } from "@/components/brand/icons";
import { FieldLabel, ErrorMsg, inputCls } from "./fields";
import type { Step3Data, Errors } from "./types";

export function Step3Business({
  data,
  onChange,
  errors,
  totalRevenue,
  totalExpenses,
}: {
  data: Step3Data;
  onChange: (next: Step3Data) => void;
  errors: Errors;
  /** From step 4/5 state — feeds the osek-zeir warning when revisiting this step */
  totalRevenue: number;
  totalExpenses: number;
}) {
  const s3 = data;
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel htmlFor="tradeName" required>
          שם העסק
        </FieldLabel>
        <input
          id="tradeName"
          type="text"
          value={s3.tradeName}
          onChange={(e) => onChange({ ...s3, tradeName: e.target.value })}
          className={inputCls(!!errors.tradeName)}
          placeholder="דנה כהן, עיצוב חוויית משתמש"
        />
        <ErrorMsg msg={errors.tradeName} />
      </div>

      <div>
        <FieldLabel htmlFor="primaryOccupation" required>
          תחום עיסוק
        </FieldLabel>
        <input
          id="primaryOccupation"
          type="text"
          value={s3.primaryOccupation}
          onChange={(e) =>
            onChange({ ...s3, primaryOccupation: e.target.value })
          }
          className={inputCls(!!errors.primaryOccupation)}
          placeholder="עיצוב UX, פיתוח תוכנה, יעוץ"
        />
        <ErrorMsg msg={errors.primaryOccupation} />
      </div>

      <div>
        <FieldLabel htmlFor="osekType">סוג עוסק</FieldLabel>
        <select
          id="osekType"
          value={s3.osekType}
          onChange={(e) => {
            const next = e.target.value as OsekType;
            onChange({
              ...s3,
              osekType: next,
              // עוסק זעיר rule applies only to עוסק פטור
              isOsekZeir: next === "patur" ? s3.isOsekZeir : false,
            });
          }}
          className={inputCls(false)}
        >
          <option value="patur">עוסק פטור</option>
          <option value="morshe">עוסק מורשה</option>
        </select>
      </div>

      {s3.osekType === "patur" && (
        <div className="rounded-xl border border-line bg-cream p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={s3.isOsekZeir}
              onChange={(e) =>
                onChange({ ...s3, isOsekZeir: e.target.checked })
              }
              className="h-4 w-4 mt-0.5 rounded border-line accent-brand-navy"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-ink">
                מסלול עוסק זעיר (ניכוי 30% אוטומטי)
              </span>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">
                לעוסק פטור עם מחזור עד 120,000 ₪. 30% מהמחזור מוכרים אוטומטית כהוצאות
                (כולל ביטוח לאומי). אין חובת מקדמות. יציאה מהמסלול חוסמת חזרה לשנתיים.
              </p>
            </div>
          </label>
          <OsekZeirWarning
            checked={s3.isOsekZeir}
            totalRevenue={totalRevenue}
            totalExpenses={totalExpenses}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Warning banner shown when osek zeir is checked but real expenses
 * exceed the 30% auto-deduction. The user would lose the difference
 * in deductions by filing as zeir.
 *
 * Reference: Israeli Tax Ordinance — מסלול עוסק זעיר (סעיף 8א2 לפקודה,
 * תיקון 257 משנת 2024). מאפשר ניכוי אוטומטי של 30% מהמחזור כהוצאות
 * במקום הוצאות בפועל.
 */
function OsekZeirWarning({
  checked,
  totalRevenue,
  totalExpenses,
}: {
  checked: boolean;
  totalRevenue: number;
  totalExpenses: number;
}) {
  if (!checked) return null;
  if (totalRevenue <= 0 || totalExpenses <= 0) return null;

  // Use the shared algorithm (kept locally inline to avoid pulling persona shape into setup state)
  const ratio = totalExpenses / totalRevenue;
  if (ratio <= 0.3) return null;
  const lostDeduction = Math.round(totalExpenses - totalRevenue * 0.3);

  return (
    <div className="mt-3 rounded-xl border-2 border-due/40 bg-due-bg/60 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangleIcon className="size-4 text-due shrink-0 mt-0.5" />
        <div className="flex-1 text-xs leading-relaxed text-ink">
          <p className="font-bold mb-1 text-due">
            שימי לב — מסלול זעיר עשוי להפסיד לך הוצאות
          </p>
          <p>
            לפי תיקון 257 לפקודת מס הכנסה (רפורמת המסלול הירוק לעוסק זעיר), הגשה
            כעוסק/ת זעיר/ה תכיר ב-30% מהמחזור בלבד כהוצאות אוטומטיות
            ({Math.round(totalRevenue * 0.3).toLocaleString("he-IL")} ₪).
          </p>
          <p className="mt-1.5">
            ההוצאות שדיווחת ({totalExpenses.toLocaleString("he-IL")} ₪) הן{" "}
            <strong>{Math.round(ratio * 100)}%</strong> מהמחזור — תאבד/י הכרה
            ב-<strong>{lostDeduction.toLocaleString("he-IL")} ₪</strong> של
            הוצאות אמיתיות.
          </p>
          <p className="mt-1.5 text-due">
            מומלץ לבטל את המסלול ולדווח בדרך הרגילה (עוסק פטור) כדי לקבל הכרה
            מלאה בכל ההוצאות.
          </p>
        </div>
      </div>
    </div>
  );
}
