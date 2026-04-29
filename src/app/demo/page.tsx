"use client";

import Link from "next/link";
import { defaultPersona } from "@/lib/persona";
import { FormPreview } from "@/components/form-1301/form-preview";
import { ChatPanel } from "@/components/agent/chat-panel";

export default function DemoPage() {
  const persona = defaultPersona;

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
            <a
              href="https://secapp.taxes.gov.il/"
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
      <div className="mx-auto max-w-screen-2xl px-6 pt-4">
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
      </div>

      {/* Main split: form preview (right, RTL primary) + chat (left) */}
      <main className="mx-auto max-w-screen-2xl px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-12 lg:col-span-8">
            <FormPreview persona={persona} />
          </section>
          <aside className="col-span-12 lg:col-span-4">
            <div className="sticky top-6 h-[calc(100vh-7rem)]">
              <ChatPanel persona={persona} />
            </div>
          </aside>
        </div>
      </main>

      <footer className="mx-auto max-w-screen-2xl px-6 pb-6 text-center text-xs text-stone-400">
        countme · דמו — נתונים בדיוניים, להמחשה בלבד · {persona.income.year}
      </footer>
    </div>
  );
}
