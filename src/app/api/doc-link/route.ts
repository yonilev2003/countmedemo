import { NextResponse } from "next/server";
import { requireUserIfGated } from "@/lib/security/api-guard";
import { createClient } from "@/lib/supabase/server";
import {
  checkRateLimit,
  checkRateLimitDurable,
  rateLimitResponse,
  resolveClientKey,
} from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createDocToken,
  generateShortId,
  isDocLinkEnabled,
  verifyDocToken,
} from "@/lib/doc-link";

/**
 * POST /api/doc-link — sign a shareable read-only document link.
 * The client sends its own document data (documents live in the user's
 * persona); the server only signs + expiry-stamps it. 404s cleanly when
 * DOC_LINK_SECRET is not configured, so the UI can hide the feature.
 *
 * The document CONTENTS (amounts, customer name, invoice number) are still
 * trusted from the client — they mirror what the client already renders
 * from its own persona, and the recipient sees exactly this content either
 * way. What must not be trusted is the BUSINESS the link is branded as:
 * without a check, any authenticated caller could sign a countme-branded
 * link claiming to be issued by a DIFFERENT business (impersonation/fraud
 * risk), since `business` came from the request body with no ownership
 * check. When a user is resolved (AUTH_GATING_ENABLED=true), require that
 * business.tradeName/osekType match the caller's own saved persona.
 */
export async function POST(request: Request) {
  if (!isDocLinkEnabled()) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }

  const clientKey = resolveClientKey(request);
  const rl = checkRateLimit("doc-link", clientKey, 20);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);
  // Durable layer too — this route mints public countme-branded URLs, so the
  // per-instance in-memory budget alone is too easy to multiply.
  const rlDurable = await checkRateLimitDurable("doc-link", clientKey, 20);
  if (!rlDurable.allowed) return rateLimitResponse(rlDurable.retryAfter);

  const guard = await requireUserIfGated(request);
  if (guard.denied) return guard.denied;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const b = (raw ?? {}) as Record<string, unknown>;
  const doc = b.doc as Record<string, unknown> | undefined;
  const business = b.business as Record<string, unknown> | undefined;

  if (
    !doc ||
    !business ||
    typeof doc.invoiceNumber !== "string" ||
    typeof doc.date !== "string" ||
    typeof doc.customerName !== "string" ||
    typeof doc.description !== "string" ||
    typeof doc.amount !== "number" ||
    typeof doc.vat !== "number" ||
    typeof doc.total !== "number" ||
    typeof doc.docType !== "string" ||
    typeof business.tradeName !== "string" ||
    (business.osekType !== "patur" && business.osekType !== "morshe")
  ) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  // Length caps — the signed token embeds this content verbatim and the
  // public /d/[token] page renders it; without caps a caller could mint
  // arbitrarily large tokens/pages. Reject (not truncate): the signed
  // content must stay byte-identical to what the client renders locally.
  if (
    doc.invoiceNumber.length > 40 ||
    doc.date.length > 20 ||
    doc.customerName.length > 120 ||
    doc.description.length > 600 ||
    doc.docType.length > 30 ||
    business.tradeName.length > 120
  ) {
    return NextResponse.json({ error: "payload too large" }, { status: 400 });
  }

  if (guard.user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("persona")
      .eq("user_id", guard.user.id)
      .maybeSingle();
    const ownBusiness = (
      data?.persona as { business?: { tradeName?: string; osekType?: string } } | null
    )?.business;
    if (
      !ownBusiness ||
      ownBusiness.tradeName !== business.tradeName ||
      ownBusiness.osekType !== business.osekType
    ) {
      return NextResponse.json({ error: "business mismatch" }, { status: 403 });
    }
  }

  const token = createDocToken({
    doc: {
      invoiceNumber: doc.invoiceNumber,
      date: doc.date,
      customerName: doc.customerName,
      description: doc.description,
      amount: doc.amount,
      vat: doc.vat,
      total: doc.total,
      docType: doc.docType,
      ...(typeof doc.dueDate === "string" ? { dueDate: doc.dueDate } : {}),
      ...(typeof doc.validUntil === "string" ? { validUntil: doc.validUntil } : {}),
    },
    business: {
      tradeName: business.tradeName,
      osekType: business.osekType,
    },
  });

  // Short opaque id (QA #32 fix): the signed token alone is ~479 chars, and
  // WhatsApp's own message-linkifier only recognizes part of it as a URL —
  // recipients ended up with a truncated, dead link. A short id resolved
  // server-side (via /s/[id]) fixes that without changing the token itself.
  // Best-effort: insert failure falls back to the long /d/{token} link
  // rather than failing the whole share action.
  const shortId = await mintShortLink(token);

  return NextResponse.json({ token, shortId });
}

/**
 * Insert a doc_short_links row mapping a fresh short id to the just-minted
 * token, expiring alongside it. Returns null (never throws) on any failure
 * — missing table pre-migration, collision exhaustion, network blip — so
 * the caller can fall back to the long link instead of failing the share.
 */
async function mintShortLink(token: string): Promise<string | null> {
  const payload = verifyDocToken(token);
  if (!payload) return null; // should be unreachable — token was just minted
  const expiresAt = new Date(payload.exp * 1000).toISOString();

  try {
    const admin = createAdminClient();
    // Untyped view: doc_short_links predates the generated Supabase types
    // (same pattern as `events` in src/lib/analytics/track.ts) until the
    // migration is applied and types regenerated.
    const shortLinks = (
      admin as unknown as {
        from: (t: string) => {
          insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
        };
      }
    ).from("doc_short_links");

    // A handful of retries absorbs the astronomically rare id collision
    // (62^9 keyspace) without ever surfacing it to the user.
    for (let attempt = 0; attempt < 5; attempt++) {
      const id = generateShortId();
      const { error } = await shortLinks.insert({
        id,
        token,
        expires_at: expiresAt,
      });
      if (!error) return id;
    }
    return null;
  } catch {
    return null;
  }
}
