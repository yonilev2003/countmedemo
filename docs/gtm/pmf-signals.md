---
title: PMF signals & measurement
type: gtm-note
updated: 2026-06-17
status: living
---

# PMF signals & measurement

> The beta is **measurable**: `track()` (`src/lib/analytics/track.ts`) writes to
> `public.events`. Targets below are hypotheses (see [[readiness]] §3).

## Funnel & the four signals

| Signal | Event(s) emitted | Pilot target (hypothesis) |
|---|---|---|
| Activation | `setup_started`, `setup_step_completed`, `setup_completed` | ≥70% finish setup |
| Aha | `interactive_value_opened`, `deadline_viewed` | ≥80% reach aha in session 1 |
| Retention | `return_session` (TODO), 2nd distinct obligation | ≥40% return in 60d |
| Referral | share/recommend (TODO feature) | ≥1 in 4 would recommend |

## Events emitted (canonical list)

Kept in sync with `EventName` in `src/lib/analytics/track.ts`:
`setup_started` · `setup_step_completed` · `setup_completed` ·
`interactive_value_opened` · `deadline_viewed` · `alert_opened` ·
`coach_question_asked` · `coach_answer_cited` · `coach_answer_escalated` ·
`pricing_viewed` · `checkout_started` · `subscription_activated`

## Wiring status (Day 1)

- ✅ `track()` server lib + `/api/track` route + `trackClient()` helper.
- ⬜ Wire emit points into setup steps, `InteractiveValue`, deadlines, coach (Day 2).
- ⬜ `return_session` + referral events (need return detection + share feature).

Related: [[pricing]] · [[channels]]
