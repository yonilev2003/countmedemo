// Payment-provider seam — provider-AGNOSTIC by design.
//
// Why an interface (not a single hard-wired PSP): countme will have several paid
// TRACKS (מסלולים), and different tracks may be fulfilled by DIFFERENT payment
// integrations. This interface + the registry below make "which integration
// backs which track" explicit and swappable. See tracks.ts for the mapping.
//
// BETA POSTURE: providers ship as READY-TO-CONNECT seams, not live integrations.
// With no credentials a provider reports isConfigured() === false and checkout
// no-ops; BILLING_ENABLED is off on top of that. Nothing charges anyone yet.

export type PaymentProviderId = "tranzila"; // extend as new tracks add integrations

export interface CheckoutRequest {
  userId: string;
  planId: string;
  amountAgorot: number; // incl. VAT
  successUrl: string;
  cancelUrl: string;
  webhookUrl: string;
  customerEmail?: string;
}

export interface CheckoutResult {
  /** Hosted payment-page URL to redirect the user to. */
  redirectUrl: string;
  /** Provider-side reference to reconcile against the webhook. */
  reference: string;
}

export interface WebhookResult {
  ok: boolean;
  reference?: string;
  transactionId?: string;
  /** The Israeli חשבונית מס the provider issued for this charge. */
  taxInvoiceNumber?: string;
  taxInvoiceUrl?: string;
  amountAgorot?: number;
  paid: boolean;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  /** True only when real credentials are present (i.e. actually connectable). */
  isConfigured(): boolean;
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
  parseWebhook(payload: unknown): WebhookResult;
}

// ── Registry ─────────────────────────────────────────────────────────────────
// Lazy import keeps this module free of any provider's runtime deps.
import { tranzilaProvider } from "./tranzila";

const REGISTRY: Record<PaymentProviderId, PaymentProvider> = {
  tranzila: tranzilaProvider,
};

export function getProvider(id: PaymentProviderId): PaymentProvider {
  return REGISTRY[id];
}
