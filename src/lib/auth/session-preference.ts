/**
 * "השאר אותי מחובר/ת" (stay signed in) — Yoni's request, 2026-08-20: sign out
 * automatically after each use unless the user explicitly opts to be
 * remembered, so a shared/public device never stays silently logged in.
 *
 * Constraint discovered while implementing this: @supabase/ssr (0.12.0)
 * hardcodes every auth cookie's Max-Age to its own 400-day default —
 * `applyServerStorage` in its cookies.js spreads `cookieOptions` and then
 * unconditionally overwrites `maxAge` back to `DEFAULT_COOKIE_OPTIONS.maxAge`
 * right after, so passing a custom `cookieOptions.maxAge` to
 * createServerClient/createBrowserClient has NO effect — there is no
 * supported way to make the Supabase session cookie itself a true
 * browser-session cookie. So this is implemented as an app-level policy
 * layered on top of the (always-persistent) Supabase cookie, using
 * `sessionStorage` for the one thing it's actually guaranteed to do:
 * disappear when the browser session ends.
 *
 * - `countme_remember_me` (localStorage, persists across restarts): set only
 *   when the user checks "השאר אותי מחובר/ת" at sign-in.
 * - `countme_active_session` (sessionStorage, cleared when the browser/tab
 *   session ends): set at sign-in regardless of the checkbox, so THIS
 *   session (however it started) keeps working through in-app navigation
 *   without being treated as "a new visit" on every page.
 *
 * shouldForceSignOut() is the read side: authenticated, but neither flag is
 * present → this is a fresh browser session reaching a cookie that outlived
 * the use it was created for → sign out instead of showing their data. Both
 * flags are per-origin browser storage, unaffected by navigating through
 * Google's OAuth pages and back (same tab, same origin on return).
 *
 * Known limitation (not fixable from JS): a browser's "reopen previous
 * tabs" / session-restore feature can resurrect sessionStorage across what
 * the user perceives as a restart. That is the browser choosing to restore
 * the tab, not this app failing to sign out.
 */

const REMEMBER_ME_KEY = "countme_remember_me";
const ACTIVE_SESSION_KEY = "countme_active_session";

function safeGetLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeGetSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Call right before kicking off the OAuth redirect (login-form.tsx), so both
 * flags are already in place by the time the browser lands back on our
 * origin post-Google. `remember=false` explicitly clears any earlier
 * "remembered" choice from a previous sign-in on this browser.
 */
export function markSessionStart(remember: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (remember) {
      localStorage.setItem(REMEMBER_ME_KEY, "1");
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
    sessionStorage.setItem(ACTIVE_SESSION_KEY, "1");
  } catch {
    // Storage unavailable (private mode, disabled) — falls back to
    // shouldForceSignOut()'s safe-open reading below (never signs out based
    // on missing storage alone; see that function's own comment).
  }
}

/**
 * True when an authenticated cookie should NOT be trusted for this page
 * load: neither "remembered" (persistent) nor "still the session that
 * signed in" (session-scoped) is set. Callers must already know the caller
 * IS authenticated before checking this — this function only decides
 * whether that authentication should be honored or ended, it never implies
 * authentication by itself.
 */
export function shouldForceSignOut(): boolean {
  if (typeof window === "undefined") return false;
  return !safeGetLocal(REMEMBER_ME_KEY) && !safeGetSession(ACTIVE_SESSION_KEY);
}
