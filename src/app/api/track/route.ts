// POST /api/track — lets Client Components emit product-analytics events.
// Thin wrapper over the server-side `track()` (lib/analytics/track.ts): it
// validates the event name against the allowed set, stamps the authenticated
// user_id server-side (clients can't forge it), and is best-effort/non-blocking.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { track, type EventName } from "@/lib/analytics/track";

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

  // Keep props small + serializable; ignore anything unexpected.
  const props =
    body.props && typeof body.props === "object" && !Array.isArray(body.props)
      ? (body.props as Record<string, unknown>)
      : {};
  const path = typeof body.path === "string" ? body.path.slice(0, 256) : null;

  // Stamp the real user server-side (do not trust a client-supplied id).
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

  await track(name as EventName, props, { userId, path });
  return NextResponse.json({ ok: true });
}
