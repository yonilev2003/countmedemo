import { NextResponse } from "next/server";
import { google } from "googleapis";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOAuthClient } from "@/lib/google-calendar/client";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/settings/integrations?gcal_error=${encodeURIComponent(error ?? "missing code")}`, request.url),
    );
  }

  const cookieState = request.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("gcal_oauth_state="))
    ?.split("=")[1];

  if (!state || state !== cookieState) {
    return NextResponse.redirect(
      new URL("/settings/integrations?gcal_error=state_mismatch", request.url),
    );
  }

  const userIdFromState = state.split(":")[0];
  if (userIdFromState !== user.id) {
    return NextResponse.redirect(
      new URL("/settings/integrations?gcal_error=user_mismatch", request.url),
    );
  }

  const redirectUri = `${env.appUrl}/api/calendar/google/callback`;
  const oauth = getOAuthClient(redirectUri);

  try {
    const { tokens } = await oauth.getToken(code);
    if (!tokens.access_token) {
      throw new Error("no access_token returned");
    }

    // Resolve primary calendar id
    oauth.setCredentials(tokens);
    const cal = google.calendar({ version: "v3", auth: oauth });
    let primaryCalendarId = "primary";
    try {
      const { data } = await cal.calendarList.get({ calendarId: "primary" });
      primaryCalendarId = data.id ?? "primary";
    } catch {
      // ignore — we'll use "primary"
    }

    const admin = createAdminClient();
    await admin.from("user_google_tokens").upsert(
      {
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : new Date(Date.now() + 3600 * 1000).toISOString(),
        scopes: tokens.scope ?? "",
        primary_calendar_id: primaryCalendarId,
        sync_token: null,
      },
      { onConflict: "user_id" },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.redirect(
      new URL(`/settings/integrations?gcal_error=${encodeURIComponent(msg)}`, request.url),
    );
  }

  const res = NextResponse.redirect(new URL("/settings/integrations?gcal_connected=1", request.url));
  res.cookies.delete("gcal_oauth_state");
  return res;
}
