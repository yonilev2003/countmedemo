/**
 * Short-link id generator (QA #32 fix, 2026-08-18).
 *
 * The WhatsApp share message previously embedded the full signed /d/{token}
 * link (~479 chars); WhatsApp's own linkifier only recognized part of it as
 * a URL, so recipients landed on a dead partial link. Fix: mint a short
 * opaque id (generateShortId) resolved server-side via /s/[id]. These tests
 * lock the id's shape (length, alphabet) and that draws don't collide at
 * the volumes this beta-scale feature will ever see.
 */

import { describe, it, expect } from "vitest";
import { generateShortId, SHORT_ID_LENGTH } from "@/lib/doc-link";

const BASE62 = /^[0-9A-Za-z]+$/;

describe("generateShortId", () => {
  it("defaults to SHORT_ID_LENGTH characters, and SHORT_ID_LENGTH is in the 8-10 spec range", () => {
    expect(SHORT_ID_LENGTH).toBeGreaterThanOrEqual(8);
    expect(SHORT_ID_LENGTH).toBeLessThanOrEqual(10);
    expect(generateShortId()).toHaveLength(SHORT_ID_LENGTH);
  });

  it("is base62 only — no separators, no ambiguity-stripping needed since it's never hand-typed", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateShortId()).toMatch(BASE62);
    }
  });

  it("accepts any explicit length within the 8-10 spec range", () => {
    for (const len of [8, 9, 10]) {
      const id = generateShortId(len);
      expect(id).toHaveLength(len);
      expect(id).toMatch(BASE62);
    }
  });

  it("rejects lengths outside the 8-10 spec range", () => {
    expect(() => generateShortId(7)).toThrow();
    expect(() => generateShortId(11)).toThrow();
    expect(() => generateShortId(0)).toThrow();
    expect(() => generateShortId(8.5)).toThrow();
  });

  it("produces unique ids across 1000 draws", () => {
    const draws = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      draws.add(generateShortId());
    }
    expect(draws.size).toBe(1000);
  });

  it("draws are not trivially predictable — 1000 consecutive draws are not sequential/patterned", () => {
    const draws = Array.from({ length: 1000 }, () => generateShortId());
    // Crude sanity check: consecutive draws essentially never share a
    // (non-cryptographic) prefix of length 3, which a broken/deterministic
    // generator (e.g. a counter instead of a CSPRNG) would produce.
    let samePrefix = 0;
    for (let i = 1; i < draws.length; i++) {
      if (draws[i].slice(0, 3) === draws[i - 1].slice(0, 3)) samePrefix++;
    }
    expect(samePrefix).toBe(0);
  });
});
