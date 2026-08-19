"use client";

/**
 * /admin — minimal owner-only realtime stats page (v2 plan item 3.4).
 *
 * GATING NOTE: this route is deliberately NOT listed in PROTECTED_PREFIXES
 * (src/lib/supabase/proxy.ts / middleware) — anyone can load this page's
 * shell. The real gate is server-side, in /api/admin/stats: it checks the
 * signed-in user's email against ADMIN_EMAILS and returns 404 (not 401/403)
 * to anyone else, so an unauthorized visitor never even learns this route
 * does something. This page mirrors that: until the API answers with real
 * data, nothing admin-shaped is rendered — a 404 (or any non-2xx) renders the
 * site's standard not-found look, identical to app/not-found.tsx, with no
 * "admin" chrome anywhere in that branch.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { StatusBadge, type Status } from "@/components/brand/status";
import {
  CheckCircleIcon,
  XIcon,
  AlertTriangleIcon,
} from "@/components/brand/icons";
import type { AdminStatsResponse } from "@/app/api/admin/stats/route";

type LoadState =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "error" }
  | { kind: "ready"; data: AdminStatsResponse };

export default function AdminStatsPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (res.status === 404) {
        setState({ kind: "not-found" });
        return;
      }
      if (!res.ok) {
        setState({ kind: "error" });
        return;
      }
      const data = (await res.json()) as AdminStatsResponse;
      setState({ kind: "ready", data });
    } catch {
      setState({ kind: "error" });
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === "not-found") return <NotFoundLike />;
  if (state.kind === "error") return <ErrorLike onRetry={() => void load()} />;
  if (state.kind === "loading") return <LoadingShell />;

  const { data } = state;

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size={26} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-semibold text-muted sm:inline">
              סטטיסטיקות מערכת
            </span>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className={btn("secondary", "sm")}
            >
              {refreshing ? "מרענן…" : "רענון"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-md px-4 pb-16 pt-6 sm:px-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-navy">
          לוח בקרה
        </h1>
        <p className="mt-1 text-xs text-faint">
          עודכן: {new Date(data.generatedAt).toLocaleString("he-IL")}
        </p>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold text-brand-navy">נתונים כלליים</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="משתמשים" value={fmtNum(data.totals.users)} />
            <StatCard label="שיחות צ׳אט" value={fmtNum(data.totals.chatThreads)} />
            <StatCard
              label="אירועים היום"
              value={fmtNum(data.totals.events.today)}
              sub={`אתמול: ${fmtNum(data.totals.events.yesterday)}`}
            />
            <StatCard
              label="קריאות AI היום"
              value={fmtNum(data.totals.aiCalls.today)}
              sub={`אתמול: ${fmtNum(data.totals.aiCalls.yesterday)}`}
            />
            <StatCard
              label="עלות AI היום"
              value={fmtUsd(data.totals.aiCostUsd.today)}
              sub={`אתמול: ${fmtUsd(data.totals.aiCostUsd.yesterday)}`}
            />
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold text-brand-navy">תקציב AI יומי</h2>
          <div className="rounded-2xl border border-line bg-paper p-4 shadow-brand">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge status={budgetStatus(data.budget.state)}>
                {budgetLabel(data.budget.state)}
              </StatusBadge>
              <span className="text-xs text-muted" dir="ltr">
                degrade ${data.budget.degradeThresholdUsd} · pause $
                {data.budget.pauseThresholdUsd}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold text-brand-navy">מתגי חירום (env)</h2>
          <div className="space-y-2">
            <KillSwitchRow
              envVar="AI_PAUSED"
              status={data.killSwitches.aiPaused ? "overdue" : "on-track"}
              label={data.killSwitches.aiPaused ? "AI מושבת כרגע" : "פעיל כרגיל"}
            />
            <KillSwitchRow
              envVar="AI_FORCE_HAIKU"
              status={data.killSwitches.aiForceHaiku ? "due" : "on-track"}
              label={data.killSwitches.aiForceHaiku ? "מאולץ ל-Haiku" : "רגיל (Sonnet)"}
            />
            <KillSwitchRow
              envVar="AUTH_GATING_ENABLED"
              status={data.killSwitches.authGatingEnabled ? "on-track" : "overdue"}
              label={data.killSwitches.authGatingEnabled ? "פעיל" : "כבוי"}
            />
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold text-brand-navy">בריאות סכמה</h2>
          <div className="space-y-2">
            <HealthRow table="rate_limit_buckets" status={data.health.rate_limit_buckets} />
            <HealthRow table="ai_usage" status={data.health.ai_usage} />
            <HealthRow table="knowledge_chunks" status={data.health.knowledge_chunks} />
            <HealthRow table="chat_threads" status={data.health.chat_threads} />
          </div>
        </section>
      </main>
    </div>
  );
}

// ── Presentational bits ─────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-4 shadow-brand">
      <div className="text-xs font-semibold text-muted">{label}</div>
      <div
        className="mt-1.5 font-display text-xl font-extrabold tabular-nums text-brand-navy"
        dir="ltr"
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-faint">{sub}</div>}
    </div>
  );
}

function KillSwitchRow({
  envVar,
  status,
  label,
}: {
  envVar: string;
  status: Status;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-paper px-4 py-3 shadow-brand">
      <span className="font-mono text-xs text-muted" dir="ltr">
        {envVar}
      </span>
      <StatusBadge status={status}>{label}</StatusBadge>
    </div>
  );
}

/** Tri-state health row: true → reachable, false → confirmed missing,
 *  null → unknown (ambiguous DB error / no credentials in this env). */
function HealthRow({ table, status }: { table: string; status: boolean | null }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-paper px-4 py-3 shadow-brand">
      <span className="font-mono text-xs text-muted" dir="ltr">
        {table}
      </span>
      {status === true && (
        <span className="flex items-center gap-1.5 text-xs font-bold text-success">
          <CheckCircleIcon className="size-4" /> קיים ותקין
        </span>
      )}
      {status === false && (
        <span className="flex items-center gap-1.5 text-xs font-bold text-alert-ink">
          <XIcon className="size-4" /> חסר / לא מיושם
        </span>
      )}
      {status === null && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <AlertTriangleIcon className="size-4" /> לא ידוע
        </span>
      )}
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <div className="w-full max-w-md space-y-3 px-6 animate-pulse">
        <div className="h-8 w-40 rounded-lg bg-sand" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-sand" />
          ))}
        </div>
        <div className="h-16 rounded-2xl bg-sand" />
      </div>
    </div>
  );
}

/** Same generic Hebrew retry card regardless of cause — never hints at what
 *  went wrong (auth vs. network vs. server), so it can't leak anything to an
 *  unauthorized visitor who happens to trigger a non-404 failure. */
function ErrorLike({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-7 text-center shadow-brand">
        <p className="mb-2 text-lg font-bold text-brand-navy">משהו השתבש</p>
        <p className="mb-6 text-sm leading-relaxed text-muted">
          לא הצלחנו לטעון את הנתונים. נסו שוב בעוד רגע.
        </p>
        <button type="button" onClick={onRetry} className={btn("primary", "sm")}>
          נסה/י שוב
        </button>
      </div>
    </div>
  );
}

/** Deliberately identical in structure/copy to app/not-found.tsx — this is
 *  what every unauthorized visitor to /admin actually sees, so it must be
 *  indistinguishable from a real 404. */
function NotFoundLike() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-7 text-center shadow-brand">
        <div className="mx-auto mb-5 flex justify-center">
          <Logo size={28} />
        </div>
        <p className="font-display text-5xl font-extrabold tracking-tight text-brand-navy">
          404
        </p>
        <h1 className="mb-2 mt-3 text-lg font-bold text-brand-navy">העמוד לא נמצא</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted">
          הכתובת שהגעתם אליה לא קיימת, או שהעמוד עבר למקום אחר. הנתונים שלכם
          במקום — אפשר לחזור לדף הבית ולהמשיך משם.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className={btn("primary", "sm")}>
            לדף הבית
          </Link>
          <Link href="/dashboard" className={btn("secondary", "sm")}>
            לאזור האישי
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Formatting helpers ──────────────────────────────────────────────────────

function fmtNum(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("he-IL");
}

function fmtUsd(n: number | null): string {
  return n === null ? "—" : `$${n.toFixed(2)}`;
}

function budgetStatus(state: AdminStatsResponse["budget"]["state"]): Status {
  switch (state) {
    case "normal":
      return "on-track";
    case "degraded":
      return "due";
    case "paused":
      return "overdue";
    default:
      return "plan"; // null — couldn't determine, most neutral of the four
  }
}

function budgetLabel(state: AdminStatsResponse["budget"]["state"]): string {
  switch (state) {
    case "normal":
      return "תקין";
    case "degraded":
      return "מעבר ל-Haiku (חצה סף התרעה)";
    case "paused":
      return "AI מושבת (חצה סף השבתה)";
    default:
      return "לא זמין";
  }
}
