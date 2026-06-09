/**
 * Shared request-body validation for the chat-style API routes
 * (/api/chat, /api/coach, /api/parse-invoice).
 */

export const MAX_MESSAGE_CHARS = 2000;
export const MAX_HISTORY_ITEMS = 40;
export const MAX_HISTORY_ITEM_CHARS = 4000;

export interface HistoryItem {
  role: "user" | "assistant";
  content: string;
}

/** Strip control chars (except newline/tab) — simple sanitization. */
export function sanitizeText(s: string): string {
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

export function validateMessage(
  raw: unknown,
  maxChars = MAX_MESSAGE_CHARS,
): { ok: true; message: string } | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return { ok: false, error: "message must be a string" };
  }
  const message = sanitizeText(raw);
  if (message.length === 0) return { ok: false, error: "message is empty" };
  if (message.length > maxChars) {
    return { ok: false, error: `message exceeds ${maxChars} chars` };
  }
  return { ok: true, message };
}

export function validateHistory(
  raw: unknown,
): { ok: true; history: HistoryItem[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "history must be an array" };
  }
  if (raw.length > MAX_HISTORY_ITEMS) {
    return { ok: false, error: `history exceeds ${MAX_HISTORY_ITEMS} items` };
  }
  const history: HistoryItem[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) {
      return { ok: false, error: "history item must be an object" };
    }
    const it = item as Record<string, unknown>;
    if (it.role !== "user" && it.role !== "assistant") {
      return { ok: false, error: "history role must be user or assistant" };
    }
    if (typeof it.content !== "string") {
      return { ok: false, error: "history content must be a string" };
    }
    if (it.content.length > MAX_HISTORY_ITEM_CHARS) {
      return { ok: false, error: "history item too long" };
    }
    history.push({ role: it.role, content: it.content });
  }
  return { ok: true, history };
}
