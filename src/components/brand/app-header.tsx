import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * Standard in-app page header: logo (linking back to /dashboard) + page label,
 * with an optional actions slot on the end side. Extracted from the pattern
 * already duplicated across /invoices, /alerts, /deadlines, /expenses, /coach,
 * /receivables, /dashboard/pro etc. — every logged-in page should use this
 * instead of hand-rolling the header, so "back to dashboard" is guaranteed
 * consistent and never silently omitted or mis-targeted (see /file/page.tsx's
 * old bug: its header linked to "/", not "/dashboard").
 */
export function AppHeader({
  pageLabel,
  actions,
  className,
}: {
  /** Short label after the logo, e.g. "חשבוניות". Omit for the dashboard itself. */
  pageLabel?: string;
  /** Right-aligned (RTL: start-side) action buttons/links. */
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("bg-paper border-b border-line", className)}>
      {/* flex-wrap: on narrow phones a long actions row must wrap under the
          logo instead of forcing the layout viewport wider than the screen —
          an unwrappable 588px header zoomed the whole page out to 66% and put
          the back-to-dashboard logo outside the tappable area (journey scan). */}
      <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between gap-y-2 px-4 py-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size={24} />
          {pageLabel && (
            <span className="text-base font-semibold text-muted">
              · {pageLabel}
            </span>
          )}
        </Link>
        {actions && (
          <nav aria-label="פעולות עמוד" className="flex flex-wrap items-center gap-2">
            {actions}
          </nav>
        )}
      </div>
    </header>
  );
}
