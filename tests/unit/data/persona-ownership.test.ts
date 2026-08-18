/**
 * decidePersonaOwnership — the cross-account safety rule behind QA finding
 * #17 (session bleed): a fresh anonymous /setup persona (e.g. Dana) sharing a
 * browser with a stale authenticated cookie for a DIFFERENT account (e.g.
 * Yoni) must never have her data silently read as his, merged into his DB
 * row, or uploaded there. Pure logic — no localStorage/Supabase involved, so
 * every branch of the state table in lib/data/persona-store.ts is exercised
 * directly here.
 */

import { describe, it, expect } from "vitest";
import {
  decidePersonaOwnership,
  canOptimisticallyPaintStampedCache,
  type PersonaOwnershipInput,
} from "@/lib/data/persona-store";

const YONI = "user-yoni";
const DANA = "user-dana";

function input(overrides: Partial<PersonaOwnershipInput>): PersonaOwnershipInput {
  return {
    currentUserId: null,
    localOwner: null,
    hasLocalPersona: false,
    hasRemotePersona: false,
    explicitContinueIntent: false,
    ...overrides,
  };
}

describe("decidePersonaOwnership", () => {
  it("signed out: local cache (whatever it holds) is left untouched", () => {
    expect(
      decidePersonaOwnership(
        input({ currentUserId: null, hasLocalPersona: true, localOwner: null }),
      ),
    ).toBe("signed-out");
    expect(
      decidePersonaOwnership(
        input({ currentUserId: null, hasLocalPersona: true, localOwner: DANA }),
      ),
    ).toBe("signed-out");
  });

  it("authenticated + DB already has a persona: DB always wins, regardless of local stamp", () => {
    expect(
      decidePersonaOwnership(
        input({
          currentUserId: YONI,
          hasRemotePersona: true,
          localOwner: DANA, // even a foreign-stamped local cache doesn't matter here
          hasLocalPersona: true,
        }),
      ),
    ).toBe("use-remote");
  });

  it("authenticated, no DB persona, no local persona at all: genuinely new user", () => {
    expect(
      decidePersonaOwnership(
        input({ currentUserId: YONI, hasRemotePersona: false, hasLocalPersona: false }),
      ),
    ).toBe("empty");
  });

  it("QA #17 core case: local cache stamped to a DIFFERENT user than the live session must be discarded, never adopted, never uploaded — even when the DB has no row yet for the live session", () => {
    // Yoni's stale cookie is live; the local cache is Dana's, already stamped
    // to Dana from an earlier reconcile on this browser (e.g. Dana logged in
    // once before). Yoni's own DB row doesn't exist yet.
    const action = decidePersonaOwnership(
      input({
        currentUserId: YONI,
        localOwner: DANA,
        hasLocalPersona: true,
        hasRemotePersona: false,
        explicitContinueIntent: false,
      }),
    );
    expect(action).toBe("discard-foreign");
  });

  it("QA #17 core case, even WITH a (mistaken) continue-intent flag still set: a foreign-owned stamp always wins over adoption", () => {
    // Defense in depth: explicitContinueIntent must never override a local
    // cache that is already stamped to someone else — adoption is only for
    // UNSTAMPED caches.
    const action = decidePersonaOwnership(
      input({
        currentUserId: YONI,
        localOwner: DANA,
        hasLocalPersona: true,
        hasRemotePersona: false,
        explicitContinueIntent: true,
      }),
    );
    expect(action).toBe("discard-foreign");
  });

  it("anonymous local cache, no DB row yet, NO explicit continue-intent: must NOT be silently adopted/uploaded into the live session's account", () => {
    // This is the write-path shape of QA #17: Dana finishes /setup without
    // ever clicking "login" — her anonymous cache must not be swept into
    // whichever account's cookie happens to be live in this browser.
    const action = decidePersonaOwnership(
      input({
        currentUserId: YONI,
        localOwner: null,
        hasLocalPersona: true,
        hasRemotePersona: false,
        explicitContinueIntent: false,
      }),
    );
    expect(action).toBe("empty");
  });

  it("anonymous local cache, no DB row yet, explicit continue-intent SET: safe to claim and upload — the legitimate signup hand-off", () => {
    const action = decidePersonaOwnership(
      input({
        currentUserId: DANA,
        localOwner: null,
        hasLocalPersona: true,
        hasRemotePersona: false,
        explicitContinueIntent: true,
      }),
    );
    expect(action).toBe("adopt-unclaimed");
  });

  it("local cache already stamped to the CURRENT user: safe to keep/re-upload (normal own-data path)", () => {
    const action = decidePersonaOwnership(
      input({
        currentUserId: YONI,
        localOwner: YONI,
        hasLocalPersona: true,
        hasRemotePersona: false,
        explicitContinueIntent: false,
      }),
    );
    expect(action).toBe("keep-own");
  });

  it("persistPersona's call shape (hasRemotePersona always false) can never resolve to use-remote, for any owner/intent combination", () => {
    // persistPersona() never fetches remote before deciding whether to
    // upload (that would cost a network round-trip on every save) — it
    // always passes hasRemotePersona: false. This locks in that "use-remote"
    // is unreachable from the write path, so a save can never be silently
    // reinterpreted as "the DB already has this, skip the safety check".
    for (const localOwner of [null, YONI, DANA]) {
      for (const explicitContinueIntent of [true, false]) {
        const action = decidePersonaOwnership(
          input({
            currentUserId: YONI,
            localOwner,
            hasLocalPersona: true,
            hasRemotePersona: false,
            explicitContinueIntent,
          }),
        );
        expect(action).not.toBe("use-remote");
      }
    }
  });
});

/**
 * canOptimisticallyPaintStampedCache — the gate behind the perf-vs-security
 * reconciliation for QA #17 (2026-08-18): a STAMPED local cache may now
 * render BEFORE the authoritative `syncPersonaFromDb()` reconcile lands, but
 * ONLY when this tab already has same-tab knowledge (a `currentUserId` value
 * resolved earlier this session) that painting it is safe. It is pure and
 * side-effect-free — it takes `currentUserId` as an explicit parameter
 * rather than reading the module's internal same-tab cache — so, like
 * `decidePersonaOwnership` above, every branch is exercised directly here
 * with no localStorage/Supabase/React involved.
 *
 * This function is deliberately a thin wrapper around `decidePersonaOwnership`
 * (never reimplements its rules), so these tests also serve as a regression
 * guard: whenever that function would say "discard-foreign", this gate must
 * say `false`; whenever it would say "keep-own", this gate must say `true`.
 */
describe("canOptimisticallyPaintStampedCache", () => {
  it("same-owner cache (currentUserId === localOwner): paints instantly — the normal repeat-navigation path", () => {
    expect(canOptimisticallyPaintStampedCache(YONI, YONI)).toBe(true);
    // Cross-check against the authoritative function this gate wraps.
    expect(
      decidePersonaOwnership(
        input({ currentUserId: YONI, localOwner: YONI, hasLocalPersona: true }),
      ),
    ).toBe("keep-own");
  });

  it("foreign-owner cache (currentUserId !== localOwner, both known): NEVER paints — waits for DB, exactly as today, even though this tab DOES have same-tab knowledge of both identities", () => {
    // This is the exact QA #17 shape, now exercised through the fast path
    // too: knowing Yoni is live AND knowing the cache says Dana must still
    // refuse to paint — same-tab knowledge is not an excuse to skip the
    // foreign-cache guard.
    expect(canOptimisticallyPaintStampedCache(YONI, DANA)).toBe(false);
    expect(
      decidePersonaOwnership(
        input({ currentUserId: YONI, localOwner: DANA, hasLocalPersona: true }),
      ),
    ).toBe("discard-foreign");
  });

  it("confirmed signed-out (currentUserId null) with a leftover stamped cache: paints — signed-out sessions already show local caches as-is (decidePersonaOwnership's 'signed-out' branch), this just removes the wait", () => {
    expect(canOptimisticallyPaintStampedCache(null, DANA)).toBe(true);
    expect(
      decidePersonaOwnership(
        input({ currentUserId: null, localOwner: DANA, hasLocalPersona: true }),
      ),
    ).toBe("signed-out");
  });

  it("no same-tab knowledge yet (currentUserId undefined — this tab's first persona-consuming render this session): NEVER paints, must wait for the real reconcile — the pre-optimization baseline behavior", () => {
    expect(canOptimisticallyPaintStampedCache(undefined, YONI)).toBe(false);
    expect(canOptimisticallyPaintStampedCache(undefined, DANA)).toBe(false);
  });
});
