---
title: Site verification checklist — beta-launch branch
type: launch
updated: 2026-06-19
branch: claude/beta-launch-prep-z2m6f5
---

# Site verification checklist — what changed on this branch

> Go through this on the deployed preview (or `npm run dev`) at your own pace.
> Every row has a **what to check** + a place for your **notes / verdict** (✅ / ✏️ fix / ❌).
> Test on **phone (390px), tablet (768/1024px), desktop (1440px)** — the branch's whole
> point is "מעבר להכל" across devices. Use the browser devtools device toolbar.
>
> Legend for your notes column: `OK` · `FIX: …` · `Q: …` (question for me).

## How to run it locally
```
npm install
npm run dev      # http://localhost:3000
```
To exercise auth/DB flows you need `.env.local` populated (Supabase URL + anon key +
service-role + ANTHROPIC_API_KEY). Without it, the app runs in localStorage-persona mode
(no login) — fine for testing most UI, not the login→/home→DB path.

---

## 1. Login & onboarding (workstream E)

| # | What to check | Device | Your notes |
|---|---|---|---|
| 1.1 | `/login` — Google button shows loading/disabled state when clicked (not a dead click) | all | |
| 1.2 | `/login` — "what happens next" reassurance strip is visible, 3 bullets, no emoji, brand icons | all | |
| 1.3 | `/login` — card is centered + readable on phone; brand side-panel hidden < lg | phone | |
| 1.4 | Google consent screen reads **"להמשיך אל CountMe"** (NOT a `…supabase.co` string) | — | *blocked on OAuth-branding config — see needed-from-you* |
| 1.5 | First-time user (no persona) after login → lands on **/setup** | desktop | |
| 1.6 | Returning user (has persona) after login → lands on **/home** | desktop+phone | |

## 2. /home shortcuts hub (workstream E — NEW page)

| # | What to check | Device | Your notes |
|---|---|---|---|
| 2.1 | `/home` renders a greeting + shortcut tiles (reuses the 6 QUICK_ACTIONS) | all | |
| 2.2 | Grid is **2-up on phone, 3-up on desktop**; tiles are tappable (≥44px) | phone+desktop | |
| 2.3 | Header has /dashboard + /file CTA buttons; all links land correctly | all | |
| 2.4 | Visiting `/home` with **no persona** redirects to `/setup` (don't get stuck) | desktop | |
| 2.5 | Skeleton/loading state shows briefly, no layout jump (CLS) | all | |
| 2.6 | Reveal/Stagger motion plays; with OS "reduce motion" ON, it's calm/instant | all | |

## 3. Pricing (workstream B — NEW page)

| # | What to check | Device | Your notes |
|---|---|---|---|
| 3.1 | `/pricing` shows Free vs Pro (מלא) cards from the billing seam | all | |
| 3.2 | Pro lists all 6 features in Hebrew; "הכי שלם" badge present | all | |
| 3.3 | While billing OFF: Pro CTA is the disabled **"חינם בזמן הבטא"** button (no checkout) | all | |
| 3.4 | "התמחור מוצג להמחשה" disclaimer shows while billing off | all | |
| 3.5 | Cards stack cleanly on phone (no overflow), side-by-side on desktop | phone+desktop | |
| 3.6 | ₪39 is a placeholder — confirm you're OK showing it in beta, or tell me to hide the price | — | |

## 4. Eitan / chat (workstream H — deepened)

| # | What to check | Device | Your notes |
|---|---|---|---|
| 4.1 | Open the coach/chat; ask "מה המחזור שלי השנה?" → answers from **computed** data, cites the source field | all | |
| 4.2 | Ask "מתי הדדליין הבא שלי?" → returns a real upcoming deadline (tool-use) | all | |
| 4.3 | Ask "כמה אני קרוב לתקרת עוסק פטור?" → ceiling status with a number | all | |
| 4.4 | Ask for **advice** ("כדאי לי לפתוח חברה?") → declines + escalates to רו"ח, no advice | all | |
| 4.5 | Streaming still works (text appears progressively), no hang on tool rounds | all | |
| 4.6 | Rate limit holds (rapid-fire >12/min → graceful 429, not a crash) | desktop | |

## 5. Form 1301 + the 8 star fields (regression — must still work)

| # | What to check | Device | Your notes |
|---|---|---|---|
| 5.1 | `/demo` (or `/file`) renders the gov.il-faithful form, beige dashed countme frame | all | |
| 5.2 | Each calculated value (150 / 238 / 294 / 030 / 137 / 020 / 044 / 068 / 297) is clickable → formula + sources tooltip | desktop | |
| 5.3 | Copy a value to clipboard works | all | |
| 5.4 | Default active tab = פרטים אישיים; no שלח/בדיקה toolbar (only המשך CTA) | all | |
| 5.5 | Form is usable on phone (horizontal scroll acceptable but tabs reachable) | phone | |

## 6. Miluim (workstream G — FROZEN, should be UNCHANGED)

| # | What to check | Device | Your notes |
|---|---|---|---|
| 6.1 | Confirm NOTHING miluim-related changed in the form yet (G is frozen pending your verification) | — | |
| 6.2 | Read `docs/launch/miluim-knowledge.md` and answer the 3 questions in it | — | *see needed-from-you* |

## 7. PWA / responsive (workstream F)

| # | What to check | Device | Your notes |
|---|---|---|---|
| 7.1 | Installable (browser shows "install app"); opens standalone, RTL correct | phone | |
| 7.2 | `start_url` opens **/home**; app shortcuts list /home, /dashboard, /invoices/new, /file | phone | |
| 7.3 | After a new deploy, returning visit shows the NEW version (sw.js is network-first, not stale) | all | |
| 7.4 | Walk every page at 390 / 768 / 1024 / 1440 — note any overflow, tiny tap targets, broken charts | all | |

## 8. Cross-cutting / regressions

| # | What to check | Device | Your notes |
|---|---|---|---|
| 8.1 | Landing `/` still loads, links work, on brand | all | |
| 8.2 | `/dashboard`, `/deadlines`, `/alerts`, `/invoices`, `/business-expenses` all still load | all | |
| 8.3 | No console errors on any page (open devtools console) | desktop | |
| 8.4 | All `/home` + `/pricing` are reachable from nav/landing (NOTE: linking is still TODO — flag if missing) | all | |
| 8.5 | Error boundary: force an error (e.g. offline + action) → Hebrew error screen, not white page | desktop | |

---

## Your long-form notes (free text)

> Dump anything here — bugs, "this feels off", copy tweaks, ideas. I'll triage each into
> a fix or a question. The more specific (page + device + what you expected), the faster I fix.

-
-
-
