"use client";

import { useEffect, useRef, useState } from "react";
import { Persona } from "@/lib/persona";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/brand/logo";
import { SendIcon } from "@/components/brand/icons";
import { CHARACTER } from "@/lib/agent/character";

/**
 * Character avatar — circular cropped illustration on a soft-beige disc (mockup).
 * Falls back to the navy LogoMark disc if the art is missing.
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
          src={CHARACTER.avatarSrc}
          alt={CHARACTER.name}
          className="h-full w-full object-cover object-top"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

type Message = {
  role: "agent" | "user";
  text: string;
};

interface Props {
  persona: Persona;
}

const initialMessages = (p: Persona): Message[] => {
  const f = p.personal.gender === "female";
  return [
    {
      role: "agent",
      text: `שלום ${p.personal.firstName}! ${f ? "עברתי" : "עברתי"} על כל ${p.income.invoiceCount} החשבוניות ${f ? "שלך" : "שלך"} משנת ${p.income.year} ועל ${p.income.expenseCount} ההוצאות. אספתי את כל הנתונים שצריך לדו"ח השנתי.`,
    },
    {
      role: "agent",
      text: `${f ? "מצד ימין יש לך" : "מצד ימין יש לך"} את הטופס שלי, כל הערכים מוכנים. ${f ? "לחצי" : "לחץ"} על כל מספר כדי לראות מאיפה הוא הגיע ואיך חישבתי אותו — ואז להעתיק לטופס ברשות המסים.`,
    },
    {
      role: "agent",
      text: `מה ${f ? "תרצי" : "תרצה"} להבין יותר? אפשר לשאול אותי שאלה.`,
    },
  ];
};

export function ChatPanel({ persona }: Props) {
  const [messages, setMessages] = useState<Message[]>(() =>
    initialMessages(persona),
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  // Track API-ready conversation history (user/assistant only, no initial agent greetings)
  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>(
    [],
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset greeting when persona switches (e.g. localStorage hydration on mount).
  useEffect(() => {
    setMessages(initialMessages(persona));
    historyRef.current = [];
  }, [persona.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: "user", text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsLoading(true);
    setStreamingText("");

    // Keep history to last 10 turns (20 messages) before adding current
    const history = historyRef.current.slice(-20);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history,
          persona,
        }),
      });

      if (!res.ok) {
        // Handle non-streaming errors (e.g. 503 no API key)
        let errorText = "אירעה שגיאה בחיבור ל-Claude. נסי שוב.";
        try {
          const json = await res.json();
          if (json?.error) {
            errorText =
              res.status === 503
                ? "מפתח ה-API אינו מוגדר. פנה למנהל המערכת."
                : `שגיאה: ${json.error}`;
          }
        } catch {
          // ignore parse error
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

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);

          if (data === "[DONE]") {
            // Finalise: move streamingText into messages
            const finalText = accumulated || "לא התקבלה תשובה.";
            setMessages((m) => [...m, { role: "agent", text: finalText }]);
            setStreamingText("");
            // Update history for next turn
            historyRef.current = [
              ...historyRef.current,
              { role: "user", content: trimmed },
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

      // Stream ended without [DONE] (e.g. connection drop)
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

  return (
    <div className="flex h-full flex-col rounded-xl border border-line bg-paper shadow-brand overflow-hidden">
      {/* Header — Eitan avatar + name + verified badge + status */}
      <div className="flex-shrink-0 flex items-center gap-3 border-b border-line bg-paper px-4 py-3">
        {/* Eitan avatar */}
        <EitanAvatar size={40} className="shadow-brand-sm" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[15px] font-extrabold text-brand-navy leading-tight">
            <span>{CHARACTER.name}</span>
            {/* Verified badge — teal check-circle */}
            <svg
              viewBox="0 0 16 16"
              fill="none"
              aria-label="מאומת"
              className="size-[14px] flex-shrink-0 text-brand-deep"
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
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[12px] font-semibold text-teal-600 leading-none">
            <span className="inline-block h-[7px] w-[7px] rounded-full bg-success flex-shrink-0" />
            מחובר · המלווה של countme
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gradient-to-b from-paper to-cream">
        {/* Day separator pill */}
        <div className="self-center rounded-full bg-line-soft px-3 py-1 text-[11.5px] font-bold text-faint">
          היום
        </div>

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2 max-w-[85%]",
              m.role === "agent" ? "self-start" : "self-end flex-row-reverse",
            )}
          >
            {/* Mini avatar for bot messages */}
            {m.role === "agent" && <EitanAvatar size={28} className="self-end" />}
            <div
              className={cn(
                "rounded-[18px] px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                m.role === "agent"
                  ? "bg-white border border-line text-ink rounded-es-[5px]"
                  : "bg-brand-navy text-white rounded-ee-[5px]",
              )}
            >
              {m.text}
            </div>
          </div>
        ))}

        {/* Live streaming bubble */}
        {streamingText && (
          <div className="flex gap-2 max-w-[85%] self-start">
            <EitanAvatar size={28} className="self-end" />
            <div className="rounded-[18px] rounded-es-[5px] bg-white border border-line px-3.5 py-2 text-sm leading-relaxed text-ink whitespace-pre-wrap">
              {streamingText}
              <span className="inline-block w-1.5 h-3.5 bg-brand-deep/40 animate-pulse ms-0.5 align-middle" />
            </div>
          </div>
        )}

        {/* Typing indicator (before first token arrives) */}
        {isLoading && !streamingText && (
          <div className="flex gap-2 max-w-[85%] self-start">
            <EitanAvatar size={28} className="self-end" />
            <div className="rounded-[18px] rounded-es-[5px] bg-white border border-line px-4 py-3 w-fit">
              <span className="inline-flex gap-1">
                <span className="inline-block h-[7px] w-[7px] rounded-full bg-beige-600 animate-bounce [animation-delay:0ms]" />
                <span className="inline-block h-[7px] w-[7px] rounded-full bg-beige-600 animate-bounce [animation-delay:150ms]" />
                <span className="inline-block h-[7px] w-[7px] rounded-full bg-beige-600 animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-line bg-paper px-3 pt-2.5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-line bg-cream px-4 py-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="שאלי שאלה על הדו״ח..."
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none text-sm text-ink placeholder:text-faint text-end disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          {/* Send button — navy pill */}
          <button
            onClick={send}
            disabled={isLoading || !input.trim()}
            type="button"
            className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-full bg-brand-navy text-white hover:bg-navy-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-brand-sm"
            aria-label="שלח"
          >
            <SendIcon className="size-[20px]" />
          </button>
        </div>
        <div className="mt-2 text-center text-[10px] text-faint">
          {isLoading ? "מחובר ל-Claude Sonnet — מעבד..." : "מחובר ל-Claude Sonnet"}
        </div>
      </div>
    </div>
  );
}
