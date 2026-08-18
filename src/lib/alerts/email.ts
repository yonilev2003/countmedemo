// Zero-dependency Resend wrapper — plain fetch, no SDK (per repo convention:
// no new npm dependencies). Used by the AI cost-guard (src/lib/ai/usage.ts,
// see "Phase 3.1" in docs/plans/2026-08-18-master-task-list-v2.md) for the
// immediate threshold-crossing alert, and reserved for the daily digest email
// planned in the same doc's §3.2.
//
// Sender: "onboarding@resend.dev" is Resend's shared sandbox sender — it
// works with zero setup (no domain verification) but Resend only allows it to
// deliver to the account owner's own verified email address. That's fine for
// this app's use case (every alert goes to ALERTS_EMAIL_TO, which IS the
// account owner). Once a real sending domain is verified in Resend, set
// ALERTS_EMAIL_FROM to override (e.g. "countme alerts <alerts@countme.co.il>")
// and delivery is no longer restricted to the owner's inbox.
//
// Fire-and-forget philosophy (same as src/lib/chat/history.ts and
// src/lib/security/rate-limit.ts's durable check): this must never throw and
// must never slow down the request path that triggered it. Every failure
// mode — missing env, network error, non-2xx response — is caught and
// logged, never re-thrown.

import "server-only";

const DEFAULT_FROM = "countme alerts <onboarding@resend.dev>";
const SEND_TIMEOUT_MS = 5_000;

export interface AlertEmailInput {
  subject: string;
  /** Full HTML body. Keep it self-contained — this is an internal ops email,
   *  not a user-facing brand surface, so no template system is wired in. */
  html: string;
}

/** Logged at most once per process — avoids spamming Vercel logs with the
 *  same "disabled" line on every AI call while RESEND_API_KEY is unset. */
let warnedDisabled = false;

/**
 * Send an operational alert email via Resend's HTTP API. No-ops (after a
 * one-time log line) when RESEND_API_KEY or ALERTS_EMAIL_TO isn't set —
 * callers should treat alerting as best-effort and never gate real
 * functionality on it. NEVER throws.
 */
export async function sendAlertEmail({ subject, html }: AlertEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERTS_EMAIL_TO;

  if (!apiKey || !to) {
    if (!warnedDisabled) {
      warnedDisabled = true;
      console.log("[alerts] email disabled (missing RESEND_API_KEY/ALERTS_EMAIL_TO)");
    }
    return;
  }

  const from = process.env.ALERTS_EMAIL_FROM || DEFAULT_FROM;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to, subject, html }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[alerts] Resend send failed", res.status, body);
    }
  } catch (err) {
    console.error("[alerts] Resend send threw", err);
  }
}
