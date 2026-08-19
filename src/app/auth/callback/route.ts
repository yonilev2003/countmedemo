// OAuth (PKCE) callback — Supabase redirects the browser back here with a
// `code` after the Google round-trip. We exchange that code for a session
// (which sets the auth cookies via the server client), then forward the user
// on to `next` (default /setup). Follows the official @supabase/ssr App Router
// recipe.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  CONTINUE_INTENT_QUERY_PARAM,
  CONTINUE_INTENT_QUERY_VALUE,
} from "@/lib/setup-storage";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` lets callers send the user somewhere specific post-login.
  // Guard against open-redirects: only honor same-origin absolute paths.
  // Default → /dashboard (changed from /home in the beta-lean pivot, commit
  // 6c9d16a — /home still exists but nothing links to it).
  const nextParam = searchParams.get("next");
  // "/path" is ok; "//host" (protocol-relative) is not.
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  // Carry the continue-intent signal (beta-feedback task #2, 18/08) onto the
  // landing page's own URL, so a client-side reconcile there (persona-store's
  // consumeExplicitContinueIntent, via setup-storage's query-param peek/read)
  // can treat it as explicit consent even when the sessionStorage flag didn't
  // survive this redirect (different tab/context). Only forwarded when it
  // matches the one known sentinel value — never passed through verbatim —
  // so this can't become an open param-injection vector.
  const intentParam = searchParams.get(CONTINUE_INTENT_QUERY_PARAM);
  const destination =
    intentParam === CONTINUE_INTENT_QUERY_VALUE
      ? `${next}${next.includes("?") ? "&" : "?"}${CONTINUE_INTENT_QUERY_PARAM}=${CONTINUE_INTENT_QUERY_VALUE}`
      : next;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // In production behind a proxy (e.g. Vercel) the load balancer host is
      // the user-facing host; honor it so we don't redirect to an internal URL.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${destination}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${destination}`);
      } else {
        return NextResponse.redirect(`${origin}${destination}`);
      }
    }
  }

  // No code, or the exchange failed → back to login with a friendly error flag.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
