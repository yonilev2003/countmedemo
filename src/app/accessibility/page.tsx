import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "הצהרת נגישות — countme",
  description:
    "הצהרת הנגישות של countme לפי תקן ישראלי 5568 — אמצעי הנגישות באתר, מגבלות ידועות ופרטי יצירת קשר בנושאי נגישות.",
};

/**
 * הצהרת נגישות (Hatzaharat Negishot) — mandatory under IS 5568 / the Service
 * Accessibility Regulations 2013. Contains the 7 required content items:
 * commitment + compliance level, accessibility features, known limitations,
 * accessibility contact, feedback channel, audit date, statement update date.
 *
 * IMPORTANT (maintenance): update LAST_AUDIT / LAST_UPDATED whenever a real
 * accessibility pass happens, and keep "known limitations" honest — a
 * statement that omits known gaps is itself a common audit failure.
 */
const LAST_AUDIT = "22.08.2026";
const LAST_UPDATED = "22.08.2026";
const CONTACT_EMAIL = "yonilev2003@gmail.com"; // עדכן/י כשיוקם דוא"ל ייעודי לנגישות

export default function AccessibilityStatementPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={24} />
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-brand-navy">
            חזרה לאתר
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-screen-md px-6 py-10">
        <article lang="he" dir="rtl" className="space-y-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-brand-navy">
              הצהרת נגישות
            </h1>
            <p className="mt-3 leading-relaxed text-ink">
              אנו ב-countme רואים חשיבות רבה במתן שירות שוויוני לכלל
              המשתמשים והמשתמשות, ופועלים להנגשת האתר והשירות לאנשים עם
              מוגבלות בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ״ח-1998,
              לתקנות שהותקנו מכוחו ולתקן הישראלי ת״י 5568, המעוגן בהנחיות
              WCAG 2.0 ברמה AA.
            </p>
          </div>

          <section>
            <h2 className="font-display text-xl font-bold text-brand-navy">
              אמצעי הנגישות באתר
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 ps-6 leading-relaxed text-ink">
              <li>האתר בנוי בעברית עם כיווניות ימין-לשמאל מלאה (RTL).</li>
              <li>האתר ניתן לניווט מלא באמצעות מקלדת, כולל קישור ״דלג לתוכן הראשי״.</li>
              <li>שדות הטפסים מקושרים לתוויות ומסומנים ככאלה עבור קוראי מסך.</li>
              <li>הודעות שגיאה מוצגות בעברית ומוכרזות לקוראי מסך.</li>
              <li>ניגודיות הצבעים של טקסט רגיל עומדת ביחס של ‎4.5:1 לפחות.</li>
              <li>האתר מכבד את העדפת המשתמש/ת להפחתת אנימציות (prefers-reduced-motion).</li>
              <li>תמונות ואייקונים מהותיים מלווים בטקסט חלופי.</li>
              <li>
                באתר פועל רכיב הגדרות נגישות (הכפתור הצף בתחתית המסך, או
                בקיצור המקלדת Alt+A) המאפשר התאמת ניגודיות, גודל טקסט, ריווח
                שורות, הדגשת קישורים, גופן קריא ועצירת אנימציות. הרכיב הוא
                כלי נוחות להתאמה אישית — הנגשת התוכן עצמו נעשית בקוד האתר.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-brand-navy">
              מגבלות נגישות ידועות
            </h2>
            <p className="mt-3 leading-relaxed text-ink">
              אנו פועלים לשיפור מתמיד של נגישות האתר. נכון למועד עדכון הצהרה
              זו, ידועות המגבלות הבאות ואנו פועלים לתיקונן:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 ps-6 leading-relaxed text-ink">
              <li>
                בדיקת תאימות מלאה לקוראי מסך (NVDA / VoiceOver) בעברית טרם
                הושלמה על כל מסכי המערכת.
              </li>
              <li>
                חלק מהכפתורים במסכי מילוי הטופס קטנים ממידת מגע מיטבית
                במכשירים ניידים.
              </li>
              <li>
                מסמכים להורדה (PDF/Excel) שהמערכת מפיקה טרם הונגשו במלואם
                לפי ת״י 5568 חלק 2.
              </li>
            </ul>
            <p className="mt-3 leading-relaxed text-ink">
              נתקלתם במגבלה שאינה מופיעה כאן? נשמח שתפנו אלינו ונטפל בה
              בהקדם.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-brand-navy">
              פנייה בנושא נגישות
            </h2>
            <p className="mt-3 leading-relaxed text-ink">
              אם נתקלתם בקושי בשימוש באתר, בבקשה להתאמת נגישות או בכל שאלה
              בנושא, ניתן לפנות אלינו ואנו מתחייבים לטפל בפנייה בהקדם
              האפשרי:
            </p>
            <p className="mt-3 leading-relaxed text-ink">
              איש הקשר לנושאי נגישות: יהונתן לוי
              <br />
              דוא״ל:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("פנייה בנושא נגישות — countme")}`}
                className="text-brand-deep underline"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-paper p-5 text-sm leading-relaxed text-muted">
            <p>תאריך ביקורת הנגישות האחרונה: {LAST_AUDIT}</p>
            <p>תאריך עדכון ההצהרה: {LAST_UPDATED}</p>
          </section>
        </article>
      </main>
    </div>
  );
}
