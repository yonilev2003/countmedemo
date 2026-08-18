// The AI cost-guard core — aggregation, spend-based budget state, per-user
// daily caps, and threshold alerting. Backed by public.ai_usage
// (supabase/migrations/20260818220000_ai_usage.sql).
//
// Yoni's locked decision (2026-08-18, docs/plans/2026-08-18-master-task-list-v2.md
// phase 2): stay on free-tier infra (Vercel Hobby + Supabase Free) with HARD
// usage caps in code, immediate email alerts on threshold crossing, and
// automatic protective actions (degrade Sonnet→Haiku, then pause AI
// features) — every automatic action is always reported by email.
//
// Server-only: reads/writes go through the service-role admin client
// (src/lib/supabase/admin.ts, itself "server-only"), and this module is only
// ever imported from API routes / server code (src/lib/ai/models.ts →
// logAiUsage(), called from the 6 AI route handlers + regulatory/classify.ts).
//
// DEGRADE GRACEFULLY (same mandatory pattern as src/lib/chat/history.ts): the
// migration above is AUTHORED but not yet applied to the live project (hbsgz
// — Supabase MCP can't reach it from this session). Every exported function
// here must survive the table not existing yet, RLS/grants not being in
// place, or a transient DB error — by falling back to a safe default and
// NEVER throwing. `unavailable` below is the same one-shot circuit breaker as
// history.ts: once we learn (from a Postgrest error code) that the schema
// isn't reachable, every later call in this module short-circuits to its
// fail-open branch for the rest of the process's life instead of re-querying.
//
// Fire-and-forget philosophy: recordAiUsage() is designed to be called as
// `void recordAiUsage(...)` from the hot request path. It must never throw
// and must never slow that path down — the insert (and the alert check it
// kicks off) happens in the background; a lost usage row or a lost alert
// email is an acceptable failure mode, a slowed-down or broken chat response
// is not.

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimitDurable } from "@/lib/security/rate-limit";
import { sendAlertEmail } from "@/lib/alerts/email";

/**
 * src/lib/supabase/database.types.ts (generated codegen, not owned by this
 * change) hasn't been regenerated to include public.ai_usage — the migration
 * that creates it (20260818220000_ai_usage.sql) is AUTHORED but not yet
 * applied to the live project, so there's nothing to generate types FROM
 * yet. Once it lands and codegen runs, swap the two call sites below back to
 * a plain `createAdminClient()` and delete this cast. Until then, the
 * insert/select shapes in this file are the source of truth and are kept by
 * hand in sync with the migration's column list.
 */
function usageAdminClient(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

// ── Pricing ──────────────────────────────────────────────────────────────

/** USD per 1,000,000 tokens. Verified 2026-08-18 against the official
 *  Anthropic pricing table (console.anthropic.com/settings/billing /
 *  docs.anthropic.com/en/docs/about-claude/pricing) for the two models this
 *  app actually calls (src/lib/ai/models.ts: MODEL_SONNET / MODEL_HAIKU).
 *  cacheWrite/cacheRead follow Anthropic's standard multipliers (~1.25x and
 *  ~0.1x of the input rate) — re-verify alongside any model-string change in
 *  models.ts, since a mismatch there silently mis-prices every future row. */
export const PRICING: Record<
  string,
  { input: number; output: number; cacheWrite: number; cacheRead: number }
> = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0, cacheWrite: 3.75, cacheRead: 0.3 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0, cacheWrite: 1.25, cacheRead: 0.1 },
};

// Must match MODEL_SONNET in ./models.ts. Duplicated as a literal (not
// imported) to avoid a circular import — models.ts imports THIS file
// (logAiUsage → recordAiUsage), so this file cannot import back from
// models.ts.
const SONNET_MODEL_ID = "claude-sonnet-4-6";

export interface UsageTokens {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

/**
 * Pure function — no I/O. Estimates USD cost for one Anthropic response's
 * usage block. An unknown/future model string falls back to the Sonnet rates
 * (the more expensive of the two tiers we use) so an un-priced model is
 * over-estimated, never under-estimated — a cost guard should never
 * silently undercount spend.
 */
export function estimateCostUsd(log: UsageTokens): number {
  const rates = PRICING[log.model] ?? PRICING[SONNET_MODEL_ID];
  return (
    (log.input_tokens / 1_000_000) * rates.input +
    (log.output_tokens / 1_000_000) * rates.output +
    (log.cache_creation_input_tokens / 1_000_000) * rates.cacheWrite +
    (log.cache_read_input_tokens / 1_000_000) * rates.cacheRead
  );
}

// ── Circuit breaker (same pattern as src/lib/chat/history.ts) ─────────────

/** Once true, every DB-touching function below short-circuits to its
 *  fail-open branch for the rest of this process's life. Only a cold start
 *  resets it — intentional: a missing table isn't going to appear mid-life. */
let unavailable = false;

/** Postgrest/PostgREST error codes that mean "the schema isn't there (yet)",
 *  as opposed to a transient network/server error worth retrying next time. */
const MISSING_SCHEMA_CODES = new Set([
  "42P01", // undefined_table
  "42501", // insufficient_privilege (RLS/grants not applied yet)
  "PGRST205", // PostgREST: table not found in its schema cache
  "PGRST204", // PostgREST: column not found (partial/old schema)
]);

function noteIfSchemaMissing(error: { code?: string } | null | undefined): void {
  if (error?.code && MISSING_SCHEMA_CODES.has(error.code)) {
    unavailable = true;
  }
}

// ── Recording ────────────────────────────────────────────────────────────

export interface RecordAiUsageInput {
  route: string;
  model: string;
  rounds?: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  userId?: string | null;
}

/**
 * Fire-and-forget insert of one usage row, then a fire-and-forget threshold
 * check. Designed to be called as `void recordAiUsage(entry)` — it is async
 * only so callers CAN await it if they ever need to (tests), never because
 * they should on the request path. Never throws.
 */
export async function recordAiUsage(log: RecordAiUsageInput): Promise<void> {
  if (!unavailable) {
    try {
      const admin = usageAdminClient();
      const { error } = await admin.from("ai_usage").insert({
        user_id: log.userId ?? null,
        route: log.route,
        model: log.model,
        rounds: log.rounds ?? null,
        input_tokens: log.input_tokens,
        output_tokens: log.output_tokens,
        cache_creation_input_tokens: log.cache_creation_input_tokens,
        cache_read_input_tokens: log.cache_read_input_tokens,
        est_cost_usd: estimateCostUsd(log),
      });
      noteIfSchemaMissing(error);
      if (error) {
        console.error("[ai-usage] insert failed", error.code ?? error.message);
      } else {
        // A fresh row changes today's spend — invalidate the 60s budget
        // cache so the very next getBudgetState() call re-reads instead of
        // serving a stale (possibly pre-threshold) number for up to a
        // minute after a threshold-crossing call.
        budgetCache = null;
      }
    } catch (err) {
      console.error("[ai-usage] insert threw", err);
    }
  }

  // Threshold check runs regardless of whether the insert above succeeded —
  // getBudgetState() re-reads from the DB (or fails open) on its own.
  void maybeAlertThresholds();
}

// ── Budget state ─────────────────────────────────────────────────────────

export type BudgetState = "normal" | "degraded" | "paused";

export interface BudgetEnv {
  degradeThresholdUsd: number;
  pauseThresholdUsd: number;
  /** AI_FORCE_HAIKU=true — manual kill-switch, forces at least "degraded". */
  forceHaiku: boolean;
  /** AI_PAUSED=true — manual kill-switch, forces "paused" outright. */
  paused: boolean;
}

function numEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function readBudgetEnv(): BudgetEnv {
  return {
    degradeThresholdUsd: numEnv("AI_DAILY_BUDGET_DEGRADE_USD", 5),
    pauseThresholdUsd: numEnv("AI_DAILY_BUDGET_PAUSE_USD", 15),
    forceHaiku: process.env.AI_FORCE_HAIKU === "true",
    paused: process.env.AI_PAUSED === "true",
  };
}

/**
 * Pure function — no I/O, no env reads (env is parsed by the caller into
 * BudgetEnv). Extracted so the threshold math is unit-testable without a DB.
 * Kill-switch overrides apply on top of the spend-based classification:
 * AI_PAUSED always wins outright; AI_FORCE_HAIKU floors the result at
 * "degraded" but never DOWNGRADES an already-"paused" spend-based result.
 */
export function classifyBudget(spendUsd: number, env: BudgetEnv): BudgetState {
  if (env.paused) return "paused";

  let state: BudgetState = "normal";
  if (spendUsd >= env.pauseThresholdUsd) state = "paused";
  else if (spendUsd >= env.degradeThresholdUsd) state = "degraded";

  if (env.forceHaiku && state === "normal") state = "degraded";
  return state;
}

interface BudgetCache {
  spendUsd: number;
  day: string; // UTC "YYYY-MM-DD" the spend was summed for
  computedAt: number; // Date.now() of the read
}

const BUDGET_CACHE_TTL_MS = 60_000;
let budgetCache: BudgetCache | null = null;

function utcDateKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function utcDayStartIso(d: Date = new Date()): string {
  const start = new Date(d);
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString();
}

/** Today's (UTC) global est_cost_usd sum, cached in module memory for 60s so
 *  concurrent/rapid calls (every AI request, potentially) don't each pay a DB
 *  round-trip. Fails open to 0 (⇒ "normal") on any DB error, per this
 *  module's circuit-breaker convention. Not exported — getBudgetState() and
 *  maybeAlertThresholds() are the two callers. */
async function getTodaySpendUsd(): Promise<number> {
  const today = utcDateKey();

  if (
    budgetCache &&
    budgetCache.day === today &&
    Date.now() - budgetCache.computedAt < BUDGET_CACHE_TTL_MS
  ) {
    return budgetCache.spendUsd;
  }

  if (unavailable) {
    budgetCache = { spendUsd: 0, day: today, computedAt: Date.now() };
    return 0;
  }

  try {
    const admin = usageAdminClient();
    // One select, summed client-side (fail-open-friendly, and this table's
    // volume is bounded by the very caps this module enforces — a DB-side
    // aggregate is the natural upgrade if that ever stops being true).
    const { data, error } = await admin
      .from("ai_usage")
      .select("est_cost_usd")
      .gte("created_at", utcDayStartIso());
    if (error) {
      noteIfSchemaMissing(error);
      budgetCache = { spendUsd: 0, day: today, computedAt: Date.now() };
      return 0;
    }
    const spendUsd = (data ?? []).reduce(
      (sum, row) => sum + Number(row.est_cost_usd ?? 0),
      0,
    );
    budgetCache = { spendUsd, day: today, computedAt: Date.now() };
    return spendUsd;
  } catch (err) {
    console.error("[ai-usage] budget read threw", err);
    budgetCache = { spendUsd: 0, day: today, computedAt: Date.now() };
    return 0;
  }
}

/**
 * Current global budget state for today (UTC). Never throws — any DB error
 * fails open to "normal" (consistent with src/lib/security/rate-limit.ts's
 * checkRateLimitDurable philosophy: an outage degrades to "no protection",
 * not to "everyone blocked"), while remembering DB unavailability via the
 * module's circuit breaker so it doesn't keep re-querying a missing table.
 * The manual kill-switches (AI_PAUSED / AI_FORCE_HAIKU) still apply even
 * when spend can't be read, since classifyBudget(0, env) still honors them.
 */
export async function getBudgetState(): Promise<BudgetState> {
  const spendUsd = await getTodaySpendUsd();
  return classifyBudget(spendUsd, readBudgetEnv());
}

// ── Threshold alerting ──────────────────────────────────────────────────

/** Per-state "have we alerted for this yet today" memory — the fallback gate
 *  when the durable cross-instance check can't be trusted, AND the signal
 *  used to detect a *transition* (only alert on degraded/paused states we
 *  haven't already seen today from this instance). Reset implicitly by the
 *  day-key check in maybeAlertThresholds(). */
let lastAlertedState: { day: string; state: BudgetState | null } = {
  day: "",
  state: null,
};

/** Once-per-instance-per-day fallback keys, used only if the durable RPC
 *  itself throws (it normally fails open internally and never throws — this
 *  is a second line of defense per the task brief). */
const instanceAlertedKeys = new Set<string>();

function budgetActionHe(state: "degraded" | "paused"): string {
  return state === "paused"
    ? "השבתה זמנית של תכונות ה-AI (צ'אט, ייעוץ, העלאת מסמכים)"
    : "מעבר אוטומטי מ-Sonnet ל-Haiku בשיחות ה-AI";
}

function buildThresholdAlertEmail(
  state: "degraded" | "paused",
  spendUsd: number,
  env: BudgetEnv,
): { subject: string; html: string } {
  const thresholdUsd =
    state === "paused" ? env.pauseThresholdUsd : env.degradeThresholdUsd;
  const spendStr = `$${spendUsd.toFixed(2)}`;
  const thresholdStr = `$${thresholdUsd.toFixed(2)}`;
  const subject =
    state === "paused"
      ? "countme: תקציב AI היומי חצה את התקרה — AI הושבת זמנית"
      : "countme: תקציב AI היומי חצה סף התרעה — מעבר אוטומטי ל-Haiku";
  const html = `
    <div style="font-family:sans-serif;direction:rtl;text-align:right">
      <p>ההוצאה המשוערת של countme ל-AI היום (UTC) הגיעה ל-${spendStr},
      שחוצה את סף ${state === "paused" ? "ההשבתה" : "ההתרעה"} (${thresholdStr}).</p>
      <p><strong>פעולה אוטומטית שבוצעה:</strong> ${budgetActionHe(state)}.</p>
      <p style="color:#666;font-size:13px">נשלח אוטומטית ממערכת מגן-העלויות של countme
      (src/lib/ai/usage.ts). לפרטים והגדרת הספים: AI_DAILY_BUDGET_DEGRADE_USD /
      AI_DAILY_BUDGET_PAUSE_USD ב-.env.</p>
    </div>
  `.trim();
  return { subject, html };
}

/**
 * Checks the current budget state and — only on a transition into
 * "degraded"/"paused" (or the first time this instance observes that state
 * today) — sends exactly one alert email. Safe to call after every single AI
 * usage record (as recordAiUsage() does): cheap (reuses the 60s spend cache),
 * and dedup keeps it to at most one email per state per day across every
 * warm serverless instance. Never throws.
 */
export async function maybeAlertThresholds(): Promise<void> {
  try {
    const env = readBudgetEnv();
    // Same computation as getBudgetState() (spend + classify), inlined
    // rather than calling it, so this only pays for ONE spend read instead
    // of two racing to (re)populate the cache.
    const spendUsd = await getTodaySpendUsd();
    const state = classifyBudget(spendUsd, env);
    const today = utcDateKey();

    if (lastAlertedState.day !== today) {
      lastAlertedState = { day: today, state: null };
    }

    if (state === "normal") {
      // Recovered (or never crossed) — clear so a later re-crossing today
      // alerts again instead of staying silenced by a stale flag.
      if (lastAlertedState.state !== null) {
        lastAlertedState = { day: today, state: null };
      }
      return;
    }

    if (lastAlertedState.state === state) return; // already handled today
    lastAlertedState = { day: today, state };

    const namespace = state === "paused" ? "alert-budget-paused" : "alert-budget-degraded";
    const instanceKey = `${namespace}:${today}`;

    if (instanceAlertedKeys.has(instanceKey)) return; // this instance already tried
    instanceAlertedKeys.add(instanceKey);

    let allowed = true;
    try {
      const result = await checkRateLimitDurable(namespace, "global", 1, 86_400);
      allowed = result.allowed;
    } catch {
      // Durable dedup itself failed outright (it normally fails open and
      // never throws) — fall back to the once-per-instance gate above,
      // already applied, and proceed to send.
      allowed = true;
    }
    if (!allowed) return; // another instance already sent today's alert

    const { subject, html } = buildThresholdAlertEmail(state, spendUsd, env);
    await sendAlertEmail({ subject, html });
  } catch (err) {
    console.error("[ai-usage] threshold alert check threw", err);
  }
}

// ── Per-user daily caps ─────────────────────────────────────────────────

/**
 * Per-user daily request cap for a given route. Route names match what the
 * 6 call sites pass as `route` to logAiUsage() — "upload"/"parse-expense"/
 * "parse-invoice" share one cap (all three are document-ingestion routes).
 * Pure function of env — no DB.
 */
export function dailyUserCap(route: string): number {
  switch (route) {
    case "chat":
      return numEnv("AI_USER_DAILY_CHAT_CAP", 30);
    case "coach":
      return numEnv("AI_USER_DAILY_COACH_CAP", 30);
    case "upload":
    case "parse-expense":
    case "parse-invoice":
      return numEnv("AI_USER_DAILY_UPLOAD_CAP", 20);
    default:
      // Unknown/future route — fall back to the conversational cap rather
      // than an unlimited default.
      return numEnv("AI_USER_DAILY_CHAT_CAP", 30);
  }
}
