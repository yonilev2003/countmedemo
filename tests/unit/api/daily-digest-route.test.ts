/**
 * GET /api/cron/daily-digest — route-level test (audit gap, 2026-08-19: no
 * test file existed for this route at all).
 *
 * Mocks @/lib/alerts/digest and @/lib/alerts/email directly — the digest's
 * own logic is covered separately in tests/unit/alerts/digest.test.ts — so
 * this file exercises only what's specific to the route itself:
 *
 *   1. The CRON_SECRET authorization gate. This is the ONLY thing stopping
 *      the endpoint from being triggered by an arbitrary caller (Vercel Cron
 *      is the sole legitimate caller per the route's own header comment) —
 *      a regression here means anyone who finds the URL can trigger extra
 *      digest emails and extra retention-purge runs on demand.
 *   2. That retention runs BEFORE the digest is built, and that the
 *      retention result is actually threaded INTO buildDailyDigest() (the
 *      whole point of "include in digest" per the route's own comment).
 *   3. The JSON response shape, including that a sendAlertEmail() failure
 *      still returns a 200 summary (sent:false) instead of a 500.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockBuildDailyDigest = vi.fn();
const mockPurgeOldEvents = vi.fn();
const mockSendAlertEmail = vi.fn();

vi.mock("@/lib/alerts/digest", () => ({
  buildDailyDigest: (...args: unknown[]) => mockBuildDailyDigest(...args),
  purgeOldEvents: (...args: unknown[]) => mockPurgeOldEvents(...args),
}));

vi.mock("@/lib/alerts/email", () => ({
  sendAlertEmail: (...args: unknown[]) => mockSendAlertEmail(...args),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/daily-digest/route";

function req(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/cron/daily-digest", { headers });
}

describe("GET /api/cron/daily-digest — authorization gate", () => {
  beforeEach(() => {
    mockBuildDailyDigest.mockReset().mockResolvedValue({ html: "<p>x</p>", plain: "x" });
    mockPurgeOldEvents.mockReset().mockResolvedValue({ ok: true, deleted: 0 });
    mockSendAlertEmail.mockReset().mockResolvedValue(undefined);
    delete process.env.CRON_SECRET;
  });

  it("refuses (401) rather than running open when CRON_SECRET isn't configured at all", async () => {
    delete process.env.CRON_SECRET;

    const res = await GET(req({ authorization: "Bearer anything" }));

    expect(res.status).toBe(401);
    expect(mockPurgeOldEvents).not.toHaveBeenCalled();
    expect(mockBuildDailyDigest).not.toHaveBeenCalled();
    expect(mockSendAlertEmail).not.toHaveBeenCalled();
  });

  it("rejects a request with no Authorization header", async () => {
    process.env.CRON_SECRET = "s3cr3t";

    const res = await GET(req());

    expect(res.status).toBe(401);
    expect(mockPurgeOldEvents).not.toHaveBeenCalled();
  });

  it("rejects a wrong bearer token — an arbitrary caller must not be able to trigger (and duplicate) a digest send", async () => {
    process.env.CRON_SECRET = "s3cr3t";

    const res = await GET(req({ authorization: "Bearer wrong" }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "unauthorized" });
    expect(mockPurgeOldEvents).not.toHaveBeenCalled();
    expect(mockBuildDailyDigest).not.toHaveBeenCalled();
    expect(mockSendAlertEmail).not.toHaveBeenCalled();
  });

  it("accepts exactly the `Bearer ${CRON_SECRET}` header Vercel Cron sends", async () => {
    process.env.CRON_SECRET = "s3cr3t";

    const res = await GET(req({ authorization: "Bearer s3cr3t" }));

    expect(res.status).toBe(200);
  });
});

describe("GET /api/cron/daily-digest — wiring + response shape (authorized)", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "s3cr3t";
    mockBuildDailyDigest.mockReset().mockResolvedValue({ html: "<p>digest</p>", plain: "digest" });
    mockPurgeOldEvents.mockReset().mockResolvedValue({ ok: true, deleted: 12 });
    mockSendAlertEmail.mockReset().mockResolvedValue(undefined);
  });

  function authedReq() {
    return req({ authorization: "Bearer s3cr3t" });
  }

  it("runs retention BEFORE building the digest, and threads the retention result into buildDailyDigest", async () => {
    const res = await GET(authedReq());

    expect(res.status).toBe(200);
    expect(mockPurgeOldEvents).toHaveBeenCalledTimes(1);
    expect(mockBuildDailyDigest).toHaveBeenCalledTimes(1);
    expect(mockBuildDailyDigest).toHaveBeenCalledWith({
      retention: { ok: true, deleted: 12 },
    });

    const purgeOrder = mockPurgeOldEvents.mock.invocationCallOrder[0];
    const digestOrder = mockBuildDailyDigest.mock.invocationCallOrder[0];
    expect(purgeOrder).toBeLessThan(digestOrder);
  });

  it("emails the built digest.html and returns { ok, sent, deleted }", async () => {
    const res = await GET(authedReq());

    const body = await res.json();
    expect(body).toEqual({ ok: true, sent: true, deleted: 12 });

    expect(mockSendAlertEmail).toHaveBeenCalledTimes(1);
    const call = mockSendAlertEmail.mock.calls[0][0];
    expect(call.html).toBe("<p>digest</p>");
    expect(call.subject).toContain("דייג'סט יומי");
  });

  it("still returns a 200 JSON summary (sent:false) instead of a 500 when sendAlertEmail unexpectedly throws", async () => {
    mockSendAlertEmail.mockRejectedValueOnce(new Error("resend down"));

    const res = await GET(authedReq());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, sent: false, deleted: 12 });
  });

  it("mirrors retention.deleted verbatim into the response even when it's 0", async () => {
    mockPurgeOldEvents.mockResolvedValueOnce({ ok: false, deleted: 0, errorMessage: "boom" });

    const res = await GET(authedReq());

    const body = await res.json();
    expect(body.deleted).toBe(0);
    expect(mockBuildDailyDigest).toHaveBeenCalledWith({
      retention: { ok: false, deleted: 0, errorMessage: "boom" },
    });
  });
});
