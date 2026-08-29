# Feasibility Spike — חשבונית ישראל / Israeli E-Invoicing (SHAAM Allocation Numbers)

> **Spike type:** research only (no app code). **Date:** 2026-06-09. **Author:** Claude (agent spike).
> **Maps to internal plan item:** R3 — חשבונית ישראל registration.
> **Sources:** see [Sources](#sources) at the bottom. Domain authority = the `israeli-e-invoice` skill + live web research (gov.il, רשות המסים, accountant guides). Figures cross-checked against multiple independent sources; any figure I could **not** confirm from an official gov.il/רשות-המסים page is flagged with ⚠️.

---

## ⭐ Recommendation (TL;DR): **OUT of the ~1-month pilot — except an optional sandbox-only POC spike**

**Verdict: OUT for production. Conditionally IN for a tiny sandbox POC if (and only if) we have spare engineering days.**

Reasoning in one breath:

1. **countme is a companion, not an issuer.** Today the product reads the user's data and pre-fills Form 1301; the user copies values into the real gov.il form. The allocation-number flow is fundamentally a **write/issuance** action against the Tax Authority (you submit invoice data *before* issuing and embed the returned number). That is a different product posture (countme would become a system-of-record that emits legally-binding documents), with real liability if a number is wrong/missing. That posture is **not** what the EY pilot is demonstrating.
2. **Most of our target users are exempt.** The mandate only bites **עוסק מורשה / companies** issuing a **tax invoice (חשבונית מס / 300/305/310)** to another business (B2B) **above the threshold**. **עוסק פטור cannot issue a tax invoice at all** (they issue חשבונית עסקה / receipt), so they are entirely **out of scope**. A large slice of the ≈352K under-35 freelancers countme targets are osek patur or low-volume — for them this feature is irrelevant.
3. **Registration is a real-world, human, credential-gated process** (smart-ID login, signed forms, digital permissions, a token that expires every 3 months) — it cannot be fully automated or demoed convincingly inside a 1-month window without Yoni's real business identity and credentials.
4. **The pilot is 3–5 users for ~1 month.** Even where a user is osek morshe (our demo persona Dana **is** — see below), the value of auto-issuing allocation numbers in a 1-month pilot is low vs. the integration + compliance cost.

**What is in scope instead:** countme should *understand* and *surface* the allocation-number rule as **advisory/compliance intelligence** — e.g., the invoice generator and the chat agent should know the current threshold (5,000 ₪ net as of 2026-06-01), warn the user when an invoice they're issuing crosses it, and tell them they must obtain a מספר הקצאה. That is read-only, zero-credential, on-brand for "companion", and **cheap**. (It also fixes a latent bug — see [Codebase reality check](#codebase-reality-check).)

If we want to de-risk the *future* production integration, the right minimal slice is a **throwaway sandbox POC** (OAuth2 handshake + one `Approval` call against the ITA test environment) — see [Q4](#q4--verdict-for-the-pilot--in-or-out).

---

## Q1 — What is חשבונית ישראל and the allocation number (מספר הקצאה)?

**חשבונית ישראל ("Israel Invoice")** is the Tax Authority's **Continuous Transaction Control (CTC) / clearance** model. Before a business issues a **tax invoice** above a set amount, it must send the invoice data to רשות המסים (via its **SHAAM/שע"ם** technology arm), which validates it in real time and returns a unique **מספר הקצאה (allocation number)**. The number must be printed on the invoice. **Without a valid allocation number, the buyer cannot deduct the input VAT (מע"מ תשומות)** — that is the enforcement lever. Purpose: kill fictitious-invoice fraud.

**Which invoices require an allocation number:**
- **Required:** tax invoice **300** (חשבונית מס), tax invoice/receipt **305** (חשבונית מס/קבלה), credit invoice **310** (חשבונית זיכוי) — i.e. documents that carry VAT — issued **B2B by an עוסק מורשה / partnership / company**, when the **net amount (לפני מע"מ) exceeds the current threshold**.
- **Never required:** receipt **320** (קבלה), proforma **330** (חשבונית פרופורמה), חשבונית עסקה (demand-for-payment), and anything issued by an **עוסק פטור** (who cannot issue a חשבונית מס at all).
- The threshold is on the **net amount, excluding VAT**. Multi-line invoices: the **total** counts. **Splitting an invoice to dodge the threshold is explicitly prohibited** (anti-avoidance).

### Threshold & phase-in schedule (2024 → 2026)

| Effective date | Threshold (net, **excl. VAT**) | Applies to | Status |
|---|---|---|---|
| 2024-05-01 | **> 25,000 ₪** | Tax invoices 300/305/310, B2B | Past |
| 2025-01-01 | **> 20,000 ₪** | " | Past |
| 2026-01-01 | **> 10,000 ₪** | " | Past (as of today) |
| **2026-06-01** | **> 5,000 ₪** | " | ✅ **CURRENT (took effect 8 days ago)** |
| Final stage (date not yet fixed) | trending toward **all** tax invoices | " | ⚠️ Planned, date TBD |

**Today (2026-06-09) the live threshold is 5,000 ₪ net.** Any tax invoice ≥ 5,000 ₪ before VAT issued from 2026-06-01 onward must carry an allocation number. **Check the invoice *issue* date, not the transaction date.**

- **Legal basis:** amendment to **§38(b) of the Economic Efficiency Law (חוק ההתייעלות הכלכלית)**, originally enacting a glide path 25,000 ₪ (2024) → 5,000 ₪ in **2028**. The 2026 acceleration (10,000 ₪ in Jan, then 5,000 ₪ in June) was legislated via the **budget-targets / arrangements law (חוק ההסדרים / חוק להשגת יעדי התקציב)**. The original "5,000 only in 2028" was **pulled forward ~2 years**.
- **Current standard VAT rate: 18%** (raised from 17% on **2025-01-01**; a proposed rise to 19% for 2026 was **rejected** — stays 18%). Confirmed for 2026 budget.

> ⚠️ **Confirmation note:** the threshold *amounts and dates* above are corroborated by the `israeli-e-invoice` skill **and** multiple 2026 accountant/vendor guides (GreenInvoice, Bizportal, BritCPA, Invoice4U, CPA.co.il, capitax). I did **not** get a 200 from gov.il directly in this environment (most external hosts returned 403 to the fetch tool), so the precise gov.il wording of the §38(b) text is **second-hand via reputable Israeli CPA firms**, not a primary-source quote. The figures are consistent across all of them, so confidence is high, but flag for Yoni to eyeball the official רשות-המסים page before any production work.

---

## Q2 — Registration as a software house / "בית תוכנה" (SHAAM)

**Two different registrations exist — don't conflate them:**

**(A) Business registration to *obtain* allocation numbers (every issuing business needs this).**
This is what an individual עוסק does, with or without software:
1. Log in to the **Tax Authority personal area** and create a **permanent personal user code (קוד משתמש)** — `https://secapp.taxes.gov.il/srRishum/main/openPage`. Requires **smart-ID identification (הזדהות עם אמצעי זיהוי חכם)**.
2. Grant **digital-action permissions ("הרשאה לפעולות דיגיטליות")**, ticking the relevant topics:
   - *"חשבונית ישראל – בקשת מספר הקצאה עבור חשבונית ללקוח"* (request allocation for a customer invoice)
   - *"חשבונית ישראל – אימות מספר הקצאה בחשבונית ספק"* (verify a supplier's allocation number)
3. **Manual path:** request the number by hand in the personal area (works for paper/manual books) — fine for low volume, slow for many invoices/day.
4. **Automated path:** connect accounting software via API, which fetches the number and embeds it at issue time (transparent, seconds).

**(B) Software-house / API-producer registration (what countme would need to call the API).**
To call the allocation API *on behalf of businesses from your own software*, the **organization registers as an API consumer in the ITA OpenAPI developers' portal** and is **subject to ITA authorization**:
- **Sandbox / developer registration:** `https://openapi-portal.taxes.gov.il/sandbox/` — **a full test/sandbox environment exists** (this is a headline feature of the program; you can develop & test without touching production).
- **Production access is gated:** you must **submit signed registration documents** and be **authorized by the ITA** before the production endpoints work. New client sign-up: `https://secapp.taxes.gov.il/srRishum/main/openPage`.
- **Identifiers issued:** OAuth2 **Client ID / Client Secret** for the registered app, plus the per-business **access token + refresh token** obtained through the user-restricted OAuth flow. The ITA docs frame auth as a **token that identifies the business + the authorized user**; **the token must be renewed every ~3 months** for security.
- **Spec:** "Israel Invoice Model — Description of API's", **v2.0 (July 2024)**; v2.0 extended the JSON to align with **UBL 2.1** for the Jan-2025 mandate. Documentation is **primarily in Hebrew**.

> **Bottom line for Q2:** Yes — to call the allocation API from countme's own backend, countme registers as an **API consumer / software house** in the OpenAPI portal, gets **OAuth2 Client ID/Secret**, and goes through an **ITA authorization step (signed docs)** before production. **A sandbox exists and needs only self-service developer registration.** *Each end-user business* still also needs **its own** personal-area registration + digital permission + token (it's their VAT identity being used).

---

## Q3 — The API

**Authentication model:** **OAuth2, "User Restricted" authorization** (authorization-code grant), **not** bare client-credentials. Two-step:
1. **Authorization Code** — the business/user authenticates (smart-ID) and authorizes the app → you receive an **authorization code**.
2. **Token exchange** — exchange the code (with the app's **Client ID / Client Secret**) → receive **access token + refresh token**. Tokens are time-limited; refresh as needed, and the underlying authorization is **renewed ~every 3 months**.

(The `israeli-e-invoice` skill's bundled API reference additionally notes a **digital-certificate** element in the auth bundle in some rollout phases — ⚠️ verify against the current OpenAPI v2.0 spec; the auth shape has changed across phases.)

**Base URLs (from ITA OpenAPI guide):**
- **Sandbox:** `https://openapi.taxes.gov.il/shaam/tsandbox/Invoices/v1/Approval`
- **Production:** `https://openapi.taxes.gov.il/shaam/prod/Invoices/v1/Approval` (base `https://openapi.taxes.gov.il/shaam/…`)
- **Developer portal:** `https://openapi-portal.taxes.gov.il/sandbox/`

**Request → response (obtain an allocation number):** `POST …/Invoices/v1/Approval` with a JSON body (v2.0, UBL-2.1-aligned). Key data fields that must be sent:
- **Seller** TIN/עוסק number (מספר עוסק, 9 digits)
- **Buyer** TIN (for B2B) — 9 digits
- **Invoice type** code (300 / 305 / 310)
- **Invoice date** and **invoice (sequential) number**
- **Amounts:** net (before VAT), VAT amount, total (incl. VAT), **currency** (ILS)
- **Line items** (description, qty, unit price) per UBL 2.1

**Illustrative shapes (from the skill reference — treat as schematic, confirm field names against v2.0):**
```jsonc
// Request
POST /shaam/{env}/Invoices/v1/Approval
Authorization: Bearer {access_token}
{
  "seller_tin": "123456782",
  "buyer_tin":  "987654328",
  "invoice_type": 300,
  "invoice_date": "2026-06-09",
  "net_amount": 7000,
  "vat_amount": 1260,      // 18%
  "total_amount": 8260,
  "currency": "ILS"
}
// Response
{ "allocation_number": "…", "status": "approved", "valid_until": "…" }
```
Typical error codes: 400 (bad structure), 401 (auth), 403 (not authorized for this TIN), 409 (allocation already used), 422 (validation), 429 (rate-limited), 500 (SHAAM error). ⚠️ The exact paths/field names/error map have shifted across rollout phases — **the current ITA v2.0 spec is the only authoritative source**; the JSON above is schematic.

**Reference implementation to learn from:** `dsaddan/Israel-Tax-Authority-OpenAPI-Taxes-Demo` on GitHub — a C#/MVC demo that walks **registration → authorization code → access token → send sample invoice → get allocation number** (online demo at `demo.open-api.co.il`). Good map of the end-to-end handshake for whoever builds the POC.

---

## Q4 — Verdict for the pilot — IN or OUT?

**Is invoice-*issuance* even in scope for the pilot?** **No, not as production functionality.** countme's pilot demonstrates the **Form-1301 companion** value (pre-computed, explainable fields + chat). Issuing legally-binding tax invoices with live allocation numbers is a **new, higher-liability product surface** that:
- requires each user's **real VAT identity + smart-ID + 3-monthly token** (operationally heavy for a 3–5-user, 1-month pilot),
- only benefits **osek-morshe B2B issuers above 5,000 ₪** (a subset of users; **osek patur are wholly exempt**),
- turns countme into a system-of-record that **emits documents the Tax Authority treats as cleared** — a compliance/liability step we shouldn't take lightly mid-pilot.

### Three options, by size

| Option | What it is | Effort (rough) | Recommendation |
|---|---|---|---|
| **0. Advisory only (read-only)** | Invoice generator + chat agent *know* the rule: show current threshold (5,000 ₪), flag invoices that cross it, explain "you must get a מספר הקצאה". **No API, no credentials.** Also fix the VAT bug. | **~0.5–1 day** | ✅ **DO THIS — fits the pilot & "companion" identity** |
| **1. Sandbox-only POC (throwaway)** | Register in OpenAPI dev portal, implement OAuth2 handshake + **one** `Approval` call against **sandbox** with test data. Proves we *can* integrate; **never touches production or real user invoices.** | **~3–5 days** (most of it: portal registration friction + Hebrew docs + OAuth plumbing) | ⚪ **Optional** — only if spare days; de-risks the future, **not** needed for EY |
| **2. Full production integration** | Software-house authorization (signed docs), production OAuth per user, per-user token lifecycle (3-mo renewal), embed numbers on real issued invoices, error/edge handling, store allocation numbers (Supabase), audit. | **~3–6 weeks + ITA authorization lead time + legal/compliance review** | ❌ **OUT of pilot** — post-pilot roadmap item |

**Minimal slice if we do anything:** Option 0 (advisory) is the keeper for the pilot. Option 1 (sandbox POC) is the right *engineering* spike to schedule **after** EY if/when invoice-issuance becomes a product goal — it's the cheapest way to retire the technical risk before committing to Option 2.

---

## Q5 — Concrete next steps for countme (R3) + what's needed from Yoni

**Now (in-pilot, no credentials needed) — Option 0:**
1. Add a **year-keyed allocation-number threshold constant** to the regulatory layer (same pattern as the tax constants in `src/lib/calculators/types.ts`): `{ '2024': 25000, '2025': 20000, '2026-01': 10000, '2026-06': 5000 }`, resolved by invoice **issue date**. Single source of truth — never hardcode in a component.
2. **Fix the VAT bug** in `src/lib/invoice-generator/index.ts` — it uses `0.17`; the rate has been **18% since 2025-01-01**. (See below.)
3. In the invoice generator + chat agent: when an osek-morshe user composes a tax invoice (300/305/310) with **net ≥ current threshold**, surface a clear notice — *"חשבונית זו מחייבת מספר הקצאה מרשות המסים (חשבונית ישראל)"* — and link the manual-request flow. Skip entirely for osek patur / receipts / proforma.
4. (Optional, read-only) implement **verify-allocation** awareness on the *expense* side later — when ingesting a supplier invoice, countme could remind the user to verify the supplier's allocation number.

**Later (post-pilot, if issuance becomes a goal) — Option 1 → 2:**
5. **Self-service register** countme in the OpenAPI developers' **sandbox** (`openapi-portal.taxes.gov.il/sandbox`), get **Client ID/Secret**, build the OAuth2 + single `Approval` POC against sandbox (budget 3–5 days). Use `dsaddan/…OpenAPI-Taxes-Demo` as the reference.
6. Decide on production: pursue **ITA software-house authorization** (signed docs) only once there's product commitment; design the **per-user token lifecycle (3-mo renewal)** and **allocation-number storage** (extend the existing `invoices` table — it already has sequential per-user numbering) up front.

**What we need from Yoni (blocks Option 1/2, *not* Option 0):**
- **Business / registration identity:** which legal entity issues invoices in countme's flows (countme as a software house acting for users vs. each user's own עוסק). Confirm countme's company number / עוסק status for the **software-house** registration.
- **ITA OpenAPI developer-portal account** ownership — who registers and holds the **Client ID/Secret** (use the project account, **not** a personal one — consistent with the Vercel/account policy in CLAUDE.md).
- **Signed registration documents** for production authorization (Yoni/legal to sign) — known lead-time item.
- A **test עוסק identity** (or willingness to use Yoni's) for sandbox calls, since even sandbox flows are organized around a business + authorized user.
- Confirm the **official gov.il threshold/§38(b) wording** (the ⚠️ above) before any production build.

---

## Codebase reality check

What countme already has that's relevant (so a future build extends, not rebuilds):
- **Invoice generator:** `src/lib/invoice-generator/index.ts` — `nextInvoiceNumber()` (sequential `YYYY-NNNN`), `validateInvoice()`, `calculateInvoiceTotals()`, `formatHebrewDate()`. Invoice UI under `src/app/invoices/` (`page.tsx`, `new/`, `[invoiceNumber]/`).
- **Persona** already carries `invoiceCounter`, `business.osekType`, `invoiceCount`. The **demo persona Dana Cohen is `osekType: "morshe"`** (UX designer, ~248,500 ₪ revenue, ~38 invoices/yr ⇒ ~6,500 ₪ avg) — so **some of her invoices would cross the 5,000 ₪ net threshold**, making the *advisory* feature genuinely demo-relevant for her, while full issuance is still overkill for the pilot.
- **Supabase** (`crm-snapshot/supabase/migrations/`) already models per-user data with RLS; CLAUDE.md notes `invoices` + `income_documents` tables with sequential per-user numbering — the natural home for a stored `allocation_number` later.

> 🐞 **Bug found (fix as part of Option 0):** `calculateInvoiceTotals()` computes VAT as `Math.round(amount * 0.17)` and `validateInvoice()` hardcodes a `> 5000` customer-ID rule. **VAT is 18% since 2025-01-01** (the `0.17` undercharges VAT on every osek-morshe invoice). Move the rate into the year-keyed regulatory constants rather than swapping a literal. Note the coincidental `5000` in `validateInvoice` is the *customer-ID-required* rule, **not** the allocation threshold — they're now numerically equal (5,000 ₪) but are **different rules**; keep them distinct constants.

---

## Update — 2026-08-29: production "בית תוכנה" authorization, re-scoped for the launch plan

> **Context change:** the June-2026 spike above assumed a 3–5-user, 1-month EY pilot and correctly parked production issuance as OUT of scope. That framing is now stale on one axis: countme's plan is **internal beta now → ~1,000-user friends beta in ~2 months → official launch end 2026/early 2027**. This section does not re-litigate the Q1–Q5 verdict above (Option 0/advisory is still the right *product* scope today) — it drills into **when/whether to start the registration paperwork itself**, since ITA authorization has its own lead time independent of when countme starts issuing.

**What's already known (recap, from the June spike):** countme registering to *call* the allocation-number API requires the org to sign up as an API-consumer "software house" in the ITA OpenAPI portal, sandbox is self-service, production needs ITA authorization via signed documents, and each end-user business separately needs its own personal-area registration + digital permission + OAuth2 token (renewed ~every 3 months). The exact signed-document list and signatories were left unconfirmed (flagged ⚠️) — this update pins most of that down from primary sources.

### 1. Production authorization — the actual document set, signatories, fee, timeline

**What:** Production access is gated behind a specific, named procedure — **"נוהל חיבור בית תוכנה" (software-house connection procedure)**, current version dated 11.1.24, published at `gov.il/BlobFolder/service/connect-to-shaam/he/Service_Pages_shaam_Software-house-connection-procedure.pdf`. Per that procedure's own document set (also listed as separate PDFs on the same `connect-to-shaam` service page), the software house submits:
- a **כתב התחייבות (commitment/obligation letter) with appendices** — the general SHAAM obligation letter (`Service_Pages_shaam_obligation.pdf`, dated 30.10.2024) **plus** the dedicated **information-security declaration appendix** for software houses (`Service_Pages_shaam_appen-info-security-for-software-house.pdf`, dated 22/28.7.2025 — see item 3 below);
- a signed **הרשאה (authorization)** for the registration, per **"הרשאה לרישום בית התוכנה מטעם בעל העסק/התאגיד"** (`Service_Pages_shaam_procedure_of_obtaining_fpermission_to_register_the_software_house.pdf`) — i.e. authorization "on behalf of the business owner **or** the corporation";
- a **communication-infrastructure-provider connection form** (network/infra details for the API calls).

**Who signs:** the authorization procedure names it as coming from **"בעל העסק/התאגיד"** — literally "the business owner **or** the corporation" — mirroring the general digital-operations-authorization rule elsewhere on gov.il that a **director of a company**, a **partner in a registered partnership**, or a **signatory of an association** can grant/hold this authorization (max duration specified per grant, up to a year, renewable). ⚠️ **This phrasing (בעל העסק **or** התאגיד, used as alternatives in the document's own title) is the clearest primary-source signal that a sole proprietorship (עוסק) can register as the software house itself — it is not phrased as חברה-only** — but I could not open the PDF body directly (gov.il is blocked by this environment's egress proxy; found via search-engine snippets/titles only), so treat this as **high-confidence-but-not-fully-verified**; have Yoni open the PDF directly before treating it as settled. No accountant sign-off requirement was found anywhere in these documents — signatory is a business officer/owner, not a CPA.

**Cost:** ⚠️ Multiple secondary sources (not the gov.il PDFs themselves) cite a **one-time connection fee of ₪1,500** for the software-house SHAAM connection. This number was consistent across two independent secondary mentions but I could not confirm it by reading the primary PDF text directly (egress-blocked) — flag as **unconfirmed, needs primary-source check**.

**Timeline:** ⚠️ Secondary sources describing the ITA's processing SLA state **up to 90 days (≈3 months) from submission** for requests needing in-depth review, "typically shorter when the request includes all required documents." A separate, more general ITA authorization-processing figure (for a related but different digital-authorization flow) cites **5 business days** for automated/low-risk checks vs **up to 3 months** for cases needing deeper review — consistent with the 90-day figure, but again **not read directly off a gov.il PDF in this session** (⚠️).

**Primary source (titles/URLs found via search, gov.il fetch blocked here):**
- `gov.il/he/service/connect-to-shaam` — "קישור לשע״ם – מייצגים, כספות, ובתי תוכנה" (the hub page — names three distinct connecting populations: representatives, "safes"/כספות, and software houses)
- `gov.il/BlobFolder/service/connect-to-shaam/he/Service_Pages_shaam_Software-house-connection-procedure.pdf`
- `gov.il/BlobFolder/service/connect-to-shaam/he/Service_Pages_shaam_obligation.pdf`
- `gov.il/BlobFolder/service/connect-to-shaam/he/Service_Pages_shaam_procedure_of_obtaining_fpermission_to_register_the_software_house.pdf`
- `gov.il/BlobFolder/service/connect-to-shaam/he/Service_Pages_shaam_connection-work-process-software-houses.pdf`
- `gov.il/he/departments/targetaudience/taxes-adience-software` — "מידע לבתי תוכנה וליצרני מערכות מידע"

### 2. "בית תוכנה" IS a broader/distinct designation than the invoice-allocation API — confirmed

**What:** There is a **second, separate ITA registration track**, unrelated to SHAAM/allocation numbers: **"בקשה לרישום תוכנה המיועדת לניהול מערכת חשבונות ממוחשבת"** ("application to register software intended for managing a computerized accounting/bookkeeping system"), `gov.il/he/service/registration-software-designed-managing-computerized-accounting-system` (also `…itc-application-for-registration-software-computer-account-systems`). This sits under **הוראות מס הכנסה (ניהול פנקסי חשבונות), תשל״ג-1973** (the Income Tax bookkeeping-records regulations), specifically **Appendix ח / regulation 36**, which defines a "computerized accounting system" and requires anyone who wants to **sell** software for managing one to submit it to the ITA Commissioner for a registration certificate. Explicitly noted on the form's own description: **registration does not certify the software's correctness or that it complies with the bookkeeping regulations** — it's a registry entry, not a functional approval/audit.
**So — clarifying what Roy likely means:** if "בית תוכנה" is used loosely, it could refer to **either** (a) the SHAAM/e-invoicing API-consumer registration (Q1 above — this is almost certainly what's relevant to countme, since it's the one gating allocation-number issuance) **or** (b) this separate bookkeeping-software registration (relevant only if countme itself becomes the system-of-record for a client's statutory ledgers, which it currently is not — countme reads/advises, it doesn't replace the client's ניהול ספרים software). **Recommend confirming with Roy which he means** — the two have different triggers, different regulations, and different document sets. Given countme's current architecture (companion app, not a bookkeeping system of record), (a) is the one that matters near-term.
**Also confirmed (not really a third program, but adjacent):** the `connect-to-shaam` hub explicitly groups **מייצגים (tax representatives — accountants/lawyers)**, **כספות (secure file-drop "safes")**, and **בתי תוכנה (software houses)** as three separate connecting populations to the same SHAAM backend — so pulling things like טופס 106/מידע נישום programmatically would most likely route through **the מייצג (representative) channel's own API/credential set**, not the software-house/invoice-allocation one. I did not find a distinct "software-vendor" accreditation beyond the two above (bookkeeping-software registration, and SHAAM API-consumer registration) in this pass — no evidence of a broader general "software accreditation program."

**Primary source:** `gov.il/he/service/registration-software-designed-managing-computerized-accounting-system`; legal basis `nevo.co.il/law_html/law01/255_179.htm` (הוראות מס הכנסה (ניהול פנקסי חשבונות), תשל״ג-1973, secondary mirror, not gov.il itself — flag ⚠️ for exact regulation-36/Appendix-ח text); `gov.il/he/service/connect-to-shaam`.

### 3. Information-security requirements for registered software houses — the clearest primary-source find

**What:** The ITA publishes a dedicated **information-security declaration appendix specifically for software houses** — **"הצהרה-נספח אבטחת מידע"**, `gov.il/BlobFolder/service/connect-to-shaam/he/Service_Pages_shaam_appen-info-security-for-software-house.pdf`, current version dated **22–28 July 2025**. Confirmed concrete, scaled requirements:
- **Penetration testing, scaled by customer count**, both with hard first-test deadlines already in the past relative to today (2026-08-29) — meaning **any software house already connected has already been through at least one round**:
  - Software houses serving **>10 customers** issuing invoices via SHAAM: annual-and-a-half (i.e. every 18 months) penetration testing, **first test no later than 2025-12-31**.
  - Software houses serving **>100 customers**: same ongoing 18-month cadence but an **earlier first-test deadline, no later than September 2025**.
  - The ITA reserves the right to **demand an ad-hoc penetration test at any time** if it suspects suspicious/improper activity that threatens the Authority from a cyber standpoint.
- A **full data-security document set** that the software house must hand to its own IT/security staff.
- **API traffic to SHAAM must originate from computers located in Israel** (a data-residency/network-origin constraint, not just a policy statement) — ⚠️ worth double-checking the exact wording/scope (all traffic, or just the registration/auth flow) directly against the PDF.
- ⚠️ I could not open the PDF body directly in this environment (gov.il blocked by egress proxy) — the bullet points above come from a search-engine-generated summary of that specific document, not a line-by-line read. **Encryption-at-rest and specific access-control standards were referenced by the doc's existence/title but I could not confirm their exact wording** — get Yoni or an engineer with unblocked gov.il access to pull the PDF directly before this becomes a compliance checklist item.
- Context from an unrelated finding: **Israel's State Comptroller has previously flagged security weaknesses in the חשבוניות ישראל system itself** (per a secondary Hebrew tech-press summary, `pc.co.il`), recommending the ITA build better anomaly-detection and work more closely with government/external infosec bodies — i.e. the ITA's own back end has been publicly criticized on this axis, which is a signal (not a countme obligation, but useful context for a security conversation with EY).

**Primary source:** `gov.il/BlobFolder/service/connect-to-shaam/he/Service_Pages_shaam_appen-info-security-for-software-house.pdf` (title/date confirmed via search; body summarized via search snippets, not directly read this session).

### 4. When registration actually becomes necessary vs. when to *start* it, given the growth plan

**Judgment call (not a primary-source fact) given the above:**
- **Registration is not needed for internal beta or the ~1,000-user friends beta**, as long as countme stays in its current posture: pre-computing values, advisory-only on the allocation-number rule (Option 0 from the June spike), and the user still copies/issues invoices themselves through their own existing tooling. Nothing in the beta plan requires countme to call the `Approval` API on a user's behalf.
- **Registration becomes necessary the moment countme itself calls the SHAAM `Approval` endpoint to obtain/embed an allocation number on an invoice it generates or issues on a user's behalf** — i.e., tied to the *product* decision to move from "advisory" to "issuer," not to user count. A friends-beta user manually getting their own allocation number (via their personal ITA area, unconnected to countme) never triggers countme's own software-house obligation.
- **But the *lead time* argument favors starting the paperwork early, independent of the trigger above**, because: (a) production authorization has a **real-world processing SLA of up to ~90 days** (⚠️ secondary-sourced, see item 1) that is entirely outside countme's control once submitted; (b) it needs **signed documents from a business officer** (Yoni) plus **an infrastructure/network setup step**, which are calendar-cost, not engineering-cost, and can run in parallel with beta; (c) the **sandbox registration is self-service and free-ish to start today** (per the June spike, Option 1 — ~3–5 eng days) and de-risks the OAuth2/API integration *before* the 90-day production clock needs to start.
- **Recommended sequencing against the stated timeline** (internal beta now → 1,000-user beta in ~2 months → official launch end 2026/early 2027): if issuance is a real goal for the official launch, **start the sandbox POC (Option 1) and the production paperwork (signed commitment letter + officer authorization + infra form) in parallel with the 1,000-user beta**, not after it — a 90-day ITA clock plus internal signature/legal routing easily eats 2–4 months, which does not fit *after* the 2-month beta if launch is end-2026. If issuance is **not** committed as an official-launch feature, there's no reason to start the production paperwork now — the advisory-only posture has no expiry and can carry all the way through launch.

No primary source addresses "when should a company start this" — that's a scheduling inference from the confirmed 90-day-ish processing SLA (⚠️) plus the fixed launch date, not a stated ITA rule.

---

## Sources

Cross-checked; ⚠️ = could not load the primary gov.il page directly in this environment (fetch returned 403), corroborated via reputable Israeli CPA/vendor guides instead.

**Official / primary (ITA / gov.il):**
- Israel Tax Authority — e-invoice / Israel Invoices program: https://www.gov.il/he/departments/israel_tax_authority and https://govextra.gov.il/taxes/innovation/home/israel-invoices/
- ITA Q&A — Israel Invoices (EN): https://www.gov.il/en/pages/faq_israel_invoice
- ITA "Israel Invoice Model — Description of API's" **v2.0 / 7.2024** (gov.il PDF): https://www.gov.il/BlobFolder/generalpage/israel-invoice-160723/he/vat_software-houses-180724-en.pdf  · v1.0/2023 (EN): https://www.gov.il/BlobFolder/generalpage/israel-invoice-160723/he/IncomeTax_software-houses-en-040723.pdf
- ITA OpenAPI **Login/User Guide** (secapp): https://secapp.taxes.gov.il/OpenApiUserGuide/OpenApiUserGuide_EN.pdf
- ITA "Tax Authority Open API — SHAAM" service page (gov.il PDF): https://www.gov.il/BlobFolder/service/connect-to-shaam/he/Service_Pages_shaam_Tax-Authority-Open-API.pdf
- ITA software-houses landing: https://www.gov.il/he/departments/targetaudience/taxes-adience-software/govil-landing-page
- New-client / user-code sign-up: https://secapp.taxes.gov.il/srRishum/main/openPage
- Developer sandbox portal: https://openapi-portal.taxes.gov.il/sandbox/

**Reference implementation:**
- `dsaddan/Israel-Tax-Authority-OpenAPI-Taxes-Demo` (GitHub, OAuth + allocation demo): https://github.com/dsaddan/Israel-Tax-Authority-OpenAPI-Taxes-Demo

**Threshold / timeline / VAT (corroborating, ⚠️ secondary):**
- GreenInvoice 2026 guide: https://www.greeninvoice.co.il/magazine/israel-invoice/
- Bizportal — 5,000 ₪ from June 1: https://www.bizportal.co.il/general/news/article/20032314
- Ynet — every transaction over 5,000 ₪ from Monday: https://www.ynet.co.il/economy/article/yokra14781826
- BritCPA — 2026 updates: https://britcpa.co.il/hozrim/מודל-חשבוניות-ישראל-עדכונים-לשנת-2026/
- capitax — §38(b) two-step reduction (10k Jan / 5k June): https://www.capitax.co.il/content/1/2489
- CPA.co.il — invoice over 10,000 ₪ requires allocation (2026): https://www.cpa.co.il/2026-allocation-number/
- Sovos — accelerated CTC timeline confirmed: https://sovos.com/regulatory-updates/vat/israel-tax-authority-confirms-accelerated-timeline-for-ctc-invoice-allocation-number/
- KPMG — expansion of mandatory e-invoicing (Dec 2025): https://kpmg.com/us/en/taxnewsflash/news/2025/12/tnf-israel-expansion-of-mandatory-e-invoicing-model.html
- Avalara — Israel e-invoicing country guide: https://www.avalara.com/vatlive/en/country-guides/africa-and-middle-east/israel/e-invoicing-in-israel.html
- dddinvoices — 2026 guide: https://dddinvoices.com/learn/e-invoicing-israel
- VAT rate 18% (2025→2026, 19% rejected): https://www.vatupdate.com/2025/12/10/israel-approves-2026-budget-vat-stays-at-18-expands-exemptions-eases-bank-entry-rules/ · https://marosavat.com/vat-news/israel-increases-vat-rate-from-17-to-18-by-2025

**Registration / osek-patur scope (corroborating):**
- SUMIT — connection-to-ITA process: https://help.sumit.co.il/he/articles/8267195
- iCount — how to issue an allocation number (2026): https://www.icount.co.il/blog/invoice-israel/
- Kol Zchut — osek patur (cannot issue tax invoice): https://www.kolzchut.org.il/he/עוסק_פטור

**Domain authority:** `israeli-e-invoice` skill (`.claude/skills/israeli-e-invoice/` — `references/shaam-api-reference.md`, `references/compliance-timeline.md`, `references/invoice-types.md`).

**Added 2026-08-29 (production-authorization update above) — official (ITA/gov.il), titles/URLs confirmed via search engine, PDF bodies NOT read directly (gov.il fetch blocked in this environment's egress proxy — ⚠️ have someone with unblocked access open these before treating any figure above as final):**
- Hub: https://www.gov.il/he/service/connect-to-shaam
- Software-house connection procedure (11.1.24): https://www.gov.il/BlobFolder/service/connect-to-shaam/he/Service_Pages_shaam_Software-house-connection-procedure.pdf
- SHAAM obligation/commitment letter (30.10.2024): https://www.gov.il/BlobFolder/service/connect-to-shaam/he/Service_Pages_shaam_obligation.pdf
- Authorization to register the software house, on behalf of business owner/corporation: https://www.gov.il/BlobFolder/service/connect-to-shaam/he/Service_Pages_shaam_procedure_of_obtaining_fpermission_to_register_the_software_house.pdf
- Software-house connection work process: https://www.gov.il/BlobFolder/service/connect-to-shaam/he/Service_Pages_shaam_connection-work-process-software-houses.pdf
- Information-security declaration/appendix for software houses (22–28.7.2025, pen-test cadence): https://www.gov.il/BlobFolder/service/connect-to-shaam/he/Service_Pages_shaam_appen-info-security-for-software-house.pdf
- "מידע לבתי תוכנה וליצרני מערכות מידע" landing page: https://www.gov.il/he/departments/targetaudience/taxes-adience-software
- "יצרני תוכנות – הוראות ופרסומים אחרים": https://www.gov.il/he/pages/hor-software-other
- Separate bookkeeping-software registration (distinct designation, Q2 finding): https://www.gov.il/he/service/registration-software-designed-managing-computerized-accounting-system
- General digital-operations authorization service (signatory rules): https://www.gov.il/he/service/authorize-certification-perform-digital-operations

**Corroborating/secondary (fee figure, timeline figure, State Comptroller security criticism — ⚠️ not gov.il primary text read directly):**
- BTOP connection presentation (fee, process outline): https://btop.co.il/wp-content/uploads/2023/11/מצגת-להתחברות-בתי-תוכנה-08-11-23.pdf
- Rivhit — API modules for software houses: https://www.rivhit.co.il/מודולים-למפתחים-מול-רשות-המיסים/
- pc.co.il — State Comptroller flags security weaknesses in the Israel Invoices system: https://www.pc.co.il/featured/453692/
- Bookkeeping regulations text (secondary mirror, not gov.il): https://www.nevo.co.il/law_html/law01/255_179.htm
