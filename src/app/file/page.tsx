"use client";

import { useRequiredPersona } from "@/lib/data/use-required-persona";
import Link from "next/link";
import { AppHeader } from "@/components/brand/app-header";
import { btn } from "@/components/brand/button";
import { SparklesIcon, ClipboardCheckIcon, ArrowRightIcon } from "@/components/brand/icons";

export default function FilePage() {
  const { persona } = useRequiredPersona();

  if (!persona) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="space-y-4 w-full max-w-screen-md px-6 animate-pulse">
        <div className="h-8 rounded-lg bg-sand w-48 mx-auto" />
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map(i => <div key={i} className="h-48 rounded-2xl bg-sand" />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <AppHeader
        pageLabel="הגשת הדוח השנתי"
        actions={
          <Link href="/demo" className={btn("ghost", "sm")}>
            צפה בטופס Gov.il
            <ArrowRightIcon className="size-4" />
          </Link>
        }
      />

      <main className="flex-1 mx-auto w-full max-w-screen-md px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold text-brand-navy mb-2">
            הגש/י את הדוח השנתי
          </h1>
          <p className="text-muted">
            שלום {persona!.personal.firstName} — בחר/י את המסלול שמתאים לך
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Expert View — points to /demo */}
          <Link
            href="/demo"
            className="group bg-paper border border-line rounded-2xl shadow-brand p-6 hover:shadow-brand-lg hover:border-brand-navy/40 transition-all flex flex-col"
          >
            <div className="mb-3 flex items-center justify-center size-12 rounded-full bg-info text-brand-navy">
              <ArrowRightIcon className="size-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-brand-navy mb-2">
              מסלול מהיר
            </h2>
            <p className="text-sm text-muted leading-relaxed flex-1">
              הטופס המוכן של gov.il עם כל הערכים מחושבים, כפתור העתקה ליד כל שדה,
              וצ׳אט עם שקל בצד. מתאים לאלה שיודעים מה הם עושים.
            </p>
            <div className="mt-4 text-sm font-medium text-brand-deep group-hover:underline">
              לצפייה בטופס
            </div>
          </Link>

          {/* Guided — 12-step conversation */}
          <Link
            href="/file/guided"
            className="group bg-paper border border-line rounded-2xl shadow-brand p-6 hover:shadow-brand-lg hover:border-success/50 transition-all flex flex-col"
          >
            <div className="mb-3 flex items-center justify-center size-12 rounded-full bg-success-light text-success">
              <ClipboardCheckIcon className="size-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-brand-navy mb-2">
              מסלול מודרך עם שקל
            </h2>
            <p className="text-sm text-muted leading-relaxed flex-1">
              12 שלבים עם הסבר של שקל בכל נקודה, עריכה inline של פרטים, וסנכרון
              אוטומטי. מומלץ לביצוע ראשון.
            </p>
            <div className="mt-4 text-sm font-medium text-success group-hover:underline">
              התחל/י את המסלול
            </div>
          </Link>

          {/* Companion — 12-step walkthrough with screenshots, Eitan pointer image, voice */}
          <Link
            href="/file/companion"
            className="group bg-paper border border-line rounded-2xl shadow-brand p-6 hover:shadow-brand-lg hover:border-brand-deep/50 transition-all flex flex-col"
          >
            <div className="mb-3 flex items-center justify-center size-12 rounded-full bg-teal-100 text-teal-600">
              <SparklesIcon className="size-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-brand-navy mb-2">
              ליווי צמוד
            </h2>
            <p className="text-sm text-muted leading-relaxed flex-1">
              לכל שלב — צילום מסך של gov.il, שקל מצביע על המקום הנכון, הקראה
              קולית של ההסבר, וכפתור העתק/הדבק. הכי מתאים לפעם הראשונה.
            </p>
            <div className="mt-4 text-sm font-medium text-brand-deep group-hover:underline">
              בוא/י נצא לדרך
            </div>
          </Link>
        </div>

        {/* Capital declaration — separate form (1219) */}
        <Link
          href="/file/1219"
          className="group mt-6 flex items-center gap-4 rounded-2xl border border-line bg-paper p-6 shadow-brand transition-all hover:border-brand/60 hover:shadow-brand-lg"
        >
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-beige-100 text-beige-600">
            <ClipboardCheckIcon className="size-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold text-brand-navy mb-1">
              הצהרת הון — טופס 1219
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              נכסים והתחייבויות מסוכמים אוטומטית להון נקי, עם מקור לכל מספר. נדרש
              כשרשות המסים מבקשת הצהרת הון.
            </p>
          </div>
          <div className="text-sm font-medium text-beige-600 group-hover:underline whitespace-nowrap">
            למילוי 1219
          </div>
        </Link>

        <p className="mt-8 text-center text-xs text-faint">
          אחרי שמילאת את הנתונים —{" "}
          <Link href="/demo" className="text-brand-deep hover:underline">
            פתח/י את הטופס של gov.il
          </Link>{" "}
          לצד countme והעתק/י את הערכים
        </p>
      </main>
    </div>
  );
}
