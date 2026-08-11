/**
 * personas/persona.schema.json refresh (ONB-1 DoD): "company" removed from
 * the osekType enum, journey/isOsekZeir/professionId/soldierServiceMonths/
 * reserveDaysByYear documented, and personas/dana-cohen.json still conforms.
 *
 * No JSON-schema library is available in this repo (no new dependency was
 * authorized for this round) — these assertions check the specific
 * properties the DoD calls out directly, rather than a generic validator.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schema = JSON.parse(
  readFileSync(resolve(__dirname, "../../../personas/persona.schema.json"), "utf-8"),
);
const danaCohen = JSON.parse(
  readFileSync(resolve(__dirname, "../../../personas/dana-cohen.json"), "utf-8"),
);

describe("persona.schema.json — osekType", () => {
  it("no longer offers 'company' (Form 1301 is individuals-only, locked decision)", () => {
    expect(schema.properties.business.properties.osekType.enum).not.toContain("company");
    expect(schema.properties.business.properties.osekType.enum).toEqual(["patur", "morshe"]);
  });

  it("dana-cohen.json's osekType is a value the refreshed enum still allows", () => {
    expect(schema.properties.business.properties.osekType.enum).toContain(
      danaCohen.business.osekType,
    );
  });
});

describe("persona.schema.json — new optional fields are documented", () => {
  it("business.isOsekZeir and business.professionId exist", () => {
    expect(schema.properties.business.properties.isOsekZeir).toBeDefined();
    expect(schema.properties.business.properties.professionId).toBeDefined();
  });

  it("personal.soldierServiceMonths and personal.reserveDaysByYear exist", () => {
    expect(schema.properties.personal.properties.soldierServiceMonths).toBeDefined();
    expect(schema.properties.personal.properties.reserveDaysByYear).toBeDefined();
  });

  it("top-level journey schema exists and is optional (not in the required list)", () => {
    expect(schema.properties.journey).toBeDefined();
    expect(schema.required).not.toContain("journey");
    expect(schema.properties.journey.enum).toBeUndefined();
    expect(schema.properties.journey.properties.tier.enum).toEqual([
      "pre",
      "first-year",
      "experienced",
    ]);
  });
});

describe("dana-cohen.json — required top-level fields still satisfy the schema", () => {
  it("has every schema-required top-level key", () => {
    for (const key of schema.required as string[]) {
      expect(danaCohen).toHaveProperty(key);
    }
  });

  it("has every schema-required personal key", () => {
    for (const key of schema.properties.personal.required as string[]) {
      expect(danaCohen.personal).toHaveProperty(key);
    }
  });

  it("has every schema-required business key", () => {
    for (const key of schema.properties.business.required as string[]) {
      expect(danaCohen.business).toHaveProperty(key);
    }
  });

  it("has no journey field (a pre-onboarding-era persona, per ONB-1/ONB-11)", () => {
    expect(danaCohen.journey).toBeUndefined();
  });
});
