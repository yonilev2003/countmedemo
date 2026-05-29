// Server-only admin client using the service-role key.
// BYPASSES RLS — use only for trusted server operations
// (creating workspaces atomically, accepting invitations, sending emails, etc.).
// NEVER import from a client component.

import { createClient as createBaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { isDemoMode } from "@/lib/demo/mode";
import { createDemoClient } from "@/lib/demo/client";

export function createAdminClient(): SupabaseClient {
  if (isDemoMode()) {
    return createDemoClient() as unknown as SupabaseClient;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase admin credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createBaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
