# Audit — persona data: DB-authoritative + cross-user-safe (localStorage hygiene)

**Date:** 2026-06-10
**Branch:** `claude/data-cleanup`
**Scope:** Make the persona **DB-authoritative for logged-in users** and remove
stale-demo / cross-user localStorage hazards. Keep localStorage as a **fast
cache by design** — this is the *scoped, safe* slice, not the full DB-only
refactor (see the FLAG section).

---

## How persona data flows (before this change)

- `personas/dana-cohen.json` → `defaultPersona` (bundled demo persona).
- `src/lib/setup-storage.ts` — localStorage cache, key `countme_persona`
  (`savePersona` / `loadPersona`). Every reader page (`/dashboard`, `/alerts`,
  `/demo`, `/coach`, `/file*`, `/invoices*`, …, ~13 pages) reads this **synchronously**.
- `src/lib/data/persona-repository.ts` — Supabase access to `profiles.persona`
  (`fetchPersona` / `upsertPersona`, both no-throw, no-op when signed out).
- `src/lib/data/persona-store.ts` — the seam: `persistPersona()` writes
  cache + DB; `syncPersonaFromDb()` reconciles on mount.
- `src/components/persona-hydrator.tsx` — mounted in `app/layout.tsx`; calls
  `syncPersonaFromDb()` once per load.
- Anonymous/demo mode uses the localStorage cache only (no user, no DB).

**Design intent:** for a logged-in user, `profiles.persona` in Supabase is the
source of truth; localStorage is a fast first paint that is reconciled to the DB.

---

## Hazards found

1. **No cache clear on sign-out (cross-user data leak).** `signOut`
   (`src/app/auth/actions.ts`) cleared the Supabase session but left
   `countme_persona` (and the CRM follow-up notes) in localStorage. The next
   user on the same browser would see the previous user's persona until/unless a
   DB reconcile overwrote it.

2. **Stale local cache could be pushed into another user's empty DB row.** Old
   `syncPersonaFromDb()`: if the logged-in user had **no** DB persona yet (fresh
   signup), it pushed whatever was in localStorage **up to the DB**
   (`upsertPersona(local)`). Combined with hazard #1, user A's leftover cache
   could be written into user B's `profiles.persona` — a genuine cross-user
   contamination, not just a display glitch.

3. **`defaultPersona` is an un-gated footgun (latent, not currently triggered).**
   `defaultPersona` (dana-cohen) is exported from `src/lib/persona.ts` but, as of
   this change, is **not imported anywhere in `src/` at runtime** — `/demo` reads
   the cache and redirects to `/setup` when empty; it does not auto-seed the demo
   persona. So no real logged-in user sees demo data today. The risk is that a
   future "fallback to `defaultPersona`" one-liner would silently seed the
   signup → /setup → DB flow with fake data.

---

## What changed

### 1. Clear the cache on sign-out — `src/lib/setup-storage.ts`, `src/lib/crm/notes.ts`, `src/components/auth/sign-out-button.tsx`
- Added `clearLocalPersona()` to `setup-storage.ts` (removes `countme_persona`
  **and** the new owner stamp).
- Added `clearFollowUpNotes()` to `crm/notes.ts` (removes
  `countme:followup-notes` — these notes are **not** user-scoped and would
  otherwise leak between accounts on a shared browser).
- `SignOutButton` now calls both **client-side, before** invoking the `signOut`
  server action, so the cache is gone before the session ends. `SignOutButton`
  is the single sign-out chokepoint in `src/` (the only caller of the `signOut`
  action and the only `auth.signOut()` in the app).

### 2. DB wins for logged-in users; stale cache can't override or seed — `src/lib/data/persona-store.ts` (+ owner helpers in `setup-storage.ts`)
Reworked `syncPersonaFromDb()` to be **identity-aware**:
- Resolve the current user id first (`getCurrentUserId`).
- **Signed out:** return the local cache untouched (anonymous/demo unchanged).
- **DB has a persona:** overwrite the cache with it and stamp the cache owner =
  current uid → **DB always wins** for logged-in users.
- **Logged in, DB empty, cache stamped to a *different* user:** treat the cache
  as stale → `clearLocalPersona()` and return `null` (start clean; never show or
  upload another user's data).
- **Logged in, DB empty, cache is this user's own or anonymous/unclaimed:** adopt
  it and seed the DB — this preserves the legitimate **anonymous → signup →
  /setup → DB** hand-off.

Owner tracking is a small `countme_persona_owner` localStorage key
(`getPersonaOwner` / `setPersonaOwner`), stamped on every reconcile. It is a
defence-in-depth backstop that also covers **non-button** sign-outs (cookie
expiry, a second account logging in directly without using our button).

`usePersona` (the instant-cache-paint hook) still paints the local copy first,
then reconciles — that window is unchanged and brief, and now always resolves to
the DB value for logged-in users.

### 3. Gate the demo default (documentation guard) — `src/lib/persona.ts`
Strengthened the `defaultPersona` doc-comment to state the contract explicitly:
**anonymous / open-demo ONLY; never auto-load for an authenticated user; if you
need a demo seed, gate it behind an explicit "no authenticated user" check,
never an unconditional fallback.** No runtime change — nothing imports it today,
and `/demo` is allowed to keep using the demo persona for the open demo.

---

## What I deliberately KEPT (by design)

- **localStorage as the persona cache.** Every reader page stays **synchronous**
  via `loadPersona()`. This is the intended architecture (fast first paint) and
  is required for the **anonymous/demo mode**, which has no user and no DB.
- **The local → DB push on first login** for a user whose DB row is empty — now
  gated by the owner stamp so it only fires for the user's own / anonymous cache
  (the signup hand-off), never for a previous user's leftover cache.
- **`defaultPersona` export** — kept (the documented persona-swap mechanism and
  the open `/demo`), only annotated.
- **`crm-snapshot/`** sub-app — out of scope, untouched.

---

## FLAG — deferred bigger refactor (do NOT do now)

**Proposal:** make the persona **DB-only** for logged-in users — drop the
localStorage cache as a source and have every reader **`await` the DB**
(`fetchPersona`) instead of calling the sync `loadPersona()`.

**Why it's tempting:** a single source of truth removes the cache entirely, so
no reconcile, no owner stamp, no stale-cache class of bug at all.

**Why it's deferred (cost + risk):**
1. **Breaks the anonymous/demo mode.** `/demo` and the open demo have **no user
   and no DB row** — they rely on the local cache. A DB-only model needs a
   separate, explicit anonymous path (e.g. keep cache only when signed out),
   which is a parallel code path to design and test.
2. **~13 reader pages must be rewired sync → async.** `loadPersona()` is called
   synchronously in `/dashboard`, `/dashboard/pl-report`, `/alerts`, `/demo`,
   `/coach`, `/deadlines`, `/business-expenses`, `/file`, `/file/guided`,
   `/file/companion`, `/invoices`, `/invoices/new`, `/invoices/[invoiceNumber]`
   (+ `setup`). Each needs loading/empty/error states and an `await` — a large,
   regression-prone change with no user-visible benefit once gating is on.
3. **Latency / UX regression.** Losing the instant cache paint means every page
   waits on a network round-trip before showing data.

**Recommendation:** keep the **cache + DB-wins + owner-stamp + sign-out clear**
model (this PR). Revisit DB-only **only after** the gating here has been live and
proven, and **only** with a deliberate, separately-designed anonymous-demo path —
not as a drive-by. Until then, the cache is safe: DB always wins for logged-in
users, and a stale cache is dropped rather than shown or uploaded.

---

## Verification

- `npx tsc --noEmit` — clean.
- `npm run build` (`next build --webpack`) — clean (25 routes).

## Files touched
- `src/lib/setup-storage.ts` — `clearLocalPersona()`, owner stamp helpers.
- `src/lib/crm/notes.ts` — `clearFollowUpNotes()`.
- `src/components/auth/sign-out-button.tsx` — clear cache + notes before sign-out.
- `src/lib/data/persona-store.ts` — identity-aware `syncPersonaFromDb()`.
- `src/lib/persona.ts` — `defaultPersona` scope/gating doc-comment.
- `docs/audit/data-localstorage-cleanup.md` — this doc.
