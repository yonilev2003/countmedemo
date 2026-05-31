# progress — countme project diary

> **Dated log** of what happened, what changed, what was tried. Newest at the top.
> Reconstructed from git history on 2026-05-31; future entries are added at session wrap-up.
> Snapshot = [[STATUS]] · Locked choices = [[decisions]].

---

## 2026-05-31 — Memory system set up
- Created this Obsidian "brain": `memory/{README,STATUS,progress,decisions}.md`.
- Wired a session wrap-up routine (see `CLAUDE.md`) triggered by "let's wrap up the session".
- Audited current repo state — confirmed the product is now far broader than original CLAUDE.md scope.

## 2026-05-25 — Regulatory-watch agent
- `feat: regulatory-watch agent emits a Hebrew PDF report each run` — Puppeteer renders the agent's HTML report → RTL Hebrew PDF inside CI.
- `feat: enrich chat agent context with per-field calc breakdown + align Haiku model id` — Eitan now gets per-field calculation context; Haiku model id corrected.

## 2026-05-22 — Regulatory monitoring
- `feat: regulatory-watch agent — monitor official tax publications` — first version of the agent that watches official tax sources (`src/lib/regulatory/`, `scripts/regulatory-watch/`).

## 2026-05-14/15 — Dashboard depth
- `feat: Israeli-standard P&L report (Doch Revach VeHefsed) on /dashboard`.
- `feat: voice-driven invoice creation + dashboard sync`.
- `feat: expense-to-revenue ratio insight + zeir 30% rule on dashboard & business-expenses`.

## 2026-05-11/13 — Phase 2: Eitan, dashboard, invoices, branding
- `feat: Phase 2 — Eitan guide, P&L dashboard, invoice generator, full nav`.
- `feat: CountMe logo + transparent-background Eitan poses`; logo applied to all page headers.
- Eitan character poses 1–5 created and wired per-module; fixed image format issues (real binary JPEGs, `.jpg` extension).

## Earlier — Companion track & foundations
- `feat: ליווי צמוד track` — companion filing path added to `/file` (gateway 3rd card + companion page + Hebrew TTS + embedded gov.il section).
- `feat: unified report (demo+copy), auto-period dashboard, osek-zeir warning, guided edit, /about`.
- `feat: redesign landing page + write technical README`.
- `feat: Stage 3 integration — full nav, features grid, setup→dashboard redirect`.
- Foundation stages: persona JSON + calculators + Form 1301 schema + the split-screen demo + chat panel scaffolding.

---

### How to read this log
Entries are grouped by date from `git log`. The genuinely important shift to capture: the project moved from a **single-screen Form 1301 demo** (original CLAUDE.md vision) to a **multi-surface product** — adding the Eitan agent, a P&L dashboard, an invoice generator, three filing tracks, and a regulatory-watch agent. Future sessions: add a dated entry here at wrap-up.
