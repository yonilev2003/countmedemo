// Shared in-memory rate limiter for API route handlers.
//
// Consolidates the previously duplicated per-route limiters (chat, coach,
// upload, parse-invoice) into one implementation with consistent key
// resolution, a bounded bucket map, and a shared 429 response.

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * LIMITATIONS — read before trusting this in production:
 *
 * In-memory state is PER SERVERLESS INSTANCE. On Vercel each warm lambda
 * keeps its own Map, so under concurrency a client effectively gets
 * (limit × warm instances) requests per window, and every cold start resets
 * the counters. This is a cost-control speed bump, not a security boundary.
 *
 * Durable limiting requires a shared store. Recommended follow-ups:
 *   - a Vercel WAF rate-limiting rule (no code, enforced at the edge before
 *     the function even runs), and/or
 *   - a Supabase-backed counter (atomic RPC increment per key+window) once
 *     Supabase holds real data — survives instance recycling and scale-out.
 */

const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const MAX_BUCKETS = 1000; // hard cap per namespace — sweep/evict beyond this

/** Shared bucket for requests whose client we cannot identify at all. */
const ANONYMOUS_KEY = "anonymous";

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

// One bucket map per namespace (= per route), so chat/coach/upload/... don't
// share a budget — same behavior as the old per-file Maps.
const namespaces = new Map<string, Map<string, Bucket>>();

/**
 * Resolve the rate-limit key for a request. Preference order:
 *
 *  (a) authenticated user id — stable across IPs, can't be rotated cheaply;
 *  (b) client IP from a header the PLATFORM sets, not the client: on Vercel,
 *      `x-real-ip` and `x-vercel-forwarded-for` are written by Vercel's proxy
 *      and any client-supplied value is discarded, so they can't be spoofed.
 *      `x-forwarded-for` is used only as a LAST fallback (first entry = the
 *      client as seen by the outermost proxy) because on self-hosted /
 *      non-Vercel setups a client can prepend arbitrary entries to it;
 *  (c) the shared "anonymous" bucket — checkRateLimit applies a stricter
 *      limit to it, since every unidentifiable client lands there together.
 */
export function resolveClientKey(
  request: Request,
  userId?: string | null,
): string {
  if (userId) return `user:${userId}`;

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return `ip:${realIp.trim()}`;

  const vercelFwd = request.headers.get("x-vercel-forwarded-for");
  if (vercelFwd) return `ip:${vercelFwd.split(",")[0].trim()}`;

  // Spoofable on non-Vercel infra — fallback only (see JSDoc above).
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return `ip:${fwd.split(",")[0].trim()}`;

  return ANONYMOUS_KEY;
}

/** Drop expired buckets; if still over cap, evict oldest (Map keeps insertion order). */
function sweep(buckets: Map<string, Bucket>, now: number): void {
  for (const [k, v] of buckets) {
    if (now > v.resetAt) buckets.delete(k);
  }
  if (buckets.size > MAX_BUCKETS) {
    const overflow = buckets.size - MAX_BUCKETS;
    let dropped = 0;
    for (const k of buckets.keys()) {
      if (dropped++ >= overflow) break;
      buckets.delete(k);
    }
  }
}

/**
 * Fixed-window counter. `namespace` isolates routes from each other;
 * `maxPerWindow` is the route's budget per key per window. The shared
 * "anonymous" bucket gets half the budget (at least 1) — see resolveClientKey.
 */
export function checkRateLimit(
  namespace: string,
  key: string,
  maxPerWindow: number,
  windowMs: number = DEFAULT_WINDOW_MS,
): RateLimitResult {
  let buckets = namespaces.get(namespace);
  if (!buckets) {
    buckets = new Map();
    namespaces.set(namespace, buckets);
  }

  const max =
    key === ANONYMOUS_KEY ? Math.max(1, Math.floor(maxPerWindow / 2)) : maxPerWindow;

  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    if (buckets.size >= MAX_BUCKETS) sweep(buckets, now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= max) {
    return {
      allowed: false,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true };
}

/**
 * Durable, cross-instance rate limit backed by a Supabase table + atomic RPC
 * (supabase/migrations/20260805180000_durable_rate_limit.sql). Unlike
 * checkRateLimit above (in-memory, per-serverless-instance — see its own
 * JSDoc), every warm lambda hits the same row, so the count is real
 * regardless of how many instances Vercel spins up under load.
 *
 * One DB round-trip per call, so it's reserved for the routes that actually
 * cost money per request (the Claude-backed ones) — layer it AFTER the cheap
 * in-memory check, never instead of it, so an obvious flood is still
 * rejected without touching the database at all.
 *
 * Fails OPEN on any DB/infra error (matches this codebase's convention for
 * secondary/non-authoritative Supabase writes elsewhere, e.g. analytics
 * tracking) — the in-memory check above is still layered underneath, so an
 * outage degrades to today's status quo, not to zero protection.
 */
export async function checkRateLimitDurable(
  namespace: string,
  key: string,
  maxPerWindow: number,
  windowSeconds: number = 60,
): Promise<RateLimitResult> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_bucket_key: `${namespace}:${key}`,
      p_max: maxPerWindow,
      p_window_seconds: windowSeconds,
    });
    const row = data?.[0];
    if (error || !row) return { allowed: true };
    return { allowed: row.allowed, retryAfter: row.retry_after ?? undefined };
  } catch {
    return { allowed: true };
  }
}

/** Standard 429 JSON response, Hebrew message matching the routes' error style. */
export function rateLimitResponse(
  retryAfter?: number,
  message = "יותר מדי בקשות. נסי שוב בעוד כמה שניות.",
): Response {
  return Response.json(
    { error: message },
    {
      status: 429,
      headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined,
    },
  );
}
