// Manual sync trigger: pulls Google → DB and reports counts.
// Push (DB → Google) happens inline in the calendar action.

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { pullEventsFromGoogle } from "@/lib/google-calendar/client";

export async function POST() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: tokens } = await admin
    .from("user_google_tokens")
    .select("primary_calendar_id")
    .eq("user_id", session.user.id)
    .single();

  if (!tokens) {
    return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });
  }

  const calendarId = tokens.primary_calendar_id ?? "primary";
  const result = await pullEventsFromGoogle({
    userId: session.user.id,
    calendarId,
  });

  if (!result) {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }

  // Upsert each event into our DB. Match by google_event_id.
  let upserted = 0;
  let deleted = 0;
  for (const e of result.events) {
    if (e.status === "cancelled") {
      const { count } = await admin
        .from("calendar_events")
        .delete({ count: "exact" })
        .eq("workspace_id", session.workspace.id)
        .eq("google_event_id", e.googleEventId);
      if (count) deleted += count;
      continue;
    }

    await admin
      .from("calendar_events")
      .upsert(
        {
          workspace_id: session.workspace.id,
          title: e.title,
          description: e.description,
          location: e.location,
          start_at: e.startAt.toISOString(),
          end_at: e.endAt.toISOString(),
          all_day: e.allDay,
          google_event_id: e.googleEventId,
          google_calendar_id: calendarId,
          google_etag: e.etag,
          created_by: session.user.id,
        },
        { onConflict: "google_event_id" },
      );
    upserted++;
  }

  // Save next sync token
  if (result.nextSyncToken) {
    await admin
      .from("user_google_tokens")
      .update({ sync_token: result.nextSyncToken })
      .eq("user_id", session.user.id);
  }

  return NextResponse.json({ upserted, deleted, total: result.events.length });
}
