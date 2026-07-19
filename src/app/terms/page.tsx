import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { ArrowLeftIcon } from "@/components/brand/icons";
import { LEGAL_NOTE_FULL } from "@/components/brand/legal-note";

export const metadata = {
  title: "תנאי שימוש · countme",
};

// DRAFT — NEEDS LEGAL REVIEW. כל הנוסח בעמוד הזה הוא טיוטה שטרם עברה סקירה
// משפטית; המיצוב הקנוני: "מחשבון מדויק. לא ייעוץ מס." (WS8).

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={28} />
          </Link>
          <Link href="/" className={btn("secondary", "sm")}>
            <ArrowLeftIcon className="size-3.5" />
            חזרה לדף הבית
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-screen-md px-6 py-10 space-y-8">
        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-brand-deep/70">
            משפטי
          </p>
          <h1 className="font-display text-3xl font-bold text-brand-navy">
            תנאי שימוש
          </h1>
          <p className="mt-2 leading-relaxed text-muted">
            עודכן לאחרונה: יולי 2026 · גרסת בטא
          </p>
        </div>

        <div className="rounded-xl border border-due/40 bg-paper px-5 py-3 text-[13px] leading-relaxed text-due-ink">
          טיוטה — נוסח זה טרם עבר סקירה משפטית ויעודכן לאחר סקירה מקצועית.
        </div>

        <Section title="מה השירות">
          <p>
            countme הוא כלי דיגיטלי לעצמאים בישראל: מעקב הכנסות והוצאות, הפקת
            מסמכים, הסברים בגובה העיניים ועזרה במילוי דוחות. השירות ניתן כרגע
            בגרסת בטא — יכולות עשויות להשתנות, להתווסף או להיגרע ללא הודעה
            מוקדמת.
          </p>
        </Section>

        <Section title="מה השירות איננו">
          <p>{LEGAL_NOTE_FULL}</p>
          <p>
            countme אינו משרד רואי חשבון ואינו יועץ מס. המידע וההסברים במערכת הם
            כלליים ועובדתיים, אינם תחליף לייעוץ מקצועי המותאם לנסיבותיכם, והגשת
            דוחות לרשויות נעשית על אחריותכם בלבד.
          </p>
        </Section>

        <Section title="אחריות ושימוש">
          <ul className="list-disc space-y-1.5 ps-5">
            <li>הזינו נתונים נכונים — התוצרים מדויקים רק כמו הנתונים שהוזנו.</li>
            <li>
              בדקו כל מסמך שהופק (חשבונית, קבלה, הצעת מחיר) לפני שליחתו ללקוח.
            </li>
            <li>
              בשלב הבטא ייתכנו תקלות; אנא דווחו לנו על כל אי-דיוק במייל{" "}
              <a
                href="mailto:countme5555@gmail.com"
                className="font-semibold text-brand-deep underline"
              >
                countme5555@gmail.com
              </a>
              .
            </li>
            <li>
              {/* DRAFT — NEEDS LEGAL REVIEW: liability limitation wording */}
              בכפוף לכל דין, אחריותנו לנזק עקיף או תוצאתי הנובע מהשימוש בגרסת
              הבטא מוגבלת.
            </li>
          </ul>
        </Section>

        <Section title="חשבון ופרטיות">
          <p>
            השימוש בחלקים מהשירות מחייב התחברות עם חשבון Google. הטיפול במידע
            אישי מוסדר ב
            <Link
              href="/privacy"
              className="font-semibold text-brand-deep underline"
            >
              מדיניות הפרטיות
            </Link>
            , שהיא חלק בלתי נפרד מתנאים אלה.
          </p>
        </Section>

        <Section title="קניין רוחני">
          <p>
            המערכת, העיצוב והתכנים שלנו שייכים ל-countme. הנתונים שאתם מזינים
            והמסמכים שאתם מפיקים לעסק שלכם — שלכם.
          </p>
        </Section>

        <Section title="שינויים בתנאים">
          <p>
            נעדכן תנאים אלה מעת לעת (ובוודאי לאחר סקירה משפטית). המשך שימוש לאחר
            עדכון מהווה הסכמה לנוסח המעודכן; תאריך העדכון מופיע בראש העמוד.
          </p>
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 text-[15px] leading-relaxed text-ink">
      <h2 className="font-display text-xl font-bold text-brand-navy">{title}</h2>
      {children}
    </section>
  );
}
