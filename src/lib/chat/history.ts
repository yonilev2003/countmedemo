// Client-side repository for persisted chat history — multiple named
// conversations with a sidebar list ("שיחות אחרונות"), per Yoni's locked
// decision (2026-08-18, see memory/decisions.md). Backed by
// public.chat_threads / public.chat_messages
// (supabase/migrations/20260818200000_chat_history.sql).
//
// DEGRADE GRACEFULLY (mandatory — see the task brief): the migration is
// AUTHORED but the Supabase MCP available to this session cannot reach the
// live project (hbsgz), so it is NOT yet applied there. Every function here
// must survive the tables not existing yet, RLS/grants not being in place,
// or the user being signed out — by falling back to a no-op / empty result,
// never throwing, and never spamming the console. `unavailable` below is a
// one-shot circuit breaker: the first time we learn (from a Postgrest error
// code) that the schema isn't reachable, every later call in this module
// short-circuits for the rest of the page's life instead of re-querying.
//
// Persistence is client-side only for now (acceptable for beta per the task
// brief) — a server-side write is a natural follow-up once /api/chat and
// /api/coach know which thread a request belongs to.

import { createClient } from "@/lib/supabase/client";
import { getCurrentUserId } from "@/lib/data/persona-repository";

export type ChatRole = "user" | "assistant";

export interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageRow {
  id: string;
  threadId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

/** Once true, every function below short-circuits to its empty/no-op branch
 *  for the rest of this page load. Only a full reload resets it — that's
 *  intentional: a missing table isn't going to appear mid-session. */
let unavailable = false;

/** Postgrest/PostgREST error codes that mean "the schema isn't there (yet)",
 *  as opposed to a transient network/server error worth retrying next time. */
const MISSING_SCHEMA_CODES = new Set([
  "42P01", // undefined_table
  "42501", // insufficient_privilege (RLS/grants not applied yet)
  "PGRST205", // PostgREST: table not found in its schema cache
  "PGRST204", // PostgREST: column not found (partial/old schema)
]);

function noteIfSchemaMissing(error: { code?: string } | null | undefined): void {
  if (error?.code && MISSING_SCHEMA_CODES.has(error.code)) {
    unavailable = true;
  }
}

/** Thread title = first user message, trimmed to ~40 chars (mockup shape). */
export function titleFromFirstMessage(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "שיחה חדשה";
  return trimmed.length <= 40 ? trimmed : trimmed.slice(0, 40).trimEnd() + "…";
}

/** DB role → the "agent"/"user" role the chat UI components render. */
export function dbRoleToUiRole(role: ChatRole): "agent" | "user" {
  return role === "assistant" ? "agent" : "user";
}

/** This user's threads, most-recently-updated first. Empty when signed out,
 *  the tables aren't reachable yet, or on any error. */
export async function listThreads(): Promise<ChatThread[]> {
  if (unavailable) return [];
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    const { data, error } = await createClient()
      .from("chat_threads")
      .select("id, title, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) {
      noteIfSchemaMissing(error);
      return [];
    }
    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    return [];
  }
}

/** All messages in a thread, oldest first. Empty on any failure. */
export async function loadMessages(threadId: string): Promise<ChatMessageRow[]> {
  if (unavailable || !threadId) return [];
  try {
    const { data, error } = await createClient()
      .from("chat_messages")
      .select("id, thread_id, role, content, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    if (error) {
      noteIfSchemaMissing(error);
      return [];
    }
    return (data ?? []).map((row) => ({
      id: row.id,
      threadId: row.thread_id,
      role: row.role === "assistant" ? "assistant" : "user",
      content: row.content,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

/** Create a new thread owned by the current user. Null when signed out, the
 *  tables aren't reachable, or on error — callers keep working in-memory. */
export async function createThread(title: string): Promise<ChatThread | null> {
  if (unavailable) return null;
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    const { data, error } = await createClient()
      .from("chat_threads")
      .insert({ user_id: userId, title: titleFromFirstMessage(title) })
      .select("id, title, created_at, updated_at")
      .single();
    if (error || !data) {
      noteIfSchemaMissing(error);
      return null;
    }
    return {
      id: data.id,
      title: data.title,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

/** Append one message to a thread and bump its updated_at (via touchThread).
 *  Returns false on any failure — callers must keep the live chat going
 *  regardless, this is best-effort persistence only. */
export async function appendMessage(
  threadId: string,
  role: ChatRole,
  content: string,
): Promise<boolean> {
  if (unavailable || !threadId || !content) return false;
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    const { error } = await createClient()
      .from("chat_messages")
      .insert({ thread_id: threadId, user_id: userId, role, content });
    if (error) {
      noteIfSchemaMissing(error);
      return false;
    }
    void touchThread(threadId);
    return true;
  } catch {
    return false;
  }
}

/** Bump a thread's updated_at to now, so it re-sorts to the top of the
 *  sidebar. Best-effort — never throws, no return value to check. */
export async function touchThread(threadId: string): Promise<void> {
  if (unavailable || !threadId) return;
  try {
    const { error } = await createClient()
      .from("chat_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", threadId);
    noteIfSchemaMissing(error);
  } catch {
    /* best-effort only */
  }
}
