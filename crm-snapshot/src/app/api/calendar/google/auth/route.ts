import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireUser } from "@/lib/auth";
import { buildAuthUrl } from "@/lib/google-calendar/client";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // State carries the user id (signed-ish via random nonce in cookie ideally,
  // but for our scope we trust + verify on callback)
  const state = `${user.id}:${crypto.randomBytes(16).toString("hex")}`;
  const redirectUri = `${env.appUrl}/api/calendar/google/callback`;
  const authUrl = buildAuthUrl(redirectUri, state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("gcal_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: !env.appUrl.startsWith("http://localhost"),
    maxAge: 600,
    path: "/",
  });
  return res;
}
