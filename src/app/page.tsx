import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Nav */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-bold text-white shadow-sm">
              c
            </div>
            <span className="text-lg font-bold">countme</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50 transition-colors"
            >
              דשבורד
            </Link>
            <Link
              href="/file"
              className="rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50 transition-colors"
            >
              מילוי 1301
            </Link>
            <Link
              href="/invoices"
              className="rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50 transition-colors"
            >
              חשבוניות
            </Link>
            <Link
              href="/coach"
              className="rounded-full border border-success/50 bg-success/10 px-4 py-2 text-sm font-medium text-success hover:bg-success/20 transition-colors"
            >
              ✦ איתן
            </Link>
            <Link
              href="/demo"
              className="rounded-full bg-brand-navy px-5 py-2 text-sm font-medium text-white hover:bg-brand-navy/90 transition-colors"
            >
              צפה בדמו →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto flex max-w-screen-xl flex-1 flex-col items-center justify-center gap-8 px-6 py-20 text-center">
        <div className="rounded-full border border-info bg-info/30 px-3 py-1 text-xs font-medium text-brand-navy">
          מוצר חדש לעצמאים בישראל · בפיתוח
        </div>

        <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
          מלא/י דו״חות מס
          <br />
          <span className="bg-gradient-to-l from-brand-navy to-brand-navy/60 bg-clip-text text-transparent">
            בלי רואה חשבון, בלי פחד
          </span>
        </h1>

        <p className="max-w-2xl text-lg leading-relaxed text-stone-600">
          countme הוא המלווה האישי שלך לדו"חות מס. אנחנו לוקחים את כל החשבוניות
          וההוצאות שלך, מחשבים בעצמנו, ומציגים בדיוק מה למלא בכל שדה — עם הסבר
          מאיפה כל מספר הגיע. אפס תהיות, אפס שכר טרחה.
        </p>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/demo"
            className="rounded-full bg-brand-navy px-7 py-3 text-base font-medium text-white shadow-lg shadow-brand hover:bg-brand-navy/90 transition-colors"
          >
            הדמו של טופס 1301 →
          </Link>
          <Link
            href="/coach"
            className="rounded-full bg-success px-7 py-3 text-base font-medium text-white shadow-lg shadow-brand hover:bg-success/90 transition-colors"
          >
            ✦ דבר עם איתן →
          </Link>
          <a
            href="#how-it-works"
            className="rounded-full border border-stone-300 px-7 py-3 text-base font-medium text-stone-700 hover:bg-stone-100 transition-colors"
          >
            איך זה עובד
          </a>
        </div>

        {/* Stats */}
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Stat label="עצמאים מתחת ל-35 בישראל" value="352,000" />
          <Stat label="חיסכון ממוצע על רואה חשבון" value="₪1,200" suffix="לדו״ח" />
          <Stat label="זמן ממוצע למילוי 1301" value="3 דקות" suffix="עם countme" />
        </div>
      </main>

      {/* Features grid */}
      <section className="border-t border-stone-200 bg-cream py-14">
        <div className="mx-auto max-w-screen-xl px-6">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-brand-navy">
            כל הכלים במקום אחד
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              href="/dashboard"
              icon="📊"
              title="דשבורד רווח והפסד"
              desc="מבט חי על הכנסות, הוצאות ורווח נקי עם תובנות מאיתן"
            />
            <FeatureCard
              href="/file"
              icon="📋"
              title="מילוי טופס 1301"
              desc="מסלול מודרך עם איתן ב-12 שלבים, או מבט מומחה מהיר"
            />
            <FeatureCard
              href="/business-expenses"
              icon="💼"
              title="הוצאות מוכרות"
              desc="רשימת ההוצאות המותרות לפי סוג העסק שלך עם כללי ניכוי"
            />
            <FeatureCard
              href="/invoices"
              icon="🧾"
              title="חשבוניות וקבלות"
              desc="הוצא חשבוניות מס וקבלות בפורמט ישראלי עם הדפסה נוחה"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-t border-stone-200 bg-white py-16"
      >
        <div className="mx-auto max-w-screen-xl px-6">
          <h2 className="mb-10 text-center font-display text-3xl font-bold">
            איך זה עובד
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <Step
              num="1"
              title="חבר/י את הנתונים שלך"
              text="חשבוניות, הוצאות, מסמכי בנק — countme לוקח הכל ומסדר אותו."
            />
            <Step
              num="2"
              title="המלווה מחשב הכל"
              text='לפי חוקי מס ההכנסה הישראלי. כל שדה בטופס 1301 מתמלא אוטומטית, עם הסבר.'
            />
            <Step
              num="3"
              title="העתק/י לרשות המסים"
              text="פתח/י את הטופס באתר רשות המסים, והעתק/י את הערכים. countme יושב לידך."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="font-display text-3xl font-bold text-brand-navy">
        {value}
        {suffix && (
          <span className="mr-1 text-base font-normal text-stone-500">
            {suffix}
          </span>
        )}
      </div>
      <div className="mt-1 text-sm text-stone-600">{label}</div>
    </div>
  );
}

function FeatureCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:border-brand-navy/30 hover:shadow-md transition-all"
    >
      <span className="text-3xl">{icon}</span>
      <h3 className="font-bold text-brand-navy group-hover:text-brand-navy/80">{title}</h3>
      <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
      <span className="mt-auto text-xs font-medium text-brand-navy/60 group-hover:text-brand-navy">
        כניסה ←
      </span>
    </Link>
  );
}

function Step({
  num,
  title,
  text,
}: {
  num: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info font-bold text-brand-navy">
        {num}
      </div>
      <div>
        <h3 className="mb-1 font-bold">{title}</h3>
        <p className="text-sm text-stone-600 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
