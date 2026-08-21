// Client-side data access for the user's Persona, backed by `profiles.persona`.
// Uses the browser Supabase client — import only from Client Components / client
// modules. Never throws on auth/network errors; falls back to no-op.

import { createClient } from "@/lib/supabase/client";
import type { Persona } from "@/lib/persona";
import type { Json } from "@/lib/supabase/database.types";

/** Derive the profiles.user_type enum (zaair/patur/murshe) from the rich persona. */
function userTypeFromPersona(persona: Persona): "zaair" | "patur" | "murshe" {
  if (persona.business?.isOsekZeir) return "zaair";
  return persona.business?.osekType === "morshe" ? "murshe" : "patur";
}

/** Current authenticated user id, or null when signed out. */
export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await createClient().auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Read this user's saved Persona from the DB. Null if none or signed out.
 * Pass an already-resolved `knownUserId` to skip the extra auth round-trip —
 * auth.getUser() validates the JWT against the Auth server over the network,
 * so callers that just resolved the user (e.g. syncPersonaFromDb) shouldn't
 * pay for it twice (efficiency-audit finding).
 */
export async function fetchPersona(knownUserId?: string): Promise<Persona | null> {
  try {
    const supabase = createClient();
    let userId = knownUserId;
    if (!userId) {
      const { data: auth } = await supabase.auth.getUser();
      userId = auth.user?.id;
    }
    if (!userId) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("persona")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data?.persona) return null;
    return data.persona as unknown as Persona;
  } catch {
    return null;
  }
}

/**
 * Three-state existence check (2026-08-20, adversarial-review finding on the
 * same-day "conflict" guard in persona-store.ts): `fetchPersona` collapses
 * "no row" and "the query itself failed" into the same `null` — fine for a
 * display read, but a security-critical existence check needs to tell those
 * apart. A transient network/RLS error here must never be read as "safe to
 * adopt" — that's the exact fail-open gap the guard using `fetchPersona`
 * directly had.
 */
export async function checkRemotePersonaExists(
  userId: string,
): Promise<"exists" | "absent" | "unknown"> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("persona")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return "unknown";
    return data?.persona ? "exists" : "absent";
  } catch {
    return "unknown";
  }
}

/**
 * Persist the Persona for the current user into profiles.persona and keep the
 * flat identity columns (first_name/last_name/email/user_type) in sync.
 * Returns false (no-op) when signed out or on error — never throws.
 */
export async function upsertPersona(persona: Persona): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return false;
    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: userId,
        persona: persona as unknown as Json,
        first_name: persona.personal?.firstName ?? "",
        last_name: persona.personal?.lastName ?? "",
        email: persona.contact?.email ?? "",
        user_type: userTypeFromPersona(persona),
      },
      { onConflict: "user_id" },
    );
    return !error;
  } catch {
    return false;
  }
}
