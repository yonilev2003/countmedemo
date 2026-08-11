"use client";

/**
 * /home — the post-login landing for RETURNING users (the "shortcuts home").
 *
 * Flow (decided with Yoni, "full device adaptation"):
 *   • first-timer (no persona)  → redirected to /onboarding (beta, ONB-7)
 *   • returning user (persona)  → this device-adaptive shortcuts hub
 *
 * The OAuth callback now sends everyone here by default; this page is the single
 * place that decides setup-vs-hub, so the rule lives in one spot and is resilient
 * even if the DB read is briefly unavailable (usePersona falls back to the cache).
 *
 * Device adaptation: one responsive grid of large, tappable shortcut cards
 * (2-up on phones, 3-up from `lg`), 44px+ targets, safe-area aware. Reuses the
 * canonical QUICK_ACTIONS list so the hub never drifts from the rail/bar.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePersona } from "@/lib/data/use-persona";
import { ONBOARDING_ROUTE } from "@/lib/onboarding/route";
import { QUICK_ACTIONS } from "@/components/dashboard/quick-actions";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Reveal, Stagger, StaggerItem } from "@/components/brand/motion";
import { cn } from "@/lib/utils";
import {
  ArrowLeftIcon,
  FileTextIcon,
  TrendingUpIcon,
} from "@/components/brand/icons";

/** Time-of-day Hebrew greeting (matches the dashboard). */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "בוקר טוב";
  if (h < 17) return "צהריים טובים";
  if (h < 21) return "ערב טוב";
  return "לילה טוב";
}

export default function HomePage() {
  const router = useRouter();
  const { persona, source, loading } = usePersona();

  // First-timer (resolved, no persona anywhere) → start onboarding.
  useEffect(() => {
    if (source === "empty") router.replace(ONBOARDING_ROUTE);
  }, [source, router]);

  if (loading || source === "empty") return <HomeSkeleton />;

  const firstName = persona?.personal?.firstName?.trim();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16 pt-6 sm:px-6 sm:pt-10">
      {/* Header — greeting + the two primary destinations */}
      <Reveal>
        <header className="mb-7 flex flex-col gap-5 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Logo className="mb-4" />
            <h1 className="font-display text-[26px] font-extrabold leading-tight tracking-tight text-brand-navy sm:text-3xl">
              {greeting()}
              {firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-1.5 text-sm text-muted sm:text-base">
              מה תרצו לעשות היום? הכול במקום אחד.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <Link href="/dashboard" className={btn("primary", "md")}>
              <TrendingUpIcon className="size-[18px]" />
              הדשבורד שלי
            </Link>
            <Link href="/receivables" className={btn("secondary", "md")}>
              <FileTextIcon className="size-[18px]" />
              מי לא שילם לי
            </Link>
            <SignOutButton />
          </div>
        </header>
      </Reveal>

      {/* Shortcut grid — the hub. 2-up on phones, 3-up on desktop. */}
      <Stagger className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-3">
        {/* Beta (Yoni 23/07): lean scope — hide the tax-calendar tiles; docs+expenses+Eitan only */}
        {QUICK_ACTIONS.filter((a) => !["/deadlines", "/alerts"].includes(a.href)).map((a) => (
          <StaggerItem key={a.href}>
            <Link
              href={a.href}
              className={cn(
                "group flex min-h-[120px] flex-col justify-between rounded-3xl border border-line bg-paper p-4 shadow-brand transition-all",
                "hover:-translate-y-0.5 hover:border-brand-deep",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep focus-visible:ring-offset-2",
                "sm:min-h-[150px] sm:p-5",
              )}
            >
              <span
                className={cn(
                  "grid size-12 place-items-center rounded-2xl transition-transform group-hover:scale-105 sm:size-14",
                  a.tone,
                )}
              >
                {a.icon}
              </span>
              <span className="mt-3">
                <span className="flex items-center gap-1.5 text-[15px] font-bold leading-tight text-brand-navy sm:text-base">
                  {a.label}
                  <ArrowLeftIcon className="size-4 opacity-0 transition-all group-hover:translate-x-[-2px] group-hover:opacity-60" />
                </span>
                <span className="mt-1 block text-[12.5px] leading-snug text-muted sm:text-[13px]">
                  {a.hint}
                </span>
              </span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </main>
  );
}

/** Skeleton shown while persona resolves (and during the first-timer redirect). */
function HomeSkeleton() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16 pt-6 sm:px-6 sm:pt-10">
      <div className="mb-9 space-y-3">
        <div className="h-7 w-28 animate-pulse rounded-lg bg-line-soft" />
        <div className="h-8 w-56 animate-pulse rounded-lg bg-line-soft" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="min-h-[120px] animate-pulse rounded-3xl border border-line bg-paper sm:min-h-[150px]"
          />
        ))}
      </div>
    </main>
  );
}
