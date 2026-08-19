/**
 * Canonical public site origin — single source of truth (v2 plan item 1.3).
 *
 * ── Why this exists ──────────────────────────────────────────────────
 * Today the live deployment is `https://countmedemo-eight.vercel.app` (the
 * only domain this Vercel project actually owns — verified live via the
 * Vercel API, 17/08; see the history this replaces in git blame on
 * src/app/layout.tsx). Yoni is buying a real domain for launch. When that
 * happens, the origin must change in exactly ONE place — this function —
 * not by hunting down every hardcoded string across the app.
 *
 * ── The domain-migration move (do ALL of these together, not just the env var) ──
 *   1. Buy the domain, attach it to the Vercel project, verify it resolves.
 *   2. Set `NEXT_PUBLIC_SITE_URL` to the new origin in Vercel env vars
 *      (Production AND Preview — see the open item in CLAUDE.md "What's NOT
 *      done yet" #1 about flags only being set on Production). Redeploy —
 *      NEXT_PUBLIC_* values are inlined at build time, so this requires a
 *      new build, not just a config change.
 *   3. Update the Supabase Auth URL Configuration (Site URL + Redirect
 *      URLs) and the Google OAuth consent-screen / authorized-redirect
 *      config to the new domain in the SAME move — the code path in
 *      src/app/auth/callback/route.ts already honors `x-forwarded-host` and
 *      needs no change, but the external console configs are NOT read from
 *      this file and will silently keep pointing at the old domain if
 *      forgotten. Full steps: docs/launch/oauth-branding.md.
 *   4. Zero further code changes needed — every caller of getSiteOrigin()
 *      picks up the new origin automatically on the next deploy.
 *
 * Until step 2 happens, getSiteOrigin() keeps returning the vercel.app
 * fallback below — do not hardcode that string anywhere else; import this
 * function instead.
 *
 * ── Compatibility note: NEXT_PUBLIC_APP_URL ─────────────────────────
 * `NEXT_PUBLIC_APP_URL` is an OLDER env var already set in Vercel
 * Production+Preview (docs/launch/beta-go-live-runbook.md). `NEXT_PUBLIC_SITE_URL`
 * (this function) is the new, forward-looking name for the same "canonical
 * public origin" concept, so this function checks it first and falls back
 * to `NEXT_PUBLIC_APP_URL` — that way nothing breaks for callers that
 * migrate to getSiteOrigin() before Yoni renames the Vercel env var. Every
 * reader, including src/app/invoices/[invoiceNumber]/page.tsx's printed-
 * document footer, now goes through getSiteOrigin() (fixed 2026-08-19).
 * These two vars should NOT stay split long-term: the follow-up is to
 * retire NEXT_PUBLIC_APP_URL entirely in one move, documented at the same
 * time as the real domain purchase (step 2 above) so it's a single
 * env-var edit in Vercel.
 */
export function getSiteOrigin(): string {
  const fromSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromSiteUrl) {
    return fromSiteUrl.replace(/\/+$/, "");
  }
  const fromLegacyAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromLegacyAppUrl) {
    return fromLegacyAppUrl.replace(/\/+$/, "");
  }
  return "https://countmedemo-eight.vercel.app";
}
