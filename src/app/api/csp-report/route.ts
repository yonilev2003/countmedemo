// POST /api/csp-report — collects Content-Security-Policy-Report-Only
// violation reports so they're actually visible to the team (Vercel logs),
// instead of only appearing in each individual visitor's own browser
// devtools console. Anonymous by design (a browser sends these without any
// app session) — rate-limited instead of auth-gated.
//
// Wired up to close the gap: next.config.ts's CSP has run report-only since
// 2026-07-02 with no report-uri/report-to and thus no actual monitoring —
// see the TODO comment there. Do not flip to enforced Content-Security-Policy
// until real violation reports have been reviewed here for a defined window.

import { NextResponse, type NextRequest } from "next/server";
import {
  checkRateLimit,
  rateLimitResponse,
  resolveClientKey,
} from "@/lib/security/rate-limit";

const RATE_LIMIT_MAX_REQUESTS = 30; // generous — a buggy page can fire many reports quickly

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(
    "csp-report",
    resolveClientKey(request),
    RATE_LIMIT_MAX_REQUESTS,
  );
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Legacy report-uri sends { "csp-report": {...} }; the newer Reporting API
  // sends an array of { type: "csp-violation", body: {...} }. Log either
  // shape verbatim — this is a diagnostics sink, not a parser.
  console.log("[csp-report]", JSON.stringify(body).slice(0, 4000));

  return NextResponse.json({ ok: true });
}
