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

/** Pathname prefixes that require an authenticated user. */
const PROTECTED_PREFIXES = [
  "/home",
  "/demo",
  "/setup/assets",
  "/onboarding",
  "/business-expenses",
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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
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
  // Behind a flag so auth can be merged/deployed BEFORE the Google provider is
  // live without locking the app. Set AUTH_GATING_ENABLED=true to enforce.
  if (
    process.env.AUTH_GATING_ENABLED === "true" &&
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

  // IMPORTANT: return the supabaseResponse object as-is so the refreshed
  // auth cookies survive. If you create a new response, copy its cookies over.
  return supabaseResponse;
}
