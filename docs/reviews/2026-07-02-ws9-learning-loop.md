# WS9 — Learning Loop: Pipeline Design

Date: 2026-07-02 · Status: DESIGN (no code shipped this run; builds only on infra that already exists)

The loop closes three feedback paths into the deterministic engine, with a human gate on every mutation:

```
 (1) usage snapshots          (2) user corrections            (3) regulator changes
 events table                 events table                    regulatory-watch (daily CI)
      │                            │                               │
      ▼                            ▼                               ▼
 weekly review               fixture converter               cross-ref + classify
 (drift/edge dashboards)     tests/unit/fixtures/*.json      patch proposal (```diff)
      │                            │                               │
      └────────────► golden-test suite (vitest) ◄──────────────────┘
                           │ human reviews + merges
                           ▼
              lib/calculators/types.ts (single source of truth)
```

## 1. Anonymized input→output logging

Reuse the existing `events` table + `/api/track` seam (server-stamped user id, allow-listed event names) — no new infra.

- New event `calc_snapshot`, emitted server-side whenever `estimateTaxLiability` runs for an authenticated user (throttle: one per user per day or on input change).
- **PII strip at the edge, whitelist-only**: `props` = `{ engineVersion (git sha), taxYear, osekType, isOsekZeir, revenueBucket, expenseBucket, creditPoints, taxAfterCredits, balanceSign }`. Buckets of 10K ₪, never raw figures; never name/TZ/bank; `user_id` stays the auth uuid already in the table.
- Purpose: population-level drift (e.g. "34% of zeir users hit the ceiling band") + regression radar after engine changes (same inputs bucket, different outputs distribution → investigate).

## 2. User-correction capture → golden tests

- UI affordance on `<InteractiveValue>` (the clickable calculated fields): "הערך לא נכון?" → tiny form: expected value + free-text why. Emits `user_correction` event: `{ fieldCode, calculatorId, ourValue, userValue, taxYear, note }` plus a **sanitized input echo** (the calculator's named inputs, bucketed as in §1; full precision requires explicit user consent checkbox).
- Weekly triage (founder or agent-assisted): classify correction as (a) user error → answer in-product, (b) data-entry gap → wizard fix, (c) RULE GAP → becomes a fixture.
- Fixture pipeline: `tests/unit/fixtures/corrections/<id>.json` (`{persona overrides, calculatorId, expected, source, status: "pending"|"confirmed"}`); a table-driven spec (`corrections.test.ts`) runs all `confirmed` fixtures through the engine. A correction is only confirmed with a citable source (skill reference / gov.il / רו"ח) — user say-so alone never changes the engine.
- This is the same makePersona/golden pattern shipped in WS4, so each fixture is ~10 lines.

## 3. Regulator changes → params file (shipped in WS5 this run)

- Daily CI: fetch 5 sources → cross-ref (≥2 sources or primary) → classify → **patch proposal as a ```diff in a GitHub issue** with provenance + "human must review" banner. `apply.ts` updates value + `TAX_CONSTANT_META.lastVerified`.
- Next step (needs explicit approval — new workflow permissions `contents:write` + `pull-requests:write`): open a branch + PR instead of an issue-attached diff. The PR must include a golden-test update in the same diff, so CI fails if the new value contradicts existing expectations — the test suite becomes the regulator-change gate.

## 4. Invariants (apply to all three paths)

- No silent mutation: every engine change lands as a reviewed commit with source + date (matches `memory/decisions.md` working principle).
- The golden suite is the contract: any params change must update tests in the same commit.
- PII never leaves the computation path: logging/corrections carry buckets or consented echoes, never TZ/name/bank.
- `FLAG(Roy)`/`TODO(Roy)` markers remain the honesty mechanism for unverified carries; the loop's job is to burn them down (this run: 2 resolved, 2 added — see session log).

## Session log — Mistake / Cause / Fix / Prevention (WS9 DoD)

| # | Mistake | Cause | Fix | Prevention |
|---|---|---|---|---|
| 1 | AskUserQuestion failed twice (stream error) | harness flake | retried with trimmed payload | keep option payloads short |
| 2 | Session brief's VERIFY-FIRST assumptions ×3 stale (LLM-driven engine; Supabase absent; WS5 greenfield) | brief written pre-beta-sprint | corrected via Phase-0 evidence before planning | treat `memory/STATUS.md` as fresher than CLAUDE.md; Phase-0 always |
| 3 | Committed skill reference carried a wrong miluim ladder (20/45/60) contradicting the law and the code | skill imported from catalog, never cross-verified | corrected against gov.il pa181225-1 + kolzchut (2026-07-02) | skills are input, not authority: cross-check any skill number against a primary source before relying on it |
| 4 | Engine carried two wrong statutory values: donations floor 200 (stale 2023) and life-insurance credit 5% (no such rate) | rates hardcoded inline, outside the year-constants provenance system | corrected (207 ₪; 25%) with 2-source citations + golden tests | WS4 centralization — every rate now lives in `types.ts` where the regulatory watcher and provenance metadata can see it |
| 5 | Mid-flight tsc failure reported by a parallel agent | I edited calculators while its typecheck ran | none needed (self-resolved) | give parallel agents disjoint file sets AND run the authoritative build once, after all agents land |
