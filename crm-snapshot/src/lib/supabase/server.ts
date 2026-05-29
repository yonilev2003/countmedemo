// Server-side Supabase client (Server Components, Server Actions, Route Handlers).
// Reads cookies via Next.js cookies(), respects RLS as the logged-in user.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isDemoMode } from "@/lib/demo/mode";
import { createDemoClient } from "@/lib/demo/client";

export async function createClient(): Promise<SupabaseClient> {
  if (isDemoMode()) {
    return createDemoClient() as unknown as SupabaseClient;
  }
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component — safe to ignore;
            // session refresh will still happen via middleware.
          }
        },
      },
    },
  );
}
