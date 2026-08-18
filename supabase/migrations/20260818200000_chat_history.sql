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
