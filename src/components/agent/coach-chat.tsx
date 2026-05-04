"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Persona } from "@/lib/persona";
import { cn } from "@/lib/utils";

type Attachment = {
  name: string;
  /** Image MIME (jpeg/png/...) or "application/pdf". */
  mediaType: string;
  /** Base64 without the `data:...;base64,` prefix. */
  data: string;
  /** Object URL for image preview, null for PDF. */
  previewUrl: string | null;
};

type Message = {
  role: "agent" | "user";
  text: string;
  attachment?: { name: string; previewUrl: string | null };
};

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

async function fileToAttachment(file: File): Promise<Attachment> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const data = btoa(binary);
  const previewUrl = file.type.startsWith("image/")
    ? URL.createObjectURL(file)
    : null;
  return { name: file.name, mediaType: file.type, data, previewUrl };
}

function eitanGreeting(persona: Persona | null | undefined): string {
  const name = persona?.personal.firstName;
  const female = persona?.personal.gender !== "male";
  const prefix = name ? `היי ${name}` : "היי";
  const suffix = female
    ? "ספרי לי בקצרה מה את צריכה היום?"
    : "ספר לי בקצרה מה אתה צריך היום?";
  return `${prefix} 👋 אני איתן, השותף הדיגיטלי שלך לדוח השנתי. ${suffix}`;
}

interface Props {
  /** Optional persona — used for greeting and richer context in conversations. */
  persona?: Persona | null;
}

export function CoachChat({ persona }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>(
    [],
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show Eitan's greeting immediately on mount
  useEffect(() => {
    setMessages([{ role: "agent", text: eitanGreeting(persona) }]);
    historyRef.current = [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  function reset() {
    setMessages([{ role: "agent", text: eitanGreeting(persona) }]);
    setStreamingText("");
    setInput("");
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
    setAttachError(null);
    historyRef.current = [];
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setAttachError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setAttachError("פורמט לא נתמך. אפשר תמונה (JPG/PNG/GIF/WebP) או PDF.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setAttachError("הקובץ גדול מדי. מקסימום 5MB.");
      return;
    }
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    const att = await fileToAttachment(file);
    setAttachment(att);
  }

  function clearAttachment() {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
    setAttachError(null);
  }

  async function sendMessage(messageText: string, sentAttachment: Attachment | null) {
    if ((!messageText.trim() && !sentAttachment) || isLoading) return;

    const resolvedText =
      messageText.trim() ||
      (sentAttachment?.mediaType === "application/pdf"
        ? "אפשר/י לעבור על המסמך הזה ולספר לי מה את רואה?"
        : "אפשר/י להסתכל על הקבלה הזאת ולומר אם היא מוכרת לעסק?");

    const userMsg: Message = {
      role: "user",
      text: messageText.trim() || resolvedText,
      attachment: sentAttachment
        ? { name: sentAttachment.name, previewUrl: sentAttachment.previewUrl }
        : undefined,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setAttachment(null);
    setAttachError(null);
    setIsLoading(true);
    setStreamingText("");

    const history = historyRef.current.slice(-20);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: resolvedText,
          history,
          // No explicit mode — defaults to "eitan" on the server
          persona: persona ?? null,
          attachment: sentAttachment
            ? {
                name: sentAttachment.name,
                mediaType: sentAttachment.mediaType,
                data: sentAttachment.data,
              }
            : null,
        }),
      });

      if (!res.ok) {
        let errorText = "אירעה שגיאה בחיבור ל-Claude. נסי שוב.";
        try {
          const json = await res.json();
          if (json?.error) {
            errorText =
              res.status === 503
                ? "מפתח ה-API אינו מוגדר. פני למנהל המערכת."
                : `שגיאה: ${json.error}`;
          }
        } catch {
          // ignore
        }
        setMessages((m) => [...m, { role: "agent", text: errorText }]);
        setIsLoading(false);
        return;
      }

      if (!res.body) {
        setMessages((m) => [
          ...m,
          { role: "agent", text: "שגיאה: אין תגובה מהשרת." },
        ]);
        setIsLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);

          if (data === "[DONE]") {
            const finalText = accumulated || "לא התקבלה תשובה.";
            setMessages((m) => [...m, { role: "agent", text: finalText }]);
            setStreamingText("");
            historyRef.current = [
              ...historyRef.current,
              {
                role: "user",
                content: sentAttachment
                  ? `${resolvedText} [קובץ מצורף: ${sentAttachment.name}]`
                  : resolvedText,
              },
              { role: "assistant", content: finalText },
            ];
            setIsLoading(false);
            return;
          }

          if (data.startsWith("[ERROR] ")) {
            const errMsg = data.slice(8);
            setMessages((m) => [...m, { role: "agent", text: errMsg }]);
            setStreamingText("");
            setIsLoading(false);
            return;
          }

          accumulated += data;
          setStreamingText(accumulated);
        }
      }

      if (accumulated) {
        setMessages((m) => [...m, { role: "agent", text: accumulated }]);
        historyRef.current = [
          ...historyRef.current,
          { role: "user", content: resolvedText },
          { role: "assistant", content: accumulated },
        ];
      }
      setStreamingText("");
      setIsLoading(false);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "agent",
          text: "שגיאת רשת — לא ניתן להתחבר לשרת. בדקי את החיבור ונסי שוב.",
        },
      ]);
      setStreamingText("");
      setIsLoading(false);
    }
  }

  async function send() {
    if ((!input.trim() && !attachment) || isLoading) return;
    const sentAttachment = attachment;
    await sendMessage(input, sentAttachment);
  }

  async function sendSummary() {
    if (isLoading) return;
    const summaryPrompt =
      "תסכם לי את השיחה שלנו — מה הוצאות מצאנו, כמה זיכוי מס על תרומות, ואם הכל מוכן להגשה";
    await sendMessage(summaryPrompt, null);
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-stone-200 bg-gradient-to-l from-info/40 to-cream px-4 py-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-success to-brand-navy text-white font-bold shadow-sm">
          ✦
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">איתן · שותף countme שלך</div>
          <div className="text-xs text-stone-500 truncate">ייעוץ כספי אישי</div>
        </div>
        <button
          onClick={reset}
          className="rounded-full border border-stone-300 px-3 py-1 text-[11px] text-stone-600 hover:bg-stone-100 transition-colors shrink-0"
        >
          שיחה חדשה
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap",
              m.role === "agent"
                ? "bg-info text-brand-navy"
                : "ml-auto bg-brand-navy text-white",
            )}
          >
            {m.attachment && (
              <div className="mb-2">
                {m.attachment.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.attachment.previewUrl}
                    alt={m.attachment.name}
                    className="max-h-40 rounded-lg border border-emerald-300"
                  />
                ) : (
                  <div className="rounded-lg bg-white/20 border border-white/40 px-2 py-1 text-[11px] inline-flex items-center gap-1.5">
                    📄 <span className="truncate max-w-[180px]">{m.attachment.name}</span>
                  </div>
                )}
              </div>
            )}
            {m.text}
          </div>
        ))}

        {streamingText && (
          <div className="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed bg-info text-brand-navy whitespace-pre-wrap">
            {streamingText}
            <span className="inline-block w-1.5 h-3.5 bg-brand-navy/40 animate-pulse ml-0.5 align-middle" />
          </div>
        )}

        {isLoading && !streamingText && (
          <div className="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed bg-info text-brand-navy/50">
            <span className="inline-flex gap-1">
              <span className="animate-bounce [animation-delay:0ms]">•</span>
              <span className="animate-bounce [animation-delay:150ms]">•</span>
              <span className="animate-bounce [animation-delay:300ms]">•</span>
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* CTA bar — links to form and expense guide */}
      {persona && (
        <div className="border-t border-stone-200 bg-success/10 px-4 py-2 text-[11px] text-brand-navy flex items-center justify-between gap-2">
          <span>סיימת? אפשר לחזור לטופס המלא</span>
          <Link
            href="/demo"
            className="rounded-full bg-success hover:bg-success/90 text-white font-bold px-3 py-1 text-[11px] transition-colors"
          >
            לטופס 1301 ←
          </Link>
        </div>
      )}
      {!persona && (
        <div className="border-t border-stone-200 bg-success/10 px-4 py-2 text-[11px] text-brand-navy flex items-center justify-between gap-2">
          <span>רוצה לראות מדריך מלא להוצאות לעיסוק שלך?</span>
          <Link
            href="/business-expenses"
            className="rounded-full bg-success hover:bg-success/90 text-white font-bold px-3 py-1 text-[11px] transition-colors"
          >
            המדריך המלא ←
          </Link>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-stone-200 p-3">
        {/* Attachment preview chip */}
        {attachment && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-2.5 py-1.5">
            {attachment.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attachment.previewUrl}
                alt={attachment.name}
                className="h-10 w-10 rounded-md object-cover border border-success/40"
              />
            ) : (
              <div className="h-10 w-10 rounded-md bg-white border border-success/40 flex items-center justify-center text-lg">
                📄
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-brand-navy truncate">
                {attachment.name}
              </div>
              <div className="text-[10px] text-success">
                מצורף — ישלח עם ההודעה הבאה
              </div>
            </div>
            <button
              onClick={clearAttachment}
              className="text-stone-500 hover:text-stone-800 text-lg leading-none"
              aria-label="הסר קובץ"
              type="button"
            >
              ×
            </button>
          </div>
        )}
        {attachError && (
          <div className="mb-2 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-[11px] text-red-700">
            {attachError}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            onChange={onFilePicked}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            type="button"
            className="rounded-full border border-stone-300 bg-white px-3 py-2 text-stone-600 hover:bg-success/10 hover:border-success/50 hover:text-success transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="צרף קבלה (JPG/PNG) או PDF"
            aria-label="צרף קובץ"
          >
            📎
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={
              attachment
                ? "הוסיפי שאלה (אופציונלי) ושלחי..."
                : "כתוב/י הודעה לאיתן..."
            }
            disabled={isLoading}
            className="flex-1 rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm placeholder:text-stone-400 focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-info disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            onClick={send}
            disabled={isLoading || (!input.trim() && !attachment)}
            className="rounded-full bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "..." : "שלח"}
          </button>
        </div>

        {/* Summary shortcut */}
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={sendSummary}
            disabled={isLoading || messages.length < 2}
            className="text-xs text-success/80 hover:text-success underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
          >
            סיכום השיחה ✦
          </button>
          <div className="text-[10px] text-stone-400">
            {isLoading
              ? "מחובר ל-Claude Sonnet — מעבד..."
              : "מחובר ל-Claude Sonnet · אפשר לצרף קבלה או PDF"}
          </div>
        </div>
      </div>
    </div>
  );
}
