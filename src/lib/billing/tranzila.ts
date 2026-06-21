// Tranzila PSP — Israeli payment provider. READY-TO-CONNECT seam, NOT live.
//
// Chosen as countme's payment integration. Tranzila supports hosted payment
// pages + recurring (הוראת קבע) and integrates issuing a חשבונית מס/קבלה — the
// things the Israeli market requires and Stripe can't do.
//
// IMPORTANT (per product decision): this is deliberately NOT wired in for real.
// Without TRANZILA_* credentials `isConfigured()` is false; createCheckout throws
// rather than silently pretending. Flip it on later by (1) providing sandbox
// creds in env, (2) implementing the two TODOs below, (3) setting BILLING_ENABLED.
//
// Docs: https://docs.tranzila.com/ (Hosted Fields / iframe + Handshake + recurring).

import type {
  PaymentProvider,
  CheckoutRequest,
  CheckoutResult,
  WebhookResult,
} from "./provider";

interface TranzilaConfig {
  terminalName: string; // "supplier" / terminal
  apiPublicKey: string;
  apiSecret: string;
  baseUrl: string;
}

function readConfig(): TranzilaConfig | null {
  const terminalName = process.env.TRANZILA_TERMINAL_NAME;
  const apiPublicKey = process.env.TRANZILA_API_PUBLIC_KEY;
  const apiSecret = process.env.TRANZILA_API_SECRET;
  if (!terminalName || !apiPublicKey || !apiSecret) return null;
  return {
    terminalName,
    apiPublicKey,
    apiSecret,
    baseUrl: process.env.TRANZILA_BASE_URL || "https://secure5.tranzila.com",
  };
}

export const tranzilaProvider: PaymentProvider = {
  id: "tranzila",

  isConfigured(): boolean {
    return readConfig() !== null;
  },

  // TODO(connect Tranzila): create a hosted-page/Handshake session with the
  // recurring config + ILS + a Document (invoice) block so Tranzila auto-issues
  // the חשבונית מס, then return its URL + reference.
  async createCheckout(_req: CheckoutRequest): Promise<CheckoutResult> {
    if (!this.isConfigured()) {
      throw new Error("Tranzila is not configured (TRANZILA_* env missing).");
    }
    throw new Error("Tranzila checkout is not connected yet (ready-to-connect seam).");
  },

  // TODO(connect Tranzila): verify the notify/callback signature against the
  // terminal secret and map Tranzila's fields into WebhookResult.
  parseWebhook(_payload: unknown): WebhookResult {
    return { ok: false, paid: false };
  },
};
