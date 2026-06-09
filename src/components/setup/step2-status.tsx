import { FieldLabel, ErrorMsg, inputCls } from "./fields";
import type { Step2Data, Errors } from "./types";

export function Step2Status({
  data,
  onChange,
  errors,
  currentYear,
}: {
  data: Step2Data;
  onChange: (next: Step2Data) => void;
  errors: Errors;
  currentYear: number;
}) {
  const s2 = data;

  function addChild() {
    onChange({ ...s2, children: [...s2.children, { birthYear: "" }] });
  }
  function removeChild(idx: number) {
    onChange({ ...s2, children: s2.children.filter((_, i) => i !== idx) });
  }
  function setChildYear(idx: number, year: string) {
    const next = [...s2.children];
    next[idx] = { birthYear: year };
    onChange({ ...s2, children: next });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-cream p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={s2.isSoldierDischarged}
            onChange={(e) =>
              onChange({
                ...s2,
                isSoldierDischarged: e.target.checked,
              })
            }
            className="h-4 w-4 mt-0.5 rounded border-line accent-brand-navy"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-ink">
              חייל/ת משוחרר/ת
            </span>
            <p className="text-xs text-muted mt-0.5">
              זכאות לנקודת זיכוי במשך 36 חודשים מהשחרור (שדה 068)
            </p>
          </div>
        </label>
        {s2.isSoldierDischarged && (
          <div className="mt-3 me-7">
            <FieldLabel htmlFor="dischargeDate" required>
              תאריך שחרור
            </FieldLabel>
            <input
              id="dischargeDate"
              type="date"
              value={s2.soldierDischargeDate}
              onChange={(e) =>
                onChange({
                  ...s2,
                  soldierDischargeDate: e.target.value,
                })
              }
              className={inputCls(!!errors.soldierDischargeDate)}
              dir="ltr"
              max={new Date().toISOString().split("T")[0]}
            />
            <ErrorMsg msg={errors.soldierDischargeDate} />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-line bg-cream p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={s2.isNewResident}
            onChange={(e) =>
              onChange({ ...s2, isNewResident: e.target.checked })
            }
            className="h-4 w-4 mt-0.5 rounded border-line accent-brand-navy"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-ink">
              עולה חדש/ה
            </span>
            <p className="text-xs text-muted mt-0.5">
              זכאות ל-3 נקודות זיכוי בשלוש השנים הראשונות (שדה 044)
            </p>
          </div>
        </label>
        {s2.isNewResident && (
          <div className="mt-3 me-7">
            <FieldLabel htmlFor="aliyahDate" required>
              תאריך עלייה
            </FieldLabel>
            <input
              id="aliyahDate"
              type="date"
              value={s2.aliyahDate}
              onChange={(e) => onChange({ ...s2, aliyahDate: e.target.value })}
              className={inputCls(false)}
              dir="ltr"
              max={new Date().toISOString().split("T")[0]}
            />
            <p className="mt-1 text-xs text-muted">
              נדרש לחישוב מספר שנות הזכאות לנקודות עולה חדש/ה
            </p>
          </div>
        )}
      </div>

      <div>
        <FieldLabel htmlFor="academicYear">
          שנת סיום תואר אקדמי (אופציונלי)
        </FieldLabel>
        <input
          id="academicYear"
          type="number"
          min={1950}
          max={currentYear}
          value={s2.academicDegreeYear}
          onChange={(e) =>
            onChange({ ...s2, academicDegreeYear: e.target.value })
          }
          className={inputCls(!!errors.academicDegreeYear)}
          dir="ltr"
          placeholder="לדוגמה: 2022"
        />
        <ErrorMsg msg={errors.academicDegreeYear} />
        <p className="mt-1 text-xs text-muted">
          זכאות לנקודת זיכוי על תואר ראשון (שנה אחת) או תואר שני
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <FieldLabel>ילדים (שנת לידה)</FieldLabel>
          <button
            type="button"
            onClick={addChild}
            className="text-xs text-brand-deep hover:underline font-medium"
          >
            + הוסיפי ילד/ה
          </button>
        </div>
        {s2.children.length === 0 ? (
          <p className="text-xs text-faint py-2">
            אין ילדים. נקודות זיכוי לילדים תלויות בגיל
          </p>
        ) : (
          <div className="space-y-2">
            {s2.children.map((c, i) => (
              <div key={i} className="flex gap-2 items-start">
                <input
                  type="number"
                  min={1980}
                  max={currentYear}
                  value={c.birthYear}
                  onChange={(e) => setChildYear(i, e.target.value)}
                  className={inputCls(!!errors[`child-${i}`])}
                  dir="ltr"
                  placeholder="שנת לידה"
                />
                <button
                  type="button"
                  onClick={() => removeChild(i)}
                  className="rounded-xl border border-line px-3 py-2 text-sm text-muted hover:bg-cream hover:text-ink transition-colors"
                >
                  הסירי
                </button>
              </div>
            ))}
            {s2.children.map(
              (_, i) =>
                errors[`child-${i}`] && (
                  <ErrorMsg key={i} msg={errors[`child-${i}`]} />
                ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
