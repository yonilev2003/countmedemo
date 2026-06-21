// Tracks (מסלולים) — the SINGLE, explicit map of:
//   plan  →  which payment integration fulfills it  →  which features it unlocks
//
// This is intentionally the one place that answers "which tracks are paid, and
// what connection backs each". Adding a new paid track later = add a row here
// (and a plan row in the DB), pick its `provider`, list its `features`. A free
// track has provider = null (no payment integration involved).

import type { PaymentProviderId } from "./provider";

export type PlanId = "free" | "pro";

/** Paid features fenced behind a paid track. Free keeps the retention hooks. */
export type Feature =
  | "form_1301_full" // pre-filled 1301 + copy-paste
  | "form_1219_full" // הצהרת הון
  | "deduction_finder"
  | "coach_unlimited"
  | "multi_year"
  | "accountant_export";

export interface Track {
  planId: PlanId;
  he: string;
  /** null = free track, no payment integration. Otherwise the PSP that bills it. */
  provider: PaymentProviderId | null;
  /** Features this track unlocks (empty = only the free baseline). */
  features: Feature[];
}

const ALL_PAID_FEATURES: Feature[] = [
  "form_1301_full",
  "form_1219_full",
  "deduction_finder",
  "coach_unlimited",
  "multi_year",
  "accountant_export",
];

export const TRACKS: Record<PlanId, Track> = {
  free: {
    planId: "free",
    he: "חינם",
    provider: null,
    features: [],
  },
  pro: {
    planId: "pro",
    he: "מלא",
    provider: "tranzila", // ← the integration that backs the paid track
    features: ALL_PAID_FEATURES,
  },
};

export function trackFor(planId: PlanId): Track {
  return TRACKS[planId];
}

export function trackHasFeature(planId: PlanId, feature: Feature): boolean {
  return TRACKS[planId].features.includes(feature);
}
