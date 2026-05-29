// Demo mode: lets the app run with no Supabase / Google / Anthropic setup.
// All queries return seeded data; mutations succeed in-memory; auth is faked.
//
// Active when:
//   1. NEXT_PUBLIC_DEMO_MODE === "1", OR
//   2. NEXT_PUBLIC_SUPABASE_URL is empty/missing (auto-detect).

export function isDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "1") return true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.trim() === "" || url.startsWith("http://localhost:54321") === false && url.startsWith("https://") === false;
}

// Fake identifiers used throughout demo mode.
export const DEMO_USER_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
