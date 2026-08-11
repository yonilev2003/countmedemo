"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { persistPersona } from "@/lib/data/persona-store";
import type { Persona } from "@/lib/persona";
import {
  pickProfile,
  ExpenseCategory,
} from "@/lib/business-expenses/profiles";
import { PL_IMPACT_LABEL } from "@/lib/regulatory/deductions";
import {
  listVerticals,
  listProfessionsByVertical,
  matchProfession,
  getProfessionExpenseGuide,
  explainFormula,
} from "@/lib/expense-engine";
import type { Profession, ExpenseEntry, Confidence } from "@/lib/expense-engine";
import { cn } from "@/lib/utils";
import { ExpenseRatioCard } from "@/components/dashboard/expense-ratio-card";
import { computeExpenseRatio } from "@/lib/p-and-l/expense-ratio";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { LegalNote } from "@/components/brand/legal-note";
import { StatusBadge, type Status } from "@/components/brand/status";
import {
  ArrowLeftIcon,
  SettingsIcon,
  InfoIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SearchIcon,
  ChevronDownIcon,
  PercentIcon,
} from "@/components/brand/icons";

export default function BusinessExpensesPage() {
  const { persona, setPersona } = useRequiredPersona();

  // Manual override for the profession picker below. `null` = nothing picked
  // yet this session — falls back to the persona's saved pick, then to the
  // auto-match. Kept in state (not persisted-on-read) so a manual pick that
  // happens to equal the auto-match still shows instantly without a DB round-trip.
  const [manualProfessionId, setManualProfessionId] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  if (!persona) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-sm text-muted">טוען...</div>
      </div>
    );
  }

  const year = persona.income.year;
  const profile = pickProfile(persona.business.primaryOccupation, year);

  // matchProfession never guesses silently — null means "show the manual-pick
  // state", not "assume the first profession".
  const autoMatch = matchProfession(persona.business.primaryOccupation, year);
  const effectiveProfessionId =
    manualProfessionId ?? persona.business.professionId ?? autoMatch?.id ?? null;
  const isAutoMatched =
    manualProfessionId === null &&
    !persona.business.professionId &&
    !!autoMatch;

  const guide = getProfessionExpenseGuide(effectiveProfessionId, year);
  const selectedLabel = guide.profession?.nameHe ?? "";

  const verticals = listVerticals(year);
  const professionsByVertical = new Map(
    verticals.map((v) => [v.id, listProfessionsByVertical(v.id, year)]),
  );
  const totalProfessionCount = verticals.reduce(
    (sum, v) => sum + (professionsByVertical.get(v.id)?.length ?? 0),
    0,
  );
  const q = query.trim().toLowerCase();
  const groups = verticals
    .map((v) => ({
      vertical: v,
      professions: (professionsByVertical.get(v.id) ?? []).filter((p) =>
        q ? p.nameHe.toLowerCase().includes(q) : true,
      ),
    }))
    .filter((g) => g.professions.length > 0);

  // Explicit non-null alias: `persona` is narrowed to non-null above, but TS
  // control-flow narrowing doesn't reach into nested function bodies — this
  // gives the closure below its own statically non-null binding instead of
  // relying on (unavailable) narrowing-through-closure.
  const currentPersona: Persona = persona;

  function handleSelectProfession(p: Profession) {
    setManualProfessionId(p.id);
    setIsPickerOpen(false);
    // Persist explicitly — this is the user overriding/confirming their
    // profession, distinct from the free-text primaryOccupation auto-match.
    const updated: Persona = {
      ...currentPersona,
      business: { ...currentPersona.business, professionId: p.id },
    };
    persistPersona(updated);
    setPersona(updated);
  }

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
            <Link href="/dashboard" className={btn("secondary", "sm")}>
              <ArrowLeftIcon className="size-3.5" />
              חזור ללוח הבית
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

        {/* Profession picker — searchable, 113 professions across 20 verticals */}
        <div className="rounded-2xl border border-line bg-paper shadow-brand p-6 mb-6">
          <div className="mb-3">
            <h2 className="text-base font-bold text-brand-navy">
              בחר/י את המקצוע המדויק שלך
            </h2>
            <p className="text-[12px] text-muted mt-0.5">
              {totalProfessionCount} מקצועות ב-{verticals.length} תחומים — כדי לראות הוצאות
              שמוכרות ספציפית עבור המקצוע שלך, מעבר לקטגוריות הכלליות.
            </p>
          </div>

          <div className="relative" ref={pickerRef}>
            <div className="relative">
              <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-faint pointer-events-none" />
              <input
                type="text"
                value={isPickerOpen ? query : selectedLabel}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => {
                  setIsPickerOpen(true);
                  setQuery("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsPickerOpen(false);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="חפש/י מקצוע (למשל: עורך דין, מעצבת גרפית, מטפלת זוגית)"
                aria-label="חיפוש מקצוע"
                role="combobox"
                aria-expanded={isPickerOpen}
                aria-haspopup="listbox"
                aria-autocomplete="list"
                className="w-full rounded-xl border border-line bg-paper ps-9 pe-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-brand-deep focus:ring-brand-deep/15 transition-colors"
              />
              <ChevronDownIcon
                className={cn(
                  "absolute end-3 top-1/2 -translate-y-1/2 size-4 text-faint transition-transform pointer-events-none",
                  isPickerOpen && "rotate-180",
                )}
              />
            </div>

            {isPickerOpen && (
              <div
                role="listbox"
                aria-label="רשימת מקצועות"
                className="absolute z-20 mt-1.5 w-full max-h-80 overflow-y-auto rounded-xl border border-line bg-paper shadow-brand p-2"
              >
                {groups.length === 0 && (
                  <div className="px-3 py-4 text-center text-[12px] text-muted">
                    לא נמצאו מקצועות תואמים
                  </div>
                )}
                {groups.map((g) => (
                  <div key={g.vertical.id} className="mb-1.5 last:mb-0">
                    <div className="px-2 py-1 text-[10px] font-bold text-faint uppercase tracking-wide">
                      {g.vertical.nameHe}
                    </div>
                    {g.professions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        role="option"
                        aria-selected={p.id === effectiveProfessionId}
                        onClick={() => handleSelectProfession(p)}
                        className={cn(
                          "w-full text-start rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                          p.id === effectiveProfessionId
                            ? "bg-brand-navy text-white font-bold"
                            : "text-ink hover:bg-cream",
                        )}
                      >
                        {p.nameHe}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!effectiveProfessionId ? (
            <div className="mt-3 rounded-xl bg-due-bg/60 border border-due/30 px-4 py-3 text-[12px] text-ink flex items-start gap-2">
              <AlertTriangleIcon className="size-4 shrink-0 mt-0.5 text-due" />
              <span>
                <span className="font-bold">לא נמצאה התאמה אוטומטית</span> לעיסוק שהזנת
                (״{persona.business.primaryOccupation}״). בחר/י מקצוע ידנית מהרשימה למעלה
                כדי לראות הוצאות ספציפיות שמוכרות עבורו — countme לא מנחשת בשמך.
              </span>
            </div>
          ) : (
            <div className="mt-3 text-[12px] text-muted">
              מוצג עבור: <span className="font-bold text-brand-navy">{selectedLabel}</span>
              {isAutoMatched && (
                <span> — הותאם אוטומטית מהעיסוק שהזנת בפרופיל. ניתן לשנות למעלה.</span>
              )}
            </div>
          )}
        </div>

        {/* Profession-specific expense guide (only once a profession resolved) */}
        {guide.profession && (
          <div className="mb-6">
            {guide.isFallback && (
              <div className="mb-3 rounded-lg bg-cream border border-line px-3 py-2 text-[11px] text-muted flex items-center gap-1.5">
                <InfoIcon className="size-3.5 text-brand-deep shrink-0" />
                הנתונים המוצגים הם מהמאגר של {guide.sourceYear} — עדיין אין מאגר ייעודי
                לשנת {year}.
              </div>
            )}

            {guide.vehicleRule && (
              <div className="rounded-2xl border border-brand-deep/25 bg-info/25 shadow-brand-sm p-5 mb-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <PercentIcon className="size-4 text-brand-deep shrink-0" />
                  <h3 className="text-sm font-bold text-brand-navy">
                    כלל ניכוי הוצאות רכב עבור {guide.profession.nameHe}
                  </h3>
                </div>
                <p className="text-[13px] text-ink leading-relaxed font-semibold">
                  {explainFormula(guide.vehicleRule.formula)}
                </p>
                {guide.vehicleRule.conditionHe && (
                  <p className="text-[12px] text-muted mt-1 leading-relaxed">
                    {guide.vehicleRule.conditionHe}
                  </p>
                )}
                <p className="text-[11px] text-faint mt-2">
                  מקור: {guide.vehicleRule.legalSourceHe}
                </p>
                <p className="text-[11px] text-muted mt-1.5 italic">
                  ניכוי רכב אינו אחוז אחיד — התוצאה תלויה בהוצאות בפועל מול שווי השימוש,
                  כפי שמוסבר למעלה.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-brand-navy">
                הוצאות ספציפיות למקצוע שלך
              </h2>
              <span className="text-[11px] text-muted">
                {guide.professionExpenses.length} הוצאות מזוהות עבור {guide.profession.nameHe}
              </span>
            </div>

            {guide.professionExpenses.length === 0 ? (
              <div className="rounded-xl border border-line bg-paper px-4 py-3 text-[12px] text-muted">
                לא נמצאו הוצאות ספציפיות רשומות עבור מקצוע זה — הקטגוריות הכלליות למטה
                עדיין רלוונטיות.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {guide.professionExpenses.map((entry) => (
                  <ProfessionExpenseCard key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Expense ratio insight — shows the zeir 30% rule live based on
            actual reported numbers, even when the user is not (yet) on זעיר. */}
        <div className="mb-6">
          <ExpenseRatioCard insight={computeExpenseRatio(persona)} />
        </div>

        {/* General categories — occupation profile + universal (B"L, keren
            hishtalmut, pension, ...) items with real form-field/P&L wiring.
            Rendering unchanged from before the profession picker was added. */}
        <div className="mb-3">
          <h2 className="text-base font-bold text-brand-navy">קטגוריות הוצאה כלליות</h2>
        </div>
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

/**
 * Confidence (A/B/C) → traffic-light Status, for the profession-fit badge
 * ONLY. This is intentionally separate from `ruleColor` above: the rate
 * shown by `explainFormula` is always legally certain (rateCertainty:
 * "legal"); the confidence badge below is the ONLY place uncertainty is
 * signalled, and it always describes fit-to-profession, never the rate.
 */
const CONFIDENCE_STATUS: Record<Confidence, Status> = {
  A: "on-track",
  B: "due",
  C: "overdue",
};

/**
 * A profession-specific expense entry from the expense-engine dataset.
 * Deliberately NOT a variant of <CategoryCard> — ExpenseEntry carries a
 * structured RecognitionFormula + a separate legal-certainty/eligibility
 * split that ExpenseCategory has no field for; forcing it into CategoryCard's
 * shape would either drop that split or fake it into ExpenseCategory's rule.
 */
function ProfessionExpenseCard({ entry }: { entry: ExpenseEntry }) {
  return (
    <div className="rounded-2xl border border-line bg-paper shadow-brand-sm overflow-hidden">
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-line">
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-brand-navy truncate">{entry.nameHe}</h4>
          <span className="text-[10px] text-muted">{entry.category}</span>
        </div>
        <StatusBadge
          status={CONFIDENCE_STATUS[entry.eligibilityConfidence]}
          showDot={false}
          className="shrink-0"
        >
          התאמה {entry.eligibilityConfidence}
        </StatusBadge>
      </div>

      <div className="px-4 py-3 space-y-2">
        <div className="flex items-start gap-1.5">
          <PercentIcon className="size-3.5 shrink-0 mt-0.5 text-brand-deep" />
          <div className="min-w-0">
            <div className="text-[12px] text-ink font-semibold leading-relaxed">
              {explainFormula(entry.formula)}
            </div>
            <div className="text-[10.5px] text-faint mt-0.5">השיעור: קבוע בדין</div>
          </div>
        </div>

        {entry.conditionHe && (
          <div className="text-[11.5px] text-muted leading-relaxed">
            {entry.conditionHe}
          </div>
        )}

        <div className="text-[10.5px] text-faint leading-relaxed">
          ההתאמה למקצוע שלך: הערכה, רמת ביטחון {entry.eligibilityConfidence}
        </div>

        <div className="text-[10.5px] text-faint">מקור: {entry.legalSourceHe}</div>
      </div>
    </div>
  );
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
