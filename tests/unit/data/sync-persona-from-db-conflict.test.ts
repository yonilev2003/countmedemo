/**
 * syncPersonaFromDb()'s read-reconcile path — the sibling of
 * persist-persona-conflict.test.ts's write-path guard.
 *
 * QA audit finding (25/08): the 2026-08-20 fix hardened exactly ONE write
 * path (persistPersona → checkAndAdoptUnclaimed → checkRemotePersonaExists,
 * three-state, fails CLOSED on "unknown"). syncPersonaFromDbUncached
 * (persona-store.ts) reuses the same decidePersonaOwnership() decision
 * function, but used to derive hasRemotePersona from the plain two-state
 * fetchPersona(), which collapsed "no row" and "the query itself errored"
 * into the same null — its "adopt-unclaimed"/"keep-own" branches then called
 * attemptCloudUpsert directly, with no existence re-check at all. Since
 * syncPersonaFromDb() runs automatically on every persona-route navigation
 * (PersonaHydrator), including right after an OAuth redirect with a pending
 * continue-intent, a transient fetchPersonaSafe failure at that exact moment
 * reopened the identical silent-overwrite shape the 20/08 fix closed — just
 * on this path instead. Fixed by routing through the same fetchPersonaSafe
 * three-state result and failing closed (read-only, no write) on "unknown".
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const YONI = "user-yoni";
const LOCAL_PERSONA = { personal: { firstName: "Local" } } as unknown as import("@/lib/persona").Persona;
const REMOTE_PERSONA = { personal: { firstName: "Remote" } } as unknown as import("@/lib/persona").Persona;

let mockCurrentUserId: string | null = null;
let mockLocalOwner: string | null = null;
let mockLocal: unknown = null;
let mockFetchResult:
  | { status: "exists"; persona: unknown }
  | { status: "absent" }
  | { status: "unknown" } = { status: "absent" };
let mockContinueIntent = false;
let upsertCalls: unknown[] = [];
let setOwnerCalls: (string | null)[] = [];
let saveLocalCalls: unknown[] = [];
let clearLocalCalls = 0;

vi.mock("@/lib/data/persona-repository", () => ({
  getCurrentUserId: async () => mockCurrentUserId,
  fetchPersonaSafe: async (_userId: string) => mockFetchResult,
  checkRemotePersonaExists: async (_userId: string) => mockFetchResult.status,
  upsertPersona: async (persona: unknown) => {
    upsertCalls.push(persona);
    return true;
  },
}));

vi.mock("@/lib/setup-storage", () => ({
  loadPersona: () => mockLocal,
  savePersona: (p: unknown) => {
    saveLocalCalls.push(p);
  },
  clearLocalPersona: () => {
    clearLocalCalls++;
  },
  getPersonaOwner: () => mockLocalOwner,
  setPersonaOwner: (userId: string | null) => {
    setOwnerCalls.push(userId);
  },
  consumeExplicitContinueIntent: () => mockContinueIntent,
}));

import { syncPersonaFromDb } from "@/lib/data/persona-store";

function resetMocks() {
  mockCurrentUserId = null;
  mockLocalOwner = null;
  mockLocal = null;
  mockFetchResult = { status: "absent" };
  mockContinueIntent = false;
  upsertCalls = [];
  setOwnerCalls = [];
  saveLocalCalls = [];
  clearLocalCalls = 0;
}

/** Flush the fire-and-forget attemptCloudUpsert() microtasks that
 * "adopt-unclaimed"/"keep-own" kick off without awaiting. */
async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("syncPersonaFromDb — read-reconcile existence-check guard", () => {
  beforeEach(resetMocks);

  it("REGRESSION for the 25/08 QA finding: the existence check fails ('unknown', e.g. a network blip) with an unstamped local cache + pending intent → returns local UNCHANGED, never calls upsertPersona or setPersonaOwner", async () => {
    mockCurrentUserId = YONI;
    mockLocal = LOCAL_PERSONA;
    mockLocalOwner = null; // unstamped anonymous cache
    mockContinueIntent = true; // just came from DoneScreen's finish CTA
    mockFetchResult = { status: "unknown" }; // the check itself errored

    const result = await syncPersonaFromDb();
    await flush();

    expect(result).toBe(LOCAL_PERSONA);
    expect(upsertCalls).toHaveLength(0);
    expect(setOwnerCalls).toHaveLength(0);
    expect(clearLocalCalls).toBe(0);
  });

  it("'unknown' also refuses the keep-own repair-write path (already-stamped local, DB unreachable) — no upsert", async () => {
    mockCurrentUserId = YONI;
    mockLocal = LOCAL_PERSONA;
    mockLocalOwner = YONI; // already this user's own cache
    mockFetchResult = { status: "unknown" };

    const result = await syncPersonaFromDb();
    await flush();

    expect(result).toBe(LOCAL_PERSONA);
    expect(upsertCalls).toHaveLength(0);
  });

  it("genuinely new account: 'absent' + unstamped local + pending intent → adopts and uploads (unchanged behavior)", async () => {
    mockCurrentUserId = YONI;
    mockLocal = LOCAL_PERSONA;
    mockLocalOwner = null;
    mockContinueIntent = true;
    mockFetchResult = { status: "absent" };

    const result = await syncPersonaFromDb();
    await flush();

    expect(result).toBe(LOCAL_PERSONA);
    expect(setOwnerCalls).toEqual([YONI]);
    expect(upsertCalls).toHaveLength(1);
  });

  it("account already has real data: 'exists' → DB wins, overwrites the local cache, no upload (unchanged behavior)", async () => {
    mockCurrentUserId = YONI;
    mockLocal = LOCAL_PERSONA;
    mockLocalOwner = null;
    mockFetchResult = { status: "exists", persona: REMOTE_PERSONA };

    const result = await syncPersonaFromDb();

    expect(result).toBe(REMOTE_PERSONA);
    expect(saveLocalCalls).toEqual([REMOTE_PERSONA]);
    expect(setOwnerCalls).toEqual([YONI]);
    expect(upsertCalls).toHaveLength(0);
  });

  it("signed out: returns local untouched, never calls fetchPersonaSafe's result into a write", async () => {
    mockCurrentUserId = null;
    mockLocal = LOCAL_PERSONA;

    const result = await syncPersonaFromDb();

    expect(result).toBe(LOCAL_PERSONA);
    expect(upsertCalls).toHaveLength(0);
    expect(setOwnerCalls).toHaveLength(0);
  });
});
