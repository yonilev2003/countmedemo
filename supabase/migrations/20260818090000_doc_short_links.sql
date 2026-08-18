-- Short opaque ids for shared-document links (QA #32, 2026-08-18).
--
-- Problem: the WhatsApp share message embedded the full signed /d/{token}
-- link — the token alone is ~479 chars — and WhatsApp's own link-linkifier
-- only recognizes part of it as a URL, so recipients tapped a truncated
-- link and landed on /d with no token. Root cause was link LENGTH, not the
-- sign/verify round-trip (that was re-checked and is correct).
--
-- Fix: mint a short (8-10 char) opaque id alongside the existing signed
-- token, store the mapping server-side, and share /s/{id} instead. /s/{id}
-- resolves the id to the long token and 302s to /d/{token}. Old long /d/
-- links keep working unchanged — this is purely additive.
--
-- Same posture as rate_limit_buckets (20260805180000, hardened by
-- 20260805181500 to an explicit deny-all policy): this is an internal
-- lookup table, not user data. Accessed only via the service-role admin
-- client, which bypasses RLS by design — the explicit deny-all policy below
-- makes that intent visible/auditable rather than relying on the implicit
-- "RLS enabled + zero policies = deny" behavior (see rls-coverage.test.ts,
-- which requires every table to declare at least one policy for exactly
-- this reason). No FK to any user/persona table: the row only maps
-- id -> token, same trust model as the token itself (bearer secret,
-- public-by-design link).

create table if not exists public.doc_short_links (
  id text primary key,
  token text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.doc_short_links enable row level security;
revoke all on public.doc_short_links from anon, authenticated;

create policy doc_short_links_deny_all on public.doc_short_links
  for all to anon, authenticated
  using (false)
  with check (false);

-- Purge support: expired rows are looked up by expires_at (both for the
-- /s/[id] "missing/expired" check and for a future scheduled purge, same
-- pattern as rate_limit_buckets_reset_at_idx).
create index if not exists doc_short_links_expires_at_idx
  on public.doc_short_links (expires_at);
