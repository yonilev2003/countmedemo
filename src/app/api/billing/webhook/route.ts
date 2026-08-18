// POST /api/billing/webhook — PSP payment notification.
//
// The PSP calls this server-to-server after a charge. We verify + parse via the
// provider seam, and on a successful payment we (idempotently) activate the
// user's subscription and record the payment + the Israeli tax invoice
// (חשבונית מס) the PSP issued. Writes use the service-role admin client (RLS is
// SELECT-only for users); nothing here trusts the browser.
//
// BETA POSTURE: until Tranzila is wired, provider.parseWebhook returns
// { paid:false }, so this just acks 200 and writes nothing. The activation path
// below is the real logic for when the seam is connected.

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/billing/provider";
import { trackFor, type PlanId } from "@/lib/billing/tracks";
import { track } from "@/lib/analytics/track";
import { isBillingEnabled } from "@/lib/billing/entitlement";
import {
  checkRateLimit,
  rateLimitResponse,
  resolveClientKey,
} from "@/lib/security/rate-limit";

const RATE_LIMIT_MAX_REQUESTS = 20; // per minute per IP

// Always ack 2xx for handled events so the PSP doesn't retry-storm.
function ack(extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...extra });
}

export async function POST(request: NextRequest) {
  // v2 plan item 2.7: this endpoint has no signature verification (locked —
  // not implementable without real Tranzila docs, see the module header) and
  // writes via the service-role client. While Tranzila is shelved and
  // BILLING_ENABLED is off, there is no legitimate caller at all, so refuse
  // before touching the request body or the DB — deliberate hardening, not a
  // behavior change to the (currently inert) activation path below. 404
  // rather than 200/403 so an unauthenticated prober learns nothing about
  // whether this route "exists" as a live integration.
  if (!isBillingEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const rl = checkRateLimit(
    "billing-webhook",
    resolveClientKey(request),
    RATE_LIMIT_MAX_REQUESTS,
  );
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    try {
      // Some PSPs post form-encoded; fall back to raw text.
      payload = Object.fromEntries(new URLSearchParams(await request.text()));
    } catch {
      return ack({ ignored: "unparseable" });
    }
  }

  // Tranzila is the only paid-track provider today.
  const result = getProvider("tranzila").parseWebhook(payload);
  if (!result.ok || !result.paid) {
    return ack({ ignored: "not_paid" });
  }

  // Reference convention set at checkout: "<userId>:<planId>".
  const [userId, planRaw] = (result.reference ?? "").split(":");
  const planId: PlanId = planRaw === "pro" ? "pro" : "free";
  if (!userId || planId === "free") {
    return ack({ ignored: "no_subscription_ref" });
  }

  try {
    const admin = createAdminClient();

    // Idempotency: skip if we've already recorded this transaction.
    if (result.transactionId) {
      const { data: existing } = await admin
        .from("payments")
        .select("id")
        .eq("psp_transaction_id", result.transactionId)
        .maybeSingle();
      if (existing) return ack({ duplicate: true });
    }

    // Never trust the charged amount from the PSP payload (result.amountAgorot) —
    // derive it from our own plan catalog by the verified planId instead, so a
    // manipulated/replayed payload can't record an inflated or deflated payment.
    const { data: plan } = await admin
      .from("plans")
      .select("price_agorot")
      .eq("id", planId)
      .maybeSingle();
    if (!plan) return ack({ ignored: "unknown_plan" });
    const amountAgorot = plan.price_agorot;

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + (trackFor(planId).planId === "pro" ? 1 : 0));

    // Activate (one active row per user is enforced by a partial unique index;
    // upsert on user_id keeps it single).
    const { data: sub } = await admin
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          plan_id: planId,
          status: "active",
          current_period_end: periodEnd.toISOString(),
          psp: "tranzila",
          psp_subscription_id: result.reference,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("id")
      .maybeSingle();

    await admin.from("payments").insert({
      user_id: userId,
      subscription_id: (sub as { id?: string } | null)?.id ?? null,
      amount_agorot: amountAgorot,
      currency: "ILS",
      status: "paid",
      psp: "tranzila",
      psp_transaction_id: result.transactionId ?? null,
      tax_invoice_number: result.taxInvoiceNumber ?? null,
      tax_invoice_url: result.taxInvoiceUrl ?? null,
      paid_at: new Date().toISOString(),
    });

    await track("subscription_activated", { planId }, { userId, path: "/api/billing/webhook" });
    return ack({ activated: true });
  } catch {
    // Don't 500 at the PSP — log-and-ack so it doesn't retry-storm; reconcile later.
    return ack({ error: "write_failed" });
  }
}
