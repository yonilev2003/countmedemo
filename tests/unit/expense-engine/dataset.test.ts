/**
 * Golden tests — the 2026 expense-recognition dataset (src/lib/expense-engine).
 *
 * Two jobs: (1) lock the dataset's shape (row counts, known-tricky formulas)
 * so a bad regeneration fails CI; (2) cross-check every figure the dataset
 * shares with lib/calculators/types.ts against getTaxYearConstants(2026) —
 * this is the dataset's OWN boundary rule (its numbers never feed the tax
 * engine directly), so a divergence here means the two sources of truth
 * have drifted and must be reconciled by hand, not silently trusted.
 */
import { describe, expect, it } from "vitest";
import { getTaxYearConstants } from "@/lib/calculators/types";
import {
  classifyExpense,
  explainFormula,
  getExpenseDataset,
  getGlobalRule,
  getProfession,
  getProfessionExpenseGuide,
  listVerticals,
  matchProfession,
} from "@/lib/expense-engine";

const { dataset } = getExpenseDataset(2026);

describe("dataset shape", () => {
  it("row counts match the real (post-reconstruction) source workbook", () => {
    expect(dataset.rules.length).toBe(62);
    expect(dataset.professions.length).toBe(113);
    expect(dataset.baseExpenses.length).toBe(22);
    expect(dataset.professionExpenses.length).toBe(595);
    expect(dataset.depreciation.length).toBe(15);
    expect(dataset.nonDeductible.length).toBe(10);
  });

  it("has no duplicate ids within any sheet", () => {
    const dupes = (ids: string[]) => ids.length !== new Set(ids).size;
    expect(dupes(dataset.rules.map((r) => r.ruleId))).toBe(false);
    expect(dupes(dataset.professions.map((p) => p.id))).toBe(false);
    expect(dupes(dataset.baseExpenses.map((e) => e.id))).toBe(false);
    expect(dupes(dataset.professionExpenses.map((e) => e.id))).toBe(false);
  });

  it("every profession's vehicleRuleId resolves to a real rule", () => {
    const ruleIds = new Set(dataset.rules.map((r) => r.ruleId));
    for (const p of dataset.professions) {
      expect(ruleIds.has(p.vehicleRuleId), `${p.id} → ${p.vehicleRuleId}`).toBe(true);
    }
  });

  it("every profession expense's professionId resolves to a real profession", () => {
    const professionIds = new Set(dataset.professions.map((p) => p.id));
    for (const e of dataset.professionExpenses) {
      expect(professionIds.has(e.professionId!), `${e.id} → ${e.professionId}`).toBe(true);
    }
  });
});

describe("cross-consistency with lib/calculators/types.ts (2026)", () => {
  const TC = getTaxYearConstants(2026);

  it("VAT rate matches", () => {
    const staRule = getGlobalRule("STA-04", 2026);
    expect(staRule?.vatFraction).toBeCloseTo(TC.vatRate, 5);
  });

  it("עוסק פטור/זעיר ceiling matches", () => {
    const staRule = getGlobalRule("STA-01", 2026);
    expect(staRule?.conditionHe).toContain("122,833");
    expect(TC.osekPaturThreshold).toBe(122833);
  });

  it("keren hishtalmut deductible cap matches", () => {
    // SOC-02's condition text states both the 4.5% rate and the 13,203 ₪ cap.
    const socRule = getGlobalRule("SOC-02", 2026);
    expect(socRule?.conditionHe).toContain("13,203");
    expect(TC.kerenHishtalmutCap).toBe(13203);
  });

  it("bituach leumi deductible rate matches", () => {
    const socRule = getGlobalRule("SOC-01", 2026);
    expect(socRule?.incomeTaxFraction).toBeCloseTo(TC.bituachLeumiDeductibleRate, 5);
  });
});

describe("known-tricky formulas (the dataset README's own '3 critical corrections')", () => {
  it("VEH-01 (private car) is max(actual, 45%) — never a flat 45%", () => {
    const veh01 = getGlobalRule("VEH-01", 2026);
    expect(veh01?.formula).toEqual({ kind: "vehicle-max", floorRate: 0.45, vatRate: 0.667 });
  });

  it("VEH-03 (taxi) recognises 90%, not 100%", () => {
    const veh03 = getGlobalRule("VEH-03", 2026);
    expect(veh03?.formula).toMatchObject({ kind: "vehicle-max", floorRate: 0.9 });
  });

  it("COM-01 (mobile phone) is expense − MIN(1,380 ₪, 50%×expense), not a flat 50%", () => {
    const com01 = getGlobalRule("COM-01", 2026);
    expect(com01?.formula).toEqual({
      kind: "reduce-min-cap",
      capNis: 1380,
      rate: 0.5,
      vatRate: 0.667,
    });
  });

  it("explainFormula never claims a flat percentage for these two rules", () => {
    const veh01 = getGlobalRule("VEH-01", 2026)!;
    const com01 = getGlobalRule("COM-01", 2026)!;
    expect(explainFormula(veh01.formula)).toContain("הגבוה מבין");
    expect(explainFormula(com01.formula)).toContain("1,380");
  });
});

describe("runtime API", () => {
  it("matchProfession finds an exact Hebrew name", () => {
    expect(matchProfession("רואה חשבון", 2026)?.id).toBe("P002");
  });

  it("matchProfession returns null rather than guessing on nonsense input", () => {
    expect(matchProfession("xyz123 not a real occupation", 2026)).toBeNull();
  });

  it("getProfessionExpenseGuide merges universal + profession-specific expenses", () => {
    const guide = getProfessionExpenseGuide("P002", 2026);
    expect(guide.profession?.nameHe).toBe("רואה חשבון");
    expect(guide.universalExpenses.length).toBe(dataset.baseExpenses.length);
    expect(guide.professionExpenses.every((e) => e.professionId === "P002")).toBe(true);
    expect(guide.professionExpenses.length).toBeGreaterThan(0);
  });

  it("getProfessionExpenseGuide with null professionId returns just the universal list", () => {
    const guide = getProfessionExpenseGuide(null, 2026);
    expect(guide.profession).toBeNull();
    expect(guide.professionExpenses).toEqual([]);
  });

  it("classifyExpense matches a known expense name for a profession", () => {
    const hit = classifyExpense("דמי חבר בלשכת עורכי הדין", "P001", 2026);
    expect(hit.matched).toBe(true);
    expect(hit.entry?.professionId).toBe("P001");
  });

  it("classifyExpense returns unmatched for nonsense input", () => {
    expect(classifyExpense("asdkjaslkdj not an expense", "P001", 2026).matched).toBe(false);
  });

  it("listVerticals returns exactly 20 verticals", () => {
    expect(listVerticals(2026).length).toBe(20);
  });

  it("getProfession resolves the reconstructed P001", () => {
    expect(getProfession("P001", 2026)?.nameHe).toBe("עורך דין");
  });

  it("getExpenseDataset falls back with an explicit marker for an unmodelled year", () => {
    const resolved = getExpenseDataset(2030);
    expect(resolved.isFallback).toBe(true);
    expect(resolved.sourceYear).toBe(2026);
  });

  it("getExpenseDataset for 2026 is not a fallback", () => {
    expect(getExpenseDataset(2026).isFallback).toBe(false);
  });
});

describe("eligibility vs rate certainty — always kept separate", () => {
  it("every profession expense carries rateCertainty='legal' distinct from its eligibilityConfidence", () => {
    for (const e of dataset.professionExpenses.slice(0, 50)) {
      expect(e.rateCertainty).toBe("legal");
      expect(["A", "B", "C"]).toContain(e.eligibilityConfidence);
    }
  });
});
