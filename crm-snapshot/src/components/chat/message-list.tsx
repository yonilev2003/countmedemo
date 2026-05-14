"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message, Profile } from "@/types/db";
import { Avatar } from "@/components/ui/avatar";
import { relativeTime } from "@/lib/utils";

type Author = Pick<Profile, "id" | "full_name" | "email" | "avatar_url">;

interface MessageWithAuthor extends Message {
  author: Author | null;
}

export function MessageList({
  channelId,
  currentUserId,
  initialMessages,
}: {
  channelId: string;
  currentUserId: string;
  initialMessages: MessageWithAuthor[];
}) {
  const [messages, setMessages] = useState<MessageWithAuthor[]>(initialMessages);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.parent_message_id) return; // ignore thread replies for now
          // Fetch the author's profile
          const { data: author } = await supabase
            .from("profiles")
            .select("id, full_name, email, avatar_url")
            .eq("id", newMsg.user_id)
            .single<Author>();
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, author }];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  // Reset on channel change
  useEffect(() => {
    setMessages(initialMessages);
  }, [channelId, initialMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Group consecutive messages by same author within 5 minutes
  const grouped = groupMessages(messages);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="text-center text-sm text-surface-500 py-8">
          עדיין אין הודעות. תהיה הראשון 👋
        </div>
      )}
      {grouped.map((group, gi) => (
        <MessageGroup key={gi} group={group} isMine={group[0].user_id === currentUserId} />
      ))}
    </div>
  );
}

function MessageGroup({
  group,
  isMine,
}: {
  group: MessageWithAuthor[];
  isMine: boolean;
}) {
  const first = group[0];
  const author = first.author;
  const name = author?.full_name ?? author?.email ?? "משתמש";

  return (
    <div className="flex items-start gap-3 group">
      <Avatar name={name} src={author?.avatar_url} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-semibold text-surface-900">{name}</span>
          <span className="text-xs text-surface-500">{relativeTime(first.created_at)}</span>
          {isMine && <span className="text-xs text-brand-600">(אני)</span>}
        </div>
        <div className="space-y-1">
          {group.map((m) => (
            <div key={m.id} className="text-sm text-surface-800 whitespace-pre-wrap break-words">
              {m.content?.text ?? ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function groupMessages(msgs: MessageWithAuthor[]): MessageWithAuthor[][] {
  const groups: MessageWithAuthor[][] = [];
  for (const m of msgs) {
    const last = groups[groups.length - 1];
    if (
      last &&
      last[last.length - 1].user_id === m.user_id &&
      new Date(m.created_at).getTime() - new Date(last[last.length - 1].created_at).getTime() <
        5 * 60_000
    ) {
      last.push(m);
    } else {
      groups.push([m]);
    }
  }
  return groups;
}
