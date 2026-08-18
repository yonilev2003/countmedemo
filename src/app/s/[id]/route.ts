import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const origin = request.nextUrl.origin;
  const missing = new URL("/d", origin);

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
