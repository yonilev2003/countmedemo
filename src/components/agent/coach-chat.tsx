"use client";

import { useEffect, useRef, useState } from "react";
import { trackClient } from "@/lib/analytics/track-client";
import Link from "next/link";
import { Persona } from "@/lib/persona";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import {
  PaperclipIcon,
  MicIcon,
  SendIcon,
  XIcon,
  SparklesIcon,
  FileTextIcon,
  ArrowRightIcon,
  ClipboardCheckIcon,
  InfoIcon,
  ChevronDownIcon,
} from "@/components/brand/icons";

/** Shekel's avatar image (3D character render, cropped to the head via object-top). */
const SHEKEL_AVATAR = "/shekel/shekel-mascot.jpg";

/**
 * Shekel avatar — circular cropped image on a soft-beige disc. Falls back to
 * the navy LogoMark disc if the art is missing.
 */
function EitanAvatar({ size, className }: { size: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={cn(
        "relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-beige-100",
        failed && "bg-brand-navy",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {failed ? (
        <LogoMark size={size * 0.5} className="text-brand" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={SHEKEL_AVATAR}
          alt="שקל"
          className="h-full w-full object-cover object-top"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

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

/** Opening quick-reply prompts (the mockup's `.quicks` chips). Tapping one
 *  sends it straight through the normal streaming flow. */
const OPENING_SUGGESTIONS = [
  "אילו הוצאות מוכרות לי?",
  "מה המועד הבא שאני צריך לדווח?",
  "כמה זיכוי מס מגיע לי על תרומות?",
  "עזור לי למלא את טופס 1301",
];

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
  return `${prefix} אני שקל, השותף הדיגיטלי שלך לדוח השנתי. ${suffix}`;
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
    // Scroll ONLY the messages pane — scrollIntoView also scrolled the WINDOW
    // on mount (the greeting render), clipping the page header off the top of
    // the screen on /coach (journey scan round 2).
    const pane = messagesEndRef.current?.parentElement;
    if (pane) pane.scrollTo({ top: pane.scrollHeight, behavior: "smooth" });
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
      trackClient("coach_question_asked");
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

          // Text deltas are JSON-encoded (newline-safe); control msgs handled above.
          let text = data;
          try {
            text = JSON.parse(data) as string;
          } catch {
            /* fall back to raw data if it isn't JSON */
          }
          accumulated += text;
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
    <div className="flex h-full flex-col rounded-2xl border border-line bg-paper shadow-brand overflow-hidden">
      {/* Chat header — back · Eitan avatar + name + verified badge + status · info */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-line bg-paper">
        {/* Back to home (start side, RTL-aware chevron) */}
        <Link
          href="/dashboard"
          aria-label="חזרה ללוח הבקרה"
          className="grid size-[30px] flex-shrink-0 place-items-center text-brand-navy hover:text-teal-600 transition-colors"
        >
          <ChevronDownIcon className="size-[22px] rotate-90" />
        </Link>

        {/* Eitan avatar */}
        <EitanAvatar size={44} className="shadow-brand-sm" />

        <div className="flex-1 min-w-0">
          {/* Name + verified badge — the h1: /coach had no heading at all
              (IS 5568 journey finding), and this title IS the page. */}
          <h1 className="flex items-center gap-1.5 text-[16.5px] font-extrabold text-brand-navy leading-tight">
            <span>שקל</span>
            {/* Verified badge — teal check-circle */}
            <svg
              viewBox="0 0 16 16"
              fill="none"
              aria-label="מאומת"
              className="size-[15px] flex-shrink-0 text-brand-deep"
            >
              <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.15" />
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
              <path
                d="M5 8l2 2 4-3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </h1>
          {/* Status line */}
          <div className="flex items-center gap-1.5 mt-0.5 text-[12.5px] font-semibold text-teal-600 leading-none">
            <span className="inline-block h-[7px] w-[7px] rounded-full bg-success flex-shrink-0" />
            מחובר · עונה תוך שניות
          </div>
        </div>

        {/* Actions: new chat + info disc */}
        <button onClick={reset} className={btn("ghost", "sm")} type="button">
          שיחה חדשה
        </button>
        <button
          type="button"
          aria-label="אודות שקל"
          title="שקל — השותף הדיגיטלי שלך לדוח השנתי"
          className="grid size-[38px] flex-shrink-0 place-items-center rounded-full bg-cream text-brand-navy hover:bg-teal-100 transition-colors"
        >
          <InfoIcon className="size-[18px]" />
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 bg-gradient-to-b from-paper to-cream">
        {/* Day separator pill */}
        <div className="self-center rounded-full bg-line-soft px-3 py-1 text-[11.5px] font-bold text-faint">
          היום
        </div>

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2 max-w-[84%]",
              m.role === "agent" ? "self-start" : "self-end flex-row-reverse",
            )}
          >
            {/* Mini avatar for bot messages */}
            {m.role === "agent" && <EitanAvatar size={30} className="self-end" />}

            <div
              className={cn(
                "rounded-[18px] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                m.role === "agent"
                  /* bot bubble: white, start-cut corner, branded border */
                  ? "bg-white border border-line text-ink rounded-es-[5px]"
                  /* user bubble: navy, end-cut corner */
                  : "bg-brand-navy text-white rounded-ee-[5px]",
              )}
            >
              {m.attachment && (
                <div className="mb-2">
                  {m.attachment.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.attachment.previewUrl}
                      alt={m.attachment.name}
                      className="max-h-40 rounded-lg border border-line"
                    />
                  ) : (
                    <div className="rounded-lg bg-white/20 border border-white/30 px-2 py-1 text-[11px] inline-flex items-center gap-1.5">
                      <FileTextIcon className="size-3.5 flex-shrink-0" />
                      <span className="truncate max-w-[180px]">{m.attachment.name}</span>
                    </div>
                  )}
                </div>
              )}
              {m.text}
            </div>
          </div>
        ))}

        {/* Streaming bubble */}
        {streamingText && (
          <div className="flex gap-2 max-w-[84%] self-start">
            <EitanAvatar size={30} className="self-end" />
            <div className="rounded-[18px] rounded-es-[5px] bg-white border border-line px-3.5 py-2.5 text-sm leading-relaxed text-ink whitespace-pre-wrap">
              {streamingText}
              <span className="inline-block w-1.5 h-3.5 bg-brand-deep/40 animate-pulse ms-0.5 align-middle" />
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isLoading && !streamingText && (
          <div className="flex gap-2 max-w-[84%] self-start">
            <EitanAvatar size={30} className="self-end" />
            <div className="rounded-[18px] rounded-es-[5px] bg-white border border-line px-4 py-3 w-fit">
              <span className="inline-flex gap-1">
                <span className="inline-block h-[7px] w-[7px] rounded-full bg-beige-600 animate-bounce [animation-delay:0ms]" />
                <span className="inline-block h-[7px] w-[7px] rounded-full bg-beige-600 animate-bounce [animation-delay:200ms]" />
                <span className="inline-block h-[7px] w-[7px] rounded-full bg-beige-600 animate-bounce [animation-delay:400ms]" />
              </span>
            </div>
          </div>
        )}

        {/* Opening quick-reply chips — only before the first user turn */}
        {messages.length === 1 && !isLoading && !streamingText && (
          <div className="mt-1 flex max-w-[92%] flex-wrap gap-2 self-start">
            {OPENING_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendMessage(s, null)}
                className="rounded-full border border-teal-100 bg-white px-3.5 py-2 text-[13px] font-semibold text-teal-600 transition-colors hover:bg-teal-100"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick-reply chips — summary shortcut */}
      {messages.length >= 2 && !isLoading && (
        <div className="px-4 pt-3 pb-1 flex gap-2 flex-wrap bg-cream border-t border-line-soft">
          <button
            type="button"
            onClick={sendSummary}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-full border border-teal-100 bg-white px-3.5 py-2 text-[13px] font-semibold text-teal-600 hover:bg-teal-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <SparklesIcon className="size-3.5" />
            סיכום השיחה
          </button>
        </div>
      )}

      {/* CTA bar — contextual links */}
      {persona && (
        <div className="border-t border-line bg-success-light/60 px-4 py-2 text-[11px] text-brand-navy flex items-center justify-between gap-2">
          <span>סיימת? אפשר לחזור ללוח הבקרה</span>
          <Link
            href="/dashboard"
            className={btn("primary", "sm", "gap-1")}
          >
            ללוח הבית
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      )}
      {!persona && (
        <div className="border-t border-line bg-beige-100/60 px-4 py-2 text-[11px] text-brand-navy flex items-center justify-between gap-2">
          <span>רוצה לראות מדריך מלא להוצאות לעיסוק שלך?</span>
          <Link
            href="/business-expenses"
            className={btn("gold", "sm", "gap-1")}
          >
            <ClipboardCheckIcon className="size-3.5" />
            המדריך המלא
          </Link>
        </div>
      )}

      {/* Input bar */}
      <div className="flex-shrink-0 border-t border-line bg-paper px-4 pt-2.5 pb-6">
        {/* Attachment preview chip */}
        {attachment && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-100/50 px-2.5 py-1.5">
            {attachment.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attachment.previewUrl}
                alt={attachment.name}
                className="h-10 w-10 rounded-md object-cover border border-line"
              />
            ) : (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-paper border border-line text-brand-deep">
                <FileTextIcon className="size-5" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-brand-navy truncate">
                {attachment.name}
              </div>
              <div className="text-[10px] text-teal-600">
                מצורף — ישלח עם ההודעה הבאה
              </div>
            </div>
            <button
              onClick={clearAttachment}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-muted hover:text-ink hover:bg-sand transition-colors"
              aria-label="הסר קובץ"
              type="button"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        )}

        {/* Attachment error */}
        {attachError && (
          <div className="mb-2 rounded-lg bg-overdue-bg border border-line px-3 py-1.5 text-[11px] text-ink">
            {attachError}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-center gap-2.5">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            onChange={onFilePicked}
            className="hidden"
          />

          {/* Input field with inline paperclip (clip sits at inline-start, per mockup) */}
          <div className="flex flex-1 items-center gap-2.5 rounded-full border border-line bg-cream px-4 py-2.5">
            {/* Paperclip inside field */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              type="button"
              className="flex-shrink-0 text-faint hover:text-brand-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="צרף קבלה (JPG/PNG) או PDF"
              aria-label="צרף קובץ"
            >
              <PaperclipIcon className="size-[19px]" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              aria-label="הודעה לשקל"
              placeholder={
                attachment
                  ? "הוסיפי שאלה (אופציונלי) ושלחי..."
                  : "כתוב/י הודעה לשקל..."
              }
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none text-[14.5px] text-ink placeholder:text-faint text-end disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Mic button — beige */}
          <button
            type="button"
            disabled={isLoading}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand text-brand-navy hover:bg-beige-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-brand-sm"
            aria-label="הקלטה קולית"
            title="הקלטה קולית"
          >
            <MicIcon className="size-[21px]" />
          </button>

          {/* Send button — navy */}
          <button
            onClick={send}
            disabled={isLoading || (!input.trim() && !attachment)}
            type="button"
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-navy text-white hover:bg-navy-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-brand-sm"
            aria-label="שלח"
          >
            <SendIcon className="size-[21px]" />
          </button>
        </div>

        {/* Status line */}
        <div className="mt-2 text-end text-[10px] text-faint">
          {isLoading
            ? "מחובר ל-Claude Sonnet — מעבד..."
            : "מחובר ל-Claude Sonnet · אפשר לצרף קבלה או PDF"}
        </div>
      </div>
    </div>
  );
}
