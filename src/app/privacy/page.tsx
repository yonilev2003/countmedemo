import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { ArrowLeftIcon } from "@/components/brand/icons";

export const metadata = {
  title: "מדיניות פרטיות · countme",
};

// DRAFT — NEEDS LEGAL REVIEW. כל הנוסח בעמוד הזה הוא טיוטה עובדתית שנכתבה
// לפי דרישות סעיף 11 לחוק הגנת הפרטיות (כולל תיקון 13) וטרם עבר סקירה משפטית.

export default function PrivacyPage() {
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
            מדיניות פרטיות
          </h1>
          <p className="mt-2 leading-relaxed text-muted">
            עודכן לאחרונה: יולי 2026 · גרסת בטא
          </p>
        </div>

        <div className="rounded-xl border border-due/40 bg-paper px-5 py-3 text-[13px] leading-relaxed text-due-ink">
          טיוטה — נוסח זה טרם עבר סקירה משפטית. אנחנו משתפים אותו בשקיפות כבר
          עכשיו כדי שתדעו בדיוק מה נאסף ולמה; הוא יעודכן לאחר סקירה מקצועית.
        </div>

        <Section title="מי אנחנו ומה המוצר">
          <p>
            countme הוא כלי דיגיטלי לעצמאים בישראל: מעקב הכנסות והוצאות, הפקת
            מסמכים, הסברים על מיסוי ועזרה במילוי דוחות. המוצר בשלב בטא. יצירת
            קשר בכל נושא פרטיות:{" "}
            <a
              href="mailto:countme5555@gmail.com"
              className="font-semibold text-brand-deep underline"
            >
              countme5555@gmail.com
            </a>
            .
          </p>
        </Section>

        <Section title="איזה מידע נאסף">
          <ul className="list-disc space-y-1.5 ps-5">
            <li>
              <strong className="text-brand-navy">פרטי חשבון:</strong> שם וכתובת
              מייל מחשבון ה-Google שאיתו התחברתם.
            </li>
            <li>
              <strong className="text-brand-navy">נתונים שאתם מזינים:</strong>{" "}
              פרטים אישיים ועסקיים מהשאלון (כולל מספר זהות אם הוזן), הכנסות,
              הוצאות, מסמכים שהפקתם ונתונים למילוי הדוח השנתי.
            </li>
            <li>
              <strong className="text-brand-navy">מסמכים שאתם מעלים:</strong>{" "}
              קבצים (למשל קבלות או טופס 106) מעובדים לצורך חילוץ הנתונים ואינם
              נשמרים אצלנו כקבצים לאחר העיבוד.
            </li>
            <li>
              <strong className="text-brand-navy">נתוני שימוש:</strong> אירועי
              מוצר בסיסיים (למשל "הושלמה הרשמה") לצורך שיפור המוצר. איננו שומרים
              כתובות IP באירועים אלה.
            </li>
          </ul>
        </Section>

        <Section title="איפה המידע נשמר">
          <ul className="list-disc space-y-1.5 ps-5">
            <li>
              <strong className="text-brand-navy">בחשבון שלכם אצלנו:</strong>{" "}
              במסד נתונים מנוהל (Supabase) עם בקרות גישה ברמת שורה — כל משתמש
              רואה אך ורק את הנתונים של עצמו.
            </li>
            <li>
              <strong className="text-brand-navy">במכשיר שלכם:</strong> עותק
              עבודה נשמר בדפדפן (localStorage) כדי שהאפליקציה תהיה מהירה. בעת
              התנתקות העותק המקומי נמחק.
            </li>
          </ul>
        </Section>

        <Section title="למי המידע מועבר">
          <p>
            איננו מוכרים מידע אישי ואיננו מעבירים אותו לגורמי פרסום. המידע מעובד
            אצל ספקי תשתית שמפעילים את השירות עבורנו:
          </p>
          <ul className="mt-2 list-disc space-y-1.5 ps-5">
            <li>Supabase — אחסון מסד הנתונים והזדהות.</li>
            <li>Vercel — אירוח האתר.</li>
            <li>
              Anthropic — מפעילת מודל ה-AI שמאחורי שקל: תוכן שאתם כותבים בצ׳אט
              ומסמכים שאתם מעלים נשלחים לעיבוד כדי להפיק תשובה, ואינם משמשים
              לאימון מודלים לפי תנאי הספק.
            </li>
          </ul>
          <p className="mt-2">
            חלק מהספקים מעבדים מידע מחוץ לישראל. אנו פועלים להסדרת ההעברות בהסכמי
            עיבוד נתונים מתאימים.
          </p>
        </Section>

        <Section title="הזכויות שלכם">
          <p>
            לפי חוק הגנת הפרטיות עומדות לכם זכויות עיון, תיקון ומחיקה של מידע
            עליכם. בשלב הבטא מימוש הזכויות נעשה בפנייה למייל{" "}
            <a
              href="mailto:countme5555@gmail.com"
              className="font-semibold text-brand-deep underline"
            >
              countme5555@gmail.com
            </a>{" "}
            — נטפל בכל פנייה בהקדם ולא יאוחר מהמועדים הקבועים בחוק. מסירת המידע
            תלויה ברצונכם ואינה חובה חוקית; בלי חלק מהנתונים חלק מהיכולות פשוט לא
            יעבדו.
          </p>
        </Section>

        <Section title="אבטחת מידע">
          <p>
            התקשורת מוצפנת (HTTPS), הגישה למסד הנתונים מוגבלת לפי משתמש, ומפתחות
            השירות אינם חשופים לדפדפן. אם יתגלה אירוע אבטחה מהותי — נפעל לפי חובות
            הדיווח שבדין ונעדכן משתמשים שנפגעו.
          </p>
        </Section>

        <Section title="שינויים במדיניות">
          <p>
            זהו נוסח בטא. עם התקדמות המוצר (ולאחר סקירה משפטית) המדיניות תתעדכן,
            ותאריך העדכון בראש העמוד ישתנה בהתאם.
          </p>
        </Section>

        <div className="border-t border-line pt-6 text-sm text-muted">
          ראו גם:{" "}
          <Link href="/terms" className="font-semibold text-brand-deep underline">
            תנאי השימוש
          </Link>
        </div>
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
