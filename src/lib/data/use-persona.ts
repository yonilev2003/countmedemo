"use client";

import { useCallback, useEffect, useState } from "react";
import type { Persona } from "@/lib/persona";
import { loadPersona as loadLocal } from "@/lib/setup-storage";
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
    if (local) setPersona(local); // instant cache paint
    (async () => {
      const resolved = await syncPersonaFromDb();
      if (cancelled) return;
      setPersona(resolved ?? local ?? null);
      setSource(resolved ? "db" : local ? "local" : "empty");
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
