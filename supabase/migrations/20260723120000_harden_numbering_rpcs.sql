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
