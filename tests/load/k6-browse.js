// tests/load/k6-browse.js
//
// Scenario 1 (v2 plan 5.2): anonymous browsing load on public pages.
// Simulates 50 concurrent visitors hitting the pages that need no persona
// and no auth: landing, login, and the coach entry point.
//
// NOTE on /coach: it is an auth-gated route (src/lib/supabase/proxy.ts
// PROTECTED_PREFIXES) — when AUTH_GATING_ENABLED resolves to true on the
// target (the production-build default per src/lib/security/auth-gating.ts
// unless explicitly overridden), an anonymous GET redirects to /login. That
// redirect is itself a legitimate page-load path a real anonymous visitor
// takes, so we follow it and treat any final status < 400 as a pass — we are
// not asserting /coach's content here, only that the app responds promptly
// and without errors under load.
//
// Run:
//   k6 run -e BASE_URL=https://<preview>.vercel.app tests/load/k6-browse.js
//
// See tests/load/README.md for install instructions, how to get a Preview
// URL, and — important — why this must NEVER target production.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// Optional: Vercel Deployment Protection bypass token (Project Settings →
// Deployment Protection → "Protection Bypass for Automation"). Without it,
// every request against a protected Preview gets Vercel's SSO interstitial
// instead of the app, and this whole scenario measures the wrong thing.
const BYPASS_TOKEN = __ENV.VERCEL_BYPASS_TOKEN || "";

function reqHeaders(extra) {
  const h = Object.assign({}, extra);
  if (BYPASS_TOKEN) h["x-vercel-protection-bypass"] = BYPASS_TOKEN;
  return h;
}

const errorRate = new Rate("errors");

export const options = {
  // 50 VUs / 2min ramp, as specced. Ramp gradually rather than slamming to
  // 50 instantly — closer to how real traffic builds, and it makes a
  // threshold breach easier to localize to a VU level in the k6 output.
  stages: [
    { duration: "30s", target: 25 },
    { duration: "30s", target: 50 },
    { duration: "40s", target: 50 },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    // The stated targets (v2 plan 5.2):
    http_req_duration: ["p(95)<1500"],
    errors: ["rate<0.01"],
  },
};

const PAGES = ["/", "/login", "/coach"];

export default function () {
  const path = PAGES[Math.floor(Math.random() * PAGES.length)];

  const res = http.get(`${BASE_URL}${path}`, {
    headers: reqHeaders({}),
    redirects: 5, // follow the /coach -> /login gating redirect, see header note
    tags: { page: path },
  });

  const ok = check(res, {
    "status < 400": (r) => r.status > 0 && r.status < 400,
  });
  errorRate.add(!ok);

  // Think time between page loads — a real visitor reads before clicking.
  sleep(1 + Math.random() * 2);
}
