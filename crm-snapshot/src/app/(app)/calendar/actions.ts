"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushEventToGoogle, deleteGoogleEvent } from "@/lib/google-calendar/client";

export async function upsertEventAction(args: {
  id?: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  color: string;
  attendeeIds: string[];
  externalEmails: string[];
}): Promise<{ ok: true; eventId: string; googleSynced: boolean } | { ok: false; error: string }> {
  const session = await requireSession();
  const supabase = await createClient();
  const admin = createAdminClient();

  if (!args.title.trim()) return { ok: false, error: "כותרת חובה" };
  if (new Date(args.end_at).getTime() < new Date(args.start_at).getTime()) {
    return { ok: false, error: "סיום לפני ההתחלה" };
  }

  let eventId = args.id;
  let existingGoogleEventId: string | null = null;
  let existingGoogleCalendarId: string | null = null;

  if (eventId) {
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("google_event_id, google_calendar_id")
      .eq("id", eventId)
      .single();
    existingGoogleEventId = existing?.google_event_id ?? null;
    existingGoogleCalendarId = existing?.google_calendar_id ?? null;

    const { error } = await supabase
      .from("calendar_events")
      .update({
        title: args.title,
        description: args.description,
        location: args.location,
        start_at: args.start_at,
        end_at: args.end_at,
        all_day: args.all_day,
        color: args.color,
      })
      .eq("id", eventId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        workspace_id: session.workspace.id,
        title: args.title,
        description: args.description,
        location: args.location,
        start_at: args.start_at,
        end_at: args.end_at,
        all_day: args.all_day,
        color: args.color,
        created_by: session.user.id,
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "Failed" };
    eventId = data.id;
  }

  // Reset attendees
  await admin.from("event_attendees").delete().eq("event_id", eventId);
  const internalRows = args.attendeeIds.map((uid) => ({
    event_id: eventId!,
    user_id: uid,
    response: uid === session.user.id ? "accepted" : "pending",
  }));
  const externalRows = args.externalEmails.map((email) => ({
    event_id: eventId!,
    user_id: null,
    external_email: email,
    response: "pending" as const,
  }));
  if (internalRows.length > 0 || externalRows.length > 0) {
    await admin.from("event_attendees").insert([...internalRows, ...externalRows]);
  }

  // Resolve attendee emails for Google
  const { data: attendeeProfiles } =
    args.attendeeIds.length > 0
      ? await admin.from("profiles").select("email").in("id", args.attendeeIds)
      : { data: [] as { email: string }[] };
  const allEmails = [
    ...(attendeeProfiles ?? []).map((p) => p.email),
    ...args.externalEmails,
  ];

  // Push to Google if connected
  let googleSynced = false;
  const { data: tokens } = await admin
    .from("user_google_tokens")
    .select("primary_calendar_id")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (tokens) {
    const calendarId = tokens.primary_calendar_id ?? "primary";
    const pushed = await pushEventToGoogle({
      userId: session.user.id,
      calendarId,
      event: {
        title: args.title,
        description: args.description,
        location: args.location,
        start: new Date(args.start_at),
        end: new Date(args.end_at),
        allDay: args.all_day,
        attendeeEmails: allEmails,
        googleEventId: existingGoogleEventId,
      },
    });
    if (pushed) {
      googleSynced = true;
      await admin
        .from("calendar_events")
        .update({
          google_event_id: pushed.id,
          google_calendar_id: calendarId,
          google_etag: pushed.etag ?? null,
        })
        .eq("id", eventId);
    }
  }

  revalidatePath("/calendar");
  return { ok: true, eventId: eventId!, googleSynced };
}

export async function deleteEventAction(args: {
  id: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSession();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: event } = await supabase
    .from("calendar_events")
    .select("google_event_id, google_calendar_id")
    .eq("id", args.id)
    .single();

  if (event?.google_event_id && event?.google_calendar_id) {
    await deleteGoogleEvent({
      userId: session.user.id,
      calendarId: event.google_calendar_id,
      googleEventId: event.google_event_id,
    });
  }

  const { error } = await admin.from("calendar_events").delete().eq("id", args.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  return { ok: true };
}
