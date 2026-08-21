"use client";

/**
 * /guides/morshe — המדריך למעבר לעוסק מורשה.
 *
 * Reached from the ceiling CTA on /dashboard and /alerts (warning/critical/
 * exceeded levels). Explains, in plain Hebrew, what crossing the עוסק
 * פטור/זעיר turnover ceiling actually means — including the loss of the
 * exemption benefits, which the 2026-08-18 QA pass flagged we never said
 * out loud anywhere in the product.
 *
 * Grounded in the israeli-vat-reporting and israeli-freelancer-ops skills:
 *   - VAT registration becomes mandatory once the ceiling is crossed.
 *   - VAT rate + threshold are read from getTaxYearConstants(year) — the
 *     single year-keyed source — never hardcoded here.
 *   - עוסק זעיר's 30% normative-expense deduction + simplified reporting
 *     are separate benefits tied to the SAME ceiling; crossing it forfeits
 *     both, not just the VAT exemption.
 *   - Allocation-number (מספר הקצאה) rule and its 2026 threshold step-down
 *     are the freelancer-ops skill's numbers, not invented here.
 * Anything not directly backed by those skills stays a general pointer to
 * רשות המסים / a רואה חשבון rather than a specific claim.
 */

import Link from "next/link";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { computeCeilingAlert } from "@/lib/alerts/ceiling";
import { getTaxYearConstants } from "@/lib/calculators/types";
import { ils } from "@/lib/utils";
import { AppHeader } from "@/components/brand/app-header";
import { btn } from "@/components/brand/button";
import { LegalNote } from "@/components/brand/legal-note";
import { StatusBadge } from "@/components/brand/status";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BuildingIcon,
  CheckCircleIcon,
  FileTextIcon,
  InfoIcon,
  PercentIcon,
  ReceiptIcon,
  ShieldIcon,
} from "@/components/brand/icons";

// ─── Step data (numbered checklist — DoneScreen pattern) ──────────────────

interface GuideStep {
  n: number;
  title: string;
  desc: string;
}

const REGISTRATION_STEPS: GuideStep[] = [
  {
    n: 1,
    title: "רישום כעוסק מורשה ברשות המסים",
    desc: "פנייה למשרד מס הכנסה/מע\"מ הקרוב (או דרך אתר רשות המסים) לעדכון סוג העסק מפטור/זעיר למורשה. הרישום הוא שלב שחייב לקרות לפני שממשיכים להוציא מסמכים.",
  },
  {
    n: 2,
    title: "מעבר להנהלת חשבונות בהתאם",
    desc: "עם הרישום כמורשה נדרשת מעקב שוטף אחר מע\"מ עסקאות (על מכירות) ומע\"מ תשומות (על רכישות עסקיות) — לא רק סיכום שנתי כמו בפטור/זעיר.",
  },
  {
    n: 3,
    title: "שינוי סוג המסמך שמוציאים",
    desc: "קבלות (\"קבלה\") מוחלפות בחשבונית מס — מסמך שכולל שורת מע\"מ נפרדת, ומחייב את כל הלקוחות שמקבלים ממך מסמכים מרגע הרישום.",
  },
  {
    n: 4,
    title: "מספר הקצאה לחשבוניות גדולות",
    desc: "חשבוניות מס מעל 10,000 ₪ (לפני מע\"מ) דורשות מספר הקצאה מרשות המסים החל מ-2026, והסף יורד ל-5,000 ₪ מיוני 2026. בלי מספר הקצאה, הלקוח לא יכול לנכות את המע\"מ שבחשבונית.",
  },
  {
    n: 5,
    title: "קביעת מחזור דיווח מע\"מ",
    desc: "ברוב המקרים הדיווח דו-חודשי; רשות המסים קובעת דיווח חודשי לעסקים עם מחזור גבוה. הדיווח מוגש עד ה-15 בחודש (דיווח ידני) או ה-19 (דיווח מקוון) בחודש שאחרי תום התקופה.",
  },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function MorsheGuidePage() {
  const { persona } = useRequiredPersona();

  if (!persona) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-sm text-muted">טוען...</div>
      </div>
    );
  }

  const ceiling = computeCeilingAlert(persona);
  const TC = getTaxYearConstants(persona.income.year);
  const vatPercent = Math.round(TC.vatRate * 100);
  const category = persona.business.isOsekZeir ? "עוסק זעיר" : "עוסק פטור";
  const isMorsheAlready = persona.business.osekType === "morshe";

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader
        pageLabel="המדריך למעבר למורשה"
        actions={
          <>
            <Link href="/alerts" className={btn("secondary", "sm")}>
              להתראות
            </Link>
            <Link href="/dashboard" className={btn("ghost", "sm")}>
              ללוח הבקרה
            </Link>
          </>
        }
      />

      <main className="mx-auto max-w-screen-md px-6 py-8">
        {/* Hero */}
        <div className="rounded-2xl border border-line bg-paper shadow-brand p-6 mb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-brand-deep">
                <BuildingIcon className="size-4" />
                שינוי סטטוס העסק
              </div>
              <h1 className="font-display text-2xl font-extrabold text-brand-navy">
                המדריך למעבר לעוסק מורשה
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {isMorsheAlready
                  ? "העסק שלך כבר רשום כעוסק מורשה — הרישום והמע״מ לא רלוונטיים לכם, ראו למטה מה כן חשוב לדעת."
                  : `כשמחזור העסק שלך חוצה את תקרת ${category}, המעבר לעוסק מורשה הופך לחובה — לא לבחירה. הנה מה זה אומר בפועל, ומה משתנה אצלנו ב-countme.`}
              </p>
            </div>
            {!isMorsheAlready && ceiling && (
              <StatusBadge
                status={ceiling.level === "exceeded" ? "overdue" : "due"}
                showDot
                className="shrink-0"
              >
                {ceiling.level === "exceeded" ? "חרגת מהתקרה" : "מתקרב לתקרה"}
              </StatusBadge>
            )}
          </div>

          {!isMorsheAlready && ceiling && (
            <div className="mt-4 rounded-xl border border-line bg-cream/60 px-4 py-3 text-[13px] leading-relaxed">
              <span className="font-bold text-brand-navy">המצב שלך: </span>
              <span className="text-ink">
                מחזור של {ils(ceiling.turnover)} מתוך תקרת {ils(ceiling.threshold)} לשנת {persona.income.year} ({category}).
              </span>
            </div>
          )}
        </div>

        {/* Sections A-D below all describe a פטור→מורשה transition (new VAT
            registration, new invoice type, losing the VAT exemption) — every
            claim in them is WRONG for someone who's already עוסק מורשה
            (adversarial-review finding, 2026-08-20: this page used to be
            unreachable for any osekType==="morshe" persona before the
            murshe-zeir reform made the ceiling alert — and its CTA here —
            reachable for a מורשה-זעיר too). Gated on !isMorsheAlready; an
            already-מורשה reader (zeir or not) gets the short, factually
            -safe block right after this instead. */}
        {!isMorsheAlready && (
          <>
        {/* A. What crossing the ceiling means */}
        <section className="mb-6 rounded-2xl border border-line bg-paper shadow-brand-sm p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-brand-navy">
            <AlertTriangleIcon className="size-5 text-alert" />
            מה המשמעות של חציית התקרה
          </h2>

          <ul className="space-y-3 text-sm leading-relaxed text-ink">
            <li className="flex items-start gap-2.5">
              <ShieldIcon className="mt-0.5 size-4 shrink-0 text-brand-deep" />
              <span>
                <strong className="text-brand-navy">רישום כעוסק מורשה הופך לחובה.</strong>{" "}
                זו לא המלצה — ברגע שהמחזור השנתי חוצה את תקרת {category}, החוק מחייב רישום אצל רשות המסים.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <PercentIcon className="mt-0.5 size-4 shrink-0 text-brand-deep" />
              <span>
                <strong className="text-brand-navy">{vatPercent}% מע&quot;מ על כל חשבונית מרגע החריגה.</strong>{" "}
                כל מסמך שמוציאים מנקודת החציגה ואילך חייב לכלול מע&quot;מ בשיעור {vatPercent}%, לפי שנת המס {persona.income.year}.
              </span>
            </li>
            {/* Explicit loss statement — QA 2026-08-18 flagged we never say
                this out loud anywhere in the product. */}
            <li className="flex items-start gap-2.5 rounded-xl border border-alert/30 bg-overdue-bg/30 p-3">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-alert" />
              <span>
                <strong className="text-brand-navy">
                  אתם מאבדים את הטבות ה{category}.
                </strong>{" "}
                הפטור מגביית מע&quot;מ נגמר, וכל חשבונית שמוציאים מעכשיו כוללת מע&quot;מ שצריך לגבות ולדווח עליו. אם אתם רשומים כעוסק זעיר — גם הניכוי הנורמטיבי של 30% מההוצאות בלי קבלות, וגם הפטור מהגשת דו&quot;ח שנתי מלא, נעלמים ברגע המעבר. מנגד, אפשר להתחיל לנכות מע&quot;מ תשומות על הוצאות עסקיות — הטבה שלא הייתה קיימת קודם.
              </span>
            </li>
          </ul>
        </section>

        {/* B. Concrete steps — numbered checklist, DoneScreen pattern */}
        <section className="mb-6 rounded-2xl border border-line bg-paper shadow-brand-sm p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-brand-navy">
            <CheckCircleIcon className="size-5 text-brand-deep" />
            שלבי המעבר בפועל
          </h2>

          <div className="space-y-3">
            {REGISTRATION_STEPS.map((s) => (
              <div
                key={s.n}
                className="flex items-start gap-3 rounded-xl border border-line bg-cream/40 px-4 py-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">
                  {s.n}
                </span>
                <div>
                  <div className="text-sm font-bold text-brand-navy">{s.title}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-muted">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* C. What changes inside countme */}
        <section className="mb-6 rounded-2xl border border-line bg-paper shadow-brand-sm p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-brand-navy">
            <FileTextIcon className="size-5 text-brand-deep" />
            מה משתנה אצלנו ב-countme
          </h2>

          <ul className="space-y-3 text-sm leading-relaxed text-ink">
            <li className="flex items-start gap-2.5">
              <ReceiptIcon className="mt-0.5 size-4 shrink-0 text-brand-deep" />
              <span>
                <strong className="text-brand-navy">חשבונית מס נפתחת כאפשרות.</strong>{" "}
                עדכון סוג העסק ל-&quot;עוסק מורשה&quot; ב<Link href="/setup" className="underline decoration-brand-deep/40 underline-offset-2 hover:text-brand-deep">עדכון נתונים</Link> פותח את סוג המסמך הזה ביצירת מסמכים חדשים, במקום קבלה בלבד.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <PercentIcon className="mt-0.5 size-4 shrink-0 text-brand-deep" />
              <span>
                <strong className="text-brand-navy">שורות מע&quot;מ מופיעות במסמכים.</strong>{" "}
                כל חשבונית מס שמופקת אצלנו תחשב ותציג את שורת המע&quot;מ ({vatPercent}%) בנפרד מהסכום העסקי.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-brand-deep" />
              <span>
                <strong className="text-brand-navy">דיווח דו&quot;ח מע&quot;מ עצמו — עדיין דרך רשות המסים.</strong>{" "}
                countme מציג לך את סכומי המע&quot;מ שנצברו על כל מסמך, אבל הגשת דו&quot;ח מע&quot;מ תקופתי מלא מתבצעת כרגע ישירות באתר רשות המסים — לא דרכנו.
              </span>
            </li>
          </ul>
        </section>

        {/* D. Closing note */}
        <section className="mb-6 rounded-2xl border border-line bg-cream/60 p-6">
          <p className="text-sm leading-relaxed text-ink">
            המעבר לעוסק מורשה הוא לא רק עניין טכני — הוא משנה איך תמחרים, איך מתנהלים מול לקוחות, ואיך נראה תזרים המזומנים שלכם. שווה לעבור את התהליך יחד עם{" "}
            <strong className="text-brand-navy">רואה חשבון או יועץ מס מוסמך</strong>, שיוכל להתאים את התזמון והפרטים למצב הספציפי שלכם.
          </p>
          <LegalNote variant="line" className="mt-4" />
        </section>
          </>
        )}

        {isMorsheAlready && (
          <section className="mb-6 rounded-2xl border border-line bg-paper shadow-brand-sm p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-brand-navy">
              <ShieldIcon className="size-5 text-brand-deep" />
              מה כן רלוונטי לכם
            </h2>
            <p className="text-sm leading-relaxed text-ink">
              הרישום כעוסק מורשה וגביית המע&quot;מ כבר קיימים אצלכם — אין כאן
              שום שינוי. {persona.business.isOsekZeir ? (
                <>
                  מה שכן משתנה בחציית התקרה: מסלול{" "}
                  <strong className="text-brand-navy">עוסק זעיר</strong> —
                  הניכוי האוטומטי של 30% מההוצאות בלי קבלות ודיווח מס-הכנסה
                  פשוט יותר — מפסיק להיות זמין. זה
                  לא נוגע לרישום שלכם כמורשה או לגביית המע&quot;מ, רק לאיך
                  שמדווחים הכנסה במס הכנסה. שווה להתייעץ עם רואה חשבון לגבי
                  המעבר לדיווח לפי הוצאות בפועל.
                </>
              ) : (
                "אין פעולה נדרשת מבחינת מע\"מ או רישום."
              )}
            </p>
            <LegalNote variant="line" className="mt-4" />
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard" className={btn("primary", "md")}>
            חזרה ללוח הבקרה
            <ArrowLeftIcon className="size-4" />
          </Link>
          <Link href="/alerts" className={btn("secondary", "md")}>
            להתראות
          </Link>
        </div>
      </main>
    </div>
  );
}
