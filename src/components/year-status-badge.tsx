import {
  getYearStatus,
  FILING_STATUS_META,
  type FilingStatus,
} from "@/lib/calculators/types";

const TONE: Record<FilingStatus, string> = {
  // already filed — neutral/grey
  filed: "bg-stone-100 text-stone-600 border-stone-200",
  // open for filing now — the active year, brand-highlighted
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  // future / still accruing — muted blue
  future: "bg-blue-50 text-blue-600 border-blue-200",
};

/**
 * Small pill showing a tax year's filing status (הוגש / פתוח להגשה / עתידי).
 * Single source: status + Hebrew label come from lib/calculators/types.
 */
export function YearStatusBadge({
  year,
  className = "",
}: {
  year: number;
  className?: string;
}) {
  const status = getYearStatus(year);
  const { label } = FILING_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE[status]} ${className}`}
    >
      {label}
    </span>
  );
}
