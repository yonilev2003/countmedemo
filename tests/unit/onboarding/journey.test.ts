/**
 * getJourney() — legacy-persona fallback contract (ONB-1 DoD).
 *
 * A persona with no `journey` field (founders' own personas,
 * personas/dana-cohen.json, any pre-beta signup) must read back as a fully
 * experienced, filing-ready user — never as a fresh/incomplete onboarder.
 */

import { describe, it, expect } from "vitest";
import { getJourney } from "@/lib/persona";
import { makePersona } from "../helpers/persona-factory";

describe("getJourney — legacy fallback", () => {
  it("a persona with no journey field is treated as experienced + filing-complete", () => {
    const legacy = makePersona();
    expect(legacy.journey).toBeUndefined();

    const journey = getJourney(legacy);
    expect(journey.tier).toBe("experienced");
    expect(journey.filingDetailsCompleted).toBe(true);
    expect(journey.incomeBand).toBeNull();
  });

  it("never mutates or writes journey back onto the persona", () => {
    const legacy = makePersona();
    getJourney(legacy);
    expect(legacy.journey).toBeUndefined();
  });

  it("a persona with a real journey returns it verbatim", () => {
    const withJourney = makePersona({
      journey: {
        tier: "pre",
        incomeBand: "5-10k",
        onboardingVersion: "lite-v1",
        onboardingCompletedAt: "2026-08-11T10:00:00.000Z",
        filingDetailsCompleted: false,
      },
    });
    const journey = getJourney(withJourney);
    expect(journey.tier).toBe("pre");
    expect(journey.incomeBand).toBe("5-10k");
    expect(journey.filingDetailsCompleted).toBe(false);
  });

  it("preserves the pre-tier authorities sub-object", () => {
    const withAuthorities = makePersona({
      journey: {
        tier: "pre",
        incomeBand: null,
        authorities: { masHachnasa: "no", maam: "unsure", bituachLeumi: "yes" },
        onboardingVersion: "lite-v1",
        onboardingCompletedAt: "2026-08-11T10:00:00.000Z",
        filingDetailsCompleted: false,
      },
    });
    const journey = getJourney(withAuthorities);
    expect(journey.authorities).toEqual({
      masHachnasa: "no",
      maam: "unsure",
      bituachLeumi: "yes",
    });
  });
});
