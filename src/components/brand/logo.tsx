import { cn } from "@/lib/utils";

/**
 * The CountMe "¢" mark — a C drawn as an arc with a vertical currency stroke.
 * Geometry lifted verbatim from the Brand Kit (viewBox 0 0 100 112).
 * Colored via `currentColor`, so set it with a text-* class (defaults to beige).
 */
export function LogoMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size * 1.12}
      viewBox="0 0 100 112"
      fill="none"
      aria-hidden="true"
      className={cn("text-brand", className)}
    >
      <path
        d="M72.1 31.5 A33 33 0 1 0 72.1 80.5"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="15"
        x2="50"
        y2="97"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Mark + "CountMe" wordmark lockup (Assistant 800, navy). */
export function Logo({
  size = 28,
  showWordmark = true,
  className,
  markClassName,
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} className={markClassName} />
      {showWordmark && (
        <span className="font-display text-base font-extrabold tracking-tight text-brand-navy">
          CountMe
        </span>
      )}
    </span>
  );
}
