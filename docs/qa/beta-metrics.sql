-- countme — מדדי ההצלחה של הבטא (מסמך תומי §3.7)
-- הרצה: Supabase (hbsgz) → SQL Editor. דורש שמיגרציית events הוחלה
-- (docs/launch/hbsgz-pending.sql) ושהגייטינג דלוק (אחרת user_id ריק ואין funnel).

-- ── 1. הפעלה: % שמסיימים הרשמה ומפיקים מסמך ראשון תוך 48 שעות (יעד: >40%) ──
with signups as (
  select user_id, min(created_at) as signed_up_at
  from events
  where name = 'setup_completed' and user_id is not null
  group by user_id
),
first_doc as (
  select user_id, min(created_at) as first_doc_at
  from events
  where name = 'doc_created' and user_id is not null
  group by user_id
)
select
  count(s.user_id)                                                   as total_signups,
  count(f.user_id) filter (
    where f.first_doc_at <= s.signed_up_at + interval '48 hours')    as activated_48h,
  round(100.0 * count(f.user_id) filter (
    where f.first_doc_at <= s.signed_up_at + interval '48 hours')
    / nullif(count(s.user_id), 0), 1)                                as activation_pct
from signups s
left join first_doc f using (user_id);

-- ── 2. חזרתיות שבוע-2: % שחזרו בימים 7–14 אחרי ההרשמה (יעד: >30%) ──
-- הערה: מדיד רק החל מ-31/07 — אל תסיקו 0% ביום השלישי של הבטא.
with signups as (
  select user_id, min(created_at) as signed_up_at
  from events
  where name = 'setup_completed' and user_id is not null
  group by user_id
)
select
  count(*)                                                            as cohort,
  count(*) filter (where exists (
    select 1 from events e
    where e.user_id = s.user_id
      and e.created_at between s.signed_up_at + interval '7 days'
                           and s.signed_up_at + interval '14 days'))  as returned_week2,
  round(100.0 * count(*) filter (where exists (
    select 1 from events e
    where e.user_id = s.user_id
      and e.created_at between s.signed_up_at + interval '7 days'
                           and s.signed_up_at + interval '14 days'))
    / nullif(count(*), 0), 1)                                         as week2_pct
from signups s
where s.signed_up_at < now() - interval '7 days';

-- ── 3. איתן: שיחות למשתמש + כמה שאלות בלי אסקלציה ──
select
  count(*) filter (where name = 'coach_question_asked')               as questions,
  count(distinct user_id) filter (where name = 'coach_question_asked') as askers,
  round(1.0 * count(*) filter (where name = 'coach_question_asked')
    / nullif(count(distinct user_id) filter (where name = 'coach_question_asked'), 0), 1)
                                                                      as questions_per_user,
  count(*) filter (where name = 'coach_answer_escalated')             as escalations
from events;

-- ── 4. דופק יומי: כל האירועים לפי יום ושם ──
select date_trunc('day', created_at)::date as day, name, count(*)
from events
group by 1, 2
order by 1 desc, 3 desc
limit 60;

-- ── 5. שימוש במסמכים ותזכורות (הפיצ'רים החדשים) ──
select name, props->>'invoiceNumber' as doc, count(*)
from events
where name in ('doc_created', 'doc_marked_paid', 'reminder_sent', 'receivables_viewed', 'dashboard_viewed')
group by 1, 2
order by 1;
