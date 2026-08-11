/**
 * Single source of truth for the onboarding entry route (beta,
 * docs/specs/beta/onboarding.md §5). The lite ≤3-minute questionnaire at
 * /onboarding replaced /setup as the product's entry point; /setup itself
 * stays in production as the deferred "השלמת פרטים לדוח" flow.
 *
 * Every "new user, empty persona" redirect and every anonymous "get
 * started" CTA should point here — grep this constant's usages rather than
 * the literal string "/onboarding" when auditing entry points.
 */
export const ONBOARDING_ROUTE = "/onboarding";
