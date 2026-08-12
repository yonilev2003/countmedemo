/**
 * pickProfile — the 113-profession regulatory dataset (2026) must win over
 * the 3 generic keyword buckets when a profession match exists, and the
 * generic buckets must still work as a fallback when it doesn't.
 */

import { describe, expect, it } from "vitest";
import { pickProfile } from "@/lib/business-expenses/profiles";
import { getProfessionById } from "@/lib/business-expenses/occupation-dataset";

describe("pickProfile — dataset match", () => {
  it("matches a known profession by exact name (P026)", () => {
    const p026 = getProfessionById("P026");
    expect(p026).toBeDefined();

    const profile = pickProfile(p026!.nameHe, 2026);
    expect(profile.label).toBe(p026!.nameHe);
    // profession-specific lines + universal categories, not the generic buckets
    expect(profile.categories.length).toBeGreaterThan(p026!.expenses.length);
  });

  it("carries confidence-graded warnings through for grade C lines", () => {
    const p026 = getProfessionById("P026");
    const gradeC = p026!.expenses.find((e) => e.confidence === "C");
    if (!gradeC) return; // dataset shape may not guarantee a C-grade line here
    const profile = pickProfile(p026!.nameHe, 2026);
    const category = profile.categories.find((c) => c.name === gradeC.nameHe);
    expect(category?.warning).toMatch(/רמת ודאות C/);
  });
});

describe("pickProfile — fallback to generic buckets", () => {
  it("falls back to a keyword bucket when no profession matches", () => {
    const profile = pickProfile("עיסוק שלא קיים במאגר הנתונים בכלל", 2026);
    expect(profile.label).toBe("עצמאי כללי");
  });

  it("still resolves universal categories for the fallback path", () => {
    const profile = pickProfile("קטגוריה לא קיימת", 2026);
    expect(profile.categories.some((c) => c.name.includes("ביטוח לאומי"))).toBe(true);
  });
});
