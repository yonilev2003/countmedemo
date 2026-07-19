// OAuth (PKCE) callback — Supabase redirects the browser back here with a
// `code` after the Google round-trip. We exchange that code for a session
// (which sets the auth cookies via the server client), then forward the user
// on to `next` (default /setup). Follows the official @supabase/ssr App Router
// recipe.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` lets callers send the user somewhere specific post-login.
  // Guard against open-redirects: only honor same-origin absolute paths.
  // Default → /home (the shortcuts hub), which itself forwards first-timers
  // with no persona on to /setup, so returning users land on shortcuts directly.
  const nextParam = searchParams.get("next");
  // "/path" is ok; "//host" (protocol-relative) is not.
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/home";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // In production behind a proxy (e.g. Vercel) the load balancer host is
      // the user-facing host; honor it so we don't redirect to an internal URL.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // No code, or the exchange failed → back to login with a friendly error flag.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
