// GET /api/cron/daily-digest — Vercel Cron entry point (vercel.json: 04:00
// UTC = 07:00 Israel, Hobby tier so daily-only + best-effort timing).
// Yoni's locked decision, 2026-08-18 (docs/plans/2026-08-18-master-task-list-v2.md
// §3.2 + §3.5): a daily email digest of quantities + system health, plus
// events retention cleanup, both driven from this one cron.
//
// AUTH: Vercel automatically sends `Authorization: Bearer ${CRON_SECRET}` on
// its own invocations once the CRON_SECRET env var is set on the project
// (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
// The same header lets this be triggered manually (e.g. `curl -H
// "Authorization: Bearer $CRON_SECRET" .../api/cron/daily-digest`) for
// testing without waiting for the schedule.
//
// Telemetry/alerts must never break the request path (repo convention) —
// but this route IS the alert; still, retention + the digest build are each
// individually try/caught (digest.ts) so a partial failure still returns a
// useful JSON summary instead of a bare 500.

import { NextResponse, type NextRequest } from "next/server";
import { buildDailyDigest, purgeOldEvents } from "@/lib/alerts/digest";
import { sendAlertEmail } from "@/lib/alerts/email";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // no secret configured — refuse rather than run open
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Retention runs first so its result can be folded INTO the digest email
  // (the whole point of "include in digest" per the task brief) rather than
  // reported only in the JSON response. Never throws — purgeOldEvents
  // catches internally and reports { ok:false } on failure.
  const retention = await purgeOldEvents();

  // digest.plain is built for future use / easy console/testing inspection —
  // sendAlertEmail (src/lib/alerts/email.ts) only accepts an `html` body
  // today, so only that half is actually emailed.
  const digest = await buildDailyDigest({ retention });

  // sendAlertEmail is fire-and-forget by design (see its own header comment):
  // it never throws and silently no-ops when RESEND_API_KEY/ALERTS_EMAIL_TO
  // aren't set, with no return signal either way. `sent` below therefore
  // means "the send was attempted without the route itself erroring", not
  // "delivery confirmed" — matching the rest of this app's alerting posture.
  let sent = false;
  try {
    await sendAlertEmail({
      subject: `countme: דייג'סט יומי — ${new Date().toISOString().slice(0, 10)}`,
      html: digest.html,
    });
    sent = true;
  } catch (err) {
    // sendAlertEmail itself never throws (see its own header comment), but
    // guard anyway — this route must return a summary either way, not 500.
    console.error("[daily-digest] send threw unexpectedly", err);
  }

  return NextResponse.json({
    ok: true,
    sent,
    deleted: retention.deleted,
  });
}
