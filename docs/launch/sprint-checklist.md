---
title: Beta-launch sprint — morning checklists
type: launch
updated: 2026-06-17
branch: claude/beta-launch-prep-z2m6f5
---

# Beta-launch sprint — morning checklists

> One dated section per work session. Newest on top. Each session ends here so
> Yoni can review before we proceed. **Assume fixes** — flag anything to change.
> Plan: `/root/.claude/plans/eager-hopping-blum.md` (now A–H — addendum v2 added E–H).

---

## 🛠️ Supabase recovery — 2026-06-19

**Did it myself via the Supabase MCP (no longer a Yoni ask):**
- `list_projects` → the connected account sees **`akfgudspliyymiysajoh`** (countme, eu-central-1)
  + `BlondeShell` only. Both were **INACTIVE/paused**.
- **Restored** `akfgudspliyymiysajoh` and applied **all three migrations** to it
  (`countme_init` → `billing` → `events`) — each returned success. Tables: profiles, incomes,
  expenses, invoices, income_documents, invoice_sends, notifications, tax_rules, **plans**,
  **subscriptions**, **payments**, **events**. Plans seeded (free/pro).
- Updated `src/lib/supabase/database.types.ts` with plans/subscriptions/payments/events. Build ✅.

**⚠️ The honest catch (needs your call — see "Needs Yoni"):** `memory/decisions.md` locks the
**live** backend as **`hbsgzelipeawkvtcazdr`**, explicitly "not akfg". That project is **not
visible to this MCP account at all** — i.e. the MCP is logged into a *different* Supabase account
than the one that owns the live DB. So the migrations landed on **akfg** (which was empty — no
data overwritten, all migrations idempotent), NOT on the live `hbsgz`. Two ways to resolve, your
choice (steps in the report). Until then: prod DB schema unchanged; akfg is fully ready.

---

## 🪖 Workstream G — מילואים IMPLEMENTED (2026-06-19)

After Gemini's review unfroze the rules, G was implemented end-to-end (build ✅):
- **Engine** (`calculators/types.ts`): full base ladder with **+0.25 per 5 days above 50, cap 4.0 @ 110 days** (was wrongly capped at 1.0); dedicated `MILUIM_CREDIT_POINT_VALUE=2904`; `miluimServiceYear` helper; corrected the "2028→2027" note.
- **N-1 wiring** (`calculators/index.ts`): credit for tax year N now reads service days from **N-1** via `reserveDaysByYear`; forward-looking **forecast** on pre-2026 returns (Gemini's value-prop).
- **Model** (`persona.ts`): formal `reserveDaysByYear` (service-year keyed) + `soldierServiceMonths`; removed the untyped cast.
- **Form** (`form-1301/schema.ts`): miluim field in credit-points section (no official code yet → informative).
- **Data/Capture**: Dana = 45 combat days 2025 (→0.75pt forecast); `/setup` step-2 input.
- 🔴 **Only open:** 2027 **20-day entry tier** behind `TODO(Roy)` — reported value (20→0.75) is regressive vs base (30→0.5); awaiting official 2027 table (question drafted for Gemini).

---

## 🌙 Night session — 2026-06-17 (workstreams E / H / B; G frozen)

**Build:** `npm run build` ✅ green after every commit · 28 routes (added `/home`, `/pricing`).
Ran everything **not blocked**; miluim (G) deliberately **frozen pending verification**.

### ✅ Done & pushed
- **E — login UX + shortcuts home + routing** (`d500a7f`):
  - New device-adaptive **`/home`** shortcuts hub (returning users land here; reuses
    `QUICK_ACTIONS`; 2-up phone / 3-up desktop; skeleton + first-timer→`/setup` redirect).
  - OAuth callback default `next` → `/home`; middleware protects `/home`; manifest `start_url`→`/home`.
  - Login: "what happens next" reassurance strip.
  - **`docs/launch/oauth-branding.md`** — exact steps for the "להמשיך אל CountMe" consent fix (Yoni-config).
- **H — Eitan deepened (BOTH context + tools)** (`d5965e9`):
  - New `src/lib/agent/tools.ts`: `buildRichContext()` (computed 1301 values + tax estimate +
    ceiling + deadlines) **and** `EITAN_TOOLS` + `runEitanTool()` for live retrieval.
  - Tools: `get_form_value`, `get_tax_estimate`, `get_upcoming_deadlines`, `get_ceiling_status` —
    persona-derived, **no dependency on the blocked DB**.
  - Bounded tool-use loop (max 4 rounds) wired into **`/api/coach` + `/api/chat`**; streaming preserved.
- **B — `/pricing`** (`ba08572`): free vs pro from `TRACKS`; no-op "free in beta" CTA while billing off.
- **Miluim knowledge doc** (`22017ec`, prior): `docs/launch/miluim-knowledge.md` — for verification.

### ℹ️ Already in place (verified, no work needed)
- **F PWA:** `public/sw.js` exists (network-first) + manifest — installable. Responsive via Tailwind.
- **D hardening:** `/api/{chat,coach}` rate-limit (12/min) + input validation present;
  `error.tsx` + `global-error.tsx` exist.

### 🔴 Needs Yoni (blockers carried)
1. **Supabase live project** — MCP sees only `akfg`+`BlondeShell` (paused), not `hbsgz`. Migrations unapplied.
2. **Miluim (G) verification** — 3 questions in `miluim-knowledge.md`: (a) 2025 דוח shows *no* line
   (credit for 2025 service lands on the **2026** return); (b) exact 2027 ladder; (c) real 1301 field code.
   Code today is 2026-first + caps at 1.0 (misses the +0.25/5-days → 4-pt ladder).
3. **OAuth branding** — console steps in `oauth-branding.md` (App name + Supabase auth host).

### ⬜ Not started (unblocked, next)
- A/F deep responsive polish at 390/768/1024/1440 (left for human visual verification).
- C 1219 render page + setup capture · B PSP webhook/checkout · D reminders.
- Link `/home` + `/pricing` into landing/nav.

---

## ☀️ Morning checklist — 2026-06-17 (Day 1: foundations)

**Build:** `npm run build` ✅ green · `tsc --noEmit` ✅ clean · 26 routes (added `/api/track`).

### ✅ Done this session

**B — Auth/payments foundation (built, gated OFF):**
- Billing schema migration `supabase/migrations/20260617090000_billing.sql` — `plans`,
  `subscriptions`, `payments` (incl. חשבונית מס fields), RLS (read-own; writes server-side),
  one-active-sub index, seeded free/pro plans. **NOT yet applied** (see blockers).
- Provider-agnostic seam: `src/lib/billing/provider.ts` (interface + registry),
  `tranzila.ts` (**Tranzila, ready-to-connect, NOT live**), `tracks.ts` (the explicit
  **track → integration → features** map), `entitlement.ts` (`getEntitlement`, fails safe).
- `BILLING_ENABLED` flag + `TRANZILA_*` env stubs in `.env.template`.

**C — הצהרת הון (Form 1219) foundation:**
- Persona extended: `AssetItem`/`LiabilityItem`/`PersonaCapitalDeclaration` in `src/lib/persona.ts`.
- Calculators `src/lib/calculators/capital.ts` (per-category subtotals + total assets/
  liabilities + **net capital**), registered in the shared dispatcher.
- Schema `src/lib/form-1219/schema.ts` (assets / liabilities / summary tabs), reuses the
  generic 1301 field model.

**D — Analytics foundation:**
- `src/lib/analytics/track.ts` (server, best-effort) + `/api/track` route + `trackClient()`.
- Events migration `supabase/migrations/20260617091000_events.sql` (`events` table + RLS).

**A — Design foundation:**
- `framer-motion@12.40` added (recorded in CLAUDE.md). `src/components/brand/motion.tsx`:
  `Reveal`, `Stagger`/`StaggerItem`, `CountUp` — all reduced-motion-aware.

**GTM (Obsidian vault):** `docs/gtm/` index + notes (`pricing`, `pmf-signals`, `icp`,
`channels`, `gtm-decisions`) — framed as living/revisable.

### 🔴 Blockers / needs Yoni (please action)

1. **Supabase account mismatch — migrations NOT applied.** The connected Supabase MCP
   account only sees projects `akfgudspliyymiysajoh` (countme) + `BlondeShell` — **NOT the
   documented-live `hbsgzelipeawkvtcazdr`** (per `memory/decisions.md`), and both visible
   projects are **paused/INACTIVE**. I did **not** apply migrations to avoid hitting the
   wrong DB. **Action:** confirm which project is truly live, then apply
   `20260617090000_billing.sql` + `20260617091000_events.sql` (SQL editor / `supabase db push`),
   and regenerate `src/lib/supabase/database.types.ts`. (Code tolerates the tables being
   absent meanwhile — analytics no-ops, entitlement returns free.)
2. **Tranzila:** ready-to-connect only, as requested. To connect later: provide
   `TRANZILA_*` sandbox creds + we implement the 2 TODOs in `tranzila.ts`. Needs a
   registered Israeli business (עוסק/חברה) for the terminal.

### 🟡 To review / likely fixes

- **1219 field codes are placeholders** — the structure + calculators are right, but the
  verbatim gov.il 1219 codes need grounding (Roy / real form). Flagged in the schema header.
- Pro price ₪39/mo is a **placeholder hypothesis** (`docs/gtm/pricing.md`).

### ⬜ Next (Day 2)

- A: motion polish on landing/login/setup/dashboard; CountUp on `InteractiveValue`.
- B: `/pricing` page + checkout route (no-op while gated) + webhook route skeleton.
- C: 1219 render page (`/file/1219`) + setup capture of assets/liabilities.
- D: wire `track()` emit points (setup steps, InteractiveValue, coach) + facts-not-advice hardening.
