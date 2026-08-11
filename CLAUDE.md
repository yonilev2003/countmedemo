@AGENTS.md

# 🧠 Project memory (read first)

This repo carries a portable "brain" in `memory/` (Obsidian-compatible) — skim it before doing anything else:

- `memory/STATUS.md` — current snapshot: done / open / next action / blockers (**the source of truth for "what's left" — don't duplicate it here**)
- `memory/decisions.md` — locked decisions + why (don't reopen these)
- `memory/progress.md` — dated diary
- `memory/README.md` — stable overview

`CLAUDE.md` (this file) is the durable, rarely-changing context: architecture, conventions, locked product decisions. Keep it short — every line here costs context on every turn. If a fact changes often, it belongs in `memory/`, not here.

## Working style

- **Split work → dynamic Workflows.** When a task naturally decomposes into independent parallel sub-tasks (multi-angle research, fan-out review across files/areas, investigate-then-verify), default to the `Workflow` tool (or parallel background agents on disjoint files) instead of doing it solo or as a long sequential chain. Reserve solo work for tasks that are genuinely single-threaded (one file, one judgment call) or trivial.
- **Verify before reporting.** Run `npm run build && npm test` before any push. A tax-constant change without a matching golden-test update in the same commit is a bug. For a new user-facing route/flow, do a real browser check (Playwright against a local `npm run dev`, or manual) before calling it done — type checks and unit tests verify correctness, not that the UI actually renders.
- **Report gaps, clustered.** End substantive outputs with a short gaps list, grouped by kind (access/environment · product/knowledge decisions only a human can make · data/verification uncertainty · legal/regulatory) rather than one flat list — makes it obvious which gaps are yours to resolve vs. the founder's.

## Session wrap-up

On **"let's wrap up the session"** (or Hebrew equivalent), no need to ask — just do it, then report:
1. Review the conversation + `git log --oneline` / `git status` / `git diff --stat`.
2. Update `memory/STATUS.md` (done items, next action, blockers) and `memory/decisions.md` (new decisions, resolved open questions).
3. Append a dated entry to `memory/progress.md`.
4. Report a 3-bullet summary; remind the user to commit `memory/`.

(`/wrap-up` slash command does the same thing explicitly.)

# countme — what it is, what's live now

countme is an AI-native financial-ops app for Israeli self-employed freelancers. **Current focus (beta, since 2026-07-19): daily-life money ops** — invoices, receipts, expenses, "who hasn't paid me", and a chat assistant (character identity in `src/lib/agent/character.ts` — swap the name/avatar there, never hardcode it) — deliberately narrow ("רזה בכוונה"). Full plan: `docs/plans/2026-07-19-beta-sprint.md` + `docs/specs/beta/*.md` (one spec per component; raw founder-provided reference mockups/specs live in `docs/specs/beta/artifacts/`).

**Entry point is `/onboarding`** (a ≤3-minute lite questionnaire — no-fabrication principle: it never writes a fabricated number to the tax engine) → lands on `/dashboard`. `/setup` is the deferred "complete your filing details" flow (the old 7-stage wizard), reached later, not the entry point.

The original EY-demo product (Form 1301 split-screen walkthrough) **still exists in code, fully functional, but is hidden from all navigation** — reachable only by direct URL (`/demo`, `/file/*`, `/dashboard/pro`, `/deadlines`, `/alerts`). Don't link to it from beta-scope pages; don't delete it.

## Project decisions (locked unless re-discussed — full list + rationale in `memory/decisions.md`)

| Topic | Decision |
|---|---|
| Stack | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 + Anthropic SDK + framer-motion (`src/components/brand/motion.tsx` only) |
| Payments | Israeli PSP via `src/lib/billing/` seam — Tranzila chosen, gated by `BILLING_ENABLED` (off = free beta). **Webhook signature verification required before enabling** — see `docs/plans/2026-07-23-multi-tenant-security.md` |
| Hosting | Vercel, project email account (not personal) |
| Database | Supabase, project `hbsgzelipeawkvtcazdr` — **LIVE**, RLS on every table |
| Auth | Google OAuth via Supabase, gated by single flag `AUTH_GATING_ENABLED` (pages + APIs together). **No password/SMS auth** — don't add a second auth mechanism without an explicit founder decision |
| AI model | `claude-sonnet-4-6` for chat/coach, `claude-haiku-4-5` for cheap ops — IDs centralized in `src/lib/ai/models.ts` |
| Lang/dir | Hebrew, RTL only |
| Fonts | Assistant (single variable, `--font-assistant`) |
| Brand | Navy `#083A4F` / beige `#C8B59A` / teal `#407E8C` — tokens in `globals.css`, primitives in `src/components/brand/`; full kit at `Brand Kit/README.md`. **This palette is locked** — a founder-provided mockup in a different palette is a UX/interaction reference, never a literal color source, unless a palette change is explicitly discussed and approved |
| Business type | Individuals only (זעיר/פטור/מורשה) — no "חברה בע״מ" option anywhere (companies file Form 1214, out of scope) |

## Non-negotiable rules

1. **Tax calculations are deterministic only — the LLM never computes.** Every rate/cap/rule lives in `lib/calculators/types.ts` (year-keyed, `getTaxYearConstants(year)`). Zero literals in components, prompts, or copy. The chat assistant's system prompt (`src/app/api/coach/route.ts`) injects constants at runtime and answers only via tools (`src/lib/agent/tools.ts`) or the curated knowledge catalog (`src/lib/agent/knowledge.ts`) — never invents a number. Same rule for the expense-recognition dataset (`src/lib/expense-engine/`, below): a recognition rate is always read from the dataset or explained via `explainFormula()`, never hand-computed or hardcoded in a component/prompt.
2. **RLS on every Supabase table, no exceptions.** `tests/unit/security/rls-coverage.test.ts` fails the build if a migration adds a table without it. Service-role key is server-only (`src/lib/supabase/admin.ts` throws if it ever runs in the browser).
3. **No emoji anywhere in the product.** Brand Kit primitives only (`src/components/brand/{button,icons,logo,status}.tsx`) — never hand-roll a button/icon.
4. **RTL logical properties** (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`) — never `ml-`/`mr-`.
5. **A returning user's data must never be destroyed or exposed cross-account.** `/setup` merges onto the existing persona (never rebuilds `income` from scratch — `tests/unit/documents/setup-preserves-data.test.ts` locks this); protected pages use `useRequiredPersona()` (checks the DB before ever routing to `/onboarding`), not a bare `loadPersona()` redirect.
6. **Env-var hygiene:** every var in `.env` also appears (empty) in `.env.template`.
7. **No new framework/library/DB without writing it here first.**

## Architecture (current beta-scope surface)

```
src/app/
├── page.tsx, login/, onboarding/       # landing, auth, lite entry questionnaire (≤3 min, no-fabrication)
├── setup/                              # DEFERRED "complete your filing details" flow (old 7-stage wizard)
├── guides/opening/                     # factual placeholder for tier=pre users who haven't opened a file yet
├── dashboard/page.tsx                  # THE beta home: 3 numbers + 4 actions, empty state, deterministic chat line
│   └── pro/page.tsx                    # legacy rich tax dashboard ("מצב מורחב"), unlinked
├── invoices/, invoices/new/            # 4 doc kinds: tax-invoice-receipt/receipt/business-account/quote
├── expenses/                           # receipt-upload + review-confirm + summary (batch OCR via api/upload)
├── business-expenses/                  # expense guide: universal categories + the 113-profession picker
├── receivables/page.tsx                # "מי לא שילם לי" — aging, reminders, mark-as-paid
├── coach/page.tsx + api/coach/         # chat (streaming, tool-use loop, cached system prompt)
├── d/[token]/ + api/doc-link/          # signed public document-share links (needs DOC_LINK_SECRET)
├── demo/, file/*, dashboard/pro, deadlines/, alerts/   # LEGACY 1301 flow — hidden, still auth-protected
└── privacy/, terms/, about/, pricing/  # public pages

src/lib/
├── calculators/types.ts                # year-keyed tax constants — THE single source for every number
├── expense-engine/                     # 2026 expense-recognition dataset (62 rules/113 professions/596
│                                        #   profession-specific items) — knowledge layer, NOT wired into
│                                        #   calculators/deductions; regenerate via `npm run gen:expense-data`
│                                        #   from data/expense-recognition/<year>.xlsx (source of record)
├── onboarding/                         # journey/tier persona model, buildLitePersona (zero fabricated
│                                        #   numbers), next-steps checklist, ONBOARDING_ROUTE constant
├── expense-upload/                     # pure logic for the /expenses flow (validation, FX, CSV export)
├── invoice-generator/, dashboard/summary.ts, receivables/summary.ts   # deterministic doc/dashboard/receivables logic
├── agent/{character,tools,knowledge}.ts   # chat character identity + deterministic tools + curated Q&A
├── ai/models.ts                        # canonical Anthropic model IDs + usage logging + cache helpers
├── data/{persona-store,use-required-persona,persona-repository}.ts   # localStorage cache + Supabase write-through, DB-aware routing
├── supabase/{client,server,admin,proxy}.ts   # anon/service-role clients + auth gating (proxy.ts PROTECTED_PREFIXES)
└── doc-link.ts                         # HMAC-signed share tokens

docs/
├── plans/2026-07-19-beta-sprint.md, 2026-07-23-multi-tenant-security.md   # active roadmaps
├── specs/beta/*.md (+ artifacts/)      # per-component implementation specs + raw founder references
├── regulatory/regulatory-map-2026.md   # business-knowledge reference (obligations map) — not a feature
├── qa/self-check.md, beta-metrics.sql  # manual QA checklist + success-metric queries
├── launch/beta-go-live-runbook.md      # step-by-step deploy/config runbook
└── archive/                            # superseded plans/reviews — historical, don't build against these

personas/dana-cohen.json + persona.schema.json   # demo persona (anonymous-only — never seed into a real user's flow)
```

## Year-versioned regulatory data (single source — never bypass)

Every rate/cap/rule flows from **`lib/calculators/types.ts`** (`getTaxYearConstants(year)`) → `lib/regulatory/deductions.ts` (adds `formFields`/`plImpact`/`skill` per rule) → calculators, business-expenses profiles, P&L report, and the chat assistant's injected constants block. Adding a tax year = define it explicitly in `types.ts`; everything downstream follows automatically. The `israeli-*` skills are domain authority for *what the rule is* — never the source for the coded value; cross-check every figure against a primary source before changing a constant, and update the matching golden test in the same commit.

The expense-recognition dataset (`src/lib/expense-engine/`) follows the same year-keyed pattern but is a **parallel, separate** source — it does not feed `types.ts`/`deductions.ts`, and its numbers are cross-checked against them in `tests/unit/expense-engine/dataset.test.ts` rather than merged. Treat a divergence between the two as a bug to reconcile by hand, not something to silently paper over.

## Skills

Skills come from [skills-il](https://github.com/skills-il) via `npx skills`. **Tier 1** (8 skills, committed folders under `.claude/skills/`, always loaded — see `skills-lock.json` for the full ~120-skill catalog and promotion/demotion history): `israeli-tax-returns`, `israeli-vat-reporting`, `israeli-bituach-leumi`, `israeli-freelancer-ops`, `israeli-e-invoice`, `hebrew-i18n`, `israeli-accessibility-compliance`, `israeli-privacy-shield`.

**Tier 2** (~114 more, recorded in `skills-lock.json` only, zero context cost): pull on demand with `npx skills find <query>` then `npx skills add skills-il/<category> --skill <name> --agent claude-code --copy -y`. Promote to Tier 1 (commit the folder + add to the list above) only if frequently needed. Demoted 2026-08-11 (still in the catalog, just not committed — the knowledge they covered is now either implemented in code or infrequently needed): `israeli-expense-categorizer` (superseded by `src/lib/expense-engine/` — a verified dataset, not a skill lookup), `israeli-receipt-scanner`, `hebrew-ocr-forms`, `israeli-ui-design-system`, `hebrew-tailwind-preset` (design system fully established in `src/components/brand/`), `israeli-ai-compliance-kit`, `israeli-id-validator` (validation implemented), `il-invoice-organizer`, `israeli-financial-reports` (P&L implemented; full annual-report surfaces are hidden in beta), `israeli-tax-withholding` (1301 surfaces hidden in beta).

| Working on… | Skill | Key files |
|---|---|---|
| Form 1301 fields, brackets, credit points | `israeli-tax-returns` | `lib/calculators/*` |
| National insurance (030/048) | `israeli-bituach-leumi` | `lib/calculators/index.ts` |
| VAT, עוסק פטור/זעיר ceiling | `israeli-vat-reporting` | `lib/alerts/ceiling.ts` |
| Expense recognition per profession | *(no skill — the dataset is the authority)* | `lib/expense-engine/` |
| Invoices/receipts (hashbonit, allocation numbers) | `israeli-e-invoice` | `lib/invoice-generator/*`, `app/invoices/*` |
| RTL / Hebrew formatting | `hebrew-i18n` | `lib/utils.ts` |
| Accessibility (IS 5568) | `israeli-accessibility-compliance` | all pages |
| Privacy / PII (Tikun 13) | `israeli-privacy-shield` | Supabase, `docs/plans/2026-07-23-multi-tenant-security.md`, `docs/regulatory/regulatory-map-2026.md` |
| Freelancer ops (aging, deadlines) | `israeli-freelancer-ops` | `lib/receivables/*`, `lib/deadlines/*` |

## Working conventions

1. **Branch naming:** `claude/<short-name>` (AI-assisted), `feat/<short-name>`, `fix/<bug-description>`.
2. **Non-coder contributors:** see `CONTRIBUTING-HE.md` (golden path + Yoni's merge checklist).
3. **Hebrew + English fine:** code in English, product content in Hebrew.

## Security (Supabase — live, not "Day 2+")

1. RLS on every table, `with check` on writes, `anon` denied by default.
2. `SUPABASE_SERVICE_ROLE_KEY` server-only — never `NEXT_PUBLIC_*`, never a client component.
3. Full hardening plan + manual-step runbook: `docs/plans/2026-07-23-multi-tenant-security.md`, `docs/launch/beta-go-live-runbook.md`.

## `/demo` — legacy gov.il-faithful form (hidden, still in code)

Faithful to `secapp.taxes.gov.il` except deliberate diffs (beige branded border, pastel-yellow calculated-value boxes, no submit toolbar, individuals-only osek types). Full diff table lives in git history of this file if ever needed again; don't restore this section unless `/demo` re-enters the main nav.

## How to run locally

```
npm install
npm run dev    # http://localhost:3000
```
Beta pages: `/`, `/onboarding`, `/setup`, `/dashboard`, `/invoices`, `/expenses`, `/business-expenses`, `/receivables`, `/coach`. Legacy: `/demo`, `/file`, `/dashboard/pro`.

In managed web containers, e2e needs `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium` plus dummy `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `playwright.config.ts`). To regenerate the expense-recognition dataset from a new xlsx: `npm run gen:expense-data`.

## Source of truth for the legacy 1301 form structure

`src/lib/form-1301/schema.ts` — field codes match the live gov.il Form 1301 (tax year 2024) verbatim; intentionally only the demo subset (8 "star fields" + surrounding context), not the full form.
