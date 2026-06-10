import { Persona } from "./persona";

const STORAGE_KEY = "countme_persona";
/**
 * Records which authenticated user the cached persona was last reconciled
 * against. Lets us distinguish "this cache is mine / anonymous" from "this cache
 * belongs to a previous user on this browser" so a stale cache can never seed
 * another account. Empty/absent = anonymous or not-yet-claimed.
 */
const OWNER_KEY = "countme_persona_owner";

/** Save a Persona to localStorage (client-side only). */
export function savePersona(p: Persona): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

/** Read the user id the cached persona was last reconciled for (or null). */
export function getPersonaOwner(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(OWNER_KEY);
}

/**
 * Stamp the cached persona as belonging to `userId` (or clear the stamp with
 * null, e.g. for an anonymous/demo cache). Call after a DB reconcile so we know
 * whose data the local copy holds.
 */
export function setPersonaOwner(userId: string | null): void {
  if (typeof window === "undefined") return;
  if (userId) localStorage.setItem(OWNER_KEY, userId);
  else localStorage.removeItem(OWNER_KEY);
}

/**
 * Remove the cached Persona from localStorage (client-side only).
 *
 * Call this on sign-out so the next user on the same browser never inherits the
 * previous user's data from the cache. For logged-in users `profiles.persona` in
 * Supabase is the source of truth; this only drops the fast local copy.
 */
export function clearLocalPersona(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(OWNER_KEY);
}

/** Load a Persona from localStorage. Returns null if not found or invalid. */
export function loadPersona(): Persona | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persona;
  } catch {
    return null;
  }
}

/**
 * Update a single value inside a persona by dotted path
 * (e.g. "personal.firstName", "business.tradeName", "bank.accountNumber").
 * Returns the updated persona — does NOT write to localStorage by itself.
 * Combine with savePersona() to persist.
 */
export function setPersonaPath(
  persona: Persona,
  path: string,
  value: unknown,
): Persona {
  const segments = path.split(".");
  // Deep-clone the relevant branches to maintain immutability
  const result: Record<string, unknown> = JSON.parse(JSON.stringify(persona));
  let cursor = result;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (cursor[seg] === undefined || cursor[seg] === null) {
      cursor[seg] = {};
    }
    cursor = cursor[seg] as Record<string, unknown>;
  }
  cursor[segments[segments.length - 1]] = value;
  return result as unknown as Persona;
}
