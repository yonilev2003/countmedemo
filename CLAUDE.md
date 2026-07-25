@AGENTS.md

# 🧠 Project memory (read first)

This repo carries a portable "brain" in `memory/` (Obsidian-compatible) — skim it before doing anything else:

- `memory/STATUS.md` — current snapshot: done / open / next action / blockers (**the source of truth for "what's left" — don't duplicate it here**)
- `memory/decisions.md` — locked decisions + why (don't reopen these)
- `memory/progress.md` — dated diary
- `memory/README.md` — stable overview

`CLAUDE.md` (this file) is the durable, rarely-changing context: architecture, conventions, locked product decisions. Keep it short — every line here costs context on every turn. If a fact changes often, it belongs in `memory/`, not here.

## Working style

- **Split work → dynamic Workflows.** When a task naturally decomposes into independent parallel sub-tasks (multi-angle research, fan-out review across files/areas, investigate-then-verify), default to the `Workflow` tool instead of doing it solo or as a long sequential chain. Reserve solo work for tasks that are genuinely single-threaded (one file, one judgment call) or trivial.
- **Verify before reporting.** Run `npm run build && npm test` before any push. A tax-constant change without a matching golden-test update in the same commit is a bug.
- **Report gaps.** Legal/regulatory gaps (anything DRAFT, unverified, or owner-pending) go in a short list at the end of substantive outputs — don't bury them.

## Session wrap-up

On **"let's wrap up the session"** (or Hebrew equivalent), no need to ask — just do it, then report:
1. Review the conversation + `git log --oneline` / `git status` / `git diff --stat`.
2. Update `memory/STATUS.md` (done items, next action, blockers) and `memory/decisions.md` (new decisions, resolved open questions).
3. Append a dated entry to `memory/progress.md`.
4. Report a 3-bullet summary; remind the user to commit `memory/`.

(`/wrap-up` slash command does the same thing explicitly.)

# countme — what it is, what's live now

countme is an AI-native financial-ops app for Israeli self-employed freelancers. **Current focus (beta, since 2026-07-19): daily-life money ops** — invoices, receipts, expenses, "who hasn't paid me", and Eitan (the AI assistant) — deliberately narrow ("רזה בכוונה"). Full plan: `docs/plans/2026-07-19-beta-sprint.md` + `docs/specs/beta/*.md` (one spec per component).

The original EY-demo product (Form 1301 split-screen walkthrough) **still exists in code, fully functional, but is hidden from all navigation** — reachable only by direct URL (`/demo`, `/file/*`, `/dashboard/pro`, `/deadlines`, `/alerts`). Don't link to it from beta-scope pages; don't delete it.

## Project decisions (locked unless re-discussed — full list + rationale in `memory/decisions.md`)

| Topic | Decision |
|---|---|
| Stack | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 + Anthropic SDK + framer-motion (`src/components/brand/motion.tsx` only) |
| Payments | Israeli PSP via `src/lib/billing/` seam — Tranzila chosen, gated by `BILLING_ENABLED` (off = free beta). **Webhook signature verification required before enabling** — see `docs/plans/2026-07-23-multi-tenant-security.md` |
| Hosting | Vercel, project email account (not personal) |
| Database | Supabase, project `hbsgzelipeawkvtcazdr` — **LIVE**, RLS on every table |
| Auth | Google OAuth via Supabase, gated by single flag `AUTH_GATING_ENABLED` (pages + APIs together) |
| AI model | `claude-sonnet-4-6` for chat/coach, `claude-haiku-4-5` for cheap ops — IDs centralized in `src/lib/ai/models.ts` |
| Lang/dir | Hebrew, RTL only |
| Fonts | Assistant (single variable, `--font-assistant`) |
| Brand | Navy `#083A4F` / beige `#C8B59A` / teal `#407E8C` — tokens in `globals.css`, primitives in `src/components/brand/`; full kit at `Brand Kit/README.md` |

## Non-negotiable rules

1. **Tax calculations are deterministic only — the LLM never computes.** Every rate/cap/rule lives in `lib/calculators/types.ts` (year-keyed, `getTaxYearConstants(year)`). Zero literals in components, prompts, or copy. Eitan's system prompt (`src/app/api/coach/route.ts`) injects constants at runtime and answers only via tools (`src/lib/agent/tools.ts`) or the curated knowledge catalog (`src/lib/agent/knowledge.ts`) — never invents a number.
2. **RLS on every Supabase table, no exceptions.** `tests/unit/security/rls-coverage.test.ts` fails the build if a migration adds a table without it. Service-role key is server-only (`src/lib/supabase/admin.ts` throws if it ever runs in the browser).
3. **No emoji anywhere in the product.** Brand Kit primitives only (`src/components/brand/{button,icons,logo,status}.tsx`) — never hand-roll a button/icon.
4. **RTL logical properties** (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`) — never `ml-`/`mr-`.
5. **A returning user's data must never be destroyed or exposed cross-account.** `/setup` merges onto the existing persona (never rebuilds `income` from scratch — `tests/unit/documents/setup-preserves-data.test.ts` locks this); protected pages use `useRequiredPersona()` (checks the DB before ever routing to `/setup`), not a bare `loadPersona()` redirect.
6. **Env-var hygiene:** every var in `.env` also appears (empty) in `.env.template`.
7. **No new framework/library/DB without writing it here first.**

## Architecture (current beta-scope surface)

```
src/app/
├── page.tsx, login/, setup/           # landing, auth, onboarding wizard (7 stages; new lean questionnaire pending — docs/specs/beta/onboarding.md)
├── dashboard/page.tsx                 # THE beta home: 3 numbers + 4 actions, empty state, deterministic Eitan line
│   └── pro/page.tsx                   # legacy rich tax dashboard ("מצב מורחב"), unlinked
├── invoices/, invoices/new/           # 4 doc kinds: tax-invoice-receipt/receipt/business-account/quote
├── receivables/page.tsx               # "מי לא שילם לי" — aging, reminders, mark-as-paid
├── coach/page.tsx + api/coach/        # Eitan chat (streaming, tool-use loop, cached system prompt)
├── d/[token]/ + api/doc-link/         # signed public document-share links (needs DOC_LINK_SECRET)
├── demo/, file/*, dashboard/pro, deadlines/, alerts/   # LEGACY 1301 flow — hidden, still auth-protected
└── privacy/, terms/, about/, pricing/ # public pages

src/lib/
├── calculators/types.ts               # year-keyed tax constants — THE single source for every number
├── invoice-generator/, dashboard/summary.ts, receivables/summary.ts   # deterministic doc/dashboard/receivables logic
├── agent/{tools,knowledge}.ts         # Eitan's deterministic tools + curated Q&A catalog
├── ai/models.ts                       # canonical Anthropic model IDs + usage logging + cache helpers
├── data/{persona-store,use-required-persona,persona-repository}.ts   # localStorage cache + Supabase write-through, DB-aware routing
├── supabase/{client,server,admin,proxy}.ts   # anon/service-role clients + auth gating (proxy.ts PROTECTED_PREFIXES)
└── doc-link.ts                        # HMAC-signed share tokens

docs/
├── plans/2026-07-19-beta-sprint.md, 2026-07-23-multi-tenant-security.md   # active roadmaps
├── specs/beta/*.md                    # per-component implementation specs
├── qa/self-check.md, beta-metrics.sql # manual QA checklist + success-metric queries
└── launch/beta-go-live-runbook.md     # step-by-step deploy/config runbook

personas/dana-cohen.json + persona.schema.json   # demo persona (anonymous-only — never seed into a real user's flow)
```

## Year-versioned regulatory data (single source — never bypass)

Every rate/cap/rule flows from **`lib/calculators/types.ts`** (`getTaxYearConstants(year)`) → `lib/regulatory/deductions.ts` (adds `formFields`/`plImpact`/`skill` per rule) → calculators, business-expenses profiles, P&L report, and Eitan's injected constants block. Adding a tax year = define it explicitly in `types.ts`; everything downstream follows automatically. The `israeli-*` skills are domain authority for *what the rule is* — never the source for the coded value; cross-check every figure against a primary source before changing a constant, and update the matching golden test in the same commit.

## Skills

Skills come from [skills-il](https://github.com/skills-il) via `npx skills`. **Tier 1** (18 skills, committed folders under `.claude/skills/`, always loaded — see `skills-lock.json` for the full catalog and promotion history): `israeli-tax-returns`, `israeli-vat-reporting`, `israeli-tax-withholding`, `israeli-bituach-leumi`, `israeli-financial-reports`, `israeli-expense-categorizer`, `israeli-receipt-scanner`, `hebrew-ocr-forms`, `israeli-e-invoice`, `israeli-id-validator`, `hebrew-i18n`, `hebrew-tailwind-preset`, `israeli-accessibility-compliance`, `israeli-ui-design-system`, `israeli-freelancer-ops`, `il-invoice-organizer`, `israeli-privacy-shield`, `israeli-ai-compliance-kit`.

**Tier 2** (~85 more, recorded in `skills-lock.json` only, zero context cost): pull on demand with `npx skills find <query>` then `npx skills add skills-il/<category> --skill <name> --agent claude-code --copy -y`. Promote to Tier 1 (commit the folder + add to the list above) only if frequently needed.

| Working on… | Skill | Key files |
|---|---|---|
| Form 1301 fields, brackets, credit points | `israeli-tax-returns` | `lib/calculators/*` |
| National insurance (030/048) | `israeli-bituach-leumi` | `lib/calculators/index.ts` |
| VAT, עוסק פטור/זעיר ceiling | `israeli-vat-reporting` | `lib/alerts/ceiling.ts` |
| Withholding at source | `israeli-tax-withholding` | `lib/calculators/index.ts` |
| Expense deduction rules | `israeli-expense-categorizer` | `lib/regulatory/deductions.ts` |
| Invoices/receipts (hashbonit, allocation numbers) | `israeli-e-invoice` | `lib/invoice-generator/*`, `app/invoices/*` |
| Teudat Zehut validation | `israeli-id-validator` | `app/setup/page.tsx` |
| Receipt OCR | `israeli-receipt-scanner` | `app/api/upload/route.ts` |
| RTL / Hebrew formatting | `hebrew-i18n` | `lib/utils.ts` |
| Accessibility (IS 5568) | `israeli-accessibility-compliance` | all pages |
| Privacy / PII (Tikun 13) | `israeli-privacy-shield` | Supabase, `docs/plans/2026-07-23-multi-tenant-security.md` |

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
Beta pages: `/`, `/setup`, `/dashboard`, `/invoices`, `/receivables`, `/coach`. Legacy: `/demo`, `/file`, `/dashboard/pro`.

## Source of truth for the legacy 1301 form structure

`src/lib/form-1301/schema.ts` — field codes match the live gov.il Form 1301 (tax year 2024) verbatim; intentionally only the demo subset (8 "star fields" + surrounding context), not the full form.
