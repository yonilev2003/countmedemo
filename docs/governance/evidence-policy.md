# CountMe — Evidence & Risk Management Policy (canonical)

> **as-of:** `main@3522ce0` · 2026-09-01 · branch `claude/quantum-promotion-tasks-9ofmaw`
> **Status:** Adopted. Produced via cross-model review (Claude Sonnet 5 + ChatGPT), two full correction
> rounds, both models verified against live code and external sources before this version was locked.
> **Canonical copy.** `memory/decisions.md` holds a short pointer entry, not a duplicate. `CLAUDE.md`
> holds a one-paragraph mandatory-read instruction, not a duplicate. If a future edit only touches one
> of the three, that edit is wrong — update this file and let the others keep pointing at it.

## 1. What this document is

This document does not certify that the product meets any legal, regulatory, or security requirement.
It records:

1. Which facts have been verified, and at what evidence level.
2. Which questions are still open.
3. What conditions must hold before each launch stage.
4. Who is authorized to close each type of claim.

No AI chat transcript, planning document, or single commit is ever the source of truth by itself.

## 2. Evidence levels (mandatory tagging)

Every claim in this project carries one of:

- **P — Verified in production.** Checked against the live environment, with date, who checked, and a
  reproducible result.
- **C — Verified in code.** Exists in a named commit, not necessarily deployed or activated in
  production.
- **O — Official external source.** From a current publication by a competent authority or the
  provider itself.
- **E — Professional opinion.** Delivered in writing by a lawyer, accountant, tax advisor, or security
  expert within their area of expertise.
- **R — Internal report.** A team member reported it done, with no independent evidence attached.
- **H — Hypothesis.** An untested business, legal, or technical assumption.

A C or R claim must never be presented as P. An AI analysis must never be presented as E.

## 3. Source hierarchy on conflict

1. A production state actually checked beats documentation and beats code.
2. Code on the current commit beats an old TODO or planning document.
3. An official regulatory source beats an internal document.
4. A written professional opinion on how the law applies **to CountMe specifically** beats a general
   team or AI interpretation.
5. An unresolved conflict is marked an open gap — never resolved by picking the more convenient version.

Every status document states its date, branch, and commit SHA.

## 4. Locked technical facts as of `main@3522ce0` — evidence level C unless noted

- Chat history capped at 50 threads / 200 messages (`src/lib/chat/history.ts:119,154`).
- `TAX_YEAR_2026` defined with real 2026 values, e.g. 122,833 ₪ osek-patur ceiling
  (`src/lib/calculators/types.ts:407`).
- The cross-tenant-info-leak RPCs (`get_next_invoice_number`/`get_next_doc_number`) were hardened
  (2026-07-23) and then dropped entirely (2026-08-16) once their underlying tables were removed —
  confirmed unused via grep before the drop.
- Hard AI cost caps, usage ledger, auto-degradation exist (`src/lib/ai/usage.ts`,
  `AI_DAILY_BUDGET_DEGRADE_USD`/`PAUSE_USD`).
- `createAdminClient()` is guarded by `import "server-only"` (`src/lib/supabase/admin.ts:6`) — a
  Client Component import throws at build/runtime. 11 files call it as of this commit
  (`admin.ts` itself + 10 consumers — see file for the list).
- `/s/{id}` and `/d/{token}` document-share links carry a 90-day TTL (`DOC_LINK_TTL_DAYS`,
  `src/lib/doc-link.ts:16`) but **no manual revoke** — a shared-by-mistake link cannot be killed early.

"Implemented in code" is not "verified in production." Until the live environment is checked, the
status of migrations, RLS, functions, env vars, and usage limits stays C or R — never P.

## 5. Open technical/security gaps

- RLS, schema, and migrations have not been independently verified against the live `hbsgz` Supabase
  project — only against code and self-reports.
- PII minimization across the product (raw ID numbers, full bank account numbers, full net-worth
  declarations in `profiles.persona`) is not implemented.
- Data residency: primary DB region is Singapore; implications of storing Israeli financial PII there,
  and of any future move to the EU, are unresolved.
- No full inventory of every `service-role` call site with per-endpoint authorization review — 11 call
  sites exist as of this commit (§4); each needs its own check, not just the `server-only` guard.
- Public document share links: 90-day TTL exists, no revoke mechanism, no explicit review of what
  happens on accidental sharing.
- CSP is Report-Only, not Enforce.
- No documented retention/deletion policy split by data type.
- No verified backup/restore drill, RPO/RTO.
- No incident-response runbook, audit logging, or monitoring/alerting for security events.
- No secrets/privileged-access/MFA policy documented.
- No signed DPA/subprocessor list for Vercel, Anthropic, Supabase, Resend.
- The repository is public and contains security runbooks and open-gap documentation — a security
  posture decision, not automatically a problem, but one nobody has explicitly signed off on.

## 6. Security audit policy

No individual reviewer — including a volunteer security professional — grants a general "this system
is secure" approval. Any engagement is scoped as:

1. Asset and data mapping.
2. Threat model.
3. Architecture and authorization review.
4. Findings list, ranked by severity.
5. Remediation actions and acceptance criteria.
6. Retest.
7. A residual-risk list the founders explicitly accept.

Required order: **map → fix known gaps → verify production → pentest → fix → retest.** A pentest alone
is never evidence the product is secure.

## 7. Tax Authority policy — two distinct tracks, both real, scope to CountMe unresolved

Two separate registration/approval tracks exist, confirmed independently (not from a single planning
doc):

- **Track A — מרשם תוכנות לניהול מערכת חשבונות ממוחשבת** (bookkeeping-software registry), governed by
  Instruction 36, Appendix H, §(c)(1). Active service today:
  [gov.il — registration service](https://www.gov.il/he/service/registration-software-designed-managing-computerized-accounting-system),
  cross-referenced by the [official FAQ](https://www.gov.il/he/pages/audiences-software-faq). No
  official source found stating this track was replaced or discontinued.
- **Track B — אישור תוכנות עזר להפקת דוחות שנתיים ונספחיהם** (approval for annual-report-preparation
  software), which explicitly names Form 1301:
  [gov.il — service page](https://www.gov.il/he/service/itc-registration-of-software-for-production-of-annual-reports).
  This is **not** limited in the official source to accounting-firm-grade software — that narrowing was
  an unsupported inference in an earlier draft of this document and is retracted.

**Open question, unresolved by any source found so far:** does a tool that only calculates, explains,
and tells the user what to copy manually — producing no official form, appendix, transmittable file, or
document presented as a tax return — fall under either track, both, or neither? The official source for
Track A states the approval concerns bookkeeping-record-keeping compliance, not calculation correctness;
that supports (but does not prove) an inference that a pure calculation aid sits outside both tracks.

**Exact question to send to the Tax Authority or a professional this week** (do not paraphrase away the
precision):

> האם מערכת אינטרנטית המסייעת ליחיד לחשב ולזהות אילו נתונים להעתיק ידנית לטופס 1301, אך אינה מפיקה
> את הטופס, נספח רשמי, קובץ לשידור או פלט המוצג כדוח מס, חייבת באישור תוכנת עזר להפקת דוחות שנתיים,
> ברישום תוכנה לניהול מערכת חשבונות ממוחשבת, בשניהם, או באף אחד מהם?

Until a written answer (E or O level) exists: no public commercial launch of any 1301-adjacent paid
capability, and no claim that either track applies or doesn't.

## 8. Incorporation / ID blocker policy

An expired ID for one founder blocks filings that require that specific founder's valid ID — company
registration (A1), the tax files that require a ח.פ. (A2), and IP assignment execution (A3) that names
the corporate entity. It does **not** block, and work continues in parallel on:

- Founders' agreement drafting and IP assignment language (signature pending only).
- Incorporation document preparation.
- Tax Authority track research (§7).
- Regulatory feature-mapping.
- Security review.
- DPA and vendor-terms preparation.
- Open Banking vendor conversations (role division, not contract signature).
- Trademark/name search.
- Technical gap remediation.

Do not describe an entire chapter as blocked when only one filing inside it needs a valid ID. Before
concluding B1/Track A filing is blocked on incorporation, check officially whether that specific filing
requires a registered legal entity or can be filed by an individual/sole proprietor first.

## 9. Open Banking policy

Using a licensed third-party API provider is the preferred MVP path, but it does not automatically
exempt CountMe from Israel's Financial Information Service Law (חוק שירות מידע פיננסי, תשפ"ב-2021). No
public contractual precedent was found that lets us safely assume an agent/reseller/white-label
structure is licence-exempt — this must be settled contractually per vendor, not assumed from a general
pattern.

Three structures to evaluate per candidate vendor, least to most regulatory exposure:

1. **Vendor is the direct provider to the end user; CountMe is an interface/distributor.**
2. **CountMe is a technology contractor to the licensed vendor**, who remains the regulated
   service-owner and bears the regulatory responsibility.
3. **CountMe receives raw API access and provides the service itself** — highest exposure, likely
   approaches the licensing threshold.

Before any real-bank-data integration, obtain in writing from each candidate vendor:

- A regulatory role-division diagram.
- Who is defined as the service provider to the customer.
- Who presents and collects the customer's consent.
- Whether the customer contracts directly with the licensed vendor.
- Whether CountMe receives raw banking data or only processed output.
- A signed DPA and security addendum.
- Liability allocation for a security incident, complaint, or authorization-revocation.
- The vendor's written confirmation that the proposed structure is permitted under its own license.
- CountMe's right to exit and delete/port data if the vendor loses its license.

Selling an independent Open Banking API in the future is a separate regulated line of business — its
own business case, licensing, capital, insurance, corporate governance, and security infrastructure. It
is not an assumed extension of the MVP roadmap.

## 10. Privacy / DPO policy

No blanket 10,000-user threshold triggers a DPO requirement. The actual statutory basis is §17ב1(א) to
the Privacy Protection Law, four separate grounds:

1. A public body, or a holder of a public body's database.
2. A database whose primary purpose is collecting information for transfer to others as a business or
   for consideration, holding data on more than 10,000 people.
3. Core activity involving systematic, large-scale ongoing monitoring of individuals.
4. Core activity involving processing of specially-sensitive information at a large scale.

10,000 is a real number, but only under ground (2) — trade/transfer-of-information purpose. It is not a
safe harbor for a company processing sensitive financial data or doing systematic monitoring under
grounds (3)–(4), which carry no single numeric threshold (factors include population share, data
type/volume, frequency/duration, retention period, geographic scope — see the official Amendment 13 FAQ
and the Privacy Protection Authority's own assessment tool).

Working rule for CountMe: 10,000 users is an internal review trigger, not a legal exemption until
reached. Before a wide beta, explicitly assess applicability of §17ב1(א)(3)–(4) given that the product
processes financial data as its core function — and document the assessment even if the conclusion is
"no DPO required yet."

## 11. Google OAuth policy — corrected 2026-09-01, verified against Google's own source twice

As of the current code, the app requests only `openid`, `userinfo.email`, `userinfo.profile`
(`src/app/login/login-form.tsx`, `provider: "google"`, no custom scopes).

**Verified fact (O-level, confirmed independently twice against
[Google's "Manage App Audience" support page](https://support.google.com/cloud/answer/15549945?hl=en)):**
an app in Testing publishing status requesting only that scope subset is explicitly exempted from the
100-test-user cap — users do not need to be on the test-user list, see no testing warning, and their
authorization does not expire after 7 days. This is a real, documented exception, not an inference.

**Policy:** the 100-user Testing-status cap is **not** currently a scaling blocker for CountMe, given
the current scope request. This will be reconfirmed by checking the actual OAuth consent screen
configuration in Google Cloud Console (publishing status, exact scopes, authorized domains/redirect
URLs, brand verification requirements) before external beta — not because the cap is expected to apply,
but because config drift is possible and this is cheap to check directly. **Adding any scope beyond this
basic-identity subset reopens this entire check** — the exemption is scope-specific.

Moving to "In production" status is still worth doing before public launch for branding, reliability,
and configuration-hygiene reasons — just not because of the user-count cap.

## 12. Consumer Protection Law — continuous-transaction cancellation

Exact citation: §13ד(ג), Consumer Protection Law (חוק הגנת הצרכן, as amended). A continuous-transaction
contract ends within 3 business days of the cancellation notice (6 business days if sent by registered
mail), unless the consumer requests a later date; billing and service must stop at that end date.

This does **not** mean the consumer may only cancel within 3 days of purchase — that was an earlier
imprecise framing, now retracted. Distance-sale cancellation rules and any additional cooling-off period
specific to CountMe's actual subscription structure remain to be checked separately before billing goes
live.

## 13. Definition of "blocker"

A task is classified a blocker only when all of the following can be stated:

1. Which specific deliverable cannot proceed.
2. The exact reason.
3. The evidence for the block.
4. Who can remove it.
5. Which parallel work can still proceed.

Never mark an entire chapter blocked when only one filing inside it is actually blocked.

## 14. Launch stages — never say "launch" without naming one

- Demo with synthetic data.
- Closed beta, free, known users.
- External free beta.
- Paid 1301 assistant, no transmission.
- Official report/appendix/file production.
- Invoice and receipt issuance.
- Open Banking via a third-party vendor.
- Independent Open Banking service.

Each stage has its own gate. Clearing one stage's gate does not clear the next stage's.

## 15. Minimum conditions before using real financial data (closed beta)

- RLS and schema verified in production.
- Critical authorization gaps closed.
- Basic data map and PII minimization in place.
- Privacy policy and collection notice ready.
- Required vendor agreements (DPAs) in place.
- Backup and restore tested.
- Basic incident-response plan.
- Monitoring and alerting.
- A resolved answer for the public document-link exposure (§5).
- Retention/deletion decision made.
- Security reviewer sign-off on the P0/P1 items scoped for this stage.

Before charging money, additionally: an active legal entity, terms of service, cancellation flow,
invoicing, support channel, complaint process, and a resolved regulatory answer for the specific paid
capability being sold (§7).

## 16. Document update rule

Every task/status item states: description, owner, relevant launch stage, dependency, target, status,
evidence level, link to commit/test/official source, last-verified date, acceptance criteria.

An old TODO not checked against the current commit is not evidence of a gap. A commit not verified
against the live environment is not evidence of production completion.

## 17. Claims the team may not make yet

Until the matching evidence exists, do not say:

- "The product is approved by the Tax Authority."
- "We are an approved software house."
- "Open Banking via a vendor exempts us from licensing."
- "All RLS is active and verified."
- "The system is secure."
- "We passed a pentest, so we can launch."
- "Google limits us to 100 users." *(retracted 2026-09-01 for the current basic-scope config — see §11;
  reinstate this warning immediately if scopes change.)*
- "DPO is only required above 10,000 users."
- "All migrations are running in production."
- "Account deletion enables/requires deleting all data."
- "JSONB is a scaling blocker."
- "EY is a distribution channel" — before a measurable funnel or agreement exists.

The permitted phrasing is always scoped and evidenced, e.g.: "This capability is implemented in code as
of commit X, not yet verified in production," or "This question is under legal review, no answer yet."

## 18. Open questions requiring outside input (O/E level — not closeable by either AI alone)

1. Written answer from the Tax Authority or a tax professional to the exact question in §7.
2. Confirmation whether Instruction 36 / Appendix H (Track A, §7) has been superseded by any 2025 circular
   — a private-site PDF reference (`hoz26032025.pdf`) was found but not traced to an identifiable,
   numbered official circular; treat as unconfirmed, not as evidence of replacement.
3. Per Open Banking vendor: the role-division answers listed in §9 — these come from the vendor's actual
   contract and architecture, not from either AI's research.
4. Distance-sale cancellation period specific to CountMe's actual subscription flow, on top of §12.
5. A qualified opinion on whether any current repository-security-disclosure posture (public repo
   containing open-gap documentation, §5) needs to change before wider use.
