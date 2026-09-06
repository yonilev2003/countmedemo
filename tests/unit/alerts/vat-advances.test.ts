/**
 * Golden test — risk-gap.md §7.4 #3: generateVatAdvancesAlert must pick its
 * cadence (monthly vs bi-monthly) from the LIVE income.totalRevenue, not a
 * stale vatAndTurnover.annualTurnoverWithoutVat snapshot frozen at /setup.
 */

import { describe, it, expect } from "vitest";
import { generateVatAdvancesAlert } from "@/lib/alerts";
import { makePersona } from "../helpers/persona-factory";

// May 10, 2026 — within the reminder window (due date May 15) for BOTH
// cadences at once (April is simultaneously "last month" and the end of the
// Mar–Apr bi-monthly period), so the same `now` works for both branches.
const NOW = new Date(2026, 4, 10);

describe("generateVatAdvancesAlert — cadence source", () => {
  it("monthly when LIVE turnover is above 1.5M, even if the stale snapshot is low", () => {
    const p = makePersona({
      business: { osekType: "morshe" },
      income: { totalRevenue: 2_000_000 },
      vatAndTurnover: { annualTurnoverWithoutVat: 50_000 }, // stale — must not suppress monthly
    });
    const alert = generateVatAdvancesAlert(p, NOW);
    expect(alert).not.toBeNull();
    expect(alert?.detailHe ?? "").toMatch(/אפריל/);
  });

  it("bi-monthly when LIVE turnover is at/under 1.5M, even if the stale snapshot is high", () => {
    const p = makePersona({
      business: { osekType: "morshe" },
      income: { totalRevenue: 1_000_000 },
      vatAndTurnover: { annualTurnoverWithoutVat: 5_000_000 }, // stale — must not force monthly
    });
    const alert = generateVatAdvancesAlert(p, NOW);
    expect(alert).not.toBeNull();
    expect(alert?.detailHe ?? "").toMatch(/מרץ.*אפריל/);
  });
});
