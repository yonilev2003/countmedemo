// Product analytics — a single server-side `track()` that appends to the
// public.events table (see supabase/migrations/20260617091000_events.sql).
//
// Best-effort by design: analytics must NEVER break a user request. Every write
// is wrapped so a failure (missing table before the migration is applied, network
// blip, etc.) is swallowed and logged, not thrown.
//
// NOTE: until the Supabase types are regenerated to include `events`, we access
// the table through a deliberately untyped client view (`eventsTable`). Re-run
// `generate_typescript_types` after applying the migration to restore full typing.

import { createAdminClient } from "@/lib/supabase/admin";

/** Canonical event names — keep in sync with docs/gtm (PMF funnel §3.3). */
export type EventName =
  | "setup_started"
  | "setup_step_completed"
  | "setup_completed"
  | "interactive_value_opened"
  | "deadline_viewed"
  | "alert_opened"
  | "coach_question_asked"
  | "coach_answer_cited"
  | "coach_answer_escalated"
  | "pricing_viewed"
  | "checkout_started"
  | "subscription_activated"
  // beta sprint 2026-07 — documents + receivables + dashboard funnel
  | "doc_created"
  | "doc_marked_paid"
  | "reminder_sent"
  | "receivables_viewed"
  | "dashboard_viewed";

export interface TrackOptions {
  userId?: string | null;
  path?: string | null;
}

/**
 * Record a product event. Server-only. Resolves to void; never rejects.
 */
export async function track(
  name: EventName,
  props: Record<string, unknown> = {},
  opts: TrackOptions = {},
): Promise<void> {
  try {
    const admin = createAdminClient();
    // Untyped view of the not-yet-in-generated-types table.
    const eventsTable = (admin as unknown as {
      from: (t: string) => {
        insert: (rows: Record<string, unknown>) => Promise<{ error: unknown }>;
      };
    }).from("events");

    const { error } = await eventsTable.insert({
      name,
      props,
      user_id: opts.userId ?? null,
      path: opts.path ?? null,
    });
    if (error) {
      console.warn("[analytics] track failed", name, error);
    }
  } catch (err) {
    // Missing creds, missing table, etc. — never surface to the caller.
    console.warn("[analytics] track threw", name, err);
  }
}
