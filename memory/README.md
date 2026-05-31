# countme — Project Brain (README)

> **Stable overview.** Only edit when the bigger project direction changes — not every session.
> For "where we are right now" see [[STATUS]]; for the timeline see [[progress]]; for locked choices see [[decisions]].

---

## What it is

countme is an **AI-native financial-ops product for Israeli self-employed people** (≈352K under-35 freelancers in Israel). It accompanies a user through the whole tax year — invoices, expenses, a profit-and-loss dashboard — and computes every field of the annual income-tax return automatically, on Israeli tax law.

The AI agent is **Eitan (איתן)** — a "smart older brother" persona. He never deflects to an accountant, proactively surfaces expenses the user missed, and quietly applies deduction rules (30% home-office, Section 46 donations, Bituach Leumi, etc.).

The first full flow is **Form 1301 (annual income-tax return, דו״ח שנתי)**. Each calculated value on the form is **clickable** → reveals the formula and the source invoices/expenses that fed the number.

## Who it's for

Israeli self-employed people, primarily under 35, who:
- are afraid of the tax authority,
- pay ~1,200₪ per return to an accountant,
- get slow, error-prone, human service.

countme is the always-on, free, lower-error alternative.

## Why it matters

This is a **student-accelerator (Momentum) venture** being demoed to senior people at **EY**. The demo is the proof that an AI agent can own a real, regulated Israeli tax workflow end-to-end. Winning EY's confidence is the near-term goal; the product thesis is "AI that knows your business, open 24/7, free, and wrong less often than a human."

## Useful links

- **Live demo:** https://countmedemo.vercel.app
- **Real form being mirrored:** Israeli Tax Authority Form 1301 at `secapp.taxes.gov.il`
- **Hosting:** Vercel (project email `countme5555@gmail.com`, *not* Yoni's personal)
- **DB:** Supabase project "CountMe" (provisioned, not yet wired into the app)
- **Repo docs:** root `README.md` (technical, Hebrew), `CLAUDE.md` (canonical AI context), `NEXT_STEPS.md`, `docs/PRE_DEMO_CHECKLIST.md`

## How AI should help

- **Read `CLAUDE.md` first** — it is the canonical, detailed AI-context file (stack, locked decisions, architecture, the gov.il design diffs). This brain summarizes and tracks; `CLAUDE.md` is the source of truth for conventions.
- **Hebrew + RTL is the product.** Code in English, content in Hebrew. The `/demo` form must look *exactly* like gov.il — never restyle `form-preview.tsx`.
- **Respect locked decisions** in [[decisions]] — don't reopen settled questions.
- **Next.js 16 has breaking changes** vs. training data (see `AGENTS.md`). Read `node_modules/next/dist/docs/` before writing Next code.
- **Always `npm run build` before pushing.** Don't introduce a new framework/library/DB without recording it in `CLAUDE.md` first.
- At the **end of a session**, when the user says "let's wrap up / finish the session", run the wrap-up routine (see `CLAUDE.md` → *Session wrap-up*) to refresh [[STATUS]], [[progress]], [[decisions]], and this file.

## The stack (one-liner)

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 + Anthropic SDK (`claude-sonnet-4-6`, `claude-haiku-4-5` for cheap ops), Recharts, exceljs. Hosted on Vercel. Hebrew/RTL only. See [[decisions]] for the why behind each.
