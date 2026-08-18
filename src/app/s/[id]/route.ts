import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkRateLimit,
  rateLimitResponse,
  resolveClientKey,
} from "@/lib/security/rate-limit";

// v2 plan item 2.7: this route reads via the service-role client (RLS-bypassing)
// with no auth, keyed only by the URL id — see resolveShortLink's shape check.
// The id itself is high-entropy (see the JSDoc note below), so this limiter is
// a cheap speed bump against brute-force enumeration, not the primary defense.
const RATE_LIMIT_MAX_REQUESTS = 30; // per minute per IP

/**
 * GET /s/{id} — opaque short-link resolver (QA #32 fix).
 *
 * Short ids exist purely because the full signed /d/{token} link is too
 * long for WhatsApp's own message-linkifier to recognize as one URL. This
 * route is the missing hop: look the id up, 302 to the real /d/{token}
 * page. No auth — same bearer-secret-in-the-URL model as /d/{token} itself;
 * the short id is just an alias for that same public link, not a new trust
 * boundary. Missing/expired/DB-unavailable all redirect to /d (bare), which
 * already renders the friendly "link is incomplete/expired" page — so a
 * dead short link degrades exactly like a dead long link always has.
 *
 * The id is unguessable enough to justify no-auth: generateShortId()
 * (src/lib/doc-link.ts) draws SHORT_ID_LENGTH=9 characters uniformly (via
 * crypto.randomInt, CSPRNG, no modulo bias) from a 62-symbol alphabet — that's
 * 62^9 (~1.3×10^16) possible ids. checkRateLimit below caps a single client at
 * 30 guesses/minute, so brute-forcing a live id this way is not practical.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const origin = request.nextUrl.origin;
  const missing = new URL("/d", origin);

  const rl = checkRateLimit(
    "s-shortlink",
    resolveClientKey(request),
    RATE_LIMIT_MAX_REQUESTS,
  );
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

  const token = await resolveShortLink(id);
  if (!token) return NextResponse.redirect(missing, { status: 302 });

  return NextResponse.redirect(
    new URL(`/d/${encodeURIComponent(token)}`, origin),
    { status: 302 },
  );
}

/** Returns the token for a live (found, not expired) short id, else null. */
async function resolveShortLink(id: string): Promise<string | null> {
  // Ids are always SHORT_ID_LENGTH-length base62 from generateShortId(); a
  // wildly-off-shape path segment can't be a real row, so skip the DB round
  // trip for it (defense-in-depth against pathological lookups, not a
  // security boundary — the table has no policies for anon/authenticated
  // anyway).
  if (!/^[0-9A-Za-z]{6,12}$/.test(id)) return null;

  try {
    const admin = createAdminClient();
    // Untyped view: doc_short_links predates the generated Supabase types
    // (same pattern as `events` in src/lib/analytics/track.ts) until the
    // migration is applied and types regenerated.
    const shortLinks = (
      admin as unknown as {
        from: (t: string) => {
          select: (cols: string) => {
            eq: (
              col: string,
              val: string,
            ) => {
              maybeSingle: () => Promise<{
                data: { token: string; expires_at: string } | null;
                error: unknown;
              }>;
            };
          };
        };
      }
    ).from("doc_short_links");

    const { data, error } = await shortLinks
      .select("token, expires_at")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;
    return data.token;
  } catch {
    return null;
  }
}
