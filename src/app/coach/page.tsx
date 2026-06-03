"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Persona } from "@/lib/persona";
import { loadPersona } from "@/lib/setup-storage";
import { CoachChat } from "@/components/agent/coach-chat";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { ArrowRightIcon, ClipboardCheckIcon } from "@/components/brand/icons";

export default function CoachPage() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPersona(loadPersona());
    setHydrated(true);
  }, []);

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={28} />
            <div>
              <div className="text-sm font-bold text-brand-navy leading-tight">CountMe</div>
              <div className="text-[11px] text-muted leading-tight">
                איתן · ייעוץ כספי אישי
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/demo"
              className={btn("ghost", "sm", "gap-1.5")}
            >
              <ArrowRightIcon className="size-3.5" />
              לדוח 1301
            </Link>
            <Link
              href="/business-expenses"
              className={btn("secondary", "sm", "gap-1.5")}
            >
              <ClipboardCheckIcon className="size-3.5" />
              מדריך הוצאות
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

      <footer className="mx-auto w-full max-w-screen-md px-6 pb-4 text-center text-[10px] text-faint leading-relaxed">
        <p>
          המידע אינו מהווה ייעוץ מס. countme מבוסס על מקורות פומביים ופקודת מס
          הכנסה 2024. לפני הגשה — התייעצי עם רואה חשבון.
        </p>
      </footer>
    </div>
  );
}
