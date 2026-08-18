"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Prefixes for the app routes that actually read/write persona data. This is
 * an independent, purpose-named list rather than an import of
 * PROTECTED_PREFIXES from src/lib/supabase/proxy.ts — "requires auth" and
 * "uses persona data" are different questions that happen to mostly overlap
 * today, and coupling them would make an unrelated auth-gating change
 * silently change what gets hydrated (or vice versa).
 */
const PERSONA_ROUTE_PREFIXES = [
  "/setup",
  "/home",
  "/demo",
  "/onboarding",
  "/business-expenses",
  "/expenses",
  "/dashboard",
  "/invoices",
  "/coach",
  "/deadlines",
  "/alerts",
  "/file",
  "/receivables",
  "/guides/morshe",
] as const;

function usesPersonaData(pathname: string): boolean {
  return PERSONA_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Runs once per navigation, but ONLY on routes that actually consume persona
 * data: pulls the logged-in user's Persona from the DB into the local cache
 * (multi-device hydration), or pushes a local persona up if the DB has none.
 * No-op when signed out or on a non-persona route. Renders nothing.
 *
 * PERFORMANCE (2026-08-18): this used to call `syncPersonaFromDb()`
 * unconditionally on EVERY page — including marketing (`/`), `/terms`,
 * `/accessibility` — because it mounts from the root layout for all routes.
 * That dragged `@supabase/supabase-js` (via persona-store → persona-
 * repository → the Supabase browser client) into those pages' first-load JS
 * for zero benefit, since none of them ever read persona.
 *
 * Fix: the component keeps mounting everywhere from the root layout (so app
 * pages still get the "kick off the DB sync as early as possible" behavior
 * that the in-flight dedupe in persona-store.ts relies on — starting the
 * fetch at layout-mount time, before a page's own usePersona()/
 * useRequiredPersona() effect even runs), but the Supabase-touching module is
 * only ever `import()`-ed — and therefore only ever fetched as a separate,
 * lazily-loaded chunk — when the current route is in the persona allowlist
 * above. Marketing/legal pages never trigger the import, so Next code-splits
 * the Supabase SDK chunk out of their bundles entirely.
 */
export function PersonaHydrator() {
  const pathname = usePathname();

  useEffect(() => {
    if (!usesPersonaData(pathname)) return;
    let cancelled = false;
    void import("@/lib/data/persona-store").then(({ syncPersonaFromDb }) => {
      if (!cancelled) void syncPersonaFromDb();
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
