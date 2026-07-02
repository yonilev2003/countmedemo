# Runbooks for Yonathan — Supabase MCP hookup + Vercel WAF

Date: 2026-07-02. Two manual, one-time procedures. Neither can be done by the AI agent (account access + dashboard-only settings). Reference env var NAMES only — never paste values into chats or commits.

## 1. Give the MCP agent access to production Supabase (`hbsgzelipeawkvtcazdr`)

The current Supabase MCP session is authenticated against the account that owns the abandoned `akfg` project — it cannot see `hbsgz` at all. Fix is re-authentication, not configuration:

1. Find which account owns `hbsgzelipeawkvtcazdr`: log into https://supabase.com/dashboard with the **project email account** (the one used for Vercel, not the personal one) and confirm the project appears there.
2. In that account: **Account → Access Tokens → Generate new token**. Name it `countme-mcp` (scope: this is a full personal access token — treat like a password, store in the password manager).
3. Re-point the MCP server to that token. Where the Supabase MCP is configured (Claude Code: `claude mcp list` to find it; it's typically an HTTP server entry with `SUPABASE_ACCESS_TOKEN`), replace the token env with the new one. If it was added via OAuth from claude.ai integrations instead: remove the integration and re-add it while logged into the correct Supabase account in the browser.
4. Optional but recommended — least privilege: the MCP supports project scoping. Configure the server URL/args with `--project-ref hbsgzelipeawkvtcazdr` and `--read-only` for review sessions; drop `--read-only` only for a session that intentionally applies migrations.
5. Verify in a fresh Claude session: `list_projects` should now show the project; then run the WS7 blocked-checks list (`docs/reviews/2026-07-02-ws7-supabase-architecture.md` §4): `list_migrations`, RLS/policies dump, `get_advisors`, plans-seed check.
6. **Before touching the schema: take a full backup.** Dashboard → Database → Backups (verify a recent daily backup exists), or a manual dump: `supabase db dump --db-url <production connection string> -f pre-billing-migration.sql` (connection string from Dashboard → Connect; treat it as a secret). Production `apply_migration` without a dump is the classic way to lose data.
7. Then apply the pending `billing` + `events` migrations (SQL editor or `apply_migration`) — they may never have been applied; the app fails silent without them. Both are idempotent (`create ... if not exists`), so re-running is safe.

## 2. Vercel WAF / rate-limit hardening for the AI routes

Goal: platform-level rate limiting in front of `/api/chat`, `/api/coach`, `/api/upload`, `/api/parse-invoice` — the in-code limiter is per-serverless-instance and resets on deploy, so the durable layer belongs to Vercel.

1. Vercel Dashboard → the countme project → **Firewall** tab.
2. Confirm the managed protections are on (they are by default): DDoS mitigation + OWASP managed ruleset if available on the plan.
3. Add a **Custom Rule** (name: `ai-routes-rate-limit`):
   - **If**: Request Path *starts with* `/api/chat` — OR any of `/api/coach`, `/api/upload`, `/api/parse-invoice` (one rule with an OR group, or four parallel rules — identical effect).
   - **Then**: **Rate Limit** — 30 requests per 60 seconds per IP (deliberately looser than the in-code 12/min per key: the WAF is the abuse backstop, the app enforces the fine-grained limit), action **Deny** (429) when exceeded.
4. Add a second, stricter rule for `/api/upload` only: 10 requests / 60s per IP (uploads are the most expensive path — 5MB bodies into Claude vision).
5. Deploy the firewall changes (they apply immediately — no redeploy of the app needed).
6. Verify: `for i in $(seq 40); do curl -s -o /dev/null -w "%{http_code}\n" https://<the-production-domain>/api/chat -X POST; done` — expect 429s from Vercel (before the app's own 429s) once the limit trips. Watch **Firewall → Monitoring** for the rule's hit counts.
7. Two weeks of logs → revisit the deferred decision: if WAF-level limiting proves insufficient (e.g. distributed abuse), implement the Supabase-backed counter documented in `src/lib/security/rate-limit.ts`.

Also while in the dashboard (5 minutes, from the WS2 must-fix list): Settings → **Spend Management** → set a budget alert; and in the Anthropic console set a monthly spend limit for the API key used by `ANTHROPIC_API_KEY`.
