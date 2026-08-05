-- 100-user production-readiness pre-check (2026-08-05) — two Supabase advisor
-- PERFORMANCE findings, both idempotent/safe, zero authorization-semantics change.
--
-- 1. auth_rls_initplan: every per-user RLS policy called auth.uid() directly in
--    its qual/with_check, which Postgres re-evaluates ONCE PER ROW instead of
--    once per query. Wrapping it as (select auth.uid()) lets the planner treat
--    it as a stable subquery (InitPlan) evaluated once. Same result set, same
--    security guarantee — pure performance, matters once a table has more than
--    a handful of rows per user. https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
--
-- 2. unindexed_foreign_keys: 3 FK columns with no covering index, which forces
--    a full-table scan on the referencing table for any join/cascade on the
--    referenced side. Cheap to add now, expensive to discover missing at 100x
--    the current (near-zero) row count.

alter policy profiles_own on public.profiles
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy incomes_own on public.incomes
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy expenses_own on public.expenses
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy invoices_own on public.invoices
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy income_documents_own on public.income_documents
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy invoice_sends_own on public.invoice_sends
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy notifications_own on public.notifications
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy subscriptions_own_read on public.subscriptions
  using ((select auth.uid()) = user_id);

alter policy payments_own_read on public.payments
  using ((select auth.uid()) = user_id);

alter policy events_own_read on public.events
  using ((select auth.uid()) = user_id);

create index if not exists invoice_sends_income_id_idx
  on public.invoice_sends (income_id);

create index if not exists payments_subscription_id_idx
  on public.payments (subscription_id);

create index if not exists subscriptions_plan_id_idx
  on public.subscriptions (plan_id);
