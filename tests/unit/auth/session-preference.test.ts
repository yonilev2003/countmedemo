/**
 * "השאר אותי מחובר/ת" (stay signed in) policy — Yoni's request, 2026-08-20:
 * sign out after each use unless explicitly remembered. See
 * lib/auth/session-preference.ts's own header comment for why this is
 * layered on top of the Supabase cookie (which @supabase/ssr 0.12.0 always
 * makes persistent, with no supported override) instead of controlling the
 * cookie's own Max-Age directly.
 *
 * This repo's vitest environment is "node" (no jsdom) — every other test
 * that touches browser storage mocks it directly rather than pulling in a
 * DOM environment; this suite follows the same convention with a minimal
 * in-memory Storage stand-in via vi.stubGlobal.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  };
}

let localStorageMock: Storage;
let sessionStorageMock: Storage;

beforeEach(() => {
  localStorageMock = fakeStorage();
  sessionStorageMock = fakeStorage();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("sessionStorage", sessionStorageMock);
});

async function loadModule() {
  vi.resetModules();
  return import("@/lib/auth/session-preference");
}

describe("session-preference — stay-signed-in policy", () => {
  it("default (never called markSessionStart, e.g. a pre-existing session from before this feature shipped): forces sign-out", async () => {
    const { shouldForceSignOut } = await loadModule();
    expect(shouldForceSignOut()).toBe(true);
  });

  it("markSessionStart(false) — unchecked 'stay signed in': does NOT force sign-out within the same browser session", async () => {
    const { markSessionStart, shouldForceSignOut } = await loadModule();
    markSessionStart(false);
    expect(shouldForceSignOut()).toBe(false);
  });

  it("markSessionStart(false) then sessionStorage is cleared (simulates the browser being closed and reopened): forces sign-out on the next visit", async () => {
    const { markSessionStart, shouldForceSignOut } = await loadModule();
    markSessionStart(false);
    expect(shouldForceSignOut()).toBe(false);
    sessionStorageMock.clear(); // the one thing a real browser restart does for us
    expect(shouldForceSignOut()).toBe(true);
  });

  it("markSessionStart(true) — checked 'stay signed in': survives sessionStorage clearing (a real browser restart)", async () => {
    const { markSessionStart, shouldForceSignOut } = await loadModule();
    markSessionStart(true);
    expect(shouldForceSignOut()).toBe(false);
    sessionStorageMock.clear();
    expect(shouldForceSignOut()).toBe(false); // localStorage flag alone is enough
  });

  it("re-choosing 'not remembered' on a browser that previously HAD remember-me set: clears the old persistent flag", async () => {
    const { markSessionStart, shouldForceSignOut } = await loadModule();
    markSessionStart(true);
    expect(shouldForceSignOut()).toBe(false);
    markSessionStart(false); // a different sign-in on the same browser, this time unchecked
    sessionStorageMock.clear(); // and later, a real restart
    expect(shouldForceSignOut()).toBe(true); // must NOT still be remembered from before
  });
});
