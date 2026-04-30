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
