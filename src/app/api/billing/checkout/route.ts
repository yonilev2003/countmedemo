// POST /api/billing/checkout — start a subscription checkout for a plan.
//
// BETA POSTURE (gated OFF): while BILLING_ENABLED is off this returns
// { disabled: true } and charges no one. When on but the PSP has no credentials
// it returns { notConnected: true }. Only with BILLING_ENABLED=true AND a
// configured provider does it create a hosted-payment-page session and return a
// redirectUrl. The user is taken from the session server-side (never trusted
// from the client); pricing/amount come from the DB plans catalog.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isBillingEnabled } from "@/lib/billing/entitlement";
import { trackFor, type PlanId } from "@/lib/billing/tracks";
import { getProvider } from "@/lib/billing/provider";
import { track } from "@/lib/analytics/track";
import {
  checkRateLimit,
  rateLimitResponse,
  resolveClientKey,
} from "@/lib/security/rate-limit";

const RATE_LIMIT_MAX_REQUESTS = 10; // per minute — starting a checkout is a rare, deliberate action

export async function POST(request: NextRequest) {
  let body: { planId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const planId: PlanId = body.planId === "pro" ? "pro" : "free";
  if (planId === "free") {
    // Free track needs no checkout.
    return NextResponse.json({ ok: true, disabled: true, reason: "free_plan" });
  }

  // Authenticated user (server-side).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  // Rate-limit AFTER auth (unlike the Claude-cost routes) — this route is
  // already gated on a Supabase round-trip regardless, so there's no cheap
  // pre-auth reject to preserve, and keying by the real user id (rather than
  // IP) is strictly better defense here.
  const rl = checkRateLimit(
    "billing-checkout",
    resolveClientKey(request, user.id),
    RATE_LIMIT_MAX_REQUESTS,
  );
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

  await track("checkout_started", { planId }, { userId: user.id, path: "/api/billing/checkout" });

  // Gated OFF → no-op (free beta).
  if (!isBillingEnabled()) {
    return NextResponse.json({ ok: true, disabled: true, reason: "billing_disabled" });
  }

  const track_ = trackFor(planId);
  if (!track_.provider) {
    return NextResponse.json({ ok: false, error: "no_provider" }, { status: 400 });
  }
  const provider = getProvider(track_.provider);
  if (!provider.isConfigured()) {
    return NextResponse.json({ ok: true, notConnected: true, reason: "psp_not_configured" });
  }

  // Price from the DB plan catalog (never trust the client).
  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("plans")
    .select("price_agorot")
    .eq("id", planId)
    .maybeSingle();
  const amountAgorot = (plan as { price_agorot?: number } | null)?.price_agorot ?? 0;
  if (amountAgorot <= 0) {
    return NextResponse.json({ ok: false, error: "invalid_price" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  try {
    const result = await provider.createCheckout({
      userId: user.id,
      planId,
      amountAgorot,
      successUrl: `${origin}/dashboard?billing=success`,
      cancelUrl: `${origin}/pricing?billing=cancel`,
      webhookUrl: `${origin}/api/billing/webhook`,
      customerEmail: user.email ?? undefined,
    });
    return NextResponse.json({ ok: true, redirectUrl: result.redirectUrl, reference: result.reference });
  } catch {
    // Ready-to-connect seam throws until Tranzila is wired — surface cleanly.
    return NextResponse.json({ ok: true, notConnected: true, reason: "psp_not_connected" });
  }
}
