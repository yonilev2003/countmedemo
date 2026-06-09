import { cn } from "@/lib/utils";
import { CheckIcon } from "@/components/brand/icons";

export const TOTAL_STEPS = 6;

export const STEP_TITLES = [
  "פרטים אישיים",
  "מעמד ומשפחה",
  "פרטי עסק",
  "הכנסות",
  "הוצאות וניכויים",
  "בנק וסיכום",
];

export function getStepSubtitles(year: number): string[] {
  return [
    "כמה פרטים בסיסיים כדי לזהות אותך",
    "מעמדים מיוחדים שמשפיעים על נקודות זיכוי",
    "ספרי לנו על העסק שלך",
    `נתוני הכנסות לשנת המס ${year}`,
    "הוצאות מוכרות, ביטוחים ותרומות",
    "פרטי בנק לזיכוי, וסיכום מהיר",
  ];
}

export function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-7">
      <div className="flex items-center justify-between mb-3 gap-1">
        {STEP_TITLES.map((label, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1 flex-1 min-w-0"
          >
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                i + 1 < step
                  ? "bg-brand-deep text-white"
                  : i + 1 === step
                    ? "bg-brand-navy text-white ring-4 ring-brand-navy/15"
                    : "bg-sand text-muted",
              )}
            >
              {i + 1 < step ? (
                <CheckIcon className="size-3.5" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                "hidden md:block text-[10px] text-center leading-tight truncate w-full",
                i + 1 === step
                  ? "text-brand-navy font-medium"
                  : "text-faint",
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="h-1.5 bg-sand rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-l from-brand-deep to-brand-navy rounded-full transition-all duration-500"
          style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
        />
      </div>
      <div className="mt-2 text-start text-xs text-faint">
        {step}/{TOTAL_STEPS}
      </div>
    </div>
  );
}
