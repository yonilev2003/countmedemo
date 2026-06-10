// One seam for Persona persistence: localStorage cache + Supabase write-through.
// Existing pages keep using the sync `loadPersona()` cache; writers call
// `persistPersona()` so every save also lands in the DB once the user is logged in.

import type { Persona } from "@/lib/persona";
import { loadPersona as loadLocal, savePersona as saveLocal } from "@/lib/setup-storage";
import { fetchPersona, upsertPersona } from "./persona-repository";

/** Save locally now (sync cache) and persist to the DB in the background. */
export function persistPersona(persona: Persona): void {
  saveLocal(persona);
  void upsertPersona(persona);
}

/**
 * Reconcile the local cache with the DB. If the logged-in user has a DB persona,
 * copy it into the local cache and return it. Otherwise push any local persona
 * up to the DB. Returns the authoritative persona (DB → local → null).
 */
export async function syncPersonaFromDb(): Promise<Persona | null> {
  const remote = await fetchPersona();
  if (remote) {
    saveLocal(remote);
    return remote;
  }
  const local = loadLocal();
  if (local) void upsertPersona(local);
  return local;
}
