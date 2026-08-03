import { NextResponse } from "next/server";
import { requireUserIfGated } from "@/lib/security/api-guard";
import { createClient } from "@/lib/supabase/server";
import {
  checkRateLimit,
  rateLimitResponse,
  resolveClientKey,
} from "@/lib/security/rate-limit";
import { createDocToken, isDocLinkEnabled } from "@/lib/doc-link";

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

  const rl = checkRateLimit("doc-link", resolveClientKey(request), 20);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

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

  return NextResponse.json({ token });
}
