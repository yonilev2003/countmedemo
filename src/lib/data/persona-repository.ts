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

/** Read this user's saved Persona from the DB. Null if none or signed out. */
export async function fetchPersona(): Promise<Persona | null> {
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
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
