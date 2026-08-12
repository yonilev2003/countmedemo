"use client";

/**
 * Chat navigation rail — the SaaS shell's left rail from the handoff mockup
 * (`CountMe Chat.html` → `.wrail`). It connects the full-screen chat (`/coach`)
 * to the rest of the app so the chat reads as one surface of the product, not a
 * standalone page.
 *
 * The mockup's rail listed *past conversations*; we don't persist conversation
 * history yet, so — per the task — the rail instead links to the app's main
 * beta-scope surfaces (dashboard / invoices / business-expenses / receivables).
 * Each row is a real, verified route.
 *
 * One reusable component, two layouts via `variant` (the page picks which to
 * render at which breakpoint — mirrors `dashboard/quick-actions.tsx`):
 *
 *   variant="rail" → desktop: a vertical side panel — brand wordmark, a
 *                    "שיחה חדשה" CTA, the nav rows (the active route gets the
 *                    `.conv.on` treatment), and an Eitan card pinned to the
 *                    bottom. Matches the mockup's `.wrail`.
 *   variant="bar"  → mobile: a fixed bottom nav bar so the shell collapses
 *                    gracefully to a single column.
 *
 * Brand-kit compliant: no emoji, line icons only, logical RTL props,
 * brand tokens + shadow-brand, Assistant font (inherited).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/brand/logo";
import {
  HomeIcon,
  ReceiptIcon,
  WalletIcon,
  ClockIcon,
  SparklesIcon,
  PlusIcon,
} from "@/components/brand/icons";

interface NavItem {
  href: string;
  label: string;
  /** Short caption shown under the label in the desktop rail rows. */
  hint: string;
  icon: React.ReactNode;
}

/**
 * The app's main surfaces, ordered as in the dashboard's quick-actions set.
 * `/coach` (this page) is intentionally NOT a row — it's the active surface and
 * is reached via the "שיחה חדשה" CTA + the Eitan card.
 * Every href is verified against `src/app/**`.
 */
const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "לוח הבית",
    hint: "סקירת ההכנסות, ההוצאות והמצב",
    icon: <HomeIcon className="size-[18px]" />,
  },
  {
    href: "/invoices",
    label: "המסמכים שלי",
    hint: "חשבוניות וקבלות שהופקו",
    icon: <ReceiptIcon className="size-[18px]" />,
  },
  {
    href: "/business-expenses",
    label: "הוצאות מוכרות",
    hint: "מדריך ההוצאות לעסק שלך",
    icon: <WalletIcon className="size-[18px]" />,
  },
  {
    href: "/receivables",
    label: "מי לא שילם לי",
    hint: "חשבונות פתוחים ותזכורות",
    icon: <ClockIcon className="size-[18px]" />,
  },
];

/** Mobile bottom-bar tabs: the chat itself + the 4 most-used surfaces. */
const BAR_ITEMS: NavItem[] = [
  {
    href: "/coach",
    label: "צ׳אט",
    hint: "",
    icon: <SparklesIcon className="size-[22px]" />,
  },
  {
    href: "/dashboard",
    label: "לוח הבית",
    hint: "",
    icon: <HomeIcon className="size-[22px]" />,
  },
  {
    href: "/invoices",
    label: "מסמכים",
    hint: "",
    icon: <ReceiptIcon className="size-[22px]" />,
  },
  {
    href: "/business-expenses",
    label: "הוצאות",
    hint: "",
    icon: <WalletIcon className="size-[22px]" />,
  },
  {
    href: "/receivables",
    label: "מי לא שילם",
    hint: "",
    icon: <ClockIcon className="size-[22px]" />,
  },
];

export function ChatNavRail({
  variant,
  className,
}: {
  variant: "rail" | "bar";
  className?: string;
}) {
  if (variant === "bar") return <ChatNavBar className={className} />;
  return <ChatNavSideRail className={className} />;
}

/* ── Desktop: vertical side rail (the mockup's `.wrail`) ────────────────────── */

function ChatNavSideRail({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex w-[284px] shrink-0 flex-col border-e border-line bg-cream p-[18px]",
        className,
      )}
    >
      {/* Brand wordmark → home */}
      <Link
        href="/dashboard"
        className="mb-5 flex items-center gap-2.5 px-1 transition-opacity hover:opacity-80"
        aria-label="CountMe — לדשבורד"
      >
        <Logo size={26} />
      </Link>

      {/* Primary CTA — start a fresh chat (lands on /coach, the chat surface) */}
      <Link
        href="/coach"
        className="mb-5 flex h-[46px] items-center justify-center gap-2 rounded-2xl bg-brand-navy text-[14.5px] font-bold text-white shadow-brand transition-colors hover:bg-navy-900"
      >
        <PlusIcon className="size-[17px]" />
        שיחה חדשה
      </Link>

      {/* Section label */}
      <div className="mb-2.5 px-1.5 text-[11.5px] font-bold uppercase tracking-[0.05em] text-faint">
        ניווט מהיר
      </div>

      {/* Nav rows — styled like the mockup's `.conv` list */}
      <nav className="flex flex-col gap-1" aria-label="ניווט ראשי">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-[13px] p-3 transition-colors",
                active
                  ? "border border-line bg-paper shadow-brand-sm"
                  : "border border-transparent hover:bg-paper",
              )}
            >
              <span
                className={cn(
                  "grid size-[34px] shrink-0 place-items-center rounded-[10px] transition-colors",
                  active
                    ? "bg-brand-navy text-brand"
                    : "bg-teal-100 text-teal-600 group-hover:bg-aqua-soft",
                )}
              >
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold leading-tight text-brand-navy">
                  {item.label}
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-muted">
                  {item.hint}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Eitan identity card pinned to the bottom (the mockup's `.eitan-card`) */}
      <div className="mt-auto flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-navy-700 to-navy-900 p-4 text-white shadow-brand">
        <span className="grid size-[46px] shrink-0 place-items-center rounded-full border-2 border-brand/60 bg-brand-navy">
          <LogoMark size={22} className="text-brand" />
        </span>
        <div className="min-w-0">
          <div className="text-[14.5px] font-extrabold leading-tight">
            שקל
          </div>
          <div className="mt-0.5 text-[11.5px] leading-snug text-aqua">
            השותף הדיגיטלי שלך לדוח השנתי
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ── Mobile: fixed bottom nav bar (graceful single-column collapse) ─────────── */

function ChatNavBar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="ניווט ראשי"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-line no-print",
        "bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80",
        "pb-[env(safe-area-inset-bottom)]",
        className,
      )}
    >
      <div className="mx-auto flex max-w-screen-sm items-stretch justify-between px-2 py-1.5">
        {BAR_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition-colors",
                active ? "text-brand-navy" : "text-faint hover:text-brand-navy",
              )}
            >
              <span className={cn(active && "text-brand-deep")}>
                {item.icon}
              </span>
              <span className="text-[10.5px] font-semibold leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
