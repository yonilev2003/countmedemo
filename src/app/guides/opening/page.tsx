import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { ArrowLeftIcon, ArrowRightIcon, AlertTriangleIcon } from "@/components/brand/icons";

export const metadata = {
  title: "פתיחת תיק עצמאי — countme",
};

/**
 * /guides/opening — factual placeholder page for users who haven't opened a
 * file yet (onboarding tier "pre", ONB-5). "עובדות, לא עצות": three short,
 * neutral fact lists (no advice, no recommendation) linking to the official
 * government source for each authority, plus a DRAFT banner.
 *
 * This is explicitly the SHELF-2 placeholder — the interactive step-by-step
 * opening guides are out of scope for beta (spec §"מה במפורש לא בבטא").
 *
 * DRAFT — NEEDS LEGAL/PROFESSIONAL REVIEW (ONB-15, not done this round — see
 * the AI-session gap list). Facts below are general public knowledge about
 * how the three authorities work, not verified line-by-line by a professional.
 */
export default function OpeningGuidePage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={28} />
          </Link>
          <Link href="/onboarding" className={btn("secondary", "sm")}>
            <ArrowRightIcon className="size-3.5" />
            חזרה לשאלון
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-screen-md px-6 py-10 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-navy">
            פתיחת תיק עצמאי — מה כרוך בזה
          </h1>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            עובדות בלבד, בלי המלצה על מה לעשות — ההחלטה שלך, ובמידת הצורך כדאי
            להתייעץ עם רואה חשבון או יועץ מס. המדריכים המלאים, צעד-אחר-צעד,
            מגיעים בשלב הבא של המוצר.
          </p>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-due/40 bg-due-bg/50 px-4 py-3 text-[12.5px] text-ink leading-relaxed">
          <AlertTriangleIcon className="size-4 shrink-0 mt-0.5 text-due" />
          <span>
            <span className="font-bold text-due">DRAFT — טיוטה, לא ייעוץ.</span>{" "}
            העמוד הזה טרם עבר אימות מקצועי מלא ואינו מהווה ייעוץ משפטי, מס
            או חשבונאי.
          </span>
        </div>

        <AuthoritySection
          title="מס הכנסה"
          facts={[
            "פתיחת תיק עצמאי במס הכנסה נעשית מול פקיד השומה הרלוונטי לאזור העסק/המגורים שלך.",
            "אפשר לפתוח תיק באופן מקוון באתר רשות המסים, או בפנייה ישירה לסניף.",
            "אין עלות לפתיחת התיק עצמו.",
            "תיק פתוח הוא תנאי להפקת חשבונית מס/קבלה כדין.",
          ]}
          sourceUrl="https://www.misim.gov.il/"
          sourceLabel="רשות המסים בישראל"
        />

        <AuthoritySection
          title="מע״מ"
          facts={[
            "הרישום במע״מ נעשה בדרך כלל יחד עם פתיחת התיק במס הכנסה.",
            "הסיווג הראשוני (עוסק פטור / עוסק מורשה) נקבע לפי המחזור הצפוי וסוג העיסוק — חלק מהעיסוקים מחויבים ברישום כעוסק מורשה מלכתחילה, ללא קשר למחזור.",
            "עוסק פטור אינו גובה מע״מ מלקוחות ואינו מקזז מע״מ תשומות; עוסק מורשה כן.",
            "מעבר בין הסיווגים אפשרי בהמשך, בכפוף לתקרת המחזור העדכנית.",
          ]}
          sourceUrl="https://www.misim.gov.il/"
          sourceLabel="רשות המסים בישראל"
        />

        <AuthoritySection
          title="ביטוח לאומי"
          facts={[
            "עצמאי חייב בדיווח ובתשלום דמי ביטוח לאומי מתחילת הפעילות כעצמאי, ללא קשר לרישום במס הכנסה.",
            "הדיווח הראשוני נדרש תוך פרק זמן קצוב מתחילת העיסוק — כדאי לבדוק את המועד המדויק באתר הביטוח הלאומי.",
            "שיעור דמי הביטוח תלוי בגובה ההכנסה החייבת, ומתעדכן בהתאם לדיווחים השנתיים.",
            "דיווח באיחור עלול לגרור חיוב רטרואקטיבי.",
          ]}
          sourceUrl="https://www.btl.gov.il/"
          sourceLabel="המוסד לביטוח לאומי"
        />

        <div className="rounded-2xl border border-brand-deep/20 bg-info/30 p-5 text-center">
          <p className="text-sm font-medium text-brand-navy mb-3">
            ממשיכים בשאלון ההיכרות?
          </p>
          <Link href="/onboarding" className={btn("primary", "sm")}>
            חזרה לשאלון
            <ArrowLeftIcon className="size-3.5 rotate-180" />
          </Link>
        </div>
      </main>
    </div>
  );
}

function AuthoritySection({
  title,
  facts,
  sourceUrl,
  sourceLabel,
}: {
  title: string;
  facts: string[];
  sourceUrl: string;
  sourceLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-line bg-paper shadow-brand p-5">
      <h2 className="text-base font-bold text-brand-navy mb-3">{title}</h2>
      <ul className="space-y-1.5">
        {facts.map((f, i) => (
          <li key={i} className="flex gap-1.5 text-[13px] text-ink leading-relaxed">
            <span className="text-brand-deep">•</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-[12.5px] font-semibold text-brand-deep hover:underline"
      >
        {sourceLabel} ↗
      </a>
    </section>
  );
}
