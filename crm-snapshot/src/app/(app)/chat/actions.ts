"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import type { MessageAttachment } from "@/types/db";

export async function sendMessageAction(args: {
  channelId: string;
  text: string;
  attachments?: MessageAttachment[];
}): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  const text = args.text.trim();
  const attachments = args.attachments ?? [];
  if (!text && attachments.length === 0) return { ok: false, error: "הודעה ריקה" };
  if (text.length > 8000) return { ok: false, error: "הודעה ארוכה מדי" };
  if (attachments.length > 10) return { ok: false, error: "יותר מדי קבצים מצורפים" };

  const { data, error } = await supabase
    .from("messages")
    .insert({
      channel_id: args.channelId,
      user_id: user.id,
      content: { text },
      attachments,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, messageId: data.id };
}

export async function createChannelAction(args: {
  workspaceId: string;
  name: string;
  topic?: string;
}): Promise<{ ok: true; channelId: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  const name = slugify(args.name);
  if (!name) return { ok: false, error: "שם לא תקין" };

  const { data, error } = await supabase
    .from("channels")
    .insert({
      workspace_id: args.workspaceId,
      name,
      type: "channel",
      topic: args.topic?.trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  // Add creator as member
  await supabase.from("channel_members").insert({ channel_id: data.id, user_id: user.id });

  revalidatePath("/chat", "layout");
  return { ok: true, channelId: data.id };
}

export async function createOrFindDmAction(args: {
  workspaceId: string;
  otherUserId: string;
}): Promise<{ ok: true; channelId: string } | { ok: false; error: string }> {
  const session = await requireSession();
  if (args.otherUserId === session.user.id) {
    return { ok: false, error: "לא ניתן לפתוח שיחה עם עצמך" };
  }

  const admin = createAdminClient();

  // Find existing DM where both users are members
  const { data: candidates } = await admin
    .from("channels")
    .select("id, members:channel_members(user_id)")
    .eq("workspace_id", args.workspaceId)
    .eq("type", "dm");

  for (const c of (candidates ?? []) as unknown as Array<{ id: string; members: { user_id: string }[] }>) {
    const userIds = c.members.map((m) => m.user_id).sort();
    const target = [session.user.id, args.otherUserId].sort();
    if (userIds.length === 2 && userIds[0] === target[0] && userIds[1] === target[1]) {
      return { ok: true, channelId: c.id };
    }
  }

  // Create new
  const { data: newChannel, error } = await admin
    .from("channels")
    .insert({
      workspace_id: args.workspaceId,
      name: null,
      type: "dm",
      created_by: session.user.id,
    })
    .select("id")
    .single();
  if (error || !newChannel) return { ok: false, error: error?.message ?? "Failed" };

  await admin
    .from("channel_members")
    .insert([
      { channel_id: newChannel.id, user_id: session.user.id },
      { channel_id: newChannel.id, user_id: args.otherUserId },
    ]);

  revalidatePath("/chat", "layout");
  return { ok: true, channelId: newChannel.id };
}
