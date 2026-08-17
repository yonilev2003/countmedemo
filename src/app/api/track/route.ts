// POST /api/track — lets Client Components emit product-analytics events.
// Thin wrapper over the server-side `track()` (lib/analytics/track.ts): it
// validates the event name against the allowed set, stamps the authenticated
// user_id server-side (clients can't forge it), and is best-effort/non-blocking.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { track, type EventName } from "@/lib/analytics/track";
import {
  checkRateLimit,
  checkRateLimitDurable,
  rateLimitResponse,
  resolveClientKey,
} from "@/lib/security/rate-limit";

const RATE_LIMIT_MAX_REQUESTS = 60; // generous — legitimate UI fires several events per page

/**
 * Hard cap on the serialized size of client-supplied event props. This route
 * writes to public.events via the service-role client with no auth required,
 * so without a cap an anonymous caller could insert MB-scale JSONB rows
 * (bounded only by the platform body limit) and grow the table/storage bill.
 * 2KB fits every legitimate event this app emits with a wide margin.
 */
const MAX_PROPS_BYTES = 2048;

const ALLOWED: ReadonlySet<string> = new Set<EventName>([
  "setup_started",
  "setup_step_completed",
  "setup_completed",
  "interactive_value_opened",
  "deadline_viewed",
  "alert_opened",
  "coach_question_asked",
  "coach_answer_cited",
  "coach_answer_escalated",
  "pricing_viewed",
  "checkout_started",
  "subscription_activated",
  "doc_created",
  "doc_marked_paid",
  "reminder_sent",
  "receivables_viewed",
  "dashboard_viewed",
]);

export async function POST(request: NextRequest) {
  // Stamp the real user server-side (do not trust a client-supplied id) before
  // rate limiting, so a signed-in user is throttled per-account rather than
  // sharing an IP-keyed bucket with everyone else behind the same NAT.
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // anonymous event — fine.
  }

  const clientKey = resolveClientKey(request, userId);
  const rl = checkRateLimit("track", clientKey, RATE_LIMIT_MAX_REQUESTS);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

  // Durable cross-instance layer too: this is an unauthenticated write channel
  // into the DB (service-role), so the per-instance in-memory limit alone
  // multiplies by warm-lambda count and resets on cold starts.
  const rlDurable = await checkRateLimitDurable(
    "track",
    clientKey,
    RATE_LIMIT_MAX_REQUESTS,
  );
  if (!rlDurable.allowed) return rateLimitResponse(rlDurable.retryAfter);

  let body: { name?: unknown; props?: unknown; path?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name : "";
  if (!ALLOWED.has(name)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Keep props small + serializable; ignore anything unexpected. Oversized
  // props are dropped (event still recorded, flagged) rather than stored.
  let props =
    body.props && typeof body.props === "object" && !Array.isArray(body.props)
      ? (body.props as Record<string, unknown>)
      : {};
  try {
    if (JSON.stringify(props).length > MAX_PROPS_BYTES) {
      props = { _dropped: "props-too-large" };
    }
  } catch {
    props = { _dropped: "props-unserializable" };
  }
  const path = typeof body.path === "string" ? body.path.slice(0, 256) : null;

  await track(name as EventName, props, { userId, path });
  return NextResponse.json({ ok: true });
}
