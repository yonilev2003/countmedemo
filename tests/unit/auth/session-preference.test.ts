/**
 * "השאר אותי מחובר/ת" (stay signed in) policy — Yoni's request, 2026-08-20:
 * sign out after each use unless explicitly remembered. See
 * lib/auth/session-preference.ts's own header comment for the full design
 * rationale, including why a naive localStorage timestamp "heartbeat" was
 * tried and rejected (it survives a real browser close, which would have
 * silently weakened the exact guarantee this feature exists to provide) in
 * favor of BroadcastChannel, whose defining property is that it canNOT
 * survive every tab of the origin actually closing.
 *
 * This repo's vitest environment is "node" (no jsdom) — every other test
 * that touches browser storage mocks it directly rather than pulling in a
 * DOM environment; this suite follows the same convention with a minimal
 * in-memory Storage stand-in and a minimal same-process BroadcastChannel
 * stand-in (real BroadcastChannel only connects same-origin browsing
 * contexts; a shared in-memory registry reproduces that "only reaches
 * currently-open listeners" property closely enough to test the tab-sibling
 * logic without a browser).
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

/** Minimal same-process stand-in: channels sharing a `name` share a
 *  listener set. No persistence, no cross-process delivery — closing every
 *  channel for a name forgets it completely, matching real BroadcastChannel's
 *  "only reaches currently-open tabs" property closely enough for this test. */
function installFakeBroadcastChannel() {
  const registries = new Map<string, Set<(data: unknown) => void>>();

  class FakeBroadcastChannel {
    name: string;
    onmessage: ((e: { data: unknown }) => void) | null = null;
    private listener?: (data: unknown) => void;

    constructor(name: string) {
      this.name = name;
      this.listener = (data: unknown) => {
        // Real BroadcastChannel never delivers a tab's own postMessage back
        // to itself — emulate that by deferring and checking this.onmessage
        // is still the live one, and by having postMessage skip `this`.
        this.onmessage?.({ data });
      };
      if (!registries.has(name)) registries.set(name, new Set());
      registries.get(name)!.add(this.listener);
    }

    postMessage(data: unknown) {
      const set = registries.get(this.name);
      if (!set) return;
      for (const listener of set) {
        if (listener !== this.listener) listener(data);
      }
    }

    close() {
      registries.get(this.name)?.delete(this.listener!);
    }
  }

  vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);
}

let localStorageMock: Storage;
let sessionStorageMock: Storage;

beforeEach(() => {
  localStorageMock = fakeStorage();
  sessionStorageMock = fakeStorage();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("sessionStorage", sessionStorageMock);
  installFakeBroadcastChannel();
});

async function loadModule() {
  vi.resetModules();
  return import("@/lib/auth/session-preference");
}

describe("session-preference — stay-signed-in policy", () => {
  it("default (never called markSessionStart, e.g. a pre-existing session from before this feature shipped, and no sibling tab): forces sign-out", async () => {
    const { shouldForceSignOut } = await loadModule();
    expect(await shouldForceSignOut()).toBe(true);
  });

  it("markSessionStart(false) — unchecked 'stay signed in': does NOT force sign-out within the same tab/browser session", async () => {
    const { markSessionStart, shouldForceSignOut } = await loadModule();
    markSessionStart(false);
    expect(await shouldForceSignOut()).toBe(false);
  });

  it("markSessionStart(false) then a real restart (sessionStorage cleared AND every tab's BroadcastChannel connection torn down — nothing survives an actual close): forces sign-out on the next visit", async () => {
    const { markSessionStart, shouldForceSignOut } = await loadModule();
    markSessionStart(false);
    expect(await shouldForceSignOut()).toBe(false);
    // A real restart clears sessionStorage AND destroys every tab's JS
    // context, which tears down its BroadcastChannel connections — the fake
    // registry has to be reinstalled to model that (it otherwise has no
    // notion of "a tab closed", only explicit channel.close() calls).
    sessionStorageMock.clear();
    installFakeBroadcastChannel();
    expect(await shouldForceSignOut()).toBe(true);
  });

  it("markSessionStart(true) — checked 'stay signed in': survives sessionStorage clearing (a real browser restart)", async () => {
    const { markSessionStart, shouldForceSignOut } = await loadModule();
    markSessionStart(true);
    expect(await shouldForceSignOut()).toBe(false);
    sessionStorageMock.clear();
    expect(await shouldForceSignOut()).toBe(false); // localStorage flag alone is enough
  });

  it("re-choosing 'not remembered' on a browser that previously HAD remember-me set: clears the old persistent flag", async () => {
    const { markSessionStart, shouldForceSignOut } = await loadModule();
    markSessionStart(true);
    expect(await shouldForceSignOut()).toBe(false);
    markSessionStart(false); // a different sign-in on the same browser, this time unchecked
    sessionStorageMock.clear(); // and later, a real restart tears down this tab's channel too
    installFakeBroadcastChannel();
    expect(await shouldForceSignOut()).toBe(true); // must NOT still be remembered from before
  });

  it("CROSS-TAB (adversarial-review finding): a sibling tab with a legitimate session answers the ping — a fresh tab (own sessionStorage empty, no remember-me) is NOT force-signed-out, and does not sign the sibling out either", async () => {
    const mod = await loadModule();
    // Tab A signs in, unchecked — registers as a ping responder.
    mod.markSessionStart(false);

    // Tab B: a genuinely separate sessionStorage (fresh tab opened by typed
    // URL, per the finding) but the SAME localStorage and BroadcastChannel
    // registry (same browser, same origin) — swap only sessionStorage to
    // model that, keep the same module instance (both tabs share the same
    // JS realm in this in-process test, which is fine: the function under
    // test never reads any Tab-A-specific closure state, only the shared
    // storages/channel).
    sessionStorageMock.clear();

    const tabBResult = await mod.shouldForceSignOut();

    expect(tabBResult).toBe(false); // sibling answered — do not sign out
  });

  it("CROSS-TAB negative: no sibling tab is open (no prior markSessionStart in this test) — forces sign-out, as before this fix", async () => {
    const { shouldForceSignOut } = await loadModule();
    // No responder was ever registered — ping times out.
    expect(await shouldForceSignOut()).toBe(true);
  });

  it("degrades safely with no BroadcastChannel support: never worse than the pre-sibling-check behavior", async () => {
    vi.unstubAllGlobals();
    localStorageMock = fakeStorage();
    sessionStorageMock = fakeStorage();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("sessionStorage", sessionStorageMock);
    // Deliberately no BroadcastChannel global at all.
    const { markSessionStart, shouldForceSignOut } = await loadModule();
    expect(await shouldForceSignOut()).toBe(true); // no flags, no channel → force sign-out, same as before
    markSessionStart(false);
    expect(await shouldForceSignOut()).toBe(false); // own flag still works without BroadcastChannel
  });
});
