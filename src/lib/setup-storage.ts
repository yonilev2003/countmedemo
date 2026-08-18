import { Persona } from "./persona";

const STORAGE_KEY = "countme_persona";
/**
 * Records which authenticated user the cached persona was last reconciled
 * against. Lets us distinguish "this cache is mine / anonymous" from "this cache
 * belongs to a previous user on this browser" so a stale cache can never seed
 * another account. Empty/absent = anonymous or not-yet-claimed.
 */
const OWNER_KEY = "countme_persona_owner";

/** Save a Persona to localStorage (client-side only). */
export function savePersona(p: Persona): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

/** Read the user id the cached persona was last reconciled for (or null). */
export function getPersonaOwner(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(OWNER_KEY);
}

/**
 * Stamp the cached persona as belonging to `userId` (or clear the stamp with
 * null, e.g. for an anonymous/demo cache). Call after a DB reconcile so we know
 * whose data the local copy holds.
 */
export function setPersonaOwner(userId: string | null): void {
  if (typeof window === "undefined") return;
  if (userId) localStorage.setItem(OWNER_KEY, userId);
  else localStorage.removeItem(OWNER_KEY);
}

/**
 * One-shot "I'm about to log in with THIS local persona" signal.
 *
 * Set by the /setup DoneScreen's "התחברות עם Google" CTA — the ONE moment a
 * fresh, still-unstamped local persona is genuinely meant to become the data
 * for whichever account authenticates next. Consumed (read + cleared) by the
 * very next ownership reconcile after that click, so it can never leak into
 * an unrelated later session: without this flag, an unstamped local persona
 * must NEVER be silently claimed for/uploaded into an authenticated user's
 * row (that upload-into-a-stale-cookie's-account path is QA finding #17 —
 * see decidePersonaOwnership in lib/data/persona-store.ts).
 *
 * sessionStorage (not localStorage): scoped to this tab, and the standard
 * Google OAuth redirect returns to the same tab, so the flag survives the
 * round trip while still not lingering into some later, unrelated tab/visit.
 */
const CONTINUE_INTENT_KEY = "countme_persona_continue_intent";

/** Call right before navigating into login/signup from the /setup DoneScreen. */
export function markPersonaContinueIntent(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CONTINUE_INTENT_KEY, "1");
}

/** One-shot read: returns whether the flag was set, and clears it either way. */
export function consumePersonaContinueIntent(): boolean {
  if (typeof window === "undefined") return false;
  const had = sessionStorage.getItem(CONTINUE_INTENT_KEY) === "1";
  if (had) sessionStorage.removeItem(CONTINUE_INTENT_KEY);
  return had;
}

/**
 * Query-param carrier for the SAME one-shot "continue with this local
 * persona" signal, threaded through the OAuth redirect chain instead of
 * sessionStorage: DoneScreen's single finish CTA → /login?next=..&intent=..
 * → login-form.tsx forwards it into /auth/callback → auth/callback/route.ts
 * carries it onto the final redirect (e.g. /dashboard?intent=save-persona).
 *
 * Why both exist (beta-feedback task #2, 18/08): sessionStorage is same-tab
 * only. Google's OAuth round trip sometimes completes in a different
 * tab/context (mobile browsers switching into an in-app browser, some SSO
 * proxies) — that silently drops the sessionStorage flag and reopens the
 * exact upload gap this mechanism exists to close. The query param survives
 * that hop because it rides the URL itself, not the tab's storage.
 *
 * Deliberately simple (a fixed sentinel value, not a signed token) — "keep
 * it simple and audited" per the task: decidePersonaOwnership only ever
 * reaches "adopt-unclaimed" for a cache that is (a) already sitting in the
 * visitor's OWN browser and (b) UNSTAMPED — a foreign-stamped cache is
 * discarded before intent is even consulted (see persona-store.ts). Nobody
 * can inject a persona into someone else's localStorage from outside, so a
 * forged/replayed `?intent=save-persona` can at most make a user's own,
 * already-local, already-anonymous wizard data get claimed slightly earlier
 * than a click would have — never a cross-account leak.
 */
export const CONTINUE_INTENT_QUERY_PARAM = "intent";
export const CONTINUE_INTENT_QUERY_VALUE = "save-persona";

/**
 * Non-consuming peek at BOTH intent sources (sessionStorage flag + URL query
 * param) — for callers that need to know "is an adoption about to happen?"
 * WITHOUT spending the one-shot signal. Used by useRequiredPersona to decide
 * whether it's safe to optimistically paint an still-anonymous cache before
 * the DB confirms it (see that file for the "flash of dashboard chrome, then
 * bounced to /setup" bug this gates against). Never mutates state.
 */
export function hasPendingContinueIntent(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(CONTINUE_INTENT_KEY) === "1") return true;
  try {
    return (
      new URLSearchParams(window.location.search).get(
        CONTINUE_INTENT_QUERY_PARAM,
      ) === CONTINUE_INTENT_QUERY_VALUE
    );
  } catch {
    return false;
  }
}

/**
 * One-shot read of the QUERY-PARAM intent source only: returns whether it
 * was present, and strips it from the URL (via history.replaceState — no
 * navigation, no reload) either way, so a refresh or a copied/shared link
 * can never replay it. Mirrors consumePersonaContinueIntent's one-shot
 * contract for the other source.
 */
function consumeQueryContinueIntent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    const had =
      url.searchParams.get(CONTINUE_INTENT_QUERY_PARAM) ===
      CONTINUE_INTENT_QUERY_VALUE;
    if (had) {
      url.searchParams.delete(CONTINUE_INTENT_QUERY_PARAM);
      window.history.replaceState(window.history.state, "", url.toString());
    }
    return had;
  } catch {
    return false;
  }
}

/**
 * THE single place both explicit-intent sources are combined into the one
 * boolean decidePersonaOwnership expects — every caller of that function's
 * `explicitContinueIntent` input should route through here rather than
 * reading either source directly, so the two can never drift out of sync.
 * Both are consumed (not short-circuited) so a query param present alongside
 * a stale sessionStorage flag still gets cleared either way.
 */
export function consumeExplicitContinueIntent(): boolean {
  const sessionFlag = consumePersonaContinueIntent();
  const queryFlag = consumeQueryContinueIntent();
  return sessionFlag || queryFlag;
}

/**
 * Remove the cached Persona from localStorage (client-side only).
 *
 * Call this on sign-out so the next user on the same browser never inherits the
 * previous user's data from the cache. For logged-in users `profiles.persona` in
 * Supabase is the source of truth; this only drops the fast local copy.
 */
export function clearLocalPersona(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(OWNER_KEY);
}

/** Load a Persona from localStorage. Returns null if not found or invalid. */
export function loadPersona(): Persona | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persona;
  } catch {
    return null;
  }
}

/**
 * Update a single value inside a persona by dotted path
 * (e.g. "personal.firstName", "business.tradeName", "bank.accountNumber").
 * Returns the updated persona — does NOT write to localStorage by itself.
 * Combine with savePersona() to persist.
 */
export function setPersonaPath(
  persona: Persona,
  path: string,
  value: unknown,
): Persona {
  const segments = path.split(".");
  // Deep-clone the relevant branches to maintain immutability
  const result: Record<string, unknown> = JSON.parse(JSON.stringify(persona));
  let cursor = result;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (cursor[seg] === undefined || cursor[seg] === null) {
      cursor[seg] = {};
    }
    cursor = cursor[seg] as Record<string, unknown>;
  }
  cursor[segments[segments.length - 1]] = value;
  return result as unknown as Persona;
}
