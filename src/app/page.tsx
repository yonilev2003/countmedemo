import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import {
  BellIcon,
  CalendarIcon,
  SparklesIcon,
  UploadIcon,
  SettingsIcon,
  ClipboardCheckIcon,
  BarChartIcon,
  FileTextIcon,
  PercentIcon,
  ReceiptIcon,
  WalletIcon,
} from "@/components/brand/icons";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-cream">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3">
          <Logo size={30} />
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink href="/dashboard">דשבורד</NavLink>
            <NavLink href="/alerts">
              <BellIcon className="size-4" /> התראות
            </NavLink>
            <NavLink href="/deadlines">
              <CalendarIcon className="size-4" /> מועדים
            </NavLink>
            <NavLink href="/file">מילוי 1301</NavLink>
            <NavLink href="/business-expenses">הוצאות</NavLink>
            <NavLink href="/invoices">חשבוניות</NavLink>
            <NavLink href="/coach">
              <SparklesIcon className="size-4" /> איתן
            </NavLink>
            <NavLink href="/about">תיעוד</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/setup" className={btn("secondary", "sm")}>
              הכנסת נתונים
            </Link>
            <Link href="/demo" className={btn("primary", "sm")}>
              דמו ←
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — frosted glass over a navy-teal gradient (Brand Kit auth aesthetic) */}
      <section className="relative overflow-hidden bg-brand-navy">
        {/* gradient backdrop: radial aqua + gold + teal glows over navy */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 46% at 82% 4%, rgba(192,213,214,.28) 0%, rgba(192,213,214,0) 60%)," +
              "radial-gradient(74% 58% at 6% 100%, rgba(64,126,140,.5) 0%, rgba(64,126,140,0) 62%)," +
              "radial-gradient(46% 40% at 96% 92%, rgba(200,181,154,.22) 0%, rgba(200,181,154,0) 60%)," +
              "linear-gradient(157deg, var(--color-navy-700) 0%, var(--color-brand-navy) 46%, var(--color-navy-900) 100%)",
          }}
        />
        {/* soft glass wash to deepen the base */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(192,213,214,.08) 0%, rgba(8,40,55,.04) 44%, rgba(5,30,40,.34) 100%)",
          }}
        />
        {/* hairline base separator into the cream section */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent)",
          }}
        />

        <div className="relative mx-auto flex max-w-screen-xl flex-col items-center gap-7 px-6 py-24 text-center md:py-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-aqua shadow-brand backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-brand" />
            מוצר חדש לעצמאיות ועצמאים בישראל · בפיתוח
          </span>

          <h1
            className="max-w-3xl font-display text-[44px] font-extrabold leading-[1.06] tracking-[-0.025em] text-white sm:text-6xl md:text-[68px]"
            style={{ textShadow: "0 2px 28px rgba(5,30,40,.45)" }}
          >
            מלא/י דו״חות מס
            <br />
            <span className="text-brand">בלי רואה חשבון, בלי פחד</span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-aqua/90 md:text-lg">
            countme הוא האח החכם שלך לדוח השנתי. מחשב כל שדה בטופס 1301 מהנתונים
            שלך, מסביר כל מספר, ועוזר לך לגלות הוצאות שלא ידעת שמגיעות לך.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/setup" className={btn("gold")}>
              התחל/י עכשיו ←
            </Link>
            <Link
              href="/coach"
              className={btn(
                "secondary",
                "md",
                "border-white/30 bg-white/10 text-white backdrop-blur-md hover:border-white/50 hover:bg-white/20",
              )}
            >
              <SparklesIcon className="size-[18px]" /> דבר/י עם איתן
            </Link>
            <Link
              href="/demo"
              className={btn(
                "ghost",
                "md",
                "text-aqua hover:bg-white/10 hover:text-white",
              )}
            >
              ראה/י דמו
            </Link>
          </div>

          {/* Stats — frosted-glass tiles */}
          <div className="mt-8 grid w-full max-w-2xl grid-cols-3 gap-3 sm:gap-4">
            <Stat value="352K" label="עצמאים ישראלים" />
            <Stat value="₪1,200" label="חיסכון ממוצע" suffix="לדוח" />
            <Stat value="3 דק׳" label="למילוי עם countme" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-cream py-20 md:py-24">
        <div className="mx-auto max-w-screen-xl px-6">
          <SectionHeading
            eyebrow="הכלים"
            title="כל מה שצריך לדוח שנתי"
            subtitle="חמישה כלים, עבודה אחת שלמה"
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              href="/dashboard"
              icon={<BarChartIcon className="size-6" />}
              label="דשבורד"
              title="רווח והפסד בזמן אמת"
              desc="תצוגה חיה של הכנסות, הוצאות ורווח נקי. סינון אוטומטי לפי תאריכי החשבוניות וההוצאות שלך — חודש, רבעון או שנה."
              cta="פתח/י דשבורד"
            />
            <FeatureCard
              href="/file"
              icon={<FileTextIcon className="size-6" />}
              label="טופס 1301"
              title="מסלול מילוי חכם"
              desc="שני מסלולים: מסלול מודרך עם איתן ב-12 שלבים עם עריכת שדות חיה, או הטופס המוכר של gov.il עם כפתור העתקה וצ׳אט."
              cta="למסלול המילוי"
            />
            <FeatureCard
              href="/business-expenses"
              icon={<WalletIcon className="size-6" />}
              label="הוצאות"
              title="הוצאות מוכרות לפי עסק"
              desc="רשימה מותאמת לתחום עיסוק (קריאייטיב / טכנולוגיה / ייעוץ) עם כללי ניכוי — חלקי, מלא, פחת."
              cta="לרשימת ההוצאות"
            />
            <FeatureCard
              href="/invoices"
              icon={<ReceiptIcon className="size-6" />}
              label="חשבוניות"
              title="חשבונית מס/קבלה ישראלית"
              desc="הוצא חשבונית מס/קבלה (305) או קבלה (320) בפורמט חוקי, מספור רץ אוטומטי, מע״מ לפי סוג עוסק, הדפסה ישירה."
              cta="לחשבוניות"
            />
            <FeatureCard
              href="/coach"
              icon={<SparklesIcon className="size-6" />}
              label="איתן"
              title="ייעוץ AI מתמיד"
              desc="צ׳אט עם איתן — מאתר הוצאות שפספסת, מחיל כללי ניכוי, מקבל קבלות וקורא PDF, בעברית בגובה העיניים."
              cta="פתח שיחה"
            />
            <FeatureCard
              href="/about"
              icon={<PercentIcon className="size-6" />}
              label="תיעוד"
              title="איך זה בנוי"
              desc="תיעוד טכני: ארכיטקטורה, רשימת דפים, שדות הכוכב של 1301, סטאק טכנולוגי, וטוקני העיצוב — הכל בעמוד אחד."
              cta="לתיעוד הטכני"
            />
          </div>
        </div>
      </section>

      {/* Eitan strip — navy with glow + frosted avatar tile */}
      <section className="relative overflow-hidden bg-navy-900 py-16 md:py-20">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 80% at 88% 0%, rgba(64,126,140,.4) 0%, rgba(64,126,140,0) 60%)," +
              "radial-gradient(40% 70% at 4% 100%, rgba(200,181,154,.16) 0%, rgba(200,181,154,0) 60%)",
          }}
        />
        <div className="relative mx-auto max-w-screen-xl px-6">
          <div
            className="flex flex-col items-center gap-7 rounded-3xl border border-white/15 bg-white/5 p-8 text-center shadow-brand backdrop-blur-md md:flex-row md:p-10 md:text-start"
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.14)" }}
          >
            <div
              className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-brand backdrop-blur-md"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.2)" }}
            >
              <SparklesIcon className="size-8" />
            </div>
            <div className="flex-1">
              <span className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-aqua/80">
                <span className="size-1.5 rounded-full bg-brand" />
                העוזר החכם
              </span>
              <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-white md:text-3xl">
                איתן — השותף הדיגיטלי שלך
              </h2>
              <p className="mt-2 max-w-2xl leading-relaxed text-aqua/90">
                לא בוט, לא ״שאל רואה חשבון״ — איתן הוא מערכת AI שמחליפה את הרואה
                חשבון. מזהה הוצאות שפספסת, מחיל את כלל 30% לעבודה מהבית, שואל על
                תרומות לסעיף 46. שיחה בעברית, בגובה העיניים.
              </p>
            </div>
            <Link href="/coach" className={btn("gold", "md", "shrink-0")}>
              <SparklesIcon className="size-[18px]" /> פתח שיחה עם איתן
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-cream py-20 md:py-24">
        <div className="mx-auto max-w-screen-xl px-6">
          <SectionHeading
            eyebrow="התהליך"
            title="איך זה עובד"
            subtitle="ארבעה שלבים, דוח שלם"
          />

          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Step
              num="1"
              title="הכנסת נתונים"
              text="מעלה/ת קבצים (Excel, PDF) או ממלא/ת את האשף ב-7 שלבים. countme קורא חשבוניות, מזהה הוצאות, ובונה את הפרופיל הפיננסי שלך."
              icon={<UploadIcon className="size-6" />}
            />
            <Step
              num="2"
              title="חישוב אוטומטי"
              text="כל שדה בטופס 1301 מחושב לפי חוקי מס הכנסה הישראלי — ביטוח לאומי, קרן השתלמות, נקודות זיכוי, סעיף 46, כולם."
              icon={<SettingsIcon className="size-6" />}
            />
            <Step
              num="3"
              title="מסלול המילוי"
              text="איתן מלווה אותך ב-12 שלבים או שאת/ה מסתכל/ת בטבלת מומחה. כל ערך עם כפתור העתקה ישירה לטופס רשות המסים."
              icon={<ClipboardCheckIcon className="size-6" />}
            />
            <Step
              num="4"
              title="מעקב שוטף"
              text="הדשבורד מתעדכן בזמן אמת. הוצא חשבוניות מס לאורך השנה. countme יושב לידך כל השנה, לא רק בעונת הדוחות."
              icon={<BarChartIcon className="size-6" />}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-paper py-10">
        <div className="mx-auto max-w-screen-xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Logo size={24} />
              <span className="text-xs text-faint">· לעצמאים בישראל</span>
            </div>
            <div className="flex gap-5 text-xs text-muted">
              <Link href="/demo" className="transition-colors hover:text-brand-navy">
                דמו 1301
              </Link>
              <Link
                href="/dashboard"
                className="transition-colors hover:text-brand-navy"
              >
                דשבורד
              </Link>
              <Link href="/file" className="transition-colors hover:text-brand-navy">
                מילוי הדוח
              </Link>
              <Link
                href="/invoices"
                className="transition-colors hover:text-brand-navy"
              >
                חשבוניות
              </Link>
              <Link href="/coach" className="transition-colors hover:text-brand-navy">
                איתן
              </Link>
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
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-aqua-soft hover:text-brand-navy"
    >
      {children}
    </Link>
  );
}

/** Eyebrow + heading + subtitle block, matching the kit's section-label rhythm. */
function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-12 flex flex-col items-center text-center">
      <span className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-teal-600">
        <span className="size-1.5 rounded-full bg-brand" />
        {eyebrow}
      </span>
      <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-brand-navy md:text-[34px]">
        {title}
      </h2>
      <p className="mt-2.5 text-muted">{subtitle}</p>
    </div>
  );
}

function Stat({
  value,
  label,
  suffix,
}: {
  value: string;
  label: string;
  suffix?: string;
}) {
  return (
    <div
      className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center shadow-brand backdrop-blur-md"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.18)" }}
    >
      <div
        className="font-display text-xl font-extrabold text-white md:text-2xl"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
        {suffix && (
          <span className="ms-1 text-xs font-normal text-aqua/70">{suffix}</span>
        )}
      </div>
      <div className="mt-1 text-xs text-aqua/80">{label}</div>
    </div>
  );
}

function FeatureCard({
  href,
  icon,
  label,
  title,
  desc,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-4 rounded-3xl border border-line bg-paper/70 p-6 shadow-brand backdrop-blur-md transition-all hover:-translate-y-1 hover:border-brand-deep/40 hover:bg-paper"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.6)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-teal-100 text-brand-deep transition-colors group-hover:bg-brand-deep group-hover:text-white">
          {icon}
        </span>
        <span className="rounded-full bg-aqua-soft px-2.5 py-0.5 text-xs font-semibold text-teal-600">
          {label}
        </span>
      </div>
      <div>
        <h3 className="text-lg font-bold tracking-[-0.01em] text-brand-navy">
          {title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{desc}</p>
      </div>
      <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-brand-deep transition-colors group-hover:text-brand-navy">
        {cta} ←
      </span>
    </Link>
  );
}

function Step({
  num,
  title,
  text,
  icon,
}: {
  num: string;
  title: string;
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="relative flex flex-col gap-3 rounded-3xl border border-line bg-paper/70 p-6 shadow-brand backdrop-blur-md"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.6)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-navy text-sm font-bold text-white"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {num}
        </div>
        <span className="flex size-10 items-center justify-center rounded-2xl bg-teal-100 text-brand-deep">
          {icon}
        </span>
      </div>
      <h3 className="font-bold tracking-[-0.01em] text-brand-navy">{title}</h3>
      <p className="text-sm leading-relaxed text-muted">{text}</p>
    </div>
  );
}
