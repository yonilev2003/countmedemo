import { cn } from "@/lib/utils";

/**
 * Brand button styling, lifted from the Brand Kit `.btn` spec.
 * Pills by default (the product uses 999px radius); variants map to the
 * navy / beige / white-secondary / teal-ghost roles in the kit.
 *
 * Exposed as a class-builder so it composes with Next's <Link>:
 *   <Link className={btn("primary")}>…</Link>
 */
type Variant = "primary" | "secondary" | "ghost" | "gold";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap " +
  "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep " +
  "focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-brand-navy text-white shadow-brand hover:bg-navy-900",
  secondary:
    "bg-white text-brand-navy border border-line hover:border-brand-deep hover:bg-aqua-soft",
  ghost: "bg-transparent text-teal-600 hover:bg-teal-100",
  gold: "bg-brand text-brand-navy hover:bg-beige-600",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-1.5 text-[13.5px]",
  md: "px-6 py-3 text-[15px]",
};

export function btn(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className);
}

/** Convenience wrapper for plain <button> uses. */
export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return <button className={btn(variant, size, className)} {...props} />;
}
