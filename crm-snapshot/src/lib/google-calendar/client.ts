// Google Calendar API client wrapper.
// Handles token refresh + per-user authentication.

import { google, type calendar_v3 } from "googleapis";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

const CALENDAR_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export function getOAuthClient(redirectUri: string) {
  return new google.auth.OAuth2(env.googleClientId, env.googleClientSecret, redirectUri);
}

export function buildAuthUrl(redirectUri: string, state: string): string {
  const oauth = getOAuthClient(redirectUri);
  return oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: CALENDAR_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

/**
 * Returns an authenticated calendar client for the given user.
 * Auto-refreshes the access token if it's about to expire.
 */
export async function getCalendarForUser(userId: string): Promise<calendar_v3.Calendar | null> {
  const admin = createAdminClient();
  const { data: tokens } = await admin
    .from("user_google_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!tokens) return null;

  const oauth = getOAuthClient(`${env.appUrl}/api/calendar/google/callback`);
  oauth.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: new Date(tokens.expires_at).getTime(),
  });

  // Refresh if expiring within 60s
  const expiresAt = new Date(tokens.expires_at).getTime();
  if (expiresAt - Date.now() < 60_000 && tokens.refresh_token) {
    try {
      const { credentials } = await oauth.refreshAccessToken();
      await admin
        .from("user_google_tokens")
        .update({
          access_token: credentials.access_token,
          expires_at: credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : new Date(Date.now() + 3600 * 1000).toISOString(),
        })
        .eq("user_id", userId);
    } catch (err) {
      console.error("Token refresh failed:", err);
      return null;
    }
  }

  return google.calendar({ version: "v3", auth: oauth });
}

/**
 * Push a single event to the user's Google Calendar.
 */
export async function pushEventToGoogle(args: {
  userId: string;
  calendarId: string;
  event: {
    title: string;
    description: string | null;
    location: string | null;
    start: Date;
    end: Date;
    allDay: boolean;
    attendeeEmails: string[];
    googleEventId: string | null;
  };
}): Promise<{ id: string; etag?: string } | null> {
  const cal = await getCalendarForUser(args.userId);
  if (!cal) return null;

  const body: calendar_v3.Schema$Event = {
    summary: args.event.title,
    description: args.event.description ?? undefined,
    location: args.event.location ?? undefined,
    start: args.event.allDay
      ? { date: args.event.start.toISOString().slice(0, 10) }
      : { dateTime: args.event.start.toISOString() },
    end: args.event.allDay
      ? { date: args.event.end.toISOString().slice(0, 10) }
      : { dateTime: args.event.end.toISOString() },
    attendees: args.event.attendeeEmails.map((email) => ({ email })),
  };

  try {
    if (args.event.googleEventId) {
      const res = await cal.events.update({
        calendarId: args.calendarId,
        eventId: args.event.googleEventId,
        requestBody: body,
      });
      return { id: res.data.id ?? "", etag: res.data.etag ?? undefined };
    } else {
      const res = await cal.events.insert({
        calendarId: args.calendarId,
        requestBody: body,
      });
      return { id: res.data.id ?? "", etag: res.data.etag ?? undefined };
    }
  } catch (err) {
    console.error("Google Calendar push failed:", err);
    return null;
  }
}

export async function deleteGoogleEvent(args: {
  userId: string;
  calendarId: string;
  googleEventId: string;
}): Promise<boolean> {
  const cal = await getCalendarForUser(args.userId);
  if (!cal) return false;
  try {
    await cal.events.delete({
      calendarId: args.calendarId,
      eventId: args.googleEventId,
    });
    return true;
  } catch (err) {
    console.error("Google Calendar delete failed:", err);
    return false;
  }
}

/**
 * Pull changes from Google Calendar using sync tokens.
 * On first call, performs a full sync and stores nextSyncToken.
 * Subsequent calls do incremental sync.
 */
export interface PulledEvent {
  googleEventId: string;
  status: "confirmed" | "cancelled" | "tentative";
  title: string;
  description: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  etag: string;
}

export async function pullEventsFromGoogle(args: {
  userId: string;
  calendarId: string;
}): Promise<{ events: PulledEvent[]; nextSyncToken: string } | null> {
  const cal = await getCalendarForUser(args.userId);
  if (!cal) return null;

  const admin = createAdminClient();
  const { data: tokens } = await admin
    .from("user_google_tokens")
    .select("sync_token")
    .eq("user_id", args.userId)
    .single();

  const events: PulledEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken = "";

  try {
    do {
      const res = await cal.events.list({
        calendarId: args.calendarId,
        syncToken: tokens?.sync_token ?? undefined,
        timeMin: tokens?.sync_token
          ? undefined
          : new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        showDeleted: true,
        singleEvents: true,
        maxResults: 250,
        pageToken,
      });

      for (const e of res.data.items ?? []) {
        if (!e.id) continue;
        const startStr = e.start?.dateTime ?? e.start?.date;
        const endStr = e.end?.dateTime ?? e.end?.date;
        if (!startStr || !endStr) continue;
        events.push({
          googleEventId: e.id,
          status: (e.status ?? "confirmed") as PulledEvent["status"],
          title: e.summary ?? "(ללא כותרת)",
          description: e.description ?? null,
          location: e.location ?? null,
          startAt: new Date(startStr),
          endAt: new Date(endStr),
          allDay: !!e.start?.date,
          etag: e.etag ?? "",
        });
      }

      pageToken = res.data.nextPageToken ?? undefined;
      if (res.data.nextSyncToken) nextSyncToken = res.data.nextSyncToken;
    } while (pageToken);

    return { events, nextSyncToken };
  } catch (err) {
    const e = err as { code?: number };
    // 410 GONE means our sync token is invalid — clear it and let next call do a full sync
    if (e.code === 410) {
      await admin
        .from("user_google_tokens")
        .update({ sync_token: null })
        .eq("user_id", args.userId);
    }
    console.error("Google Calendar pull failed:", err);
    return null;
  }
}
