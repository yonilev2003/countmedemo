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
