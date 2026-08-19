#!/usr/bin/env node
// tests/load/smoke.mjs
//
// Zero-dependency smoke check (no k6 required) — a 15-second mini version
// of the wizard scenario (k6-wizard.js) and the AI cost-attack scenario
// (k6-ai-cost-attack.js), so a sanity check can run in CI/dev containers
// where installing k6 isn't practical. Uses only Node's built-in fetch —
// per repo convention, this owner adds no npm dependency.
//
// Usage:
//   node tests/load/smoke.mjs
//   BASE_URL=https://<preview>.vercel.app node tests/load/smoke.mjs
//   VERCEL_BYPASS_TOKEN=xxx BASE_URL=https://<preview>.vercel.app node tests/load/smoke.mjs
//
// Exit code 1 on failure (either scenario missing its bar) — CI-safe.
// See tests/load/README.md — never target production or real Supabase data.

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const BYPASS_TOKEN = process.env.VERCEL_BYPASS_TOKEN || "";
const DURATION_MS = 15_000;
const CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 10_000;

function reqHeaders(extra) {
  const h = Object.assign({}, extra);
  if (BYPASS_TOKEN) h["x-vercel-protection-bypass"] = BYPASS_TOKEN;
  return h;
}

// Same maximal-but-valid attack payload as k6-ai-cost-attack.js — see that
// file's comment for why it's shaped this way (right at validateBody()'s
// caps, not over them, so we measure auth+rate-limit, not input validation).
const MESSAGE = "א".repeat(2000);
const HISTORY = Array.from({ length: 12 }, (_, i) => ({
  role: i % 2 === 0 ? "user" : "assistant",
  content: "ב".repeat(2000),
}));
const PERSONA_STUB = {
  personal: {}, income: {}, business: {}, deductionsAndCredits: {}, vatAndTurnover: {},
};
const ATTACK_BODY = JSON.stringify({ message: MESSAGE, history: HISTORY, persona: PERSONA_STUB });

const wizard = { count: 0, errors: 0, durations: [] };
const attack = { count: 0, blocked: 0, serverErrors: 0, durations: [] };

async function timedFetch(url, opts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, Object.assign({}, opts, { signal: controller.signal }));
    return { status: res.status, ms: Date.now() - start };
  } catch {
    return { status: 0, ms: Date.now() - start }; // 0 = network error or timeout
  } finally {
    clearTimeout(timer);
  }
}

async function wizardWorker(endAt) {
  while (Date.now() < endAt) {
    const r1 = await timedFetch(`${BASE_URL}/setup`, { headers: reqHeaders({}) });
    wizard.count++; wizard.durations.push(r1.ms);
    if (r1.status === 0 || r1.status >= 400) wizard.errors++;

    const r2 = await timedFetch(`${BASE_URL}/api/track`, {
      method: "POST",
      headers: reqHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name: "setup_started", props: {}, path: "/setup" }),
    });
    wizard.count++; wizard.durations.push(r2.ms);
    if (r2.status === 0 || r2.status >= 400) wizard.errors++;
  }
}

async function attackWorker(endAt) {
  while (Date.now() < endAt) {
    const r = await timedFetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: reqHeaders({ "Content-Type": "application/json" }),
      body: ATTACK_BODY,
    });
    attack.count++; attack.durations.push(r.ms);
    if (r.status === 401 || r.status === 429) attack.blocked++;
    if (r.status >= 500) attack.serverErrors++;
  }
}

function p95(arr) {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[idx];
}

function row(pass, label, detail) {
  return `${pass ? "PASS" : "FAIL"}  ${label.padEnd(34)} ${detail}`;
}

async function main() {
  console.log(`smoke.mjs -> ${BASE_URL}  (${DURATION_MS / 1000}s, concurrency ${CONCURRENCY})\n`);

  const endAt = Date.now() + DURATION_MS;
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(i % 2 === 0 ? wizardWorker(endAt) : attackWorker(endAt));
  }
  await Promise.all(workers);

  const wizardP95 = p95(wizard.durations);
  const wizardErrRate = wizard.count ? wizard.errors / wizard.count : 1;
  const wizardPass = wizard.count > 0 && wizardP95 < 2000 && wizardErrRate < 0.05;

  const attackBlockedRate = attack.count ? attack.blocked / attack.count : 0;
  const attackPass = attack.count > 0 && attackBlockedRate >= 0.95 && attack.serverErrors === 0;

  console.log("results");
  console.log("------------------------------------------------------------------");
  console.log(row(wizardPass, "wizard (GET /setup + /api/track)",
    `${wizard.count} req, p95=${wizardP95}ms, errors=${(wizardErrRate * 100).toFixed(1)}%`));
  console.log(row(attackPass, "ai-cost-attack (/api/chat, no auth)",
    `${attack.count} req, blocked(401/429)=${(attackBlockedRate * 100).toFixed(1)}%, 5xx=${attack.serverErrors}`));
  console.log("------------------------------------------------------------------\n");

  if (!wizardPass || !attackPass) {
    console.error("smoke FAILED — see tests/load/README.md for interpretation.");
    process.exitCode = 1;
    return;
  }
  console.log("smoke OK.");
}

main().catch((err) => {
  console.error("smoke.mjs crashed:", err);
  process.exitCode = 1;
});
