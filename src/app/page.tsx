import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy/70 text-lg font-bold text-white shadow-sm">
              c
            </div>
            <span className="text-base font-bold tracking-tight">countme</span>
          </div>
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink href="/dashboard">דשבורד</NavLink>
            <NavLink href="/file">מילוי 1301</NavLink>
            <NavLink href="/business-expenses">הוצאות</NavLink>
            <NavLink href="/invoices">חשבוניות</NavLink>
            <NavLink href="/coach">✦ איתן</NavLink>
            <NavLink href="/about">תיעוד</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/setup"
              className="rounded-full border border-stone-300 px-4 py-1.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
            >
              הכנסת נתונים
            </Link>
            <Link
              href="/demo"
              className="rounded-full bg-brand-navy px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-navy/90 transition-colors"
            >
              דמו →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-cream border-b border-stone-200">
        <div className="mx-auto flex max-w-screen-xl flex-col items-center gap-7 px-6 py-20 text-center">
          <div className="rounded-full border border-brand-navy/20 bg-info/40 px-3 py-1 text-xs font-medium text-brand-navy">
            מוצר חדש לעצמאיות ועצמאים בישראל · בפיתוח
          </div>

          <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            מלא/י דו״חות מס
            <br />
            <span className="text-brand-navy">
              בלי רואה חשבון, בלי פחד
            </span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-stone-600 md:text-lg">
            countme הוא האח החכם שלך לדוח השנתי. מחשב כל שדה בטופס 1301 מהנתונים שלך,
            מסביר כל מספר, ועוזר לך לגלות הוצאות שלא ידעת שמגיעות לך.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/setup"
              className="rounded-full bg-brand-navy px-7 py-3 text-base font-medium text-white shadow-sm hover:bg-brand-navy/90 transition-colors"
            >
              התחל/י עכשיו →
            </Link>
            <Link
              href="/coach"
              className="rounded-full bg-success px-7 py-3 text-base font-medium text-white shadow-sm hover:bg-success/90 transition-colors"
            >
              ✦ דבר/י עם איתן
            </Link>
            <Link
              href="/demo"
              className="rounded-full border border-brand-navy/30 px-7 py-3 text-base font-medium text-brand-navy hover:bg-brand-navy/5 transition-colors"
            >
              ראה/י דמו
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-4 w-full max-w-xl">
            <Stat value="352K" label="עצמאים ישראלים" />
            <Stat value="₪1,200" label="חיסכון ממוצע" suffix="לדוח" />
            <Stat value="3 דק׳" label="למילוי עם countme" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-screen-xl px-6">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold text-brand-navy">
              כל מה שצריך לדוח שנתי
            </h2>
            <p className="mt-2 text-stone-500">חמישה כלים, עבודה אחת שלמה</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              href="/dashboard"
              accent="bg-info"
              accentText="text-brand-navy"
              label="דשבורד"
              title="רווח והפסד בזמן אמת"
              desc="תצוגה חיה של הכנסות, הוצאות ורווח נקי. סינון אוטומטי לפי תאריכי החשבוניות וההוצאות שלך — חודש, רבעון או שנה."
              cta="פתח/י דשבורד"
            />
            <FeatureCard
              href="/file"
              accent="bg-brand-navy"
              accentText="text-white"
              label="טופס 1301"
              title="מסלול מילוי חכם"
              desc='שני מסלולים: מסלול מודרך עם איתן ב-12 שלבים עם עריכת שדות חיה, או הטופס המוכר של gov.il עם 📋 העתק וצ׳אט.'
              cta="למסלול המילוי"
            />
            <FeatureCard
              href="/business-expenses"
              accent="bg-success"
              accentText="text-white"
              label="הוצאות"
              title="הוצאות מוכרות לפי עסק"
              desc="רשימה מותאמת לתחום עיסוק (קריאייטיב / טכנולוגיה / ייעוץ) עם כללי ניכוי — חלקי, מלא, פחת."
              cta="לרשימת ההוצאות"
            />
            <FeatureCard
              href="/invoices"
              accent="bg-alert"
              accentText="text-white"
              label="חשבוניות"
              title="חשבונית מס/קבלה ישראלית"
              desc="הוצא חשבונית מס/קבלה (305) או קבלה (320) בפורמט חוקי, מספור רץ אוטומטי, מע״מ לפי סוג עוסק, הדפסה ישירה."
              cta="לחשבוניות"
            />
            <FeatureCard
              href="/coach"
              accent="bg-success-light"
              accentText="text-success"
              label="איתן"
              title="ייעוץ AI מתמיד"
              desc="צ׳אט עם איתן — מאתר הוצאות שפספסת, מחיל כללי ניכוי, מקבל קבלות וקורא PDF, בעברית בגובה העיניים."
              cta="פתח שיחה"
            />
            <FeatureCard
              href="/about"
              accent="bg-stone-700"
              accentText="text-white"
              label="תיעוד"
              title="איך זה בנוי"
              desc="תיעוד טכני: ארכיטקטורה, רשימת דפים, שדות הכוכב של 1301, סטאק טכנולוגי, וטוקני העיצוב — הכל בעמוד אחד."
              cta="לתיעוד הטכני"
            />
          </div>
        </div>
      </section>

      {/* Eitan strip */}
      <section className="bg-brand-navy py-12">
        <div className="mx-auto max-w-screen-xl px-6">
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-right">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-4xl">
              🤝
            </div>
            <div className="flex-1">
              <h2 className="font-display text-2xl font-bold text-white">
                איתן — השותף הדיגיטלי שלך
              </h2>
              <p className="mt-1 text-info/90 leading-relaxed">
                לא בוט, לא ״שאל רואה חשבון״ — איתן הוא מערכת AI שמחליפה את הרואה חשבון.
                מזהה הוצאות שפספסת, מחיל את כלל 30% לעבודה מהבית, שואל על תרומות לסעיף 46.
                שיחה בעברית, בגובה העיניים.
              </p>
            </div>
            <Link
              href="/coach"
              className="shrink-0 rounded-full bg-success px-6 py-3 text-sm font-medium text-white hover:bg-success/90 transition-colors"
            >
              ✦ פתח שיחה עם איתן
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-cream py-16">
        <div className="mx-auto max-w-screen-xl px-6">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold text-brand-navy">
              איך זה עובד
            </h2>
            <p className="mt-2 text-stone-500">ארבעה שלבים, דוח שלם</p>
          </div>

          <div className="grid grid-cols-1 gap-0 md:grid-cols-4">
            <Step
              num="1"
              title="הכנסת נתונים"
              text="מעלה/ת קבצים (Excel, PDF) או ממלא/ת את האשף ב-7 שלבים. countme קורא חשבוניות, מזהה הוצאות, ובונה את הפרופיל הפיננסי שלך."
              icon="📂"
            />
            <StepArrow />
            <Step
              num="2"
              title="חישוב אוטומטי"
              text="כל שדה בטופס 1301 מחושב לפי חוקי מס הכנסה הישראלי — ביטוח לאומי, קרן השתלמות, נקודות זיכוי, סעיף 46, כולם."
              icon="⚙️"
            />
            <StepArrow />
            <Step
              num="3"
              title="מסלול המילוי"
              text='איתן מלווה אותך ב-12 שלבים או שאת/ה מסתכל/ת בטבלת מומחה. כל ערך עם כפתור 📋 להעתקה ישירה לטופס רשות המסים.'
              icon="📋"
            />
            <StepArrow />
            <Step
              num="4"
              title="מעקב שוטף"
              text="הדשבורד מתעדכן בזמן אמת. הוצא חשבוניות מס לאורך השנה. countme יושב לידך כל השנה, לא רק בעונת הדוחות."
              icon="📊"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-8">
        <div className="mx-auto max-w-screen-xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-sm font-bold text-white">c</div>
              <span className="text-sm font-medium">countme</span>
              <span className="text-xs text-stone-400">· לעצמאים בישראל</span>
            </div>
            <div className="flex gap-4 text-xs text-stone-400">
              <Link href="/demo" className="hover:text-stone-600 transition-colors">דמו 1301</Link>
              <Link href="/dashboard" className="hover:text-stone-600 transition-colors">דשבורד</Link>
              <Link href="/file" className="hover:text-stone-600 transition-colors">מילוי הדוח</Link>
              <Link href="/invoices" className="hover:text-stone-600 transition-colors">חשבוניות</Link>
              <Link href="/coach" className="hover:text-stone-600 transition-colors">איתן</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 transition-colors"
    >
      {children}
    </Link>
  );
}

function Stat({ value, label, suffix }: { value: string; label: string; suffix?: string }) {
  return (
    <div className="rounded-xl border border-brand-navy/10 bg-white/60 p-4 text-center">
      <div className="font-display text-xl font-bold text-brand-navy">
        {value}
        {suffix && <span className="mr-1 text-xs font-normal text-stone-400">{suffix}</span>}
      </div>
      <div className="mt-0.5 text-xs text-stone-500">{label}</div>
    </div>
  );
}

function FeatureCard({
  href,
  accent,
  accentText,
  label,
  title,
  desc,
  cta,
}: {
  href: string;
  accent: string;
  accentText?: string;
  label: string;
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 hover:border-brand-navy/20 hover:shadow-lg transition-all"
    >
      <div className="flex items-center gap-2">
        <span className={`rounded-full ${accent} px-2.5 py-0.5 text-xs font-medium ${accentText ?? "text-white"}`}>
          {label}
        </span>
      </div>
      <div>
        <h3 className="text-lg font-bold text-brand-navy">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{desc}</p>
      </div>
      <span className="mt-auto text-sm font-medium text-brand-navy/60 group-hover:text-brand-navy transition-colors">
        {cta} ←
      </span>
    </Link>
  );
}

function Step({ num, title, text, icon }: { num: string; title: string; text: string; icon: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy text-sm font-bold text-white">
          {num}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      <h3 className="font-bold text-brand-navy">{title}</h3>
      <p className="text-sm leading-relaxed text-stone-500">{text}</p>
    </div>
  );
}

function StepArrow() {
  return (
    <div className="hidden items-center justify-center md:flex">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-stone-300 rotate-180">
        <path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
