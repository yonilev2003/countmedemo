/**
 * Golden tests — עוסק פטור ceiling alert (year-keyed threshold + level edges).
 * Ceiling: 120,000 ₪ for 2024–2025 (frozen), 122,833 ₪ from 2026 (CPI-indexed).
 */

import { describe, expect, it } from "vitest";
import { computeCeilingAlert } from "@/lib/alerts/ceiling";
import { makePersona } from "../helpers/persona-factory";

const paturWithTurnover = (turnover: number, year = 2025) =>
  makePersona({ income: { year, totalRevenue: turnover } });

describe("computeCeilingAlert — levels (2025, ceiling 120,000)", () => {
  it("returns null for non-פטור", () => {
    const p = makePersona({ business: { osekType: "morshe" }, income: { totalRevenue: 50_000 } });
    expect(computeCeilingAlert(p)).toBeNull();
  });
  const cases: Array<[turnover: number, level: string]> = [
    [60_000, "safe"], // 50%
    [71_999, "safe"], // just under 60%
    [72_000, "approaching"], // 60%
    [96_000, "warning"], // 80%
    [108_000, "critical"], // 90%
    [119_999, "critical"], // 99.999% — rounds to 100% but has NOT exceeded
    [120_000, "critical"], // exactly at the ceiling = still within עוסק פטור
    [120_001, "exceeded"], // strictly above
  ];
  it.each(cases)("turnover %i ₪ → %s", (turnover, level) => {
    expect(computeCeilingAlert(paturWithTurnover(turnover))?.level).toBe(level);
  });

  it("remaining is never negative", () => {
    expect(computeCeilingAlert(paturWithTurnover(150_000))?.remaining).toBe(0);
  });
});

describe("computeCeilingAlert — 2026 CPI-indexed ceiling (122,833)", () => {
  it("121,000 ₪ exceeds the 2025 ceiling but NOT the 2026 one", () => {
    expect(computeCeilingAlert(paturWithTurnover(121_000, 2025))?.level).toBe("exceeded");
    expect(computeCeilingAlert(paturWithTurnover(121_000, 2026))?.level).toBe("critical");
  });
  it("threshold read per year", () => {
    expect(computeCeilingAlert(paturWithTurnover(0, 2026))?.threshold).toBe(122_833);
    expect(computeCeilingAlert(paturWithTurnover(0, 2024))?.threshold).toBe(120_000);
  });
});

describe("computeCeilingAlert — copy correctness (2026-08-18 audit fixes)", () => {
  it("names the tax year the threshold belongs to, so 2025 vs 2026 is never ambiguous on screen", () => {
    const a2025 = computeCeilingAlert(paturWithTurnover(119_500, 2025))!;
    const a2026 = computeCeilingAlert(paturWithTurnover(119_500, 2026))!;
    expect(a2025.headlineHe).toContain("2025");
    expect(a2026.headlineHe).toContain("2026");
    // Same turnover, different year → different remaining (this was the
    // user-reported "500 ₪" confusion: correct for 2025, not 2026).
    expect(a2025.remaining).toBe(500);
    expect(a2026.remaining).toBe(3_333);
  });

  it("calls an עוסק זעיר persona זעיר, not פטור, in its own copy", () => {
    const zeir = makePersona({
      business: { osekType: "patur", isOsekZeir: true },
      income: { year: 2026, totalRevenue: 111_000 },
    });
    const alert = computeCeilingAlert(zeir)!;
    expect(alert.headlineHe + alert.detailHe).toContain("עוסק זעיר");
    expect(alert.headlineHe + alert.detailHe).not.toContain("עוסק פטור");
  });

  it("exceeded-level VAT instruction matches the persona's actual year-keyed VAT rate", () => {
    const a2024 = computeCeilingAlert(paturWithTurnover(130_000, 2024))!;
    const a2026 = computeCeilingAlert(paturWithTurnover(130_000, 2026))!;
    expect(a2024.detailHe).toContain("17% מע\"מ");
    expect(a2026.detailHe).toContain("18% מע\"מ");
  });
});
