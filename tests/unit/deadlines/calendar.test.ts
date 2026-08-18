/**
 * Golden tests — deadline calendar (Israel-timezone day rollover + generated dates).
 *
 * The headline case (Yoni, timezone task): `daysUntilDue` must roll over at
 * ASIA/JERUSALEM midnight, not the host machine's local midnight. A `fromDate`
 * of 2026-08-18T22:30:00Z is already 2026-08-19 01:30 in Israel (UTC+3, IDT) —
 * so every day-diff computed from it must treat "today" as Aug 19, one day
 * later (= one day fewer remaining) than a naive host-local read would give
 * on a UTC host.
 */

import { describe, expect, it } from "vitest";
import {
  getUpcomingDeadlines,
  getImminentDeadlines,
  jerusalemToday,
  DEADLINE_CALENDAR,
} from "@/lib/deadlines/calendar";

describe("jerusalemToday", () => {
  it("rolls a UTC-evening instant over to the NEXT Israel calendar day", () => {
    // 22:30 UTC on Aug 18 = 01:30 IDT (UTC+3) on Aug 19 in Israel.
    const instant = new Date("2026-08-18T22:30:00Z");
    const today = jerusalemToday(instant);
    expect(today.getFullYear()).toBe(2026);
    expect(today.getMonth()).toBe(7); // 0-based → August
    expect(today.getDate()).toBe(19);
  });

  it("does NOT roll over an instant still within the same Israel calendar day", () => {
    // 10:00 UTC on Aug 18 = 13:00 IDT on Aug 18 — still Aug 18 in Israel.
    const instant = new Date("2026-08-18T10:00:00Z");
    const today = jerusalemToday(instant);
    expect(today.getMonth()).toBe(7);
    expect(today.getDate()).toBe(18);
  });
});

describe("getUpcomingDeadlines — Israel-midnight boundary (pinned)", () => {
  const bituachLeumi = (fromDate: Date) =>
    getUpcomingDeadlines(fromDate, "all", DEADLINE_CALENDAR.length).find(
      (d) => d.id === "bituach-leumi-monthly",
    )!;

  it("counts one day fewer once the Israel calendar date has already rolled to the 19th", () => {
    const stillAug18 = bituachLeumi(new Date("2026-08-18T10:00:00Z")); // 13:00 IDT, still Aug 18
    const alreadyAug19 = bituachLeumi(new Date("2026-08-18T22:30:00Z")); // 01:30 IDT next day, Aug 19

    // Both resolve to the same next due date (Sep 15, 2026) — only "today"
    // shifted by one Israel calendar day, so daysUntilDue must differ by 1.
    expect(alreadyAug19.nextDueDate.getMonth()).toBe(8); // September
    expect(alreadyAug19.nextDueDate.getDate()).toBe(15);
    expect(stillAug18.nextDueDate.getTime()).toBe(alreadyAug19.nextDueDate.getTime());
    expect(alreadyAug19.daysUntilDue).toBe(stillAug18.daysUntilDue - 1);
  });
});

describe("getImminentDeadlines", () => {
  it("still only returns non-negative, within-window entries after the timezone normalization", () => {
    const results = getImminentDeadlines(30, new Date("2026-08-18T22:30:00Z"), "all");
    for (const d of results) {
      expect(d.daysUntilDue).toBeGreaterThanOrEqual(0);
      expect(d.daysUntilDue).toBeLessThanOrEqual(30);
    }
  });
});
