/**
 * Onboarding-wizard DRAFT persistence (risk-gap.md §7 "A #1", decided
 * 2026-09-06 in memory/decisions.md).
 *
 * The /setup wizard holds seven screens of state in React memory until the
 * very last click; a refresh, a backgrounded tab, or the browser's back
 * gesture used to wipe everything silently. This module saves a debounced
 * draft to localStorage so that work survives — under an explicit privacy
 * policy (Tikun 13 minimisation, locked decision):
 *
 *   • EXCLUDED from the draft: the ID number (teudatZehut) and the bank
 *     account fields (bankCode / branchCode / accountNumber). They are the
 *     most sensitive values and the fastest to retype, so they are never
 *     written to unencrypted storage. `bankName` is kept (not secret).
 *   • TTL: 72 hours — an expired draft is deleted on the next read.
 *   • Cleared the moment the wizard is submitted successfully, and when the
 *     user explicitly chooses "התחל/י מחדש".
 *
 * The draft is a SEPARATE key from the persona cache (lib/setup-storage.ts):
 * a draft is unfinished input, never a persona, and must never be read by
 * anything except the wizard's own restore prompt.
 *
 * Storage is injectable so the module is unit-tested without a DOM.
 */

export const SETUP_DRAFT_KEY = "countme_setup_draft_v1";
export const SETUP_DRAFT_TTL_MS = 72 * 60 * 60 * 1000;

/** Fields stripped before writing — never persisted, by design. */
export const DRAFT_EXCLUDED_FIELDS: Record<string, readonly string[]> = {
  s1: ["teudatZehut"],
  s6: ["bankCode", "branchCode", "accountNumber"],
};

type Section = Record<string, unknown>;

export interface SetupDraftInput {
  screen: number;
  selectedYear: number;
  s1: Section;
  s2: Section;
  s3: Section;
  s4: Section;
  s5: Section;
  s6: Section;
}

export interface SetupDraft extends SetupDraftInput {
  v: 1;
  savedAt: number;
}

/** Minimal storage contract (localStorage-compatible), injectable for tests. */
export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): DraftStorage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function stripExcluded(section: Section, excluded: readonly string[] | undefined): Section {
  if (!excluded || excluded.length === 0) return { ...section };
  const out: Section = {};
  for (const [k, v] of Object.entries(section)) {
    if (!excluded.includes(k)) out[k] = v;
  }
  return out;
}

/** Apply the privacy policy: returns a copy with the excluded fields removed. */
export function sanitizeDraftInput(input: SetupDraftInput): SetupDraftInput {
  return {
    screen: input.screen,
    selectedYear: input.selectedYear,
    s1: stripExcluded(input.s1, DRAFT_EXCLUDED_FIELDS.s1),
    s2: stripExcluded(input.s2, DRAFT_EXCLUDED_FIELDS.s2),
    s3: stripExcluded(input.s3, DRAFT_EXCLUDED_FIELDS.s3),
    s4: stripExcluded(input.s4, DRAFT_EXCLUDED_FIELDS.s4),
    s5: stripExcluded(input.s5, DRAFT_EXCLUDED_FIELDS.s5),
    s6: stripExcluded(input.s6, DRAFT_EXCLUDED_FIELDS.s6),
  };
}

/**
 * Whether the draft holds anything a user actually typed/chose — so the
 * restore prompt never fires for a pristine wizard, and an empty draft is
 * never written. Booleans that are false, empty strings and empty arrays
 * count as "nothing entered".
 */
export function isDraftMeaningful(input: SetupDraftInput): boolean {
  const sections = [input.s1, input.s2, input.s3, input.s4, input.s5, input.s6];
  for (const section of sections) {
    for (const v of Object.values(section)) {
      if (typeof v === "string" && v.trim() !== "") return true;
      if (typeof v === "number" && v !== 0) return true;
      if (typeof v === "boolean" && v) return true;
      if (Array.isArray(v) && v.length > 0) return true;
    }
  }
  return false;
}

/** Save a sanitized draft. No-op when storage is unavailable or the draft is empty. */
export function saveSetupDraft(
  input: SetupDraftInput,
  now: number = Date.now(),
  storage: DraftStorage | null = defaultStorage(),
): boolean {
  if (!storage) return false;
  const clean = sanitizeDraftInput(input);
  if (!isDraftMeaningful(clean)) return false;
  const draft: SetupDraft = { v: 1, savedAt: now, ...clean };
  try {
    storage.setItem(SETUP_DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/** Read a live draft, or null (missing / malformed / expired — expired ones are deleted). */
export function loadSetupDraft(
  now: number = Date.now(),
  storage: DraftStorage | null = defaultStorage(),
): SetupDraft | null {
  if (!storage) return null;
  let raw: string | null = null;
  try {
    raw = storage.getItem(SETUP_DRAFT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SetupDraft>;
    if (parsed?.v !== 1 || typeof parsed.savedAt !== "number") {
      storage.removeItem(SETUP_DRAFT_KEY);
      return null;
    }
    if (now - parsed.savedAt > SETUP_DRAFT_TTL_MS) {
      storage.removeItem(SETUP_DRAFT_KEY);
      return null;
    }
    // Defensive re-sanitize on read: even if an older writer leaked an
    // excluded field, it never reaches the caller.
    const clean = sanitizeDraftInput({
      screen: typeof parsed.screen === "number" ? parsed.screen : 1,
      selectedYear: typeof parsed.selectedYear === "number" ? parsed.selectedYear : 0,
      s1: parsed.s1 ?? {},
      s2: parsed.s2 ?? {},
      s3: parsed.s3 ?? {},
      s4: parsed.s4 ?? {},
      s5: parsed.s5 ?? {},
      s6: parsed.s6 ?? {},
    });
    return { v: 1, savedAt: parsed.savedAt, ...clean };
  } catch {
    try {
      storage.removeItem(SETUP_DRAFT_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function clearSetupDraft(storage: DraftStorage | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(SETUP_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** Hebrew relative-time label for the restore prompt ("לפני 5 דקות"). */
export function draftAgeLabelHe(savedAt: number, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - savedAt) / 60_000));
  if (minutes < 1) return "לפני רגע";
  if (minutes < 60) return `לפני ${minutes} דקות`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  const days = Math.round(hours / 24);
  return `לפני ${days} ימים`;
}
