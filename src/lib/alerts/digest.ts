// Daily operational digest — v2 plan §3.2 ("דייג'סט יומי") + §3.5 (events
// retention). Built for src/app/api/cron/daily-digest/route.ts, which runs
// on Vercel Cron (Hobby tier: daily schedules only, best-effort timing —
// see vercel.json). Sends a compact RTL Hebrew HTML email via
// sendAlertEmail (src/lib/alerts/email.ts) to Yoni.
//
// GOAL (Yoni's locked decision, 2026-08-18): "תתריע לי על כמויות" — daily
// visibility into growth (signups/events/AI usage/chat) AND infra health
// (are the tables this app silently fails open on actually there yet),
// without anyone needing to remember to check.
//
// DEGRADE GRACEFULLY — same mandatory pattern as src/lib/chat/history.ts and
// src/lib/ai/usage.ts: several of the tables this digest reads (ai_usage,
// knowledge_chunks, chat_threads) are AUTHORED migrations not yet confirmed
// applied to the live project (hbsgz — see each migration's own header
// comment). Every metric below is gathered independently and individually
// try/caught so ONE missing table never kills the whole digest — a failed
// metric is labeled "לא זמין" in the email instead of blanking the send.
// This is also, deliberately, half the POINT of this module: the HEALTH
// CHECKS section turns "silently fails open" into "shows up in your inbox
// every morning until it's fixed".
//
// DATE WINDOW — "yesterday" here means the previous UTC calendar day, for
// consistency with every other date-bucketing convention already in this
// codebase (src/lib/ai/usage.ts's utcDateKey/utcDayStartIso — there is no
// Israel-timezone-aware date utility anywhere in the repo, and this is an
// internal ops email, not a user-facing figure). The cron fires at 04:00 UTC
// (07:00 Israel, IDT) — well clear of the UTC day boundary — so "yesterday"
// reads as "essentially yesterday, Israel time" with an acceptable few-hour
// skew at the edges. Documented here rather than solved: a real Israel-TZ
// day boundary would need a TZ-aware date library this repo doesn't have.

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Untyped table access for migrations authored-but-not-yet-codegen'd ────
// Same rationale + pattern as src/lib/ai/usage.ts's usageAdminClient() and
// src/lib/analytics/track.ts's eventsTable: database.types.ts hasn't been
// regenerated for ai_usage / knowledge_chunks yet, so we read them through a
// deliberately untyped client view rather than block this on codegen.
function untypedAdmin(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

// ── Small metric-result plumbing ───────────────────────────────────────────

interface Metric<T> {
  ok: boolean;
  data: T | null;
}

/** Runs one metric gatherer; never throws. A failure yields { ok:false }
 *  which every renderer below turns into the Hebrew "לא זמין" label — this
 *  is the "one bad table never kills the digest" guarantee from the brief. */
async function safe<T>(label: string, fn: () => Promise<T>): Promise<Metric<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    console.error(`[daily-digest] metric "${label}" failed`, err);
    return { ok: false, data: null };
  }
}

// ── Date window helpers (UTC day boundaries — see module header) ─────────

function utcDayStart(daysAgo: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

/** [start, end) ISO range for "yesterday" in UTC. */
function yesterdayRangeIso(): { startIso: string; endIso: string } {
  const start = utcDayStart(1);
  const end = utcDayStart(0);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

// ── 1. Signups + total users ───────────────────────────────────────────────

interface SignupsMetric {
  newYesterday: number;
  totalUsers: number;
}

async function gatherSignups(): Promise<SignupsMetric> {
  const admin = createAdminClient();
  const { startIso, endIso } = yesterdayRangeIso();

  const [{ count: totalUsers, error: totalErr }, { count: newYesterday, error: newErr }] =
    await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startIso)
        .lt("created_at", endIso),
    ]);

  if (totalErr) throw totalErr;
  if (newErr) throw newErr;
  return { newYesterday: newYesterday ?? 0, totalUsers: totalUsers ?? 0 };
}

// ── 2. Events yesterday by name (top 10) + total events ───────────────────

interface EventsMetric {
  totalAllTime: number;
  yesterdayTotal: number;
  topNames: Array<{ name: string; count: number }>;
}

/** Safety cap on rows pulled client-side for the per-name breakdown — this
 *  table's daily volume is bounded by the same beta scale getTodaySpendUsd()
 *  in ai/usage.ts already assumes for ai_usage (see that file's comment). */
const EVENTS_SAMPLE_LIMIT = 20_000;

async function gatherEvents(): Promise<EventsMetric> {
  const admin = createAdminClient();
  const { startIso, endIso } = yesterdayRangeIso();

  const [{ count: totalAllTime, error: totalErr }, { data: rows, error: rowsErr }] =
    await Promise.all([
      admin.from("events").select("*", { count: "exact", head: true }),
      admin
        .from("events")
        .select("name")
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .limit(EVENTS_SAMPLE_LIMIT),
    ]);

  if (totalErr) throw totalErr;
  if (rowsErr) throw rowsErr;

  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    const name = (row as { name: string }).name;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const topNames = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalAllTime: totalAllTime ?? 0,
    yesterdayTotal: rows?.length ?? 0,
    topNames,
  };
}

// ── 3. AI usage yesterday by route ─────────────────────────────────────────

interface AiUsageRouteBreakdown {
  route: string;
  calls: number;
  tokens: number;
  costUsd: number;
}

interface AiUsageMetric {
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
  byRoute: AiUsageRouteBreakdown[];
}

async function gatherAiUsage(): Promise<AiUsageMetric> {
  const admin = untypedAdmin();
  const { startIso, endIso } = yesterdayRangeIso();

  const { data, error } = await admin
    .from("ai_usage")
    .select(
      "route, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, est_cost_usd",
    )
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  if (error) throw error;

  interface Row {
    route: string;
    input_tokens: number | null;
    output_tokens: number | null;
    cache_creation_input_tokens: number | null;
    cache_read_input_tokens: number | null;
    est_cost_usd: number | string | null;
  }

  const byRouteMap = new Map<string, AiUsageRouteBreakdown>();
  let totalCalls = 0;
  let totalTokens = 0;
  let totalCostUsd = 0;

  for (const raw of (data ?? []) as Row[]) {
    const tokens =
      Number(raw.input_tokens ?? 0) +
      Number(raw.output_tokens ?? 0) +
      Number(raw.cache_creation_input_tokens ?? 0) +
      Number(raw.cache_read_input_tokens ?? 0);
    const cost = Number(raw.est_cost_usd ?? 0);

    totalCalls += 1;
    totalTokens += tokens;
    totalCostUsd += cost;

    const existing = byRouteMap.get(raw.route);
    if (existing) {
      existing.calls += 1;
      existing.tokens += tokens;
      existing.costUsd += cost;
    } else {
      byRouteMap.set(raw.route, { route: raw.route, calls: 1, tokens, costUsd: cost });
    }
  }

  const byRoute = [...byRouteMap.values()].sort((a, b) => b.costUsd - a.costUsd);
  return { totalCalls, totalTokens, totalCostUsd, byRoute };
}

// ── 4. Chat threads created yesterday ──────────────────────────────────────

async function gatherChatThreadsYesterday(): Promise<number> {
  const admin = createAdminClient();
  const { startIso, endIso } = yesterdayRangeIso();
  const { count, error } = await admin
    .from("chat_threads")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startIso)
    .lt("created_at", endIso);
  if (error) throw error;
  return count ?? 0;
}

// ── 5. Health checks ───────────────────────────────────────────────────────

export interface HealthCheckResult {
  key: string;
  labelHe: string;
  healthy: boolean;
  /** Shown only when healthy=false — what the gap actually means in practice. */
  meaningHe: string;
}

/** Cheap existence probe: a 1-row select against the table. Any error
 *  (missing table, missing grants, or a genuine transient failure) is
 *  treated as "not confirmed healthy" — for a daily ops check that's the
 *  right conservative default: "I couldn't confirm it's there" reads the
 *  same as "❌" either way, and is worth surfacing either way. */
async function probeTableExists(table: string): Promise<boolean> {
  const admin = untypedAdmin();
  const { error } = await admin.from(table).select("id").limit(1);
  return !error;
}

/** Probes the durable rate limiter's actual code path (checkRateLimitDurable
 *  in src/lib/security/rate-limit.ts calls this exact RPC) rather than just
 *  the table, since the RPC — not the bare table — is what the app calls.
 *  p_max is astronomically high so this can never itself trip a real limit
 *  for the "daily-digest-health" namespace. */
async function probeDurableRateLimit(): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("check_rate_limit", {
    p_bucket_key: "daily-digest-health:probe",
    p_max: 1_000_000_000,
    p_window_seconds: 60,
  });
  return !error;
}

async function gatherHealthChecks(): Promise<HealthCheckResult[]> {
  const [rateLimitOk, aiUsageOk, knowledgeOk, chatThreadsOk] = await Promise.all([
    probeDurableRateLimit().catch(() => false),
    probeTableExists("ai_usage").catch(() => false),
    probeTableExists("knowledge_chunks").catch(() => false),
    probeTableExists("chat_threads").catch(() => false),
  ]);

  return [
    {
      key: "rate_limit",
      labelHe: "Rate-limit עמיד (rate_limit_buckets / check_rate_limit)",
      healthy: rateLimitOk,
      meaningHe:
        "rate-limit עמיד לא פעיל — ההגנה בפועל היא רק פר-instance (src/lib/security/rate-limit.ts, checkRateLimit), ומתאפסת בכל cold start. תחת עומס אמיתי זה לא באמת עוצר הצפה.",
    },
    {
      key: "ai_usage",
      labelHe: "טבלת ai_usage (מגן העלויות של ה-AI)",
      healthy: aiUsageOk,
      meaningHe:
        "טבלת ai_usage לא זמינה — מגן העלויות (src/lib/ai/usage.ts) נכשל-פתוח: לא נאכפים תקציב יומי, לא Sonnet→Haiku אוטומטי, ולא השבתה אוטומטית. שום קריאת AI לא נחסמת בפועל עד שהטבלה תוקם.",
    },
    {
      key: "knowledge_chunks",
      labelHe: "טבלת knowledge_chunks (RAG לצ'אט)",
      healthy: knowledgeOk,
      meaningHe:
        "טבלת knowledge_chunks לא זמינה — הצ'אט לא יכול לחפש/לצטט מתוך knowledge/*.md, ותשובות ה-AI חוזרות לידע הכללי של המודל בלבד.",
    },
    {
      key: "chat_threads",
      labelHe: "טבלת chat_threads (היסטוריית שיחות)",
      healthy: chatThreadsOk,
      meaningHe:
        "טבלת chat_threads לא זמינה — היסטוריית שיחות לא נשמרת בכלל; משתמשים מאבדים את השיחה שלהם ברענון (src/lib/chat/history.ts נופל חזרה למצב זיכרון-בלבד).",
    },
  ];
}

// ── 6. Retention (events > 90 days) ─────────────────────────────────────────

export interface RetentionResult {
  ok: boolean;
  deleted: number;
  errorMessage?: string;
}

const EVENTS_RETENTION_DAYS = 90;

/**
 * Deletes public.events rows older than the retention window. Called from
 * the cron route (not from buildDailyDigest itself) so the deleted count can
 * be threaded INTO the digest as a section — see route.ts. Never throws;
 * failures are reported in the returned result and the digest still sends.
 *
 * SCOPE NOTE: the v2 plan's §3.5 also mentions purging receipts beyond their
 * retention window (supabase/migrations/20260812130000_receipts_storage.sql
 * notes nothing is ever deleted there today) — out of scope for this pass
 * per the task brief, which only asked for the events purge. Flagged as a
 * follow-up.
 */
export async function purgeOldEvents(): Promise<RetentionResult> {
  try {
    const admin = createAdminClient();
    const cutoffIso = new Date(
      Date.now() - EVENTS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { error, count } = await admin
      .from("events")
      .delete({ count: "exact" })
      .lt("created_at", cutoffIso);
    if (error) {
      console.error("[daily-digest] events retention purge failed", error);
      return { ok: false, deleted: 0, errorMessage: error.message };
    }
    return { ok: true, deleted: count ?? 0 };
  } catch (err) {
    console.error("[daily-digest] events retention purge threw", err);
    return {
      ok: false,
      deleted: 0,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Rendering ────────────────────────────────────────────────────────────

const UNAVAILABLE_HE = "לא זמין";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtInt(n: number): string {
  return n.toLocaleString("he-IL");
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function section(titleHe: string, bodyHtml: string): string {
  return `
    <tr><td style="padding:20px 0 8px 0">
      <h2 style="margin:0 0 8px 0;font-size:16px;color:#083A4F;font-family:sans-serif">${esc(titleHe)}</h2>
      ${bodyHtml}
    </td></tr>`;
}

function metricRow(labelHe: string, valueHtml: string): string {
  return `<div style="padding:2px 0;font-family:sans-serif;font-size:14px;color:#333">
    <span style="color:#666">${esc(labelHe)}:</span> <strong>${valueHtml}</strong>
  </div>`;
}

function unavailableRow(labelHe: string): string {
  return metricRow(labelHe, `<span style="color:#A88A3F">${UNAVAILABLE_HE}</span>`);
}

export interface DailyDigest {
  html: string;
  plain: string;
}

/**
 * Gathers every digest metric (each independently try/caught — see module
 * header) and renders the compact RTL Hebrew email body. `retention` is
 * optional so this stays testable/callable without first running the purge;
 * the cron route passes the real result through so it appears in the email.
 */
export async function buildDailyDigest(opts: {
  retention?: RetentionResult;
} = {}): Promise<DailyDigest> {
  const [signups, events, aiUsage, chatThreadsYesterday, health] = await Promise.all([
    safe("signups", gatherSignups),
    safe("events", gatherEvents),
    safe("ai_usage", gatherAiUsage),
    safe("chat_threads_yesterday", gatherChatThreadsYesterday),
    safe("health_checks", gatherHealthChecks),
  ]);

  const dateLabel = utcDayStart(1).toISOString().slice(0, 10);

  // ── Signups + 100-user wall ──
  const signupsHtml = signups.ok && signups.data
    ? [
        metricRow("נרשמים חדשים אתמול", fmtInt(signups.data.newYesterday)),
        metricRow("סה״כ משתמשים", fmtInt(signups.data.totalUsers)),
        metricRow(
          "מרחק מתקרת ה-100 משתמשים (Google Testing mode)",
          `${fmtInt(signups.data.totalUsers)}/100 (${Math.round(
            (signups.data.totalUsers / 100) * 100,
          )}%)`,
        ),
      ].join("")
    : unavailableRow("נתוני משתמשים");

  // ── Events ──
  const eventsHtml = events.ok && events.data
    ? [
        metricRow("אירועים אתמול", fmtInt(events.data.yesterdayTotal)),
        metricRow("סה״כ אירועים (כל הזמנים)", fmtInt(events.data.totalAllTime)),
        events.data.topNames.length
          ? `<table style="width:100%;border-collapse:collapse;margin-top:6px;font-family:sans-serif;font-size:13px">
              ${events.data.topNames
                .map(
                  (e) =>
                    `<tr><td style="padding:2px 0;color:#333">${esc(e.name)}</td><td style="padding:2px 0;text-align:start;color:#666">${fmtInt(e.count)}</td></tr>`,
                )
                .join("")}
            </table>`
          : `<div style="font-family:sans-serif;font-size:13px;color:#666">אין אירועים אתמול</div>`,
      ].join("")
    : unavailableRow("אירועים");

  // ── AI usage ──
  const aiUsageHtml = aiUsage.ok && aiUsage.data
    ? [
        metricRow("קריאות AI אתמול", fmtInt(aiUsage.data.totalCalls)),
        metricRow("טוקנים אתמול", fmtInt(aiUsage.data.totalTokens)),
        metricRow("עלות משוערת אתמול", fmtUsd(aiUsage.data.totalCostUsd)),
        aiUsage.data.byRoute.length
          ? `<table style="width:100%;border-collapse:collapse;margin-top:6px;font-family:sans-serif;font-size:13px">
              <tr style="color:#666">
                <td>route</td><td style="text-align:start">קריאות</td><td style="text-align:start">טוקנים</td><td style="text-align:start">עלות</td>
              </tr>
              ${aiUsage.data.byRoute
                .map(
                  (r) =>
                    `<tr><td style="padding:2px 0;color:#333">${esc(r.route)}</td><td style="text-align:start">${fmtInt(r.calls)}</td><td style="text-align:start">${fmtInt(r.tokens)}</td><td style="text-align:start">${fmtUsd(r.costUsd)}</td></tr>`,
                )
                .join("")}
            </table>`
          : `<div style="font-family:sans-serif;font-size:13px;color:#666">אין קריאות AI אתמול</div>`,
      ].join("")
    : unavailableRow("שימוש ב-AI");

  // ── Chat threads ──
  const chatThreadsHtml =
    chatThreadsYesterday.ok && chatThreadsYesterday.data !== null
      ? metricRow("שיחות חדשות אתמול", fmtInt(chatThreadsYesterday.data))
      : unavailableRow("שיחות חדשות");

  // ── Health checks ──
  const healthHtml = health.ok && health.data
    ? health.data
        .map((h) => {
          const icon = h.healthy ? "✅" : "❌";
          const line = `<div style="padding:4px 0;font-family:sans-serif;font-size:14px;color:#333">${icon} ${esc(h.labelHe)}</div>`;
          const explain = h.healthy
            ? ""
            : `<div style="padding:0 0 6px 20px;font-family:sans-serif;font-size:12px;color:#C05B45">${esc(h.meaningHe)}</div>`;
          return line + explain;
        })
        .join("")
    : unavailableRow("בדיקות בריאות");

  // ── Retention ──
  const retentionHtml = opts.retention
    ? opts.retention.ok
      ? metricRow(`אירועים ישנים שנמחקו (מעל ${EVENTS_RETENTION_DAYS} יום)`, fmtInt(opts.retention.deleted))
      : unavailableRow("ניקוי retention")
    : unavailableRow("ניקוי retention");

  const html = `
    <div dir="rtl" style="direction:rtl;text-align:right;font-family:sans-serif;color:#333;max-width:560px">
      <table style="width:100%;border-collapse:collapse" role="presentation">
        <tr><td style="padding-bottom:4px">
          <h1 style="margin:0;font-size:18px;color:#083A4F;font-family:sans-serif">countme — דייג'סט יומי</h1>
          <div style="font-size:12px;color:#999">נתוני אתמול (${dateLabel}, UTC)</div>
        </td></tr>
        ${section("משתמשים", signupsHtml)}
        ${section("אירועים", eventsHtml)}
        ${section("שימוש ב-AI", aiUsageHtml)}
        ${section("צ׳אט", chatThreadsHtml)}
        ${section("ריטנשן", retentionHtml)}
        ${section("בריאות מערכת", healthHtml)}
        <tr><td style="padding-top:16px;font-size:11px;color:#999;font-family:sans-serif">
          נשלח אוטומטית מ-Vercel Cron (src/app/api/cron/daily-digest/route.ts).
        </td></tr>
      </table>
    </div>
  `.trim();

  const plainLines: string[] = [`countme — דייג'סט יומי (${dateLabel}, UTC)`, ""];
  plainLines.push("משתמשים:");
  if (signups.ok && signups.data) {
    plainLines.push(`  נרשמים חדשים אתמול: ${signups.data.newYesterday}`);
    plainLines.push(`  סה"כ משתמשים: ${signups.data.totalUsers}`);
    plainLines.push(
      `  מרחק מתקרת 100: ${signups.data.totalUsers}/100`,
    );
  } else {
    plainLines.push(`  ${UNAVAILABLE_HE}`);
  }
  plainLines.push("", "אירועים:");
  if (events.ok && events.data) {
    plainLines.push(`  אתמול: ${events.data.yesterdayTotal}, סה"כ: ${events.data.totalAllTime}`);
    for (const e of events.data.topNames) plainLines.push(`  - ${e.name}: ${e.count}`);
  } else {
    plainLines.push(`  ${UNAVAILABLE_HE}`);
  }
  plainLines.push("", "AI:");
  if (aiUsage.ok && aiUsage.data) {
    plainLines.push(
      `  קריאות: ${aiUsage.data.totalCalls}, טוקנים: ${aiUsage.data.totalTokens}, עלות: ${fmtUsd(aiUsage.data.totalCostUsd)}`,
    );
    for (const r of aiUsage.data.byRoute) {
      plainLines.push(`  - ${r.route}: ${r.calls} calls, ${r.tokens} tokens, ${fmtUsd(r.costUsd)}`);
    }
  } else {
    plainLines.push(`  ${UNAVAILABLE_HE}`);
  }
  plainLines.push("", "צ'אט:");
  plainLines.push(
    chatThreadsYesterday.ok && chatThreadsYesterday.data !== null
      ? `  שיחות חדשות אתמול: ${chatThreadsYesterday.data}`
      : `  ${UNAVAILABLE_HE}`,
  );
  plainLines.push("", "ריטנשן:");
  plainLines.push(
    opts.retention?.ok
      ? `  אירועים שנמחקו: ${opts.retention.deleted}`
      : `  ${UNAVAILABLE_HE}`,
  );
  plainLines.push("", "בריאות מערכת:");
  if (health.ok && health.data) {
    for (const h of health.data) {
      plainLines.push(`  ${h.healthy ? "OK" : "FAIL"} ${h.labelHe}`);
      if (!h.healthy) plainLines.push(`    ${h.meaningHe}`);
    }
  } else {
    plainLines.push(`  ${UNAVAILABLE_HE}`);
  }

  return { html, plain: plainLines.join("\n") };
}
