// Root proxy — runs before every matched request (Next 16 file convention).
//
// HISTORY (2026-07-03): this file was previously `middleware.ts`. In Next 16
// the `middleware` convention was renamed to `proxy` (docs:
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md),
// and on 16.2.10 a root `middleware.ts` compiles but is NEVER INVOKED — which
// silently disabled both auth gating AND Supabase session-cookie refresh in
// production. Verified empirically (instrumented function never fired) before
// the rename. Do not recreate a `middleware.ts`.
//
// Sole job here: delegate to updateSession(), which refreshes the Supabase
// session cookies AND gates protected routes behind authentication
// (when AUTH_GATING_ENABLED === "true").

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - common static asset extensions (images, fonts)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)",
  ],
};
