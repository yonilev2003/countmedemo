"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Persona } from "@/lib/persona";
import { cn } from "@/lib/utils";

export type CoachMode = "audit" | "discover";

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

interface Props {
  /** Optional persona — only used in audit mode for richer context. */
  persona?: Persona | null;
}

const greetingFor = (mode: CoachMode, persona?: Persona | null): Message[] => {
  if (mode === "audit") {
    const name = persona?.personal.firstName;
    const opener = name
      ? `שלום ${name}! אני המאמן של countme.`
      : `שלום! אני המאמן של countme.`;
    return [
      {
        role: "agent",
        text: `${opener} לפני שמגישות את דוח 1301, בוא נעבור יחד על ההוצאות שלך - אני אעזור לוודא שלא פיספסת שום הוצאה מוכרת ושהכל מסווג נכון לפי פקודת מס הכנסה.`,
      },
      {
        role: "agent",
        text: "אתחיל בשאלה שהרבה עצמאים שוכחים: את עובדת מהבית? אם כן, את יכולה להכיר חלק יחסי משכר הדירה, החשמל, המים והארנונה כהוצאה.",
      },
    ];
  }
  return [
    {
      role: "agent",
      text: "שלום! אני המאמן של countme, ואני כאן כדי לעזור לך לזהות אילו הוצאות עסקיות מוכרות יש לך - גם כאלה שעצמאים רבים לא חושבים עליהן.",
    },
    {
      role: "agent",
      text: "אני יודע שכשמתחילים בעצמאות זה יכול להיות מבלבל - מה נחשב הוצאה מוכרת ומה לא. אבל בעדינות נגלה ביחד, ויש כאן כסף אמיתי להחזיר.",
    },
    {
      role: "agent",
      text: "נתחיל בקטן - באיזה תחום העסק שלך, ואיפה את עובדת ביום-יום (מהבית, חלל עבודה, אצל לקוחות)?",
    },
  ];
};

export function CoachChat({ persona }: Props) {
  const [mode, setMode] = useState<CoachMode | null>(null);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  function pickMode(m: CoachMode) {
    setMode(m);
    setMessages(greetingFor(m, persona));
    historyRef.current = [];
  }

  function reset() {
    setMode(null);
    setMessages([]);
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

  async function send() {
    const trimmed = input.trim();
    // Allow sending with just an attachment + a default prompt, but require either one.
    if ((!trimmed && !attachment) || isLoading || !mode) return;

    const messageText =
      trimmed ||
      (attachment?.mediaType === "application/pdf"
        ? "אפשר/י לעבור על המסמך הזה ולספר לי מה את רואה?"
        : "אפשר/י להסתכל על הקבלה הזאת ולומר אם היא מוכרת לעסק?");

    const sentAttachment = attachment;
    const userMsg: Message = {
      role: "user",
      text: trimmed || messageText,
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
          message: messageText,
          history,
          mode,
          persona: mode === "audit" ? persona ?? null : null,
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
                  ? `${messageText} [קובץ מצורף: ${sentAttachment.name}]`
                  : messageText,
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
          { role: "user", content: trimmed },
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

  if (!mode) {
    return <ModePicker persona={persona} onPick={pickMode} />;
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-stone-200 bg-gradient-to-l from-emerald-50 to-white px-4 py-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-bold shadow-sm">
          ✦
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">המאמן של countme</div>
          <div className="text-xs text-stone-500 truncate">
            {mode === "audit"
              ? "ביקורת טרום-הגשה לטופס 1301"
              : "גילוי הוצאות לעצמאית מתחילה"}
          </div>
        </div>
        <button
          onClick={reset}
          className="rounded-full border border-stone-300 px-3 py-1 text-[11px] text-stone-600 hover:bg-stone-100 transition-colors shrink-0"
        >
          החלף נושא
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
                ? "bg-stone-100 text-stone-800"
                : "ml-auto bg-emerald-600 text-white",
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
          <div className="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed bg-stone-100 text-stone-800 whitespace-pre-wrap">
            {streamingText}
            <span className="inline-block w-1.5 h-3.5 bg-stone-400 animate-pulse ml-0.5 align-middle" />
          </div>
        )}

        {isLoading && !streamingText && (
          <div className="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed bg-stone-100 text-stone-400">
            <span className="inline-flex gap-1">
              <span className="animate-bounce [animation-delay:0ms]">•</span>
              <span className="animate-bounce [animation-delay:150ms]">•</span>
              <span className="animate-bounce [animation-delay:300ms]">•</span>
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* CTA bar — only in audit mode, only if persona exists */}
      {mode === "audit" && persona && (
        <div className="border-t border-stone-200 bg-emerald-50 px-4 py-2 text-[11px] text-emerald-800 flex items-center justify-between gap-2">
          <span>סיימת? אפשר לחזור לטופס המלא</span>
          <Link
            href="/demo"
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 text-[11px] transition-colors"
          >
            לטופס 1301 ←
          </Link>
        </div>
      )}
      {mode === "discover" && (
        <div className="border-t border-stone-200 bg-emerald-50 px-4 py-2 text-[11px] text-emerald-800 flex items-center justify-between gap-2">
          <span>רוצה לראות מדריך מלא להוצאות לעיסוק שלך?</span>
          <Link
            href="/business-expenses"
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 text-[11px] transition-colors"
          >
            המדריך המלא ←
          </Link>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-stone-200 p-3">
        {/* Attachment preview chip */}
        {attachment && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
            {attachment.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attachment.previewUrl}
                alt={attachment.name}
                className="h-10 w-10 rounded-md object-cover border border-emerald-300"
              />
            ) : (
              <div className="h-10 w-10 rounded-md bg-white border border-emerald-300 flex items-center justify-center text-lg">
                📄
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-emerald-900 truncate">
                {attachment.name}
              </div>
              <div className="text-[10px] text-emerald-700">
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
            className="rounded-full border border-stone-300 bg-white px-3 py-2 text-stone-600 hover:bg-stone-100 hover:border-emerald-300 hover:text-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                : mode === "audit"
                  ? "ענה לשאלה או שאל משהו משלך..."
                  : "ענה ובוא נמשיך..."
            }
            disabled={isLoading}
            className="flex-1 rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            onClick={send}
            disabled={isLoading || (!input.trim() && !attachment)}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "..." : "שלח"}
          </button>
        </div>
        <div className="mt-2 text-center text-[10px] text-stone-400">
          {isLoading
            ? "מחובר ל-Claude Sonnet — מעבד..."
            : "מחובר ל-Claude Sonnet · אפשר לצרף קבלה או PDF"}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Mode picker — shown before the chat starts.
   ────────────────────────────────────────────────────────── */
function ModePicker({
  persona,
  onPick,
}: {
  persona?: Persona | null;
  onPick: (m: CoachMode) => void;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-stone-200 bg-gradient-to-l from-emerald-50 to-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-lg font-bold shadow-sm">
            ✦
          </div>
          <div>
            <h2 className="text-base font-bold">המאמן של countme</h2>
            <p className="text-xs text-stone-500">
              שיחה אישית על ההוצאות העסקיות שלך
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <p className="text-sm text-stone-600 leading-relaxed">
          אני כאן כדי לעזור לך עם ההוצאות העסקיות שלך. במה את צריכה עזרה?
        </p>

        <button
          onClick={() => onPick("audit")}
          className="group w-full text-right rounded-xl border-2 border-stone-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                {persona ? "מומלץ עבורך" : "ביקורת טרום-הגשה"}
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-1.5 group-hover:text-emerald-800">
                יש לי דוח הוצאות, רוצה לוודא שלא שכחתי כלום
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                המאמן יעבור איתך על ההוצאות שלך לפני שתגישי את הדוח, יזהה הזדמנויות
                שפיספסת (משרד ביתי, תרומות 46, קרן השתלמות), ויסביר איך כל אחת
                מהן עובדת.
              </p>
            </div>
            <span className="text-2xl text-emerald-500 group-hover:translate-x-[-4px] transition-transform">
              ←
            </span>
          </div>
        </button>

        <button
          onClick={() => onPick("discover")}
          className="group w-full text-right rounded-xl border-2 border-stone-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                לעצמאיות מתחילות
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-1.5 group-hover:text-emerald-800">
                בדיוק התחלתי - בואו נגלה אילו הוצאות מוכרות לי
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                שיחה זורמת על השגרה והעבודה שלך. נחשוף ביחד הוצאות שעצמאים רבים
                מפספסים — חלק יחסי משכ״ד אם את עובדת מהבית, אחוז מהרכב, מנויים
                מקצועיים, ועוד.
              </p>
            </div>
            <span className="text-2xl text-emerald-500 group-hover:translate-x-[-4px] transition-transform">
              ←
            </span>
          </div>
        </button>

        <p className="text-[11px] text-stone-400 text-center pt-2">
          השיחות אינן מהוות ייעוץ מס. לפני הגשה, התייעצי עם רואה חשבון.
        </p>
      </div>
    </div>
  );
}
