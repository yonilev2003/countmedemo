"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SendIcon } from "@/components/ui/icon";
import { sendMessageAction } from "@/app/(app)/chat/actions";
import { cn } from "@/lib/utils";

export function MessageComposer({
  channelId,
  placeholder,
}: {
  channelId: string;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  function send() {
    const value = text.trim();
    if (!value || pending) return;
    startTransition(async () => {
      const result = await sendMessageAction({ channelId, text: value });
      if (result.ok) {
        setText("");
        inputRef.current?.focus();
        // Realtime delivers new messages in live mode; in demo mode we
        // need to refresh to pick up the in-memory insert.
        router.refresh();
      }
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="border-t border-surface-200 p-3">
      <div className="flex items-end gap-2 rounded-xl border border-surface-300 bg-white p-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? "כתוב הודעה..."}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm leading-6 placeholder:text-surface-400 focus:outline-none"
          disabled={pending}
        />
        <Button
          type="button"
          size="icon"
          onClick={send}
          disabled={!text.trim() || pending}
          loading={pending}
          className={cn("shrink-0", !text.trim() && "opacity-50")}
          aria-label="שלח"
        >
          <SendIcon />
        </Button>
      </div>
      <div className="mt-1 text-xs text-surface-400 px-2">
        Enter לשליחה · Shift+Enter לשורה חדשה
      </div>
    </div>
  );
}
