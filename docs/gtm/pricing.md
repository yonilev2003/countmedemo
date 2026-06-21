---
title: Pricing & tracks
type: gtm-note
updated: 2026-06-17
status: hypothesis
---

# Pricing & tracks (מסלולים)

> **Hypothesis — revisable.** Beta is **free** (payments built but gated off via
> `BILLING_ENABLED`). We use the beta to learn willingness-to-pay, then set numbers.

## Current track model (in code)

Source of truth: `src/lib/billing/tracks.ts` (+ `plans` table, `src/lib/billing/provider.ts`).
Each paid track declares **which payment integration backs it** — built so different
tracks can use different connections, cleanly.

| Track | Price (hypothesis) | Integration | Unlocks |
|---|---|---|---|
| `free` | ₪0 | — (none) | מועדים, התראות, מעקב תקרה, צ׳אט בסיסי |
| `pro` | ~₪39/mo incl. VAT | **Tranzila** (ready-to-connect, not live) | 1301 ממולא, 1219, מאתר ניכויים, איתן ללא הגבלה, רב-שנתי, ייצוא לרו״ח |

## Open questions

- Final price point(s)? (van Westendorp / "what would you pay" in beta interviews.)
- One paid track or several (e.g. a higher track for power users / a per-filing unlock)?
  The track model already supports adding more — each can route to a different integration.
- Annual option? Student/Momentum discount for the launch cohort?

## Principles (revisable)

- Keep a genuinely useful **free tier** (deadlines/alerts) as the retention + acquisition hook.
- Anchor against the **רו"ח cost**, not other software.
- Don't charge in the private/friends beta. See [[readiness]] §5.

Related: [[icp]] · [[gtm-decisions]]
