"use client";

import { useTransition } from "react";
import { btn } from "@/components/brand/button";
import { signOut } from "@/app/auth/actions";
import { clearLocalPersona } from "@/lib/setup-storage";
import { clearFollowUpNotes } from "@/lib/crm/notes";

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

  // Drop the local persona cache (and follow-up notes) BEFORE the session ends,
  // so the next user on this browser can never see the previous user's data.
  // For logged-in users the DB (profiles.persona) is the source of truth; this
  // cache is rehydrated from the DB on next login by the PersonaHydrator.
  function handleSignOut() {
    clearLocalPersona();
    clearFollowUpNotes();
    // Privacy: the service worker caches rendered (authenticated) pages in
    // Cache Storage — purge them so a later user of this browser can't read
    // the previous user's dashboard/financial pages from cache. Best-effort.
    if (typeof caches !== "undefined") {
      void caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {});
    }
    startTransition(() => signOut());
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
