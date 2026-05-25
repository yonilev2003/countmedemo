@AGENTS.md

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
| Stack | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 + Anthropic SDK | Latest, fast, deploys to Vercel |
| Hosting | Vercel | Project email account (NOT yoni's personal) |
| Database | Supabase | Postponed — connecting Day 2+ |
| AI model | claude-sonnet-4-6 default, claude-haiku-4-5 for cheap ops | Use prompt caching for system prompt + persona |
| Lang/dir | Hebrew, RTL only | Target market |
| Fonts | Heebo (body), Rubik (display) | Both have native Hebrew |
| Form approach | Visual reference, not 1:1 React rebuild | User's call — saves time, demo's purpose is "show what to fill" |
| Persona format | Single JSON file at `personas/dana-cohen.json` | Swappable; replace fields when running with real data |
| Regulatory-watch PDF | `puppeteer` (devDependency) renders the agent's HTML report → PDF inside CI | Headless Chromium is the most reliable way to render RTL Hebrew to PDF; bundled Chromium installs with `npm ci`, no extra runner setup |

## Skills installed (Tier 1 + Tier 2)

These come from the [skills-il](https://github.com/skills-il) GitHub org via `npx skills-il add`:

**Tier 1 (demo-critical):**
- `israeli-tax-returns` — Form 1301 rules, income classification, credits
- `hebrew-document-generator` — Hebrew PDF/DOCX generation (future)
- `israeli-id-validator` — Teudat Zehut validation

**Tier 2 (product foundations):**
- `hebrew-i18n` — RTL, Hebrew formatting, plurals
- `israeli-accessibility-compliance` — IS 5568 + WCAG 2.1 AA
- `israeli-vat-reporting` — Doch Maam preparation
- `israeli-tax-withholding` — Nikui mas bemakor
- `israeli-bituach-leumi` — National insurance benefits
- `israeli-expense-categorizer` — Auto-categorization with current Pkudat Mas rules
- `israeli-receipt-scanner` — Hebrew/English OCR for receipts
- `israeli-e-invoice` — Hashbonit electronit (mandatory 2024+)
- `hebrew-chatbot-builder` — Hebrew NLP, RTL chat UI
- `israeli-privacy-shield` — Tikun 13 compliance (effective Aug 2025)
- `israel-gov-api` — data.gov.il integration

**Pending:** [`mksglu/context-mode`](https://github.com/mksglu/context-mode) — MCP server for context/token saving. Install Day 2 (requires hook config).

**Planned (post-EY-demo, not yet installed):** [`openai/skills`](https://github.com/openai/skills) — Codex-side skills catalog for second-opinion code review. Plan: hook in `.claude/settings.json` runs Codex audit on `npm test` / `npm run build` events. Requires Codex CLI install + separate `OPENAI_API_KEY`. Don't install before demo (cost + iteration friction). Document the hook here when wired.

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
│   ├── layout.tsx                # RTL Hebrew + Heebo/Rubik fonts
│   └── globals.css               # Tax-authority palette + countme brand
├── components/
│   ├── form-1301/                # The form preview UI
│   │   ├── form-preview.tsx      # Tabs + sections + fields (gov.il blue-grey palette)
│   │   └── interactive-value.tsx # Clickable calculated number with tooltip
│   ├── agent/
│   │   └── chat-panel.tsx        # Live Claude chat with persona-aware greeting
│   └── upload/
│       └── document-upload.tsx   # 4-slot drag-drop UI for fast-track step
└── lib/
    ├── form-1301/schema.ts       # Form structure (3 tabs, sections, fields, codes)
    ├── calculators/              # Pure functions per "star field"
    │   ├── types.ts              # CalcResult, tax-year constants
    │   └── index.ts              # 8 calculators + dispatcher
    ├── business-expenses/profiles.ts # Per-occupation expense category lists
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
3. **Always run before pushing:** `npm run build` (catches type errors and Next.js issues)
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
| Outer frame | None | Yellow dashed border + "✦ countme" branding | Visual signal "this is countme, not the real form" |
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

See `NEXT_STEPS.md` for the prioritized list. High-level:

1. Wire `app/api/chat/route.ts` to Anthropic SDK with prompt caching
2. Build the **input flow** — page where the user enters their persona data via calculators
3. Connect Vercel + Supabase
4. Polish form preview to match screenshots more closely (currently approximate)
5. Install `context-mode` for token savings during long sessions
6. Add Playwright tests for the demo flow (one-shot, end-to-end, doesn't break before EY)

## Source of truth for the form structure

`src/lib/form-1301/schema.ts` is the canonical structure. Field codes match the live `secapp.taxes.gov.il` Form 1301 (tax year 2024) verbatim. The schema is intentionally **only the demo subset** — the live form has hundreds of fields; we cover the 8 stars + their surrounding context.

We don't store reference screenshots in the repo. The schema is the durable artifact — anyone reading it can see what each field is, what feeds it (calculated vs. personal), and which calculator engine drives the value.
