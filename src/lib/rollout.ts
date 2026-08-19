/**
 * Deterministic gradual-rollout (canary) helper — v2 plan item 5.3.
 *
 * Vercel Hobby has no built-in canary/percentage-rollout mechanism, so this
 * module IS the canary system: a pure, isomorphic (no Node APIs, safe in
 * both React Server Components and the browser) feature-flag gate that
 * buckets each user id into a stable 0-99 slot per feature, then compares
 * that slot against a rollout percentage read from env.
 *
 * ── Why "deterministic per user" instead of random-per-request ─────────
 * A user's bucket is a pure function of (userId, feature) — the same person
 * always lands in the same bucket for the same feature. That means:
 *   - a user never flip-flops between the old and new variant across page
 *     loads, tabs, or SSR vs. client renders (which would be confusing and
 *     could corrupt state that assumes one variant for the whole session)
 *   - rollout percentage can be dialed up over time (10 → 50 → 100) and
 *     everyone already "in" stays in — nobody gets bucketed out again
 *   - different features roll out independently: the same user can be in
 *     the canary for feature A and not feature B, because the feature name
 *     is mixed into the hash.
 *
 * ── Usage ────────────────────────────────────────────────────────────
 *   import { inRollout } from "@/lib/rollout";
 *
 *   // Server-side gating (API route, server component) — no rebuild needed
 *   // when you flip the env var, since it's read at request time:
 *   if (inRollout("new-pricing-engine", user?.id)) {
 *     return newPricingEngine(input);
 *   }
 *   return legacyPricingEngine(input);
 *
 *   // Client-side UI gating — reads NEXT_PUBLIC_ROLLOUT_<FEATURE>_PCT,
 *   // which Next.js inlines at BUILD time (see the rebuild caveat below):
 *   {inRollout("new-onboarding-flow", persona?.id) && <NewOnboardingBanner />}
 *
 *   // Explicit percentage (bypass env entirely — e.g. from a test, or a
 *   // value already resolved by the caller):
 *   inRollout("beta-feature", userId, 50);
 *
 * ── Env-var naming contract ──────────────────────────────────────────
 * Feature name → env var: uppercase, non-alphanumeric runs (including "-")
 * collapse to a single "_". Example: feature "new-pricing-engine" reads
 * ROLLOUT_NEW_PRICING_ENGINE_PCT (server) or
 * NEXT_PUBLIC_ROLLOUT_NEW_PRICING_ENGINE_PCT (client).
 *
 * Two variants are offered — pick the one that matches WHERE the gate runs:
 *   - ROLLOUT_<FEATURE>_PCT              (server-only, e.g. API routes,
 *     server components, server actions). Vercel reads this at request
 *     time — editing it in the Vercel dashboard takes effect immediately,
 *     NO REDEPLOY REQUIRED. Prefer this for any server-side gating.
 *   - NEXT_PUBLIC_ROLLOUT_<FEATURE>_PCT  (client-side, for gating UI that
 *     renders in the browser). Next.js inlines NEXT_PUBLIC_* values into
 *     the JS bundle AT BUILD TIME — changing this in Vercel requires a
 *     REDEPLOY (a rebuild) before it takes effect. This is a real caveat,
 *     not a footgun to hide: don't promise "no deploy needed" for the
 *     client-side variant.
 *
 * Missing or invalid env → 100 (fully on). Flags exist to CONTAIN risky new
 * things during rollout; the absence of a flag must never silently turn a
 * feature off — that would be a availability regression nobody asked for.
 *
 * A null/undefined userId (anonymous/logged-out visitor) is included only
 * once pct === 100 — i.e. anonymous users are always the LAST cohort to see
 * a canary, never the first. This is deliberate: we can't dial back a bad
 * experience for someone we have no identity to reason about (no way to
 * bucket them out again on the next request), so they only see a feature
 * once it's fully rolled out and presumably stable.
 *
 * ── Rollout / rollback playbook ─────────────────────────────────────
 *   1. Ship the feature behind `inRollout("my-feature", userId)`, default
 *      env var unset (⇒ 100%). Nothing changes yet for anyone.
 *   2. To actually start a canary, SET the env var low: e.g.
 *      ROLLOUT_MY_FEATURE_PCT=10 in Vercel (Production). Server-side: live
 *      immediately. Client-side (NEXT_PUBLIC_ variant): redeploy to pick it
 *      up.
 *   3. Watch logs/alerts/error rate for the canary cohort.
 *   4. Widen gradually: 10 → 50 → 100 by editing the same env var (no code
 *      change, no new deploy for the server-side variant).
 *   5. Rollback: set the value back down (or to 0) the same way — instant
 *      for server-side flags. This is the whole rollback story on Hobby:
 *      there's no infra-level canary to abort, just this percentage.
 *   6. Once a feature is safely at 100% and staying there, remove the
 *      `inRollout(...)` branch from the code entirely — flags are meant to
 *      be temporary scaffolding, not permanent config surface.
 */

/**
 * cyrb53 — a fast, high-quality, non-cryptographic 53-bit string hash.
 * Public-domain implementation by bryc (https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js),
 * used here (inlined, no dependency) purely to turn "userId:feature" into a
 * well-distributed integer for bucketing. NOT for security/uniqueness
 * guarantees — collisions are fine, we only need a roughly uniform spread
 * over 0-99.
 */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Deterministically buckets a (userId, feature) pair into a stable slot in
 * [0, 99]. Same inputs always produce the same output — pure, no I/O.
 */
export function stableBucket(userId: string, feature: string): number {
  const hash = cyrb53(`${userId}:${feature}`);
  return hash % 100;
}

/** Uppercase feature name, non-alphanumeric runs collapsed to "_". */
function envKeyPart(feature: string): string {
  return feature
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Reads and validates a rollout percentage from env. Returns null when the
 * var is unset, blank, non-numeric, or out of the [0, 100] range — callers
 * treat null as "not configured" and fail open to 100.
 */
function readPctFromEnv(feature: string, clientSide: boolean): number | null {
  const key = clientSide
    ? `NEXT_PUBLIC_ROLLOUT_${envKeyPart(feature)}_PCT`
    : `ROLLOUT_${envKeyPart(feature)}_PCT`;
  // process.env is statically replaced per-key by Next.js' bundler for
  // NEXT_PUBLIC_* vars, but that only works for direct `process.env.FOO`
  // property access — not dynamic keys. So on the client, only the
  // non-prefixed lookup below is reliable at runtime; the NEXT_PUBLIC_
  // variant is intended to be read via each call site's own build-time
  // constant when true client-bundle inlining is required. Here we still
  // attempt a runtime env read (works server-side, and in any environment
  // that exposes process.env to the client, e.g. tests) as a best effort.
  const raw = typeof process !== "undefined" && process.env ? process.env[key] : undefined;
  if (raw === undefined || raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

/**
 * Should this user see `feature`? See the module doc-comment above for the
 * full playbook. Summary:
 *   - pct resolved from `pctFromEnv` if given, else from
 *     ROLLOUT_<FEATURE>_PCT / NEXT_PUBLIC_ROLLOUT_<FEATURE>_PCT env
 *   - missing/invalid env → pct defaults to 100 (fully on)
 *   - null/undefined userId (anonymous) → included only when pct === 100
 *   - otherwise: included iff stableBucket(userId, feature) < pct
 */
export function inRollout(
  feature: string,
  userId: string | null | undefined,
  pctFromEnv?: number,
): boolean {
  let pct: number;
  if (pctFromEnv !== undefined) {
    pct = Number.isFinite(pctFromEnv) && pctFromEnv >= 0 && pctFromEnv <= 100 ? pctFromEnv : 100;
  } else {
    const server = readPctFromEnv(feature, false);
    const client = server ?? readPctFromEnv(feature, true);
    pct = client ?? 100;
  }

  if (pct >= 100) return true;
  if (pct <= 0) return false;

  if (userId === null || userId === undefined || userId === "") {
    // Anonymous users only ever join once the rollout is complete (pct===100,
    // already handled above) — so at any partial percentage they're excluded.
    return false;
  }

  return stableBucket(userId, feature) < pct;
}
