/**
 * Pure-function tests for the AI cost-guard (src/lib/ai/usage.ts).
 *
 * Deliberately DB/network-free: estimateCostUsd and classifyBudget are both
 * pure functions with no I/O, so these tests exercise them directly with no
 * mocking. Anything that touches Supabase/Resend (recordAiUsage,
 * getBudgetState, maybeAlertThresholds) is out of scope here — see this
 * file's module doc in usage.ts for the fire-and-forget/fail-open contract
 * those functions are held to instead.
 */

import { describe, expect, it } from "vitest";
import { estimateCostUsd, classifyBudget, PRICING, type BudgetEnv } from "@/lib/ai/usage";

describe("estimateCostUsd", () => {
  it("prices a Sonnet call with a mix of input/output/cache-write/cache-read tokens", () => {
    // 1M of each kind → the rate itself, in dollars, per PRICING table.
    const cost = estimateCostUsd({
      model: "claude-sonnet-4-6",
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
      cache_creation_input_tokens: 1_000_000,
      cache_read_input_tokens: 1_000_000,
    });
    const rates = PRICING["claude-sonnet-4-6"];
    expect(cost).toBeCloseTo(rates.input + rates.output + rates.cacheWrite + rates.cacheRead, 10);
    expect(cost).toBeCloseTo(3.0 + 15.0 + 3.75 + 0.3, 10); // 22.05
  });

  it("prices a realistic partial-cache Sonnet call correctly", () => {
    // 200K input, 4K output, 150K cache write, 500K cache read.
    const cost = estimateCostUsd({
      model: "claude-sonnet-4-6",
      input_tokens: 200_000,
      output_tokens: 4_000,
      cache_creation_input_tokens: 150_000,
      cache_read_input_tokens: 500_000,
    });
    const expected =
      (200_000 / 1_000_000) * 3.0 +
      (4_000 / 1_000_000) * 15.0 +
      (150_000 / 1_000_000) * 3.75 +
      (500_000 / 1_000_000) * 0.3;
    expect(cost).toBeCloseTo(expected, 10);
  });

  it("prices a Haiku call at the cheaper tier's rates", () => {
    const cost = estimateCostUsd({
      model: "claude-haiku-4-5",
      input_tokens: 2_000_000,
      output_tokens: 1_000_000,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    });
    // 2 * $1.00 + 1 * $5.00 = $7.00
    expect(cost).toBeCloseTo(7.0, 10);
  });

  it("zero-token usage costs zero regardless of model", () => {
    expect(
      estimateCostUsd({
        model: "claude-haiku-4-5",
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      }),
    ).toBe(0);
  });

  it("falls back to the (more expensive) Sonnet rates for an unknown/future model", () => {
    const unknownCost = estimateCostUsd({
      model: "claude-some-future-model",
      input_tokens: 1_000_000,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    });
    const sonnetCost = estimateCostUsd({
      model: "claude-sonnet-4-6",
      input_tokens: 1_000_000,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    });
    expect(unknownCost).toBeCloseTo(sonnetCost, 10);
    expect(unknownCost).toBeCloseTo(3.0, 10);

    // And the fallback must be the MORE expensive tier, not the cheaper one —
    // a cost guard must never silently undercount an unpriced model's spend.
    const haikuCost = estimateCostUsd({
      model: "claude-haiku-4-5",
      input_tokens: 1_000_000,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    });
    expect(unknownCost).toBeGreaterThan(haikuCost);
  });
});

describe("classifyBudget", () => {
  const baseEnv: BudgetEnv = {
    degradeThresholdUsd: 5,
    pauseThresholdUsd: 15,
    forceHaiku: false,
    paused: false,
  };

  it("stays normal below both thresholds", () => {
    expect(classifyBudget(0, baseEnv)).toBe("normal");
    expect(classifyBudget(4.99, baseEnv)).toBe("normal");
  });

  it("degrades at (and above) the degrade threshold", () => {
    expect(classifyBudget(5, baseEnv)).toBe("degraded");
    expect(classifyBudget(10, baseEnv)).toBe("degraded");
    expect(classifyBudget(14.99, baseEnv)).toBe("degraded");
  });

  it("pauses at (and above) the pause threshold", () => {
    expect(classifyBudget(15, baseEnv)).toBe("paused");
    expect(classifyBudget(1000, baseEnv)).toBe("paused");
  });

  it("AI_PAUSED forces paused even at zero spend", () => {
    expect(classifyBudget(0, { ...baseEnv, paused: true })).toBe("paused");
  });

  it("AI_PAUSED wins over everything, including a below-threshold spend", () => {
    expect(classifyBudget(0, { ...baseEnv, paused: true, forceHaiku: false })).toBe("paused");
  });

  it("AI_FORCE_HAIKU floors an otherwise-normal spend at degraded", () => {
    expect(classifyBudget(0, { ...baseEnv, forceHaiku: true })).toBe("degraded");
    expect(classifyBudget(4.99, { ...baseEnv, forceHaiku: true })).toBe("degraded");
  });

  it("AI_FORCE_HAIKU does not downgrade an already-paused spend-based result", () => {
    expect(classifyBudget(15, { ...baseEnv, forceHaiku: true })).toBe("paused");
    expect(classifyBudget(20, { ...baseEnv, forceHaiku: true })).toBe("paused");
  });

  it("AI_FORCE_HAIKU does not downgrade an already-degraded spend-based result", () => {
    expect(classifyBudget(10, { ...baseEnv, forceHaiku: true })).toBe("degraded");
  });

  it("threshold boundaries are inclusive on the low side (>=), not exclusive", () => {
    // Exactly at the degrade threshold is already degraded, not normal.
    expect(classifyBudget(baseEnv.degradeThresholdUsd, baseEnv)).toBe("degraded");
    // Exactly at the pause threshold is already paused, not degraded.
    expect(classifyBudget(baseEnv.pauseThresholdUsd, baseEnv)).toBe("paused");
  });

  it("respects custom (non-default) thresholds from env", () => {
    const customEnv: BudgetEnv = {
      degradeThresholdUsd: 1,
      pauseThresholdUsd: 2,
      forceHaiku: false,
      paused: false,
    };
    expect(classifyBudget(0.5, customEnv)).toBe("normal");
    expect(classifyBudget(1, customEnv)).toBe("degraded");
    expect(classifyBudget(2, customEnv)).toBe("paused");
  });
});
