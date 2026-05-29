// Browser-side Supabase client. Reads cookies and refreshes them automatically.
// In demo mode, returns a mock client backed by seeded in-memory data.

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isDemoMode } from "@/lib/demo/mode";
import { createDemoClient } from "@/lib/demo/client";

export function createClient(): SupabaseClient {
  if (isDemoMode()) {
    return createDemoClient() as unknown as SupabaseClient;
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
