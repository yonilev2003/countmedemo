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
