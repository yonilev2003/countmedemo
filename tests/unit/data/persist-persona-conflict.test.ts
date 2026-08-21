/**
 * persistPersona's "adopt-unclaimed" existence-check guard (2026-08-20,
 * Yoni's finding; hardened same day after an adversarial review caught the
 * first version failing OPEN on a check error).
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
 * checkAndAdoptUnclaimed() (persona-store.ts) closes that gap with an
 * existence check via checkRemotePersonaExists() — a THREE-state result
 * ("exists" | "absent" | "unknown"), not the two-state null-or-object shape
 * fetchPersona() uses elsewhere. The distinction matters: a transient
 * network/RLS error during the check ("unknown") must be treated the SAME
 * as "exists" (refuse to write) — treating it as "absent" would silently
 * reopen the exact overwrite gap this guard exists to close. This suite
 * covers all three states plus the retry path, which must re-run the check
 * rather than blindly upserting on a retry.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const YONI = "user-yoni";

let mockCurrentUserId: string | null = null;
let mockLocalOwner: string | null = null;
let mockExistsResult: "exists" | "absent" | "unknown" = "absent";
let mockContinueIntent = false;
let upsertCalls: unknown[] = [];
let setOwnerCalls: (string | null)[] = [];
let existsCheckCalls = 0;

vi.mock("@/lib/data/persona-repository", () => ({
  getCurrentUserId: async () => mockCurrentUserId,
  fetchPersona: async (_userId?: string) => null,
  checkRemotePersonaExists: async (_userId: string) => {
    existsCheckCalls++;
    return mockExistsResult;
  },
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

import { persistPersona, retryPersonaSave } from "@/lib/data/persona-store";
import type { Persona } from "@/lib/persona";

const FRESH_PERSONA = { personal: { firstName: "Test" } } as unknown as Persona;

function resetMocks() {
  mockCurrentUserId = null;
  mockLocalOwner = null;
  mockExistsResult = "absent";
  mockContinueIntent = false;
  upsertCalls = [];
  setOwnerCalls = [];
  existsCheckCalls = 0;
}

describe("persistPersona — adopt-unclaimed existence-check guard", () => {
  beforeEach(resetMocks);

  it("REGRESSION for Yoni's finding: local unstamped + intent flag set + account ALREADY has remote data ('exists') → refuses to upload, returns 'conflict', never calls upsertPersona or setPersonaOwner", async () => {
    mockCurrentUserId = YONI;
    mockLocalOwner = null; // unstamped — the exact shape that used to slip through
    mockContinueIntent = true;
    mockExistsResult = "exists"; // account genuinely already has data

    const outcome = await persistPersona(FRESH_PERSONA);

    expect(outcome).toBe("conflict");
    expect(upsertCalls).toHaveLength(0);
    expect(setOwnerCalls).toHaveLength(0);
  });

  it("REGRESSION for the adversarial-review finding: the existence check ITSELF fails ('unknown', e.g. a network blip) → fails CLOSED — refuses to upload, does NOT treat a failed check as 'safe to adopt'", async () => {
    mockCurrentUserId = YONI;
    mockLocalOwner = null;
    mockContinueIntent = true;
    mockExistsResult = "unknown"; // the check errored — must NOT be read as "absent"

    const outcome = await persistPersona(FRESH_PERSONA);

    expect(outcome).toBe("error");
    expect(upsertCalls).toHaveLength(0);
    expect(setOwnerCalls).toHaveLength(0);
  });

  it("retry after an 'unknown' check failure RE-RUNS the existence check (not a blind upsert) — and succeeds once the check resolves 'absent'", async () => {
    mockCurrentUserId = YONI;
    mockLocalOwner = null;
    mockContinueIntent = true;
    mockExistsResult = "unknown";

    const first = await persistPersona(FRESH_PERSONA);
    expect(first).toBe("error");
    expect(existsCheckCalls).toBe(1);
    expect(upsertCalls).toHaveLength(0);

    // Network recovers — the retry must check again, not skip straight to upsert.
    mockExistsResult = "absent";
    const retried = await retryPersonaSave();

    expect(existsCheckCalls).toBe(2); // re-checked, not bypassed
    expect(retried).toBe("saved");
    expect(upsertCalls).toHaveLength(1);
    expect(setOwnerCalls).toEqual([YONI]);
  });

  it("retry after an 'unknown' check failure that resolves 'exists' on the second try → still refuses, returns 'conflict' (never silently adopts on retry)", async () => {
    mockCurrentUserId = YONI;
    mockLocalOwner = null;
    mockContinueIntent = true;
    mockExistsResult = "unknown";

    await persistPersona(FRESH_PERSONA);
    mockExistsResult = "exists"; // turns out the account DOES have data after all
    const retried = await retryPersonaSave();

    expect(retried).toBe("conflict");
    expect(upsertCalls).toHaveLength(0);
    expect(setOwnerCalls).toHaveLength(0);
  });

  it("genuinely new account: local unstamped + intent flag set + NO remote data ('absent') → adopts and uploads normally", async () => {
    mockCurrentUserId = YONI;
    mockLocalOwner = null;
    mockContinueIntent = true;
    mockExistsResult = "absent"; // genuinely nothing there yet

    const outcome = await persistPersona(FRESH_PERSONA);

    expect(outcome).toBe("saved");
    expect(upsertCalls).toHaveLength(1);
    expect(setOwnerCalls).toEqual([YONI]);
  });

  it("own already-stamped cache (keep-own): never triggers the remote-existence check at all — no extra round-trip on the normal edit-save path", async () => {
    mockCurrentUserId = YONI;
    mockLocalOwner = YONI; // already stamped to the live user
    mockContinueIntent = false;
    mockExistsResult = "exists"; // irrelevant here — the check should never even run

    const outcome = await persistPersona(FRESH_PERSONA);

    expect(outcome).toBe("saved");
    expect(existsCheckCalls).toBe(0);
    expect(upsertCalls).toHaveLength(1);
    // setPersonaOwner is NOT called on the keep-own path (already stamped) —
    // only adopt-unclaimed stamps ownership.
    expect(setOwnerCalls).toHaveLength(0);
  });

  it("foreign-stamped cache (discard-foreign): never uploads, regardless of remote state", async () => {
    mockCurrentUserId = YONI;
    mockLocalOwner = "someone-else";
    mockContinueIntent = true; // even with the flag set — foreign stamp wins, per decidePersonaOwnership
    mockExistsResult = "absent";

    const outcome = await persistPersona(FRESH_PERSONA);

    expect(outcome).toBe("not-uploaded");
    expect(existsCheckCalls).toBe(0);
    expect(upsertCalls).toHaveLength(0);
    expect(setOwnerCalls).toHaveLength(0);
  });
});
