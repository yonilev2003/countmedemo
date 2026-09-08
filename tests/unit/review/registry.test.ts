/**
 * Golden tests — listReviewableItems() (the /admin/review card inventory).
 * Guards the invariants the review UI depends on: unique ids, every scalar in
 * TAX_CONSTANT_META surfaced, contentHash actually reflects a value change
 * (so a regulator update re-opens the item for review instead of silently
 * keeping a stale approval).
 */

import { describe, expect, it } from "vitest";
import { listReviewableItems } from "@/lib/review/registry";
import { TAX_CONSTANT_META } from "@/lib/calculators/types";

describe("listReviewableItems", () => {
  it("returns a non-empty list with unique ids", () => {
    const items = listReviewableItems(2026);
    expect(items.length).toBeGreaterThan(30);
    const ids = new Set(items.map((i) => i.id));
    expect(ids.size).toBe(items.length);
  });

  it("covers every TAX_CONSTANT_META scalar as a rule card", () => {
    const items = listReviewableItems(2026);
    const ruleIds = new Set(items.filter((i) => i.kind === "rule").map((i) => i.id));
    for (const name of Object.keys(TAX_CONSTANT_META)) {
      expect(ruleIds.has(`rule:${name}`)).toBe(true);
    }
  });

  it("includes the flagship rule/deduction/answer card kinds", () => {
    const items = listReviewableItems(2026);
    expect(items.some((i) => i.id === "rule:taxBrackets")).toBe(true);
    expect(items.some((i) => i.id === "rule:childCreditPointsByAge")).toBe(true);
    expect(items.some((i) => i.id === "deduction:bituach-leumi")).toBe(true);
    expect(items.some((i) => i.kind === "answer")).toBe(true);
  });

  it("contentHash changes when the underlying year's value changes (osekPaturThreshold: 120,000 in 2025 vs 122,833 in 2026)", () => {
    const items2025 = listReviewableItems(2025);
    const items2026 = listReviewableItems(2026);
    const item2025 = items2025.find((i) => i.id === "rule:osekPaturThreshold")!;
    const item2026 = items2026.find((i) => i.id === "rule:osekPaturThreshold")!;
    expect(item2025.currentValue).not.toBe(item2026.currentValue);
    expect(item2025.contentHash).not.toBe(item2026.contentHash);
  });

  it("contentHash is stable for the same year across repeated calls (deterministic, no hidden state)", () => {
    const a = listReviewableItems(2026).find((i) => i.id === "rule:vatRate")!;
    const b = listReviewableItems(2026).find((i) => i.id === "rule:vatRate")!;
    expect(a.contentHash).toBe(b.contentHash);
  });

  it("every item carries a confidenceTier from the locked 4-tier vocabulary", () => {
    const items = listReviewableItems(2026);
    const valid = new Set(["confirmed", "strongly_supported", "unverified", "refuted"]);
    for (const item of items) {
      expect(valid.has(item.confidenceTier)).toBe(true);
    }
  });
});
