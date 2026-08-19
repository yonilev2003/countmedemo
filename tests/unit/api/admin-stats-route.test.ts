/**
 * GET /api/admin/stats — route-level test (audit gap, 2026-08-19: no test
 * file existed for this route at all).
 *
 * Mocks only @/lib/supabase/server's createClient (the auth check) — every
 * data metric in this route already degrades gracefully with no Supabase
 * configured (same "DEGRADE GRACEFULLY" contract exercised for the knowledge
 * tools in tests/unit/agent/chat-route.test.ts), so leaving
 * NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY unset here exercises
 * the real fail-open path rather than a simulated one.
 *
 * Focus: the ADMIN_EMAILS allowlist gate, and specifically that a rejected
 * caller gets 404 — never 401/403. The route's own header comment states
 * this is deliberate so a non-admin caller can't even tell the admin surface
 * exists. A future "helpful" switch to a more RESTful 401/403 would be a
 * real regression (it leaks that the surface exists), and nothing currently
 * catches it.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

let mockUserEmail: string | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: mockUserEmail ? { email: mockUserEmail } : null },
      }),
    },
  }),
}));

import { GET } from "@/app/api/admin/stats/route";

function resetEnv() {
  mockUserEmail = null;
  delete process.env.ADMIN_EMAILS;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.AI_PAUSED;
  delete process.env.AI_FORCE_HAIKU;
}

describe("GET /api/admin/stats — admin allowlist gate", () => {
  beforeEach(resetEnv);

  it("returns 404 (never 401/403) for a signed-out caller — doesn't reveal the admin surface exists", async () => {
    mockUserEmail = null;
    process.env.ADMIN_EMAILS = "owner@countme.co.il";

    const res = await GET();

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Not found" });
  });

  it("returns 404 for a signed-in but non-admin email", async () => {
    mockUserEmail = "random-user@example.com";
    process.env.ADMIN_EMAILS = "owner@countme.co.il";

    const res = await GET();

    expect(res.status).toBe(404);
  });

  it("fails CLOSED (404) when ADMIN_EMAILS is unset, even for a real signed-in user — never 'everyone is admin'", async () => {
    mockUserEmail = "owner@countme.co.il";
    delete process.env.ADMIN_EMAILS;

    const res = await GET();

    expect(res.status).toBe(404);
  });

  it("allows the admin email through to 200, matched case-insensitively and trimmed", async () => {
    mockUserEmail = "  Owner@CountMe.co.il  ";
    process.env.ADMIN_EMAILS = "owner@countme.co.il, someone-else@countme.co.il";

    const res = await GET();

    expect(res.status).toBe(200);
  });

  it("rejects an email that is merely a superstring of an allowed one (no accidental prefix/substring match)", async () => {
    mockUserEmail = "owner@countme.co.il.evil.com";
    process.env.ADMIN_EMAILS = "owner@countme.co.il";

    const res = await GET();

    expect(res.status).toBe(404);
  });
});

describe("GET /api/admin/stats — response shape (admin, DB unconfigured)", () => {
  beforeEach(() => {
    resetEnv();
    mockUserEmail = "owner@countme.co.il";
    process.env.ADMIN_EMAILS = "owner@countme.co.il";
  });

  it("degrades every DB-backed metric to null instead of 500ing when Supabase isn't configured", async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totals.users).toBeNull();
    expect(body.totals.chatThreads).toBeNull();
    expect(body.totals.events).toEqual({ today: null, yesterday: null });
    expect(body.totals.aiCalls).toEqual({ today: null, yesterday: null });
    expect(body.totals.aiCostUsd).toEqual({ today: null, yesterday: null });
    expect(body.health.ai_usage).toBeNull();
    expect(body.health.knowledge_chunks).toBeNull();
    expect(body.health.chat_threads).toBeNull();
    expect(body.health.rate_limit_buckets).toBeNull();
    // getBudgetState() itself fails open to spend=0 → "normal", so budget
    // state still resolves even though the underlying spend read failed.
    expect(body.budget.state).toBe("normal");
  });

  it("reports the kill-switch env flags verbatim", async () => {
    process.env.AI_PAUSED = "true";

    const res = await GET();

    const body = await res.json();
    expect(body.killSwitches.aiPaused).toBe(true);
    expect(body.killSwitches.aiForceHaiku).toBe(false);
  });

  it("reports custom budget thresholds from env instead of the hardcoded defaults", async () => {
    process.env.AI_DAILY_BUDGET_DEGRADE_USD = "1";
    process.env.AI_DAILY_BUDGET_PAUSE_USD = "2";

    const res = await GET();

    const body = await res.json();
    expect(body.budget.degradeThresholdUsd).toBe(1);
    expect(body.budget.pauseThresholdUsd).toBe(2);

    delete process.env.AI_DAILY_BUDGET_DEGRADE_USD;
    delete process.env.AI_DAILY_BUDGET_PAUSE_USD;
  });
});
