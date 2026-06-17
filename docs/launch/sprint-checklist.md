---
title: Beta-launch sprint — morning checklists
type: launch
updated: 2026-06-17
branch: claude/beta-launch-prep-z2m6f5
---

# Beta-launch sprint — morning checklists

> One dated section per work session. Newest on top. Each session ends here so
> Yoni can review before we proceed. **Assume fixes** — flag anything to change.
> Plan: `/root/.claude/plans/eager-hopping-blum.md` (4 workstreams A/B/C/D).

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
