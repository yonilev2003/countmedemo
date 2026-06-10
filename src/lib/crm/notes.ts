/**
 * Lightweight follow-up notes — task #8, v1 (unblocked slice).
 *
 * The full CRM lives in the standalone `crm-snapshot/` sub-app and will be wired
 * to Supabase on "Day 2+" (see docs/crm-architecture.md + CLAUDE.md). Until that
 * DB decision lands, this module delivers the core product need from the working
 * session — "שנוכל להכניס הערות שלנו (פולו אפ למשימות)" — with zero backend:
 * notes are attached to any target (e.g. a deadline id) and persisted in
 * localStorage, exactly like the persona (`lib/setup-storage`).
 *
 * Pure + SSR-safe: every function guards `typeof window`. No React.
 */

const STORAGE_KEY = "countme:followup-notes";

export interface FollowUpNote {
  id: string;
  /** What this note is attached to — e.g. a deadline id like "vat-bi-monthly". */
  targetId: string;
  text: string;
  /** ISO timestamp of creation. */
  createdAt: string;
  /** Marked done (follow-up completed). */
  done: boolean;
}

type NoteStore = Record<string, FollowUpNote[]>; // targetId → notes

function read(): NoteStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NoteStore) : {};
  } catch {
    return {};
  }
}

function write(store: NoteStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota / privacy mode — notes are best-effort in v1 */
  }
}

/** All notes for a target, newest first. */
export function getNotes(targetId: string): FollowUpNote[] {
  const list = read()[targetId] ?? [];
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Total open (not-done) notes across all targets — for badges. */
export function countOpenNotes(): number {
  const store = read();
  return Object.values(store)
    .flat()
    .filter((n) => !n.done).length;
}

export function addNote(targetId: string, text: string): FollowUpNote[] {
  const trimmed = text.trim();
  if (!trimmed) return getNotes(targetId);
  const store = read();
  const note: FollowUpNote = {
    id: `${targetId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    targetId,
    text: trimmed,
    createdAt: new Date().toISOString(),
    done: false,
  };
  store[targetId] = [...(store[targetId] ?? []), note];
  write(store);
  return getNotes(targetId);
}

export function toggleNoteDone(targetId: string, noteId: string): FollowUpNote[] {
  const store = read();
  store[targetId] = (store[targetId] ?? []).map((n) =>
    n.id === noteId ? { ...n, done: !n.done } : n,
  );
  write(store);
  return getNotes(targetId);
}

export function deleteNote(targetId: string, noteId: string): FollowUpNote[] {
  const store = read();
  store[targetId] = (store[targetId] ?? []).filter((n) => n.id !== noteId);
  write(store);
  return getNotes(targetId);
}

/**
 * Drop all locally-stored follow-up notes (client-side only).
 *
 * These notes live only in localStorage (no backend yet) and are not scoped to a
 * user id, so on a shared browser they would otherwise leak between accounts.
 * Call this on sign-out alongside `clearLocalPersona()`.
 */
export function clearFollowUpNotes(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* quota / privacy mode — best-effort, same as write() */
  }
}
