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
