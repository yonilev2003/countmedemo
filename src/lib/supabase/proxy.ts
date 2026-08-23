// Session refresh + auth gating for the Next.js root proxy (middleware).
//
// This follows the official @supabase/ssr "middleware" recipe verbatim for the
// cookie plumbing — the `getUser()` call refreshes an expiring token and writes
// the new cookies onto BOTH the request (so downstream Server Components read
// the fresh session) and the response (so the browser receives Set-Cookie).
// DO NOT remove the `getUser()` call or the response-recreation pattern, or
// session refresh silently breaks (users get logged out at random).
//
// On top of the recipe we add authentication-only gating: an unauthenticated
// request to a protected prefix is redirected to /login. Persona-based routing
// (e.g. /demo -> /setup when no persona exists) is intentionally NOT handled
// here — that logic lives in the data/page layer, not in auth.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { isAuthGatingEnabled } from "@/lib/security/auth-gating";

/** Pathname prefixes that require an authenticated user. */
const PROTECTED_PREFIXES = [
  "/home",
  "/demo",
  // Gates the whole /setup tree (was "/setup/assets" only — /setup itself was
  // deliberately open so a visitor could try the wizard before committing to
  // auth; Yoni reversed that 23/08 for user-management reasons — every real
  // registration must go through Google/email first, not just every SAVE).
  "/setup",
  "/onboarding",
  "/business-expenses",
  "/expenses",
  "/dashboard",
  "/invoices",
  "/coach",
  "/deadlines",
  "/alerts",
  "/file",
  "/receivables",
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Header the proxy stamps with the resolved Supabase auth user id, so
 * downstream Server Components (e.g. `/` and `/login`) can tell "is this
 * request authenticated" without a second `auth.getUser()` network
 * round-trip — the proxy already paid for that call on every request.
 *
 * SECURITY: this is the sole writer of this header. `updateSession` strips
 * any incoming value BEFORE resolving the real session and only ever sets it
 * from the freshly-resolved `user`, so an external request can never spoof
 * it to impersonate another user downstream. Read it via
 * `(await headers()).get(PROXY_USER_ID_HEADER)` in a Server Component —
 * see src/app/page.tsx / src/app/login/page.tsx for the pattern.
 */
export const PROXY_USER_ID_HEADER = "x-countme-user";

export async function updateSession(request: NextRequest) {
  // Clone + strip immediately, before anything else runs: no downstream
  // reader may ever see a client-supplied value for this header — only one
  // we set ourselves below, after the real session is resolved.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(PROXY_USER_ID_HEADER);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: CookieOptions;
          }[],
        ) {
          // Write to the request so Server Components see the refreshed session…
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // …then recreate the response and copy cookies onto it for the browser.
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Do not run code between createServerClient and getUser().
  // A simple mistake could make it very hard to debug random logouts.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Auth gating only: unauthenticated → /login for protected routes.
  // Fail-closed in production (see isAuthGatingEnabled): an unset flag no
  // longer silently opens every protected page; only an explicit "false" does.
  if (
    isAuthGatingEnabled() &&
    !user &&
    isProtectedPath(request.nextUrl.pathname)
  ) {
    const url = request.nextUrl.clone();
    // Preserve the intended destination so login can send the user back.
    const next = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  // Stamp the resolved identity now that auth is known. Next.js snapshots
  // `request.headers` at the moment `NextResponse.next()` is called (it
  // encodes them into internal x-middleware-request-* headers right then),
  // so the header must be set on `requestHeaders` and the response rebuilt
  // AFTER this point — setting it earlier (or mutating supabaseResponse's
  // already-captured snapshot) would silently never reach the page.
  if (user) requestHeaders.set(PROXY_USER_ID_HEADER, user.id);
  const finalResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });
  // Carry over any Set-Cookie from a session refresh above (IMPORTANT note
  // preserved: the refreshed auth cookies must survive on whatever response
  // we actually return).
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie);
  });
  return finalResponse;
}
