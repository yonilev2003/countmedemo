"use client";

import { useTransition } from "react";
import { btn } from "@/components/brand/button";
import { performSignOut } from "@/lib/auth/perform-sign-out";

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

  function handleSignOut() {
    startTransition(() => performSignOut());
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleSignOut}
      className={btn(variant, size, className)}
    >
      {isPending ? "מתנתק…" : label}
    </button>
  );
}
