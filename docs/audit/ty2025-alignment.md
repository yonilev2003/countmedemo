# Tax-Year 2025 alignment pass — June 2026

**Branch:** `claude/ty2025-alignment` · **Date:** 2026-06-10 · **Calibration target:** **TAX YEAR 2025** (the pilot files the 2025 annual return). Goal: lock every value on the 2025 path to the confirmed 2025 figure, resolve the now-adjudicated `TODO(Roy)`/`FLAG(Roy)` markers, and ensure no 2024 or 2026 value leaks into 2025.

Builds on the prior audit (`docs/audit/regulatory-accuracy-2026-06.md`); read that first for the credit-point / B"L-credit / brackets work. This pass is **2025-only** — 2026 caps/rates are explicitly **out of scope** and remain flagged.

Gates: `npx tsc --noEmit` ✓ and `npm run build` ✓ both clean.

---

## Authoritative decisions applied/confirmed (not relitigated)

| Item | Decision | Where wired |
|---|---|---|
| Form 6111 threshold | **256,410 ₪ (ex-VAT)** — CONFIRMED for our ex-VAT turnover comparison (≈300,000 incl-VAT at 18% = 254,237; same magnitude). Resolved the FLAG → CONFIRMED. | `TAX_YEAR_2025.form6111Threshold`, meta `effectiveTaxYears:[2024,2025]` |
| Miluim tiers | **30 / 40 / 50 days → 0.5 / 0.75 / 1.0** for 2025–2027. NOT changed to 20/45/60 (that's 2028+/special-grant). | `MILUIM_CREDIT_TIERS_2026` (unchanged) |
| B"L 52% deduction | Applies to the **B"L component only, NOT health tax**. Existing split kept; health never deducted. | `field030BituachLeumi`, `computePersonalDeductions` |
| Osek types | זעיר / פטור / מורשה (no חברה בע"מ, no "עוסק מורשה זעיר"). | `OsekTypeChoice` (unchanged) |

### Confirmed 2025 constants (verified wired under `TAX_YEAR_2025`)

| Constant | 2025 value | Status |
|---|---|---|
| Keren cap / income ceiling | 13,203 / 293,397 | CONFIRMED (frozen) |
| עוסק פטור/זעיר ceiling | 120,000 | CONFIRMED (frozen; 122,833 from 2026) |
| VAT standard rate | 18% | CONFIRMED |
| B"L reduced-rate bracket | 7,522 ₪/mo (= 90,264/yr) | CONFIRMED |
| B"L max insurable | 49,030 ₪/mo (= 588,360/yr) | CONFIRMED |
| B"L reduced total rate (`blRate1`) | **7.12%** = 3.89% B"L + 3.23% health | CONFIRMED — **changed 0.0597 → 0.0712** |
| B"L full total rate (`blRate2`) | **17.83%** = 12.83% B"L + 5.00% health | CONFIRMED (value unchanged) |
| Credit-point value | 2,904 ₪/yr | CONFIRMED (frozen 2025–2027) |
| Surtax threshold | 721,560 | CONFIRMED (frozen 2025–2027) |
| Brackets + resident points | 2024 = 2025 | CONFIRMED FROZEN |

> **Dormancy note:** `blRate1`/`blRate2`/`blMonthlyThreshold1`/`blMonthlyMax` are **defined but not consumed by any calculator** (verified by grep). The 030/137 calcs and the tax estimate deduct 52% of the persona's *paid* B"L figure (`bituachLeumiSelfEmployed.annualPaid`), per the decision. `blRate1` was still updated to the confirmed 2025 reduced rate and annotated with the B"L/health split so the "52%-on-B"L-only" intent is documented in the constants.

---

## What changed

**`lib/calculators/types.ts`**
- `TAX_YEAR_2025`: `blRate1` 0.0597 → **0.0712**; added the B"L/health split documentation (3.89%+3.23% reduced, 12.83%+5.00% full) and the σעיף-47א "B"L component only" intent.
- Resolved `TODO(Roy)` → **CONFIRMED** on `blMonthlyThreshold1` (7,522 = 90,264/yr) and `blMonthlyMax` (49,030 = 588,360/yr).
- Resolved the Form-6111 `FLAG(Roy)` → **CONFIRMED 256,410 ₪ (ex-VAT)** with the incl-VAT reconciliation in-comment.
- Pension caps (25,608 / 12,804): `TODO(Roy)` → **`FLAG(Roy)`** with an explicit "no owned skill confirms the 2025 indexed value — carried at 2024" note (kept flagged per instruction).
- Rewrote the `TAX_YEAR_2025` block docstring to a status legend (FROZEN / CONFIRMED / STABLE / FLAG) and marked it the calibration target.
- Updated stale `TAX_CONSTANT_META` entries to `effectiveTaxYears:[2024,2025]` + `lastVerified 2026-06-10` for the confirmed-stable constants (form6111, kerenRate, B"L deductible rate, osekZeir rate+threshold, resident points, surtax rate). `pensionDeductionCap` meta left at `[2024]` with a FLAG pointer.
- File header: replaced the "default to year 2024" note with the year-keyed / 2025-calibration framing.
- `TAX_YEAR_2026` form-6111 comment: basis adjudicated; value marked carried/out-of-scope (NEEDS-ROY).

**`app/setup/page.tsx`** (year default only)
- `selectedYear` default **2024 → 2025** (the "provisional" reasoning is obsolete). `AVAILABLE_TAX_YEARS = [2024, 2025]` unchanged (2024 stays selectable).
- The 2025 selector note no longer says "all 2025 data is provisional" (false now) — narrowed to "values confirmed; only pension deduction caps pending," and de-emphasised from a `due`-coloured warning to a muted note.

**`personas/dana-cohen.json`** (year only)
- `income.year` **2024 → 2025** so the dashboard / P&L / tax-estimate all compute on 2025 constants. Verified the star fields are identical 2024↔2025 for Dana (brackets/caps/points frozen; VAT doesn't enter the star fields), so the demo numbers stay stable; only invoice-generation VAT would differ (17%→18%).
- Fixed two stale/incorrect `_note` strings: keren note said "7.5% … cap 19,920" (**wrong** — it's 4.5%, cap 13,203); B"L note said "rest is tax credit" (**wrong** — the 48% earns no credit, per prior audit). Updated `_comment` to state tax-year 2025 + that calcs use the aggregates.

**`lib/persona.ts`**
- Documented `bituachLeumiSelfEmployed.annualPaid` as the **B"L component only** (base for the 52% deduction), with a FLAG + recommended `{bituachLeumi, healthTax}` split if real data bundles health tax. No logic change (the deduction base is correct as-is).

**`lib/p-and-l/expense-ratio.ts`** (broad cross-check finding — real fix)
- `computeExpenseRatio` was using the **hardcoded** module constants `ZEIR_RECOGNITION_RATE = 0.30` and `ZEIR_REVENUE_CEILING = 120_000`. Now resolves both **per tax year** from `getTaxYearConstants(persona.income.year)` (`osekZeirExpenseRate`, `osekZeirThreshold`). Without this, a 2026 persona would silently see the 120,000 ceiling instead of 122,833. The exported constants are retained as a documented 2024–2025 baseline (their only consumers were internal).

**`lib/alerts/ceiling.ts`** — header comment said "2024 ceiling: 120,000"; rewritten to state it's read per-year (120,000 for 2024–2025, 122,833 from 2026). Code was already year-keyed.

**`lib/calculators/index.ts`** — field-297 header comment "(2024)" → "(2024–2025; read from year constants)".

**`lib/form-1301/schema.ts`** (user-facing hints)
- Keren hint said "תקרה **19,920 ₪** לשנה 2024" — **wrong figure**; corrected to "תקרת ניכוי מוכר **13,203 ₪**, 2024–2025".
- עוסק-פטור hint "לשנת 2024: 120,000" → "לשנים 2024–2025: 120,000 (122,833 מ-2026)".

---

## Broad 2025 cross-check — result

Swept `lib/regulatory/deductions.ts`, `lib/p-and-l/**`, `lib/business-expenses/**`, `lib/alerts/ceiling.ts`, `lib/deadlines/**`, the calculators, and the API routes for hardcoded rates/caps/years that should come from `getTaxYearConstants`.

- **Clean (already year-keyed):** `deductions.ts`, `business-expenses/profiles.ts`, `p-and-l/israeli-report.ts`, `p-and-l/index.ts`, `alerts/ceiling.ts` (code), `invoice-generator` (VAT), `api/chat`, `api/coach`. VAT is read from `vatRate` everywhere.
- **Fixed:** the `expense-ratio.ts` hardcoded זעיר rate + ceiling (above).
- **Intentionally left:** `deadlines/calendar.ts` references 122,833 (2026) and 500K detailed-VAT in *deadline notes* — these are correct, year-explicit calendar facts, not the 2025 calc path. `api/coach` "תיקון 257 … 2024" is a law-enactment year, not a tax-year value. Schema header "tax year 2024" is provenance for which form version the field codes were transcribed from (correct).

---

## NEEDS-ROY (still unconfirmed — do NOT treat as verified)

1. **2025 pension deduction caps** — `pensionDeductionCap 25,608` / `pensionCreditCap 12,804`. No owned skill (`israeli-tax-returns/tax-brackets-credits.md`) states the 2025 indexed figure; carried at 2024 and **FLAGGED**. Confirm the official 2025 values. (Low demo impact: Dana's pension is keren/45A-bound below these caps.)
2. **Health-tax split in `bituachLeumiSelfEmployed.annualPaid`** — if a real persona's figure bundles health tax, the 52% deduction is slightly overstated. Recommended `{bituachLeumi, healthTax}` split documented in `persona.ts`. Not changed (would alter the deduction base).
3. **Miluim 30/40/50 vs skill's 20/45/60** — adjudicated to 30/40/50 for 2025–2027; the `israeli-tax-returns` skill doc still lists 20/45/60 (the 2028+ schedule). Confirm against the enacted תיקון 283 text. Also needs a UI input for `combatReserveDays` (only relevant from 2026 anyway).
4. **2026 figures are OUT OF SCOPE here.** `TAX_YEAR_2026` keeps its own FLAGs (keren caps, pension caps, B"L self-employed rates `blRate1/blRate2`, form6111 ex-VAT value). This pass did not verify or change 2026 values — see `regulatory-accuracy-2026-06.md` NEEDS-ROY #2–4.
5. **Out-of-scope UI follow-ups** (unchanged from prior audit): dashboard "הכנסה חייבת (שדה 150)" relabel; demo "זיכוי ב"ל 48%" row removal; setup credit-point estimate → `totalCreditPoints`. These are UI-track and were not in this pass's file scope.
