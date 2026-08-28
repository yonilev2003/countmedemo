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
 * Three-state fetch, carrying the payload on "exists" — the single query
 * every consumer that needs to know "does this user have a saved persona"
 * should go through (2026-08-20 introduced the three-state distinction for
 * checkRemotePersonaExists below; 25/08 QA audit found a SECOND caller,
 * syncPersonaFromDbUncached in persona-store.ts, still deriving that same
 * signal from the old two-state fetchPersona — which collapsed "no row" and
 * "the query itself failed" into the same `null`, reopening the exact
 * fail-open gap the three-state check exists to close, just on the
 * read-reconcile path instead of the write path). One function now, so the
 * two paths can't diverge again.
 */
export type PersonaFetchResult =
  | { status: "exists"; persona: Persona }
  | { status: "absent" }
  | { status: "unknown" };

export async function fetchPersonaSafe(userId: string): Promise<PersonaFetchResult> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("persona")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return { status: "unknown" };
    if (!data?.persona) return { status: "absent" };
    return { status: "exists", persona: data.persona as unknown as Persona };
  } catch {
    return { status: "unknown" };
  }
}

/**
 * Existence-only view of fetchPersonaSafe, for callers that don't need the
 * payload — kept as its own name since "does a row exist" reads clearer at
 * the call site than "the fetch's .status field" (checkAndAdoptUnclaimed in
 * persona-store.ts). A transient network/RLS error must never be read as
 * "safe to adopt" — that's the exact fail-open gap this three-state result
 * exists to close; `"unknown"` must always be handled the same as `"exists"`
 * by any caller deciding whether it's safe to write.
 */
export async function checkRemotePersonaExists(
  userId: string,
): Promise<"exists" | "absent" | "unknown"> {
  return (await fetchPersonaSafe(userId)).status;
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
