// tests/load/k6-wizard.js
//
// Scenario 2 (v2 plan 5.2): 20 concurrent users completing the /setup
// wizard. /setup is a client-side SPA — as of 2026-08-28 it's also in
// PROTECTED_PREFIXES (src/lib/supabase/proxy.ts), so on a target where
// AUTH_GATING resolves to true an anonymous GET /setup redirects to /login
// instead of loading the wizard; this script's initial page-load check
// tolerates that redirect the same way k6-browse.js does for /coach (any
// status < 400 counts as a pass — we're measuring responsiveness under
// load, not asserting wizard content). Once redirected, the per-step
// /api/track replay below no longer reflects a real anonymous session — this
// scenario is most meaningful run with AUTH_GATING_ENABLED=false on the
// target, or reworked to authenticate first. What IS a real server
// round-trip per step is
// the analytics event the real UI fires (src/app/api/track/route.ts,
// ALLOWED set) — so this scenario is: one GET /setup page load (static
// assets are implicit — Next.js serves them off _next/static, which this
// script deliberately does not replay, matching the task's "static assets
// implicit" scope) followed by the same /api/track calls the 7-stage wizard
// fires as a user moves through it (step 0 optional upload is skipped here,
// matching the common "returning-ish" path through steps 1-6 — see
// tests/e2e/five-osakim-journey.spec.ts for the full field-level flow this
// approximates at the HTTP-traffic level).
//
// Run:
//   k6 run -e BASE_URL=https://<preview>.vercel.app tests/load/k6-wizard.js
//
// See tests/load/README.md — never target production or real Supabase data.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const BYPASS_TOKEN = __ENV.VERCEL_BYPASS_TOKEN || "";

function reqHeaders(extra) {
  const h = Object.assign({}, extra);
  if (BYPASS_TOKEN) h["x-vercel-protection-bypass"] = BYPASS_TOKEN;
  return h;
}

const errorRate = new Rate("errors");
const pageLoad = new Trend("page_load_duration", true);
const trackCall = new Trend("track_call_duration", true);

export const options = {
  stages: [
    { duration: "20s", target: 20 },
    { duration: "1m20s", target: 20 },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    // The stated target (v2 plan 5.2):
    http_req_duration: ["p(95)<2000"],
    // Not part of the stated target, but a wizard that's "fast" only
    // because it's erroring out early shouldn't read as a pass.
    errors: ["rate<0.05"],
  },
};

// Data-entry steps 1-6 (screen 0, the optional document upload, is skipped —
// this scenario exercises the always-present manual-entry path).
const STEPS = 6;

function trackEvent(name) {
  const res = http.post(
    `${BASE_URL}/api/track`,
    JSON.stringify({ name, props: {}, path: "/setup" }),
    { headers: reqHeaders({ "Content-Type": "application/json" }), tags: { name } },
  );
  trackCall.add(res.timings.duration);
  const ok = check(res, { [`${name}: status < 400`]: (r) => r.status < 400 });
  errorRate.add(!ok);
  return res;
}

export default function () {
  // 1. Page load.
  const page = http.get(`${BASE_URL}/setup`, { headers: reqHeaders({}), tags: { name: "get_setup" } });
  pageLoad.add(page.timings.duration);
  const pageOk = check(page, { "GET /setup: status < 400": (r) => r.status < 400 });
  errorRate.add(!pageOk);
  sleep(0.5);

  // 2. setup_started fires once, on mount.
  trackEvent("setup_started");
  sleep(0.3 + Math.random() * 0.5);

  // 3. setup_step_completed once per data-entry step, with pacing between
  //    steps to approximate real form-filling time (kept short — this is a
  //    load test, not a UX timing study).
  for (let step = 1; step <= STEPS; step++) {
    trackEvent("setup_step_completed");
    sleep(0.3 + Math.random() * 0.7);
  }

  // 4. setup_completed on final submit ("הציגי את הדוח שלי").
  trackEvent("setup_completed");

  // Idle before the next simulated visitor starts a new wizard run.
  sleep(1 + Math.random() * 2);
}
