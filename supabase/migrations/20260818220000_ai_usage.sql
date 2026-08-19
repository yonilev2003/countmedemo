-- AI usage ledger — per-call token/cost tracking for the cost-guard system
-- (Yoni's locked decision, 2026-08-18: stay free-tier with HARD caps; see
-- docs/plans/2026-08-18-master-task-list-v2.md phase 2). Today logAiUsage
-- (src/lib/ai/models.ts) only console.logs each call — nothing is aggregated
-- anywhere, so there is no way to compute a daily spend, enforce a per-user
-- cap, or trigger the automatic Sonnet→Haiku degrade / pause. This table is
-- the one place every AI call site writes to, via recordAiUsage()
-- (src/lib/ai/usage.ts) — which also reads it back (getBudgetState()) to
-- decide whether the app should degrade or pause.
--
-- Deliberately NOT RLS-open to anon/authenticated — this is an internal
-- operational ledger, not user-facing data. Written and read only from server
-- route handlers via the service-role admin client (bypasses RLS), same
-- posture as public.rate_limit_buckets (20260805180000_durable_rate_limit.sql).
-- RLS is enabled with an explicit deny-all policy (see below) rather than
-- zero policies, so even a hypothetical anon-key query returns nothing.
--
-- DEPLOYMENT: the Supabase MCP available to this session cannot reach the
-- live project (hbsgz) — this migration is AUTHORED, not applied. It will be
-- folded into docs/launch/hbsgz-pending.sql the next time that file is
-- regenerated (phase 4, docs/plans/2026-08-18-master-task-list-v2.md §4.1).
-- Every reader (getBudgetState(), dailyUserCap() call sites) fails open /
-- treats the budget as "normal" when the table isn't reachable yet — see the
-- circuit breaker in src/lib/ai/usage.ts (same one-shot pattern as
-- src/lib/chat/history.ts's `unavailable` flag) — so shipping the code ahead
-- of this migration landing is safe.
--
-- Apply: Supabase MCP apply_migration (once reachable), `supabase db push`,
-- or paste into docs/launch/hbsgz-pending.sql's SQL editor flow.

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  -- Nullable + ON DELETE SET NULL: we want to keep the spend/cost row for
  -- budget accounting even if the user's account is later deleted — this is
  -- an operational ledger, not personal data tied 1:1 to the account.
  user_id uuid references auth.users(id) on delete set null,
  route text not null,
  model text not null,
  rounds int,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cache_creation_input_tokens bigint not null default 0,
  cache_read_input_tokens bigint not null default 0,
  est_cost_usd numeric(10,6) not null default 0,
  created_at timestamptz not null default now()
);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Same posture as rate_limit_buckets/knowledge_chunks: not user data, so RLS
-- is enabled with an explicit deny-all policy — not just "zero policies",
-- which tests/unit/security/rls-coverage.test.ts (and, per
-- 20260805181500_rate_limit_deny_policy.sql, this repo's own experience)
-- correctly treats as indistinguishable from "forgot to add a policy".
-- Explicit deny-all makes the service-role-only intent visible and
-- auditable. service_role (used by every reader/writer in this migration's
-- doc comment above, via the admin client) bypasses RLS entirely regardless
-- of policies, so this has no effect on the app's actual usage.
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

create policy ai_usage_deny_all on public.ai_usage
  for all to anon, authenticated
  using (false)
  with check (false);

-- getBudgetState()'s "sum today's spend" query and the daily digest scan
-- (docs/plans/2026-08-18-master-task-list-v2.md §3.2) both filter/order by
-- created_at only.
create index if not exists ai_usage_created_at_idx
  on public.ai_usage (created_at desc);

-- Per-user daily cap check (dailyUserCap() call sites) and per-user usage
-- history.
create index if not exists ai_usage_user_created_idx
  on public.ai_usage (user_id, created_at desc);
