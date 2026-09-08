-- Review-mechanism decision log (CPA-BNG collaboration round, 2026-09-08).
--
-- Backs the /admin/review "Tinder-style" card UI: every rule/deduction/answer
-- surfaced by src/lib/review/registry.ts's listReviewableItems() can be
-- approved, sent back with a proposed change, marked needs-info, or skipped.
-- This table is the REVIEW axis only (see memory/decisions.md, the
-- Evidence/Review/Release entry added this round):
--   - Evidence  (confidenceTier) lives in code (lib/calculators/types.ts) —
--     this table never restates or overrides it.
--   - Review    (the columns below) — a human decision about a specific
--     item_id + content_hash.
--   - Release   is COMPUTED (by the API route) by comparing each item's
--     CURRENT content_hash (from the live registry) against its latest
--     decision here — a value change after an approval makes that approval
--     stale ("approved_stale") without deleting the history.
--
-- Append-only by design (never UPDATE/DELETE a row) so the full review
-- history survives a later "undo" — an undo is a NEW row, not a mutation.
--
-- Apply: Supabase MCP apply_migration, `supabase db push`, or paste in the
-- SQL editor (same hand-off convention as prior *-pending.sql rounds — the
-- Supabase MCP available to AI sessions in this repo cannot reach the live
-- hbsgz project, per memory/decisions.md).

create table if not exists public.review_decisions (
  id uuid primary key default gen_random_uuid(),
  -- Matches ReviewableItem.id from src/lib/review/registry.ts, e.g.
  -- "rule:osekPaturThreshold", "deduction:bituach-leumi", "answer:osek-types".
  item_id text not null,
  item_kind text not null check (item_kind in ('rule', 'deduction', 'answer')),
  -- Matches ReviewableItem.contentHash at decision time — lets the API detect
  -- "this item's value changed since it was last approved".
  content_hash text not null,
  decision text not null check (
    decision in ('approved', 'change_proposed', 'needs_info', 'skipped', 'undo')
  ),
  -- Free-text note (required in the UI for change_proposed/needs_info, optional otherwise).
  note text,
  -- Structured shape only for a proposed change — e.g. {"value": 130000} — never
  -- applied automatically; a human edits lib/calculators/types.ts by hand and the
  -- next listReviewableItems() call naturally produces a new content_hash.
  proposed_value jsonb,
  reviewer_email text not null,
  -- 'owner' = Yoni (the product's initial approver per this round's decision —
  -- no more blocking on Roy's sign-off, see memory/decisions.md). 'external' =
  -- an invited reviewer (e.g. a CPA) with read/propose-only access — the actual
  -- invite/auth flow is NOT built this round (see docs/specs/ mechanism-map
  -- doc's "scoped out" section), but the schema already distinguishes the role
  -- so it doesn't need a breaking migration later.
  reviewer_role text not null default 'owner' check (reviewer_role in ('owner', 'external')),
  created_at timestamptz not null default now()
);

create index if not exists review_decisions_item_id_idx
  on public.review_decisions (item_id, created_at desc);
create index if not exists review_decisions_created_at_idx
  on public.review_decisions (created_at desc);

alter table public.review_decisions enable row level security;
revoke all on public.review_decisions from anon, authenticated;

-- Same posture as ai_usage/knowledge_chunks/rate_limit_buckets: not
-- user-facing data, explicit deny-all (not just "no policy") so intent is
-- auditable and tests/unit/security/rls-coverage.test.ts stays green. Every
-- reader/writer (src/app/api/admin/review/*) goes through the service-role
-- admin client, gated server-side by the same ADMIN_EMAILS allowlist
-- src/app/api/admin/stats/route.ts already uses — RLS is defense-in-depth,
-- not the primary gate.
create policy review_decisions_deny_all on public.review_decisions
  for all to anon, authenticated
  using (false)
  with check (false);
