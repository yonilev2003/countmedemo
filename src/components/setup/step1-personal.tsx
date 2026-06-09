import { MaritalStatus } from "@/lib/persona";
import { cn } from "@/lib/utils";
import { FieldLabel, ErrorMsg, inputCls } from "./fields";
import type { Step1Data, Errors } from "./types";

export function Step1Personal({
  data,
  onChange,
  errors,
}: {
  data: Step1Data;
  onChange: (next: Step1Data) => void;
  errors: Errors;
}) {
  const s1 = data;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="firstName" required>
            שם פרטי
          </FieldLabel>
          <input
            id="firstName"
            type="text"
            value={s1.firstName}
            onChange={(e) => onChange({ ...s1, firstName: e.target.value })}
            className={inputCls(!!errors.firstName)}
            placeholder="דנה"
          />
          <ErrorMsg msg={errors.firstName} />
        </div>
        <div>
          <FieldLabel htmlFor="lastName" required>
            שם משפחה
          </FieldLabel>
          <input
            id="lastName"
            type="text"
            value={s1.lastName}
            onChange={(e) => onChange({ ...s1, lastName: e.target.value })}
            className={inputCls(!!errors.lastName)}
            placeholder="כהן"
          />
          <ErrorMsg msg={errors.lastName} />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="teudatZehut" required>
          תעודת זהות
        </FieldLabel>
        <input
          id="teudatZehut"
          type="text"
          inputMode="numeric"
          maxLength={9}
          value={s1.teudatZehut}
          onChange={(e) =>
            onChange({
              ...s1,
              teudatZehut: e.target.value.replace(/\D/g, ""),
            })
          }
          className={inputCls(!!errors.teudatZehut)}
          placeholder="9 ספרות"
          dir="ltr"
        />
        <ErrorMsg msg={errors.teudatZehut} />
      </div>

      <div>
        <FieldLabel htmlFor="birthDate" required>
          תאריך לידה
        </FieldLabel>
        <input
          id="birthDate"
          type="date"
          value={s1.birthDate}
          onChange={(e) => onChange({ ...s1, birthDate: e.target.value })}
          className={inputCls(!!errors.birthDate)}
          dir="ltr"
          max={new Date().toISOString().split("T")[0]}
        />
        <ErrorMsg msg={errors.birthDate} />
      </div>

      <div>
        <FieldLabel>מגדר (משפיע על נקודות זיכוי)</FieldLabel>
        <div className="flex gap-3">
          <label
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors text-sm",
              s1.gender === "female"
                ? "border-brand-deep bg-teal-100/40 text-brand-navy font-medium"
                : "border-line bg-paper hover:bg-cream",
            )}
          >
            <input
              type="radio"
              name="gender"
              value="female"
              checked={s1.gender === "female"}
              onChange={() => onChange({ ...s1, gender: "female" })}
              className="sr-only"
            />
            נקבה (2.75 נקודות)
          </label>
          <label
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors text-sm",
              s1.gender === "male"
                ? "border-brand-deep bg-teal-100/40 text-brand-navy font-medium"
                : "border-line bg-paper hover:bg-cream",
            )}
          >
            <input
              type="radio"
              name="gender"
              value="male"
              checked={s1.gender === "male"}
              onChange={() => onChange({ ...s1, gender: "male" })}
              className="sr-only"
            />
            זכר (2.25 נקודות)
          </label>
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="maritalStatus">מצב משפחתי</FieldLabel>
        <select
          id="maritalStatus"
          value={s1.maritalStatus}
          onChange={(e) =>
            onChange({
              ...s1,
              maritalStatus: e.target.value as MaritalStatus,
            })
          }
          className={inputCls(false)}
        >
          <option value="single">רווק/ה</option>
          <option value="married">נשוי/ה</option>
          <option value="divorced">גרוש/ה</option>
          <option value="widowed">אלמן/ה</option>
          <option value="separated">פרוד/ה</option>
        </select>
      </div>
    </div>
  );
}
