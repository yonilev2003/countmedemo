"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Persona } from "@/lib/persona";
import { loadPersona } from "@/lib/setup-storage";
import { CoachChat } from "@/components/agent/coach-chat";

export default function CoachPage() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPersona(loadPersona());
    setHydrated(true);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-bold text-white shadow-sm">
              c
            </div>
            <div>
              <div className="text-base font-bold leading-tight">countme</div>
              <div className="text-[11px] text-stone-500 leading-tight">
                איתן · ייעוץ כספי אישי
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/demo"
              className="rounded-full border border-info px-3 py-1 text-xs text-brand-navy hover:bg-info/30 transition-colors"
            >
              לדוח 1301 ←
            </Link>
            <Link
              href="/business-expenses"
              className="rounded-full border border-success/50 px-3 py-1 text-xs text-success hover:bg-success/10 transition-colors"
            >
              מדריך הוצאות ←
            </Link>
          </div>
        </div>
      </header>

      {/* Chat fills the rest of the viewport */}
      <main className="flex-1 mx-auto w-full max-w-screen-md px-4 py-4 flex flex-col">
        {hydrated && (
          <div className="flex-1 min-h-[600px]">
            <CoachChat persona={persona} />
          </div>
        )}
      </main>

      <footer className="mx-auto w-full max-w-screen-md px-6 pb-4 text-center text-[10px] text-stone-400 leading-relaxed">
        <p>
          המידע אינו מהווה ייעוץ מס. countme מבוסס על מקורות פומביים ופקודת מס
          הכנסה 2024. לפני הגשה — התייעצי עם רואה חשבון.
        </p>
      </footer>
    </div>
  );
}
