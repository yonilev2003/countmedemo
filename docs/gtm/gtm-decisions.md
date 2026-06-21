---
title: GTM decisions log
type: gtm-note
updated: 2026-06-17
status: living
---

# GTM decisions log

> Dated GTM calls + why. Mark each **revisable** or **locked**. This is where
> "GTM changed" gets recorded so future sessions know the current direction.

| Date | Decision | Why | Status |
|---|---|---|---|
| 2026-06-17 | Beta is **free**; payments built but gated off (`BILLING_ENABLED`). | Learn willingness-to-pay before pricing; don't deter the 50 friends. | revisable |
| 2026-06-17 | Payment integration = **Tranzila**, ready-to-connect but **not live**. | Israeli PSP that issues חשבונית מס; user's call. Connect post-beta. | revisable |
| 2026-06-17 | Track model supports **multiple paid tracks, each with its own integration**. | Future-proof: different מסלולים may bill via different connections. | locked (architecture) |
| 2026-06-17 | GTM treated as a **living Obsidian vault**; `readiness.md` is a snapshot to evolve. | User wants far-reaching GTM changes co-built over time. | locked (process) |

## Open questions (move to a row above when answered)

- Final ICP narrowing for the first 50?
- Pricing number(s) + track count?
- Is 1219 (הצהרת הון) a wedge for a different segment?
