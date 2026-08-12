@AGENTS.md

# 🧠 Project memory (read first)

This repo carries a portable "brain" in `memory/` (Obsidian-compatible). Skim it at the start of a session to know where things stand without scrolling old chats:

- `memory/README.md` — stable overview (what/who/why, links, how AI should help)
- `memory/STATUS.md` — current snapshot: done / open / next action / blockers
- `memory/progress.md` — dated diary of what changed over time
- `memory/decisions.md` — locked decisions + why (don't reopen these)

`CLAUDE.md` (this file) remains the canonical, detailed AI-context. `memory/` is the lightweight, frequently-updated layer on top.

## 🔚 Session wrap-up routine

When the user says **"let's finish the session"**, **"let's wrap up the session"**, **"let's wrap up"**, **"בוא נסיים את הסשן"**, or anything clearly meaning end-of-session, run this routine before signing off (no need to ask permission — just do it, then summarize what changed):

1. **Gather what happened this session** — review the conversation + run `git log --oneline` / `git status` / `git diff --stat` to see actual changes made.
2. **Update `memory/STATUS.md`** — refresh "Last updated" date + branch, move finished items to ✅, update "Next best action", blockers, and "Needs review".
3. **Append to `memory/progress.md`** — add a new dated entry at the top: what was worked on, what changed, what was tried, what worked / didn't.
4. **Update `memory/decisions.md`** — if any decision was made this session, add a row with the why + whether it's final or revisitable. Resolve any "Open questions" that got answered.
5. **Update `memory/README.md`** — only if the bigger project direction changed (new product surface, stack change, audience shift). Otherwise leave it.
6. **Keep it concise and practical** — these are for fast future-AI handoff, not prose. Convert relative dates to absolute (today's date is in the environment).
7. **Report** a 3-bullet summary of what you updated, and remind the user to commit (`git add memory/ && git commit`).

A `/wrap-up` slash command (`.claude/commands/wrap-up.md`) triggers the same routine explicitly.

# countme — Project Context

countme is an AI-native financial-ops product for Israeli self-employed people (≈352K under-35 freelancers in Israel). The product accompanies users through tax filings, beginning with **Form 1301 (annual income tax return)**.

## What we're building right now

A demo to show senior people at EY through the **Momentum** student accelerator. The demo shows:

- The user opens Form 1301 on the real Israeli tax authority site (`secapp.taxes.gov.il`) on one screen
- countme runs alongside, showing the same form with **all values pre-calculated** from the user's data
- Each calculated value is **clickable** → reveals the formula and source (which invoices/expenses fed the number)
- A chat panel lets the user ask free-text questions about the form

The viewer copy-pastes values from countme into the real form. **We are not auto-submitting** — that's a future feature.

## Project decisions (locked unless re-discussed)

| Topic | Decision | Rationale |
|---|---|---|
| Stack | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 + Anthropic SDK + framer-motion | Latest, fast, deploys to Vercel. framer-motion (12.x) added 2026-06-17 for the beta-launch UX polish — animation lives ONLY in `src/components/brand/motion.tsx` (Reveal/Stagger/CountUp), all reduced-motion-aware |
| Payments | Israeli PSP via a provider-agnostic seam (`src/lib/billing/`) — **Tranzila** is the chosen integration, **ready-to-connect but NOT live**. Gated by `BILLING_ENABLED` (off = free beta). Tracks→integration→features map in `src/lib/billing/tracks.ts` | Israel needs a real חשבונית מס; Stripe can't. Multiple paid tracks may use different integrations — kept explicit (added 2026-06-17) |
| Hosting | Vercel | Project email account (NOT yoni's personal) |
| Database | Supabase — **LIVE**, project `hbsgzelipeawkvtcazdr` (clients in `src/lib/supabase/`, migrations in `supabase/migrations/`, RLS on every table) | Went live 2026-06-10 (supersedes "Day 2+"). Note: the Supabase MCP account does NOT see this project — see `memory/STATUS.md` |
| AI model | claude-sonnet-4-6 default, claude-haiku-4-5 for cheap ops | Use prompt caching for system prompt + persona |
| Lang/dir | Hebrew, RTL only | Target market |
| Fonts | Assistant (body) + Rubik (headings/display) | Google Fonts, native Hebrew, replaced Heebo (2026-06-03); Rubik added 2026-08-12 for the Shekel-era artifacts |
| Brand system | Navy `#083A4F` (unchanged) / gold `#F5A93F` / periwinkle `#5B67E8` — tokens in `globals.css`, primitives in `src/components/brand/` | Full kit at `Brand Kit/README.md`; see "Design system" section below. Palette reweighted 2026-08-12 (was beige `#C8B59A` / teal `#407E8C`) to match the Shekel mascot + new onboarding/expense-upload artifacts |
| Form approach | Visual reference, not 1:1 React rebuild | User's call — saves time, demo's purpose is "show what to fill" |
| Persona format | Single JSON file at `personas/dana-cohen.json` | Swappable; replace fields when running with real data |

## Skills — install model (read before adding/removing skills)

Skills come from the [skills-il](https://github.com/skills-il) org (the `agentskills.co.il` catalog) via `npx skills`. We use a **three-tier model** tuned for token hygiene + reliability on ephemeral web containers. Only what's committed to the repo survives a container reset — `~/.claude/` and `node_modules` do not.

**Tier 1 — Core (committed, always loaded).** 18 skills materialized as real folders under `.claude/skills/` and committed to git (`.gitignore` ignores `.claude/*` but re-includes `!.claude/skills/`). Claude auto-loads only their name+description each session, and auto-invokes them by need. These are the demo-critical + stack skills:

| Skill | Why core |
|---|---|
| `israeli-tax-returns` | Form 1301 — the product |
| `israeli-vat-reporting` | Doch Maam |
| `israeli-tax-withholding` | Nikui mas bemakor |
| `israeli-bituach-leumi` | National insurance (field 030) |
| `israeli-financial-reports` | Israeli-standard reports |
| `israeli-expense-categorizer` | Pkudat Mas categorization |
| `israeli-receipt-scanner` | Upload flow OCR for receipts |
| `hebrew-ocr-forms` | OCR for Hebrew tax forms (106, 1301) — complements receipt-scanner for structured gov forms |
| `israeli-e-invoice` | Hashbonit electronit / SHAAM (mandatory 2024+) |
| `israeli-id-validator` | Teudat Zehut |
| `hebrew-i18n` | RTL / Hebrew formatting |
| `hebrew-tailwind-preset` | Tailwind 4 RTL — our stack |
| `israeli-accessibility-compliance` | IS 5568 + WCAG 2.1 AA |
| `israeli-ui-design-system` | gov.il patterns for `/demo` |
| `israeli-freelancer-ops` | Core target user: עצמאי ישראלי — מקדמות, תזרים, תאריכים קריטיים; this IS our persona |
| `il-invoice-organizer` | Organizes invoice data into the raw inputs that feed Form 1301 calculators |
| `israeli-privacy-shield` | Israeli Privacy Law + GDPR — mandatory for any fintech product holding tax data |
| `israeli-ai-compliance-kit` | Israeli AI regulation compliance — mandatory for an AI product with sensitive financial data |

**Tier 2 — Vetted catalog (recorded, NOT loaded).** ~85 more skills relevant to an AI accountant / Israeli startup are recorded in **`skills-lock.json`** only — they are **not** materialized as folders, so they cost **zero** session context and don't dilute skill selection. `skills-lock.json` is the durable catalog; it can grow indefinitely without bloating this file. Skills promoted from Tier 2 to Tier 1 on 2026-05-29: `israeli-freelancer-ops`, `il-invoice-organizer`, `hebrew-ocr-forms`, `israeli-privacy-shield`, `israeli-ai-compliance-kit`.

**On-demand use:** when a task needs a Tier-2 capability (payments, payroll, legal, marketing, gov forms, etc.), discover and pull it for the session:
```
npx skills find <query>                                          # search the org
npx skills add skills-il/<category> --skill <name> --agent claude-code --copy -y
```
First use costs ~3–5s + network; then it's local for the session. **Do not** run `npx skills experimental_install` routinely — it would materialize all ~110 at once and dilute every session. If a Tier-2 skill proves frequently needed, promote it to Tier 1 (keep its folder, commit it) and add a row above.

**Tier 3 — Excluded (do not install).** Personal/consumer life-admin categories with no accountant/startup relevance: most of `health-services`, `food-and-dining` (except `israeli-food-business-compliance`), `education` (except `israeli-tech-interview-prep`), and consumer `government-services` (transit, vehicle-personal, relocation, aliyah-moving, drug-database, elections, civil-defense). Don't re-litigate these per session.

**Pending:** [`mksglu/context-mode`](https://github.com/mksglu/context-mode) — MCP server for context/token saving. Install Day 2 (requires hook config).

**Planned (post-EY-demo, not yet installed):** [`openai/skills`](https://github.com/openai/skills) — Codex-side skills catalog for second-opinion code review. Plan: hook in `.claude/settings.json` runs Codex audit on `npm test` / `npm run build` events. Requires Codex CLI install + separate `OPENAI_API_KEY`. Don't install before demo (cost + iteration friction). Document the hook here when wired.

### When to consult which skill

The `israeli-*` skills are the **domain authority** for the rules behind our numbers. Before adding or changing any tax/benefit rule, consult the owning skill — don't reason from memory, and don't trust training-era figures for amounts that change yearly. Match the task to the skill:

| When you're working on… | Consult skill | Key files |
|---|---|---|
| Form 1301 fields, income classification, credit points, tax brackets | `israeli-tax-returns` | `lib/calculators/*`, `lib/form-1301/schema.ts` |
| National insurance — deduction (030) + credit (048), benefits | `israeli-bituach-leumi` | `lib/calculators/index.ts`, `lib/regulatory/deductions.ts` |
| VAT, עוסק פטור/זעיר ceiling, Doch Maam | `israeli-vat-reporting` | `lib/alerts/ceiling.ts`, `lib/calculators/types.ts` |
| Withholding at source (field 115) | `israeli-tax-withholding` | `lib/calculators/index.ts` |
| Expense categories & deduction rules (full/partial/depreciation) | `israeli-expense-categorizer` | `lib/regulatory/deductions.ts`, `lib/business-expenses/profiles.ts` |
| Invoices / receipts (hashbonit, allocation number) | `israeli-e-invoice` | `lib/invoice-generator/*`, `app/invoices/*` |
| Teudat Zehut validation | `israeli-id-validator` | `app/setup/page.tsx` |
| Receipt / document OCR upload | `israeli-receipt-scanner` | `app/api/upload/route.ts` |
| Hebrew chat UX / NLP | `hebrew-chatbot-builder` | `components/agent/*`, `app/api/chat`, `app/api/coach` |
| RTL, number/date/currency formatting, plurals | `hebrew-i18n` | `lib/utils.ts` (used everywhere) |
| Accessibility (IS 5568 / WCAG 2.1 AA) | `israeli-accessibility-compliance` | all pages/components |
| Privacy / personal-data handling (Tikun 13) | `israeli-privacy-shield` | storage, Supabase (Day 2) |
| Pulling official rates / deadlines from gov sources | `israel-gov-api` | `lib/regulatory/sources.ts` |
| Hebrew PDF / DOCX output | `hebrew-document-generator` | future invoice/report export |

### Year-versioned regulatory data (single source)

Every rate, cap, and rule is **year-keyed and flows from one place** — so when the regulator updates a year (e.g. the 2025 bracket + credit-point freeze), the change propagates to the forms, the calculations, and every annual report at once. Never hardcode a rate/cap in a component, a description string, or a report.

```
lib/calculators/types.ts   ← per-year constants (TAX_YEAR_2024, TAX_YEAR_2025, getTaxYearConstants)
        │                     • brackets/points marked FROZEN, caps marked CARRIED→TODO(Roy)
        │                     • עוסק פטור ceiling === עוסק זעיר ceiling (one shared const)
        ▼
lib/regulatory/deductions.ts ← getDeductionsTable(year): each deduction/benefit resolves its
        │                       rate/cap from the constants, and declares:
        │                         · formFields → which 1301 codes it feeds
        │                         · plImpact   → how it flows through the P&L report
        │                         · skill      → the domain skill that owns the rule
        ├──────────────► lib/calculators/index.ts  (calculations — read constants by year)
        ├──────────────► lib/business-expenses/profiles.ts  (expense guide — %/caps per year)
        └──────────────► lib/p-and-l/israeli-report.ts  (P&L — brackets by year; plImpact is the seam)
```

To add a tax year: define it in `types.ts` (every value explicit), and the downstream consumers follow automatically.

## Architecture

```
src/
├── app/                          # Next.js routes
│   ├── page.tsx                  # Landing
│   ├── demo/page.tsx             # Split-screen demo (form preview + chat)
│   ├── setup/page.tsx            # 7-stage wizard (step 0 = optional upload, 1–6 = data entry)
│   ├── business-expenses/page.tsx # Expense coaching tailored to persona.business.primaryOccupation
│   ├── api/chat/route.ts         # Anthropic chat (rate-limited, validated)
│   ├── api/upload/route.ts       # Document parser: xlsx via exceljs + PDF via Claude vision
│   ├── error.tsx, global-error.tsx # Hebrew error boundaries
│   ├── layout.tsx                # RTL Hebrew + Assistant font (variable --font-assistant)
│   └── globals.css               # @theme inline: brand tokens (navy/beige/teal) + gov.il tokens KEPT
├── components/
│   ├── brand/                    # Brand primitives (kit-compliant, no emoji, no gov.il styles)
│   │   ├── logo.tsx              # LogoMark SVG (¢ cut-circle) + Logo lockup
│   │   ├── button.tsx            # btn() class helper: primary/secondary/ghost/gold, pill shape
│   │   ├── icons.tsx             # 35+ line icons: 24px grid, 1.75px stroke, currentColor, no fill
│   │   └── status.tsx            # StatusBadge + statusStripe: on-track/due/overdue/plan
│   ├── form-1301/                # The form preview UI (gov.il styles ONLY — untouched by rebrand)
│   │   ├── form-preview.tsx      # Tabs + sections + fields (gov.il blue-grey palette)
│   │   └── interactive-value.tsx # Clickable calculated number with tooltip
│   ├── agent/
│   │   └── chat-panel.tsx        # Live Claude chat with persona-aware greeting
│   └── upload/
│       └── document-upload.tsx   # 4-slot drag-drop UI for fast-track step
└── lib/
    ├── form-1301/schema.ts       # Form structure (3 tabs, sections, fields, codes)
    ├── calculators/              # Pure functions per "star field"
    │   ├── types.ts              # CalcResult, per-year tax constants (getTaxYearConstants)
    │   └── index.ts              # 8 calculators + dispatcher
    ├── regulatory/
    │   ├── deductions.ts         # Year-keyed deductions/benefits → formFields + plImpact + skill
    │   └── sources.ts            # Live regulatory-watch fetch layer (gov sources)
    ├── business-expenses/profiles.ts # Per-occupation expense guide (universal cats from deductions.ts)
    ├── alerts/ceiling.ts         # עוסק פטור/זעיר turnover-ceiling alert (per year)
    ├── persona.ts                # Types + default persona loader
    └── utils.ts                  # cn(), formatters

personas/
├── dana-cohen.json         # Default demo persona
├── persona.schema.json     # JSON Schema for validation
└── README.md               # How to swap personas

docs/                       # Future: design docs, decision log
secrets/                    # Gitignored — account credentials + recovery codes
```

## Data flow (the demo's magic)

```
personas/dana-cohen.json
        │
        ▼
src/lib/persona.ts  ─ default export ─►  Persona object
        │
        ▼
src/lib/calculators/index.ts
   ├─ field150BusinessIncome(persona) → CalcResult
   ├─ field238Turnover(persona)       → CalcResult
   ├─ field030BituachLeumi(persona)   → CalcResult
   ├─ field137KerenHishtalmut(persona)→ CalcResult
   ├─ field020Resident(persona)       → CalcResult
   ├─ field044OlehHadash(persona)     → CalcResult
   ├─ field068Soldier(persona)        → CalcResult
   └─ field297Form6111(persona)       → CalcResult
        │
        ▼
src/lib/form-1301/schema.ts (FormField.calculator field)
        │
        ▼
src/components/form-1301/form-preview.tsx
        │
        ▼
<InteractiveValue> for calculated, plain text for personal
```

To **swap a persona**, edit `personas/dana-cohen.json` (or add a new file and update `defaultPersona` import in `src/lib/persona.ts`). All calculations re-run automatically.

## The 8 "star fields" of the demo

| Field | Section | What it is | Calculator |
|---|---|---|---|
| **150** | ג. הכנסות מיגיעה אישית | Income from main business | `field-150-business-income` |
| **238** | ז. נתונים נוספים | Total annual turnover (no VAT) | `field-238-turnover` |
| **294** | טו. מחזור למקדמות | Same value as 238 — cross-check | `field-238-turnover` |
| **030** | יב. ניכויים אישיים | Bituach Leumi self-employed (52% deductible) | `field-030-bituach-leumi` |
| **137** | יב. ניכויים אישיים | Keren Hishtalmut for self-employed | `field-137-keren-hishtalmut` |
| **020** | יג. נקודות זיכוי | Resident credit point (auto for any Israeli) | `field-020-resident` |
| **044** | יג. נקודות זיכוי | Oleh Hadash credit (3-year window) | `field-044-oleh-hadash` |
| **068** | יג. נקודות זיכוי | Discharged-soldier credit (36-month window) | `field-068-soldier` |
| **297** | פרטים כלליים | Form 6111 obligation (>256,410 ILS turnover) | `field-297-form-6111` |

## Working conventions for partners

When other team members start contributing code:

1. **Branch naming:** `claude/<short-name>` for AI-assisted work, `feat/<short-name>` for hand-written, `fix/<bug-description>` for bugfixes
2. **Each PR:** describe what changed in 3 bullets max, link the related issue if any
3. **Always run before pushing:** `npm run build` AND `npm test` (vitest golden tests in `tests/unit/` — the contract on the tax engine; a tax-constant change without a matching golden-test update in the same commit is a bug)
4. **Don't commit secrets:** `.env.local` is gitignored. API keys live in Vercel env vars.
5. **Env-var hygiene:** Every variable added to `.env` must also appear (with an empty value) in `.env.template`. The template is committed and serves as documentation for new developers. `.env` is gitignored and never committed.
6. **Hebrew + English fine:** code in English, content in Hebrew. Comments in either.
7. **Don't introduce a new framework, library, or DB without writing it here first**

## Pre-launch checklist (before EY demo)

Mapped from a generic launch-readiness checklist to **what's actually relevant for this demo**. Each row is do/skip with a reason — don't add work that doesn't apply to the current scope.

| Item | Relevant? | Status |
|---|---|---|
| Authorization (users access only their own data) | Not yet — no auth, no DB | N/A until Supabase + auth |
| Input validation/sanitization on `/api/chat` | **Yes** | TODO: validate `message` length, strip control chars |
| CORS | Default Next.js (same-origin) is fine | OK |
| **Rate limiting on `/api/chat`** | **Critical — Anthropic costs** | TODO: per-IP limit (e.g. 10/min) before going public |
| Password reset link expiry | No auth yet | N/A |
| Frontend error boundaries | Yes | TODO: add a top-level `<ErrorBoundary>` in `app/layout.tsx` |
| DB indexing | No DB yet | N/A until Supabase |
| Logging | Vercel built-in is enough for demo | OK |
| **Alerts** | **Yes — before EY** | TODO: Vercel error alerts + Anthropic usage budget alert |
| Rollback strategy | Vercel "Promote previous deployment" | Already covered |

## Security: Supabase (when wired Day 2+)

When connecting Supabase, lock these in **before** any real data goes in:

1. **Row Level Security (RLS) ON for every table.** No table is exposed without explicit policies.
2. **Clear policies per role.** Define what `anon` can read (probably nothing sensitive) vs. what `authenticated` can read/write (only their own rows: `auth.uid() = user_id`).
3. **Service role key never on the client.** `SUPABASE_SERVICE_ROLE_KEY` lives **only** in:
   - `.env.local` (gitignored)
   - Vercel env vars (Production/Preview, not exposed to browser)
   It must NOT appear in any `NEXT_PUBLIC_*` var, any client component, or any `useEffect`.
4. **Anon key is fine on the client** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) — it's designed for that, but only works through RLS-enforced policies.
5. **Test policies with both roles** (anon + a user JWT) before each schema change.

## Design decisions — where countme intentionally diverges from gov.il

The `/demo` form is faithful to `secapp.taxes.gov.il` *except* for these conscious diffs.
**When asked "compare to the real form", I must call out these diffs explicitly.**

| Element | Real gov.il | countme | Why |
|---|---|---|---|
| Outer frame | None | Beige dashed border (`#C8B59A`, 3px) + "countme" LogoMark branding | Visual signal "this is countme, not the real form" — updated to brand kit palette (2026-06-03) |
| Calculated value boxes | Plain gray input | Pastel yellow with dashed gold border (`#fff8d6` / `#d4af37`) | Subtle highlight — the value is pre-computed; tooltip on click |
| Section headers | Cream/gold band | Blue-grey gradient (`#cdddec` → `#dde7f0`) with navy text | Faithful match — gov.il uses blue-grey, never cream |
| Filled persona inputs | White box | Light blue bg (`#eef3f8`) with navy border | Faithful match — gov.il highlights filled fields with blue tint |
| Form body bg | Light grey-blue | `#f5f7fa` (light grey-blue) | Faithful match |
| Default active tab | Wherever the user last left off | **`פרטים אישיים`** (always) | Predictable demo entry; user moves to "פירוט הכנסות" themselves |
| Action buttons (שלח/בדיקה/שמירה/ניקוי/הבא) | Visible toolbar | **Removed** | We don't submit; replaced by single "המשך" CTA at the bottom |
| File info table fields | מספר תיק \| שנת מס \| שם משפחה \| ס"ת \| חוליה \| ברקוד \| גרסה | מספר תיק \| שנת מס \| שם \| ת.ז. \| עיסוק \| בנק \| חשבון | Tax-authority internals (חוליה/ס"ת/ברקוד) are useless to the user; ours are useful |
| Osek type "חברה בע״מ" | Available | **Removed** | Form 1301 is for individuals only — companies file Form 1214 |
| Status line ("דו"ח שודר ב…") | Present | Absent | We're not submitting; line would be a lie |
| Access | Anyone with the URL | **Requires `/setup` first**; `/demo` redirects to `/setup` if no localStorage persona | "כולם יעברו ב-עדכן נתונים בלי יוצא מן הכלל" — locked decision |

## Two new pages added on 2026-05-01 (post-design-review)

**`/business-expenses`** — companion page that uses `persona.business.primaryOccupation` to pick an expense profile (creative / tech / consultant / default) and shows the user the typical deductible categories for their type of business with deduction rules (full / partial / depreciation). Reachable from `/demo` header. Powered by `lib/business-expenses/profiles.ts` — extend by adding new `ExpenseProfile` entries.

**`/setup` step 0 (fast-track upload)** — optional document-upload step at the start of the wizard. 4 slots: דו״ח הכנסות (PDF), אקסל הוצאות (XLSX), טופס 106 (PDF), קבלות תרומה (PDF). Hands files to `/api/upload`:
- Excel parsed via **exceljs** (chose over `xlsx` due to known prototype-pollution + ReDoS CVEs in `xlsx` with no fix)
- PDF parsed via **Claude Haiku 4.5 vision** with per-doc prompts that return JSON
- Extracted fields auto-populate the wizard state (firstName/lastName, osekType, totalRevenue, totalDeductibleExpenses, donations)
- Returning users with a persona in localStorage skip step 0 and land on step 1 directly

## Brand Kit design system (added 2026-06-03, palette+font refreshed 2026-08-12)

Full kit lives at `Brand Kit/README.md` (committed). Key rules for every AI session:

- **No emoji anywhere** — the kit explicitly bans them. Use line icons from `src/components/brand/icons.tsx`.
- **Fonts:** `Assistant` for body (`font-sans`), **`Rubik`** for headings/display (`font-display`) — added 2026-08-12 to match the Shekel-era artifacts. Variables `--font-assistant` / `--font-rubik`, loaded in `layout.tsx`. No Heebo.
- **Palette** (via Tailwind `@theme inline` in `globals.css`) — **reweighted 2026-08-12** toward the Shekel mascot / expense-upload / onboarding artifacts; token *names* kept stable (`brand`/`beige-*` still means "the gold accent token", `brand-deep`/`teal-*` still means "the interactive accent token" — same pattern as `cream` retaining its name after an earlier amber→cream swap):
  | Token | Hex | Use |
  |---|---|---|
  | `brand-navy` | `#083A4F` | Primary CTA, headings, dark surfaces (unchanged) |
  | `brand` (gold, was beige) | `#F5A93F` | Accent, logo, borders |
  | `brand-deep` (periwinkle, was teal) | `#5B67E8` | Interactive, links, focus |
  | `cream` | `#F1EFEA` | Page background |
  | `paper` | `#FBFAF8` | Card surface |
  | `success` (mint, was `#3E8E78`) | `#17C29B` | On-track / paid |
  | `due` | `#A88A3F` | Deadline approaching (unchanged) |
  | `alert` | `#C05B45` | Overdue / error (unchanged) |
  | gov.il tokens | kept as-is | `tax-blue`, `tax-yellow`, etc. — for form-1301/form-1219 only, never reweighted |

- **Traffic-light status system:** `on-track` (mint) · `due` (gold) · `overdue` (terracotta) · `plan` (periwinkle). Always use `<StatusBadge>` from `src/components/brand/status.tsx`.
- **gov.il-faithful surfaces are exempt** from brand tokens — all `gov-*`/`tax-*` classes and hardcoded gov-blue hex stay untouched. This covers **three** surfaces, not just `/demo`: `form-preview.tsx` (`/demo`, Form 1301), `form-1219/form-preview.tsx` (`/file/1219`, Form 1219 capital declaration), and the extra inline gov-styled hex in `file/companion/page.tsx`. All three were verified to share zero token names with the brand palette, so the 2026-08-12 refresh could not have touched them even before this note existed — documented here so nobody "fixes" them into the new palette by mistake.
- **Buttons:** always use `btn(variant, size)` from `src/components/brand/button.tsx`. Variants: `primary` / `secondary` / `ghost` / `gold`. All are pill-shaped.
- **Shadows:** `shadow-brand` (soft navy lift). No tailwind `shadow-md/lg` on countme surfaces.
- **RTL:** use logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) everywhere. Avoid `ml-`/`mr-`.
- **`src/components/brand/colors.ts` is a hand-maintained JS mirror of the CSS tokens** (for SVG/recharts/inline-style contexts) — it does NOT auto-derive from `globals.css`. Any palette change must edit both files in the same commit, or it silently drifts (this happened once already — `about/page.tsx`'s brand-token doc table had drifted from the real `success` value before the 2026-08-12 refresh caught and fixed it).

## Why we are NOT integrating these (right now)

Triaged from suggestions during development:

- **Anthropic creative connectors (Blender/Adobe/Ableton/Photoshop/Splice/etc.)** — released April 2026. All for creative tools. Zero relevance to a Hebrew tax-form demo.
- **Google Stitch (`google-labs-code/stitch-skills`)** — generates "AI design language" UIs. Conflicts with the explicit goal that `/demo` looks **exactly like gov.il**. Reconsider only for `/` and `/setup` pages.
- **TurboTax connector** — US tax, irrelevant for Israeli market.
- **Codex review hook** — see "Planned" note above. Worth doing post-demo when iteration speed matters less than review depth.

## How to run locally

```
npm install
npm run dev    # http://localhost:3000
```

Pages:
- `/` — Landing
- `/demo` — The full demo (split-screen + chat)

## What's NOT done yet

(`NEXT_STEPS.md` was retired — current state lives in `memory/STATUS.md`; review reports in `docs/reviews/`.)

Superseded: chat IS wired (tool-use loop over the deterministic calculators), Vercel+Supabase ARE live, Playwright e2e EXISTS and is green (`npm run test:e2e`; in managed web containers set `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium` plus dummy `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`).

Actually open (corrected 2026-08-12 — item 1 was stale, see memory/STATUS.md which is the frequently-updated layer for this kind of status; check there first before trusting this list):

1. ~~Flip `AUTH_GATING_ENABLED=true`~~ — **done** (confirmed live 2026-08-03 per memory/STATUS.md). Still open: Preview deployments can bypass gating if the flag is only set on Production — verify both environments.
2. Apply billing+events migrations on `hbsgz` + run the WS7 blocked-checks checklist (`docs/reviews/2026-07-02-ws7-*`)
3. PII minimization before non-founder users (plan in the WS7 report); Tranzila webhook signature before `BILLING_ENABLED`
4. External legal review of all `DRAFT — NEEDS LEGAL REVIEW` copy (`<LegalNote>`, scope statement in `docs/reviews/2026-07-02-ws8-*`) — no assigned reviewer since 2026-07-02; legal/financial gaps are surfaced as a structured list at the end of every AI-session output instead
5. `FLAG(Roy)` burn-down in `lib/calculators/types.ts`: 2025/2026 pension caps, 2026 donations floor, §45א life-insurance ceiling
6. Durable rate limiting (Vercel WAF now, Supabase counter later) + CSP enforce after report-only monitoring
7. Install `context-mode` for token savings during long sessions (see the Skills section above for the same pending item — don't duplicate further edits, update there)

## Source of truth for the form structure

`src/lib/form-1301/schema.ts` is the canonical structure. Field codes match the live `secapp.taxes.gov.il` Form 1301 (tax year 2024) verbatim. The schema is intentionally **only the demo subset** — the live form has hundreds of fields; we cover the 8 stars + their surrounding context.

We don't store reference screenshots in the repo. The schema is the durable artifact — anyone reading it can see what each field is, what feeds it (calculated vs. personal), and which calculator engine drives the value.
