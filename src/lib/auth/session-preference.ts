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
 * CROSS-TAB SIBLING CHECK (adversarial-review finding, 2026-08-20):
 * sessionStorage is per-TAB, not per-browser-session. A second tab opened by
 * typing a URL or using a bookmark/autocomplete does NOT inherit Tab A's
 * sessionStorage (only window.open/ctrl-click-style openers do), even though
 * the browser itself was never actually closed. Without a check for this,
 * that second tab would see the (still perfectly legitimate) auth cookie,
 * find no local flag, and force-sign-out — which calls the real
 * supabase.auth.signOut() and clears the cookie for EVERY tab, silently
 * logging Tab A out too.
 *
 * A naive fix (a localStorage "last seen" timestamp, "treat anything within
 * the last N minutes as a sibling") was tried and rejected: localStorage
 * SURVIVES an actual browser close, so a quick close-and-reopen within that
 * window would wrongly read as "sibling still open" — silently weakening the
 * exact guarantee this feature exists to provide. What's needed is a signal
 * that answers "is another tab of this origin open RIGHT NOW", which by
 * definition cannot survive every tab actually closing.
 * `BroadcastChannel` has exactly that property: a channel only connects tabs
 * that are simultaneously alive — if every tab closes, the channel is gone,
 * and a fresh tab's channel starts with no memory of anything, regardless of
 * how little time has passed. `pingForSiblingTab()` asks "is anyone with a
 * legitimate session out there?" and waits briefly for a reply; any tab that
 * confirms its OWN session is legitimate calls `respondToSiblingPings()`
 * once to start answering that question for others for as long as it stays
 * open.
 *
 * shouldForceSignOut() is now async: authenticated, but no local flag AND no
 * sibling tab answers the ping → this is a genuinely fresh browser session
 * reaching a cookie that outlived the use it was created for → sign out.
 *
 * Known limitation (not fixable from JS): a browser's "reopen previous
 * tabs" / session-restore feature can resurrect sessionStorage across what
 * the user perceives as a restart. That is the browser choosing to restore
 * the tab, not this app failing to sign out. A browser without
 * BroadcastChannel support (none in real-world use today) degrades to the
 * pre-sibling-check behavior — never worse than before this fix.
 */

const REMEMBER_ME_KEY = "countme_remember_me";
const ACTIVE_SESSION_KEY = "countme_active_session";
const PING_CHANNEL_NAME = "countme_session_ping";
const PING_TIMEOUT_MS = 250;

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

function hasBroadcastChannel(): boolean {
  return typeof BroadcastChannel !== "undefined";
}

/** Ask "is any tab with a legitimate session open right now?" and wait
 *  briefly for a reply. Resolves false immediately (no wait) when
 *  BroadcastChannel isn't available — same as "no sibling found". */
function pingForSiblingTab(): Promise<boolean> {
  if (!hasBroadcastChannel()) return Promise.resolve(false);
  return new Promise((resolve) => {
    let settled = false;
    let channel: BroadcastChannel;
    try {
      channel = new BroadcastChannel(PING_CHANNEL_NAME);
    } catch {
      resolve(false);
      return;
    }
    const finish = (found: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      channel.close();
      resolve(found);
    };
    channel.onmessage = (e) => {
      if (e.data === "pong") finish(true);
    };
    const timer = setTimeout(() => finish(false), PING_TIMEOUT_MS);
    try {
      channel.postMessage("ping");
    } catch {
      finish(false);
    }
  });
}

let respondingToPings = false;

/** Start answering other tabs' "is anyone legitimate out there?" pings.
 *  Idempotent per tab (a tab only ever needs one responder for its whole
 *  lifetime) and self-cleans nothing — the channel simply stops existing
 *  when this tab closes, which is exactly the desired "gone means gone"
 *  behavior. */
function respondToSiblingPings(): void {
  if (respondingToPings || !hasBroadcastChannel()) return;
  try {
    const channel = new BroadcastChannel(PING_CHANNEL_NAME);
    channel.onmessage = (e) => {
      if (e.data === "ping") channel.postMessage("pong");
    };
    respondingToPings = true;
  } catch {
    // No responder — pings from other tabs will just time out and treat
    // this tab as absent, same as if it had never opened.
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
    respondToSiblingPings();
  } catch {
    // Storage unavailable (private mode, disabled) — falls back to
    // shouldForceSignOut()'s safe-open reading below (never signs out based
    // on missing storage alone; see that function's own comment).
  }
}

/**
 * True when an authenticated cookie should NOT be trusted for this page
 * load: not "remembered" (persistent), not "still the session that signed
 * in" (this tab's own sessionStorage flag), AND no sibling tab answers a
 * same-origin ping within the timeout. Callers must already know the caller
 * IS authenticated before checking this — this function only decides
 * whether that authentication should be honored or ended, it never implies
 * authentication by itself.
 */
export async function shouldForceSignOut(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (safeGetLocal(REMEMBER_ME_KEY) || safeGetSession(ACTIVE_SESSION_KEY)) {
    respondToSiblingPings();
    return false;
  }
  const siblingFound = await pingForSiblingTab();
  if (siblingFound) {
    // A sibling tab confirmed a legitimate session RIGHT NOW — adopt this
    // tab into it (own sessionStorage flag + start answering pings too)
    // instead of re-pinging on every subsequent check.
    try {
      sessionStorage.setItem(ACTIVE_SESSION_KEY, "1");
    } catch {
      // Storage unavailable — this tab will just re-ping next time.
    }
    respondToSiblingPings();
    return false;
  }
  return true;
}
