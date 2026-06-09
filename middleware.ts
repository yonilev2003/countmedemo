// Root proxy (a.k.a. middleware) — runs before every matched request.
//
// NOTE on Next.js 16: the `middleware` file convention is DEPRECATED and has
// been renamed to `proxy` (docs: node_modules/next/dist/docs/01-app/03-api-
// reference/03-file-conventions/proxy.md). Next 16.2.4 still recognizes a root
// `middleware.ts` for backward compatibility, so this file works as-is. To
// silence the deprecation and adopt the new convention, run:
//   npx @next/codemod@canary middleware-to-proxy .
// which renames this file to `proxy.ts` and the export to `proxy`.
//
// Sole job here: delegate to updateSession(), which refreshes the Supabase
// session cookies AND gates protected routes behind authentication.

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function middleware(request: NextRequest) {
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
