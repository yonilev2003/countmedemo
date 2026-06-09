// Server-only admin client using the service-role key.
// BYPASSES RLS — use only for trusted server operations (seeding, inviting
// users, account deletion, writing global tax_rules). NEVER import this from a
// Client Component, and never expose SUPABASE_SERVICE_ROLE_KEY via NEXT_PUBLIC_*.

import { createClient as createBaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase admin credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createBaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
