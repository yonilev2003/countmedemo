"use client";

/**
 * /onboarding — the ≤3-minute lite questionnaire that replaced /setup as the
 * product's entry point (beta, docs/specs/beta/onboarding.md, ONB-3/ONB-4).
 *
 * One client page, one internal state machine, one screen = one question,
 * mobile-first (390px reference viewport; desktop = the same centered
 * max-w-md column). Heavy Form-1301 fields (ת"ז, בנק, ביטוח לאומי, קרן
 * השתלמות, תרומות) are NOT asked here — they live in the deferred /setup
 * flow ("השלמת פרטים לדוח"), reachable later from the dashboard.
 *
 * No password/SMS screens anywhere in this flow — Google OAuth (already
 * live) is the product's only auth, handled entirely outside this page.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPersona } from "@/lib/setup-storage";
import { persistPersona } from "@/lib/data/persona-store";
import { trackClient } from "@/lib/analytics/track-client";
import {
  buildLitePersona,
  LITE_PERSONA_FILING_YEAR,
  type OnboardingAnswers,
} from "@/lib/onboarding/build-lite-persona";
import type {
  IncomeBand,
  JourneyTier,
  OsekType,
  PersonaJourneyAuthorities,
  TriState,
} from "@/lib/persona";
import { getTaxYearConstants } from "@/lib/calculators/types";
import {
  getProfession,
  listVerticals,
  listProfessionsByVertical,
} from "@/lib/expense-engine";
import type { Profession } from "@/lib/expense-engine";
import { CHARACTER } from "@/lib/agent/character";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { Reveal, Stagger, StaggerItem, PopIn } from "@/components/brand/motion";
import {
  SparklesIcon,
  UserIcon,
  SearchIcon,
  ChevronDownIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ShieldIcon,
  ReceiptIcon,
  WalletIcon,
  BuildingIcon,
  InfoIcon,
} from "@/components/brand/icons";

/** Real profession ids from the expense-engine dataset (113 professions, 20
 *  verticals) — sensible popular defaults shown as one-tap shortcuts before
 *  search. The full 113 are always reachable via the search box below; these
 *  are shortcuts, never a limit on what can be picked. */
const POPULAR_PROFESSION_IDS = [
  "P026", // מפתח תוכנה פרילנסר
  "P035", // מעצב גרפי
  "P033", // צלם
  "P080", // מאמן כושר אישי
  "P004", // יועץ עסקי / אסטרטגי
  "P025", // מטפל זוגי ומשפחתי
  "P042", // יוצר תוכן / משפיען
  "P045", // מורה פרטי
  "P064", // חנות אונליין / איקומרס
  "P087", // שליח
];

type StepId =
  | "intro"
  | "name"
  | "occupation"
  | "tier"
  | "authorities"
  | "osek"
  | "income"
  | "business-name"
  | "celebration";

function getFlowSteps(tier: JourneyTier | null): StepId[] {
  const steps: StepId[] = ["intro", "name", "occupation", "tier"];
  if (tier === "pre") steps.push("authorities");
  steps.push("osek", "income", "business-name", "celebration");
  return steps;
}

const EMPTY_AUTHORITIES: PersonaJourneyAuthorities = {
  masHachnasa: "unsure",
  maam: "unsure",
  bituachLeumi: "unsure",
};

type OsekChoice = "zeir" | "patur" | "morshe" | "not-yet";

const INCOME_BANDS: { key: IncomeBand; label: string }[] = [
  { key: "0-5k", label: "עד 5,000 ₪" },
  { key: "5-10k", label: "5,000–10,000 ₪" },
  { key: "10-20k", label: "10,000–20,000 ₪" },
  { key: "20k-plus", label: "מעל 20,000 ₪" },
  { key: "irregular", label: "משתנה, אין קבוע" },
];

export default function OnboardingPage() {
  const router = useRouter();

  const [rawStepIndex, setRawStepIndex] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [occupation, setOccupation] = useState("");
  const [professionId, setProfessionId] = useState<string | undefined>(undefined);
  const [tier, setTier] = useState<JourneyTier | null>(null);
  const [authorities, setAuthorities] =
    useState<PersonaJourneyAuthorities>(EMPTY_AUTHORITIES);
  const [osekChoice, setOsekChoice] = useState<OsekChoice>("patur");
  const [osekType, setOsekType] = useState<OsekType>("patur");
  const [isOsekZeir, setIsOsekZeir] = useState(false);
  const [incomeBand, setIncomeBand] = useState<IncomeBand | null>(null);
  const [tradeName, setTradeName] = useState("");

  const steps = useMemo(() => getFlowSteps(tier), [tier]);
  const stepIndex = Math.min(rawStepIndex, steps.length - 1);
  const currentStepId = steps[stepIndex];
  const questionSteps = useMemo<StepId[]>(
    () => steps.filter((s) => s !== "intro" && s !== "celebration"),
    [steps],
  );
  const qIndex = questionSteps.indexOf(currentStepId);

  const fullName = `${firstName} ${lastName}`.trim();

  function selectOsek(choice: OsekChoice) {
    setOsekChoice(choice);
    if (choice === "zeir") {
      setOsekType("patur");
      setIsOsekZeir(true);
    } else if (choice === "morshe") {
      setOsekType("morshe");
      setIsOsekZeir(false);
    } else {
      // "patur" and the pre-tier "not-yet" option both map to a plain עוסק
      // פטור until the user actually decides — no separate field is stored
      // for "not yet decided" (spec: default patur).
      setOsekType("patur");
      setIsOsekZeir(false);
    }
  }

  function canAdvance(): boolean {
    switch (currentStepId) {
      case "name":
        return !!firstName.trim() && !!lastName.trim();
      case "occupation":
        return !!occupation.trim();
      case "tier":
        return !!tier;
      case "income":
        return !!incomeBand;
      default:
        return true;
    }
  }

  function completeOnboarding() {
    const answers: OnboardingAnswers = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      occupation: occupation.trim(),
      professionId,
      tier: tier ?? "experienced",
      ...(tier === "pre" ? { authorities } : {}),
      osekType,
      isOsekZeir,
      incomeBand,
      tradeName: tradeName.trim() || fullName,
    };
    const persona = buildLitePersona(answers, loadPersona());
    persistPersona(persona);
    trackClient("setup_completed", {
      flow: "lite-v1",
      tier: answers.tier,
      incomeBand: answers.incomeBand,
      osekType: answers.osekType,
      isOsekZeir: answers.isOsekZeir,
      occupationChip: professionId ?? null,
    });
  }

  function handleNext() {
    if (!canAdvance()) return;

    if (currentStepId === "intro") {
      trackClient("setup_started", { flow: "lite-v1" });
    } else if (currentStepId === "tier") {
      trackClient("setup_step_completed", { flow: "lite-v1", step: "tier", tier });
    } else if (currentStepId === "business-name") {
      trackClient("setup_step_completed", { flow: "lite-v1", step: "business-name" });
      completeOnboarding();
    } else {
      trackClient("setup_step_completed", { flow: "lite-v1", step: currentStepId });
    }

    setRawStepIndex((i) => Math.min(i + 1, steps.length - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setRawStepIndex((i) => Math.max(0, i - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const showNav = currentStepId !== "intro" && currentStepId !== "celebration";

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={30} />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-paper border border-line shadow-brand p-6 sm:p-7">
            {qIndex >= 0 && (
              <OnboardingProgressBar index={qIndex} total={questionSteps.length} />
            )}

            <Reveal key={currentStepId}>
              {currentStepId === "intro" && <IntroScreen />}

              {currentStepId === "name" && (
                <NameScreen
                  firstName={firstName}
                  lastName={lastName}
                  onFirstName={setFirstName}
                  onLastName={setLastName}
                />
              )}

              {currentStepId === "occupation" && (
                <OccupationScreen
                  occupation={occupation}
                  professionId={professionId}
                  onSelect={(name, id) => {
                    setOccupation(name);
                    setProfessionId(id);
                  }}
                />
              )}

              {currentStepId === "tier" && (
                <TierScreen value={tier} onChange={setTier} />
              )}

              {currentStepId === "authorities" && (
                <AuthoritiesScreen value={authorities} onChange={setAuthorities} />
              )}

              {currentStepId === "osek" && (
                <OsekScreen
                  choice={osekChoice}
                  onChange={selectOsek}
                  showNotYetOption={tier === "pre"}
                />
              )}

              {currentStepId === "income" && (
                <IncomeScreen value={incomeBand} onChange={setIncomeBand} />
              )}

              {currentStepId === "business-name" && (
                <BusinessNameScreen
                  value={tradeName}
                  defaultValue={fullName}
                  onChange={setTradeName}
                />
              )}

              {currentStepId === "celebration" && (
                <CelebrationScreen
                  occupation={occupation}
                  tradeName={tradeName.trim() || fullName}
                  onFinish={() => router.push("/dashboard")}
                />
              )}
            </Reveal>

            {currentStepId === "intro" && (
              <div className="mt-7">
                <button
                  type="button"
                  onClick={handleNext}
                  className={btn("primary", "md", "w-full")}
                >
                  מתחילים
                  <ArrowLeftIcon className="size-[18px]" />
                </button>
              </div>
            )}

            {showNav && (
              <div className="mt-7 flex items-center justify-between gap-3">
                {stepIndex > 0 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className={btn("secondary", "sm")}
                  >
                    <ArrowRightIcon className="size-4" />
                    חזרה
                  </button>
                ) : (
                  <div />
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canAdvance()}
                  className={btn("primary", "sm")}
                >
                  {currentStepId === "business-name" ? "סיימנו" : "הבא"}
                  <ArrowLeftIcon className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */

function ScreenHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy text-white shadow-brand-sm">
        {icon}
      </div>
      <div>
        <h1 className="text-lg font-bold text-brand-navy leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function OnboardingProgressBar({ index, total }: { index: number; total: number }) {
  const pct = total > 1 ? (index / (total - 1)) * 100 : 0;
  return (
    <div className="mb-6">
      <div className="h-1.5 bg-sand rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-l from-brand-deep to-brand-navy rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 text-start text-[11px] text-faint">
        {index + 1}/{total}
      </div>
    </div>
  );
}

function IntroScreen() {
  return (
    <div className="text-center py-4">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-beige-100 text-brand-deep">
        <SparklesIcon className="size-7" />
      </div>
      <h1 className="text-xl font-bold text-brand-navy leading-tight">
        בוא נכיר
      </h1>
      <p className="mt-2 text-sm text-muted leading-relaxed">
        שלוש דקות — ובסוף יש לך עסק מסודר ב-countme.
      </p>
    </div>
  );
}

function NameScreen({
  firstName,
  lastName,
  onFirstName,
  onLastName,
}: {
  firstName: string;
  lastName: string;
  onFirstName: (v: string) => void;
  onLastName: (v: string) => void;
}) {
  return (
    <div>
      <ScreenHeader icon={<UserIcon className="size-4" />} title="איך קוראים לך?" />
      <div className="grid grid-cols-2 gap-3">
        <input
          autoFocus
          type="text"
          value={firstName}
          onChange={(e) => onFirstName(e.target.value)}
          placeholder="שם פרטי"
          className="w-full rounded-xl border border-line px-3 py-2.5 text-sm bg-paper focus:outline-none focus:ring-2 focus:border-brand-deep focus:ring-brand-deep/15 transition-colors"
        />
        <input
          type="text"
          value={lastName}
          onChange={(e) => onLastName(e.target.value)}
          placeholder="שם משפחה"
          className="w-full rounded-xl border border-line px-3 py-2.5 text-sm bg-paper focus:outline-none focus:ring-2 focus:border-brand-deep focus:ring-brand-deep/15 transition-colors"
        />
      </div>
    </div>
  );
}

function OccupationScreen({
  occupation,
  professionId,
  onSelect,
}: {
  occupation: string;
  professionId: string | undefined;
  onSelect: (nameHe: string, professionId: string | undefined) => void;
}) {
  const year = LITE_PERSONA_FILING_YEAR;
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        commitQuery();
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, occupation, isOpen]);

  function commitQuery() {
    setIsOpen((open) => {
      if (open) {
        const v = query.trim();
        if (v && v !== occupation) onSelect(v, undefined);
      }
      return false;
    });
  }

  const popularProfessions = POPULAR_PROFESSION_IDS
    .map((id) => getProfession(id, year))
    .filter((p): p is Profession => !!p);

  const verticals = listVerticals(year);
  const q = query.trim().toLowerCase();
  const groups = verticals
    .map((v) => ({
      vertical: v,
      professions: listProfessionsByVertical(v.id, year).filter((p) =>
        q ? p.nameHe.toLowerCase().includes(q) : true,
      ),
    }))
    .filter((g) => g.professions.length > 0);
  const hasNoMatches = isOpen && q.length > 0 && groups.length === 0;

  function pick(p: Profession) {
    onSelect(p.nameHe, p.id);
    setQuery("");
    setIsOpen(false);
  }

  return (
    <div>
      <ScreenHeader
        icon={<BuildingIcon className="size-4" />}
        title="מה את/ה עושה?"
        subtitle="מתאים לך את מדריך ההוצאות המוכרות למקצוע שלך"
      />

      {!isOpen && (
        <div className="mb-3 flex flex-wrap gap-2">
          {popularProfessions.map((p) => {
            const active = p.id === professionId;
            return (
              <PopIn key={p.id}>
                <button
                  type="button"
                  onClick={() => pick(p)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                    active
                      ? "border-brand-deep bg-teal-100/50 text-brand-navy"
                      : "border-line bg-paper text-ink hover:bg-cream",
                  )}
                >
                  {p.nameHe}
                </button>
              </PopIn>
            );
          })}
        </div>
      )}

      <div className="relative" ref={ref}>
        <div className="relative">
          <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-faint pointer-events-none" />
          <input
            type="text"
            value={isOpen ? query : occupation}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setIsOpen(true);
              setQuery("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                commitQuery();
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="חפש/י מקצוע, או הקלד/י בעצמך"
            aria-label="חיפוש מקצוע"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            className="w-full rounded-xl border border-line bg-paper ps-9 pe-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-brand-deep focus:ring-brand-deep/15 transition-colors"
          />
          <ChevronDownIcon
            className={cn(
              "absolute end-3 top-1/2 -translate-y-1/2 size-4 text-faint transition-transform pointer-events-none",
              isOpen && "rotate-180",
            )}
          />
        </div>

        {isOpen && (
          <div
            role="listbox"
            aria-label="רשימת מקצועות"
            className="absolute z-20 mt-1.5 w-full max-h-64 overflow-y-auto rounded-xl border border-line bg-paper shadow-brand p-2"
          >
            {hasNoMatches ? (
              <div className="px-3 py-3">
                <p className="text-[12px] text-muted mb-2">לא נמצאה התאמה</p>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(query.trim(), undefined);
                    setQuery("");
                    setIsOpen(false);
                  }}
                  className="w-full rounded-lg border border-dashed border-brand-deep/40 px-3 py-2 text-[12.5px] font-medium text-brand-deep hover:bg-teal-100/30"
                >
                  הוסיפי &quot;{query.trim()}&quot; כטקסט חופשי
                </button>
              </div>
            ) : (
              groups.map((g) => (
                <div key={g.vertical.id} className="mb-1.5 last:mb-0">
                  <div className="px-2 py-1 text-[10px] font-bold text-faint uppercase tracking-wide">
                    {g.vertical.nameHe}
                  </div>
                  {g.professions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={p.id === professionId}
                      onClick={() => pick(p)}
                      className={cn(
                        "w-full text-start rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                        p.id === professionId
                          ? "bg-brand-navy text-white font-bold"
                          : "text-ink hover:bg-cream",
                      )}
                    >
                      {p.nameHe}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TierScreen({
  value,
  onChange,
}: {
  value: JourneyTier | null;
  onChange: (v: JourneyTier) => void;
}) {
  const options: { key: JourneyTier; title: string; desc: string }[] = [
    { key: "pre", title: "עוד אין לי תיק", desc: "לא פתחתי תיק במס הכנסה, מע״מ או ביטוח לאומי" },
    { key: "first-year", title: "שנה ראשונה שלי", desc: "פתחתי תיק, עדיין לומד/ת איך זה עובד" },
    { key: "experienced", title: "כבר עצמאי/ת מנוסה", desc: "יש לי כמה שנות ניסיון כעצמאי/ת" },
  ];
  return (
    <div>
      <ScreenHeader icon={<UserIcon className="size-4" />} title="איפה את/ה במסע?" />
      <div className="space-y-2.5" role="radiogroup" aria-label="שלב במסע">
        {options.map((opt) => (
          <SelectCard
            key={opt.key}
            active={value === opt.key}
            title={opt.title}
            desc={opt.desc}
            onClick={() => onChange(opt.key)}
          />
        ))}
      </div>
    </div>
  );
}

function TriStateRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TriState;
  onChange: (v: TriState) => void;
}) {
  const options: { key: TriState; label: string }[] = [
    { key: "yes", label: "כן" },
    { key: "no", label: "לא" },
    { key: "unsure", label: "לא בטוח/ה" },
  ];
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <p className="text-[13.5px] font-medium text-ink mb-3">{label}</p>
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={cn(
              "flex-1 rounded-full border px-3 py-2 text-[13px] font-semibold transition-colors",
              value === o.key
                ? "border-brand-deep bg-teal-100/50 text-brand-navy"
                : "border-line text-muted hover:bg-cream",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      {value !== "yes" && (
        <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-cream border border-line px-3 py-2 text-[11.5px] text-muted">
          <InfoIcon className="size-3.5 shrink-0 mt-0.5 text-brand-deep" />
          <span>
            עובדות, לא ייעוץ:{" "}
            <Link
              href="/guides/opening"
              className="underline hover:text-brand-deep font-medium"
            >
              מה כרוך בפתיחת התיק
            </Link>
          </span>
        </div>
      )}
    </div>
  );
}

function AuthoritiesScreen({
  value,
  onChange,
}: {
  value: PersonaJourneyAuthorities;
  onChange: (v: PersonaJourneyAuthorities) => void;
}) {
  return (
    <div>
      <ScreenHeader
        icon={<ShieldIcon className="size-4" />}
        title="כמה שאלות על התיק שלך"
        subtitle="עוזר לנו להראות לך רק את מה שרלוונטי"
      />
      <div className="space-y-3">
        <TriStateRow
          label="יש לך כבר תיק במס הכנסה?"
          value={value.masHachnasa}
          onChange={(v) => onChange({ ...value, masHachnasa: v })}
        />
        <TriStateRow
          label="נרשמת במע״מ (פתיחת עוסק)?"
          value={value.maam}
          onChange={(v) => onChange({ ...value, maam: v })}
        />
        <TriStateRow
          label="פתחת תיק עצמאי בביטוח לאומי?"
          value={value.bituachLeumi}
          onChange={(v) => onChange({ ...value, bituachLeumi: v })}
        />
      </div>
    </div>
  );
}

function OsekScreen({
  choice,
  onChange,
  showNotYetOption,
}: {
  choice: OsekChoice;
  onChange: (c: OsekChoice) => void;
  showNotYetOption: boolean;
}) {
  const ceiling = getTaxYearConstants(LITE_PERSONA_FILING_YEAR).osekPaturThreshold;
  const ceilingHe = ceiling.toLocaleString("he-IL");

  const options: { key: OsekChoice; title: string; desc: string }[] = [
    {
      key: "zeir",
      title: "עוסק זעיר",
      desc: `מסלול מס פשוט — 30% מהמחזור מוכרים אוטומטית כהוצאות. מחזור עד ${ceilingHe} ₪.`,
    },
    {
      key: "patur",
      title: "עוסק פטור",
      desc: `פטור מגביית מע״מ, מדווח הוצאות בפועל. מחזור עד ${ceilingHe} ₪.`,
    },
    {
      key: "morshe",
      title: "עוסק מורשה",
      desc: "גובה ומדווח מע״מ, מקזז מע״מ תשומות. ללא תקרת מחזור.",
    },
    ...(showNotYetOption
      ? [
          {
            key: "not-yet" as OsekChoice,
            title: "עוד לא פתחתי — נחליט אחר כך",
            desc: "אפשר להמשיך בלי תיק פתוח ולהחליט מסלול בהמשך.",
          },
        ]
      : []),
  ];

  return (
    <div>
      <ScreenHeader icon={<ReceiptIcon className="size-4" />} title="איזה סוג עוסק את/ה?" />
      <div className="space-y-2.5" role="radiogroup" aria-label="סוג עוסק">
        {options.map((opt) => (
          <SelectCard
            key={opt.key}
            active={choice === opt.key}
            title={opt.title}
            desc={opt.desc}
            onClick={() => onChange(opt.key)}
          />
        ))}
      </div>
    </div>
  );
}

function IncomeScreen({
  value,
  onChange,
}: {
  value: IncomeBand | null;
  onChange: (v: IncomeBand) => void;
}) {
  return (
    <div>
      <ScreenHeader
        icon={<WalletIcon className="size-4" />}
        title="כמה בערך נכנס בחודש?"
        subtitle="טווח בלבד — לא משמש לשום חישוב, רק כדי להכיר את העסק שלך"
      />
      <div className="flex flex-wrap gap-2">
        {INCOME_BANDS.map((b) => {
          const active = value === b.key;
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => onChange(b.key)}
              className={cn(
                "rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors",
                active
                  ? "border-brand-deep bg-teal-100/50 text-brand-navy"
                  : "border-line bg-paper text-ink hover:bg-cream",
              )}
            >
              {b.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BusinessNameScreen({
  value,
  defaultValue,
  onChange,
}: {
  value: string;
  defaultValue: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <ScreenHeader
        icon={<BuildingIcon className="size-4" />}
        title="איך קוראים לעסק?"
        subtitle="זה מה שיופיע על המסמכים שלך — אפשר לדלג"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={defaultValue || "שם העסק"}
        className="w-full rounded-xl border border-line px-3 py-2.5 text-sm bg-paper focus:outline-none focus:ring-2 focus:border-brand-deep focus:ring-brand-deep/15 transition-colors"
      />
      <p className="mt-1.5 text-[11px] text-faint">
        אם לא מזינים כלום, נשתמש בשם המלא: {defaultValue || "—"}
      </p>
    </div>
  );
}

function CelebrationScreen({
  occupation,
  tradeName,
  onFinish,
}: {
  occupation: string;
  tradeName: string;
  onFinish: () => void;
}) {
  return (
    <div className="text-center py-2">
      <PopIn className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-navy text-white shadow-brand">
        <CheckIcon className="size-8" />
      </PopIn>
      <h1 className="text-xl font-bold text-brand-navy leading-tight">
        העסק שלך מסודר ב-countme
      </h1>

      <Stagger className="mt-5 space-y-2.5 text-start">
        <StaggerItem>
          <FactRow text={`פרופיל הוצאות מותאם ל${occupation || "העיסוק שלך"}`} />
        </StaggerItem>
        <StaggerItem>
          <FactRow text={`מסמכים ממותגים בשם ${tradeName}`} />
        </StaggerItem>
        <StaggerItem>
          <FactRow text={`${CHARACTER.name} זמין לכל שאלה`} />
        </StaggerItem>
      </Stagger>

      <button
        type="button"
        onClick={onFinish}
        className={btn("primary", "md", "w-full mt-7")}
      >
        לדשבורד שלי
        <ArrowLeftIcon className="size-[18px]" />
      </button>
    </div>
  );
}

function FactRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-cream border border-line px-3.5 py-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-light text-success">
        <CheckIcon className="size-3" />
      </span>
      <span className="text-[13px] text-ink">{text}</span>
    </div>
  );
}

function SelectCard({
  active,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "w-full text-start rounded-xl border px-4 py-3 transition-colors",
        active
          ? "border-brand-deep bg-teal-100/40"
          : "border-line bg-paper hover:bg-cream",
      )}
    >
      <span
        className={cn(
          "block text-sm font-medium",
          active ? "text-brand-navy" : "text-ink",
        )}
      >
        {title}
      </span>
      <span className="block text-xs text-muted mt-0.5 leading-relaxed">{desc}</span>
    </button>
  );
}
