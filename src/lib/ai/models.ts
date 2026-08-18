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

import type Anthropic from "@anthropic-ai/sdk";

/**
 * Return a copy of `messages` where ONLY the final content block of the final
 * message carries a cache_control breakpoint (any earlier message-level
 * breakpoints are stripped — Anthropic allows max 4 per request, and the
 * chat route's system blocks already use 3 (instructions + persona snapshot
 * + knowledge TOC, RAG audit #20) — so this is the last one available.
 * Serving tool-loop rounds 2+ and
 * follow-up turns within the TTL from cache is the single biggest saving on
 * long chats and PDF-attachment turns.
 */
export function withMessageCacheBreakpoint(
  messages: Anthropic.MessageParam[],
): Anthropic.MessageParam[] {
  if (messages.length === 0) return messages;
  const cleaned = messages.map((m): Anthropic.MessageParam => {
    if (typeof m.content === "string") return m;
    return {
      ...m,
      content: m.content.map((b): Anthropic.ContentBlockParam => {
        if ("cache_control" in b && b.cache_control) {
          const rest = { ...b };
          delete rest.cache_control;
          return rest;
        }
        return b;
      }),
    };
  });
  const last = cleaned[cleaned.length - 1];
  const blocks: Anthropic.ContentBlockParam[] =
    typeof last.content === "string"
      ? [{ type: "text", text: last.content }]
      : [...last.content];
  blocks[blocks.length - 1] = {
    ...blocks[blocks.length - 1],
    cache_control: { type: "ephemeral" },
  } as Anthropic.ContentBlockParam;
  cleaned[cleaned.length - 1] = { ...last, content: blocks };
  return cleaned;
}
