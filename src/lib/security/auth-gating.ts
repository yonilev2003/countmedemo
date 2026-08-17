/**
 * Single source of truth for whether auth gating is enforced.
 *
 * FAIL-CLOSED in production: previously both the page proxy and the API guard
 * checked `AUTH_GATING_ENABLED === "true"` independently, so an unset/typo'd
 * env var (a fresh Vercel project, a missing Preview value, a .env mistake)
 * silently disabled ALL page gating and ALL API auth with no error. Now, in
 * production builds an absent/empty flag counts as ENABLED — only an explicit
 * "false" turns gating off (a deliberate, visible choice, e.g. local e2e runs
 * with AUTH_GATING_ENABLED=false). Development keeps the old opt-in behavior
 * so `npm run dev` works without any env setup.
 */
export function isAuthGatingEnabled(): boolean {
  const flag = process.env.AUTH_GATING_ENABLED;
  if (flag === "true") return true;
  if (flag === "false") return false;
  // Flag unset/empty/typo'd: closed in production, open in development.
  return process.env.NODE_ENV === "production";
}
