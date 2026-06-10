# Regulatory / tax-accuracy audit — June 2026

**Branch:** `claude/reg-accuracy` · **Date:** 2026-06-10 · **Scope (strict):** `lib/calculators/**`, `lib/p-and-l/**`, and this doc. (`lib/regulatory/**` reviewed — no change needed.) Out-of-scope files (`app/**`, `components/**`, `lib/persona.ts`, `lib/form-1301/schema.ts`) were intentionally **not** edited; the calculators read the two new optional persona fields via a local cast rather than widening the shared `Persona` type. Follow-ups for those files are in "NEEDS ROY/USER".

Triggered by real user testing (tax year 2025). Every figure below was checked against the owning `israeli-*` Skill and/or an official/authoritative source. **Figures I could not confirm are FLAGGED, not guessed** (see "NEEDS ROY/USER" at the end). Gates: `npx tsc --noEmit` ✓ and `npm run build` ✓ both clean.

The four authoritative Skills consulted: `israeli-vat-reporting`, `israeli-tax-returns`, `israeli-bituach-leumi`, `israeli-expense-categorizer`.

---

## Issue 1 — עוסק פטור / עוסק זעיר ceiling (user thought 120,000 was too low)

**Finding:** The displayed **120,000 ₪ is CORRECT for 2025.** The user conflated a *2026* change with 2025.

**Authoritative figures + source:**
| Year | Ceiling | Source |
|---|---|---|
| 2024 | **120,000 ₪** | `israeli-vat-reporting` (ref: "~120,000, updated periodically") + kolzchut/greeninvoice/cpa-ea |
| 2025 | **120,000 ₪** (frozen, unchanged) | same — multiple Israeli accounting sources explicitly state 2024–2025 = 120,000 |
| 2026 | **122,833 ₪** (first CPI-indexed year) | greeninvoice / cpa-ea / kolzchut; also `israeli-expense-categorizer` ("122,833 for 2026") and already in `lib/deadlines/calendar.ts` |

**What I changed:** Resolved the `CARRIED→TODO(Roy)` markers on `osekPaturThreshold`/`osekZeirThreshold` for 2024+2025 to **CONFIRMED 120,000** (`lib/calculators/types.ts`). Added explanatory provenance comments. Updated `TAX_CONSTANT_META.osekPaturThreshold` `effectiveTaxYears` → `[2024,2025]` and `lastVerified` → 2026-06-10. **No value change** — the code was already right; the uncertainty is removed. (`lib/alerts/ceiling.ts` already reads the ceiling by year via `getTaxYearConstants`, so it auto-corrects per year; only its header comment is stale — left untouched as it's outside the strict scope. Refresh when convenient.)

---

## Issue 2 — Discharged-soldier credit-point over-count (got 4.25, should be ~3.25)

**Finding (root cause):** The discharged-soldier credit was modelled wrong in TWO places, and the math constant was broken.

Authoritative rule (`israeli-tax-returns` + kolzchut, סעיף 67/39א): a discharged soldier earns **1/6 of a credit point per ELIGIBLE MONTH** for full service (men 23+ months, women 22+ months) — i.e. **2 points for a full eligibility year** — over the **36 months** from the month after discharge. Partial qualifying service (12–22 months) earns **1/12 point per month** (1 point/year). The discharge year and the year the window closes are **prorated** by eligible months in the year (חישוב יחסי). Source: kolzchut + multiple CPA/refund sites, verified 2026-06.

**The bugs:**
- `types.ts` had `soldierFractionPerMonth: 1 / 6 / 36` ≈ 0.0046 — it divided the monthly fraction by the 36-month window, collapsing the entire benefit to a rounding error (≈0.06 pts/full year).
- `estimateTaxLiability` used an ad-hoc inline sum: flat `+0.5` for any soldier (wrong magnitude) **and** a child-points bug (`children.length × (anyChild1to5 ? 2.5 : 1.0)` — multiplied *all* children by 2.5 if *any* child was 1–5).
- The setup wizard (UI track) used `+1` flat — also not prorated.

**What I changed (`lib/calculators/index.ts`):**
- New shared, correctly-prorated credit-point helpers: `residentCreditPoints`, `soldierCreditPoints` (+ `soldierEligibleMonthsInYear` proration), `childCreditPoints` (per-child by age), `newOlehCreditPoints`, and a single aggregator **`totalCreditPoints(persona)`** now used by the tax estimate — ONE source of truth.
- Rewrote `field068Soldier` to return the actual prorated point count with the per-month fraction + eligible-month breakdown, and to surface assumptions when the discharge date / service length are missing.
- Fixed `soldierFractionPerMonth` → `1/6`, added `soldierReducedFractionPerMonth = 1/12`, `soldierFullServiceMonthsMale = 23`, `soldierFullServiceMonthsFemale = 22` (2024, 2025, 2026 blocks).
- The full-vs-partial rate uses an optional `personal.soldierServiceMonths` field, **read via a local cast in the calculator** (the shared `Persona` type is out of scope — see "NEEDS ROY/USER #6"). Absent ⇒ assume full service, noted in the field output.

**Verified numerically** (matches the issue exactly):
- Male, discharged 2025-06-30, **tax year 2025** → 6 eligible months × 1/6 = 1.0 → resident 2.25 + 1.0 = **3.25** ✓ (the target)
- Male, full eligibility year → 12 × 1/6 = 2.0 → **4.25** (explains the old "4.25" when a full year was assumed)
- Window-closing year (discharged 2023-03-31, TY2026) → 3 months × 1/6 = 0.5 (proration both ends works)

---

## Issue 3 — Miluim (reserve duty) not captured

**Finding:** A miluim **income-tax credit-point** benefit exists (תיקון 283, approved by the Knesset **2026-11-19**) but applies **only from tax year 2026** — there is **NO miluim credit for tax year 2025 or earlier**. So for the app's current 2025 default, the correct value is **0**.

Authoritative tiers for **tax years 2026–2027** (for combat reserve days served in 2025/2026), CONFIRMED 2026-06 (Knesset press release + multiple CPA firms): **30–39 days → 0.5 pt · 40–49 days → 0.75 pt · 50+ days → 1.0 pt.** Self-employed combat reservists are eligible. From **2028** the day-thresholds drop (min 20 days) with a different schedule — not modelled.

> Note: the `israeli-tax-returns` Skill doc lists "from 2026: 0.5 for 20+, 0.75 for 45+, 1.0 for 60+". That appears to mix the **2028+** thresholds with the 2026 start year. The Knesset + CPA sources for the **first applicable years (2026–2027)** give **30/40/50 days**, which I used. **Flagged for Roy to confirm against the enacted text.**

**What I changed:** This benefit is "clearly defined by the skill" for 2026, so I added the **calc scaffold (lib only)**:
- `miluimCreditPoints(year, days)` + `MILUIM_CREDIT_TIERS_2026` + `MILUIM_CREDIT_FIRST_YEAR` in `types.ts` (returns 0 before 2026).
- `fieldMiluimCredit` calculator + `field-miluim-credit` registry entry (explains "not relevant before 2026" for 2025).
- Wired into `totalCreditPoints` (so it counts from 2026).
- Reads an optional `personal.combatReserveDays` field **via a local cast in the calculator** (shared `Persona` type out of scope).

**UI capture of reserve days is a separate track** (the UI agent owns the input field) — documented here, not built.

---

## Issue 4 — Field 150 / tax-estimate oversimplified; recognized deductions

**Finding:** Two distinct problems.

1. **Field 150 itself is business income** (מיגיעה אישית מעסק), correctly = revenue − recognised business expenses (or 70% of turnover for עוסק זעיר). The recognised personal items (keren/pension/B"L) are NOT deducted *in* field 150 — they reduce taxable income via *other* form fields. So field 150's value was right; I only **clarified its notes** to say it's pre-personal-deductions and point to where those land.

2. **The tax-estimate path** had a real accuracy bug: it credited a **non-existent "48% Bituach-Leumi tax credit"**. Per סעיף 47א (verified 2026-06: claltax / prisha / kolzchut), **only 52% of B"L paid is a deduction-from-income; the remaining 48% is NOT recognised — not as a deduction and not as a credit.** Crediting it substantially understated tax. It also omitted two *real* credits.

**Correct deduction/credit treatment (`israeli-tax-returns` Step 3.5 + credits table):**
| Item | Treatment | Where |
|---|---|---|
| Keren hishtalmut (self-employed) | **deduction from income** (4.5%, cap 13,203) | reduces taxable income |
| Bituach Leumi | **52% deduction from income** (סעיף 47א); other 48% = nothing | reduces taxable income |
| Pension §47 | **deduction from income** (≤11% of income, cap) | reduces taxable income |
| Pension §45A | **tax credit** (35% of ≤5.5% of income) | reduces tax, separate shekels from §47 |
| Donations §46 | **tax credit** (35%, min 200 ₪) | reduces tax (NOT a deduction) |

**What I changed (`lib/calculators/index.ts`):**
- Added canonical helpers `computeBusinessIncome`, `computePersonalDeductions`, `computeTaxableIncome`, `grossIncomeTax`.
- Rewrote `estimateTaxLiability`: uses `totalCreditPoints`; **removes the 48% B"L credit (now 0)**; **adds** `donationsCredit` (§46) and `pensionCredit` (§45A). Added `pensionCredit`/`donationsCredit` to the `TaxEstimate` type; `blCredit` retained at 0 and `@deprecated` for back-compat.
- Rewrote `field048BituachLeumiCredit` (the fabricated "48% credit" field) to return 0 and state plainly that no such credit exists; corrected misleading "48% → field 048" notes in `field030BituachLeumi`.

> The `demo/page.tsx` estimate card still renders a "זיכוי ביטוח לאומי — 48% (שדה 048)" row; it now reads 0. **Removing that row is a UI-track change** (flagged below).

---

## Issue 5 — Dashboard ↔ P&L "הכנסה חייבת" mismatch (62,200 vs 66,789)

**Finding (root cause):** Two surfaces were computing/labelling "taxable income" **differently**:
- **Dashboard** (`app/dashboard/page.tsx`, line ~327) shows `pl.netProfit` (= revenue − business expenses = **field-150 business income**) but **labels it "הכנסה חייבת (שדה 150)"** — which is self-contradictory (field 150 is business income, not taxable income).
- **P&L report** computed `taxableIncome = profitBeforeTax − personalDeductions`, where `personalDeductions` came from a **synthetic expense breakdown** (even-distribution fallback × recognizedRate) — a number that did **not** match the persona's real recognised deductions, so it diverged.

**What I changed (`lib/p-and-l/israeli-report.ts`):** the P&L now derives personal deductions and taxable income from the **canonical** `computePersonalDeductions` / `computeTaxableIncome` (the exact amounts the tax estimate uses), and rebuilds the deduction line-items from those recognised amounts so they sum exactly. Removed the local `estimateIncomeTax` (now uses canonical `grossIncomeTax`) to prevent bracket drift.

**Verified numerically** — P&L `taxableIncome` now `=== computeTaxableIncome` for Dana (171,051) and a low-revenue soldier persona (73,320). One definition, everywhere.

> **Residual UI item:** the dashboard's `pl.netProfit` is *business income* (field 150) and is correctly distinct from *taxable income*. The remaining fix is a **label** correction ("הכנסה חייבת (שדה 150)" → e.g. "הכנסה מעסק (שדה 150)") OR pointing the dashboard at the canonical taxable income. That's a UI-track edit (flagged below) — the **numbers** are now consistent at the lib layer.

---

## Issue 6 — Year handling (everything shows 2025)

**Findings + changes:**
- **2025 constants confirmed where a Skill/source gave a firm value:** עוסק פטור ceiling (120,000), keren cap (13,203) + income ceiling (293,397), surtax threshold (721,560, frozen through 2027), brackets + credit-point value (2,904, frozen) — all resolved from `CARRIED→TODO` to **CONFIRMED** with comments.
- **Added `TAX_YEAR_2026`** (registry + `LATEST_TAX_YEAR = 2026`; future-year fallback now → 2026). *Why:* today is **2026-06-10** and the registry previously returned 2025 constants for 2026 filings, silently showing stale figures. Two confirmed 2026 changes: עוסק פטור **122,833** (CPI-indexing began) and the **Economic Efficiency Law 2026** (approved 2026-03-30, retroactive to 2026-01-01) **expanded income-tax brackets 3–5** (per `israeli-tax-returns`: bracket 3 → 228,000, 4 → 301,200, 5 → 560,280). Brackets 1–2 & 6, surtax, and credit-point value stay frozen through 2027.
- **Should 2024 remain selectable?** Yes — keep it. It's the form-schema's documented reference year and a valid historical filing year (refunds claimable 6 years back per `israeli-tax-returns` §160). The registry still serves 2024 explicitly.

---

## NEEDS ROY / USER (unconfirmed — do NOT treat as verified)

1. **Form 6111 threshold basis.** `israeli-tax-returns` says the obligation triggers at turnover **> 300,000 ₪ INCLUDING VAT**, but our code compares against **ex-VAT** turnover (`income.totalRevenue`) using a legacy **256,410** figure of unconfirmed provenance. Decide the basis: (a) `300000` compared to VAT-inclusive turnover, or (b) ex-VAT `≈ 300000/1.18 ≈ 254,237` compared to ex-VAT. **Left at 256,410 with a FLAG** in `types.ts` (2024, 2025, 2026 blocks) — affects star-field 297 output, so I did not silently change it.

2. **2026 index-linked caps I could not independently confirm** (carried from 2025, FLAGGED in `TAX_YEAR_2026`): `kerenHishtalmutCap`, `kerenHishtalmutIncomeCeiling`, `pensionDeductionCap`, `pensionCreditCap`. These normally rise with indexing in 2026 — confirm the official 2026 values.

3. **2026 self-employed Bituach-Leumi rates.** `israeli-bituach-leumi` notes **Amendment 252** changed 2026 self-employed rates (reduced bracket ~7.7%, full ~18.0%) and the bracket boundary (7,703) / ceiling (51,910). I set the 2026 **thresholds** (7,703 / 51,910) but left `blRate1`/`blRate2` carried from 2025 with a FLAG — confirm the exact 2026 self-employed split before relying on B"L *amount* calcs. (Our 030/137 calcs use a *paid* figure from the persona, so this mainly matters if we ever compute B"L owed.)

4. **Miluim 2026 day-thresholds.** I used **30/40/50 days → 0.5/0.75/1.0** (Knesset + CPA sources for 2026–2027). The `israeli-tax-returns` Skill doc lists 20/45/60 (which looks like the **2028+** schedule). Confirm against the enacted תיקון 283 text. Also: miluim credit needs a **UI input** for combat reserve days (persona field `combatReserveDays` added; capture is UI-track).

5. **Health-tax (מס בריאות) inside `bituachLeumiSelfEmployed.annualPaid`.** The 52% deduction (סעיף 47א) applies to **B"L only, not health tax**. If the persona's `annualPaid` bundles health tax, the 52% deduction is slightly overstated. Consider splitting B"L vs health tax in the persona. (Modelling note, not changed.)

6. **Out-of-scope follow-ups (I could not touch `app/**`, `components/**`, `lib/persona.ts`, `lib/form-1301/schema.ts`):**
   - **`lib/persona.ts`:** promote the two optional fields the calculators now read via cast into `PersonaPersonal` proper: `soldierServiceMonths?: number | null` and `combatReserveDays?: number | null` (+ mirror in `personas/persona.schema.json`). Until then they're read defensively.
   - `app/dashboard/page.tsx` ~L327: relabel "הכנסה חייבת (שדה 150)" (it shows business income, not taxable income) **or** point it at canonical `computeTaxableIncome`.
   - `app/demo/page.tsx` ~L232: remove the "זיכוי ביטוח לאומי — 48% (שדה 048)" row (now 0; the credit doesn't exist); optionally add rows for the real §46 donations credit and §45A pension credit (`est.donationsCredit`, `est.pensionCredit`).
   - `app/setup/page.tsx` ~L586–590: the wizard's credit-point estimate is still ad-hoc (`+1` soldier flat, `+0.5`/child). Point it at the new `totalCreditPoints(persona)` for consistency, and add inputs for `soldierServiceMonths` + `combatReserveDays`.
   - `lib/form-1301/schema.ts` hints still say "2024" / "19,920" (keren) — schema is the form reference; refresh hints if desired (left as-is; outside the calc path).
