-- Waitlist signups for the static landing page (countme.co.il).
--
-- Written ONLY by the landing project's serverless function
-- (landing-site/api/waitlist.js) through the service-role key, which bypasses
-- RLS. RLS is enabled with an explicit deny-all policy (repo convention, see
-- ai_usage) and anon/authenticated are revoked, so the public anon key can
-- neither read nor insert here — the table is not reachable from a browser at all. (Replaces the Brevo form that used to hold
-- this list.)
--
-- Consent record: the landing form has ONE required checkbox that combines
-- marketing updates (email/SMS) with the waiting-list terms and privacy
-- policy. `consent_text_version` ties the row to the wording shown at the
-- time, so a later wording change does not blur what each person agreed to.
--
-- DEPLOYMENT: authored, not applied. The Supabase MCP in the authoring session
-- could not reach the live project (hbsgz) — apply via the SQL editor or
-- `supabase db push` before the landing function goes live (it answers 500
-- until this table exists, so the form shows an error rather than a fake
-- success).

create table if not exists public.waitlist_signups (
  id                   uuid primary key default gen_random_uuid(),
  email                text not null,                 -- stored lower-cased and trimmed
  phone                text not null,                 -- E.164, Israeli numbers only (+972…)
  consent_text_version text not null,
  consented_at         timestamptz not null default now(),
  source               text not null default 'landing',
  user_agent           text,
  confirmation_sent_at timestamptz,
  confirmation_error   text,
  unsubscribed_at      timestamptz,
  created_at           timestamptz not null default now()
);

create unique index if not exists waitlist_signups_email_key
  on public.waitlist_signups (email);

-- Find signups whose confirmation email still has to be (re)sent.
create index if not exists waitlist_signups_unsent_idx
  on public.waitlist_signups (created_at)
  where confirmation_sent_at is null;

alter table public.waitlist_signups enable row level security;

create policy waitlist_signups_deny_all on public.waitlist_signups
  for all to anon, authenticated
  using (false)
  with check (false);

revoke all on public.waitlist_signups from anon, authenticated;

comment on table public.waitlist_signups is
  'Landing-page waitlist. Service-role only (explicit deny-all for anon/authenticated).';
