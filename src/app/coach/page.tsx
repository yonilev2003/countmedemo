"use client";

import { usePersona } from "@/lib/data/use-persona";
import Link from "next/link";
import { CoachChat } from "@/components/agent/coach-chat";
import { ChatNavRail } from "@/components/agent/chat-nav-rail";
import { btn } from "@/components/brand/button";
import { LegalNote } from "@/components/brand/legal-note";
import { ArrowRightIcon, ClipboardCheckIcon } from "@/components/brand/icons";
import { CHARACTER } from "@/lib/agent/character";

export default function CoachPage() {
  const { persona, loading } = usePersona();
  const hydrated = !loading;

  return (
    <div
      className="flex min-h-screen flex-col bg-cream"
      style={{
        backgroundImage: [
          "radial-gradient(60% 40% at 84% 4%, color-mix(in srgb, var(--color-aqua) 55%, transparent) 0%, transparent 60%)",
          "radial-gradient(60% 50% at 6% 100%, color-mix(in srgb, var(--color-brand-navy) 18%, transparent) 0%, transparent 60%)",
          "linear-gradient(150deg, var(--color-cream) 0%, var(--color-sand) 70%)",
        ].join(", "),
      }}
    >
      {/* SaaS shell — side nav rail + central chat column (the handoff `.webapp`).
          On <lg the rail drops out and becomes the bottom nav bar below. */}
      <div className="mx-auto flex w-full max-w-screen-xl flex-1 lg:gap-6 lg:p-6">
        {/* Desktop: the navigation rail, as a card matching the mockup shell */}
        <ChatNavRail
          variant="rail"
          className="hidden self-stretch overflow-hidden rounded-3xl shadow-brand lg:flex"
        />

        {/* Central chat column */}
        <main className="flex min-w-0 flex-1 flex-col px-4 pt-4 pb-24 lg:px-0 lg:pt-0 lg:pb-0">
          {/* Slim context bar — the product centerpiece (Form 1301) lives off the
              rail, so surface it here alongside the expense guide. */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase leading-tight tracking-[0.04em] text-teal-600">
                CountMe · Chat
              </div>
              <div className="truncate text-[12px] leading-tight text-muted">
                {CHARACTER.name} · השותף הדיגיטלי לדוח השנתי
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/business-expenses"
                className={btn("ghost", "sm", "gap-1.5")}
              >
                <ClipboardCheckIcon className="size-3.5" />
                <span className="hidden sm:inline">מדריך הוצאות</span>
              </Link>
              <Link href="/dashboard" className={btn("secondary", "sm", "gap-1.5")}>
                <ArrowRightIcon className="size-3.5" />
                לדשבורד
              </Link>
            </div>
          </div>

          {/* Chat — fills the rest of the column. coach-chat.tsx is untouched:
              streaming, attachments, mic/send and the opening chips all intact. */}
          {hydrated && (
            <div className="min-h-[560px] flex-1">
              <CoachChat persona={persona} />
            </div>
          )}

          {/* WS8 audit H7 — one-line canonical note (no tax-year hardcoding) */}
          <LegalNote variant="line" className="mt-3 px-2 text-center" />
        </main>
      </div>

      {/* Mobile: the rail collapses to a fixed bottom nav bar */}
      <ChatNavRail variant="bar" className="lg:hidden" />
    </div>
  );
}
