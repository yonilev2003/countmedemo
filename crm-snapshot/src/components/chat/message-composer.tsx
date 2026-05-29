"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SendIcon } from "@/components/ui/icon";
import { sendMessageAction } from "@/app/(app)/chat/actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { MessageAttachment } from "@/types/db";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file
const MAX_FILES = 10;

interface PendingAttachment extends MessageAttachment {
  uploading: boolean;
  error?: string;
}

export function MessageComposer({
  channelId,
  workspaceId,
  placeholder,
}: {
  channelId: string;
  workspaceId: string;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function uploadFiles(files: File[]) {
    const supabase = createClient();
    const accepted = files.slice(0, MAX_FILES - attachments.length);
    for (const file of accepted) {
      if (file.size > MAX_FILE_BYTES) {
        setAttachments((prev) => [
          ...prev,
          {
            file_id: "",
            name: file.name,
            mime: file.type,
            size_bytes: file.size,
            uploading: false,
            error: "קובץ גדול מדי (מקס׳ 10MB)",
          },
        ]);
        continue;
      }
      const id = crypto.randomUUID();
      const path = `${workspaceId}/${channelId}/${id}-${file.name}`;
      setAttachments((prev) => [
        ...prev,
        { file_id: path, name: file.name, mime: file.type, size_bytes: file.size, uploading: true },
      ]);
      const { error } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      setAttachments((prev) =>
        prev.map((a) =>
          a.file_id === path
            ? { ...a, uploading: false, error: error?.message }
            : a,
        ),
      );
    }
  }

  function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) uploadFiles(files);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) uploadFiles(files);
  }

  function removeAttachment(path: string) {
    setAttachments((prev) => prev.filter((a) => a.file_id !== path));
  }

  function send() {
    const value = text.trim();
    const usable = attachments.filter((a) => !a.uploading && !a.error && a.file_id);
    if ((!value && usable.length === 0) || pending) return;
    if (attachments.some((a) => a.uploading)) return;
    startTransition(async () => {
      const result = await sendMessageAction({
        channelId,
        text: value,
        attachments: usable.map(({ uploading: _u, error: _e, ...a }) => a),
      });
      if (result.ok) {
        setText("");
        setAttachments([]);
        inputRef.current?.focus();
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

  const stillUploading = attachments.some((a) => a.uploading);
  const canSend = (text.trim() || attachments.some((a) => !a.error && a.file_id)) && !pending && !stillUploading;

  return (
    <div
      className="border-t border-surface-200 p-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a) => (
            <div
              key={a.file_id || a.name}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2 py-1 text-xs",
                a.error
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-surface-200 bg-surface-50 text-surface-700",
              )}
            >
              <span className="truncate max-w-[180px]">{a.name}</span>
              {a.uploading && <span className="text-surface-400">מעלה…</span>}
              {a.error && <span>· {a.error}</span>}
              <button
                type="button"
                onClick={() => removeAttachment(a.file_id || a.name)}
                className="text-surface-400 hover:text-surface-700"
                aria-label="הסר"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 rounded-xl border border-surface-300 bg-white p-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={pending || attachments.length >= MAX_FILES}
          className="shrink-0 rounded-md p-1.5 text-surface-500 hover:bg-surface-100 hover:text-surface-800 disabled:opacity-40"
          aria-label="צרף קובץ"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.93 8.8l-8.58 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={onFilePick}
        />
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
          disabled={!canSend}
          loading={pending}
          className={cn("shrink-0", !canSend && "opacity-50")}
          aria-label="שלח"
        >
          <SendIcon />
        </Button>
      </div>
      <div className="mt-1 text-xs text-surface-400 px-2">
        Enter לשליחה · Shift+Enter לשורה חדשה · גרור קבצים
      </div>
    </div>
  );
}
