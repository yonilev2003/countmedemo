"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Persona } from "@/lib/persona";
import { loadPersona } from "@/lib/setup-storage";
import {
  pickProfile,
  ExpenseCategory,
} from "@/lib/business-expenses/profiles";
import { PL_IMPACT_LABEL } from "@/lib/regulatory/deductions";
import { cn } from "@/lib/utils";
import { ExpenseRatioCard } from "@/components/dashboard/expense-ratio-card";
import { computeExpenseRatio } from "@/lib/p-and-l/expense-ratio";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { LegalNote } from "@/components/brand/legal-note";
import {
  ArrowLeftIcon,
  SettingsIcon,
  InfoIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "@/components/brand/icons";

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
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-sm text-muted">טוען...</div>
      </div>
    );
  }

  const profile = pickProfile(
    persona.business.primaryOccupation,
    persona.income.year,
  );

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center">
              <Logo size={28} />
            </Link>
            <span className="text-[11px] text-muted leading-tight">
              מדריך הוצאות עסקיות
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/demo" className={btn("secondary", "sm")}>
              <ArrowLeftIcon className="size-3.5" />
              חזור לדו״ח
            </Link>
            <Link href="/setup" className={btn("ghost", "sm")}>
              <SettingsIcon className="size-3.5" />
              עדכן נתונים
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-8">
        {/* Hero */}
        <div className="rounded-2xl border border-line bg-paper shadow-brand p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold text-brand-deep uppercase tracking-wider mb-1">
                מותאם לעסק שלך
              </div>
              <h1 className="text-2xl font-extrabold text-brand-navy mb-1">
                {profile.label}
              </h1>
              <p className="text-sm text-muted">{profile.tagline}</p>
            </div>
            <BusinessChip persona={persona} />
          </div>

          <div className="mt-5 rounded-xl bg-cream border border-line px-4 py-3 text-[12px] text-muted leading-relaxed flex items-start gap-2">
            <InfoIcon className="size-4 shrink-0 mt-0.5 text-brand-deep" />
            <span>
              <span className="font-bold text-brand-navy">איך להשתמש: </span>
              הקטגוריות למטה מותאמות לעיסוק <strong>{persona.business.primaryOccupation}</strong>.
              כל הוצאה מוגדרת לפי כללי פקודת מס הכנסה {persona.income.year} — מה מוכר במלואו, מה חלקית,
              ומה כפחת לאורך שנים. שמרי קבלות, ובסוף השנה — הזיני לדו״ח 1301 שלך.
            </span>
          </div>
        </div>

        {/* Expense ratio insight — shows the zeir 30% rule live based on
            actual reported numbers, even when the user is not (yet) on זעיר. */}
        <div className="mb-6">
          <ExpenseRatioCard insight={computeExpenseRatio(persona)} />
        </div>

        {/* Categories */}
        <div className="grid gap-4">
          {profile.categories.map((cat, i) => (
            <CategoryCard key={i} category={cat} />
          ))}
        </div>

        <FooterDisclaimer year={persona.income.year} />
      </main>
    </div>
  );
}

function BusinessChip({ persona }: { persona: Persona }) {
  const osekLabel =
    persona.business.osekType === "patur" ? "עוסק פטור" : "עוסק מורשה";
  return (
    <div className="rounded-2xl bg-cream border border-line px-4 py-3 text-[11px] shrink-0 max-w-[260px]">
      <div className="font-bold text-ink truncate">
        {persona.business.tradeName}
      </div>
      <div className="text-muted truncate mt-0.5">
        {persona.business.primaryOccupation}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="inline-block rounded-full bg-sand px-2 py-0.5 text-[10px] text-muted">
          {osekLabel}
        </span>
        {persona.business.isOsekZeir && (
          <span className="inline-block rounded-full bg-brand/20 px-2 py-0.5 text-[10px] text-brand-navy font-bold">
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
        ? "bg-info text-brand-navy border-brand-deep/30"
        : "bg-aqua-soft text-brand-deep border-brand-deep/30";

  // Every business expense ultimately reduces business income (field 150);
  // universal items carry their explicit field(s) from the deductions registry.
  const fields = category.formFields ?? ["150"];
  const impactLabel = category.plImpact
    ? PL_IMPACT_LABEL[category.plImpact]
    : PL_IMPACT_LABEL["operating-expense"];

  return (
    <div className="rounded-2xl border border-line bg-paper shadow-brand overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line">
        <div>
          <h3 className="text-base font-bold text-brand-navy">{category.name}</h3>
          <p className="text-[12px] text-muted mt-1 leading-relaxed">
            {category.description}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {fields.map((f) => (
              <span
                key={f}
                className="inline-flex items-center rounded-md bg-sand px-1.5 py-0.5 text-[10px] font-mono text-muted"
                title="שדה בטופס 1301 שהסכום מוזן אליו"
              >
                שדה {f}
              </span>
            ))}
            <span className="inline-flex items-center rounded-md bg-brand-navy/5 px-1.5 py-0.5 text-[10px] text-brand-navy/70">
              {impactLabel}
            </span>
          </div>
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

      <div className="px-5 py-3 bg-success-light/20 text-[12px]">
        <div className="flex items-center gap-1.5 font-semibold text-muted mb-1.5">
          <CheckCircleIcon className="size-3.5 text-success" />
          דוגמאות:
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-muted">
          {category.examples.map((ex, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-brand-deep">•</span>
              <span>{ex}</span>
            </li>
          ))}
        </ul>
      </div>

      {category.warning && (
        <div className="px-5 py-2.5 bg-due-bg/40 border-t border-due/30 text-[11px] text-ink flex items-start gap-1.5">
          <AlertTriangleIcon className="size-3.5 shrink-0 mt-0.5 text-due" />
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

function FooterDisclaimer({ year }: { year: number }) {
  // WS8 audit H8 — keep the genuine scope caveat, canonical one-liner instead
  // of the gendered "התייעצי עם רואה חשבון" sentence.
  return (
    <div className="mt-8 text-center text-[11px] text-faint leading-relaxed">
      <p>
        המידע המוצג מבוסס על פקודת מס הכנסה ({year}) ופרסומים פומביים של רשות המסים.
        קטגוריות והכרה ספציפית עשויות להשתנות לפי מצב העסק.
      </p>
      <LegalNote variant="line" className="mt-1 text-[11px]" />
    </div>
  );
}
