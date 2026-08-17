// Auth guard for API route handlers — the API-side twin of the page gating in
// src/lib/supabase/proxy.ts. Pages redirect unauthenticated users to /login;
// API routes return a 401 JSON instead. Both are gated behind the same
// AUTH_GATING_ENABLED flag so auth can be deployed before it is enforced.

import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAuthGatingEnabled } from "@/lib/security/auth-gating";

export type ApiGuardResult =
  | { user: User | null; denied?: undefined }
  | { user?: undefined; denied: NextResponse };

/**
 * When AUTH_GATING_ENABLED === "true", resolve the Supabase user from the
 * session cookies (same server-client pattern as billing/checkout) and deny
 * with 401 if there is none. When the flag is off (free beta), returns
 * { user: null } and the route behaves exactly as before.
 *
 * Call AFTER rate limiting: the in-memory limiter is far cheaper than a
 * Supabase auth round-trip, so floods should be rejected first.
 *
 * Usage:
 *   const guard = await requireUserIfGated(request);
 *   if (guard.denied) return guard.denied;
 *   // guard.user is User (gated) or null (flag off)
 */
export async function requireUserIfGated(
  _request: Request,
): Promise<ApiGuardResult> {
  // Fail-closed in production: see isAuthGatingEnabled() — an unset flag no
  // longer silently disables API auth; only an explicit "false" does.
  if (!isAuthGatingEnabled()) {
    return { user: null };
  }

  // Session comes from cookies (next/headers), not from the request object —
  // the parameter is kept for future request-based checks (e.g. API tokens).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      denied: NextResponse.json(
        { error: "נדרשת התחברות. התחברי ונסי שוב." },
        { status: 401 },
      ),
    };
  }

  return { user };
}
