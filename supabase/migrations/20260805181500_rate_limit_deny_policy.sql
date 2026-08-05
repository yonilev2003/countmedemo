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

create policy rate_limit_buckets_deny_all on public.rate_limit_buckets
  for all to anon, authenticated
  using (false)
  with check (false);
