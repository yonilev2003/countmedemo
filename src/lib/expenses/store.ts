/**
 * Expense CRUD on the persona-embedded array (persona.income.expenses) — the
 * same localStorage-first + DB-write-through pattern every other
 * transactional record in this app uses (see lib/expenses/types.ts header).
 * "Delete" is always a soft delete (deletedAt) — a receipt's underlying
 * Storage object is never removed, so 7-year retention holds regardless of
 * what the user does in the UI.
 */

import type { Persona, ExpenseLine } from "@/lib/persona";
import { persistPersona } from "@/lib/data/persona-store";

export function activeExpenses(persona: Persona): ExpenseLine[] {
  return (persona.income.expenses ?? []).filter((e) => !e.deletedAt);
}

function withExpenses(persona: Persona, expenses: ExpenseLine[]): Persona {
  return {
    ...persona,
    income: {
      ...persona.income,
      expenses,
      expenseCount: expenses.filter((e) => !e.deletedAt).length,
    },
  };
}

/** Appends a new expense line and persists. Returns the updated persona. */
export function addExpense(persona: Persona, line: ExpenseLine): Persona {
  const next = withExpenses(persona, [...(persona.income.expenses ?? []), line]);
  persistPersona(next);
  return next;
}

/** Soft-deletes the expense at `index` (position in the FULL array, deleted rows included). */
export function softDeleteExpense(persona: Persona, index: number): Persona {
  const expenses = (persona.income.expenses ?? []).map((e, i) =>
    i === index ? { ...e, deletedAt: new Date().toISOString() } : e,
  );
  const next = withExpenses(persona, expenses);
  persistPersona(next);
  return next;
}
