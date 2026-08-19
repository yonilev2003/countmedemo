/**
 * src/lib/alerts/digest.ts had NO test coverage at all before this file
 * (audit gap, 2026-08-19) — the daily-digest cron route
 * (src/app/api/cron/daily-digest/route.ts) is the only caller, and its own
 * test (tests/unit/api/daily-digest-route.test.ts) mocks this module out
 * entirely, so nothing exercised the digest's own logic.
 *
 * Focus areas, matching the audited gap:
 *   1. purgeOldEvents() — the 90-day retention purge, including that it
 *      never throws even when the DB is unreachable.
 *   2. The 4 health-check probes' table/RPC names (ai_usage,
 *      knowledge_chunks, chat_threads, check_rate_limit) — each is currently
 *      correct "verified by hand against migration files" per the audit, but
 *      nothing before this file would catch a future refactor silently
 *      probing the wrong name for a given Hebrew label.
 *   3. buildDailyDigest() never throws and degrades every section to the
 *      "לא זמין" fallback when the DB is entirely unreachable (the module's
 *      own documented "DEGRADE GRACEFULLY" contract).
 *   4. The data-aggregation pipeline (top-N events sort, AI cost-by-route
 *      sort/sum) actually renders the numbers it computes.
 *
 * Mocks @/lib/supabase/admin wholesale via tests/unit/helpers/fake-supabase-admin.ts
 * — no live Supabase project involved.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createFakeAdmin, type FakeAdminOptions } from "../helpers/fake-supabase-admin";

let mockAdmin: ReturnType<typeof createFakeAdmin>["admin"] | null = null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    if (!mockAdmin) {
      // Mirrors the real createAdminClient()'s behavior when
      // NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY aren't set —
      // throws synchronously, never returns a broken client.
      throw new Error("Missing Supabase admin credentials.");
    }
    return mockAdmin;
  },
}));

import { buildDailyDigest, purgeOldEvents } from "@/lib/alerts/digest";

function setAdmin(opts: FakeAdminOptions) {
  const fake = createFakeAdmin(opts);
  mockAdmin = fake.admin;
  return fake;
}

beforeEach(() => {
  mockAdmin = null;
});

describe("purgeOldEvents", () => {
  it("deletes from public.events and reports the deleted count on success", async () => {
    const fake = setAdmin({ tables: { events: { error: null, count: 7 } } });

    const result = await purgeOldEvents();

    expect(result).toEqual({ ok: true, deleted: 7 });
    expect(fake.tableCalls.map((c) => c.table)).toContain("events");
  });

  it("purges events older than exactly the 90-day retention window", async () => {
    const fake = setAdmin({ tables: { events: { error: null, count: 0 } } });
    const before = Date.now();

    await purgeOldEvents();

    const eventsCall = fake.tableCalls.find((c) => c.table === "events");
    expect(eventsCall).toBeDefined();
    expect(eventsCall!.chain.some((c) => c.method === "delete")).toBe(true);
    const ltCall = eventsCall!.chain.find((c) => c.method === "lt");
    expect(ltCall?.args[0]).toBe("created_at");
    const cutoffMs = new Date(ltCall!.args[1] as string).getTime();
    const expectedCutoffMs = before - 90 * 24 * 60 * 60 * 1000;
    // Generous slack for test wall-clock time, still catches a wrong
    // retention constant (e.g. 30 or 365 days) or broken arithmetic.
    expect(Math.abs(cutoffMs - expectedCutoffMs)).toBeLessThan(60_000);
  });

  it("reports ok:false with the DB error message on failure, never throwing", async () => {
    setAdmin({ tables: { events: { error: { message: "boom" }, count: null } } });

    const result = await purgeOldEvents();

    expect(result).toEqual({ ok: false, deleted: 0, errorMessage: "boom" });
  });

  it("never throws even when the admin client itself can't be created (DB fully unreachable)", async () => {
    mockAdmin = null; // createAdminClient() throws, per the mock above

    const result = await purgeOldEvents();

    expect(result.ok).toBe(false);
    expect(result.deleted).toBe(0);
  });
});

describe("buildDailyDigest — health-check table/RPC name matches", () => {
  it("maps each Hebrew health-check label to the exact table/RPC it actually probes", async () => {
    // Only "knowledge_chunks" and the "check_rate_limit" RPC are healthy;
    // every other table errors. If digest.ts is ever refactored to probe the
    // wrong table/RPC name for a given label, the corresponding OK/FAIL line
    // flips and this test fails.
    setAdmin({
      tables: {
        profiles: { error: { message: "down" } },
        events: { error: { message: "down" } },
        ai_usage: { error: { message: "down" } },
        chat_threads: { error: { message: "down" } },
        knowledge_chunks: { error: null },
      },
      rpcs: { check_rate_limit: { error: null } },
      defaultRpcResult: { error: { message: "no such rpc" } },
    });

    const digest = await buildDailyDigest();

    expect(digest.plain).toContain("OK טבלת knowledge_chunks (RAG לצ'אט)");
    expect(digest.plain).toContain(
      "OK Rate-limit עמיד (rate_limit_buckets / check_rate_limit)",
    );
    expect(digest.plain).toContain("FAIL טבלת ai_usage (מגן העלויות של ה-AI)");
    expect(digest.plain).toContain("FAIL טבלת chat_threads (היסטוריית שיחות)");

    // Same assertion against the HTML body (✅/❌ icons instead of OK/FAIL).
    expect(digest.html).toContain("✅ טבלת knowledge_chunks (RAG לצ'אט)");
    expect(digest.html).toContain("❌ טבלת ai_usage (מגן העלויות של ה-AI)");
  });

  it("flips every check to healthy when every probed table/RPC succeeds", async () => {
    setAdmin({
      defaultTableResult: { error: null, count: 0, data: [] },
      defaultRpcResult: { error: null },
    });

    const digest = await buildDailyDigest();

    expect(digest.plain).toContain("OK טבלת ai_usage (מגן העלויות של ה-AI)");
    expect(digest.plain).toContain("OK טבלת knowledge_chunks (RAG לצ'אט)");
    expect(digest.plain).toContain("OK טבלת chat_threads (היסטוריית שיחות)");
    expect(digest.plain).toContain(
      "OK Rate-limit עמיד (rate_limit_buckets / check_rate_limit)",
    );
    expect(digest.plain).not.toContain("FAIL");
  });
});

describe("buildDailyDigest — graceful degradation (DB fully unreachable)", () => {
  it("never throws, and every section (including health) still renders instead of blanking the send", async () => {
    mockAdmin = null; // createAdminClient() throws — same as missing Supabase env

    const digest = await buildDailyDigest();

    expect(digest.html).toContain("לא זמין");
    expect(digest.plain).toContain("לא זמין");
    // Health checks don't render "לא זמין" per-row — gatherHealthChecks()
    // itself never throws (each probe is individually .catch(() => false)),
    // so every check still renders, just as FAIL.
    expect(digest.plain).toContain("FAIL טבלת ai_usage (מגן העלויות של ה-AI)");
    expect(digest.plain).toContain("FAIL טבלת knowledge_chunks (RAG לצ'אט)");
    expect(digest.plain).toContain("FAIL טבלת chat_threads (היסטוריית שיחות)");
    expect(digest.plain).toContain(
      "FAIL Rate-limit עמיד (rate_limit_buckets / check_rate_limit)",
    );
  });

  it("still renders a retention section as unavailable when no retention result is passed in", async () => {
    mockAdmin = null;

    const digest = await buildDailyDigest();

    expect(digest.plain).toContain("ריטנשן:");
    expect(digest.plain).toContain("לא זמין");
  });
});

describe("buildDailyDigest — data aggregation", () => {
  it("renders signups, sorts events top-N by count desc, and sorts/sums AI usage by cost desc", async () => {
    setAdmin({
      tables: {
        profiles: { error: null, count: 42 },
        events: {
          error: null,
          count: 100,
          data: [{ name: "page_view" }, { name: "page_view" }, { name: "click" }],
        },
        ai_usage: {
          error: null,
          data: [
            {
              route: "chat",
              input_tokens: 100,
              output_tokens: 50,
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
              est_cost_usd: 0.01,
            },
            {
              route: "chat",
              input_tokens: 200,
              output_tokens: 100,
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
              est_cost_usd: 0.02,
            },
            {
              route: "upload",
              input_tokens: 500,
              output_tokens: 0,
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
              est_cost_usd: 0.05,
            },
          ],
        },
        chat_threads: { error: null, count: 9 },
      },
      defaultTableResult: { error: null, count: 0, data: [] },
      defaultRpcResult: { error: null },
    });

    const digest = await buildDailyDigest();

    expect(digest.plain).toContain('סה"כ משתמשים: 42');
    expect(digest.plain).toContain("- page_view: 2");
    expect(digest.plain).toContain("- click: 1");
    expect(digest.plain).toContain("אתמול: 3, סה\"כ: 100");
    expect(digest.plain).toContain("שיחות חדשות אתמול: 9");

    // byRoute is sorted by cost descending: upload ($0.05) before chat ($0.03).
    expect(digest.plain).toContain("- upload: 1 calls, 500 tokens, $0.05");
    expect(digest.plain).toContain("- chat: 2 calls, 450 tokens, $0.03");
    const uploadIdx = digest.plain.indexOf("- upload:");
    const chatIdx = digest.plain.indexOf("- chat:");
    expect(uploadIdx).toBeGreaterThan(-1);
    expect(chatIdx).toBeGreaterThan(-1);
    expect(uploadIdx).toBeLessThan(chatIdx);
    expect(digest.plain).toContain("עלות: $0.08");
  });

  it("threads a real retention result into the digest instead of the 'unavailable' fallback", async () => {
    setAdmin({ defaultTableResult: { error: null, count: 0, data: [] }, defaultRpcResult: { error: null } });

    const digest = await buildDailyDigest({ retention: { ok: true, deleted: 15 } });

    expect(digest.plain).toContain("אירועים שנמחקו: 15");
    expect(digest.plain).not.toContain("ריטנשן:\n  לא זמין");
  });
});
