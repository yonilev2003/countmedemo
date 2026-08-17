-- Supabase security advisor (function_search_path_mutable): a function without a
-- pinned search_path can be hijacked by an attacker who can create objects in a
-- schema earlier on the caller's search_path. set_updated_at() only assigns
-- new.updated_at = now() (no table/function references), so pinning to '' is
-- safe and silences the advisor with zero behavior change.
alter function public.set_updated_at() set search_path = '';
