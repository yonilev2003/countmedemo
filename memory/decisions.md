# decisions — countme decision log

> Decisions already made, **why**, what was rejected, and whether they're final or revisitable.
> Purpose: stop re-litigating settled questions across chats. Snapshot = [[STATUS]] · Timeline = [[progress]].
> `CLAUDE.md` holds the full detail; this is the quick-reference log.

---

## Architecture & stack

| # | Decision | Why | Rejected | Status |
|---|----------|-----|----------|--------|
| 1 | **Next.js 16 (App Router) + React 19 + TS + Tailwind 4** | Latest, fast, Vercel-native | — | Final |
| 2 | **Anthropic SDK**, `claude-sonnet-4-6` default, `claude-haiku-4-5` for cheap ops, with prompt caching | Cost + quality balance; caching saves ~90% tokens/msg | — | Final |
| 3 | **Hosting on Vercel** under project email `countme5555@gmail.com` | Free tier, auto-deploy, not Yoni's personal account | — | Final |
| 4 | **Supabase** as the DB | Postpone wiring until Day 2+; RLS on every table before real data | — | Final (pending wiring) |
| 5 | **Hebrew / RTL only** | Target market | — | Final |
| 6 | **Heebo (body) + Rubik (display)** fonts | Native Hebrew support | — | Final |
| 7 | **exceljs** for Excel parsing | `xlsx` has unpatched prototype-pollution + ReDoS CVEs | `xlsx` | Final |
| 8 | **Recharts** for charts | React-native, RTL-friendly | — | Final |
| 9 | **Puppeteer** to render regulatory-watch HTML → Hebrew PDF in CI | Headless Chromium is the most reliable RTL-Hebrew→PDF path | — | Final |

## Product & demo scope

| # | Decision | Why | Status |
|---|----------|-----|--------|
| 10 | **Visual form reference, not a 1:1 React rebuild** of gov.il | Saves time; demo's job is "show what to fill", we don't submit | Final |
| 11 | **`/demo` form must look exactly like gov.il** — never restyle `form-preview.tsx` (hardcoded gov.il palette) | The whole pitch is "this is the real form, pre-filled" | Final (locked) |
| 12 | **No auto-submit** — viewer copy-pastes values into the real form | Submitting is a future feature, out of demo scope | Final for demo |
| 13 | **`/demo` requires `/setup` first** (redirects if no persona in localStorage) | "Everyone goes through 'update data', no exceptions" | Final (locked) |
| 14 | **Persona as a single swappable JSON** (`personas/dana-cohen.json`) | Replace fields to run with real data; all calcs re-run | Final |
| 15 | **Eitan = "smart older brother", never deflects to an accountant** | Differentiation vs. the 1,200₪ accountant | Final |
| 16 | Conscious **gov.il design diffs** (yellow countme frame, pastel calc boxes, removed action buttons, individuals-only — no "חברה בע״מ", useful file-info fields) | Each is a deliberate UX improvement or honesty signal — see `CLAUDE.md` table. Call these out when comparing to the real form. | Final |

## Integrations explicitly NOT pursued (for now)

| # | Rejected | Why | Revisit? |
|---|----------|-----|----------|
| 17 | Anthropic creative connectors (Blender/Adobe/Ableton/etc.) | Zero relevance to a Hebrew tax demo | No |
| 18 | Google Stitch (AI design-language UIs) | Conflicts with "look exactly like gov.il" | Only for `/` and `/setup`, not `/demo` |
| 19 | TurboTax connector | US tax, irrelevant to Israel | No |
| 20 | Codex review hook | Cost + iteration friction before demo | **Yes — post-demo** |
| 21 | `context-mode` MCP | Needs hook config | **Yes — Day 2** |

## Process & conventions

| # | Decision | Status |
|---|----------|--------|
| 22 | Branch naming: `claude/<name>` (AI), `feat/<name>` (manual), `fix/<desc>` | Final |
| 23 | **`npm run build` before every push** | Final |
| 24 | Secrets only in `.env.local` (gitignored) + Vercel env vars; every new var also added empty to `.env.template` | Final |
| 25 | No new framework/library/DB without recording it in `CLAUDE.md` first | Final |
| 26 | **Memory files live in `memory/` and are committed to git** (versioned, travel with repo for team handoff) | Final (2026-05-31) |

## Open questions (not yet decided)

- Should the demo chat address Dana in feminine 2nd person, or stay neutral?
- Show confidence levels (high/medium/low) at EY, or only high?
- Post-demo priority order: Supabase+auth vs. doc reconciliation vs. `context-mode`.
