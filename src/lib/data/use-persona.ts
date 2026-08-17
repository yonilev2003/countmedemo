"use client";

import { useCallback, useEffect, useState } from "react";
import type { Persona } from "@/lib/persona";
import { loadPersona as loadLocal, getPersonaOwner } from "@/lib/setup-storage";
import { persistPersona, syncPersonaFromDb } from "./persona-store";

export type PersonaSource = "loading" | "db" | "local" | "empty";

/**
 * Client hook for the current user's Persona. Shows the localStorage copy
 * instantly, then reconciles with the DB (DB wins). `save` writes both.
 * Drop-in for pages that currently call `loadPersona()` in an effect.
 */
export function usePersona() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [source, setSource] = useState<PersonaSource>("loading");

  useEffect(() => {
    let cancelled = false;
    const local = loadLocal();
    // Instant cache paint ONLY for an anonymous / not-yet-claimed cache (no
    // owner stamp). If the cache is stamped to a user, hold the skeleton until
    // syncPersonaFromDb confirms it belongs to the CURRENT session — otherwise a
    // previous user's persona could flash on a shared device before reconcile.
    if (local && !getPersonaOwner()) {
      // Instant paint from the anonymous cache: content renders immediately
      // (loading=false) and the DB reconcile below lands silently. Stamped
      // caches still hold the skeleton — a previous user's persona must never
      // flash on a shared device before reconcile confirms ownership.
      setPersona(local);
      setSource("local");
    }
    (async () => {
      const resolved = await syncPersonaFromDb();
      if (cancelled) return;
      // Trust the reconcile result verbatim: never fall back to `local`, which
      // syncPersonaFromDb may have just dropped as a foreign-owned cache.
      setPersona(resolved);
      setSource(resolved ? "db" : "empty");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback((next: Persona) => {
    setPersona(next);
    persistPersona(next);
  }, []);

  return { persona, save, source, loading: source === "loading" };
}
