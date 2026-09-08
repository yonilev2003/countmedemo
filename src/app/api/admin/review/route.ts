// GET /api/admin/review — owner-only reviewable-item list for the /admin/review
// Tinder-style card UI (CPA-BNG collaboration round, 2026-09-08).
//
// GATING: identical posture to src/app/api/admin/stats/route.ts — the
// ADMIN_EMAILS allowlist is the ONLY gate, a non-admin gets 404 (never
// 401/403, so the surface's existence isn't revealed), and this is
// independent of AUTH_GATING_ENABLED (that flag governs the public app).
//
// DEGRADE GRACEFULLY: the item list itself (src/lib/review/registry.ts) is
// pure code, always available. Only the REVIEW-decision history is a DB read
// that can fail (table not yet migrated on hbsgz, transient error) — when it
// does, every item just comes back "unreviewed" instead of failing the whole
// response, same circuit-breaker spirit as stats/route.ts.

import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentSupportedTaxYear } from "@/lib/calculators/types";
import { listReviewableItems, type ReviewableItem } from "@/lib/review/registry";

export const dynamic = "force-dynamic";

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

// Same escape hatch as admin/stats + agent/tools.ts: review_decisions isn't in
// database.types.ts yet (its migration is authored but the Supabase MCP
// available to AI sessions can't reach the live project to regenerate codegen).
function untypedAdminClient(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

const MISSING_SCHEMA_CODES = new Set([
  "42P01", // undefined_table
  "42501", // insufficient_privilege
  "PGRST205", // PostgREST: table not found in schema cache
  "PGRST204", // PostgREST: column not found
]);

interface DecisionRow {
  item_id: string;
  content_hash: string;
  decision: "approved" | "change_proposed" | "needs_info" | "skipped" | "undo";
  note: string | null;
  reviewer_email: string;
  reviewer_role: "owner" | "external";
  created_at: string;
}

export type ReleaseStatus =
  | "unreviewed"
  | "approved_current"
  | "approved_stale"
  | "change_proposed_pending"
  | "needs_info_pending"
  | "skipped";

export interface ReviewItemWithStatus extends ReviewableItem {
  releaseStatus: ReleaseStatus;
  latestDecision: DecisionRow | null;
  history: DecisionRow[];
}

/**
 * Fetch every decision for the given items in one query (no per-item
 * round-trips), grouped by item_id, newest first. Returns null (not []) on
 * any failure so the caller can distinguish "table not migrated yet" from
 * "genuinely zero decisions so far" — both degrade the same way (everything
 * shows unreviewed) but the response's `decisionsAvailable` flag tells the
 * UI which one it is, worth surfacing rather than hiding.
 */
async function fetchDecisions(itemIds: string[]): Promise<Map<string, DecisionRow[]> | null> {
  try {
    const { data, error } = await untypedAdminClient()
      .from("review_decisions")
      .select("item_id, content_hash, decision, note, reviewer_email, reviewer_role, created_at")
      .in("item_id", itemIds)
      .order("created_at", { ascending: false });
    if (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code && MISSING_SCHEMA_CODES.has(code)) return new Map();
      return null;
    }
    const byItem = new Map<string, DecisionRow[]>();
    for (const row of (data ?? []) as DecisionRow[]) {
      const list = byItem.get(row.item_id) ?? [];
      list.push(row);
      byItem.set(row.item_id, list);
    }
    return byItem;
  } catch {
    return null;
  }
}

/** "undo" reverts to whatever came before it — simplest correct semantics for
 *  an append-only log: skip the undone decision and the thing it undid, then
 *  re-derive status from what remains. */
function releaseStatusFor(item: ReviewableItem, history: DecisionRow[]): ReleaseStatus {
  const effective = [...history];
  while (effective.length && effective[0].decision === "undo") {
    effective.shift(); // drop the undo marker
    effective.shift(); // drop the decision it undid
  }
  const latest = effective[0];
  if (!latest) return "unreviewed";
  switch (latest.decision) {
    case "approved":
      return latest.content_hash === item.contentHash ? "approved_current" : "approved_stale";
    case "change_proposed":
      return "change_proposed_pending";
    case "needs_info":
      return "needs_info_pending";
    case "skipped":
      return "skipped";
    default:
      return "unreviewed";
  }
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : currentSupportedTaxYear();
  if (!Number.isFinite(year)) {
    return NextResponse.json({ error: "invalid year" }, { status: 400 });
  }

  const items = listReviewableItems(year);
  const decisionsByItem = await fetchDecisions(items.map((i) => i.id));
  const decisionsAvailable = decisionsByItem !== null;
  const decisions = decisionsByItem ?? new Map<string, DecisionRow[]>();

  const withStatus: ReviewItemWithStatus[] = items.map((item) => {
    const history = decisions.get(item.id) ?? [];
    return {
      ...item,
      releaseStatus: releaseStatusFor(item, history),
      latestDecision: history[0] ?? null,
      history,
    };
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    year,
    decisionsAvailable,
    items: withStatus,
  });
}
