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
