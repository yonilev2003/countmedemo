import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind class merger with clsx — standard shadcn helper. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an Israeli ID with separators: 318274561 → 318-27456-1 */
export function formatTeudatZehut(id: string): string {
  if (id.length !== 9) return id;
  return `${id.slice(0, 3)}-${id.slice(3, 8)}-${id.slice(8)}`;
}

/** Format ILS currency for the demo. */
export function formatCurrency(n: number): string {
  return n.toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  });
}

/** Format an integer with Hebrew thousands separators. */
export function formatNumber(n: number): string {
  return n.toLocaleString("he-IL");
}

/** Format an ISO date as DD/MM/YYYY (Israeli convention). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("he-IL");
}
