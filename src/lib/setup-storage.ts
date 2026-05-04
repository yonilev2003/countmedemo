import { Persona } from "./persona";

const STORAGE_KEY = "countme_persona";

/** Save a Persona to localStorage (client-side only). */
export function savePersona(p: Persona): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
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
