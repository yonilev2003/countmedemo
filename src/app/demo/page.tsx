"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { defaultPersona, Persona } from "@/lib/persona";
import { loadPersona } from "@/lib/setup-storage";
import { FormPreview } from "@/components/form-1301/form-preview";
import { ChatPanel } from "@/components/agent/chat-panel";

export default function DemoPage() {
  const [persona, setPersona] = useState<Persona>(defaultPersona);

  useEffect(() => {
    const saved = loadPersona();
    if (saved) setPersona(saved);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Brand header — clearly countme, not gov.il */}
      <header className="bg-white border-b border-stone-200">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-bold text-white shadow-sm"
            >
              c
            </Link>
            <div>
              <div className="text-base font-bold leading-tight">countme</div>
              <div className="text-[11px] text-stone-500 leading-tight">
                המלווה לדו״ח שלך · גרסת דמו
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
              משתמש: {persona.displayName}
            </div>
            <Link
              href="/setup"
              className="rounded-full border border-blue-300 px-3 py-1 text-xs text-blue-700 hover:bg-blue-50 transition-colors"
            >
              ← עדכן נתונים
            </Link>
            <a
              href="https://www.gov.il/he/service/reporting-and-payment-2024-annual-tax-report-for-individuals"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-700 hover:bg-stone-100"
            >
              פתח טופס 1301 ב-gov.il →
            </a>
          </div>
        </div>
      </header>

      {/* Sub-banner: explainer */}
      <div className="mx-auto max-w-screen-2xl px-6 pt-4 space-y-2">
        <div className="countme-frame relative px-5 py-3 text-sm text-stone-700">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              ✦
            </div>
            <div className="leading-relaxed">
              <strong>הדמו עובד ככה:</strong> פתח/י את טופס 1301 בחלון אחר (כפתור
              למעלה), ואז העתק/י את הערכים מהמסך הזה. כל מספר לחיץ — לחיצה מציגה
              איך חישבנו ומאיפה הוא הגיע. השאלות החופשיות בצ׳אט.
            </div>
          </div>
        </div>

        {/* Legal disclaimer banner */}
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-5 py-3 text-[11px] text-stone-500 leading-relaxed">
          <span className="font-semibold text-stone-600">⚠ הצהרת אחריות: </span>
          המידע המוצג מבוסס על נתונים שהוזנו ידנית ועל מקורות ציבוריים ברשת — הוא אינו מהווה
          ייעוץ מס, ייעוץ משפטי, או ייעוץ פיננסי מקצועי.{" "}
          <strong>האחריות על נכונות כל הפרטים המוגשים לרשות המסים חלה על הממלא/ת בלבד.</strong>{" "}
          לפני הגשת הדוח, מומלץ להתייעץ עם רואה חשבון מוסמך. countme אינה אחראית לכל נזק
          ישיר, עקיף, או תוצאתי הנובע משימוש במידע זה.
        </div>
      </div>

      {/* Main split: form preview (right, RTL primary) + chat (left) */}
      <main className="mx-auto max-w-screen-2xl px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-12 lg:col-span-8">
            <div className="rounded-2xl border-2 border-yellow-200 bg-yellow-50 p-5">
              <FormPreview persona={persona} />
            </div>
          </section>
          <aside className="col-span-12 lg:col-span-4">
            <div className="sticky top-6 h-[calc(100vh-7rem)]">
              <ChatPanel persona={persona} />
            </div>
          </aside>
        </div>
      </main>

      <footer className="mx-auto max-w-screen-2xl px-6 pb-8 pt-2 text-center text-[10px] text-stone-400 leading-relaxed space-y-1">
        <p>countme · גרסת דמו · שנת מס {persona.income.year}</p>
        <p>
          המידע אינו מהווה ייעוץ מס או ייעוץ משפטי. countme מבוסס על מידע זמין לציבור
          ואינו אחראי לטעויות, שינויי חקיקה, או אי-דיוקים בנתונים. הגשת הדוח ומילוי הפרטים
          הנכונים הינה באחריות הממלא/ת בלבד.
        </p>
      </footer>
    </div>
  );
}
