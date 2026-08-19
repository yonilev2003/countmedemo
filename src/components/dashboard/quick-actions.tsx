"use client";

/**
 * Quick-actions bar — the "קיצורי דרך" from CountMe Shortcuts.html.
 *
 * One reusable component, two layouts via the `variant` prop (the page picks
 * which to render at which breakpoint — not two separate components):
 *
 *   variant="bar"   → mobile: a fixed bottom action bar with a center "+" FAB,
 *                     echoing the App mockup's tab bar (but every item is a
 *                     real shortcut, not a nav tab).
 *   variant="rail"  → desktop: a vertical side panel of shortcut tiles, the
 *                     "ארבעת הקיצורים" legend from the Shortcuts mockup.
 *
 * Every action links to an EXISTING route (verified against src/app/**):
 *   • חשבונית / קבלה  → /invoices/new   (the invoice+receipt generator)
 *   • המסמכים שלי     → /invoices
 *   • הוצאות מוכרות   → /business-expenses
 *   • מועדים          → /deadlines
 *   • התראות          → /alerts
 *   • שיחה עם שקל    → /coach
 *   • תיעוד הוצאה     → /expenses/new (rail only — appended at the end so it
 *                       doesn't shift the mobile bar's hardcoded indices)
 *
 * Brand-kit compliant: no emoji, line icons only, logical RTL props,
 * brand tokens + shadow-brand, Assistant font (inherited).
 */

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  FileTextIcon,
  ReceiptIcon,
  WalletIcon,
  CalendarIcon,
  BellIcon,
  SparklesIcon,
  PlusIcon,
  UploadIcon,
} from "@/components/brand/icons";

export interface QuickAction {
  href: string;
  label: string;
  /** Longer description — shown in the desktop rail tiles. */
  hint: string;
  icon: React.ReactNode;
  /** Tailwind classes for the icon tile (bg + text) — the kit's `.ttl-*` tones. */
  tone: string;
  /** Keyboard hint shown in the rail (cosmetic, mirrors the mockup's ⌘ chips). */
  kbd?: string;
}

/**
 * The product's quick actions, ordered as in the Shortcuts mockup
 * (document creation first, then the supporting tools). Each maps to a
 * verified existing route.
 */
export const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/invoices/new",
    label: "חשבונית / קבלה",
    hint: "הפקת חשבונית מס או קבלה ללקוח",
    icon: <FileTextIcon className="size-[22px]" />,
    tone: "bg-teal-100 text-brand-deep",
    kbd: "⌘ I",
  },
  {
    href: "/invoices",
    label: "המסמכים שלי",
    hint: "כל החשבוניות והקבלות שהופקו",
    icon: <ReceiptIcon className="size-[22px]" />,
    tone: "bg-beige-100 text-beige-600",
    kbd: "⌘ R",
  },
  {
    href: "/business-expenses",
    label: "הוצאות מוכרות",
    hint: "מדריך ההוצאות המוכרות לעסק שלך",
    icon: <WalletIcon className="size-[22px]" />,
    tone: "bg-success-light text-success",
    kbd: "⌘ E",
  },
  {
    href: "/deadlines",
    label: "מועדים",
    hint: "לוח מועדי ההגשה הקרובים",
    icon: <CalendarIcon className="size-[22px]" />,
    tone: "bg-aqua-soft text-brand-navy",
    kbd: "⌘ D",
  },
  {
    href: "/alerts",
    label: "התראות",
    hint: "התראות וסיכונים שדורשים תשומת לב",
    icon: <BellIcon className="size-[22px]" />,
    tone: "bg-due-bg text-due-ink",
    kbd: "⌘ A",
  },
  {
    href: "/coach",
    label: "שיחה עם שקל",
    hint: "שאל/י את העוזר החכם כל שאלה",
    icon: <SparklesIcon className="size-[22px]" />,
    tone: "bg-brand-navy text-brand",
    kbd: "⌘ K",
  },
  {
    // Appended at the end (index 6) — the mobile bar below references
    // QUICK_ACTIONS[0..5] by fixed index, so this stays rail-only and
    // doesn't shift any of those positions.
    href: "/expenses/new",
    label: "תיעוד הוצאה",
    hint: "צילום קבלה, הקלטה קולית או הזנה ידנית",
    icon: <UploadIcon className="size-[22px]" />,
    tone: "bg-due-bg text-due-ink",
  },
];

export function QuickActions({
  variant,
  className,
  currentHref,
}: {
  variant: "bar" | "rail";
  className?: string;
  /**
   * The current page's route, e.g. "/deadlines" — marks the matching
   * shortcut as the active destination instead of a plain link. Needed
   * since 2026-08-19 (global-nav sweep, FP-23): QuickActionsBar now mounts
   * on every content page it links to, not just /dashboard, so a shortcut
   * can point at the page you're already standing on.
   */
  currentHref?: string;
}) {
  if (variant === "rail")
    return <QuickActionsRail className={className} currentHref={currentHref} />;
  return <QuickActionsBar className={className} currentHref={currentHref} />;
}

/* ── Desktop: vertical side rail of shortcut tiles ─────────────────────────── */

function QuickActionsRail({
  className,
  currentHref,
}: {
  className?: string;
  currentHref?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-line bg-paper p-5 shadow-brand",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-brand-navy">פעולות מהירות</h3>
        <span className="text-xs font-semibold text-faint">קיצורי דרך</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            aria-current={a.href === currentHref ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3.5 rounded-2xl border p-3 transition-all hover:border-brand-deep hover:bg-paper",
              a.href === currentHref
                ? "border-brand-deep bg-paper"
                : "border-line-soft bg-cream/60",
            )}
          >
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105",
                a.tone,
              )}
            >
              {a.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold leading-tight text-brand-navy">
                {a.label}
              </span>
              <span className="mt-0.5 block truncate text-[12.5px] text-muted">
                {a.hint}
              </span>
            </span>
            {a.kbd && (
              <span className="ms-auto shrink-0 rounded-lg bg-teal-100 px-2.5 py-1 text-[11px] font-bold text-teal-600">
                {a.kbd}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ── Mobile: fixed bottom action bar with a center "+" FAB ─────────────────── */

/**
 * Mobile bar shows 4 shortcuts flanking a raised central FAB (→ /invoices/new,
 * the primary "create" action). Mirrors the App mockup's tab bar shape, but
 * each item performs a real action rather than switching a tab.
 */
function QuickActionsBar({
  className,
  currentHref,
}: {
  className?: string;
  currentHref?: string;
}) {
  // FAB = primary create action; the 4 side items are the next most-used.
  const fab = QUICK_ACTIONS[0]; // /invoices/new
  const sideItems = [
    QUICK_ACTIONS[3], // מועדים
    QUICK_ACTIONS[2], // הוצאות
    QUICK_ACTIONS[4], // התראות
    QUICK_ACTIONS[5], // שקל
  ];
  // Split 2 / FAB / 2 so the FAB sits in the middle.
  const start = sideItems.slice(0, 2);
  const end = sideItems.slice(2);

  return (
    <nav
      aria-label="פעולות מהירות"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-line no-print",
        "bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80",
        "pb-[env(safe-area-inset-bottom)]",
        className,
      )}
    >
      <div className="mx-auto flex max-w-screen-sm items-center justify-between px-4 py-2">
        {start.map((a) => (
          <BarItem key={a.href} action={a} active={a.href === currentHref} />
        ))}

        {/* Center FAB — the primary "create" shortcut */}
        <Link
          href={fab.href}
          aria-label={fab.label}
          aria-current={fab.href === currentHref ? "page" : undefined}
          className="-mt-7 grid size-14 shrink-0 place-items-center rounded-full bg-brand text-brand-navy shadow-brand transition-transform hover:scale-105 hover:bg-beige-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep focus-visible:ring-offset-2"
        >
          <PlusIcon className="size-7" />
        </Link>

        {end.map((a) => (
          <BarItem key={a.href} action={a} active={a.href === currentHref} />
        ))}
      </div>
    </nav>
  );
}

function BarItem({ action, active }: { action: QuickAction; active?: boolean }) {
  return (
    <Link
      href={action.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-1 transition-colors hover:text-brand-navy",
        active ? "text-brand-navy" : "text-faint",
      )}
    >
      <span className="[&_svg]:size-[22px]">{action.icon}</span>
      <span className="text-[10.5px] font-semibold leading-none">
        {action.label}
      </span>
    </Link>
  );
}
