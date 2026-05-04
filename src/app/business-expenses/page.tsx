"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Persona } from "@/lib/persona";
import { loadPersona } from "@/lib/setup-storage";
import {
  pickProfile,
  ExpenseCategory,
  ExpenseProfile,
} from "@/lib/business-expenses/profiles";
import { cn } from "@/lib/utils";

export default function BusinessExpensesPage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);

  useEffect(() => {
    const saved = loadPersona();
    if (!saved) {
      router.replace("/setup");
      return;
    }
    setPersona(saved);
  }, [router]);

  if (!persona) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-sm text-stone-500">טוען...</div>
      </div>
    );
  }

  const profile = pickProfile(persona.business.primaryOccupation);

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3">
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
                מדריך הוצאות עסקיות
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/demo"
              className="rounded-full border border-info px-3 py-1 text-xs text-brand-navy hover:bg-info/30 transition-colors"
            >
              ← חזור לדו״ח
            </Link>
            <Link
              href="/setup"
              className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-700 hover:bg-stone-100"
            >
              עדכן נתונים
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-8">
        {/* Hero */}
        <div className="rounded-2xl border-2 border-info bg-gradient-to-l from-info/30 to-white p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold text-brand-navy uppercase tracking-wider mb-1">
                מותאם לעסק שלך
              </div>
              <h1 className="text-2xl font-extrabold text-stone-900 mb-1">
                {profile.label}
              </h1>
              <p className="text-sm text-stone-600">{profile.tagline}</p>
            </div>
            <BusinessChip persona={persona} />
          </div>

          <div className="mt-5 rounded-xl bg-white border border-info px-4 py-3 text-[12px] text-stone-700 leading-relaxed">
            <span className="font-bold text-brand-navy">💡 איך להשתמש: </span>
            הקטגוריות למטה מותאמות לעיסוק <strong>{persona.business.primaryOccupation}</strong>.
            כל הוצאה מוגדרת לפי כללי פקודת מס הכנסה 2024 — מה מוכר במלואו, מה חלקית,
            ומה כפחת לאורך שנים. שמרי קבלות, ובסוף השנה — הזיני לדו״ח 1301 שלך.
          </div>
        </div>

        {/* Osek Zeir banner */}
        {persona.business.isOsekZeir && (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-5 py-4 mb-6 text-[13px] text-amber-900">
            <p className="font-bold mb-1">⚡ את במסלול עוסק זעיר</p>
            <p>
              30% מהמחזור שלך מוכרים אוטומטית כהוצאות (כולל ב״ל), ואת לא צריכה
              לעקוב אחרי קבלות בודדות לצורכי דו״ח 1301. עדיין כדאי לדעת אילו הוצאות
              קיימות בעסק שלך — לתכנון תזרים, וכדי להחליט אם משתלם לך לצאת מהמסלול.
            </p>
          </div>
        )}

        {/* Categories */}
        <div className="grid gap-4">
          {profile.categories.map((cat, i) => (
            <CategoryCard key={i} category={cat} />
          ))}
        </div>

        <FooterDisclaimer />
      </main>
    </div>
  );
}

function BusinessChip({ persona }: { persona: Persona }) {
  const osekLabel =
    persona.business.osekType === "patur" ? "עוסק פטור" : "עוסק מורשה";
  return (
    <div className="rounded-xl bg-white border border-stone-200 px-4 py-3 text-[11px] shrink-0 max-w-[260px]">
      <div className="font-bold text-stone-800 truncate">
        {persona.business.tradeName}
      </div>
      <div className="text-stone-500 truncate mt-0.5">
        {persona.business.primaryOccupation}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600">
          {osekLabel}
        </span>
        {persona.business.isOsekZeir && (
          <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800 font-bold">
            עוסק זעיר
          </span>
        )}
      </div>
    </div>
  );
}

function CategoryCard({ category }: { category: ExpenseCategory }) {
  const ruleLabel = ruleDisplayLabel(category);
  const ruleColor =
    category.rule === "full"
      ? "bg-success-light text-brand-navy border-success/50"
      : category.rule === "partial"
        ? "bg-info text-brand-navy border-info"
        : "bg-purple-100 text-purple-800 border-purple-300";

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-stone-100">
        <div>
          <h3 className="text-base font-bold text-stone-900">{category.name}</h3>
          <p className="text-[12px] text-stone-600 mt-1 leading-relaxed">
            {category.description}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap",
            ruleColor,
          )}
        >
          {ruleLabel}
        </span>
      </div>

      <div className="px-5 py-3 bg-success-light/30 text-[12px]">
        <div className="font-semibold text-stone-700 mb-1.5">דוגמאות:</div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-stone-600">
          {category.examples.map((ex, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-brand-navy">•</span>
              <span>{ex}</span>
            </li>
          ))}
        </ul>
      </div>

      {category.warning && (
        <div className="px-5 py-2.5 bg-amber-50 border-t border-amber-200 text-[11px] text-amber-900">
          <span className="font-bold">⚠ </span>
          {category.warning}
        </div>
      )}
    </div>
  );
}

function ruleDisplayLabel(c: ExpenseCategory): string {
  if (c.rule === "full") return "100% מוכר";
  if (c.rule === "partial") return `${c.partialPercent}% מוכר`;
  if (c.rule === "depreciation")
    return `פחת ${c.depreciationYears} שנים`;
  return "";
}

function FooterDisclaimer() {
  return (
    <div className="mt-8 text-center text-[11px] text-stone-400 leading-relaxed">
      <p>
        המידע המוצג מבוסס על פקודת מס הכנסה (2024) ופרסומים פומביים של רשות המסים.
        קטגוריות והכרה ספציפית עשויות להשתנות לפי מצב העסק. לפני הגשת הדו״ח —
        התייעצי עם רואה חשבון.
      </p>
    </div>
  );
}
