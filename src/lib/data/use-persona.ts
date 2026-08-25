"use client";

import { useCallback, useEffect, useState } from "react";
import type { Persona } from "@/lib/persona";
import { loadPersona as loadLocal, getPersonaOwner } from "@/lib/setup-storage";
import {
  persistPersona,
  syncPersonaFromDb,
  canOptimisticallyPaintStampedCache,
  getLastKnownUserId,
} from "./persona-store";

export type PersonaSource = "loading" | "db" | "local" | "empty";

/**
 * Client hook for the current user's Persona. Shows the localStorage copy
 * instantly, then reconciles with the DB (DB wins). `save` writes both.
 * Drop-in for pages that currently call `loadPersona()` in an effect.
 */
export function usePersona() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [source, setSource] = useState<PersonaSource>("loading");
  // QA audit 25/08, item 8 — see the matching flag in use-required-persona.ts
  // for the full rationale: true only when the optimistic paint below turned
  // out to disagree with the authoritative reconcile.
  const [correctedFromOptimisticPaint, setCorrectedFromOptimisticPaint] =
    useState(false);

  useEffect(() => {
    let cancelled = false;
    let optimisticSnapshot: Persona | null = null;
    const local = loadLocal();
    const localOwner = getPersonaOwner();
    // Instant cache paint for an anonymous / not-yet-claimed cache (no owner
    // stamp) — always safe, unconditionally. Content renders immediately
    // (loading=false) and the DB reconcile below lands silently.
    if (local && !localOwner) {
      setPersona(local);
      setSource("local");
      optimisticSnapshot = local;
    } else if (
      local &&
      localOwner &&
      canOptimisticallyPaintStampedCache(getLastKnownUserId(), localOwner)
    ) {
      // STAMPED cache, optimistic paint (perf-vs-security reconciliation for
      // QA #17): this tab already knows — from an earlier authoritative
      // reconcile this session — that the cache is either this same user's
      // own, or that the tab is confirmed signed-out. Paint it now; the
      // authoritative syncPersonaFromDb() below still runs and hard-swaps
      // the state the instant it disagrees. Every OTHER case (no same-tab
      // knowledge yet, or the cache is known/turns out to be foreign) holds
      // the skeleton exactly as before — a previous user's persona must
      // never flash on a shared device before reconcile confirms ownership.
      setPersona(local);
      setSource("local");
      optimisticSnapshot = local;
    }
    (async () => {
      const resolved = await syncPersonaFromDb();
      if (cancelled) return;
      // Trust the reconcile result verbatim: never fall back to `local`, which
      // syncPersonaFromDb may have just dropped as a foreign-owned cache.
      setPersona(resolved);
      setSource(resolved ? "db" : "empty");
      if (
        optimisticSnapshot &&
        resolved &&
        JSON.stringify(optimisticSnapshot) !== JSON.stringify(resolved)
      ) {
        setCorrectedFromOptimisticPaint(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback((next: Persona) => {
    setPersona(next);
    persistPersona(next);
  }, []);

  return {
    persona,
    save,
    source,
    loading: source === "loading",
    correctedFromOptimisticPaint,
  };
}
