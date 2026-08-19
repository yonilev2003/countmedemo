/**
 * Golden tests — deterministic canary rollout (v2 plan item 5.3).
 * See src/lib/rollout.ts for the full playbook/doc-comment.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { inRollout, stableBucket } from "@/lib/rollout";

const FEATURE = "new-pricing-engine";
const ENV_KEY = "ROLLOUT_NEW_PRICING_ENGINE_PCT";
const ENV_KEY_PUBLIC = "NEXT_PUBLIC_ROLLOUT_NEW_PRICING_ENGINE_PCT";

function clearEnv() {
  delete process.env[ENV_KEY];
  delete process.env[ENV_KEY_PUBLIC];
}

beforeEach(() => {
  clearEnv();
});
afterEach(() => {
  clearEnv();
});

describe("stableBucket — determinism", () => {
  it("returns the same bucket for the same (userId, feature) every time", () => {
    const a = stableBucket("user-123", "my-feature");
    const b = stableBucket("user-123", "my-feature");
    const c = stableBucket("user-123", "my-feature");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("is in [0, 99]", () => {
    for (const id of ["a", "b", "user-1", "user-2", "", "🙂", "very-long-user-id-string-here"]) {
      const bucket = stableBucket(id, "feature-x");
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThanOrEqual(99);
    }
  });

  it("different features give a (usually) different bucket for the same user", () => {
    // Not guaranteed for every pair (collisions are fine), but across many
    // features for one fixed user, at least some should differ.
    const userId = "user-42";
    const buckets = new Set<number>();
    for (let i = 0; i < 20; i++) {
      buckets.add(stableBucket(userId, `feature-${i}`));
    }
    expect(buckets.size).toBeGreaterThan(1);
  });

  it("different users give a (usually) different bucket for the same feature", () => {
    const buckets = new Set<number>();
    for (let i = 0; i < 20; i++) {
      buckets.add(stableBucket(`user-${i}`, FEATURE));
    }
    expect(buckets.size).toBeGreaterThan(1);
  });
});

describe("stableBucket — distribution sanity", () => {
  it("spreads 1000 synthetic ids roughly uniformly across deciles", () => {
    const counts = new Array(10).fill(0);
    const total = 1000;
    for (let i = 0; i < total; i++) {
      const bucket = stableBucket(`synthetic-user-${i}`, FEATURE);
      const decile = Math.min(9, Math.floor(bucket / 10));
      counts[decile]++;
    }
    // Expected ~100 per decile (10% of 1000). Assert each decile gets more
    // than 5% (i.e. > 50) — a generous floor that would fail for a badly
    // skewed/broken hash while tolerating normal statistical noise.
    for (const count of counts) {
      expect(count).toBeGreaterThan(total * 0.05);
    }
    // Sanity: deciles sum back to the total.
    expect(counts.reduce((a, b) => a + b, 0)).toBe(total);
  });
});

describe("inRollout — pct=0 and pct=100 explicit", () => {
  it("pct=0 excludes every named user", () => {
    for (let i = 0; i < 50; i++) {
      expect(inRollout(FEATURE, `user-${i}`, 0)).toBe(false);
    }
  });

  it("pct=0 excludes anonymous users too", () => {
    expect(inRollout(FEATURE, null, 0)).toBe(false);
    expect(inRollout(FEATURE, undefined, 0)).toBe(false);
  });

  it("pct=100 includes every named user", () => {
    for (let i = 0; i < 50; i++) {
      expect(inRollout(FEATURE, `user-${i}`, 100)).toBe(true);
    }
  });

  it("pct=100 includes anonymous users (null/undefined/empty)", () => {
    expect(inRollout(FEATURE, null, 100)).toBe(true);
    expect(inRollout(FEATURE, undefined, 100)).toBe(true);
    expect(inRollout(FEATURE, "", 100)).toBe(true);
  });

  it("anonymous users are excluded at any partial percentage", () => {
    expect(inRollout(FEATURE, null, 50)).toBe(false);
    expect(inRollout(FEATURE, undefined, 1)).toBe(false);
    expect(inRollout(FEATURE, "", 99)).toBe(false);
  });
});

describe("inRollout — determinism across calls", () => {
  it("a given user never flip-flops for a fixed pct", () => {
    const userId = "stable-user-999";
    const results = new Set<boolean>();
    for (let i = 0; i < 10; i++) {
      results.add(inRollout(FEATURE, userId, 50));
    }
    expect(results.size).toBe(1);
  });
});

describe("inRollout — env resolution (server var)", () => {
  it("reads ROLLOUT_<FEATURE>_PCT when pctFromEnv is not given", () => {
    process.env[ENV_KEY] = "0";
    expect(inRollout(FEATURE, "user-1")).toBe(false);

    process.env[ENV_KEY] = "100";
    expect(inRollout(FEATURE, "user-1")).toBe(true);
  });

  it("explicit pctFromEnv overrides the env var", () => {
    process.env[ENV_KEY] = "0";
    expect(inRollout(FEATURE, "user-1", 100)).toBe(true);
  });

  it("feature name is normalized to the env key (dashes -> underscores, uppercased)", () => {
    process.env["ROLLOUT_MY_COOL_FEATURE_PCT"] = "0";
    expect(inRollout("my-cool-feature", "user-1")).toBe(false);
  });
});

describe("inRollout — env resolution (client/NEXT_PUBLIC var)", () => {
  it("falls back to NEXT_PUBLIC_ROLLOUT_<FEATURE>_PCT when the server var is absent", () => {
    process.env[ENV_KEY_PUBLIC] = "0";
    expect(inRollout(FEATURE, "user-1")).toBe(false);
  });

  it("server var takes precedence over the NEXT_PUBLIC var when both are set", () => {
    process.env[ENV_KEY] = "100";
    process.env[ENV_KEY_PUBLIC] = "0";
    expect(inRollout(FEATURE, "user-1")).toBe(true);
  });
});

describe("inRollout — invalid/missing env defaults to 100 (fully on)", () => {
  it("missing env -> true for any named user", () => {
    expect(inRollout(FEATURE, "user-1")).toBe(true);
    expect(inRollout(FEATURE, "user-2")).toBe(true);
  });

  it("missing env -> true for anonymous users too (100% path)", () => {
    expect(inRollout(FEATURE, null)).toBe(true);
    expect(inRollout(FEATURE, undefined)).toBe(true);
  });

  it("non-numeric env value -> true (fail open)", () => {
    process.env[ENV_KEY] = "not-a-number";
    expect(inRollout(FEATURE, "user-1")).toBe(true);
  });

  it("blank env value -> true (fail open)", () => {
    process.env[ENV_KEY] = "";
    expect(inRollout(FEATURE, "user-1")).toBe(true);
  });

  it("out-of-range env value (negative or > 100) -> true (fail open)", () => {
    process.env[ENV_KEY] = "-5";
    expect(inRollout(FEATURE, "user-1")).toBe(true);

    process.env[ENV_KEY] = "150";
    expect(inRollout(FEATURE, "user-1")).toBe(true);
  });

  it("invalid explicit pctFromEnv also fails open to 100", () => {
    expect(inRollout(FEATURE, "user-1", Number.NaN)).toBe(true);
    expect(inRollout(FEATURE, "user-1", -1)).toBe(true);
    expect(inRollout(FEATURE, "user-1", 101)).toBe(true);
  });
});

describe("inRollout — mid-range pct behaves consistently with stableBucket", () => {
  it("inclusion matches stableBucket(userId, feature) < pct", () => {
    const pct = 37;
    for (let i = 0; i < 100; i++) {
      const userId = `check-user-${i}`;
      const expected = stableBucket(userId, FEATURE) < pct;
      expect(inRollout(FEATURE, userId, pct)).toBe(expected);
    }
  });
});
