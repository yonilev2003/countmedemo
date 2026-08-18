// One seam for Persona persistence: localStorage cache + Supabase write-through.
// Existing pages keep using the sync `loadPersona()` cache; writers call
// `persistPersona()` so every save also lands in the DB once the user is logged in.

import type { Persona } from "@/lib/persona";
import {
  loadPersona as loadLocal,
  savePersona as saveLocal,
  clearLocalPersona,
  getPersonaOwner,
  setPersonaOwner,
  consumeExplicitContinueIntent,
} from "@/lib/setup-storage";
import { fetchPersona, upsertPersona, getCurrentUserId } from "./persona-repository";

export { getCurrentUserId } from "./persona-repository";

/**
 * The five ways a local persona cache can relate to the current browser
 * session, and what's safe to do about it. This is the single source of
 * truth for cross-account safety (QA #17 — session bleed): both the DB→cache
 * READ reconcile (syncPersonaFromDb) and the cache→DB WRITE (persistPersona)
 * classify through this same function before touching the DB, so the rule
 * can never drift between the two paths.
 *
 * - "signed-out"       no authenticated session — local cache is untouched,
 *                       never uploaded (there's nowhere safe to upload it to).
 * - "use-remote"        the DB already has a persona for this user — it wins,
 *                       unconditionally. Read-path only (persist never fetches
 *                       remote first, see below).
 * - "discard-foreign"   local cache is stamped to a DIFFERENT user than the
 *                       one live in this browser right now. NEVER read it as
 *                       this user's data, NEVER upload it, NEVER merge it —
 *                       drop it. This is the exact QA #17 shape: a stale
 *                       Yoni cookie must never inherit/receive Dana's data
 *                       just because her anonymous /setup cache is sitting in
 *                       the same browser's localStorage.
 * - "adopt-unclaimed"   local cache has NO owner stamp (anonymous) AND the
 *                       one-shot continue-intent flag is set — i.e. the user
 *                       just finished /setup in THIS browser and explicitly
 *                       clicked through into login with that exact persona.
 *                       Safe to claim for the now-authenticated user and
 *                       upload. This is the ONLY path that may stamp/upload
 *                       an unstamped cache (fix contract (a)/(c)).
 * - "keep-own"          local cache is already stamped to the CURRENT user —
 *                       their own data, previously reconciled. Safe to keep
 *                       showing and safe to upload edits.
 * - "empty"             nothing usable: no local cache, or an anonymous cache
 *                       with no continue-intent (a stale cookie must NOT
 *                       silently adopt an anonymous cache it has no claim to
 *                       — fix contract (c)). Never uploads.
 */
export type PersonaOwnershipAction =
  | "signed-out"
  | "use-remote"
  | "discard-foreign"
  | "adopt-unclaimed"
  | "keep-own"
  | "empty";

export interface PersonaOwnershipInput {
  /** Authenticated user id for the CURRENT browser session, or null when signed out. */
  currentUserId: string | null;
  /** Owner stamp on the cached local persona (see setPersonaOwner), or null if unstamped/absent. */
  localOwner: string | null;
  /** Whether a persona object currently exists in the local cache. */
  hasLocalPersona: boolean;
  /**
   * Whether the DB already holds a persona row for `currentUserId`. Only the
   * read (sync) path ever knows this — persist() never fetches remote first
   * (that would cost a network round-trip on every save), so it always
   * passes `false` and therefore never reaches "use-remote".
   */
  hasRemotePersona: boolean;
  /**
   * See `markPersonaContinueIntent` (sessionStorage) and
   * `CONTINUE_INTENT_QUERY_PARAM` (URL query, for OAuth redirects that land
   * in a different tab/context) in setup-storage.ts — combined by
   * `consumeExplicitContinueIntent()`, which every caller of this function
   * should use to produce this boolean.
   */
  explicitContinueIntent: boolean;
}

/** Pure decision function — no I/O, fully unit-testable (see tests/unit/persona-ownership.test.ts). */
export function decidePersonaOwnership(
  input: PersonaOwnershipInput,
): PersonaOwnershipAction {
  const {
    currentUserId,
    localOwner,
    hasLocalPersona,
    hasRemotePersona,
    explicitContinueIntent,
  } = input;

  if (!currentUserId) return "signed-out";
  if (hasRemotePersona) return "use-remote";
  if (!hasLocalPersona) return "empty";

  // A cache stamped to someone else is radioactive: never read it as this
  // user's, never write it up — checked BEFORE the unstamped/adopt branch so
  // a foreign stamp can never be misread as "unclaimed".
  if (localOwner && localOwner !== currentUserId) return "discard-foreign";
  if (localOwner === currentUserId) return "keep-own";

  // localOwner is null/unstamped here — the only branch where adoption is
  // even on the table, and only with the explicit one-shot signal.
  if (explicitContinueIntent) return "adopt-unclaimed";
  return "empty";
}

/**
 * Shared cloud-save status (beta-feedback task #3, 18/08): `upsertPersona()`
 * itself never throws — it swallows every error and returns a boolean that,
 * before this store existed, nobody read (every call site was a
 * fire-and-forget `void upsertPersona(...)`). A real write failure was
 * therefore invisible: the user believed they were saved when they weren't.
 *
 * `attemptCloudUpsert` below is now the ONE place that calls `upsertPersona`
 * — every branch that used to fire-and-forget it routes through here instead
 * — recording the outcome here so any UI (DoneScreen's inline confirmation,
 * or a future dashboard banner via `usePersonaSaveStatus` in
 * use-required-persona.ts) can show it and retry. Deliberately a simple
 * module-level store (not React state) since the write can be kicked off
 * from a non-component context (syncPersonaFromDbUncached).
 */
export type PersonaSaveStatus = "idle" | "saving" | "saved" | "error";

let saveStatus: PersonaSaveStatus = "idle";
let retryTarget: Persona | null = null;
const saveStatusListeners = new Set<(status: PersonaSaveStatus) => void>();

function setSaveStatusState(next: PersonaSaveStatus, retry: Persona | null) {
  saveStatus = next;
  retryTarget = retry;
  saveStatusListeners.forEach((listener) => listener(next));
}

/** Synchronous snapshot — for a hook's initial state before it subscribes. */
export function getPersonaSaveStatus(): PersonaSaveStatus {
  return saveStatus;
}

/** Subscribe to save-status changes. Returns an unsubscribe function. */
export function subscribePersonaSaveStatus(
  listener: (status: PersonaSaveStatus) => void,
): () => void {
  saveStatusListeners.add(listener);
  return () => {
    saveStatusListeners.delete(listener);
  };
}

/**
 * Re-attempt the most recently failed cloud save. No-op (returns false) when
 * there's nothing to retry — e.g. nothing has failed, or a later save
 * already succeeded/superseded it.
 */
export async function retryPersonaSave(): Promise<boolean> {
  if (!retryTarget) return false;
  return attemptCloudUpsert(retryTarget);
}

async function attemptCloudUpsert(persona: Persona): Promise<boolean> {
  setSaveStatusState("saving", persona);
  const ok = await upsertPersona(persona);
  setSaveStatusState(ok ? "saved" : "error", ok ? null : persona);
  return ok;
}

/** What actually happened when `persistPersona` ran, for callers (like
 * DoneScreen) that need to show the user an honest outcome rather than
 * fire-and-forget. "not-uploaded" covers every decidePersonaOwnership branch
 * that never touches the DB (signed-out, discard-foreign, empty, use-remote)
 * — not a failure, just nothing to report as "saved to the cloud". */
export type PersonaSaveOutcome = "saved" | "error" | "not-uploaded";

/**
 * Save locally now (sync cache) and persist to the DB — but ONLY when the
 * local cache is safe to attribute to the CURRENT authenticated session (see
 * decidePersonaOwnership). A cache stamped to a different user, or an
 * anonymous cache with no explicit continue-intent, is saved locally (so the
 * person in front of the screen keeps seeing their own edits) but is never
 * uploaded — this is the fix for QA #17, where the old unconditional upsert
 * let an anonymous wizard persona land in a stale cookie's authenticated DB
 * row.
 */
export async function persistPersona(persona: Persona): Promise<PersonaSaveOutcome> {
  saveLocal(persona);

  try {
    const currentUserId = await getCurrentUserId();
    // Keep the same-tab fast-path hint (see `lastKnownUserId` above) warm from
    // every authoritative resolution, not just syncPersonaFromDb's — a save
    // can be the first thing that resolves identity in a tab (e.g. mid-wizard).
    lastKnownUserId = currentUserId;
    const localOwner = getPersonaOwner();
    const action = decidePersonaOwnership({
      currentUserId,
      localOwner,
      hasLocalPersona: true,
      hasRemotePersona: false,
      explicitContinueIntent: consumeExplicitContinueIntent(),
    });

    switch (action) {
      case "adopt-unclaimed":
        setPersonaOwner(currentUserId);
        return (await attemptCloudUpsert(persona)) ? "saved" : "error";
      case "keep-own":
        return (await attemptCloudUpsert(persona)) ? "saved" : "error";
      case "discard-foreign":
      case "signed-out":
      case "empty":
      case "use-remote":
      default:
        // No upload. "discard-foreign" in particular is the QA #17 guard: the
        // cache we just wrote locally belongs to a different account than the
        // one live in this browser — it stays on this screen, but it must
        // never reach that account's DB row.
        return "not-uploaded";
    }
  } catch {
    // getCurrentUserId() (or anything above) threw — offline, Supabase
    // misconfigured, etc. The local save above already succeeded, so the
    // user's edit is never lost; only the cloud half failed.
    return "error";
  }
}

/**
 * Reconcile the local cache with the DB. The DB is the source of truth for a
 * logged-in user; the local cache is only a fast paint. Returns the
 * authoritative persona (DB → local → null).
 *
 * Cross-user safety: routed entirely through decidePersonaOwnership — see
 * that function's doc comment for the full state table.
 */
// In-flight dedupe: PersonaHydrator (root layout) and the per-page hooks all
// call syncPersonaFromDb on mount, so a single navigation used to fire the
// same auth+select round-trips 2-3x concurrently (efficiency-audit finding).
// Concurrent callers now await one shared promise instead.
let inFlight: Promise<Persona | null> | null = null;

export function syncPersonaFromDb(): Promise<Persona | null> {
  if (inFlight) return inFlight;
  inFlight = syncPersonaFromDbUncached().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * Last AUTHORITATIVE currentUserId this tab has resolved (via a real
 * `auth.getUser()` round-trip inside syncPersonaFromDbUncached, below) —
 * `undefined` until the first such resolution completes this session, then
 * `null` (confirmed signed out) or a user id (confirmed signed in as them).
 *
 * PERF (2026-08-18, perf-vs-security reconciliation for QA #17): exists
 * solely so `canOptimisticallyPaintStampedCache` below can let a STAMPED
 * local cache render immediately on navigations AFTER the first one this
 * tab — e.g. clicking between /dashboard → /invoices → /expenses no longer
 * has to wait out a fresh network reconcile every single time just because
 * the cache happens to carry an owner stamp. It is a cheap, same-tab-only
 * hint, NEVER a substitute for the authoritative check: every read of it is
 * paired with a full `syncPersonaFromDb()` call that hard-swaps the state
 * (via its existing "discard-foreign" cache-clearing / "keep-own" / etc.
 * handling, all unchanged below) the instant the real answer disagrees.
 */
let lastKnownUserId: string | null | undefined = undefined;

/**
 * Non-authoritative, synchronous, no-I/O preview of what
 * `decidePersonaOwnership` would say about a STAMPED local cache, given only
 * same-tab knowledge (see `lastKnownUserId`) — this makes NO network call
 * itself. Returns `false` whenever there isn't yet enough same-tab
 * knowledge to make ANY safe claim (this tab's very first persona-consuming
 * render this session), which keeps the caller's behavior identical to
 * before this optimization existed: hold the skeleton and wait for the real
 * `syncPersonaFromDb()`.
 *
 * Deliberately routes through the SAME `decidePersonaOwnership` used
 * everywhere else (that function's rules are not changed by this file) and
 * only ever treats two of its outcomes as "safe to paint": `"keep-own"`
 * (this tab already knows the cache is this user's own) and `"signed-out"`
 * (persona caches are shown as-is while signed out — same as today, just
 * without the wait). Every other outcome — in particular `"discard-foreign"`
 * — returns `false`: a foreign-owned stamped cache must NEVER paint,
 * exactly as today.
 */
export function canOptimisticallyPaintStampedCache(
  currentUserId: string | null | undefined,
  localOwner: string,
): boolean {
  if (currentUserId === undefined) return false;
  const action = decidePersonaOwnership({
    currentUserId,
    localOwner,
    hasLocalPersona: true,
    hasRemotePersona: false,
    explicitContinueIntent: false,
  });
  return action === "keep-own" || action === "signed-out";
}

/** Synchronous snapshot of `lastKnownUserId`, for the hooks in use-persona.ts / use-required-persona.ts. */
export function getLastKnownUserId(): string | null | undefined {
  return lastKnownUserId;
}

async function syncPersonaFromDbUncached(): Promise<Persona | null> {
  const currentUserId = await getCurrentUserId();
  lastKnownUserId = currentUserId;
  const local = loadLocal();
  const localOwner = getPersonaOwner();

  // Signed out (anonymous/demo): keep whatever local cache exists, untouched.
  if (!currentUserId) return local;

  // Pass the resolved id through — skips fetchPersona's own auth round-trip.
  const remote = await fetchPersona(currentUserId);

  const action = decidePersonaOwnership({
    currentUserId,
    localOwner,
    hasLocalPersona: !!local,
    hasRemotePersona: !!remote,
    explicitContinueIntent: consumeExplicitContinueIntent(),
  });

  switch (action) {
    case "use-remote":
      // DB wins — overwrite the cache and claim it for this user.
      saveLocal(remote!);
      setPersonaOwner(currentUserId);
      return remote;

    case "discard-foreign":
      // Leftover cache from a previous/different user on this browser —
      // never expose or upload it. Drop it and report "empty" so the user
      // starts clean (QA #17: this is the exact cross-account bleed guard).
      clearLocalPersona();
      return null;

    case "adopt-unclaimed":
      // The signup → /setup → login hand-off, completed: an anonymous cache
      // created in THIS browser, with the explicit one-shot continue-intent
      // set right before authenticating. Claim it for this user and seed the
      // DB — the only path that may upload a previously-unstamped cache.
      setPersonaOwner(currentUserId);
      void attemptCloudUpsert(local!);
      return local;

    case "keep-own":
      // Already this user's own cache (stamped in a previous reconcile), but
      // the DB row came back empty (e.g. a fresh row, or a prior write that
      // didn't land) — repair it. Always safe: it's this user's own data.
      void attemptCloudUpsert(local!);
      return local;

    case "empty":
    default:
      return null;
  }
}
