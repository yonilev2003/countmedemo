"use client";

import { useEffect, useRef, useState, useMemo, Fragment } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message, Profile, MessageAttachment } from "@/types/db";
import { Avatar } from "@/components/ui/avatar";
import { relativeTime } from "@/lib/utils";

type Author = Pick<Profile, "id" | "full_name" | "email" | "avatar_url">;
type Member = Pick<Profile, "id" | "full_name" | "email">;

interface MessageWithAuthor extends Message {
  author: Author | null;
}

export function MessageList({
  channelId,
  currentUserId,
  initialMessages,
  members,
}: {
  channelId: string;
  currentUserId: string;
  initialMessages: MessageWithAuthor[];
  members: Member[];
}) {
  const [messages, setMessages] = useState<MessageWithAuthor[]>(initialMessages);
  const scrollRef = useRef<HTMLDivElement>(null);

  const mentionNames = useMemo(() => {
    return members
      .map((m) => {
        const first = (m.full_name ?? m.email).trim().split(/\s+/)[0];
        return first.toLowerCase();
      })
      .filter(Boolean);
  }, [members]);

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

  useEffect(() => {
    setMessages(initialMessages);
  }, [channelId, initialMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const grouped = groupMessages(messages);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="text-center text-sm text-surface-500 py-8">
          עדיין אין הודעות. תהיה הראשון 👋
        </div>
      )}
      {grouped.map((group, gi) => (
        <MessageGroup
          key={gi}
          group={group}
          isMine={group[0].user_id === currentUserId}
          mentionNames={mentionNames}
        />
      ))}
    </div>
  );
}

function MessageGroup({
  group,
  isMine,
  mentionNames,
}: {
  group: MessageWithAuthor[];
  isMine: boolean;
  mentionNames: string[];
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
            <div key={m.id}>
              {m.content?.text && (
                <div className="text-sm text-surface-800 whitespace-pre-wrap break-words">
                  {renderWithMentions(m.content.text, mentionNames)}
                </div>
              )}
              {m.attachments && m.attachments.length > 0 && (
                <AttachmentList attachments={m.attachments} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function renderWithMentions(text: string, mentionNames: string[]) {
  if (mentionNames.length === 0) return text;
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      const name = part.slice(1).toLowerCase();
      if (mentionNames.includes(name)) {
        return (
          <span
            key={i}
            className="text-brand-700 bg-brand-50 px-1 rounded font-medium"
          >
            {part}
          </span>
        );
      }
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function AttachmentList({ attachments }: { attachments: MessageAttachment[] }) {
  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {attachments.map((a) => (
        <Attachment key={a.file_id} attachment={a} />
      ))}
    </div>
  );
}

function Attachment({ attachment }: { attachment: MessageAttachment }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.storage
      .from("chat-attachments")
      .createSignedUrl(attachment.file_id, 60 * 60)
      .then(({ data }) => {
        if (active && data?.signedUrl) setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [attachment.file_id]);

  const isImage = attachment.mime?.startsWith("image/");

  if (isImage && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-lg border border-surface-200"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={attachment.name}
          className="max-h-64 max-w-xs object-contain"
        />
      </a>
    );
  }

  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.name}
      className="inline-flex items-center gap-2 rounded-md border border-surface-200 bg-surface-50 px-3 py-1.5 text-xs text-surface-700 hover:bg-surface-100"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span className="truncate max-w-[180px]">{attachment.name}</span>
      <span className="text-surface-400">{formatBytes(attachment.size_bytes)}</span>
    </a>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / (1024 * 1024)).toFixed(1)}MB`;
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
