# countme — Go-To-Market & Product-Market-Fit Readiness Brief

> **Owner:** GTM / founders · **Last updated:** 2026-06-10 · **Stage:** pre-pilot → pilot (3–5 users)
> **Scope:** Israeli self-employed (עצמאים), starting with under-35 freelancers. Product = an AI *companion* for tax Form 1301 + live obligations (מקדמות / advance payments, מע״מ / Doch Maam, ביטוח לאומי).
> **Positioning guardrail (non-negotiable):** countme states **facts, not tax advice**. Every claim below respects that line — see §2.

This brief is practical and Israeli-specific. Figures are dated and cited; tax/benefit amounts change yearly, so treat any number older than the current tax year as needing a re-check against the source. Pricing and channel ideas are explicitly marked as **hypotheses to test in the pilot**, not decisions.

---

## 0. Market context (why now)

- **The base is large and growing fast.** Osek patur registrations in Israel jumped **+45% from 2019, reaching ~422K by end-2023**; osek murshe grew only ~13% in the same window. The growth is concentrated in younger people leaving salaried jobs, driven by frustration with employers, the desire to be independent, and cost-of-living pressure. ([TheMarker, 2024-03](https://www.themarker.com/career/2024-03-21/ty-article-magazine/.premium/0000018e-5fd1-d411-a3df-dfdbfd220000))
- **It's also volatile.** ~65K businesses closed in 2024 vs. a ~40K/year historical average — young solo businesses are fragile, and "survive year one without a tax disaster" is a real, felt need. ([TheMarker](https://www.themarker.com/career/2024-03-21/ty-article-magazine/.premium/0000018e-5fd1-d411-a3df-dfdbfd220000))
- **Regulation is getting *more* complex right now**, which expands the pain countme addresses (see §1.3). 2024–2026 brought the עוסק זעיר micro-track, mandatory e-invoicing + allocation numbers (מספר הקצאה), and detailed VAT reporting (PCN 874). The rules are moving faster than a typical 28-year-old freelancer can track — that gap is the wedge.
- **Internal note (countme):** the product has already outgrown the original "demo" framing in `CLAUDE.md`. The repo now ships `/dashboard`, `/deadlines`, `/alerts`, `/file` (1301 fill), `/invoices`, `/business-expenses`, the **"איתן"** AI coach (`/coach`), Supabase auth + DB, and a 6-step `/setup` wizard. GTM should be planned against **this** product (a year-round ops companion), not just the EY 1301 demo.

---

## 1. ICP & Segmentation

### 1.1 Primary ICP — "the anxious solo earner, year 1–4"

**Who:** Israeli עצמאי/ת, **age ~24–35**, solo (no employees), **no permanent רו"ח on retainer** (or pays one only once a year at filing and dreads it). Digitally native, mobile-first, Hebrew, comfortable with chat/AI, uncomfortable with tax bureaucracy.

**Sub-segments by tax status** (the single most important segmentation axis — it changes obligations, deadlines, and the product surface that matters):

| Segment | Who | Turnover | Key obligations | What countme uniquely helps with |
|---|---|---|---|---|
| **עוסק פטור** (incl. **עוסק זעיר** track) | New/side/low-volume freelancers | ≤ **122,833 ₪** (2026, CPI-indexed; was 120,000 ₪ in 2024–25) | Annual VAT turnover declaration (Jan 31), 1301, ביטוח לאומי | Ceiling anxiety (am I about to cross?), zeir vs. patur trade-off, "do I even need to do anything this month?" |
| **עוסק מורשה** (small) | Established freelancers, consultants, devs | Above patur ceiling, typically < 500K ₪ | Bi-monthly מע״מ, מקדמות, ביטוח לאומי, 1301, e-invoice allocation numbers | The full deadline drumbeat + pre-filled 1301 + "which expenses are deductible" |
| **עוסק מורשה** (scaling) | Higher earners approaching 500K ₪ | ≥ 500K ₪ → monthly detailed VAT (874), Form 6111 | Same + PCN 874 detailed reporting, monthly switch | Future segment; more likely to already have a רו"ח. Lower priority for pilot. |

> **Sources for thresholds/obligations:** `israeli-freelancer-ops` skill (current 2026 figures); [Kol Zchut — עוסק פטור](https://www.kolzchut.org.il/he/עוסק_פטור); [Kol Zchut — עסק זעיר](https://www.kolzchut.org.il/he/עסק_זעיר). VAT standard rate is **18%** (2025–26). ([Deel, Israel sole-proprietorship guide](https://www.deel.com/blog/sole-proprietorship-israel/))

**Common occupations (where to find them):** UX/product designers (the current persona, דנה כהן, is exactly this), software developers & freelance engineers, content creators / marketers / social, photographers & videographers, therapists/coaches, freelance translators, and the "creator economy" (the repo already models creative/tech/consultant expense profiles in `lib/business-expenses/profiles.ts`). These cluster in identifiable online communities (§4).

### 1.2 Jobs-To-Be-Done (what they "hire" countme for)

1. **"Tell me what I owe and when, before it bites me."** Don't make me miss a מע״מ / מקדמה / ביטוח לאומי date and eat an automatic penalty.
2. **"Fill my annual 1301 without a רו"ח and without fear"** — the literal product promise on the landing page ("מלא/י דו״חות מס בלי רואה חשבון, בלי פחד").
3. **"Show me money I'm leaving on the table"** — deductible expenses I didn't know counted (Adobe/Figma subscriptions, depreciation on a MacBook, קרן השתלמות, ביטוח לאומי's 52%-deductible slice).
4. **"Keep me under the ceiling / tell me when to change status"** — patur→murshe or into/out of עוסק זעיר.
5. **"Make me legible to my future accountant"** — organize the year so the once-a-year handoff (חבילה לרו"ח) is painless.
6. **"Answer my dumb question right now"** — a non-judgmental chat (איתן) instead of googling Hebrew tax forums or bothering a friend.

### 1.3 Pains (ranked by how acute + how well countme can address them)

| Pain | Why it hurts | countme leverage |
|---|---|---|
| **Missed-deadline penalties** | Missing a VAT filing — *even a zero-revenue period* — triggers automatic fines; מקדמות underpayment creates a year-end debt shock. | **High** — `/deadlines` + `/alerts` are built; deadline data already encoded. |
| **1301 dread** | The annual report is the single scariest yearly event for the un-accountant'd freelancer; deadline May 31 (paper) / **June 30 (online, mandatory for most)** for TY2025. | **High** — pre-filled, explainable 1301 is the hero feature. |
| **"No רו"ח" gap** | Can't afford / doesn't want a monthly accountant, but feels unsafe doing it alone. | **High** — this is the core wedge; *complement* not *replace* (see §2). |
| **Cash-flow / מקדמות mismatch** | Advances are based on *projected* income, not actual; lumpy freelance income → debt or over-payment. | **Medium** — forecast card exists; deepen it. |
| **Ceiling anxiety (patur)** | Crossing 122,833 ₪ mid-year forces immediate murshe registration + VAT. | **Medium-High** — ceiling alert already built (`lib/alerts/ceiling.ts`). |
| **Regulatory churn** | Allocation numbers (>10K ₪ invoices now, **dropping to 5K ₪ on 2026-06-01**), 874 detailed VAT, zeir rules — all new and confusing. | **Medium** — content/SEO + in-app explainers; product can flag exposure. |

> **Deadline & penalty facts** from `israeli-freelancer-ops` skill and [Tax Authority — 2025 annual report service](https://www.gov.il/he/service/reporting-and-payment-2025-annual-tax-report-for-individuals). The skill explicitly warns that **April 30 is NOT the 1301 deadline** (the patur turnover declaration is Jan 31; 1301 is May 31 paper / June 30 online) — a common error countme must get right in copy.

### 1.4 Who is **out** of ICP (for now)

Companies (חברה בע״מ — they file 1214, not 1301; already excluded in the product), high-earners with an established רו"ח relationship, and anyone needing audited financials. Not "never" — just not the pilot's wedge.

---

## 2. Positioning & Messaging

### 2.1 The strategic frame: **"Kills the busywork, not the accountant"**

countme is **not** "fire your accountant." It is the layer that does the **continuous, mechanical, anxiety-inducing busywork** — tracking deadlines, pre-computing every field, surfacing deductions, explaining the numbers — so that the freelancer is calm and organized year-round, and **when** they need a רו"ח (or for the parts a רו"ח must own), they arrive prepared. This framing:

- **De-risks the EY/accounting-firm audience** (Momentum demo, partnerships): countme makes accountants' clients better-organized and is a top-of-funnel, not a competitor to billable advisory work.
- **De-risks compliance:** it lets us hold the "facts, not advice" line credibly — we automate *facts and arithmetic*, we don't *advise*.

### 2.2 The compliance-safe "facts, not advice" framing

Every surface must read as **"here is your number, here is exactly how it was computed, here is the source."** This is already the product's DNA: each calculated 1301 value is clickable → reveals formula + which invoices/expenses fed it (`InteractiveValue`, `lib/calculators/*`).

Messaging do / don't:

| ✅ Say (facts) | ❌ Avoid (advice / liability) |
|---|---|
| "לפי הנתונים שהזנת, שדה 150 = 200,700 ₪. כך חושב: …" | "כדאי לך לדווח X כדי לשלם פחות מס" |
| "המחזור שלך הגיע ל-104,400 ₪ — 85% מתקרת עוסק פטור (122,833 ₪)." | "אתה צריך לעבור לעוסק מורשה" (prescriptive) |
| "מועד הדיווח הדו-חודשי הקרוב: 15.7. הנה מה צריך להכין." | "מותר לך לדחות את הדיווח" |
| "הוצאה זו מסווגת לרוב כ'מוכרת חלקית 45%' לפי פקודת מס הכנסה." | "תרשום את הרכב כהוצאה מלאה" |
| "שאלה מורכבת? כדאי לאמת מול רואה/ת חשבון." (escalation prompt) | Answering an edge-case as if it's settled law |

**Concrete guardrails to instrument:**
- A persistent, visible disclaimer line in chat + 1301 view: *"countme מציג עובדות וחישובים על בסיס הנתונים שלך — לא ייעוץ מס. בשאלות מורכבות, אמת/י מול רואה חשבון."*
- The איתן coach should **cite the source skill / field** for every numeric claim and **decline + escalate** on genuine advice questions rather than guessing. (Aligns with the `israeli-ai-compliance-kit` posture already in the stack.)

### 2.3 Hebrew value proposition (crisp)

> **countme — האח החכם שלך לכל מה שמול רשויות המס. מחשב כל שדה, מסביר כל מספר, ולא נותן לך לפספס אף מועד. בלי לדעת חשבונאות, בלי פחד.**

(Current landing hero — "מלא/י דו״חות מס בלי רואה חשבון, בלי פחד" — is on-message; broaden it from *1301 only* to *year-round obligations* as the product has.)

### 2.4 Taglines (test these)

1. **"כל המספרים. כל המועדים. בלי פחד."** — broad, captures deadlines + computation.
2. **"הדוח השנתי שלך, כבר ממולא."** — concrete, hero-feature-led (best for the 1301/EY demo).
3. **"לא מחליף את רואה החשבון — הורג את הביורוקרטיה."** — the "busywork not the accountant" frame, ideal for partner/EY audiences.

> One-liner for non-Hebrew/investor decks: *"The AI co-pilot that does an Israeli freelancer's tax busywork — every field pre-filled, every deadline caught, every number explained — without giving tax advice."*

---

## 3. PMF Signals to Instrument

The product now has a backend (Supabase + auth), so these are **measurable**, not aspirational. Define each event, where it fires, and the target funnel. (Today there's no analytics layer wired — **adding lightweight event tracking is itself a top-5 product change, §7.**)

### 3.1 The funnel & the four signals

| Signal | Definition (concrete event) | Where it lives | Why it's the right line | Pilot target (hypothesis) |
|---|---|---|---|---|
| **Activation** | User **completes `/setup`** → `persistPersona()` fires + lands on `/dashboard` with a real (non-demo) persona. | `app/setup/page.tsx` `handleSubmit()` → `persistPersona` | This is the irreducible "I gave you my data" commitment. | ≥ **70%** of pilot users who start setup finish it. |
| **Aha** | User **sees a pre-filled 1301 field tooltip** (clicks an `InteractiveValue`) **OR a saved deadline** (views `/deadlines` with an upcoming obligation surfaced). | `components/form-1301/interactive-value.tsx`; `/deadlines`, `/alerts` | The "whoa, it really computed *my* number / it just caught a date for me" moment — the emotional core. | ≥ **80%** of activated users reach aha in session 1. |
| **Retention** | User **returns for the *next* obligation** — e.g. comes back within the window of a new מע״מ / מקדמה / ביטוח לאומי deadline, or re-opens after a deadline alert. Measure **D30 / D60 return** and **"returned for a 2nd distinct obligation."** | Auth session timestamps + deadline calendar | Tax life is periodic; retention = "countme became my standing tool," not a one-shot. | ≥ **40%** return for a 2nd obligation within 60 days. |
| **Referral** | User **invites / shares** (share-a-friend link) OR organic mention. Proxy until a referral feature exists: post-aha NPS-style prompt + qualitative "would you recommend." | New (to build) | Young-freelancer growth is community-driven (§4); referral is the cheapest channel. | ≥ **1 in 4** activated users says "would recommend" / shares. |

### 3.2 Supporting metrics (leading indicators of value, not just usage)

- **Deductions surfaced (₪):** total deductible value countme showed a user they might otherwise miss (sum across `lib/calculators` + business-expenses). A great "value delivered" headline number for the user *and* for marketing ("countme showed pilot users an average of X ₪ in deductions").
- **Deadlines caught:** count of obligations where the user opened an alert **before** the due date. Directly maps to the #1 pain (penalties).
- **Setup drop-off by step:** funnel completion per wizard step (1–6) — the activation diagnostic for §6.
- **Coach (איתן) engagement:** questions asked / session, and **% of questions answered with a cited number vs. escalated** (doubles as a compliance-quality metric).
- **Time-to-aha:** seconds from setup-complete to first `InteractiveValue` click.

### 3.3 How to measure (cheap, pilot-grade)

- With only 3–5 pilot users, **qualitative > dashboards**: a 20-min weekly call + a shared event log is enough to read PMF. But wire **minimal structured events now** (a single `track(event, props)` to Supabase or PostHog/Plausible) so the numbers exist when the pilot scales. Events to emit at minimum: `setup_started`, `setup_step_completed{step}`, `setup_completed`, `interactive_value_opened{field}`, `deadline_viewed`, `alert_opened`, `coach_question_asked`, `coach_answer_cited|escalated`, `return_session`.
- **Sean Ellis PMF test** at end of pilot: "How would you feel if you could no longer use countme?" — **≥ 40% "very disappointed"** is the classic PMF bar. Cheap, decisive, and fits a small cohort.

---

## 4. GTM Channels (prioritized for young Israeli freelancers)

Ranked by fit-to-ICP × cost-to-reach for the **pilot → early-growth** stage. Young Israeli freelancers are reachable, clustered, and community-trusting — favor **community + creator + partnership** over paid acquisition early.

### Tier 1 — do now (pilot → first 100)

1. **Israeli freelancer Facebook groups & WhatsApp/Telegram communities.** This is *the* watering hole. Large active groups exist for עצמאים, freelancers by trade (designers, devs, content), and "עוסק פטור/מורשה — שאלות ותשובות." Provide genuine value first (answer questions, share a free "deadline cheat-sheet"), then soft-introduce. **Founder-led, zero CAC.**
2. **Student entrepreneurship accelerators — Momentum / EY.** Already the wedge for the demo. Use the EY relationship for (a) credibility ("built with accountants in the loop"), (b) a warm pilot cohort of student-freelancers, (c) a potential channel/endorsement. Treat EY as a **distribution + trust partner**, framed by the "kills busywork, not the accountant" angle (§2.1).
3. **Micro-creator / "fin-fluencer" seeding (Instagram Reels + TikTok, Hebrew).** Young freelancers learn money/tax from Hebrew creators. Seed 5–10 micro-creators (designers/devs/coaches who post about freelance life) with free access in exchange for an honest "how I do my 1301 now" video. High trust, low cost.

### Tier 2 — build in parallel (compounding)

4. **Hebrew content/SEO** around the exact high-intent queries freelancers google (and that competitors already rank for): *"איך למלא טופס 1301"*, *"תקרת עוסק פטור 2026"*, *"מתי משלמים מע״מ / מקדמות / ביטוח לאומי"*, *"עוסק זעיר מול עוסק פטור"*, *"מספר הקצאה חשבונית"*. These are pain-at-the-moment queries → free tool CTA. Competitors (Green Invoice/Morning magazine, Kol Zchut, accounting firms) prove the demand; countme's edge is an **interactive computed answer**, not just an article.
5. **Partnerships with adjacent tools that *don't* do tax.** Invoicing platforms (Green Invoice/Morning, Sumit, EasyCount) own the *invoice* moment but the *annual report + deadline + explainability* layer is countme's. Explore data-import partnerships or referral ("you made the invoice — now let countme handle the 1301"). Also: banks/neobanks for SMBs, freelancer insurance, co-working spaces.
6. **Accountant (רו"ח) channel — the counter-intuitive one.** Because of the "complement not replace" frame, small accounting practices could *recommend* countme to their lower-tier clients (the ones who are unprofitable to hand-hold monthly). countme makes those clients self-serve and arrive organized. This turns a perceived competitor into a referral source.

### Tier 3 — later (scale)

7. Paid social (Meta/TikTok) once activation + retention are proven and CAC can be modeled. **Don't** pour paid spend in before §3 targets are hit — the pilot's job is to earn the right to scale.
8. University career centers, gig-economy platforms, and "going freelance" guides (the moment someone *registers* a business is the perfect trigger to acquire).

> **Channel sources / proof of clustering:** the freelancer-growth and community behavior is documented in mainstream coverage ([Walla — "הפרילנסרים של 2025"](https://finance.walla.co.il/item/3790950); [TheMarker](https://www.themarker.com/career/2024-03-21/ty-article-magazine/.premium/0000018e-5fd1-d411-a3df-dfdbfd220000)). Competitor content footprints ([Green Invoice/Morning](https://www.greeninvoice.co.il/), [Sumit](https://www.sumit.co.il/)) confirm the SEO demand and the "invoice ≠ tax-filing" white space.

---

## 5. Pricing Direction (hypotheses to test — not decisions)

**Anchor — what the market trains freelancers to pay:** Israeli SMB SaaS for this audience prices in the **low tens of ₪/month**. Green Invoice/Morning (170K+ businesses) and Sumit both run **freemium** (free invoice generation / a free tier) then paid tiers, with small per-document or add-on fees (e.g. payment-processing add-ons ~₪29/mo; per-extra-document ~₪1). ([Green Invoice](https://www.greeninvoice.co.il/), [Sumit pricing](https://www.sumit.co.il/pricing), [Sumit free invoices](https://www.sumit.co.il/invoices)) A monthly retainer רו"ח for a small עצמאי is far more (hundreds of ₪/mo), which is countme's value anchor: *"a fraction of an accountant, for the busywork an accountant shouldn't be billing you for."*

**Three pricing models to test:**

| Model | Shape | Why it could fit Israel | Risks / what to watch |
|---|---|---|---|
| **A. Freemium → subscription** *(recommended default to test first)* | Free: deadlines + alerts + ceiling tracker + basic chat. Paid (~**₪29–49/mo** hypothesis): full pre-filled 1301, deduction finder, unlimited איתן, multi-year, accountant export. | Matches the category's freemium norm (Morning/Sumit), removes activation friction, and the free tier (deadlines) is exactly the highest-frequency hook → habit → upsell at 1301 season. | Must make the free tier genuinely useful *without* cannibalizing the paid "aha." Subscription to a once-a-year-peak product needs year-round value (deadlines provide it). |
| **B. Per-filing** | Free to explore; pay **per 1301 filing** (~**₪149–349** hypothesis, vs. hundreds for a רו"ח). | Maps to the user's mental model ("I pay when I file"), no commitment, easy to justify ("cheaper than an accountant for this one thing"). | Only monetizes once/year → weak retention economics; doesn't capture the year-round deadline value; seasonal revenue. |
| **C. Hybrid** | Free deadlines/alerts (acquire + retain) **+** a one-time **filing unlock** at 1301 season **+** optional low monthly for power features. | Captures both the habit (free deadlines) and the willingness-to-pay spike at filing. | More complex to message; pick after A/B signal. |

**Pricing principles to hold:**
- **Keep a free deadline/alert tier permanently** — it's the cheapest retention + acquisition engine and the antidote to a seasonal product.
- **Anchor against the רו"ח cost, not against other software** — "facts not advice" lets us say "we do the busywork a רו"ח shouldn't bill you for" without claiming to replace them.
- **Don't charge in the pilot.** Use the 3–5 users to find willingness-to-pay (van Westendorp / "what would you pay" interviews), validate which feature is the payable "aha," and only then set a number.
- **Israeli specifics:** prices shown **incl. VAT** and in ₪; offer annual (the audience is price-sensitive and annual smooths the seasonal product); consider a **student/Momentum discount** for the launch cohort.

---

## 6. Activation Gaps (what likely blocks `/setup` completion) + quick wins

Read against the actual `app/setup/page.tsx` (6 steps + optional upload step 0) and the data flow. The funnel is **start setup → step 1–6 → `persistPersona` → `/dashboard`**. Friction points, highest-impact first:

| # | Gap (observed in code) | Why it blocks activation | Quick win | Effort |
|---|---|---|---|---|
| 1 | **Setup demands a lot before any payoff.** 6 steps incl. ת"ז (with check-digit validation), birth date, bank details, and several optional deduction numbers — all *before* the user sees a single computed result on the dashboard. | The "aha" (a real computed number) is gated behind heavy data entry; classic drop-off. The value is back-loaded. | **Show a live computed payoff *inside* setup** (the wizard already computes `previewNet`, credit points, 6111 status in step 5–6 — surface a richer "your numbers so far" earlier, e.g. after step 4, and explicitly say "this is already your שדה 150"). Move the reward earlier. | **S** |
| 2 | **Bank details + ת"ז requested up front** create a trust/effort spike for a first-time user who hasn't seen value yet. | Asking for ID + bank before trust is earned is a known conversion killer, especially for a fintech the user just met. | Make **bank step explicitly skippable** ("צריך רק להחזר — אפשר להשלים אחר כך") and reassure with the existing "נשמר מקומית בדפדפן" line *up front*, not only on the last step. | **S** |
| 3 | **The fast-track upload (step 0) is the best activation lever but is easy to skip and may feel risky.** It can auto-fill name, osek type, revenue, expenses, donations from a 106 / income report / expenses Excel. | If users skip it, they fall into full manual entry (gap #1). If they fear uploading tax docs, they bounce. | Make step 0 more inviting + safe: a one-line "מה קורה למסמך שלי" reassurance, show **exactly which fields got filled** after a successful parse (a visible "חסכנו לך X שדות"), and let a successful upload **jump the user further into the wizard**. | **S–M** |
| 4 | **No analytics → activation is currently un-measurable.** There's no event tracking; you can't see *which* step loses people. | You can't fix a funnel you can't see; §3 targets are unverifiable. | Wire minimal `track()` events (§3.3), especially `setup_step_completed{step}`. | **S** |
| 5 | **Two front doors blur the path: `/demo` (fictional) vs. `/setup` (real).** Landing pushes both "דמו" and "הכנסת נתונים." | A new user may land in the demo, get the "wow," but never convert to entering *their* data (the activation event). | Make the **demo → setup** handoff explicit ("ראית איך זה עובד על דנה — עכשיו על הנתונים שלך") and ensure `/demo` always has a prominent "do it for me" CTA into `/setup`. | **S** |
| 6 | **Optional deduction fields (step 5) add length without being required.** ביטוח לאומי / קרן השתלמות / פנסיה / תרומות are all optional but visible, lengthening the form. | More fields = more perceived work, even when optional. | Collapse optional deductions behind a "**יש לי עוד ניכויים להוסיף**" expander; default the path to the minimum required for a result. | **S** |
| 7 | **Contact info (email/phone) is hard-coded empty** in `buildPersona()` — no account-recovery / re-engagement hook is captured at setup. | Without an email/phone, you can't send the deadline reminders that *are the retention engine*, nor recover the account. | Capture (optional but encouraged) email/phone with the value prop "כדי שנזכיר לך לפני כל מועד" — turns a gap into a retention asset. | **S** |

**Net:** the activation story is mostly **"move the reward earlier, ask for less/less-scary up front, lean on upload, and instrument the funnel."** All quick wins are S/M.

---

## 7. Top 5 Prioritized Product Changes for Market-Readiness

Ordered by impact on the PMF loop (activation → aha → retention). Each has rationale + rough effort.

1. **Instrument the funnel (event analytics).** — **Effort: S.**
   *Rationale:* You cannot tune activation, prove aha, or run the Sean-Ellis/PMF read (§3) without events. This is the cheapest highest-leverage change and unblocks every other decision. Add a single `track()` to Supabase/PostHog and emit the §3.3 events. **Do this first.**

2. **Front-load the "aha" inside `/setup` + soften the ask.** — **Effort: S–M.**
   *Rationale:* §6 gaps #1–#3, #6. Surface a real computed number ("this is already your שדה 150 / your next deadline") before the heavy steps, make bank/ID explicitly skippable with the local-storage reassurance up front, and make the upload fast-track more inviting and transparent. Directly lifts the activation rate that everything else compounds on.

3. **Turn deadlines into the retention engine: reminders + (optional) calendar/notifications.** — **Effort: M.**
   *Rationale:* Retention = "returns for the next obligation" (§3), and the #1 pain is missed-deadline penalties (§1.3). The deadline data + UI exist (`/deadlines`, `/alerts`, `lib/deadlines/calendar.ts`); what's missing is the **outbound nudge**. Capture email/phone at setup (gap #7), send a pre-deadline reminder (email/WhatsApp), and offer "add to calendar." This converts a once-a-year tool into a year-round habit — and is the free-tier hook that powers pricing model A (§5).

4. **Harden the "facts, not advice" + citation/escalation behavior in איתן.** — **Effort: S–M.**
   *Rationale:* This is both a **compliance requirement** and a **trust/quality differentiator** (§2.2), and it de-risks the EY/partner channel (§4). Make the coach cite the source field/skill for every numeric claim, show a persistent disclaimer, and **decline + escalate to "verify with a רו"ח"** on genuine-advice questions. Track `coach_answer_cited|escalated` as a quality metric. Low effort, high reputational protection given the legal sensitivity.

5. **Multi-year + "what changed" so the product has a reason to exist every year.** — **Effort: M (foundation already exists).**
   *Rationale:* The year-versioned tax model is already built (`getTaxYearConstants`, 2024/2025/2026 with `TODO(Roy)` markers). Productizing it — let a returning user roll into the **2025 filing** (the one actually due now) and the **2026** accrual year, and show "מה השתנה השנה" (frozen brackets, new ceilings, allocation-number threshold drop to ₪5K on 2026-06-01) — gives a concrete annual re-engagement reason and showcases countme's core advantage: rules that update in one place and propagate everywhere. *Dependency:* needs Roy to confirm the 2025/2026 figures currently marked provisional.

> **Honorable mentions (not top-5, but on the radar):** referral/share feature (cheap growth, §4); import from Green Invoice/Sumit (kills manual entry for users who already invoice elsewhere, §4 partnerships); a public free "deadline cheat-sheet / ceiling calculator" as an SEO + top-of-funnel lead magnet (§4 content).

---

## Appendix — Sources

- TheMarker — Israeli self-employment growth (+45% osek patur since 2019; ~422K by end-2023; ~65K closures in 2024): https://www.themarker.com/career/2024-03-21/ty-article-magazine/.premium/0000018e-5fd1-d411-a3df-dfdbfd220000
- Walla כסף — "הפרילנסרים של 2025: 100% חופש, 0% ביטחון כלכלי": https://finance.walla.co.il/item/3790950
- Kol Zchut — עוסק פטור: https://www.kolzchut.org.il/he/עוסק_פטור · עסק זעיר: https://www.kolzchut.org.il/he/עסק_זעיר · עוסק מורשה: https://www.kolzchut.org.il/he/עוסק_מורשה
- Tax Authority — 2025 annual income-tax report (1301) service (deadlines): https://www.gov.il/he/service/reporting-and-payment-2025-annual-tax-report-for-individuals
- Tax Authority — allocation numbers (מספר הקצאה), 10K→5K ₪ threshold from 2026-06: https://www.gov.il/he/service/request-assignment-number-for-tax-invoice
- Tax Authority — PCN 874 detailed VAT (500K ₪ turnover, 23rd-of-month): https://www.gov.il/he/pages/pa280825-1
- Deel — Israel sole-proprietorship (osek patur/murshe, 18% VAT) guide: https://www.deel.com/blog/sole-proprietorship-israel/
- CWS Israel — Freelancer tax compliance in Israel (2026 guide): https://www.cwsisrael.com/freelancer-tax-compliance-in-israel-2026/
- Green Invoice / Morning (חשבונית ירוקה) — pricing & product (170K+ businesses, freemium): https://www.greeninvoice.co.il/ · pricing: https://www.greeninvoice.co.il/pricing/
- Sumit (סאמיט) — pricing (free tier) & product (AI bookkeeping): https://www.sumit.co.il/pricing · https://www.sumit.co.il/invoices
- Internal: `israeli-freelancer-ops` skill (current 2026 thresholds, deadlines, penalties); `CLAUDE.md`, `memory/` (product context); `app/setup/page.tsx`, `lib/calculators/*`, `lib/deadlines/`, `lib/alerts/ceiling.ts`, `lib/business-expenses/profiles.ts` (current product surface).

> **Freshness caveat:** Tax/benefit figures (ceilings, brackets, rates, allocation-number thresholds) update at least annually and some mid-year. Re-verify any quoted number against the cited official source before using it externally. Pricing and channel claims here are **pilot hypotheses**, to be confirmed/killed by the 3–5-user pilot.
