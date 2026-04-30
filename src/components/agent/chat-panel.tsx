"use client";

import { useEffect, useRef, useState } from "react";
import { Persona } from "@/lib/persona";
import { cn } from "@/lib/utils";

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
      text: `${f ? "מצד ימין יש לך" : "מצד ימין יש לך"} את הטופס שלי, כל הערכים מוכנים. ${f ? "לחצי" : "לחץ"} על כל מספר כדי לראות מאיפה הוא הגיע ואיך חישבתי אותו. אפשר להעתיק לטופס ברשות המסים בלי דאגה.`,
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

  // Reset greeting when persona switches (e.g. localStorage hydration on mount).
  useEffect(() => {
    setMessages(initialMessages(persona));
    historyRef.current = [];
  }, [persona.id]);

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

          accumulated += data;
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
    <div className="flex h-full flex-col rounded-xl border border-stone-200 bg-white">
      {/* Header */}
      <div className="border-b border-stone-200 bg-gradient-to-l from-blue-50 to-white px-4 py-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold shadow-sm">
          c
        </div>
        <div>
          <div className="text-sm font-semibold">המלווה של countme</div>
          <div className="text-xs text-stone-500">
            מבוסס על הסקיל israeli-tax-returns
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
              m.role === "agent"
                ? "bg-stone-100 text-stone-800"
                : "ml-auto bg-blue-600 text-white",
            )}
          >
            {m.text}
          </div>
        ))}

        {/* Live streaming bubble */}
        {streamingText && (
          <div className="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed bg-stone-100 text-stone-800">
            {streamingText}
            <span className="inline-block w-1.5 h-3.5 bg-stone-400 animate-pulse ml-0.5 align-middle" />
          </div>
        )}

        {/* Loading indicator (before first token arrives) */}
        {isLoading && !streamingText && (
          <div className="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed bg-stone-100 text-stone-400">
            <span className="inline-flex gap-1">
              <span className="animate-bounce [animation-delay:0ms]">•</span>
              <span className="animate-bounce [animation-delay:150ms]">•</span>
              <span className="animate-bounce [animation-delay:300ms]">•</span>
            </span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-stone-200 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="שאלי שאלה על הדו״ח..."
            disabled={isLoading}
            className="flex-1 rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm placeholder:text-stone-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            onClick={send}
            disabled={isLoading || !input.trim()}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "..." : "שלח"}
          </button>
        </div>
        <div className="mt-2 text-center text-[10px] text-stone-400">
          {isLoading ? "מחובר ל-Claude Sonnet — מעבד..." : "מחובר ל-Claude Sonnet"}
        </div>
      </div>
    </div>
  );
}
