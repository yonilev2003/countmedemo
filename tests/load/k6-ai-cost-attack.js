// tests/load/k6-ai-cost-attack.js
//
// Scenario 3 (v2 plan 5.2) — THE IMPORTANT ONE.
//
// This is not a performance test. It is a security assertion: simulates an
// unauthenticated attacker hammering /api/chat with maximal-cost crafted
// histories, trying to burn Anthropic spend. The route
// (src/app/api/chat/route.ts) is supposed to reject almost all of this
// before a single token reaches Anthropic, via (in order):
//   1. in-memory per-IP rate limit (checkRateLimit, 12/min)
//   2. auth gating (requireUserIfGated -> 401 when AUTH_GATING_ENABLED
//      resolves true, which is the production-build DEFAULT per
//      src/lib/security/auth-gating.ts unless explicitly set to "false")
//   3. durable cross-instance per-minute limit (checkRateLimitDurable, 12/min)
//   4. durable per-user/IP DAILY cap (dailyUserCap, default 30/day)
//   5. global spend budget pause (getBudgetState() === "paused" -> 503)
//
// This script ASSERTS the combination holds: >=95% of requests rejected
// with 401 or 429, and ZERO 5xx. If a run shows 200s dominating, the guards
// have regressed — treat that as a P0, not a perf finding. k6 thresholds
// make the run itself fail (non-zero exit code) so this is CI/pipeline-safe.
//
// A NOTE ON 5xx: getBudgetState()==="paused" returns 503, and a preview with
// no ANTHROPIC_API_KEY configured also returns 503 (src/app/api/chat/
// route.ts, top of POST). Both are real 5xx per this script's strict
// "zero 5xx" bar even though neither one is an attacker "win" (no tokens
// were spent either way) — see tests/load/README.md's interpretation
// section before treating a 503-caused failure here as the same class of
// bug as an actual unguarded 200.
//
// Run:
//   k6 run -e BASE_URL=https://<preview>.vercel.app tests/load/k6-ai-cost-attack.js
//
// NEVER run this against production, or against a Preview that spends a
// real Anthropic budget you care about — see tests/load/README.md.

import http from "k6/http";
import { check } from "k6";
import { Counter, Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const BYPASS_TOKEN = __ENV.VERCEL_BYPASS_TOKEN || "";

function reqHeaders(extra) {
  const h = Object.assign({}, extra);
  if (BYPASS_TOKEN) h["x-vercel-protection-bypass"] = BYPASS_TOKEN;
  return h;
}

const blocked = new Rate("blocked_401_429");
const serverErrors = new Counter("server_errors_5xx");
const unexpected200 = new Counter("unexpected_200_no_auth");

export const options = {
  vus: 30,
  duration: "1m",
  thresholds: {
    // The core assertion. If this fails, the run fails loudly (non-zero
    // exit) — that's the point of this script.
    blocked_401_429: ["rate>=0.95"],
    server_errors_5xx: ["count==0"],
  },
};

// Maximal-cost-but-VALID payload: sized right at the caps validateBody()
// enforces in src/app/api/chat/route.ts (MAX_MESSAGE_CHARS=2000,
// MAX_HISTORY_ITEMS=12, MAX_HISTORY_ITEM_CHARS=2000) — deliberately NOT
// over them. Going over would get a cheap 400 from input validation, which
// would inflate the "blocked" number for the wrong reason: we want to
// measure the auth+rate-limit defenses against a well-formed, maximally
// expensive request, i.e. the realistic worst case, not a malformed one
// that never had a chance of costing anything.
const MESSAGE = "א".repeat(2000);
const HISTORY = [];
for (let i = 0; i < 12; i++) {
  HISTORY.push({
    role: i % 2 === 0 ? "user" : "assistant",
    content: "ב".repeat(2000),
  });
}
// validateBody() only checks that these five keys are present and are
// objects — it does not validate their contents — so an empty-object stub
// is a legitimate, minimal way to pass the shape check.
const PERSONA_STUB = {
  personal: {},
  income: {},
  business: {},
  deductionsAndCredits: {},
  vatAndTurnover: {},
};

const ATTACK_BODY = JSON.stringify({
  message: MESSAGE,
  history: HISTORY,
  persona: PERSONA_STUB,
});

export default function () {
  const res = http.post(`${BASE_URL}/api/chat`, ATTACK_BODY, {
    // Deliberately NO auth cookie/header — that is the attack.
    headers: reqHeaders({ "Content-Type": "application/json" }),
    timeout: "30s",
    tags: { name: "chat_attack" },
  });

  const isBlocked = res.status === 401 || res.status === 429;
  const is5xx = res.status >= 500;

  blocked.add(isBlocked);
  if (is5xx) serverErrors.add(1);
  if (res.status === 200) unexpected200.add(1);

  check(res, {
    "rejected with 401 or 429": () => isBlocked,
    "never 5xx": () => !is5xx,
  });

  // No sleep: this IS the attack — max throughput per VU, no think time.
}
