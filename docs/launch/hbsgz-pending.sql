-- ══════════════════════════════════════════════════════════════════════════
-- hbsgz — כל ה-SQL הממתין, בהדבקה אחת (idempotent-where-possible — ראה
-- "Idempotent" בכל סקשן; רוב הסקשנים בטוחים לגמרי להרצה חוזרת)
--
-- הרצה: Supabase → פרויקט hbsgzelipeawkvtcazdr → SQL Editor → New query →
-- הדבק את כל הקובץ → Run. ה-editor שולח את כל הקובץ כשאילתה אחת, כך ש-Postgres
-- עוטף אותו בטרנזקציה מרומזת אחת — אם משהו נכשל, הכול מתגלגל אחורה (אין מצב
-- של "הצלחה חלקית" שמשאירה סכימה בין-לבין). לכן בטוח להריץ שוב ושוב.
--
-- נוצר במקור: 2026-07-19 (billing+events). **רגנרציה מלאה: 2026-08-18 לילה**
-- (v2 plan item 4.1) — הקובץ הקודם החזיק רק billing+events+chat_history, בעוד
-- supabase/migrations/ מכיל הרבה יותר, כולל **שתי המיגרציות הקריטיות של
-- rate-limiting עמיד** — בלעדיהן checkRateLimitDurable נכשל-פתוח בפרודקשן
-- (ראה memory/decisions.md, סשן 18/08 לילה). זו הייתה בדיוק הבעיה שהובילה
-- לרגנרציה הזו.
--
-- ── כבר חי ב-hbsgz (הוכחה חזקה, לא ניחוש) — הוצא מהקובץ, לא להריץ שוב ────────
--   • 20260610090000_countme_init.sql — הסכמה הבסיסית (profiles/incomes/...).
--     ידוע חי מאז 2026-06-10 (memory/decisions.md "פיילוט SaaS חי").
--   • 20260805170000_rls_perf_fk_index.sql — תוקן ואומת חי מול hbsgz באודיט
--     05/08 (memory/STATUS.md "וידוא-דומיין... policy RLS, אומת ותוקן חי").
--   • 20260818090000_doc_short_links.sql — הוחל חי באותו יום שנכתב, 18/08
--     (memory/progress.md "מיגרציה הוחלה חי" בפסקת "וואטסאפ 404").
--
-- ── הערה חשובה: billing.sql + events.sql (17/06) — כנראה כבר חיים ────────────
-- לא רשומים כ"מאומת" במפורש בזיכרון, אבל יש הוכחה עקיפה חזקה: rls_perf_fk_index.sql
-- (מאומת חי, ראה למעלה) מכיל `alter policy subscriptions_own_read`, `alter policy
-- payments_own_read`, `alter policy events_own_read` — פקודות שהיו נכשלות
-- ("policy does not exist") אילו הטבלאות/המדיניות של billing.sql+events.sql לא
-- היו כבר קיימות ב-05/08. לכן שני הקבצים האלה מסומנים "LIKELY APPLIED — VERIFY"
-- ולא "NOT APPLIED" — אבל עדיין מוצגים כאן במלואם (verbatim), כי אין ראיה-קשה
-- ישירה (רק היסק), ולפי ההנחיה: להוציא מהקובץ רק עם ראיה-קשה ישירה.
-- ⚠️ תופעת-לוואי אם באמת כבר חיים: ה-DROP+CREATE POLICY בתוך billing.sql/
-- events.sql (למטה) יאפסו את שלוש המדיניות האלה בחזרה ל-qual הלא-ממוטב
-- (`auth.uid() = user_id` במקום `(select auth.uid()) = user_id`) — בגלל זה
-- מיד אחרי שני הסקשנים האלה יש בלוק-בטיחות קטן שמחזיר את ה-qual הממוטב
-- (idempotent, ALTER POLICY בטוח להרצה חוזרת ללא תנאי).
--
-- ── מבנה הקובץ: סקשנים בסדר timestamp מדויק, לכל סקשן: מקור, סטטוס, idempotent
-- Status: NOT APPLIED · LIKELY APPLIED — VERIFY · UNKNOWN
-- ══════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 1 — billing / subscriptions schema
-- Source: supabase/migrations/20260617090000_billing.sql
-- Status: LIKELY APPLIED — VERIFY (ראו ההסבר למעלה)
-- Idempotent: כן, במלואו (create table if not exists / create or replace /
--   drop-then-create policy / insert...on conflict do update) — בטוח להרצה חוזרת.
-- ══════════════════════════════════════════════════════════════════════════

-- countme — billing / subscriptions schema (idempotent; safe to re-run).
--
-- Adds the monetization layer: a plan catalog, per-user subscriptions, and a
-- payments ledger that records the Israeli tax invoice (חשבונית מס) the PSP
-- issues for each charge. Auth stays on Supabase (this only adds tables).
--
-- BETA POSTURE: the app reads these tables but the checkout flow is gated OFF by
-- the BILLING_ENABLED env flag (see src/lib/billing/*). Everyone is "free" until
-- that flag flips. Nothing here charges anyone.
--
-- Apply: Supabase MCP apply_migration, `supabase db push`, or paste in SQL editor.

-- ── Plan catalog (global reference, like tax_rules) ──────────────────────────
create table if not exists public.plans (
  id text primary key,                         -- 'free' | 'pro' | ...
  name_he text not null,
  description_he text,
  -- price stored in agorot (₪ * 100) to avoid float drift; INCLUDES VAT (Israeli
  -- consumer prices are shown incl. VAT). 0 = free tier.
  price_agorot integer not null default 0,
  billing_interval text not null default 'month'
    check (billing_interval = any (array['month','year','once'])),
  -- Which payment integration fulfills this (paid) track. NULL = free track, no
  -- PSP. Lets different paid tracks route to different integrations explicitly
  -- (mirrors src/lib/billing/tracks.ts).
  provider text,                               -- e.g. 'tranzila'
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ── Per-user subscription (one active row per user enforced by partial index) ─
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status text not null default 'inactive'
    check (status = any (array['inactive','trialing','active','past_due','canceled'])),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  -- PSP linkage (Cardcom/Grow). Nullable while BILLING_ENABLED is off.
  psp text,                                    -- 'cardcom' | 'grow' | ...
  psp_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one non-canceled subscription per user.
create unique index if not exists subscriptions_one_active_per_user
  on public.subscriptions(user_id)
  where status <> 'canceled';

-- ── Payments ledger — records each charge + the Israeli tax invoice ──────────
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount_agorot integer not null,             -- INCLUDES VAT
  currency text not null default 'ILS',
  status text not null default 'pending'
    check (status = any (array['pending','paid','failed','refunded'])),
  psp text,
  psp_transaction_id text,
  -- The חשבונית מס the PSP issued for this payment (Cardcom returns these).
  tax_invoice_number text,
  tax_invoice_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists payments_user_id_idx       on public.payments(user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.plans         enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments      enable row level security;

-- plans: global catalog — authenticated may READ; writes via service-role only.
drop policy if exists plans_read on public.plans;
create policy plans_read on public.plans for select to authenticated using (true);

-- subscriptions/payments: a user may READ only their own rows. WRITES happen
-- server-side via the service-role client (PSP webhook), never from the browser,
-- so we intentionally grant SELECT only to authenticated users here.
do $$
declare t text;
begin
  foreach t in array array['subscriptions','payments']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_own_read', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (auth.uid() = user_id)',
      t || '_own_read', t);
  end loop;
end $$;

-- ── Seed the plan catalog (GTM model A: free tier + paid) ────────────────────
-- Prices are HYPOTHESES to test in the pilot (docs/gtm). incl. VAT, in agorot.
insert into public.plans (id, name_he, description_he, price_agorot, billing_interval, provider, sort_order)
values
  ('free', 'חינם', 'מועדים, התראות, מעקב תקרה וצ׳אט בסיסי', 0, 'month', null, 0),
  ('pro',  'מלא',  'טופס 1301 ממולא, מאתר ניכויים, איתן ללא הגבלה, רב-שנתי וייצוא לרו״ח', 3900, 'month', 'tranzila', 1)
on conflict (id) do update
  set name_he = excluded.name_he,
      description_he = excluded.description_he,
      price_agorot = excluded.price_agorot,
      billing_interval = excluded.billing_interval,
      provider = excluded.provider,
      sort_order = excluded.sort_order;


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 2 — product analytics events
-- Source: supabase/migrations/20260617091000_events.sql
-- Status: LIKELY APPLIED — VERIFY (ראו ההסבר בראש הקובץ)
-- Idempotent: כן, במלואו.
-- ══════════════════════════════════════════════════════════════════════════

-- countme — product analytics events (idempotent; safe to re-run).
--
-- A single append-only event log so the pilot/beta is MEASURABLE (GTM §3:
-- activation → aha → retention → referral). One row per tracked interaction.
-- Lightweight on purpose — graduate to PostHog later if volume demands.
--
-- Apply: Supabase MCP apply_migration, `supabase db push`, or paste in SQL editor.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  -- nullable: anonymous/pre-auth events (e.g. landing, demo) are still useful.
  user_id uuid references auth.users(id) on delete set null,
  name text not null,                          -- e.g. 'setup_completed'
  props jsonb not null default '{}'::jsonb,
  -- coarse client info, no PII beyond what the user already gave us.
  path text,
  created_at timestamptz not null default now()
);

create index if not exists events_name_idx       on public.events(name);
create index if not exists events_user_id_idx     on public.events(user_id);
create index if not exists events_created_at_idx  on public.events(created_at);

alter table public.events enable row level security;

-- Writes go through the server (service-role) so we can stamp user_id reliably
-- and clients can't forge other users' events. A user may READ only their own.
drop policy if exists events_own_read on public.events;
create policy events_own_read on public.events
  for select to authenticated using (auth.uid() = user_id);


-- ══════════════════════════════════════════════════════════════════════════
-- SAFETY NET — re-assert the perf-optimized RLS quals for subscriptions/
-- payments/events, in case SECTION 1+2 above (billing.sql/events.sql) just
-- reset them to the pre-optimization form.
--
-- Not a migration file on its own — synthesized here from the ALTER POLICY
-- statements in the already-applied 20260805170000_rls_perf_fk_index.sql
-- (excluded above as already-live), scoped ONLY to the 3 policies that
-- SECTION 1+2 can touch. ALTER POLICY is unconditionally idempotent — running
-- it again when the qual is already optimized is a pure no-op, so this is
-- safe to run regardless of whether SECTION 1+2 above were no-ops or real
-- writes. See supabase/migrations/20260805170000_rls_perf_fk_index.sql for
-- the full original migration (also covers tables not touched by this file).
-- ══════════════════════════════════════════════════════════════════════════

alter policy subscriptions_own_read on public.subscriptions
  using ((select auth.uid()) = user_id);

alter policy payments_own_read on public.payments
  using ((select auth.uid()) = user_id);

alter policy events_own_read on public.events
  using ((select auth.uid()) = user_id);


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 3 — harden per-user numbering RPCs
-- Source: supabase/migrations/20260723120000_harden_numbering_rpcs.sql
-- Status: UNKNOWN
-- Idempotent: כן (create or replace function / drop function if exists).
-- הערה: הפונקציות שנוצרות כאן נמחקות שוב ב-SECTION 8 למטה (הן הפכו יתומות
-- אחרי ש-SECTION 7 מוחק את הטבלאות שהן קוראות מהן) — כלומר המצב הסופי בסוף
-- הקובץ הוא "הפונקציות לא קיימות" בכל מקרה. עדיין כלול verbatim ובסדר
-- הכרונולוגי הנכון, כי ה-CREATE עצמו לא נכשל (Postgres לא מאמת existence של
-- טבלאות בגוף פונקציית plpgsql בזמן היצירה, רק בזמן הרצה).
-- ══════════════════════════════════════════════════════════════════════════

-- Harden the per-user numbering RPCs against cross-tenant misuse (2026-07-23).
--
-- get_next_invoice_number / get_next_doc_number are SECURITY DEFINER (they run
-- as the owner and bypass RLS) and accepted an ARBITRARY p_user_id, so any
-- authenticated caller could read another user's current counter — a minor
-- cross-tenant info leak. The app does NOT call these (numbering is derived
-- client-side from persona.invoiceCounter/docCounters), so this is pure
-- defence-in-depth with zero runtime impact.
--
-- Fix: derive the user from auth.uid() INSIDE the function instead of trusting a
-- parameter, and refuse an unauthenticated call. Idempotent; safe to re-run.
-- Apply on hbsgz (Supabase → SQL Editor) — the MCP account can't reach it.

create or replace function public.get_next_invoice_number()
returns integer language plpgsql security definer
set search_path = public as $$
declare
  uid uuid := auth.uid();
  next_num integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  select coalesce(max(invoice_number), 0) + 1 into next_num
  from public.invoices where user_id = uid;
  return next_num;
end;
$$;

create or replace function public.get_next_doc_number()
returns integer language plpgsql security definer
set search_path = public as $$
declare
  uid uuid := auth.uid();
  next_num integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  perform pg_advisory_xact_lock(hashtext('doc_number:' || uid::text));
  select coalesce(max(doc_number), 0) + 1 into next_num
  from public.income_documents where user_id = uid;
  return next_num;
end;
$$;

-- Retire the old parameterized signatures so no caller can pass an arbitrary id.
drop function if exists public.get_next_invoice_number(uuid);
drop function if exists public.get_next_doc_number(uuid);


-- ══════════════════════════════════════════════════════════════════════════
-- [20260805170000_rls_perf_fk_index.sql הוצא — כבר חי, ראו הערה בראש הקובץ]
-- ══════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 4 — durable, cross-instance rate limiting  ⚠️ CRITICAL
-- Source: supabase/migrations/20260805180000_durable_rate_limit.sql
-- Status: UNKNOWN — HIGH SUSPICION NOT APPLIED. memory/decisions.md (סשן
--   18/08 לילה) מתעד במפורש: "ה-rate-limiting העמיד בכלל לא פעיל בפרודקשן —
--   checkRateLimitDurable נכשל-פתוח אם מיגרציית durable_rate_limit לא
--   הודבקה ב-hbsgz, ו-hbsgz-pending.sql לא כולל אותה" — כלומר עד הרגנרציה
--   הזו, המיגרציה הקריטית הזו מעולם לא הייתה בקובץ ההדבקה היחיד, כך שסביר
--   שהיא מעולם לא הוחלה. **זו הסיבה המרכזית לרגנרציה של הקובץ הזה הלילה —
--   להריץ ולוודא קודם כול.**
-- Idempotent: כן, במלואו (create table if not exists / enable rls + revoke
--   הם no-op בהרצה חוזרת / create or replace function / revoke+grant execute).
-- ══════════════════════════════════════════════════════════════════════════

-- Durable, cross-instance rate limiting (2026-08-05) — 100-user readiness
-- audit CRITICAL finding: the existing in-memory limiter (src/lib/security/
-- rate-limit.ts) is per-serverless-instance, so under real concurrency a
-- client effectively gets (limit × warm instances) requests per window, not
-- the intended limit. This table + RPC give the app a shared counter every
-- instance hits, so the count is real regardless of scale-out.
--
-- Deliberately NOT RLS-open to anon/authenticated: this isn't user data, it's
-- an internal counter, called only from server route handlers via the
-- service-role admin client (which bypasses RLS) through the RPC below.
-- RLS is still enabled (defense-in-depth) with zero policies, so even a
-- hypothetical anon-key query returns nothing.

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);

alter table public.rate_limit_buckets enable row level security;
revoke all on public.rate_limit_buckets from anon, authenticated;

-- Atomic check-and-increment. A single INSERT ... ON CONFLICT DO UPDATE is
-- one statement in Postgres, so concurrent callers for the same bucket_key
-- serialize on the row lock instead of racing a read-then-write.
create or replace function public.check_rate_limit(
  p_bucket_key text,
  p_max integer,
  p_window_seconds integer
) returns table(allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count integer;
  v_reset_at timestamptz;
begin
  insert into public.rate_limit_buckets (bucket_key, count, reset_at)
  values (p_bucket_key, 1, v_now + make_interval(secs => p_window_seconds))
  on conflict (bucket_key) do update
    set count = case
          when rate_limit_buckets.reset_at <= v_now then 1
          else rate_limit_buckets.count + 1
        end,
        reset_at = case
          when rate_limit_buckets.reset_at <= v_now then v_now + make_interval(secs => p_window_seconds)
          else rate_limit_buckets.reset_at
        end
  returning rate_limit_buckets.count, rate_limit_buckets.reset_at into v_count, v_reset_at;

  if v_count > p_max then
    return query select false, greatest(0, ceil(extract(epoch from (v_reset_at - v_now))))::integer;
  else
    return query select true, null::integer;
  end if;
end;
$$;

revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 5 — rate_limit_buckets explicit deny-all policy
-- Source: supabase/migrations/20260805181500_rate_limit_deny_policy.sql
-- Status: UNKNOWN (paired with SECTION 4 — same suspicion applies)
-- Idempotent: GUARDED. Original is a plain `create policy` (errors on
--   re-run: "policy already exists") — wrapped below in a trivial, provably
--   equivalent IF NOT EXISTS guard via pg_policies. See original file for
--   the unwrapped statement.
-- ══════════════════════════════════════════════════════════════════════════

-- rate_limit_buckets was created with RLS enabled but zero policies, relying
-- on the implicit "no policy = deny all" behavior plus an explicit revoke.
-- tests/unit/security/rls-coverage.test.ts correctly flags that as
-- indistinguishable from "forgot to add a policy" — its own docstring's
-- philosophy is that intent should be explicit and auditable, not implicit.
-- This policy makes the deny-all intent visible: anon/authenticated always
-- get `false`, so no row is ever visible or writable through those roles.
-- service_role (used by check_rate_limit's SECURITY DEFINER context via the
-- admin client) bypasses RLS entirely regardless of policies, so this has no
-- effect on the app's actual usage.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'rate_limit_buckets'
      and policyname = 'rate_limit_buckets_deny_all'
  ) then
    create policy rate_limit_buckets_deny_all on public.rate_limit_buckets
      for all to anon, authenticated
      using (false)
      with check (false);
  end if;
end $$;


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 6 — receipts Storage bucket
-- Source: supabase/migrations/20260812130000_receipts_storage.sql
-- Status: UNKNOWN
-- Idempotent: כן (insert...on conflict do nothing / drop-then-create policy).
-- ══════════════════════════════════════════════════════════════════════════

-- Private Storage bucket for expense-receipt uploads (W5, 2026-08-12).
--
-- Path convention: receipts/{auth.uid()}/{filename} — RLS restricts each user
-- to their own folder, same "own data only" model as every table in this
-- schema (see countme_init.sql).
--
-- 7-year retention: no delete policy is granted to `authenticated` — the app
-- never hard-deletes a receipt object. "Deleting" an expense in the UI only
-- soft-deletes its row in persona.income.expenses (sets deletedAt), the file
-- stays in Storage. A scheduled purge job for objects past the retention
-- window is future work (documented, not built — beta scale, ≤100 users).

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "receipts_own_read" on storage.objects;
create policy "receipts_own_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipts_own_insert" on storage.objects;
create policy "receipts_own_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipts_own_update" on storage.objects;
create policy "receipts_own_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- No delete policy for `authenticated` — enforces 7-year retention at the RLS
-- layer itself, not just in application code. Only service-role (a future
-- purge job) can remove objects past the retention window.


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 7 — drop 6 unused relational tables
-- Source: supabase/migrations/20260813120000_drop_unused_relational_tables.sql
-- Status: UNKNOWN
-- Idempotent: כן (drop table if exists — no-op אם כבר נמחקו).
-- ══════════════════════════════════════════════════════════════════════════

-- Drop 6 unused relational tables (0 rows in production, 0 code references anywhere
-- in src/). The app's actual data model is persona-JSONB-in-profiles.persona, not
-- a relational shape — these tables were scaffolded in the initial migration
-- (20260610090000_countme_init.sql) before that pattern was settled, and the app
-- never moved onto them. Confirmed via repo-wide grep (zero `.from("<table>")`
-- calls) and live row counts (all 0) before dropping. profiles/plans/subscriptions/
-- payments/events/rate_limit_buckets/tax_rules are NOT touched — those are either
-- actively used or intentionally kept per a locked product decision (billing seam).
--
-- If real relational storage is needed later, design it fresh against the actual
-- current data model (persona.income.expenses[]/invoices[] shape in src/lib/
-- persona.ts), not by resurrecting this dropped schema.

-- invoice_sends must drop before incomes (invoice_sends_income_id_fkey).
-- No other FK crosses between these 6 tables and anything else in the schema
-- (verified via list_tables verbose=true) -- no CASCADE needed.
drop table if exists public.expenses;
drop table if exists public.invoice_sends;
drop table if exists public.incomes;
drop table if exists public.invoices;
drop table if exists public.income_documents;
drop table if exists public.notifications;


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 8 — drop orphaned numbering RPCs
-- Source: supabase/migrations/20260816120000_drop_orphaned_numbering_rpcs.sql
-- Status: UNKNOWN
-- Idempotent: כן (drop function if exists).
-- ══════════════════════════════════════════════════════════════════════════

-- get_next_invoice_number() and get_next_doc_number() (added in
-- 20260723120000_harden_numbering_rpcs.sql) select from public.invoices /
-- public.income_documents, both dropped in 20260813120000_drop_unused_
-- relational_tables.sql. That drop migration verified zero client-side
-- `.from("<table>")` calls before dropping the tables, but didn't check for
-- SQL-level dependents inside function bodies -- these two functions were
-- missed and would now throw "relation does not exist" if ever invoked.
-- Confirmed unused (grep for get_next_invoice_number/get_next_doc_number in
-- src/ finds only stale generated-type declarations, no real `.rpc()` call).
drop function if exists public.get_next_invoice_number();
drop function if exists public.get_next_doc_number();


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 9 — pin search_path on set_updated_at()
-- Source: supabase/migrations/20260816130000_pin_search_path_set_updated_at.sql
-- Status: UNKNOWN
-- Idempotent: כן (alter function ... set search_path — קביעת אותו ערך שוב
--   היא no-op).
-- ══════════════════════════════════════════════════════════════════════════

-- Supabase security advisor (function_search_path_mutable): a function without a
-- pinned search_path can be hijacked by an attacker who can create objects in a
-- schema earlier on the caller's search_path. set_updated_at() only assigns
-- new.updated_at = now() (no table/function references), so pinning to '' is
-- safe and silences the advisor with zero behavior change.
alter function public.set_updated_at() set search_path = '';


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 10 — rate_limit_buckets purge + index
-- Source: supabase/migrations/20260816140000_rate_limit_bucket_purge.sql
-- Status: UNKNOWN
-- Idempotent: כן (create index if not exists / create or replace function —
--   זו הגרסה הסופית של check_rate_limit, מחליפה את זו מ-SECTION 4).
-- ══════════════════════════════════════════════════════════════════════════

-- Security-audit finding (16/08/2026): rate_limit_buckets grows without bound —
-- check_rate_limit inserts one row per namespace:key and nothing ever deletes
-- expired rows. Keys on the Claude routes are pre-auth and IP-derived, so IPv6
-- rotation can mint unlimited rows (the durable limiter itself becomes a
-- storage-DoS vector). Fix: piggyback a probabilistic purge of long-expired
-- rows onto the existing RPC (~1% of calls, so the limiter's hot path stays a
-- single statement almost always), plus an index so the purge stays cheap.

create index if not exists rate_limit_buckets_reset_at_idx
  on public.rate_limit_buckets (reset_at);

create or replace function public.check_rate_limit(
  p_bucket_key text,
  p_max integer,
  p_window_seconds integer
) returns table(allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count integer;
  v_reset_at timestamptz;
begin
  -- Opportunistic cleanup: on ~1% of calls, drop rows whose window expired
  -- over an hour ago. Bounded table size without pg_cron or a separate job.
  if random() < 0.01 then
    delete from public.rate_limit_buckets
    where reset_at < v_now - interval '1 hour';
  end if;

  insert into public.rate_limit_buckets (bucket_key, count, reset_at)
  values (p_bucket_key, 1, v_now + make_interval(secs => p_window_seconds))
  on conflict (bucket_key) do update
    set count = case
          when rate_limit_buckets.reset_at <= v_now then 1
          else rate_limit_buckets.count + 1
        end,
        reset_at = case
          when rate_limit_buckets.reset_at <= v_now then v_now + make_interval(secs => p_window_seconds)
          else rate_limit_buckets.reset_at
        end
  returning rate_limit_buckets.count, rate_limit_buckets.reset_at into v_count, v_reset_at;

  if v_count > p_max then
    return query select false, greatest(0, ceil(extract(epoch from (v_reset_at - v_now))))::integer;
  else
    return query select true, null::integer;
  end if;
end;
$$;


-- ══════════════════════════════════════════════════════════════════════════
-- [20260818090000_doc_short_links.sql הוצא — כבר חי, ראו הערה בראש הקובץ]
-- ══════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 11 — knowledge vault storage (RAG)
-- Source: supabase/migrations/20260818100000_knowledge_chunks.sql
-- Status: NOT APPLIED
-- Idempotent: GUARDED. Original has one plain `create policy
--   knowledge_chunks_deny_all` (errors on re-run) — wrapped below in a
--   trivial, provably equivalent IF NOT EXISTS guard. Everything else in
--   this section (create extension/table/index if not exists, create or
--   replace function, revoke/grant) is already idempotent verbatim.
-- הערה: הפונקציה search_knowledge_chunks שנוצרת כאן מוחלפת מיד ב-SECTION 12
-- (create or replace) — היא כאן כדי לשמר את הסדר הכרונולוגי המדויק; התוצאה
-- הסופית תואמת רק ל-SECTION 12.
-- ══════════════════════════════════════════════════════════════════════════

-- Knowledge vault storage (RAG audit #20, 2026-08-18).
--
-- Architecture (approved by Yoni, 18/08 — ZERO new paid vendors, Claude-only):
-- the knowledge/**/*.md Obsidian vault is the durable source; a deploy-time
-- indexer (scripts/index-knowledge.mjs) parses front-matter + body + chunks
-- long notes on headings, then upserts rows here. Retrieval is Claude-native:
-- a prompt-cached table-of-contents (knowledge/toc.generated.json) plus two
-- tools — search_knowledge (one hybrid SQL: trgm similarity + FTS rank,
-- expanded one hop through links/form_fields) and read_knowledge (full
-- bodies by id). NO embeddings, NO external APIs — pg_trgm + FTS 'simple'
-- are both free and Hebrew-friendly (simple config does no English stemming,
-- so it does not mis-stem Hebrew tokens either).
--
-- IMPORTANT — numbers never live here as authority: notes may explain a rule
-- in prose, but every quoted figure in a chat answer must come from
-- lib/calculators (via get_form_value/get_tax_estimate/etc.), never from a
-- knowledge_chunks.body string. This table is prose + pointers only.
--
-- Same posture as rate_limit_buckets/doc_short_links: not user data, so RLS
-- is enabled with an explicit deny-all policy (defense-in-depth + makes the
-- service-role-only intent auditable — see rls-coverage.test.ts, which
-- requires every table to declare at least one policy). All reads/writes go
-- through the admin client (scripts/index-knowledge.mjs at deploy time,
-- lib/agent/tools.ts's search/read tools at request time), which uses the
-- service-role key and bypasses RLS by design.

create extension if not exists pg_trgm;

create table if not exists public.knowledge_chunks (
  id text primary key,
  -- Path of the source note relative to knowledge/, e.g.
  -- "regulatory/osek-zeir.md". Multiple chunk rows can share a note_path
  -- when a long note is split on headings (id disambiguates: "{note_path}#{slug}").
  note_path text not null,
  title text not null,
  topic text,
  tags text[] not null default '{}',
  -- 1301 field codes this chunk is relevant to (e.g. '{030,137}') — lets
  -- search_knowledge expand one hop from a field the user asked about.
  form_fields text[] not null default '{}',
  -- True when the chunk states a rate/cap/threshold that changes by tax
  -- year — surfaced to the model as a reason to double-check via the
  -- calculator tools rather than trust the prose figure.
  year_sensitive boolean not null default false,
  body text not null default '',
  -- [[wikilink]] targets found in the note body (the relation graph edges).
  links text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.knowledge_chunks enable row level security;
revoke all on public.knowledge_chunks from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'knowledge_chunks'
      and policyname = 'knowledge_chunks_deny_all'
  ) then
    create policy knowledge_chunks_deny_all on public.knowledge_chunks
      for all to anon, authenticated
      using (false)
      with check (false);
  end if;
end $$;

-- Re-run of the indexer on every note (even unchanged ones) is fine, but
-- deleting rows for notes removed from the vault filters by note_path.
create index if not exists knowledge_chunks_note_path_idx
  on public.knowledge_chunks (note_path);

-- Fuzzy/substring matching (typo-tolerant, no exact-token requirement).
-- gin_trgm_ops on the concatenated title+body is the standard pg_trgm
-- similarity-search index shape.
create index if not exists knowledge_chunks_trgm_idx
  on public.knowledge_chunks using gin ((title || ' ' || body) gin_trgm_ops);

-- Keyword/ranked search. 'simple' config (not 'english') deliberately: it
-- does no stemming, which means it neither helps nor hurts Hebrew tokens —
-- 'english' stemming rules would actively corrupt them.
create index if not exists knowledge_chunks_fts_idx
  on public.knowledge_chunks using gin (to_tsvector('simple', title || ' ' || body));

-- Reuses the shared trigger function (defined in billing.sql, search_path
-- pinned in 20260816130000) — same pattern as public.subscriptions.
drop trigger if exists knowledge_chunks_set_updated_at on public.knowledge_chunks;
create trigger knowledge_chunks_set_updated_at
  before update on public.knowledge_chunks
  for each row execute function public.set_updated_at();

-- Hybrid search RPC: fuses trgm similarity + FTS rank into one score, then
-- expands one hop through links/form_fields so a query that matches one
-- chunk also surfaces its directly-linked neighbors. security definer +
-- pinned search_path (same posture as check_rate_limit) since it must read
-- through the deny-all RLS above; execute is service_role only, so only the
-- server-side search_knowledge tool (never anon/authenticated) can call it.
create or replace function public.search_knowledge_chunks(
  p_query text,
  p_limit integer default 8
) returns table(
  id text,
  note_path text,
  title text,
  topic text,
  form_fields text[],
  year_sensitive boolean,
  snippet text,
  score real
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  with scored as (
    select
      k.id,
      k.note_path,
      k.title,
      k.topic,
      k.form_fields,
      k.year_sensitive,
      k.links,
      left(k.body, 280) as snippet,
      -- Weighted fusion: FTS rank is unbounded-ish, similarity is 0..1 —
      -- similarity carries more weight so a close fuzzy/typo match doesn't
      -- get buried under a long chunk with a high raw ts_rank.
      (
        coalesce(ts_rank(to_tsvector('simple', k.title || ' ' || k.body), plainto_tsquery('simple', p_query)), 0)
        + similarity(k.title || ' ' || k.body, p_query) * 2
      ) as base_score
    from public.knowledge_chunks k
    where
      to_tsvector('simple', k.title || ' ' || k.body) @@ plainto_tsquery('simple', p_query)
      or (k.title || ' ' || k.body) % p_query
  ),
  top as (
    select * from scored order by base_score desc limit greatest(p_limit, 1)
  ),
  -- One-hop expansion: chunks whose note_path is a link target of a top hit,
  -- or that share a form_field with a top hit, scored lower than any direct
  -- hit so they only fill remaining slots.
  expanded as (
    select
      k.id, k.note_path, k.title, k.topic, k.form_fields, k.year_sensitive,
      left(k.body, 280) as snippet,
      0.01::real as base_score
    from public.knowledge_chunks k
    where k.id not in (select id from top)
      and (
        exists (select 1 from top t where k.note_path = any(t.links))
        or exists (select 1 from top t where k.form_fields && t.form_fields)
      )
  )
  select id, note_path, title, topic, form_fields, year_sensitive, snippet, base_score::real as score
  from (
    select * from top
    union all
    select * from expanded
  ) combined
  order by score desc
  limit greatest(p_limit, 1);
end;
$$;

revoke execute on function public.search_knowledge_chunks(text, integer) from public, anon, authenticated;
grant execute on function public.search_knowledge_chunks(text, integer) to service_role;


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 12 — search_knowledge_chunks fix (live-verified bugfixes)
-- Source: supabase/migrations/20260818110000_search_knowledge_natural_language.sql
-- Status: NOT APPLIED
-- Idempotent: כן, במלואו (create or replace function / revoke+grant).
-- ══════════════════════════════════════════════════════════════════════════

-- Supersedes the search_knowledge_chunks() defined in 20260818100000.
-- Two live-verified fixes (applied to hbsgz on 2026-08-18, then mirrored
-- here so repo == database):
--
-- 1. 42702 ambiguity: the RETURNS TABLE out-params are PL/pgSQL variables
--    and collided with same-named columns inside RETURN QUERY (the original
--    function had never been executed against a live Postgres — caught on
--    the first real call). All internal references now use c_-prefixed
--    aliases.
-- 2. Natural-language robustness: plainto_tsquery ANDs every word, so a
--    real user question ("מה קורה כשעוברים את תקרת עוסק פטור") matched
--    NOTHING. The lexical leg now ORs the lexemes, and the fuzzy leg uses
--    word_similarity of the TITLE against the query (titles are short topic
--    phrases that appear inside natural questions) instead of
--    whole-document similarity, which is ~0 for long texts by construction.
--    Verified live: the natural question above now returns
--    "עוסק פטור — הגדרה ותקרת מחזור" first (score 1.061).
--
-- Semantic gaps (e.g. ארוחה→כיבוד ואירוח) are BY DESIGN not this
-- function's job — שקל holds the prompt-cached TOC and bridges synonyms by
-- issuing better search terms or reading notes directly.

create or replace function public.search_knowledge_chunks(
  p_query text,
  p_limit integer default 8
) returns table(
  id text,
  note_path text,
  title text,
  topic text,
  form_fields text[],
  year_sensitive boolean,
  snippet text,
  score real
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_or_query tsquery;
begin
  -- AND-joined lexemes -> OR-joined ("תקרת & עוסק & פטור" -> "תקרת | עוסק | פטור").
  begin
    v_or_query := replace(plainto_tsquery('simple', p_query)::text, ' & ', ' | ')::tsquery;
  exception when others then
    v_or_query := plainto_tsquery('simple', p_query);
  end;

  return query
  with scored as (
    select
      k.id as c_id,
      k.note_path as c_note_path,
      k.title as c_title,
      k.topic as c_topic,
      k.form_fields as c_form_fields,
      k.year_sensitive as c_year_sensitive,
      k.links as c_links,
      left(k.body, 280) as c_snippet,
      (
        coalesce(ts_rank(to_tsvector('simple', k.title || ' ' || k.body), v_or_query), 0)
        + word_similarity(k.title, p_query) * 2
        + similarity(k.title || ' ' || k.body, p_query)
      ) as c_score
    from public.knowledge_chunks k
    where
      to_tsvector('simple', k.title || ' ' || k.body) @@ v_or_query
      or word_similarity(k.title, p_query) > 0.25
      or (k.title || ' ' || k.body) % p_query
  ),
  top_hits as (
    select * from scored order by c_score desc limit greatest(p_limit, 1)
  ),
  expanded as (
    select
      k.id as c_id, k.note_path as c_note_path, k.title as c_title, k.topic as c_topic,
      k.form_fields as c_form_fields, k.year_sensitive as c_year_sensitive,
      left(k.body, 280) as c_snippet,
      0.01::real as c_score
    from public.knowledge_chunks k
    where k.id not in (select t2.c_id from top_hits t2)
      and (
        exists (select 1 from top_hits t where k.note_path = any(t.c_links))
        or exists (select 1 from top_hits t where k.form_fields && t.c_form_fields)
      )
  )
  select combined.c_id, combined.c_note_path, combined.c_title, combined.c_topic,
         combined.c_form_fields, combined.c_year_sensitive, combined.c_snippet,
         combined.c_score::real
  from (
    select c_id, c_note_path, c_title, c_topic, c_form_fields, c_year_sensitive, c_snippet, c_score from top_hits
    union all
    select c_id, c_note_path, c_title, c_topic, c_form_fields, c_year_sensitive, c_snippet, c_score from expanded
  ) combined
  order by combined.c_score desc
  limit greatest(p_limit, 1);
end;
$$;

revoke execute on function public.search_knowledge_chunks(text, integer) from public, anon, authenticated;
grant execute on function public.search_knowledge_chunks(text, integer) to service_role;


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 13 — chat history: multiple named conversations + sidebar list
-- Source: supabase/migrations/20260818200000_chat_history.sql
-- Status: NOT APPLIED
-- Idempotent: כן, במלואו (create table if not exists / drop-then-create
--   policy via DO block).
-- ══════════════════════════════════════════════════════════════════════════

-- Chat history persistence — multiple named conversations + sidebar list
-- ("שיחות אחרונות"), per Yoni's locked decision (2026-08-18). Today chat
-- state lives only in React state (chat-panel.tsx / coach-chat.tsx) and is
-- wiped on refresh; this adds the durable store behind it.
--
-- profiles.chat_history (a single jsonb blob) is superseded by this — it is
-- DEAD and slated for removal per the WS7 review, but is deliberately NOT
-- dropped in this migration (out of scope here; drop it in its own pass).
--
-- DEPLOYMENT: the Supabase MCP available to this session cannot reach the
-- live project (hbsgz) — this migration is AUTHORED, not applied. The same
-- SQL is appended to docs/launch/hbsgz-pending.sql for Yoni to paste into
-- the SQL editor. The UI (src/lib/chat/history.ts) feature-detects the
-- tables once per page load and silently falls back to in-memory-only chat
-- when they don't exist yet (missing-table / permission-denied errors), so
-- shipping the UI ahead of this migration landing is safe.
--
-- Apply: Supabase MCP apply_migration (once reachable), `supabase db push`,
-- or paste docs/launch/hbsgz-pending.sql in the SQL editor.

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role = any (array['user','assistant'])),
  content text not null,
  created_at timestamptz not null default now()
);

-- Sidebar list ordering (most-recently-active thread first).
create index if not exists chat_threads_user_updated_idx
  on public.chat_threads (user_id, updated_at desc);

-- Loading one thread's transcript in order.
create index if not exists chat_messages_thread_created_idx
  on public.chat_messages (thread_id, created_at);

-- Reuses the shared trigger fn (search_path pinned in 20260816130000) —
-- same pattern as public.subscriptions / public.knowledge_chunks.
drop trigger if exists chat_threads_set_updated_at on public.chat_threads;
create trigger chat_threads_set_updated_at
  before update on public.chat_threads
  for each row execute function public.set_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.chat_threads  enable row level security;
alter table public.chat_messages enable row level security;

-- Per-user, full CRUD on own rows only. auth.uid() wrapped in `select` from
-- the start (perf — see 20260805170000_rls_perf_fk_index.sql), not bolted
-- on as a follow-up migration.
do $$
declare t text;
begin
  foreach t in array array['chat_threads','chat_messages']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_own', t);
  end loop;
end $$;


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 14 — AI usage ledger (cost-guard system)
-- Source: supabase/migrations/20260818220000_ai_usage.sql
-- Status: NOT APPLIED
-- Idempotent: GUARDED. Original has one plain `create policy
--   ai_usage_deny_all` (errors on re-run) — wrapped below in a trivial,
--   provably equivalent IF NOT EXISTS guard. Everything else in this
--   section is already idempotent verbatim.
-- ══════════════════════════════════════════════════════════════════════════

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

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_usage'
      and policyname = 'ai_usage_deny_all'
  ) then
    create policy ai_usage_deny_all on public.ai_usage
      for all to anon, authenticated
      using (false)
      with check (false);
  end if;
end $$;

-- getBudgetState()'s "sum today's spend" query and the daily digest scan
-- (docs/plans/2026-08-18-master-task-list-v2.md §3.2) both filter/order by
-- created_at only.
create index if not exists ai_usage_created_at_idx
  on public.ai_usage (created_at desc);

-- Per-user daily cap check (dailyUserCap() call sites) and per-user usage
-- history.
create index if not exists ai_usage_user_created_idx
  on public.ai_usage (user_id, created_at desc);


-- ══════════════════════════════════════════════════════════════════════════
-- VERIFICATION — run after pasting everything above (או קודם, כדי לראות
-- מה כבר חי לפני שמדביקים). כל השאילתות משתמשות ב-catalog checks (exists
-- מול information_schema/pg_proc/pg_policies/storage.buckets) שלעולם לא
-- זורקות שגיאה גם אם אובייקט חסר — כך שגם הרצה חלקית/מוקדמת בטוחה.
-- ══════════════════════════════════════════════════════════════════════════

-- ── ✅ / ❌ checklist של כל האובייקטים הקריטיים ───────────────────────────────
select object_name, ok from (
  select 'table: public.plans'              as object_name, exists (select 1 from information_schema.tables where table_schema='public' and table_name='plans')              as ok, 1 as ord
  union all select 'table: public.subscriptions',            exists (select 1 from information_schema.tables where table_schema='public' and table_name='subscriptions'),        2
  union all select 'table: public.payments',                 exists (select 1 from information_schema.tables where table_schema='public' and table_name='payments'),             3
  union all select 'table: public.events',                   exists (select 1 from information_schema.tables where table_schema='public' and table_name='events'),               4
  union all select 'table: public.rate_limit_buckets',       exists (select 1 from information_schema.tables where table_schema='public' and table_name='rate_limit_buckets'),   5
  union all select 'function: public.check_rate_limit',      exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname='public' and p.proname='check_rate_limit'), 6
  union all select 'table: public.doc_short_links',          exists (select 1 from information_schema.tables where table_schema='public' and table_name='doc_short_links'),      7
  union all select 'storage bucket: receipts',                exists (select 1 from storage.buckets where id='receipts'),                                                        8
  union all select 'table: public.knowledge_chunks',         exists (select 1 from information_schema.tables where table_schema='public' and table_name='knowledge_chunks'),     9
  union all select 'function: public.search_knowledge_chunks', exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname='public' and p.proname='search_knowledge_chunks'), 10
  union all select 'table: public.chat_threads',             exists (select 1 from information_schema.tables where table_schema='public' and table_name='chat_threads'),         11
  union all select 'table: public.chat_messages',            exists (select 1 from information_schema.tables where table_schema='public' and table_name='chat_messages'),        12
  union all select 'table: public.ai_usage',                 exists (select 1 from information_schema.tables where table_schema='public' and table_name='ai_usage'),             13
) checklist
order by ord;

-- ── data sanity (מריצים רק אחרי שהצ'קליסט למעלה מראה ok=true בשורות הרלוונטיות) ──
select id, price_agorot from public.plans order by sort_order;        -- מצפה: free (0), pro (3900)
select count(*) as events_table_ready         from public.events;
select count(*) as chat_threads_table_ready   from public.chat_threads;
select count(*) as chat_messages_table_ready  from public.chat_messages;
select count(*) as knowledge_chunks_row_count from public.knowledge_chunks; -- 0 עד שהאינדקסר ירוץ (scripts/index-knowledge.mjs) — התוצאה הריקה תקינה, רק הטבלה צריכה להיות ok=true למעלה
select count(*) as ai_usage_row_count         from public.ai_usage;   -- 0 בהתחלה, גדל עם כל קריאת AI אחרי שהקוד יתחיל לכתוב אליה
