"use client";

import { signOut } from "@/app/auth/actions";
import { clearLocalPersona } from "@/lib/setup-storage";
import { clearFollowUpNotes } from "@/lib/crm/notes";

/**
 * Shared sign-out sequence — extracted from SignOutButton (2026-08-20) so the
 * automatic "not remembered" sign-out in persona-hydrator.tsx does exactly
 * the same cleanup as a manual click, not a lighter version of it. Clears
 * local state BEFORE the session ends, so the next person on a shared device
 * can never see the previous user's cached data; `signOut()` itself clears
 * the Supabase cookies and redirects to /login.
 */
export async function performSignOut(): Promise<void> {
  clearLocalPersona();
  clearFollowUpNotes();
  if (typeof caches !== "undefined") {
    await caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .catch(() => {});
  }
  await signOut();
}
