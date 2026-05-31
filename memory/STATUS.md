# STATUS — where countme stands now

> **Current snapshot.** Update at the end of every work session. For the dated history see [[progress]].

**Last updated:** 2026-05-31
**Current branch:** `claude/dazzling-lovelace-oNCxH` (main is the trunk)
**Live:** https://countmedemo.vercel.app

---

## One-line status

The demo has grown well past its original "show the form" scope: it's now a multi-page product (form mirror + dashboard + invoices + Eitan chat + three filing tracks) with the Anthropic chat **already wired and streaming**. Core demo flow is functional. Supabase is provisioned but **not yet connected** to the app.

## What's done ✅

- **Form 1301 mirror** (`/demo`) — gov.il-faithful form, clickable calculated values with formula+source tooltips, copy buttons.
- **Calculators** — ~20 pure calculator functions in `src/lib/calculators/index.ts` (the 8 original "star fields" plus financial-institution, loss-of-work-capacity, donations, mikdamot, etc.).
- **Eitan AI agent** — wired and streaming. `/api/coach` (SSE + prompt caching) and `/api/chat` (rate-limited, 12 req/min/IP). Modes: `eitan` and `dashboard-insights`. *(This was the big "TODO" in old CLAUDE.md — it's now done.)*
- **Setup wizard** (`/setup`) — 7 stages incl. step-0 fast-track upload (XLSX via exceljs, PDF via Claude vision), persists to `localStorage`.
- **P&L dashboard** (`/dashboard`, `/dashboard/pl-report`) — Israeli-standard Doch Revach VeHefsed, Recharts, expense-to-revenue ratio insight, osek-zeir 30% rule.
- **Invoices** (`/invoices`, `/new`, `/[invoiceNumber]`) — Israeli legal format, voice-driven creation, print→PDF, running numbering, VAT rules.
- **Eitan character** — 5 poses, transparent backgrounds, logo applied across all page headers.
- **Filing tracks** (`/file`) — gateway + `expert`, `guided` (12-step), and `companion` tracks.
- **Regulatory-watch agent** — monitors official tax publications, emits a Hebrew PDF report each run (Puppeteer, in CI).
- **Vercel** — connected, auto-deploy, first deploys live.
- **Supabase** — project "CountMe" created (Data API + RLS auto-enabled).

## Open / not done yet

- **Supabase not wired into the app** — still 100% `localStorage`, no auth, no DB reads/writes. Security rules in `CLAUDE.md` must be honored before any real data goes in.
- **`context-mode` MCP** (`mksglu/context-mode`) — planned for token savings, needs hook config. Not installed.
- **Codex review hook** — planned post-demo (`.claude/settings.json` hook running Codex audit on build/test). Not wired.
- **Doc drift** — root `README.md` says `/file` has 2 tracks (expert/guided) but the code also has `companion`. `CLAUDE.md` still describes the older, narrower demo scope. Worth a reconciliation pass.
- **Stray file** — empty `env.local` (no dot) sitting in repo root alongside the real `.env.local`; likely should be deleted.

## Next best action

Decide the post-demo priority: **(a)** wire Supabase + auth so personas persist server-side, or **(b)** reconcile docs (`CLAUDE.md` + root README) with the now-broader product, or **(c)** install `context-mode` for cheaper long sessions. Pick based on whether the next milestone is "real users" (→ a) or "another demo / handoff" (→ b).

## Blockers / waiting on Yoni

- Confirm whether `ANTHROPIC_API_KEY` + Supabase env vars are set in **Vercel** (not just local `.env.local`).
- Confirm the EY demo date / whether it has already happened (drives whether we're in pre-demo polish or post-demo build mode).

## Needs review

- Uncommitted change: `package-lock.json` modified, untracked `env.local`.
- Many stale remote `claude/*` branches — candidates for cleanup.
- Old `NEXT_STEPS.md` describes "wire Claude API" as a future task, but it's done — that file is now partly historical.
