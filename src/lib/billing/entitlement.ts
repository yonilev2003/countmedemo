// Entitlement layer — the single source of truth for "what is this user allowed
// to use". Paid features call `getEntitlement()` / `entitlement.has()` instead of
// reading subscription rows directly, so gating lives in one place. Which track
// unlocks which feature (and which integration bills it) is declared in tracks.ts.
//
// BETA POSTURE: while BILLING_ENABLED is off (the default), everyone is treated
// as fully entitled (free beta) — mirrors the AUTH_GATING_ENABLED pattern in
// src/lib/supabase/proxy.ts. Flip BILLING_ENABLED=true only after launch.

import { createAdminClient } from "@/lib/supabase/admin";
import { type PlanId, type Feature, trackFor, trackHasFeature } from "./tracks";

export type { PlanId, Feature } from "./tracks";

export interface Entitlement {
  plan: PlanId;
  /** True when billing is off (free beta) — every feature is open. */
  unlimited: boolean;
  has: (feature: Feature) => boolean;
}

export function isBillingEnabled(): boolean {
  return process.env.BILLING_ENABLED === "true";
}

function fullyEntitled(plan: PlanId): Entitlement {
  return { plan, unlimited: true, has: () => true };
}

function planEntitlement(plan: PlanId): Entitlement {
  const track = trackFor(plan);
  // A track with the full feature set behaves as unlimited.
  if (plan === "pro") return fullyEntitled("pro");
  return {
    plan: track.planId,
    unlimited: false,
    has: (f) => trackHasFeature(plan, f),
  };
}

/**
 * Guard for paid features (API routes / server actions). Resolves the user's
 * entitlement and returns whether the feature is allowed, so callers can fence
 * a feature in one line:
 *   const { allowed } = await requirePlan(userId, "form_1219_full");
 *   if (!allowed) return NextResponse.json({ error: "upgrade_required" }, { status: 402 });
 * While BILLING_ENABLED is off everyone is allowed (free beta).
 */
export async function requirePlan(
  userId: string | null | undefined,
  feature: Feature,
): Promise<{ allowed: boolean; entitlement: Entitlement }> {
  const entitlement = await getEntitlement(userId);
  return { allowed: entitlement.has(feature), entitlement };
}

/**
 * Resolve a user's entitlement. Server-only.
 * - Billing off → fully entitled (free beta).
 * - Billing on  → look up the active subscription; default to free.
 */
export async function getEntitlement(
  userId: string | null | undefined,
): Promise<Entitlement> {
  if (!isBillingEnabled()) return fullyEntitled("pro");
  if (!userId) return planEntitlement("free");

  try {
    const admin = createAdminClient();
    const subs = (admin as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (
            col: string,
            val: string,
          ) => {
            in: (
              col: string,
              vals: string[],
            ) => {
              maybeSingle: () => Promise<{
                data: { plan_id?: string } | null;
                error: unknown;
              }>;
            };
          };
        };
      };
    }).from("subscriptions");

    const { data } = await subs
      .select("plan_id")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .maybeSingle();

    const plan: PlanId = data?.plan_id === "pro" ? "pro" : "free";
    return planEntitlement(plan);
  } catch {
    // On any error, fail SAFE for the user (free), never crash the request.
    return planEntitlement("free");
  }
}
