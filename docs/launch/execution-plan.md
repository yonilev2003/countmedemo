---
title: countme — Execution Plan (next sessions)
type: launch / execution
created: 2026-06-21
owner: Claude (autonomous worktree/loop execution) + Yoni (manual checklist gate)
branch base: claude/beta-launch-prep-z2m6f5  (production deploys from `main`)
hard deadline: accelerator demo in ~1 week (fund managers + potential partners → must be flawless & beautiful)
---

# READ THIS FIRST — how to execute this plan

You are a fresh session. This document is your single source of truth. Execute phases **in order**
(Phase 0 → 6). Phase 0 is mandatory and unblocks reliable autonomous work on the rest.

## Execution model (dynamic workflows / git worktrees / /loop)
- **One git worktree per phase.** Phases 1, 2, 3 are largely file-disjoint and may run in **parallel
  worktrees**. The **hot shared file is `src/app/setup/page.tsx`** (touched by Phase 1 + 2 + 3) —
  changes to it MUST be **serialized** (one worktree at a time), per the locked rule in
  `memory/decisions.md`.
- **`/loop` for iterate-until-done.** Run each phase as: *make broad fixes → run the verify harness →
  fix what failed → repeat until the phase's Definition of Done (DoD) is green.* Use the `/loop` skill
  self-paced (no interval) with a goal prompt that ends only when the DoD passes.
- **Verify harness = the loop's success gate** (built in Phase 0): `npm run test:unit` (vitest) +
  `npm run test:e2e` (Playwright) + `npx tsc --noEmit` + `rm -rf .next && npm run build`. All green = gate passes.
- **Deploy cadence:** at the **end of every session**, if build+tests are green, open a PR from the
  work branch and **merge to `main`** (production auto-deploys). Yoni approved standing merge-at-session-end.
- **Final quality gate is HUMAN:** Yoni runs `docs/launch/site-test-checklist.md` manually. The loop
  gets to "green + responsive + no regressions"; **"beautiful/wow" is Yoni's call.** Do not claim the
  visual bar is met from tests alone.

## Non-negotiable guardrails
1. **Tax numbers never invented.** Every rate/cap/rule flows from `lib/calculators/types.ts`
   (`getTaxYearConstants`). Anything uncertain → `TODO(Roy)` + consult the owning `israeli-*` skill
   (CLAUDE.md is binding). A fast loop must NOT hardcode a number it isn't certain of.
2. **Next.js 16 / React 19.** Read `node_modules/next/dist/docs/` before routing/data/transition code
   (AGENTS.md). View Transitions via React's `<ViewTransition>` are NOT available on stable React
   19.2.4 — do not install the experimental channel.
3. **Brand law.** New UI uses `src/components/brand/*` + `globals.css` tokens, Assistant font, no emoji,
   logical RTL props (`ms-/me-/ps-/pe-`). The gov.il form surfaces (`/demo`, `/file`, `/file/1219`)
   stay gov.il-faithful and brand-exempt.
4. **Build gate every PR:** `rm -rf .next && npm run build` (cache corruption is a known failure).
5. **End git commit messages** with the Co-Authored-By + Claude-Session trailers (see existing commits).

## Current live state (as of 2026-06-21)
- Production = `main`, deployed at `countmedemo.vercel.app`. The beta-launch branch was merged (PR #22).
- Supabase backend = **`hbsgzelipeawkvtcazdr`** (akfg abandoned). `billing` + `events` migrations were
  **run by Yoni on hbsgz** ✅. Vercel env points to hbsgz (Google login works).
- Build green, 32 routes. `/pricing`, `/home`, `/file/1219`, miluim setup field all live.

---

# PHASE 0 — Verification harness (MANDATORY, DO FIRST)

**Goal:** give the loop a machine-checkable target. Without this, "fix→verify→fix" is blind.

## 0.1 Unit tests for the calculators (add **vitest**)
- Add `vitest` + `npm run test:unit` script. Test `src/lib/calculators/*` (pure functions — easy).
- **Lock these exact assertions** (these double as the Phase-1 bug specs):
  - `field150BusinessIncome`: osek **zeir**, `totalRevenue=110000` → **77000** (110000 × 0.70).
  - `field150BusinessIncome`: non-zeir (morshe), revenue 110000, deductible 20000 → **90000**.
  - `miluimCreditPoints(2026, 45)` → **0.75**; `(2026, 30)` → 0.5; `(2026, 50)` → 1.0; `(2026, 110)` → 4.0; `(2025, 45)` → 0 (pre-2026).
  - `soldierCreditPoints` for a **male, serviceMonths=32, dischargeDate=2024-04-28, income.year=2025**
    → **2.0** (full service, full tax year inside the 36-month window). **THIS currently returns 1.0 — it is a bug (see Phase 1.1).** Write the test to expect 2.0, then make it pass.
  - `totalCreditPoints` for that same persona (male resident 2.25 + soldier 2.0, no kids/oleh/academic) → **4.25**.
  - `getTaxYearConstants(2026).osekZeirThreshold` → **122833**; `(2025)` → 120000; `(2024)` → 120000.
  - `getTaxYearConstants(2025).pointValueAnnual` → 2904; `form6111Threshold` 2025 → 256410.
  - `estimateTaxLiability` for the zeir demo persona: taxable income = 77000 (not 90000).
- Run them; fix the calculators until green (that resolves the accuracy bugs precisely).

## 0.2 Playwright smoke tests (`tests/e2e` — scaffold exists, empty)
- Flows that must pass without console errors / 404s:
  - `/` 200, `/login` 200, `/pricing` 200, `/home` (redirects to /setup when no persona — assert redirect), `/file` 200, `/file/1219` 200, `/dashboard` (with a seeded persona) 200, `/demo` 200.
  - Seed a demo persona into localStorage (or use a fixture) so `/dashboard`, `/demo`, `/file/1219` render.
  - Assert key computed values are present (e.g. dashboard shows "הכנסה חייבת"; 1219 shows net capital).
- **Responsive screenshots** at **390 / 768 / 1024 / 1440** for `/`, `/dashboard`, `/demo`, `/coach`,
  `/file/1219`, `/pricing` — saved as artifacts for Yoni to eyeball. (Loop ensures no breakage; human judges beauty.)
- Add `playwright.config.ts` if missing; ensure `npm run test:e2e` runs headless against `next build && next start` or dev.

## 0.3 DoD for Phase 0
`npm run test:unit` (all green, including the 2.0 soldier + 77000 zeir specs) **and** `npm run test:e2e`
(smoke + screenshots) **and** `tsc` **and** `build` all pass in CI-like local run. Commit + open a PR.

---

# PHASE 1 — Correctness (URGENT, this week; demo cannot show wrong numbers)

Fix each; the Phase-0 unit tests are the gate.

## 1.1 Soldier credit points = 2.0 for full service in window (currently 1.0 → total 3.25 instead of 4.25)
- Repro: male, dischargeDate `2024-04-28`, serviceMonths `32`, tax year `2025`. Expected **2.0** soldier points (resident 2.25 → total **4.25**). App shows total **3.25** (soldier computed as 1.0).
- Investigate `soldierCreditPoints` + `soldierEligibleMonthsInYear` in `src/lib/calculators/index.ts`.
  Hand-trace says 12 eligible months × 1/6 = 2.0 — find why it yields 1.0 (suspect: month-index math,
  fraction selection, or where the displayed total is computed). Fix until the Phase-0 test passes.
- Authority: the rule (confirmed by Yoni): discharged soldier = **2 credit points for 36 months**;
  full service = men 23+/women 22+ months → 2 pts; partial 12–23 (women 11–21) → 1 pt; <12 → none
  (except health discharge). Point value 242 ₪/mo = 2,904 ₪/yr.

## 1.2 Field 150 (taxable income) for osek zeir — fix the **/setup** preview too
- Dashboard already fixed (uses `field-150-business-income`). The **`/setup` preview** ("הכנסה חייבת
  (הערכה לשדה 150)") still computes `revenue − actual expenses` → shows 90,000 for a zeir with 110k.
- Make the setup preview use `calculate("field-150-business-income", persona)` (zeir → 77,000).
  File: `src/app/setup/page.tsx` (the step-5 estimate box / wherever `netIncome` feeds the preview).

## 1.3 Service months REQUIRED when "discharged soldier" is checked
- In `validateStep2` (`src/app/setup/page.tsx`): if `isSoldierDischarged` and `!soldierServiceMonths`
  → error "יש להזין מספר חודשי שירות". Mark the field `required` in the UI.

## 1.4 Osek-zeir ceiling text must be year-accurate (122,833 for 2026)
- Step-3 business text hardcodes "120,000". Replace with `getTaxYearConstants(selectedYear).osekZeirThreshold`
  and state the year, e.g. "...עד מחזור של {ceiling} ₪ לשנת המס {year}". For 2026 → **122,833 ₪**.
  File: `src/app/setup/page.tsx` (step 3 zeir explanatory text).

## 1.5 "Logo / home logs me out" — it navigates to the public landing `/`
- Not a real logout: app-shell logos link to `/` (public marketing page). For a logged-in user the
  logo/home should go to **`/home`**. Update internal shell logos: `src/components/agent/chat-nav-rail.tsx`
  (line ~148), `src/components/agent/coach-chat.tsx`, `src/app/{file,file/1219,file/guided,invoices,demo,business-expenses}/...`
  headers. Keep the **public landing** (`src/app/page.tsx`) logo → `/`. (Optionally: landing detects a
  session server-side and swaps the CTA to "המשך לחשבון".)

## 1.6 Mobile session persistence (investigate)
- "Phone didn't remember me." Verify Supabase SSR cookies persist on mobile + `PersonaHydrator`
  (`syncPersonaFromDb`) hydrates a logged-in user from DB. Confirm: cross-device memory requires being
  logged in (anonymous persona is localStorage-only, per device). If a real cookie/session bug exists,
  fix in `src/lib/supabase/{proxy,server,client}.ts` / `middleware.ts`. If it's expected behavior,
  document it and add a clear "התחבר כדי לסנכרן בין מכשירים" hint.

## 1.7 Full numbers audit (the demo persona, all osek types)
- For zeir / patur / morshe demo personas, hand-verify (and test where feasible): field 150, 238/294,
  030, 137, 020/044/068 + miluim, 297 (6111), ceiling alert, tax estimate. Ground every figure in the
  `israeli-*` skills. Uncertain → `TODO(Roy)`.

**Phase 1 DoD:** all Phase-0 unit tests green (incl. 4.25 / 77,000), the 4 setup fixes verified by a
Playwright run, no console errors. Merge to main.

---

# PHASE 2 — Premium polish + full responsive (this week; the "wow" fund managers see)

**Goal:** every screen feels like a flagship fintech app; smooth, beautiful, 100% brand kit; flawless on phone.

- **Screen-by-screen pass** (reuse `src/components/brand/motion.tsx` Reveal/Stagger/CountUp — reduced-motion-aware):
  `/`, `/login`, `/setup`, `/dashboard`, `/coach`, `/invoices`, `/deadlines`, `/alerts`,
  `/business-expenses`, `/file`, `/file/1219`, `/home`, `/pricing`. Add: skeleton loaders, empty-states
  with a clear next action, consistent hover/focus, button micro-interactions, real loading/success/error states.
- **Responsive** at **390 / 768 / 1024 / 1440**: add a tablet (`md:`) tier where it jumps base→lg;
  tighten Recharts on phones; 44px touch targets; safe-area insets; no fixed widths; mobile nav solid.
- **Accessibility (IS 5568 / WCAG 2.1 AA):** consult `israeli-accessibility-compliance`; fix
  `.calculated-value` contrast, RTL ARIA, focus-visible.
- **Verify:** Playwright responsive screenshots (Phase 0.2) regenerated for Yoni's review each round.

**Phase 2 DoD:** screenshots at all 4 breakpoints with no overflow/broken layout; no console errors;
build+tests green. **Yoni's manual checklist is the final acceptance.** Merge to main.

---

# PHASE 3 — Feature: "כמה שווים ימי המילואים שלי"

Keep the current miluim placement (setup step-2 fields + 1301 credit row + forecast). ADD a dedicated
value calculator that unifies three streams, **grounded in `israeli-bituach-leumi`** (verify all 2025
numbers there — do not ship training-era figures):
1. **BL reserve compensation (תגמול מילואים):** daily = prior-3-months income ÷ 90; min floor; max =
   max-insurable ÷ 30 (≈ from 2025 ceiling 49,030/mo). Self-employed = by income/assessment.
2. **Income-tax credit points (תיקון 283):** already built — 2 pts/yr full service, from tax year 2026.
3. **Special grants (מענקים):** cumulative-days war grants — verify which are valid for 2025.
- Surface: a calculator page (enter days + income → BL ₪ + tax ₪ + grants ₪ + total), reachable from
  the deadlines/benefits area, and referenced by Eitan via a tool.

**Phase 3 DoD:** calculator renders, totals compute from inputs, every figure cites a source or is
`TODO(Roy)`; unit tests for the math. Merge.

---

# PHASE 4 — English (bilingual: olim users + investor/demo)

- **next-intl** + locale routing `/he` (default, RTL) and `/en` (LTR) + a language toggle. Logical RTL
  props already in place → LTR is mostly free.
- **Translate the shell** (landing, login, dashboard chrome, nav, Eitan UI, pricing). **Keep the gov.il
  tax-form content (1301/1219 field labels) in Hebrew** — users copy into a Hebrew gov form.
- **Glossary (Yoni-approved, use verbatim):** עוסק זעיר reform → **"Small Business Owners' Reform"**;
  עוסק פטור → **"exempted dealer"**; עוסק מורשה → **"authorized dealer"**.
- Deliver an English **draft for Yoni's approval** before going live with it.

**Phase 4 DoD:** `/en` renders the shell in English LTR, `/he` unchanged; toggle works; tax form stays Hebrew. Merge.

---

# PHASE 5 — Billing readiness (ready-to-connect, NOT live)

- Tranzila stays gated OFF (`BILLING_ENABLED=false`). Routes `/api/billing/{checkout,webhook}` +
  entitlement already built. When Yoni provides **sandbox creds + registered business**: implement the
  two TODOs in `src/lib/billing/tranzila.ts`, test the create-sub + webhook end-to-end in sandbox,
  confirm `subscriptions`/`payments` rows + חשבונית מס reference written. Keep gated until launch.

**Phase 5 DoD:** with sandbox creds, a sandbox subscription writes the rows; with `BILLING_ENABLED=false`
checkout is a no-op. Merge.

---

# PHASE 6 — Prepare for Google Cloud (GCP) hosting (future)

Yoni wants the site to run on Google infrastructure eventually. Do NOT migrate now — **document the path**:
- Map current stack → GCP: Vercel (Next.js) → **Cloud Run** (containerized Next standalone) or Firebase
  App Hosting; Supabase Postgres/Auth → **Cloud SQL + Identity Platform** (or keep Supabase, host app on GCP).
- List what changes: Dockerfile, env management (Secret Manager), build/deploy (Cloud Build), domain/SSL,
  and the auth-provider implications (Google OAuth redirect URIs). Write `docs/launch/gcp-migration.md`.
- Keep the app **portable** in the meantime: no Vercel-only APIs in core code; env-driven config.

**Phase 6 DoD:** `docs/launch/gcp-migration.md` exists with a concrete, costed migration checklist. (No code migration.)

---

# Tasks that depend on Yoni (flag early; not code-blocking)
- ✅ Run `billing` + `events` SQL on hbsgz — DONE.
- Run the manual checklist on each deployed phase; send notes.
- Provide/approve the **English draft** (glossary above).
- Provide any preferred **BL miluim 2025 figures/source** (else grounded in the skill).
- **Tranzila** sandbox creds + registered business (for Phase 5 live).
- Confirm the **demo flow** to optimize (Yoni: "details later").
- Add the demo/test Google emails if auth-gating is turned on for the showing.

# Definition of "demo-ready" (the real goal)
Every screen beautiful + smooth on phone and desktop; **all numbers correct** (Phase-0 tests green,
zeir 77k, soldier 4.25, ceiling 122,833 for 2026); no 404s / console errors / logout-surprises; Eitan
answers clean (no truncation) and grounded; flows (login→setup→dashboard→1301→1219) work end-to-end.
Yoni's manual checklist passes. Deployed to production.
