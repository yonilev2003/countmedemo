/**
 * Reviewable-item registry — the "cards" the /admin/review Tinder-style UI
 * shows one at a time (CPA-BNG collaboration round, 2026-09-08). Pure,
 * synchronous, no I/O: reads the same code paths the product already runs
 * (TAX_CONSTANT_META, getDeductionsTable, EITAN_KNOWLEDGE) so a card can
 * never show a value the engine doesn't actually use.
 *
 * Three axes, kept deliberately separate (see memory/decisions.md, the
 * Evidence/Review/Release entry added this round):
 *   - Evidence  (confidenceTier)  — lives in code, set by whoever wrote the
 *     constant. This module only READS it.
 *   - Review    (approved/change_proposed/needs_info/skipped) — lives in the
 *     review_decisions table (Supabase), keyed by this item's id + contentHash.
 *   - Release   — computed by the API route from Review history vs the
 *     current contentHash (a value change invalidates a prior approval).
 *
 * This module does NOT create a second source of truth for tax values: every
 * `currentValue` string is rendered directly from the live constants, never
 * duplicated/hand-copied.
 */

import { createHash } from "crypto";
import {
  getTaxYearConstants,
  TAX_CONSTANT_META,
  MILUIM_CREDIT_TIERS_2026,
  MILUIM_CREDIT_POINT_VALUE,
  MILUIM_CREDIT_FIRST_YEAR,
  type ConfidenceTier,
} from "@/lib/calculators/types";
import { getDeductionsTable } from "@/lib/regulatory/deductions";
import { EITAN_KNOWLEDGE } from "@/lib/agent/knowledge";

export type ReviewItemKind = "rule" | "deduction" | "answer";

export interface ReviewableItem {
  /** Stable across content changes — a value edit changes contentHash, not id. */
  id: string;
  kind: ReviewItemKind;
  label: string;
  year?: number;
  /** Human-rendered current value/table — always derived live, never hand-copied. */
  currentValue: string;
  confidenceTier: ConfidenceTier;
  sourceUrl?: string;
  publisher?: string;
  effectiveTaxYears?: number[];
  /** Form fields / pages / reports that consume this item. */
  consumers: string[];
  /** Changes when currentValue/confidenceTier/consumers change — invalidates prior approvals. */
  contentHash: string;
  notes?: string[];
}

function hashOf(...parts: (string | number | undefined)[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

const nis = (n: number) => `${n.toLocaleString("he-IL")} ₪`;
const pct = (r: number) => `${Math.round(r * 1000) / 10}%`;

/** Scalars covered by TAX_CONSTANT_META, rendered for a specific tax year. */
function scalarItems(year: number): ReviewableItem[] {
  const TC = getTaxYearConstants(year) as unknown as Record<string, unknown>;
  return Object.entries(TAX_CONSTANT_META).map(([name, meta]) => {
    const raw = TC[name];
    const value = typeof raw === "number" ? raw : null;
    const currentValue =
      value === null
        ? "(אין ערך לשנה זו)"
        : name.toLowerCase().includes("rate") || name.toLowerCase().includes("percent")
          ? `${pct(value)} — ${value}`
          : nis(value);
    return {
      id: `rule:${name}`,
      kind: "rule",
      label: meta.description,
      year,
      currentValue,
      confidenceTier: meta.confidenceTier,
      sourceUrl: meta.sourceUrl,
      publisher: meta.publisher,
      effectiveTaxYears: meta.effectiveTaxYears,
      consumers: ["lib/calculators/types.ts"],
      contentHash: hashOf(name, currentValue, meta.confidenceTier, year),
    };
  });
}

/** Income tax brackets for a given year — one card, full table + boundary check. */
function taxBracketsItem(year: number): ReviewableItem {
  const TC = getTaxYearConstants(year);
  const rows = TC.taxBrackets
    .map((b) => `${nis(b.from)}–${b.to === Infinity ? "ומעלה" : nis(b.to)}: ${pct(b.rate)}`)
    .join(" · ");
  // Continuity check: each bracket's `to` must equal the next bracket's `from`.
  const continuous = TC.taxBrackets.every(
    (b, i) => i === 0 || b.from === TC.taxBrackets[i - 1].to,
  );
  return {
    id: "rule:taxBrackets",
    kind: "rule",
    label: `מדרגות מס הכנסה, שנת ${year}`,
    year,
    currentValue: rows,
    confidenceTier: "strongly_supported",
    consumers: ["grossIncomeTax", "estimateTaxLiability", "p-and-l/israeli-report.ts"],
    contentHash: hashOf("taxBrackets", rows, year),
    notes: continuous
      ? undefined
      : ["⚠ אי-רציפות בין מדרגות — בדוק גבולות (from/to) לפני אישור"],
  };
}

/** Child credit-points-by-age table — one card (identical across 2024–2026 today). */
function childCreditPointsItem(year: number): ReviewableItem {
  const TC = getTaxYearConstants(year);
  const c = TC.childCreditPointsByAge;
  const currentValue = [
    `שנת לידה: ${c.bornDuringYear}`,
    `1-2: ${c.age1to2}`,
    `3: ${c.age3}`,
    `4-5: ${c.age4to5}`,
    `6-17 (אם/המגיש/ה אישה): ${c.age6to17Mother}`,
    `6-17 (אב/המגיש זכר): ${c.age6to17Father}`,
    `18: ${c.age18}`,
  ].join(" · ");
  return {
    id: "rule:childCreditPointsByAge",
    kind: "rule",
    label: `נקודות זיכוי לילדים לפי גיל, שנת ${year}`,
    year,
    currentValue,
    confidenceTier: "strongly_supported", // risk-gap.md §7.4 #1 — from-2024 table applied, not yet CPA-confirmed
    consumers: ["totalCreditPoints", "field-020..068 credit calculators"],
    contentHash: hashOf("childCreditPointsByAge", currentValue, year),
    notes: [
      "FLAG(Roy): מיפוי אמא/אבא→מגדר-המגיש/ה טרם אושר — ראו risk-gap.md §7.4 #1",
    ],
  };
}

/** Miluim (reserve-duty) credit-point ladder — single item, year-gated from 2026. */
function miluimItem(year: number): ReviewableItem {
  const applicable = year >= MILUIM_CREDIT_FIRST_YEAR;
  const currentValue = applicable
    ? MILUIM_CREDIT_TIERS_2026.map((t) => `${t.minDays}+ ימים: ${t.points} נק'`).join(" · ") +
      ` · +0.25 כל 5 ימים מעל 50, תקרה 4.0 · שווי נקודה ${nis(MILUIM_CREDIT_POINT_VALUE)}`
    : `לא רלוונטי לשנת ${year} (הזיכוי חל רק משנת מס ${MILUIM_CREDIT_FIRST_YEAR})`;
  return {
    id: "rule:miluimCreditTiers",
    kind: "rule",
    label: `מדרגות זיכוי מילואים (תיקון 283), שנת ${year}`,
    year,
    currentValue,
    confidenceTier: "strongly_supported", // formula cross-checked vs. law (risk-gap.md §8 #5); document sourcing itself is tier-2
    consumers: ["field-miluim-credit", "totalCreditPoints"],
    contentHash: hashOf("miluimCreditTiers", currentValue, year),
  };
}

/** One card per DeductionDef for the given year. */
function deductionItems(year: number): ReviewableItem[] {
  return getDeductionsTable(year).map((d) => {
    const parts = [`חוק: ${d.rule}`];
    if (d.ratePercent != null) parts.push(`שיעור: ${d.ratePercent}%`);
    if (d.capNis != null) parts.push(`תקרה: ${nis(d.capNis)}`);
    if (d.depreciationYears != null) parts.push(`פחת: ${d.depreciationYears} שנים`);
    return {
      id: `deduction:${d.id}`,
      kind: "deduction" as const,
      label: d.he,
      year,
      currentValue: parts.join(" · "),
      // Deductions are resolved FROM the year constants — inherit strongly_supported
      // unless a specific constant behind them is flagged unverified elsewhere.
      confidenceTier: "strongly_supported" as ConfidenceTier,
      consumers: [...d.formFields.map((f) => `שדה ${f}`), d.plImpact, d.skill],
      contentHash: hashOf(d.id, parts.join(" · "), year),
    };
  });
}

/** One card per EITAN_KNOWLEDGE Q&A — the "answer" card type (section 5, type 2). */
function answerItems(): ReviewableItem[] {
  return EITAN_KNOWLEDGE.map((e) => ({
    id: `answer:${e.id}`,
    kind: "answer" as const,
    label: e.question,
    currentValue: e.answer,
    // EITAN_KNOWLEDGE's own draft/verified flag IS this item's evidence tier —
    // not a second source of truth, just read directly (see file's own doc
    // comment: "every answer is DRAFT — pending Roy's verification").
    confidenceTier: e.status === "verified" ? "strongly_supported" : "unverified",
    consumers: ["src/app/api/coach/route.ts (שקל)", "src/app/api/chat/route.ts"],
    contentHash: hashOf(e.id, e.answer, e.status),
  }));
}

/**
 * Full reviewable-item list for a tax year. Deterministic, side-effect-free —
 * safe to call on every API request (no caching needed at this scale: ~40-60
 * items, sub-millisecond to build).
 */
export function listReviewableItems(year: number): ReviewableItem[] {
  return [
    ...scalarItems(year),
    taxBracketsItem(year),
    childCreditPointsItem(year),
    miluimItem(year),
    ...deductionItems(year),
    ...answerItems(),
  ];
}
