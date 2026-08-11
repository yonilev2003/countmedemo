/**
 * "מה כבר יש לך" / "הצעד הבא" — the bridge from onboarding's celebration
 * screen to the dashboard (beta, docs/specs/beta/onboarding.md §6, ONB-8).
 *
 * Gamification v1 is deliberately minimal: no points, no streaks, no stored
 * "progress" state. Every step here is DERIVED from real persona data on
 * every read — nothing is written or cached. The dashboard (a separate
 * ticket) is expected to consume this interface to render up to 3 "what's
 * next" cards with a checkmark on completed ones.
 */

import { getJourney, type Persona } from "@/lib/persona";

export type NextStepId = "first-document" | "first-expense" | "filing-details";

export interface NextStep {
  id: NextStepId;
  labelHe: string;
  hintHe: string;
  href: string;
  completed: boolean;
}

/**
 * Up to 3 next steps for the current persona. Order matches the spec:
 * first document → first expense → filing details. The "filing details"
 * step is omitted entirely for tier === "pre" (unlock matrix §4: no open
 * file yet, so completing the annual-return details isn't actionable).
 */
export function getNextSteps(persona: Persona): NextStep[] {
  const journey = getJourney(persona);
  const steps: NextStep[] = [
    {
      id: "first-document",
      labelHe: "הפקת המסמך הראשון שלך",
      hintHe: "חשבונית מס, קבלה או הצעת מחיר ללקוח",
      href: "/invoices/new",
      completed: (persona.income.invoices?.length ?? 0) > 0,
    },
    {
      id: "first-expense",
      labelHe: "תיעוד ההוצאה הראשונה שלך",
      hintHe: "כל קבלה שנרשמת מקטינה את ההכנסה החייבת",
      href: "/business-expenses",
      completed: (persona.income.expenses?.length ?? 0) > 0,
    },
  ];

  if (journey.tier !== "pre") {
    steps.push({
      id: "filing-details",
      labelHe: "השלמת פרטים לדוח השנתי",
      hintHe: "תעודת זהות, בנק, ביטוח לאומי ועוד — כמה דקות",
      href: "/setup",
      completed: journey.filingDetailsCompleted,
    });
  }

  return steps.slice(0, 3);
}
