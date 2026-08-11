"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Persona } from "@/lib/persona";
import { loadPersona } from "@/lib/setup-storage";
import { ONBOARDING_ROUTE } from "@/lib/onboarding/route";
import { syncPersonaFromDb } from "./persona-store";

/**
 * Persona for a protected app page, with a DB check before giving up.
 *
 * The pages used to do `const p = loadPersona(); if (!p) router.push("/setup")`
 * synchronously. On a SECOND DEVICE (or a fresh browser / cleared cache) the
 * localStorage cache is empty while `profiles.persona` in Supabase is fully
 * populated — so the user was thrown into the setup wizard, and completing it
 * overwrote their real server data. PersonaHydrator does reconcile, but it runs
 * asynchronously and always lost that race.
 *
 * Here we consult the DB before routing anyone to onboarding. Only a user who
 * has no persona locally AND none in the DB is genuinely new.
 *
 * This single hook backs ~15 pages (dashboard, alerts, deadlines, invoices,
 * file/*, business-expenses, demo, receivables...) — it is THE empty-persona
 * redirect for the whole app (beta, docs/specs/beta/onboarding.md ONB-7).
 */
export function useRequiredPersona() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);

  useEffect(() => {
    let cancelled = false;

    const local = loadPersona();
    if (local) {
      setPersona(local);
      return;
    }

    (async () => {
      // Never leave the user staring at a skeleton: if the DB round-trip fails
      // (offline, Supabase down, missing env), fall back to the old behaviour
      // and send them to /setup rather than hanging forever.
      let remote: Persona | null = null;
      try {
        remote = await syncPersonaFromDb();
      } catch {
        remote = null;
      }
      if (cancelled) return;
      if (remote) setPersona(remote);
      else router.replace(ONBOARDING_ROUTE);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return { persona, setPersona };
}
