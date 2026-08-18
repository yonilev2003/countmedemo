-- Supersedes the search_knowledge_chunks() defined in 20260818100000.
-- Two live-verified fixes (applied to hbsgz on 2026-08-18, then mirrored
-- here so repo == database):
--
-- 1. 42702 ambiguity: the RETURNS TABLE out-params are PL/pgSQL variables
--    and collided with same-named columns inside RETURN QUERY (the original
--    function had never been executed against a live Postgres — caught on
--    the first real call). All internal references now use c_-prefixed
--    aliases.
-- 2. Natural-language robustness: plainto_tsquery ANDs every word, so a
--    real user question ("מה קורה כשעוברים את תקרת עוסק פטור") matched
--    NOTHING. The lexical leg now ORs the lexemes, and the fuzzy leg uses
--    word_similarity of the TITLE against the query (titles are short topic
--    phrases that appear inside natural questions) instead of
--    whole-document similarity, which is ~0 for long texts by construction.
--    Verified live: the natural question above now returns
--    "עוסק פטור — הגדרה ותקרת מחזור" first (score 1.061).
--
-- Semantic gaps (e.g. ארוחה→כיבוד ואירוח) are BY DESIGN not this
-- function's job — שקל holds the prompt-cached TOC and bridges synonyms by
-- issuing better search terms or reading notes directly.

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
declare
  v_or_query tsquery;
begin
  -- AND-joined lexemes -> OR-joined ("תקרת & עוסק & פטור" -> "תקרת | עוסק | פטור").
  begin
    v_or_query := replace(plainto_tsquery('simple', p_query)::text, ' & ', ' | ')::tsquery;
  exception when others then
    v_or_query := plainto_tsquery('simple', p_query);
  end;

  return query
  with scored as (
    select
      k.id as c_id,
      k.note_path as c_note_path,
      k.title as c_title,
      k.topic as c_topic,
      k.form_fields as c_form_fields,
      k.year_sensitive as c_year_sensitive,
      k.links as c_links,
      left(k.body, 280) as c_snippet,
      (
        coalesce(ts_rank(to_tsvector('simple', k.title || ' ' || k.body), v_or_query), 0)
        + word_similarity(k.title, p_query) * 2
        + similarity(k.title || ' ' || k.body, p_query)
      ) as c_score
    from public.knowledge_chunks k
    where
      to_tsvector('simple', k.title || ' ' || k.body) @@ v_or_query
      or word_similarity(k.title, p_query) > 0.25
      or (k.title || ' ' || k.body) % p_query
  ),
  top_hits as (
    select * from scored order by c_score desc limit greatest(p_limit, 1)
  ),
  expanded as (
    select
      k.id as c_id, k.note_path as c_note_path, k.title as c_title, k.topic as c_topic,
      k.form_fields as c_form_fields, k.year_sensitive as c_year_sensitive,
      left(k.body, 280) as c_snippet,
      0.01::real as c_score
    from public.knowledge_chunks k
    where k.id not in (select t2.c_id from top_hits t2)
      and (
        exists (select 1 from top_hits t where k.note_path = any(t.c_links))
        or exists (select 1 from top_hits t where k.form_fields && t.c_form_fields)
      )
  )
  select combined.c_id, combined.c_note_path, combined.c_title, combined.c_topic,
         combined.c_form_fields, combined.c_year_sensitive, combined.c_snippet,
         combined.c_score::real
  from (
    select c_id, c_note_path, c_title, c_topic, c_form_fields, c_year_sensitive, c_snippet, c_score from top_hits
    union all
    select c_id, c_note_path, c_title, c_topic, c_form_fields, c_year_sensitive, c_snippet, c_score from expanded
  ) combined
  order by combined.c_score desc
  limit greatest(p_limit, 1);
end;
$$;

revoke execute on function public.search_knowledge_chunks(text, integer) from public, anon, authenticated;
grant execute on function public.search_knowledge_chunks(text, integer) to service_role;
