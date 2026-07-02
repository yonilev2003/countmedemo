import { cn } from "@/lib/utils";

/**
 * Traffic-light status system from the Brand Kit.
 *   on-track — paid / plenty of time (green)
 *   due      — deadline approaching (warm gold)
 *   overdue  — past due (calm terracotta)
 *   plan     — scheduled / future (teal)
 * Darker pill text colors are the kit's exact values for contrast.
 */
export type Status = "on-track" | "due" | "overdue" | "plan";

const STYLES: Record<
  Status,
  { pill: string; dot: string; stripe: string; text: string }
> = {
  "on-track": {
    pill: "bg-success-light text-success",
    dot: "bg-success",
    stripe: "bg-success",
    text: "text-success",
  },
  due: {
    pill: "bg-due-bg text-due-ink",
    dot: "bg-due",
    stripe: "bg-due",
    text: "text-due",
  },
  overdue: {
    pill: "bg-overdue-bg text-alert-ink",
    dot: "bg-alert",
    stripe: "bg-alert",
    text: "text-alert",
  },
  plan: {
    pill: "bg-teal-100 text-teal-600",
    dot: "bg-brand-deep",
    stripe: "bg-brand-deep",
    text: "text-teal-600",
  },
};

/** Pill badge with a status dot — the kit's `.pill` component. */
export function StatusBadge({
  status,
  children,
  showDot = true,
  className,
}: {
  status: Status;
  children: React.ReactNode;
  showDot?: boolean;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap",
        s.pill,
        className,
      )}
    >
      {showDot && <span className={cn("size-2 rounded-full", s.dot)} />}
      {children}
    </span>
  );
}

/** Tailwind bg-class for a status edge stripe. */
export const statusStripe = (status: Status) => STYLES[status].stripe;
/** Tailwind text-class for a status. */
export const statusText = (status: Status) => STYLES[status].text;
