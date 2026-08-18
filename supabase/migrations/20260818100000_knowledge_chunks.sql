-- Knowledge vault storage (RAG audit #20, 2026-08-18).
--
-- Architecture (approved by Yoni, 18/08 — ZERO new paid vendors, Claude-only):
-- the knowledge/**/*.md Obsidian vault is the durable source; a deploy-time
-- indexer (scripts/index-knowledge.mjs) parses front-matter + body + chunks
-- long notes on headings, then upserts rows here. Retrieval is Claude-native:
-- a prompt-cached table-of-contents (knowledge/toc.generated.json) plus two
-- tools — search_knowledge (one hybrid SQL: trgm similarity + FTS rank,
-- expanded one hop through links/form_fields) and read_knowledge (full
-- bodies by id). NO embeddings, NO external APIs — pg_trgm + FTS 'simple'
-- are both free and Hebrew-friendly (simple config does no English stemming,
-- so it does not mis-stem Hebrew tokens either).
--
-- IMPORTANT — numbers never live here as authority: notes may explain a rule
-- in prose, but every quoted figure in a chat answer must come from
-- lib/calculators (via get_form_value/get_tax_estimate/etc.), never from a
-- knowledge_chunks.body string. This table is prose + pointers only.
--
-- Same posture as rate_limit_buckets/doc_short_links: not user data, so RLS
-- is enabled with an explicit deny-all policy (defense-in-depth + makes the
-- service-role-only intent auditable — see rls-coverage.test.ts, which
-- requires every table to declare at least one policy). All reads/writes go
-- through the admin client (scripts/index-knowledge.mjs at deploy time,
-- lib/agent/tools.ts's search/read tools at request time), which uses the
-- service-role key and bypasses RLS by design.

create extension if not exists pg_trgm;

create table if not exists public.knowledge_chunks (
  id text primary key,
  -- Path of the source note relative to knowledge/, e.g.
  -- "regulatory/osek-zeir.md". Multiple chunk rows can share a note_path
  -- when a long note is split on headings (id disambiguates: "{note_path}#{slug}").
  note_path text not null,
  title text not null,
  topic text,
  tags text[] not null default '{}',
  -- 1301 field codes this chunk is relevant to (e.g. '{030,137}') — lets
  -- search_knowledge expand one hop from a field the user asked about.
  form_fields text[] not null default '{}',
  -- True when the chunk states a rate/cap/threshold that changes by tax
  -- year — surfaced to the model as a reason to double-check via the
  -- calculator tools rather than trust the prose figure.
  year_sensitive boolean not null default false,
  body text not null default '',
  -- [[wikilink]] targets found in the note body (the relation graph edges).
  links text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.knowledge_chunks enable row level security;
revoke all on public.knowledge_chunks from anon, authenticated;

create policy knowledge_chunks_deny_all on public.knowledge_chunks
  for all to anon, authenticated
  using (false)
  with check (false);

-- Re-run of the indexer on every note (even unchanged ones) is fine, but
-- deleting rows for notes removed from the vault filters by note_path.
create index if not exists knowledge_chunks_note_path_idx
  on public.knowledge_chunks (note_path);

-- Fuzzy/substring matching (typo-tolerant, no exact-token requirement).
-- gin_trgm_ops on the concatenated title+body is the standard pg_trgm
-- similarity-search index shape.
create index if not exists knowledge_chunks_trgm_idx
  on public.knowledge_chunks using gin ((title || ' ' || body) gin_trgm_ops);

-- Keyword/ranked search. 'simple' config (not 'english') deliberately: it
-- does no stemming, which means it neither helps nor hurts Hebrew tokens —
-- 'english' stemming rules would actively corrupt them.
create index if not exists knowledge_chunks_fts_idx
  on public.knowledge_chunks using gin (to_tsvector('simple', title || ' ' || body));

-- Reuses the shared trigger function (defined in billing.sql, search_path
-- pinned in 20260816130000) — same pattern as public.subscriptions.
drop trigger if exists knowledge_chunks_set_updated_at on public.knowledge_chunks;
create trigger knowledge_chunks_set_updated_at
  before update on public.knowledge_chunks
  for each row execute function public.set_updated_at();

-- Hybrid search RPC: fuses trgm similarity + FTS rank into one score, then
-- expands one hop through links/form_fields so a query that matches one
-- chunk also surfaces its directly-linked neighbors. security definer +
-- pinned search_path (same posture as check_rate_limit) since it must read
-- through the deny-all RLS above; execute is service_role only, so only the
-- server-side search_knowledge tool (never anon/authenticated) can call it.
create or replace function public.search_knowledge_chunks(
  p_query text,
  p_limit integer default 8
) returns table(
  id text,
  note_path text,
  title text,
  topic text,
  form_fields text[],
  year_sensitive boolean,
  snippet text,
  score real
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  with scored as (
    select
      k.id,
      k.note_path,
      k.title,
      k.topic,
      k.form_fields,
      k.year_sensitive,
      k.links,
      left(k.body, 280) as snippet,
      -- Weighted fusion: FTS rank is unbounded-ish, similarity is 0..1 —
      -- similarity carries more weight so a close fuzzy/typo match doesn't
      -- get buried under a long chunk with a high raw ts_rank.
      (
        coalesce(ts_rank(to_tsvector('simple', k.title || ' ' || k.body), plainto_tsquery('simple', p_query)), 0)
        + similarity(k.title || ' ' || k.body, p_query) * 2
      ) as base_score
    from public.knowledge_chunks k
    where
      to_tsvector('simple', k.title || ' ' || k.body) @@ plainto_tsquery('simple', p_query)
      or (k.title || ' ' || k.body) % p_query
  ),
  top as (
    select * from scored order by base_score desc limit greatest(p_limit, 1)
  ),
  -- One-hop expansion: chunks whose note_path is a link target of a top hit,
  -- or that share a form_field with a top hit, scored lower than any direct
  -- hit so they only fill remaining slots.
  expanded as (
    select
      k.id, k.note_path, k.title, k.topic, k.form_fields, k.year_sensitive,
      left(k.body, 280) as snippet,
      0.01::real as base_score
    from public.knowledge_chunks k
    where k.id not in (select id from top)
      and (
        exists (select 1 from top t where k.note_path = any(t.links))
        or exists (select 1 from top t where k.form_fields && t.form_fields)
      )
  )
  select id, note_path, title, topic, form_fields, year_sensitive, snippet, base_score::real as score
  from (
    select * from top
    union all
    select * from expanded
  ) combined
  order by score desc
  limit greatest(p_limit, 1);
end;
$$;

revoke execute on function public.search_knowledge_chunks(text, integer) from public, anon, authenticated;
grant execute on function public.search_knowledge_chunks(text, integer) to service_role;
