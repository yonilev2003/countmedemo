"use client";

import { useState } from "react";
import { Persona } from "@/lib/persona";
import { cn } from "@/lib/utils";

type Message = {
  role: "agent" | "user";
  text: string;
};

interface Props {
  persona: Persona;
}

const initialMessages = (p: Persona): Message[] => [
  {
    role: "agent",
    text: `שלום ${p.personal.firstName}! עברתי על כל ${p.income.invoiceCount} החשבוניות שלך מ-${p.income.year} ועל ${p.income.expenseCount} ההוצאות. אספתי את כל הנתונים שצריך לדו"ח השנתי שלך.`,
  },
  {
    role: "agent",
    text: 'מצד ימין יש לך את הטופס שלי — כל הערכים מוכנים. **לחץ על כל מספר** כדי לראות מאיפה הוא הגיע ואיך חישבתי אותו. אפשר להעתיק לטופס ברשות המסים בלי דאגה.',
  },
  {
    role: "agent",
    text: "מה תרצה/י להבין יותר? אפשר לשאול אותי שאלה.",
  },
];

const mockResponses = [
  'זה החלק הקל בעצם. סך הכנסות שלך השנה היה גדול מההוצאות, אז אין הפסד עסקי להעביר לשנה הבאה. החיסכון הצפוי על רואה חשבון ~1,200 ₪.',
  'כדי לחשב מע"מ בצורה מסודרת, יש לי סקיל ייעודי (israeli-vat-reporting). נחזור לזה בפיצ\'ר הבא של countme.',
  'נקודות הזיכוי שלך: 2.25 (תושב). אם היית שירתת/בוגר תואר השנה — היו עוד נקודות. נראה שלא רלוונטי השנה.',
  'שדה 297 (טופס 6111) — אצלך לא רלוונטי כי המחזור מתחת ל-256,410 ₪. אם בשנה הבאה תעלי מעל לסף, יידרש מאזן + רוו"ה. נזכיר לך בזמן.',
];

export function ChatPanel({ persona }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => initialMessages(persona));
  const [input, setInput] = useState("");

  function send() {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", text: input };
    const reply: Message = {
      role: "agent",
      text: mockResponses[messages.length % mockResponses.length],
    };
    setMessages((m) => [...m, userMsg, reply]);
    setInput("");
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
      </div>

      {/* Input */}
      <div className="border-t border-stone-200 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="שאל/י שאלה על הדו״ח..."
            className="flex-1 rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm placeholder:text-stone-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            onClick={send}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            שלח
          </button>
        </div>
        <div className="mt-2 text-center text-[10px] text-stone-400">
          תשובות לדמו זה הן mock — חיבור Claude API יוטמע מחר
        </div>
      </div>
    </div>
  );
}
