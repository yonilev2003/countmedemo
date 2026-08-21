"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action: sign the current user out and send them to /login.
 * The server client clears the Supabase auth cookies as part of signOut().
 *
 * `reason: "auto"` (2026-08-20, UX-review finding on the day the "השאר
 * אותי מחובר/ת" feature shipped: an automatic sign-out with zero explanation
 * looks exactly like a broken app to whoever hits it) tags the redirect so
 * /login can show a plain, non-alarming explanation instead of the ordinary
 * sign-in screen — the person didn't do anything wrong, they just weren't
 * remembered. A manual click (SignOutButton, no reason) stays a plain
 * redirect with no banner, since that person already knows why they're here.
 */
export async function signOut(reason?: "auto") {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(reason === "auto" ? "/login?signedOut=auto" : "/login");
}
