"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Persona } from "@/lib/persona";
import { cn } from "@/lib/utils";

export type CoachMode = "audit" | "discover";

type Message = {
  role: "agent" | "user";
  text: string;
};

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
  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>(
    [],
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    historyRef.current = [];
  }

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || isLoading || !mode) return;

    const userMsg: Message = { role: "user", text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsLoading(true);
    setStreamingText("");

    const history = historyRef.current.slice(-20);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history,
          mode,
          persona: mode === "audit" ? persona ?? null : null,
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
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={
              mode === "audit"
                ? "ענה לשאלה או שאל משהו משלך..."
                : "ענה ובוא נמשיך..."
            }
            disabled={isLoading}
            className="flex-1 rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            onClick={send}
            disabled={isLoading || !input.trim()}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
