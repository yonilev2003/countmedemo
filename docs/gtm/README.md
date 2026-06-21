---
title: countme GTM vault
type: index
updated: 2026-06-17
status: living
---

# countme — GTM vault 🧭

> **This is a living Obsidian vault.** Assume **far-reaching changes** — nothing
> here is locked. Every number, segment, price and channel is a **hypothesis to
> test**, revised together as we learn from the private beta → 50-friend beta.
> The deep brief ([[readiness]]) is the snapshot we're evolving away from, not a
> contract. When we change direction, update the note + log it in [[gtm-decisions]].

## Notes

- [[readiness]] — the full original GTM/PMF brief (deep, cited). Source we revise.
- [[icp]] — who we're for (segments, JTBD, pains). **Open to redefinition.**
- [[pricing]] — tracks/prices. Tied to the billing tracks in code (`src/lib/billing/tracks.ts`).
- [[channels]] — how we reach them (communities, creators, EY/Momentum, SEO…).
- [[pmf-signals]] — what we measure (activation → aha → retention → referral) + the `events` we emit.
- [[gtm-decisions]] — dated log of GTM calls + why (revisable vs locked).

## How this connects to the product

- **Tracks ↔ pricing:** the paid tracks (מסלולים) and which integration bills each
  live in `src/lib/billing/tracks.ts` + the `plans` table. Keep [[pricing]] in sync.
- **Measurement is wired:** `track()` (`src/lib/analytics/track.ts`) emits the
  [[pmf-signals]] events into `public.events`. The funnel is measurable, not aspirational.

## Working agreement

We co-edit these notes. When Yoni says "GTM changed", we: (1) edit the affected
note, (2) add a row to [[gtm-decisions]], (3) reflect any pricing/track change in
code. Conversational, fast, no ceremony.
