"use client";

import { useCallback, useEffect, useState } from "react";
import { usePersona } from "@/lib/data/use-persona";
import Link from "next/link";
import { CoachChat } from "@/components/agent/coach-chat";
import { ChatNavRail } from "@/components/agent/chat-nav-rail";
import { listThreads, type ChatThread } from "@/lib/chat/history";
import { btn } from "@/components/brand/button";
import { LegalNote } from "@/components/brand/legal-note";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ArrowRightIcon, ClipboardCheckIcon } from "@/components/brand/icons";

export default function CoachPage() {
  const { persona, loading } = usePersona();
  const hydrated = !loading;

  // Thread list + active selection live here (not in CoachChat or the rail)
  // so a click in ChatNavSideRail and CoachChat's own reads/writes always
  // agree on what "active" means — see coach-chat.tsx's Props doc comment.
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  // Gates <CoachChat>'s mount for a signed-in user until we know which
  // thread (if any) is the most recent — avoids a flash of the canned
  // greeting immediately replaced by a loaded transcript. Anonymous/no
  // persona has nothing to resolve, so it's "ready" immediately.
  const [threadsResolved, setThreadsResolved] = useState(false);

  const refreshThreads = useCallback(async () => {
    const list = await listThreads();
    setThreads(list);
    return list;
  }, []);

  const personaId = persona?.id ?? null;
  useEffect(() => {
    if (!personaId) {
      setThreads([]);
      setActiveThreadId(null);
      setThreadsResolved(true);
      return;
    }
    let cancelled = false;
    setThreadsResolved(false);
    (async () => {
      const list = await refreshThreads();
      if (cancelled) return;
      setActiveThreadId(list[0]?.id ?? null);
      setThreadsResolved(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [personaId, refreshThreads]);

  function handleSelectThread(id: string) {
    setActiveThreadId(id);
  }

  function handleNewThread() {
    setActiveThreadId(null);
  }

  function handleActiveThreadChange(id: string | null) {
    setActiveThreadId(id);
    // A real id means CoachChat just created or wrote to a thread — refresh
    // the sidebar's list/ordering. `id === null` is "שיחה חדשה"; nothing
    // changed server-side, so no need to refetch.
    if (id) void refreshThreads();
  }

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
          persona={persona}
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
          onNewThread={handleNewThread}
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
                שקל · השותף הדיגיטלי לדוח השנתי
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
              {/* Only for a signed-in user — /coach also serves an anonymous
                  chat (personaId null), where there's no session to sign out
                  of. Same gate the thread list above already uses. */}
              {personaId && (
                <div className="border-s border-line ps-2">
                  <SignOutButton />
                </div>
              )}
            </div>
          </div>

          {/* Chat — fills the rest of the column. Gated on threadsResolved
              (for a signed-in user) so it mounts already knowing the right
              thread instead of flashing the canned greeting first. Keyed by
              activeThreadId so a rail click / "שיחה חדשה" always arrives as
              a fresh mount — see coach-chat.tsx's Props doc comment for why
              that's the contract instead of reacting to prop changes. */}
          {hydrated && (!personaId || threadsResolved) && (
            <div className="min-h-[560px] flex-1">
              <CoachChat
                key={activeThreadId ?? "new"}
                persona={persona}
                activeThreadId={activeThreadId}
                onActiveThreadChange={handleActiveThreadChange}
              />
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
