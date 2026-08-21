/**
 * persistPersona's "conflict" guard (2026-08-20, Yoni's finding).
 *
 * decidePersonaOwnership's write-path call (in persistPersona) is always
 * given hasRemotePersona=false — a deliberate perf tradeoff documented in
 * that function's own comment, since a real check would cost a round-trip on
 * every save AND would break "keep-own" (hasRemotePersona short-circuits
 * before localOwner is even checked). That means "adopt-unclaimed" can fire
 * based solely on "local cache is unstamped + the one-shot continue-intent
 * flag is set" — with no idea whether the currently-authenticated account
 * already has real data in the DB.
 *
 * In the common case that's harmless: PersonaHydrator's background
 * syncPersonaFromDb (running since /setup mounted) has almost always already
 * stamped a returning user's local cache to their own id long before they
 * reach the finish screen, which resolves to "keep-own" (safe — it's their
 * own row). But it's a RACE, not a guarantee — a fast fill, a slow/failed
 * background sync, or a device that was already signed in when /setup was
 * opened fresh, can all reach "adopt-unclaimed" while `currentUserId`
 * genuinely already has a persona row. upsertPersona() is a blind
 * onConflict:user_id upsert with no existence check of its own — so without
 * a guard, that combination would silently overwrite a real account's data
 * with whatever was just typed by (possibly) a different person at the same
 * device. This suite proves persistPersona now checks remote existence
 * before ever adopting an unstamped cache, closing that gap deterministically
 * instead of depending on hydrator timing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const YONI = "user-yoni";

let mockCurrentUserId: string | null = null;
let mockLocalOwner: string | null = null;
let mockRemotePersona: unknown = null;
let mockContinueIntent = false;
let upsertCalls: unknown[] = [];
let setOwnerCalls: (string | null)[] = [];

vi.mock("@/lib/data/persona-repository", () => ({
  getCurrentUserId: async () => mockCurrentUserId,
  fetchPersona: async (_userId?: string) => mockRemotePersona,
  upsertPersona: async (persona: unknown) => {
    upsertCalls.push(persona);
    return true;
  },
}));

vi.mock("@/lib/setup-storage", () => ({
  loadPersona: () => null,
  savePersona: () => {},
  clearLocalPersona: () => {},
  getPersonaOwner: () => mockLocalOwner,
  setPersonaOwner: (userId: string | null) => {
    setOwnerCalls.push(userId);
  },
  consumeExplicitContinueIntent: () => mockContinueIntent,
}));

import { persistPersona } from "@/lib/data/persona-store";
import type { Persona } from "@/lib/persona";

const FRESH_PERSONA = { personal: { firstName: "Test" } } as unknown as Persona;
const EXISTING_REMOTE_PERSONA = { personal: { firstName: "Real Yoni Data" } };

function resetMocks() {
  mockCurrentUserId = null;
  mockLocalOwner = null;
  mockRemotePersona = null;
  mockContinueIntent = false;
  upsertCalls = [];
  setOwnerCalls = [];
}

describe("persistPersona — conflict guard on the adopt-unclaimed write path", () => {
  beforeEach(resetMocks);

  it("REGRESSION for Yoni's finding: local unstamped + intent flag set + account ALREADY has remote data → refuses to upload, returns 'conflict', never calls upsertPersona or setPersonaOwner", async () => {
    mockCurrentUserId = YONI;
    mockLocalOwner = null; // unstamped — the exact shape that used to slip through
    mockContinueIntent = true;
    mockRemotePersona = EXISTING_REMOTE_PERSONA; // account genuinely already has data

    const outcome = await persistPersona(FRESH_PERSONA);

    expect(outcome).toBe("conflict");
    expect(upsertCalls).toHaveLength(0);
    expect(setOwnerCalls).toHaveLength(0);
  });

  it("genuinely new account: local unstamped + intent flag set + NO remote data → adopts and uploads normally", async () => {
    mockCurrentUserId = YONI;
    mockLocalOwner = null;
    mockContinueIntent = true;
    mockRemotePersona = null; // genuinely nothing there yet

    const outcome = await persistPersona(FRESH_PERSONA);

    expect(outcome).toBe("saved");
    expect(upsertCalls).toHaveLength(1);
    expect(setOwnerCalls).toEqual([YONI]);
  });

  it("own already-stamped cache (keep-own): never triggers the remote-existence check at all — no extra round-trip on the normal edit-save path", async () => {
    mockCurrentUserId = YONI;
    mockLocalOwner = YONI; // already stamped to the live user
    mockContinueIntent = false;
    mockRemotePersona = EXISTING_REMOTE_PERSONA; // irrelevant here — fetchPersona should never even be consulted

    const outcome = await persistPersona(FRESH_PERSONA);

    expect(outcome).toBe("saved");
    expect(upsertCalls).toHaveLength(1);
    // setPersonaOwner is NOT called on the keep-own path (already stamped) —
    // only adopt-unclaimed stamps ownership.
    expect(setOwnerCalls).toHaveLength(0);
  });

  it("foreign-stamped cache (discard-foreign): never uploads, regardless of remote state", async () => {
    mockCurrentUserId = YONI;
    mockLocalOwner = "someone-else";
    mockContinueIntent = true; // even with the flag set — foreign stamp wins, per decidePersonaOwnership
    mockRemotePersona = null;

    const outcome = await persistPersona(FRESH_PERSONA);

    expect(outcome).toBe("not-uploaded");
    expect(upsertCalls).toHaveLength(0);
    expect(setOwnerCalls).toHaveLength(0);
  });
});
