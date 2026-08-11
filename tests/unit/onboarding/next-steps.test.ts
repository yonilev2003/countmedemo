/**
 * getNextSteps() — the derived "what's next" checklist (ONB-8 DoD).
 * No stored state: every assertion here flips a real persona field and reads
 * a freshly derived result, never anything cached.
 */

import { describe, it, expect } from "vitest";
import { getNextSteps } from "@/lib/onboarding/next-steps";
import { makePersona } from "../helpers/persona-factory";

describe("getNextSteps", () => {
  it("all incomplete: first-document and first-expense both pending", () => {
    const persona = makePersona({
      journey: {
        tier: "experienced",
        incomeBand: null,
        onboardingVersion: "lite-v1",
        onboardingCompletedAt: "2026-08-11T00:00:00.000Z",
        filingDetailsCompleted: false,
      },
    });
    const steps = getNextSteps(persona);
    const byId = Object.fromEntries(steps.map((s) => [s.id, s]));
    expect(byId["first-document"].completed).toBe(false);
    expect(byId["first-expense"].completed).toBe(false);
    expect(byId["filing-details"].completed).toBe(false);
  });

  it("first document created flips only that step", () => {
    const persona = makePersona({
      income: {
        invoices: [
          {
            invoiceNumber: "2026-0001",
            date: "2026-08-01",
            customerName: "לקוח",
            description: "שירות",
            amount: 100,
            vat: 18,
            total: 118,
          },
        ],
      } as never,
    });
    const steps = getNextSteps(persona);
    const byId = Object.fromEntries(steps.map((s) => [s.id, s]));
    expect(byId["first-document"].completed).toBe(true);
    expect(byId["first-expense"].completed).toBe(false);
  });

  it("all complete: every step (that applies) is marked done", () => {
    const persona = makePersona({
      income: {
        invoices: [
          {
            invoiceNumber: "2026-0001",
            date: "2026-08-01",
            customerName: "לקוח",
            description: "שירות",
            amount: 100,
            vat: 18,
            total: 118,
          },
        ],
        expenses: [
          {
            date: "2026-08-02",
            vendorName: "ספק",
            description: "ציוד",
            amount: 200,
            category: "כללי",
            deductionRule: "full",
          },
        ],
      } as never,
      journey: {
        tier: "experienced",
        incomeBand: null,
        onboardingVersion: "lite-v1",
        onboardingCompletedAt: "2026-08-11T00:00:00.000Z",
        filingDetailsCompleted: true,
      },
    });
    const steps = getNextSteps(persona);
    expect(steps.every((s) => s.completed)).toBe(true);
  });

  it("tier === pre never gets a filing-details step (no open file yet)", () => {
    const persona = makePersona({
      journey: {
        tier: "pre",
        incomeBand: null,
        onboardingVersion: "lite-v1",
        onboardingCompletedAt: "2026-08-11T00:00:00.000Z",
        filingDetailsCompleted: false,
      },
    });
    const steps = getNextSteps(persona);
    expect(steps.find((s) => s.id === "filing-details")).toBeUndefined();
    expect(steps).toHaveLength(2);
  });

  it("a legacy persona (no journey field) gets the filing-details step, already completed", () => {
    const persona = makePersona(); // no journey ⇒ getJourney() legacy fallback
    const steps = getNextSteps(persona);
    const filing = steps.find((s) => s.id === "filing-details");
    expect(filing).toBeDefined();
    expect(filing?.completed).toBe(true);
  });

  it("never returns more than 3 steps", () => {
    const persona = makePersona();
    expect(getNextSteps(persona).length).toBeLessThanOrEqual(3);
  });
});
