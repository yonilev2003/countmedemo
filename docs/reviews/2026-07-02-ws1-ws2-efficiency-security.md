# WS1 + WS2 — Code Efficiency & Security Pre-Launch Review

Date: 2026-07-02 · Branch: `claude/tax-product-architecture-9s3gyk` · Scope: root app (crm-snapshot/ out of scope per Gate 1, see §1.6)

---

## Part 1 — WS1: Efficiency / dead code (prioritized)

Verdicts: ✅ = removed this run · 🎫 = ticket (safe but not urgent) · ✋ = keep, documented why

| # | Item | Evidence | Risk of removal | Effort | Verdict |
|---|---|---|---|---|---|
| 1 | Duplicate ₪ formatter re-implemented ~13× vs canonical `formatCurrency` | `src/lib/utils.ts:16` vs `lib/alerts/ceiling.ts`, `lib/forecast/index.ts`, `lib/calculators/{index,capital}.ts`, `lib/agent/tools.ts`, `app/dashboard/page.tsx`, `app/setup/assets/page.tsx`, `app/file/1219/page.tsx`, `components/dashboard/{forecast-card,income-ceiling-card,pl-chart}.tsx`, `lib/p-and-l/israeli-report.ts:334` | None (pure display) | S | ✅ consolidated in the Batch-B brand pass |
| 2 | Dead exports: `OSEK_ZEIR_RULES`, `ZEIR_RECOGNITION_RATE`, `ZEIR_REVENUE_CEILING` | were `lib/calculators/index.ts:892`, `lib/p-and-l/expense-ratio.ts:27-28`; zero importers | None | S | ✅ removed (WS4 commit) |
| 3 | Obsolete untyped casts — `database.types.ts` now covers all 13 tables | `lib/billing/entitlement.ts:70-89`, `lib/analytics/track.ts:45-49` | None (types only) | S | 🎫 quick follow-up |
| 4 | Unused deps | none found — all 11 runtime deps imported; `puppeteer` devDep is used by the regulatory-watch CI report | — | — | ✋ nothing to remove |
| 5 | `/about` page (internal token/route index) ships to production | `src/app/about/page.tsx` | Low — informational | S | 🎫 gate behind dev-only or drop pre-GA |
| 6 | `crm-snapshot/` — a second full app in the repo (own Supabase migrations) | `/crm-snapshot` | n/a | M | 🎫 extract to its own repo; it bloats clones, confuses greps/audits, and its migrations could be mistaken for the product's. No secrets found at a glance; NOT security-reviewed (out of scope) |
| 7 | `src/app/setup/page.tsx` ~1,700-line client component (largest client payload) | whole file | Medium (behavioral) | L | 🎫 split per wizard step post-launch; not before EY |
| 8 | `src/lib/regulatory/{sources,classify,types}.ts` unimported by the app | imported by `scripts/regulatory-watch/run.ts:21-22` (CI) | HIGH if removed — CI breaks | — | ✋ keep; app-dead but CI-live |
| 9 | Bundle health | exceljs server-only; framer-motion isolated to `components/brand/motion.tsx`; recharts isolated to `pl-chart.tsx`; landing is a server component | — | — | ✋ healthy |

## Part 2 — WS2: Security checklist (severity = exploitability × impact)

### Fixed this run (commits `42ed640`, `52a1bbf`)

| Severity | Finding | Fix |
|---|---|---|
| HIGH | `next@16.2.4` — multiple high advisories incl. middleware/proxy auth-bypass (GHSA-26hh-7cqf-hhc6 et al.) while auth gating lives in middleware | Upgraded to 16.2.10 (patch); prod audit now clean of high |
| HIGH | Zero security headers on a product holding teudat zehut | HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, CSP (Report-Only), `poweredByHeader:false` in `next.config.ts` |
| HIGH | AI API routes (chat/coach/upload/parse-invoice) unauthenticated even when page gating is on | `src/lib/security/api-guard.ts` — 401 when `AUTH_GATING_ENABLED=true`; open-beta behavior unchanged while flag off |
| MED | Rate limiting keyed on spoofable `x-forwarded-for`; upload's map unbounded | Shared limiter (`src/lib/security/rate-limit.ts`): user-id key first, platform-set IP headers next, bounded maps, stricter anonymous bucket |
| MED | Upload type check = extension/client MIME only | Magic-byte validation (`%PDF-`, zip `PK`); legacy `.xls` dropped (exceljs never parsed it) |

### MUST FIX BEFORE LAUNCH (open — owner in bold)

1. **Yoni**: set `AUTH_GATING_ENABLED=true` in Vercel + redeploy. Everything (pages + APIs + Anthropic budget) is open until this flips. *(Env change — deliberately not made by the agent.)*
2. **Yoni**: Anthropic usage budget alert + Vercel error alerts (pre-launch checklist item, still open).
3. **Yoni/Roy**: apply the billing + events migrations on `hbsgzelipeawkvtcazdr` and verify (WS7 report §blocked checklist has the exact SQL/MCP steps). Failures are silent by design today.
4. **Code (ticketed)**: durable rate limiting — in-memory is per-serverless-instance. Recommended: Vercel WAF rule now (no code), Supabase-backed counter later (needs a decision — new table + 1 query/request; documented in `rate-limit.ts`).
5. **Code (ticketed, before non-founder users — Tikun 13)**: PII minimization — teudat zehut + bank + income in plaintext `localStorage` AND written wholesale from the browser into `profiles.persona`. Plan (mask-at-the-seam, local-overlay merge, backfill SQL) is in the WS7 report. Also: strip real name from `buildRichContext` LLM context (ticket), document that uploaded documents go to Anthropic (privacy policy — **Yael**).
6. **Before `BILLING_ENABLED` ever flips**: implement Tranzila webhook signature verification (`lib/billing/tranzila.ts` `parseWebhook` is a stub returning `ok:false` — currently inert, but flipping billing without it lets anyone mint subscriptions).
7. **Code (ticketed)**: move CSP from Report-Only to enforced after ~2 weeks of monitoring; replace `unsafe-inline` with nonces.

### Accepted risks (documented)

- `postcss` moderate advisory bundled inside next (build-time CSS stringify; no non-breaking fix; re-check on next's next release).
- In-memory rate limiter resets per instance/deploy (mitigations above).
- `x-forwarded-for` fallback still used when platform headers absent (local dev only in practice).

### Positive posture (verified, keep it this way)

No hardcoded secrets; `SUPABASE_SERVICE_ROLE_KEY`/`TRANZILA_*` server-only; strong input validation on all AI routes; model-output field-whitelisting in upload; RLS correct in all three migrations (statically); server-side price/userId enforcement in billing/track; no PII in logs; `.gitignore` covers secrets/env/pem; cross-user localStorage cache guarded by owner-stamp.
