# WS7 — Supabase Architecture Review

> **Date:** 2026-07-02 · **Method: static analysis only — all live checks blocked by account access.**
> The production project is `hbsgzelipeawkvtcazdr`; the connected Supabase MCP account cannot see it
> (it sees only the abandoned `akfgudspliyymiysajoh` and an unrelated project). Everything below is
> verified from migrations + app code, NOT from the live database. `memory/STATUS.md:14-15` says the
> billing + events migrations must be applied manually in the hbsgz SQL editor — **applied-status is
> unverifiable from here** (see §4).

Schema sources: `supabase/migrations/20260610090000_countme_init.sql` (8 tables),
`20260617090000_billing.sql` (3 tables + seed), `20260617091000_events.sql` (1 table).
Generated types (`src/lib/supabase/database.types.ts`) include all 13 tables.

---

## 1. Table inventory (13 tables, prioritized)

### Actively used — KEEP (5)

| Table | Purpose | Used at | Relations | RLS (per migration SQL) | Verdict |
|---|---|---|---|---|---|
| **profiles** | Per-user identity + the entire `persona` jsonb (the app's real data store) | `src/lib/data/persona-repository.ts:29` (read `persona`), `:51` (upsert `user_id, persona, first_name, last_name, email, user_type`). Consumed app-wide via `src/lib/data/use-persona.ts` / `persona-store.ts`. Auto-created on signup by `handle_new_user()` trigger (init.sql:114-150) | `user_id → auth.users` (unique, cascade) | Enabled; `profiles_own` FOR ALL `auth.uid() = user_id` to authenticated (init.sql:163-173) | **KEEP, but change**: strip PII from `persona` (§3) and drop dead columns — `deductions_summary`, `chat_history`, `is_registration_complete` are written/read **nowhere** in `src/` (grep: zero hits outside `database.types.ts`) |
| **plans** | Plan catalog (price in agorot, seeded `free` + `pro`@3900) | `src/app/api/billing/checkout/route.ts:60` — server-side price lookup via **admin client** (bypasses RLS) | none | Enabled; SELECT to **authenticated only** (billing.sql:91); writes service-role only | **KEEP** — but note §2: it is NOT what `/pricing` renders, and its authenticated-only SELECT is a latent trap |
| **subscriptions** | One active subscription per user (partial unique index) | `src/lib/billing/entitlement.ts:89-95` (admin read, only when `BILLING_ENABLED=true`), `src/app/api/billing/webhook/route.ts:69-83` (admin upsert on paid webhook) | `user_id → auth.users`, `plan_id → plans` | Enabled; SELECT-only own rows to authenticated; no INSERT/UPDATE policies → client writes blocked, server writes via service role (billing.sql:96-106) | **KEEP** — design matches code exactly |
| **payments** | Charge ledger + Israeli tax-invoice (חשבונית מס) reference | `src/app/api/billing/webhook/route.ts:56` (idempotency check), `:85` (insert) — admin client | `user_id → auth.users`, `subscription_id → subscriptions (set null)` | Same posture as subscriptions | **KEEP** |
| **events** | Append-only product analytics (PMF funnel) | `src/lib/analytics/track.ts:49` (admin insert); fed by `src/app/api/track/route.ts` (validates name allowlist, stamps user server-side) and `src/lib/analytics/track-client.ts` | `user_id → auth.users` (nullable, set null) | Enabled; own-read SELECT only; no write policies → server-side (service-role) writes only (events.sql:28-30) | **KEEP** |

### Defined but NEVER queried by any app code — the persona jsonb made them redundant (7)

The app's incomes/expenses/invoices live **inside `profiles.persona`** (`src/lib/persona.ts:120-134` —
`PersonaIncome.invoices[]`, `.expenses[]`, `.monthlyBreakdown[]`). Every page (dashboard, /invoices,
P&L, alerts) reads the persona JSON, not these tables. A repo-wide grep for `.from("<table>")` finds
**zero** references to any of the following:

| Table | Purpose (intended) | Actual usage | Verdict |
|---|---|---|---|
| **incomes** | Row-per-income ledger | None. Only referenced by `invoice_sends` FK | **DROP** (or explicitly park). Redundant with `persona.income` |
| **expenses** | Row-per-expense ledger | None | **DROP/park** — same reason |
| **invoices** | Issued-invoice ledger; `get_next_invoice_number()` RPC reads it | None; the `/invoices` pages use `persona.income.invoices` + `persona.invoiceCounter` (`src/app/invoices/new/page.tsx:234`); the RPC is never called from `src/` | **DECIDE**: either drop, or (better long-term) make this the real home of invoice lines and migrate off the jsonb. Don't keep both — two sources of truth for legally meaningful documents is worse than either |
| **income_documents** | Receipts/tax-invoice-receipts ledger + `get_next_doc_number()` RPC | None; RPC never called | **DROP/park** |
| **invoice_sends** | Email-send log | None. Also **mis-modeled**: `income_id → incomes(id)` (init.sql:78) — it references the unused `incomes` table, not `invoices` | **DROP** — unused *and* wrong FK; recreate correctly if/when invoice email lands |
| **notifications** | Persisted user notifications | None — alerts are computed client-side from the persona (`src/lib/alerts/index.ts`), which is the better design (no stale rows) | **DROP/park** until email-reminder infra (STATUS.md open item D) actually needs persistence |
| **tax_rules** | DB-resident tax constants | None — read nowhere. Contradicts the locked repo decision that year-keyed constants live in `src/lib/calculators/types.ts` → `lib/regulatory/deductions.ts` (single source, per CLAUDE.md). Only mention in code is a comment in `src/lib/supabase/admin.ts:3` | **DROP** — it invites a second, silently-divergent source of tax truth. If a live-override mechanism is ever wanted, design it deliberately |

"Park" = keep the SQL in a `future/` folder, remove from the applied schema. Every unused table with
RLS still enabled is low *risk*, but each is schema surface to audit, migrate, and explain forever.
Recommended: one `2026xxxx_prune_unused.sql` dropping `invoice_sends`, `income_documents`,
`notifications`, `tax_rules`, `incomes`, `expenses` (+ the two orphan RPCs), and deciding `invoices`.

---

## 2. The anon-pricing question — verified NOT a live bug, but a real trap

**Question:** does `/pricing` read `plans` from the DB, and would an anonymous visitor get an empty
catalog because `plans_read` grants SELECT to `authenticated` only?

**Answer: no bug today — the page never touches the DB.**

- `src/app/pricing/page.tsx:7,23,89` renders from the **static** `TRACKS` map
  (`src/lib/billing/tracks.ts:40-53`) plus a **hardcoded** `PRO_PRICE_MONTHLY = 39` (page.tsx:23).
  Anonymous visitors see the full catalog.
- The only DB read of `plans` is `src/app/api/billing/checkout/route.ts:58-63`, which uses
  `createAdminClient()` (service role, **bypasses RLS**) — so authenticated-only SELECT doesn't
  break checkout either.

**But two real issues follow:**

1. **Price drift — two sources of truth.** The page shows ₪39 (hardcoded); checkout charges
   `plans.price_agorot` = 3900 from the seed (billing.sql:113). Today they agree by coincidence.
   Change the plan price in the DB (the "never trust the client" source, per checkout/route.ts:57)
   and the marketing page silently lies. Fix before `BILLING_ENABLED=true`: either render `/pricing`
   from the DB, or generate the seed from `tracks.ts` — one owner.
2. **The RLS grant is a landmine for the obvious next refactor.** The moment someone makes
   `/pricing` DB-driven with the anon/server client, anonymous visitors get an **empty** catalog and
   nothing errors. A public price list has no reason to be auth-gated. Recommended one-liner:
   `create policy plans_read_all on public.plans for select to anon, authenticated using (is_active);`
   (replacing `plans_read`).

---

## 3. PII minimization — `profiles.persona`

### What's in the jsonb today

`upsertPersona()` (`src/lib/data/persona-repository.ts:51-61`) writes the **entire** `Persona`
object from the browser on every save (write-through from `persistPersona()`,
`src/lib/data/persona-store.ts:16-19`). Per `src/lib/persona.ts` that includes:

- `personal.teudatZehut` (persona.ts:16) — national ID
- `bank` (persona.ts:112-118) — bank code, branch, **full account number**, owner name
- `contact` — full home mailing address, phones
- `income` — full revenue/expense figures, optionally **every invoice line with customer names and
  customer tax IDs** (`InvoiceLine.customerTaxId`, persona.ts:52 — *other people's* IDs)
- `deductionsAndCredits` — pension, B"L, donations
- `capitalDeclaration` (persona.ts:204-209) — Form 1219: every asset and liability the user owns

Under the Israeli Privacy Protection Law + Amendment 13 (in force since Aug 2025), ID numbers +
financial data in one blob is squarely "sensitive data" — this raises database-registration and
security-tier obligations and makes any breach maximally bad. STATUS.md already blocks external
exposure on the privacy review (יעל).

### Who actually needs each field, server-side?

| Field group | Server-side consumer? | Classification |
|---|---|---|
| Names, email, osek type, occupation | Flat profile columns already; chat/coach persona context | **Persist** (plain) |
| Income aggregates, deductions, invoices/expenses lines | Cross-device continuity is the product ("your data, computed") | **Persist** (plain — this is the product's working set; encrypting it while the app must read it server-side for chat/coach buys little at this stage) |
| `teudatZehut` | **Nothing computes on it.** Grep: it is only (a) validated client-side at setup (`src/app/setup/page.tsx:326-331`), (b) displayed in the form preview (`src/components/form-1301/form-preview.tsx:143`), (c) copied into `osekFileNumber` (setup/page.tsx:538) | **Do not persist raw** |
| `bank.*` | Nothing — only shown for copy-paste into 1301's refund field | **Do not persist raw** (or don't collect until filing) |
| `capitalDeclaration` | Only the 1219 page renders it; subtotals computed client-side | **Candidate for same treatment**; acceptable to defer |
| All `CalcResult`s, P&L, alerts, tax estimates | Computed on the fly from persona (`src/lib/calculators`, `src/lib/p-and-l`, `src/lib/alerts`) | **Already ephemeral — keep it that way.** Never persist derived numbers |

### Teudat Zehut options

| Option | Verdict |
|---|---|
| **A. Don't store (client-side only)** — keep the full TZ only in localStorage; persist a masked form (`*****1234`, last 4) in the DB | **Recommended.** The TZ is display-only; the user copy-pastes into gov.il from the same browser that holds localStorage. Costs: a new device shows the masked value until the user re-enters 9 digits (a 5-second re-prompt) |
| B. Store hashed | Rejected — the app must *display* the TZ on the form preview; a hash can't be shown, so it serves no product purpose here (hashes are for verification, which we don't do) |
| C. Encrypted column (app-level AES-GCM via API route, or Supabase Vault/pgsodium) | Correct for true cross-device fill, but forces all persona reads/writes through server routes (browser anon client can't hold the key) — a meaningful refactor of `persona-repository.ts`. **Defer**; adopt later if masked+re-enter proves to hurt onboarding |

### Concrete migration path from today's write-through

1. **Sanitize at the seam** — add `sanitizeForDb(persona)` inside
   `src/lib/data/persona-repository.ts:upsertPersona()`: replace `personal.teudatZehut` with its
   masked form (keep last 4), null out `bank.accountNumber` (keep bankName/branch for display),
   strip `invoices[].customerTaxId`. One function, one call site — the write-through architecture
   makes this a ~30-line change.
2. **Merge on hydrate** — in `syncPersonaFromDb()` (`src/lib/data/persona-store.ts:32`), after "DB
   wins", overlay the sensitive fields from the local cache **iff** `getPersonaOwner() === userId`
   (the owner-stamp mechanism already exists at persona-store.ts:47-53). DB stays authoritative for
   everything else.
3. **Re-prompt UI** — where the form preview would show a masked TZ and the user is about to
   copy-paste, show an inline "הזינו שוב ת״ז" field that writes to localStorage only.
4. **Backfill** — one-time SQL in the hbsgz editor to mask already-stored rows, e.g.
   `update public.profiles set persona = jsonb_set(persona, '{personal,teudatZehut}', to_jsonb('*****' || right(persona->'personal'->>'teudatZehut', 4))) where persona->'personal' ? 'teudatZehut';`
   (plus the bank/customerTaxId equivalents).
5. **Later, only if needed:** option C for cross-device, moving persona I/O behind an API route.

This is pragmatic for a pre-launch startup: no new infrastructure, no key management, and the
DB's blast radius drops from "identity theft kit" to "financial aggregates."

---

## 4. Blocked by account access — founder checklist for when MCP sees hbsgz

Run each once `mcp__Supabase__list_projects` shows `hbsgzelipeawkvtcazdr`:

- [ ] **Migrations actually applied?** `list_migrations` (project_id: hbsgzelipeawkvtcazdr); expect all three timestamps. If billing/events missing (STATUS.md says they needed a manual SQL-editor run), paste them via `apply_migration`. Cross-check: `list_tables` should show all 13.
- [ ] **Live RLS state** (migrations ≠ reality): `execute_sql`:
  `select tablename, rowsecurity from pg_tables where schemaname='public' order by 1;` — every table `true`; then
  `select tablename, policyname, cmd, roles from pg_policies where schemaname='public' order by 1;` — expect the 7 `_own` FOR ALL policies, `tax_rules_read`, `plans_read`, 2 `_own_read`, `events_own_read`, and **nothing extra**.
- [ ] **Plans seed present:** `execute_sql`: `select id, price_agorot, is_active from public.plans;` — expect free/0 + pro/3900. Empty ⇒ billing migration never ran ⇒ checkout would 400 (`invalid_price`, checkout/route.ts:65-67).
- [ ] **Events flowing:** `execute_sql`: `select name, count(*) from public.events group by 1;` — empty in prod means the events migration is missing and every `track()` has been silently swallowing errors (`track.ts:57-62` warns but never throws).
- [ ] **Security & performance advisors:** `get_advisors` with type `security`, then `performance` (will flag e.g. missing policies, exposed functions, the `security definer` RPCs).
- [ ] **Auth config / Google OAuth:** no MCP tool exposes provider config — verify in the dashboard (Authentication → Providers → Google enabled; Site URL + redirect URLs match the Vercel domain). `get_logs` service `auth` for recent sign-in errors.
- [ ] **Indexes in prod:** `execute_sql`: `select indexname from pg_indexes where schemaname='public' order by 1;` — expect the 6 `_user_id_idx` + `subscriptions_one_active_per_user` + billing/events indexes.
- [ ] **Orphaned data:** `execute_sql`: `select count(*) from public.profiles p left join auth.users u on u.id = p.user_id where u.id is null;` (should be 0 — FK enforces it, but verifies FK survived manual SQL runs); `select count(*) from public.profiles where persona is null;` (signups that never finished setup).
- [ ] **PII exposure snapshot (feeds §3 backfill):** `execute_sql`: `select count(*) filter (where persona->'personal' ? 'teudatZehut') as with_tz, count(*) filter (where persona ? 'bank') as with_bank from public.profiles;`
- [ ] **Regenerate types:** `generate_typescript_types` and diff against `src/lib/supabase/database.types.ts`; then delete the untyped casts in `entitlement.ts:70-89` and `track.ts:45-49` (their comments say they exist only because types predated the billing/events tables — the committed types file already has all 13, so this cleanup is unblocked).

---

## 5. Launch blockers (before real users)

1. **Unverified schema on the production project.** Billing + events migrations may have never run
   on hbsgz (§4 items 1, 3, 4). The failure mode is *silent*: `track()` swallows errors,
   `getEntitlement()` fails-safe to free, checkout returns `invalid_price`. Verify before anything else.
2. **Raw sensitive PII written from the browser into `profiles.persona`** — teudat zehut, full bank
   account, customers' tax IDs, capital declaration (§3). Implement steps 1–4 of the migration path
   before onboarding non-founder users; this also directly unblocks the privacy (יעל) gate in STATUS.md.
3. **`AUTH_GATING_ENABLED` is off** (`src/lib/supabase/proxy.ts:75-83`) — protected routes are open
   to anonymous traffic. Flip in Vercel + redeploy (already tracked in STATUS.md as Yoni's manual step).
4. **Pricing single-source** (§2): reconcile hardcoded ₪39 vs DB 3900 agorot, and widen `plans`
   SELECT to `anon`, before `BILLING_ENABLED=true`.
5. **Webhook signature verification is a stub** — `tranzilaProvider.parseWebhook` returns
   `{ok:false}` (`src/lib/billing/tranzila.ts:60-62`), so `/api/billing/webhook` is inert today, but
   the TODO at tranzila.ts:58 (verify callback signature) is a hard prerequisite of wiring Tranzila:
   without it anyone who learns the URL can mint pro subscriptions (webhook writes use service role).
6. **Prune the 7 dead tables** (§1) — not strictly a blocker, but do it while the DB is empty;
   dropping tables after real user rows exist is a much scarier migration. At minimum fix/drop
   `invoice_sends` (wrong FK) and `tax_rules` (contradicts the locked constants-in-code decision).
