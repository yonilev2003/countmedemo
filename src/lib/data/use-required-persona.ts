"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Persona } from "@/lib/persona";
import { loadPersona, getPersonaOwner, hasPendingContinueIntent } from "@/lib/setup-storage";
import {
  syncPersonaFromDb,
  canOptimisticallyPaintStampedCache,
  getLastKnownUserId,
  getPersonaSaveStatus,
  subscribePersonaSaveStatus,
  retryPersonaSave,
  type PersonaSaveStatus,
} from "./persona-store";

/**
 * Persona for a protected app page, with a DB check before giving up.
 *
 * The pages used to do `const p = loadPersona(); if (!p) router.push("/setup")`
 * synchronously. On a SECOND DEVICE (or a fresh browser / cleared cache) the
 * localStorage cache is empty while `profiles.persona` in Supabase is fully
 * populated — so the user was thrown into the setup wizard, and completing it
 * overwrote their real server data. PersonaHydrator does reconcile, but it runs
 * asynchronously and always lost that race.
 *
 * Here we consult the DB before routing anyone to /setup. Only a user who has
 * no persona locally AND none in the DB is genuinely new.
 *
 * Cross-account safety (QA #17): this hook used to trust ANY local cache
 * outright and return immediately, without ever reconciling against the DB —
 * so a live authenticated session (a stale cookie for a DIFFERENT user than
 * whoever's local cache happens to be sitting in this browser) could render a
 * stranger's persona on a protected page. Now the synchronous fast-path only
 * ever paints an UNSTAMPED (anonymous, not-yet-claimed) cache — same rule
 * usePersona() already uses — and every load, stamped or not, still runs
 * syncPersonaFromDb() (via decidePersonaOwnership) before being trusted. A
 * cache stamped to someone else is discarded there, never shown here.
 *
 * Loading-state honesty (beta-feedback task #4, 18/08): an ANONYMOUS
 * (unstamped) cache used to be painted unconditionally, on the theory that a
 * user who just finished /setup should see their own data instantly. But an
 * anonymous cache with no adoption signal at all was being painted the exact
 * same way — which is precisely how Roy's report happened: full dashboard
 * chrome flashed for "a second" using his unclaimed cache, then got yanked
 * away the instant the DB reconcile came back empty and this hook bounced to
 * /setup. The fix: only fast-paint an anonymous cache when there's an actual
 * PENDING continue-intent signal (`hasPendingContinueIntent` — the same
 * sessionStorage/query-param sources decidePersonaOwnership will consult a
 * moment later), i.e. only when adoption is genuinely expected to be
 * confirmed. Otherwise this hook now holds a neutral `persona === null`
 * loading state — same skeleton every page already renders for "loading" —
 * until syncPersonaFromDb() definitively resolves one way or the other.
 */
export function useRequiredPersona() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [saveStatus, setSaveStatus] = useState<PersonaSaveStatus>(() =>
    getPersonaSaveStatus(),
  );

  useEffect(() => subscribePersonaSaveStatus(setSaveStatus), []);

  useEffect(() => {
    let cancelled = false;

    const local = loadPersona();
    const localOwner = getPersonaOwner();
    const localIsAnonymous = !!local && !localOwner;
    if (localIsAnonymous && hasPendingContinueIntent()) {
      setPersona(local);
    } else if (
      local &&
      localOwner &&
      canOptimisticallyPaintStampedCache(getLastKnownUserId(), localOwner)
    ) {
      // STAMPED cache, optimistic paint (perf-vs-security reconciliation for
      // QA #17) — see the matching comment in use-persona.ts for the full
      // rationale. syncPersonaFromDb() below is still the authoritative
      // check and hard-swaps (or routes to /setup) the instant it disagrees.
      setPersona(local);
    }
    // Every other case (anonymous cache with no pending intent, or a stamped
    // cache this tab can't yet vouch for) leaves `persona` at its neutral
    // null/loading state — no chrome is painted until the reconcile below
    // definitively says so.

    (async () => {
      // Never leave the user staring at a skeleton: if the DB round-trip fails
      // (offline, Supabase down, missing env), fall back to the anonymous
      // instant-paint — but only under the SAME gate as the optimistic paint
      // above (task #4): an anonymous cache with no pending adoption signal
      // must not be shown as confirmed just because the network happened to
      // fail. Otherwise treat as genuinely new rather than hanging forever.
      let remote: Persona | null = null;
      try {
        remote = await syncPersonaFromDb();
      } catch {
        remote = localIsAnonymous && hasPendingContinueIntent() ? local : null;
      }
      if (cancelled) return;
      // Trust the reconcile result verbatim — never fall back to a STAMPED
      // local cache, which syncPersonaFromDb may have just discarded as
      // belonging to a different account (QA #17).
      if (remote) setPersona(remote);
      else router.replace("/setup");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // saveStatus/retrySave are additive — existing callers destructuring only
  // { persona, setPersona } are unaffected. Ready for a consumer (e.g. the
  // dashboard) to show a "נשמר בענן" / retryable-error state (task #3);
  // DoneScreen (which owns the immediate post-auth save) renders its own
  // inline confirmation instead of relying on this shared status.
  return { persona, setPersona, saveStatus, retrySave: retryPersonaSave };
}

/**
 * Standalone read of the shared cloud-save status + retry, for surfaces that
 * don't need the full persona guard above (e.g. DoneScreen, which already
 * holds its just-built persona in local state). See persona-store.ts's
 * save-status store for what sets these values.
 */
export function usePersonaSaveStatus() {
  const [status, setStatus] = useState<PersonaSaveStatus>(() =>
    getPersonaSaveStatus(),
  );
  useEffect(() => subscribePersonaSaveStatus(setStatus), []);
  return { status, retry: retryPersonaSave };
}
