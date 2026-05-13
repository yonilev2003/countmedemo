"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadPersona } from "@/lib/setup-storage";
import { Persona } from "@/lib/persona";

export default function FilePage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const p = loadPersona();
    if (!p) {
      router.push("/setup");
      return;
    }
    setPersona(p);
    setHydrated(true);
  }, [router]);

  if (!hydrated) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="space-y-4 w-full max-w-screen-md px-6 animate-pulse">
        <div className="h-8 rounded-lg bg-stone-200 w-48 mx-auto" />
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map(i => <div key={i} className="h-48 rounded-2xl bg-stone-200" />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/countme-logo.svg" alt="CountMe" className="h-10 w-10" />
            <span className="text-lg font-bold">CountMe</span>
          </Link>
          <Link
            href="/demo"
            className="text-sm text-brand-navy/70 hover:text-brand-navy"
          >
            צפה בטופס Gov.il ←
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-screen-md px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold text-brand-navy mb-2">
            הגש/י את הדוח השנתי
          </h1>
          <p className="text-stone-600">
            שלום {persona!.personal.firstName} — בחר/י את המסלול שמתאים לך
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Expert View — points to /demo (gov.il-faithful preview with copy buttons + chat) */}
          <Link
            href="/demo"
            className="group rounded-2xl border-2 border-brand-navy/20 bg-white p-6 shadow-sm hover:border-brand-navy/50 hover:shadow-brand transition-all flex flex-col"
          >
            <div className="mb-3 text-3xl">⚡</div>
            <h2 className="font-display text-xl font-bold text-brand-navy mb-2">
              מסלול מהיר
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed flex-1">
              הטופס המוכר של gov.il עם כל הערכים מחושבים, כפתור העתקה ליד כל שדה,
              וצ׳אט עם איתן בצד. מתאים לאלה שיודעים מה הם עושים.
            </p>
            <div className="mt-4 text-sm font-medium text-brand-navy group-hover:underline">
              לצפייה בטופס →
            </div>
          </Link>

          {/* Guided — 12-step conversation */}
          <Link
            href="/file/guided"
            className="group rounded-2xl border-2 border-success/30 bg-white p-6 shadow-sm hover:border-success/60 hover:shadow-brand transition-all flex flex-col"
          >
            <div className="mb-3 text-3xl">✦</div>
            <h2 className="font-display text-xl font-bold text-brand-navy mb-2">
              מסלול מודרך עם איתן
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed flex-1">
              12 שלבים עם הסבר של איתן בכל נקודה, עריכה inline של פרטים, וסנכרון
              אוטומטי. מומלץ לביצוע ראשון.
            </p>
            <div className="mt-4 text-sm font-medium text-success group-hover:underline">
              התחל/י את המסלול →
            </div>
          </Link>

          {/* Companion — 12-step walkthrough with screenshots, Eitan pointer image, voice */}
          <Link
            href="/file/companion"
            className="group rounded-2xl border-2 border-alert/30 bg-white p-6 shadow-sm hover:border-alert/60 hover:shadow-brand transition-all flex flex-col"
          >
            <div className="mb-3 text-3xl">🤝</div>
            <h2 className="font-display text-xl font-bold text-brand-navy mb-2">
              ליווי צמוד
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed flex-1">
              לכל שלב — צילום מסך של gov.il, איתן מצביע על המקום הנכון, הקראה
              קולית של ההסבר, וכפתור העתק/הדבק. הכי מתאים לפעם הראשונה.
            </p>
            <div className="mt-4 text-sm font-medium text-alert group-hover:underline">
              בוא/י נצא לדרך →
            </div>
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-stone-400">
          אחרי שמילאת את הנתונים —{" "}
          <Link href="/demo" className="text-brand-navy hover:underline">
            פתח/י את הטופס של gov.il
          </Link>{" "}
          לצד countme והעתק/י את הערכים
        </p>
      </main>
    </div>
  );
}
