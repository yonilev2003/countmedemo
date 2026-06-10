// One seam for Persona persistence: localStorage cache + Supabase write-through.
// Existing pages keep using the sync `loadPersona()` cache; writers call
// `persistPersona()` so every save also lands in the DB once the user is logged in.

import type { Persona } from "@/lib/persona";
import {
  loadPersona as loadLocal,
  savePersona as saveLocal,
  clearLocalPersona,
  getPersonaOwner,
  setPersonaOwner,
} from "@/lib/setup-storage";
import { fetchPersona, upsertPersona, getCurrentUserId } from "./persona-repository";

/** Save locally now (sync cache) and persist to the DB in the background. */
export function persistPersona(persona: Persona): void {
  saveLocal(persona);
  void upsertPersona(persona);
}

/**
 * Reconcile the local cache with the DB. The DB is the source of truth for a
 * logged-in user; the local cache is only a fast paint. Returns the
 * authoritative persona (DB → local → null).
 *
 * Cross-user safety: the cache carries an "owner" stamp (the user id it was last
 * reconciled for). A cache stamped to a *different* user is treated as stale and
 * dropped — it must never be shown to, or pushed up for, the current user. This
 * is a defence-in-depth backstop to the sign-out cache-clear: it also covers
 * non-button sign-outs (cookie expiry, a second account logging in directly).
 */
export async function syncPersonaFromDb(): Promise<Persona | null> {
  const userId = await getCurrentUserId();

  // Signed out (anonymous/demo): keep whatever local cache exists, untouched.
  if (!userId) return loadLocal();

  const remote = await fetchPersona();
  if (remote) {
    // DB wins — overwrite the cache and claim it for this user.
    saveLocal(remote);
    setPersonaOwner(userId);
    return remote;
  }

  // Logged in, but the DB has no persona yet.
  const owner = getPersonaOwner();
  if (owner && owner !== userId) {
    // Leftover cache from a previous user on this browser — never expose or
    // upload it. Drop it and report "empty" so the user starts clean.
    clearLocalPersona();
    return null;
  }

  // Cache is this user's own, or anonymous and not yet claimed (the
  // signup → /setup → DB hand-off): adopt it and seed the DB.
  const local = loadLocal();
  if (local) {
    setPersonaOwner(userId);
    void upsertPersona(local);
  }
  return local;
}
