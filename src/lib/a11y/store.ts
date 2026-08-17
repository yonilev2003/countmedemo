"use client";

// Pub-sub store for the accessibility-preferences widget, consumed via
// useSyncExternalStore. localStorage-persisted under a versioned key.

import { useSyncExternalStore } from "react";
import {
  A11Y_STORAGE_KEY,
  A11Y_VERSION,
  DEFAULT_PREFS,
  applyPrefsToElement,
  type A11yPrefs,
} from "./core";

export * from "./core";

function readStorage(): A11yPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as A11yPrefs;
    if (parsed.version !== A11Y_VERSION) return null;
    return { ...DEFAULT_PREFS, ...parsed, version: A11Y_VERSION };
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();
let cached: A11yPrefs | undefined;

function notify(next?: A11yPrefs) {
  // Pre-populate so subscriber fan-out doesn't re-read localStorage N times.
  cached = next ?? readStorage() ?? DEFAULT_PREFS;
  for (const cb of listeners) cb();
}

function writeStorage(prefs: A11yPrefs) {
  try {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Private mode / quota — in-memory only; bootstrap simply won't persist.
  }
}

export const a11yStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  getSnapshot(): A11yPrefs {
    if (cached === undefined) cached = readStorage() ?? DEFAULT_PREFS;
    return cached;
  },
  getServerSnapshot(): A11yPrefs {
    return DEFAULT_PREFS;
  },
  set(partial: Partial<A11yPrefs>): A11yPrefs {
    const next: A11yPrefs = { ...this.getSnapshot(), ...partial, version: A11Y_VERSION };
    writeStorage(next);
    if (typeof document !== "undefined") applyPrefsToElement(document.documentElement, next);
    notify(next);
    return next;
  },
  reset(): A11yPrefs {
    try {
      localStorage.removeItem(A11Y_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined")
      applyPrefsToElement(document.documentElement, DEFAULT_PREFS);
    notify(DEFAULT_PREFS);
    return DEFAULT_PREFS;
  },
};

export function useA11yPrefs(): A11yPrefs {
  return useSyncExternalStore(
    a11yStore.subscribe,
    a11yStore.getSnapshot,
    a11yStore.getServerSnapshot,
  );
}
