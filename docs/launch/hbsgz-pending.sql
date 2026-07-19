-- hbsgz — כל ה-SQL הממתין, בהדבקה אחת (אידמפוטנטי — בטוח להריץ שוב)
-- הרצה: Supabase → פרויקט hbsgzelipeawkvtcazdr → SQL Editor → New query → הדבק הכל → Run
-- נוצר 2026-07-19 מ: 20260617090000_billing.sql + 20260617091000_events.sql

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

-- ── אימות: שתי השאילתות צריכות להחזיר שורות ──
select id, price_agorot from public.plans order by sort_order;
select count(*) as events_table_ready from public.events;
