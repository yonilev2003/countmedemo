// POST /api/admin/review/decide — record one review decision (CPA-BNG round,
// 2026-09-08). Same ADMIN_EMAILS-only gate as the sibling GET route and
// src/app/api/admin/stats/route.ts; see that file's header comment for why
// 404-not-401 and why this is independent of AUTH_GATING_ENABLED.
//
// Append-only: every call INSERTs a new row into review_decisions, never
// UPDATEs/DELETEs — "undo" is itself a new row (decision: "undo"), so the
// full review history survives (see the migration's header comment and
// releaseStatusFor() in the sibling GET route for how "undo" is interpreted).
//
// reviewer_role is hardcoded "owner" here: everyone who passes the
// ADMIN_EMAILS gate today IS the product owner (Yoni) — external-reviewer
// auth (a CPA with read/propose-only access) is explicitly scoped OUT of
// this round (see docs/specs/ mechanism-map doc's "scoped out" section). The
// column already exists so adding that flow later is additive, not a schema
// migration.

import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkRateLimit,
  checkRateLimitDurable,
  rateLimitResponse,
  resolveClientKey,
} from "@/lib/security/rate-limit";

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

function untypedAdminClient(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

const VALID_KINDS = new Set(["rule", "deduction", "answer"]);
const VALID_DECISIONS = new Set([
  "approved",
  "change_proposed",
  "needs_info",
  "skipped",
  "undo",
]);
// Generous but bounded — a reviewer occasionally pastes a source quote into
// the note; this is an owner-only route, not a public one, so the cap exists
// only to bound a single accidental huge paste, not to fight abuse.
const MAX_NOTE_LENGTH = 4000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Light rate limit — this is an authenticated single-admin action, not a
  // public write channel, but the same durable+in-memory pattern every other
  // write route in this codebase uses (api/track, billing/checkout) costs
  // nothing to keep consistent.
  const clientKey = resolveClientKey(request, user!.id);
  const rl = checkRateLimit("admin-review-decide", clientKey, 120);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);
  const rlDurable = await checkRateLimitDurable("admin-review-decide", clientKey, 120);
  if (!rlDurable.allowed) return rateLimitResponse(rlDurable.retryAfter);

  let body: {
    itemId?: unknown;
    itemKind?: unknown;
    contentHash?: unknown;
    decision?: unknown;
    note?: unknown;
    proposedValue?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { itemId, itemKind, contentHash, decision, note, proposedValue } = body;
  if (typeof itemId !== "string" || !itemId) {
    return NextResponse.json({ error: "itemId required" }, { status: 400 });
  }
  if (typeof itemKind !== "string" || !VALID_KINDS.has(itemKind)) {
    return NextResponse.json({ error: "invalid itemKind" }, { status: 400 });
  }
  if (typeof contentHash !== "string" || !contentHash) {
    return NextResponse.json({ error: "contentHash required" }, { status: 400 });
  }
  if (typeof decision !== "string" || !VALID_DECISIONS.has(decision)) {
    return NextResponse.json({ error: "invalid decision" }, { status: 400 });
  }
  if (note !== undefined && typeof note !== "string") {
    return NextResponse.json({ error: "note must be a string" }, { status: 400 });
  }
  if (typeof note === "string" && note.length > MAX_NOTE_LENGTH) {
    return NextResponse.json({ error: "note too long" }, { status: 400 });
  }
  // A dissent/correction needs a reason on record — this is the one place
  // the API enforces what the review UI's own copy asks for.
  if ((decision === "change_proposed" || decision === "needs_info") && !note) {
    return NextResponse.json(
      { error: `note is required for decision "${decision}"` },
      { status: 400 },
    );
  }

  const { error } = await untypedAdminClient().from("review_decisions").insert({
    item_id: itemId,
    item_kind: itemKind,
    content_hash: contentHash,
    decision,
    note: typeof note === "string" ? note : null,
    proposed_value: proposedValue ?? null,
    reviewer_email: user!.email,
    reviewer_role: "owner",
  });

  if (error) {
    const code = (error as { code?: string } | null)?.code;
    const missingSchema = code && ["42P01", "PGRST205", "PGRST204"].includes(code);
    return NextResponse.json(
      {
        error: missingSchema
          ? "review_decisions table not migrated yet — see supabase/migrations/20260908120000_review_decisions.sql"
          : "failed to record decision",
      },
      { status: missingSchema ? 503 : 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
