/**
 * Chat API endpoint — placeholder for tomorrow's Claude API integration.
 *
 * Tomorrow we'll wire this up using @anthropic-ai/sdk with prompt caching:
 *  - System prompt: an "Israeli tax filing assistant" persona briefed with
 *    the user's persona + outputs from the calculators
 *  - Read ANTHROPIC_API_KEY from process.env (set on Vercel as a secret)
 *  - Use claude-sonnet-4-6 by default; cache the system prompt + persona
 *    block so repeated turns are cheap
 *
 * For tonight: returns a 501 so the frontend mock keeps working.
 */
export async function POST() {
  return new Response(
    JSON.stringify({
      error:
        "Chat API not wired yet — Claude SDK integration is the first task tomorrow. The frontend uses mock responses until then.",
    }),
    {
      status: 501,
      headers: { "content-type": "application/json" },
    },
  );
}
