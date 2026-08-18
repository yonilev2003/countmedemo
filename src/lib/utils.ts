import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { WheelEvent } from "react";

/** Tailwind class merger with clsx — standard shadcn helper. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * onWheel handler for input[type=number]: blurs the input when it's the one
 * currently focused. Constraint: browsers (Chrome/Firefox/Edge) silently
 * increment/decrement a FOCUSED number input on mouse-wheel scroll — on an
 * official document amount that's a real data-integrity risk (e.g. 1500 →
 * 1499 from one accidental scroll tick while the cursor passes over the
 * field). Blurring on wheel is the standard fix: once the input isn't
 * focused, the browser no longer routes the scroll into its value. Wire it
 * as `onWheel={numberInputWheelGuard}` on every numeric input.
 */
export function numberInputWheelGuard(e: WheelEvent<HTMLInputElement>) {
  if (document.activeElement === e.currentTarget) {
    e.currentTarget.blur();
  }
}

/** Format ILS currency for the demo. */
export function formatCurrency(n: number): string {
  return n.toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  });
}

/**
 * Canonical ILS display format for countme surfaces: "12,345 ₪".
 * NOTE: intentionally NOT the same output as formatCurrency — Intl's currency
 * style emits bidi marks ("‏12,345 ‏₪") and the form-1301/demo surfaces
 * already render that. Don't merge the two without a visual audit.
 * Rounding is a call-site decision: pass Math.round(n) where needed.
 */
export function ils(n: number): string {
  return `${n.toLocaleString("he-IL")} ₪`;
}

/** Format an integer with Hebrew thousands separators. */
export function formatNumber(n: number): string {
  return n.toLocaleString("he-IL");
}

/** Format an ISO date as DD.MM.YYYY (Israeli convention, with leading zeros). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}
