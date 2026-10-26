// Contract tests for the landing page's serverless functions
// (landing-site/api/*.js — plain CommonJS, deployed as a separate Vercel
// project). fetch is stubbed: no Supabase / Resend calls are made.

import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const waitlist = require("../../landing-site/api/waitlist.js");
const unsubscribe = require("../../landing-site/api/unsubscribe.js");
const lib = require("../../landing-site/api/_lib.js");

type Json = Record<string, unknown>;

function fakeRes() {
  const res = {
    statusCode: 0,
    body: "",
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) {
      res.headers[k.toLowerCase()] = v;
    },
    end(b: string) {
      res.body = b;
    },
    json(): Json {
      return JSON.parse(res.body);
    },
  };
  return res;
}

let ipCounter = 0;
function postReq(body: Json, headers: Record<string, string> = {}) {
  return { method: "POST", body, headers: { "x-forwarded-for": `10.0.0.${++ipCounter}`, ...headers } };
}

const ENV = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-test-key",
  RESEND_API_KEY: "re_test",
};

const good = { email: "  Dana@Example.COM ", phone: "050-123-4567", consent: true };

let calls: { url: string; init: RequestInit }[] = [];
function stubFetch(handlers: Record<string, () => Response>) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      // handlers are listed most-specific first; the first substring match wins
      const key = Object.keys(handlers).find((k) => url.includes(k));
      if (!key) throw new Error(`unexpected fetch ${url}`);
      return handlers[key]();
    }),
  );
}
const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  for (const [k, v] of Object.entries(ENV)) process.env[k] = v;
  delete process.env.WAITLIST_EMAIL_FROM;
  delete process.env.WAITLIST_REPLY_TO;
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const k of Object.keys(ENV)) delete process.env[k];
});

describe("normalizers", () => {
  it("normalizes Israeli phones to E.164 and rejects the rest", () => {
    expect(lib.normalizePhone("050-123-4567")).toBe("+972501234567");
    expect(lib.normalizePhone("+972 50 123 4567")).toBe("+972501234567");
    expect(lib.normalizePhone("03-1234567")).toBe("+97231234567");
    expect(lib.normalizePhone("12345")).toBeNull();
    expect(lib.normalizePhone("")).toBeNull();
  });
  it("lower-cases and validates emails", () => {
    expect(lib.normalizeEmail("  A@B.co ")).toBe("a@b.co");
    expect(lib.validEmail("a@b.co")).toBe(true);
    expect(lib.validEmail("nope")).toBe(false);
  });
});

describe("POST /api/waitlist", () => {
  it("rejects non-POST", async () => {
    const res = fakeRes();
    await waitlist({ method: "GET", headers: {} }, res);
    expect(res.statusCode).toBe(405);
  });

  it.each([
    [{ ...good, email: "bad" }, "invalid_email"],
    [{ ...good, phone: "123" }, "invalid_phone"],
    [{ ...good, consent: false }, "consent_required"],
    [{ email: good.email, phone: good.phone }, "consent_required"],
  ])("400 on bad input %#", async (body, error) => {
    stubFetch({});
    const res = fakeRes();
    await waitlist(postReq(body), res);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe(error);
    expect(calls).toHaveLength(0);
  });

  it("honeypot: pretends success without touching anything", async () => {
    stubFetch({});
    const res = fakeRes();
    await waitlist(postReq({ ...good, website: "http://spam" }), res);
    expect(res.statusCode).toBe(200);
    expect(calls).toHaveLength(0);
  });

  it("500 (never a fake success) when Supabase is not configured", async () => {
    delete process.env.SUPABASE_URL;
    stubFetch({});
    const res = fakeRes();
    await waitlist(postReq(good), res);
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe("not_configured");
  });

  it("stores the normalized signup, then sends the email with a verifiable unsubscribe link", async () => {
    stubFetch({
      "rest/v1/waitlist_signups?id=eq.": () => new Response(null, { status: 204 }),
      "rest/v1/waitlist_signups": () => json(201, [{ id: "row-1" }]),
      "api.resend.com/emails": () => json(200, { id: "em_1" }),
    });
    const res = fakeRes();
    await waitlist(postReq(good, { "user-agent": "UA" }), res);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, emailSent: true });

    const insert = calls.find((c) => c.url.endsWith("/rest/v1/waitlist_signups"))!;
    expect(JSON.parse(insert.init.body as string)).toMatchObject({
      email: "dana@example.com",
      phone: "+972501234567",
      consent_text_version: lib.CONSENT_TEXT_VERSION,
      user_agent: "UA",
    });
    expect((insert.init.headers as Record<string, string>).Authorization).toBe("Bearer service-role-test-key");

    const mail = JSON.parse(calls.find((c) => c.url.includes("api.resend.com"))!.init.body as string);
    expect(mail.to).toEqual(["dana@example.com"]);
    expect(mail.from).toContain("onboarding@resend.dev"); // sandbox default until the domain is verified
    expect(mail.subject).toBe("שמרנו לך מקום ב-CountMe");
    expect(mail.html).not.toContain("{{ unsubscribe }}");
    const link = new URL(mail.headers["List-Unsubscribe"].slice(1, -1));
    expect(lib.verifyEmailToken(link.searchParams.get("e"), link.searchParams.get("t"))).toBe(true);
    expect(mail.html).toContain(link.searchParams.get("t"));

    const patch = calls.find((c) => c.url.includes("id=eq.row-1"))!;
    expect(JSON.parse(patch.init.body as string).confirmation_sent_at).toBeTruthy();
  });

  it("duplicate email: success, no second email", async () => {
    stubFetch({ "rest/v1/waitlist_signups": () => json(409, { code: "23505" }) });
    const res = fakeRes();
    await waitlist(postReq(good), res);
    expect(res.statusCode).toBe(200);
    expect(res.json().alreadyRegistered).toBe(true);
    expect(calls.some((c) => c.url.includes("api.resend.com"))).toBe(false);
  });

  it("email failure keeps the signup and records the error", async () => {
    stubFetch({
      "rest/v1/waitlist_signups?id=eq.": () => new Response(null, { status: 204 }),
      "rest/v1/waitlist_signups": () => json(201, [{ id: "row-2" }]),
      "api.resend.com/emails": () => json(403, { message: "domain not verified" }),
    });
    const res = fakeRes();
    await waitlist(postReq(good), res);
    expect(res.statusCode).toBe(200);
    expect(res.json().emailSent).toBe(false);
    const patch = JSON.parse(calls.find((c) => c.url.includes("id=eq.row-2"))!.init.body as string);
    expect(patch.confirmation_error).toContain("resend 403");
    expect(patch.confirmation_sent_at).toBeUndefined();
  });

  it("500 when the insert fails for a reason other than duplicate", async () => {
    stubFetch({ "rest/v1/waitlist_signups": () => json(404, { message: "relation does not exist" }) });
    const res = fakeRes();
    await waitlist(postReq(good), res);
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe("store_failed");
    expect(calls.some((c) => c.url.includes("api.resend.com"))).toBe(false);
  });

  it("uses WAITLIST_EMAIL_FROM and WAITLIST_REPLY_TO when set", async () => {
    process.env.WAITLIST_EMAIL_FROM = "CountMe <hello@countme.co.il>";
    process.env.WAITLIST_REPLY_TO = "info@countme.co.il";
    stubFetch({
      "rest/v1/waitlist_signups?id=eq.": () => new Response(null, { status: 204 }),
      "rest/v1/waitlist_signups": () => json(201, [{ id: "row-3" }]),
      "api.resend.com/emails": () => json(200, { id: "em_3" }),
    });
    await waitlist(postReq(good), fakeRes());
    const mail = JSON.parse(calls.find((c) => c.url.includes("api.resend.com"))!.init.body as string);
    expect(mail.from).toBe("CountMe <hello@countme.co.il>");
    expect(mail.reply_to).toBe("info@countme.co.il");
  });
});

describe("/api/unsubscribe", () => {
  const email = "dana@example.com";
  const query = () => ({ e: email, t: lib.signEmail(email) });

  it("rejects a tampered token", async () => {
    const res = fakeRes();
    await unsubscribe({ method: "POST", query: { e: email, t: "forged" } }, res);
    expect(res.statusCode).toBe(400);
  });

  it("GET only shows a confirmation page (scanner prefetch must not unsubscribe)", async () => {
    stubFetch({});
    const res = fakeRes();
    await unsubscribe({ method: "GET", query: query() }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("אישור הסרה");
    expect(calls).toHaveLength(0);
  });

  it("POST marks the row unsubscribed", async () => {
    stubFetch({ "rest/v1/waitlist_signups": () => new Response(null, { status: 204 }) });
    const res = fakeRes();
    await unsubscribe({ method: "POST", query: query() }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("הוסרת מהרשימה");
    expect(calls[0].url).toContain("email=eq.dana%40example.com");
    expect(JSON.parse(calls[0].init.body as string).unsubscribed_at).toBeTruthy();
  });
});
