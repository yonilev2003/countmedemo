"use client";

/**
 * Chat navigation rail — the SaaS shell's left rail from the handoff mockup
 * (`CountMe Chat.html` → `.wrail`). It connects the full-screen chat (`/coach`)
 * to the rest of the app so the chat reads as one surface of the product, not a
 * standalone page.
 *
 * The mockup's rail listed *past conversations* (`.sect` "שיחות אחרונות" +
 * `.conv`/`.conv.on` rows) — that's now real, backed by
 * `src/lib/chat/history.ts` (2026-08-18, Yoni's locked decision: multiple
 * named conversations with a sidebar list). The nav rows to the app's other
 * beta-scope surfaces (dashboard / invoices / business-expenses /
 * receivables) sit below the thread list, same as before.
 *
 * One reusable component, two layouts via `variant` (the page picks which to
 * render at which breakpoint — mirrors `dashboard/quick-actions.tsx`):
 *
 *   variant="rail" → desktop: a vertical side panel — brand wordmark, a
 *                    "שיחה חדשה" CTA, the past-conversations list (only for a
 *                    signed-in user with a persona — see `persona` prop), the
 *                    nav rows (the active route gets the `.conv.on`
 *                    treatment), and an Eitan card pinned to the bottom.
 *                    Matches the mockup's `.wrail`.
 *   variant="bar"  → mobile: a fixed bottom nav bar so the shell collapses
 *                    gracefully to a single column. Thread list props are
 *                    irrelevant here — mobile has no room for a sidebar.
 *
 * Brand-kit compliant: no emoji, line icons only, logical RTL props,
 * brand tokens + shadow-brand, Assistant font (inherited).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Persona } from "@/lib/persona";
import type { ChatThread } from "@/lib/chat/history";
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

interface ChatNavRailProps {
  variant: "rail" | "bar";
  className?: string;
  /** Gates the "שיחות אחרונות" section (rail variant only): hidden entirely
   *  for an anonymous/signed-out visit, same signal coach-chat.tsx already
   *  uses for its own persona-gated CTA bar. Irrelevant for variant="bar". */
  persona?: Persona | null;
  /** This user's persisted threads, most-recent first (from listThreads()).
   *  Owned by the page (coach/page.tsx), not fetched here, so it always
   *  agrees with whatever CoachChat is showing. */
  threads?: ChatThread[];
  activeThreadId?: string | null;
  onSelectThread?: (id: string) => void;
  /** "שיחה חדשה" CTA — starts a fresh, unsaved chat (see coach/page.tsx's
   *  handleNewThread). Falls back to a plain link to /coach when omitted. */
  onNewThread?: () => void;
}

export function ChatNavRail({
  variant,
  className,
  persona,
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
}: ChatNavRailProps) {
  if (variant === "bar") return <ChatNavBar className={className} />;
  return (
    <ChatNavSideRail
      className={className}
      persona={persona}
      threads={threads}
      activeThreadId={activeThreadId}
      onSelectThread={onSelectThread}
      onNewThread={onNewThread}
    />
  );
}

/* ── Desktop: vertical side rail (the mockup's `.wrail`) ────────────────────── */

/** Coarse Hebrew relative time for a thread's last-updated timestamp,
 *  matching the mockup's `.conv .s` subtitle shape ("לפני 5 דקות" etc). Only
 *  used here — not a general-purpose formatter, so it stays local rather
 *  than joining lib/utils.ts's shared formatters. */
function relativeTimeHe(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "עכשיו";
  if (minutes < 60) return `לפני ${minutes} דקות`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "אתמול";
  if (days < 7) return `לפני ${days} ימים`;
  return new Date(iso).toLocaleDateString("he-IL");
}

function ChatNavSideRail({
  className,
  persona,
  threads = [],
  activeThreadId,
  onSelectThread,
  onNewThread,
}: {
  className?: string;
  persona?: Persona | null;
  threads?: ChatThread[];
  activeThreadId?: string | null;
  onSelectThread?: (id: string) => void;
  onNewThread?: () => void;
}) {
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

      {/* Primary CTA — start a fresh chat. With onNewThread wired (the
          normal /coach case) it clears the active thread in place; without
          it (defensive fallback) it just links to /coach. */}
      {onNewThread ? (
        <button
          type="button"
          onClick={onNewThread}
          className="mb-5 flex h-[46px] items-center justify-center gap-2 rounded-2xl bg-brand-navy text-[14.5px] font-bold text-white shadow-brand transition-colors hover:bg-navy-900"
        >
          <PlusIcon className="size-[17px]" />
          שיחה חדשה
        </button>
      ) : (
        <Link
          href="/coach"
          className="mb-5 flex h-[46px] items-center justify-center gap-2 rounded-2xl bg-brand-navy text-[14.5px] font-bold text-white shadow-brand transition-colors hover:bg-navy-900"
        >
          <PlusIcon className="size-[17px]" />
          שיחה חדשה
        </Link>
      )}

      {/* Past conversations (the mockup's `.sect` + `.conv` list) — only for
          a signed-in user with a persona. An anonymous /coach visit has
          nothing persisted (history.ts no-ops while signed out), so the
          section is hidden entirely rather than shown empty. */}
      {persona && threads.length > 0 && (
        <>
          <div className="mb-2.5 px-1.5 text-[11.5px] font-bold uppercase tracking-[0.05em] text-faint">
            שיחות אחרונות
          </div>
          <nav className="mb-4 flex flex-col gap-1" aria-label="שיחות קודמות">
            {threads.map((thread) => {
              const active = thread.id === activeThreadId;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => onSelectThread?.(thread.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[13px] p-2.5 text-start transition-colors",
                    active
                      ? "border border-line bg-paper shadow-brand-sm"
                      : "border border-transparent hover:bg-paper",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-[30px] shrink-0 place-items-center rounded-[10px] transition-colors",
                      active
                        ? "bg-brand-navy text-brand"
                        : "bg-teal-100 text-teal-600",
                    )}
                  >
                    <SparklesIcon className="size-[15px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold leading-tight text-brand-navy">
                      {thread.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                      {relativeTimeHe(thread.updatedAt)}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </>
      )}

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
