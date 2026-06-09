"use client";

import { useEffect } from "react";
import { syncPersonaFromDb } from "@/lib/data/persona-store";

/**
 * Runs once on mount: pulls the logged-in user's Persona from the DB into the
 * local cache (multi-device hydration), or pushes a local persona up if the DB
 * has none. No-op when signed out. Renders nothing.
 */
export function PersonaHydrator() {
  useEffect(() => {
    void syncPersonaFromDb();
  }, []);
  return null;
}
