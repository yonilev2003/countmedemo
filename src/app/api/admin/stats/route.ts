// GET /api/admin/stats — owner-only realtime stats (v2 plan item 3.4).
//
// GATING: /admin is deliberately NOT listed in PROTECTED_PREFIXES
// (src/lib/supabase/proxy.ts / middleware) — the page route itself is
// reachable by anyone who knows the URL, and this API route is not behind
// AUTH_GATING_ENABLED either (that flag governs the *public* app, and admin
// access must be enforced the same way whether or not AUTH_GATING_ENABLED is
// on). The email allowlist check below is the ONLY gate. A non-admin (or
// signed-out) caller gets 404, never 401/403 — we don't want to reveal that
// an admin surface exists at all.
//
// DEGRADE GRACEFULLY (same circuit-breaker spirit as src/lib/chat/history.ts
// and src/lib/ai/usage.ts): every metric below is computed independently and
// wrapped so a missing table, an unapplied migration, or a transient DB error
// turns that one metric into `null` — it never fails the whole response, and
// it never throws.

import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBudgetState, type BudgetState } from "@/lib/ai/usage";
import { isAuthGatingEnabled } from "@/lib/security/auth-gating";

export const dynamic = "force-dynamic";

// ── Admin allowlist ─────────────────────────────────────────────────────────

/** ADMIN_EMAILS is a comma-separated list; compared trim/lowercase. Empty or
 *  unset ⇒ nobody is an admin (fail closed), not "everyone is". */
function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

// ── Untyped-table escape hatch ──────────────────────────────────────────────
// Same pattern as src/lib/ai/usage.ts's usageAdminClient() and
// src/lib/agent/tools.ts's UntypedAdmin: ai_usage and knowledge_chunks aren't
// in database.types.ts yet (their migrations are authored but the Supabase
// MCP available to this session can't reach the live project to regenerate
// codegen). Swap call sites back to the typed client once that lands.
function untypedAdminClient(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

/** Postgrest/PostgREST error codes that mean "the schema isn't there (yet)" —
 *  same set used by src/lib/chat/history.ts and src/lib/ai/usage.ts. */
const MISSING_SCHEMA_CODES = new Set([
  "42P01", // undefined_table
  "42501", // insufficient_privilege (RLS/grants not applied yet)
  "PGRST205", // PostgREST: table not found in its schema cache
  "PGRST204", // PostgREST: column not found (partial/old schema)
]);

// ── Small date helpers (UTC day boundaries, matching usage.ts's convention) ─

function utcDayStartIso(daysAgo: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

function numEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// ── Per-metric readers — each independently try/caught, null on failure ────

type Health = boolean | null;

/** true = table reachable, false = confirmed missing (recognized Postgrest
 *  "no schema" error code), null = ambiguous/unavailable (network blip,
 *  missing credentials, unrecognized error) — never throws. */
async function probeTable(table: string): Promise<Health> {
  try {
    const { error } = await untypedAdminClient()
      .from(table)
      .select("*", { count: "exact", head: true });
    if (!error) return true;
    const code = (error as { code?: string } | null)?.code;
    return code && MISSING_SCHEMA_CODES.has(code) ? false : null;
  } catch {
    return null;
  }
}

async function countUsersTotal(): Promise<number | null> {
  try {
    const { count, error } = await createAdminClient()
      .from("profiles")
      .select("*", { count: "exact", head: true });
    if (error) return null;
    return count ?? null;
  } catch {
    return null;
  }
}

async function countChatThreadsTotal(): Promise<number | null> {
  try {
    const { count, error } = await createAdminClient()
      .from("chat_threads")
      .select("*", { count: "exact", head: true });
    if (error) return null;
    return count ?? null;
  } catch {
    return null;
  }
}

async function countEvents(
  gteIso: string,
  ltIso: string | null,
): Promise<number | null> {
  try {
    let query = createAdminClient()
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", gteIso);
    if (ltIso) query = query.lt("created_at", ltIso);
    const { count, error } = await query;
    if (error) return null;
    return count ?? null;
  } catch {
    return null;
  }
}

interface DayAiUsage {
  count: number | null;
  costUsd: number | null;
}

/** Same "select + sum client-side" approach as usage.ts's getTodaySpendUsd —
 *  this table's volume is bounded by the very caps that table enforces. */
async function aiUsageDay(gteIso: string, ltIso: string | null): Promise<DayAiUsage> {
  try {
    let query = untypedAdminClient()
      .from("ai_usage")
      .select("est_cost_usd")
      .gte("created_at", gteIso);
    if (ltIso) query = query.lt("created_at", ltIso);
    const { data, error } = await query;
    if (error) return { count: null, costUsd: null };
    const rows = (data ?? []) as Array<{ est_cost_usd: number | null }>;
    return {
      count: rows.length,
      costUsd: rows.reduce((sum, r) => sum + Number(r.est_cost_usd ?? 0), 0),
    };
  } catch {
    return { count: null, costUsd: null };
  }
}

async function safeBudgetState(): Promise<BudgetState | null> {
  try {
    return await getBudgetState();
  } catch {
    return null;
  }
}

// ── Response shape ──────────────────────────────────────────────────────────

export interface AdminStatsResponse {
  generatedAt: string;
  totals: {
    users: number | null;
    chatThreads: number | null;
    events: { today: number | null; yesterday: number | null };
    aiCalls: { today: number | null; yesterday: number | null };
    aiCostUsd: { today: number | null; yesterday: number | null };
  };
  budget: {
    state: BudgetState | null;
    degradeThresholdUsd: number;
    pauseThresholdUsd: number;
  };
  killSwitches: {
    aiPaused: boolean;
    aiForceHaiku: boolean;
    authGatingEnabled: boolean;
  };
  health: {
    rate_limit_buckets: Health;
    ai_usage: Health;
    knowledge_chunks: Health;
    chat_threads: Health;
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    // 404, not 401/403 — don't reveal that this route exists.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const todayStart = utcDayStartIso(0);
  const yesterdayStart = utcDayStartIso(1);

  const [
    users,
    chatThreadsTotal,
    eventsToday,
    eventsYesterday,
    aiToday,
    aiYesterday,
    budgetState,
    healthRateLimit,
    healthAiUsage,
    healthKnowledge,
    healthChatThreads,
  ] = await Promise.all([
    countUsersTotal(),
    countChatThreadsTotal(),
    countEvents(todayStart, null),
    countEvents(yesterdayStart, todayStart),
    aiUsageDay(todayStart, null),
    aiUsageDay(yesterdayStart, todayStart),
    safeBudgetState(),
    probeTable("rate_limit_buckets"),
    probeTable("ai_usage"),
    probeTable("knowledge_chunks"),
    probeTable("chat_threads"),
  ]);

  const body: AdminStatsResponse = {
    generatedAt: new Date().toISOString(),
    totals: {
      users,
      chatThreads: chatThreadsTotal,
      events: { today: eventsToday, yesterday: eventsYesterday },
      aiCalls: { today: aiToday.count, yesterday: aiYesterday.count },
      aiCostUsd: { today: aiToday.costUsd, yesterday: aiYesterday.costUsd },
    },
    budget: {
      state: budgetState,
      // Same defaults as src/lib/ai/usage.ts's readBudgetEnv() (not exported,
      // so mirrored here for display only — this route never enforces
      // anything, it only reports what usage.ts would compute).
      degradeThresholdUsd: numEnv("AI_DAILY_BUDGET_DEGRADE_USD", 5),
      pauseThresholdUsd: numEnv("AI_DAILY_BUDGET_PAUSE_USD", 15),
    },
    killSwitches: {
      aiPaused: process.env.AI_PAUSED === "true",
      aiForceHaiku: process.env.AI_FORCE_HAIKU === "true",
      authGatingEnabled: isAuthGatingEnabled(),
    },
    health: {
      rate_limit_buckets: healthRateLimit,
      ai_usage: healthAiUsage,
      knowledge_chunks: healthKnowledge,
      chat_threads: healthChatThreads,
    },
  };

  return NextResponse.json(body);
}
