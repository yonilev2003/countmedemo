/**
 * Canonical Anthropic model IDs — the ONLY place model strings live.
 *
 * Note: the model string is part of the prompt-cache key. Two call sites using
 * different strings for the same model (e.g. a dated ID vs. the alias) get
 * SEPARATE caches — keep every surface on these constants.
 */

/** Conversational tier — Eitan chat + coach (decision: stay on Sonnet 4.6 for beta). */
export const MODEL_SONNET = "claude-sonnet-4-6";

/** Cheap-ops tier — document extraction, parsing, classification. */
export const MODEL_HAIKU = "claude-haiku-4-5";

/** Shape of the usage block we log from every Anthropic response. */
export interface AiUsageLog {
  route: string;
  model: string;
  rounds?: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

/**
 * One-line spend log, greppable in Vercel logs as "[ai-usage]".
 * Keep it a single JSON line — dashboards and `vercel logs | grep` rely on it.
 */
export function logAiUsage(entry: AiUsageLog): void {
  console.log("[ai-usage]", JSON.stringify(entry));
}
