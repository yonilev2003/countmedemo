"use client";

import { useTransition } from "react";
import { btn } from "@/components/brand/button";
import { signOut } from "@/app/auth/actions";

type Variant = "primary" | "secondary" | "ghost" | "gold";
type Size = "sm" | "md";

/**
 * Reusable sign-out control. Calls the `signOut` server action (which clears
 * the Supabase session and redirects to /login). Styled with the brand `btn()`
 * helper; defaults to a small ghost button so it sits quietly in a header.
 */
export function SignOutButton({
  variant = "ghost",
  size = "sm",
  className,
  label = "התנתקות",
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => signOut())}
      className={btn(variant, size, className)}
    >
      {isPending ? "מתנתק…" : label}
    </button>
  );
}
