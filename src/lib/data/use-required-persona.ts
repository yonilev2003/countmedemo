"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Persona } from "@/lib/persona";
import { loadPersona, getPersonaOwner } from "@/lib/setup-storage";
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
 * Here we consult the DB before routing anyone to /setup. Only a user who has
 * no persona locally AND none in the DB is genuinely new.
 *
 * Cross-account safety (QA #17): this hook used to trust ANY local cache
 * outright and return immediately, without ever reconciling against the DB —
 * so a live authenticated session (a stale cookie for a DIFFERENT user than
 * whoever's local cache happens to be sitting in this browser) could render a
 * stranger's persona on a protected page. Now the synchronous fast-path only
 * ever paints an UNSTAMPED (anonymous, not-yet-claimed) cache — same rule
 * usePersona() already uses — and every load, stamped or not, still runs
 * syncPersonaFromDb() (via decidePersonaOwnership) before being trusted. A
 * cache stamped to someone else is discarded there, never shown here.
 */
export function useRequiredPersona() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);

  useEffect(() => {
    let cancelled = false;

    const local = loadPersona();
    const localIsAnonymous = !!local && !getPersonaOwner();
    if (localIsAnonymous) {
      setPersona(local);
    }

    (async () => {
      // Never leave the user staring at a skeleton: if the DB round-trip fails
      // (offline, Supabase down, missing env), fall back to the anonymous
      // instant-paint if we had one; otherwise treat as genuinely new rather
      // than hanging forever.
      let remote: Persona | null = null;
      try {
        remote = await syncPersonaFromDb();
      } catch {
        remote = localIsAnonymous ? local : null;
      }
      if (cancelled) return;
      // Trust the reconcile result verbatim — never fall back to a STAMPED
      // local cache, which syncPersonaFromDb may have just discarded as
      // belonging to a different account (QA #17).
      if (remote) setPersona(remote);
      else router.replace("/setup");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return { persona, setPersona };
}
