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

describe("computeCeilingAlert — MURSHE-ZEIR (Amendment 265, verified 2026-08-19)", () => {
  const murshezeir = (turnover: number, year = 2025) =>
    makePersona({
      business: { osekType: "morshe", isOsekZeir: true },
      income: { year, totalRevenue: turnover },
    });
  const plainMorshe = (turnover: number, year = 2025) =>
    makePersona({
      business: { osekType: "morshe", isOsekZeir: false },
      income: { year, totalRevenue: turnover },
    });

  it("still returns null for a plain (non-זעיר) עוסק מורשה", () => {
    expect(computeCeilingAlert(plainMorshe(50_000))).toBeNull();
  });

  it("returns an alert for an עוסק מורשה marked isOsekZeir, same threshold as פטור", () => {
    const alert = computeCeilingAlert(murshezeir(108_000))!;
    expect(alert).not.toBeNull();
    expect(alert.threshold).toBe(120_000);
    expect(alert.level).toBe("critical");
  });

  it("exceeded-level copy talks about losing מסלול זעיר eligibility, NOT VAT/registration", () => {
    const alert = computeCeilingAlert(murshezeir(130_000))!;
    const text = alert.headlineHe + alert.detailHe;
    expect(text).toContain("עוסק זעיר");
    expect(text).not.toContain("נדרשת רישום כמורשה");
    expect(text).not.toContain("לרישום כעוסק מורשה");
    // Same finding must NOT read the same way for a patur-זעיר persona —
    // that one DOES still need to register as murshe on crossing.
    const paturZeir = computeCeilingAlert(
      makePersona({
        business: { osekType: "patur", isOsekZeir: true },
        income: { year: 2025, totalRevenue: 130_000 },
      }),
    )!;
    expect(paturZeir.headlineHe).toContain("נדרשת רישום כמורשה");
  });

  it("warning/critical copy for murshe-זעיר drops the patur-only 'become מורשה'/'add VAT' instructions", () => {
    const warning = computeCeilingAlert(murshezeir(96_000))!;
    const critical = computeCeilingAlert(murshezeir(108_000))!;
    // These are the exact patur-track phrases that would be actively wrong
    // for someone who is already registered and already charging VAT.
    expect(warning.detailHe).not.toContain("התחל/י תהליך העברה לעוסק מורשה");
    expect(critical.detailHe).not.toContain("הוסף/י מע\"מ מיידית");
  });
});

describe("computeCeilingAlert — FP-07 year param (2026-08-19)", () => {
  it("defaults to persona.income.year and matches the old (pre-param) behavior exactly", () => {
    const p = paturWithTurnover(96_000, 2025);
    const withDefault = computeCeilingAlert(p);
    const withExplicitSameYear = computeCeilingAlert(p, 2025);
    expect(withDefault).toEqual(withExplicitSameYear);
  });

  it("scopes turnover to a requested year via dated revenue docs, ignoring the baseline scalar", () => {
    const p = makePersona({
      business: { osekType: "patur" },
      income: {
        year: 2025,
        totalRevenue: 119_000, // 2025 baseline — must NOT leak into a 2026 read
        invoices: [
          {
            invoiceNumber: "2026-0001",
            date: "2026-03-01",
            customerName: "לקוח",
            description: "שירות",
            amount: 50_000,
            vat: 0,
            total: 50_000,
            docType: "receipt",
            status: "paid",
          },
        ],
      },
    });
    const for2026 = computeCeilingAlert(p, 2026)!;
    expect(for2026.turnover).toBe(50_000); // only the dated 2026 doc, baseline excluded
    expect(for2026.threshold).toBe(122_833); // 2026's own ceiling, not 2025's
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
