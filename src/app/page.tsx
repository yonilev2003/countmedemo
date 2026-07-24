import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo, LogoMark } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { BRAND_COLORS } from "@/components/brand/colors";
import {
  SparklesIcon,
  ReceiptIcon,
  FileTextIcon,
  ClipboardCheckIcon,
  BarChartIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  MicIcon,
} from "@/components/brand/icons";

export default async function Home() {
  // Session-aware chrome: a logged-in user clicking the logo/"home" must NOT
  // see anonymous "כניסה" chrome (reads as a phantom logout — Yoni, 19/07).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col bg-paper">
      {/* ===== NAV ===== */}
      <header className="sticky top-0 z-50 border-b border-line bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-[70px] max-w-screen-xl items-center justify-between gap-6 px-6">
          <Link href="/" aria-label="CountMe — דף הבית">
            <Logo size={26} />
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            <NavAnchor href="#shortcuts">פעולות מהירות</NavAnchor>
            <NavAnchor href="#eitan">
              <SparklesIcon className="size-4 text-beige-600" /> איתן
            </NavAnchor>
            <NavAnchor href="#social">קהילה</NavAnchor>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-[10px] px-[13px] py-2 text-[14.5px] font-semibold text-muted transition-colors hover:bg-cream hover:text-brand-navy"
            >
              מחירים
            </Link>
          </nav>
          <div className="flex items-center gap-2.5">
            {user ? (
              <Link href="/dashboard" className={btn("primary", "sm")}>
                לאזור האישי
                <ArrowLeftIcon className="size-[17px]" />
              </Link>
            ) : (
              <>
                <Link href="/login" className={btn("secondary", "sm")}>
                  כניסה
                </Link>
                <Link href="/setup" className={btn("primary", "sm")}>
                  התחילו עכשיו
                  <ArrowLeftIcon className="size-[17px]" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden text-center text-white">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(680px 460px at 82% 2%, rgba(64,126,140,.55) 0%, rgba(64,126,140,0) 60%)," +
              "radial-gradient(720px 520px at 6% 104%, rgba(12,72,96,.85) 0%, rgba(12,72,96,0) 60%)," +
              "radial-gradient(520px 380px at 98% 96%, rgba(165,141,102,.28) 0%, rgba(165,141,102,0) 60%)," +
              "linear-gradient(168deg, #0d4a62 0%, var(--color-brand-navy) 52%, var(--color-navy-900) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 70% at 50% -8%, rgba(255,255,255,.06), transparent 60%)",
          }}
        />
        <div className="relative z-[2] mx-auto flex max-w-[920px] flex-col items-center px-8 pb-[88px] pt-[78px]">
          <span className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-aqua/25 bg-aqua/10 px-[18px] py-[9px] text-[13.5px] font-semibold text-aqua">
            <span
              className="size-[7px] rounded-full bg-brand"
              style={{ boxShadow: "0 0 0 4px rgba(200,181,154,.2)" }}
            />
            מוצר חדש לעצמאיות ולעצמאים בישראל
          </span>
          <h1 className="mb-11 font-display text-[clamp(44px,7.2vw,86px)] font-extrabold leading-[1.06] tracking-[-0.035em]">
            לשחרר את העצמאים
            <span className="block pb-[0.08em] text-brand">מהפחד</span>
          </h1>
          <p className="mb-[38px] max-w-[620px] text-[clamp(16px,2.1vw,20px)] leading-[1.62] text-aqua/[0.82]">
            שקט נפשי לעצמאים. כל מועדי הדיווח והבירוקרטיה — תחת שליטה מלאה במקום
            אחד, בזמן. כאן כדי להוריד ממך את הלחץ ולהחזיר לך{" "}
            <b className="font-semibold text-white">את הראש השקט לעסק</b>.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-[18px]">
            <Link
              href="/setup"
              className={btn("gold", "md", "px-[30px] py-[15px] text-base")}
            >
              התחל/י עכשיו
              <ArrowLeftIcon className="size-[18px]" />
            </Link>
          </div>
        </div>
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent)",
          }}
        />
      </section>

      {/* ===== SHORTCUTS ===== */}
      <section
        id="shortcuts"
        className="border-y border-line bg-cream py-24 md:py-[96px]"
      >
        <div className="mx-auto max-w-screen-xl px-8">
          <SectionHead
            eyebrow="פעולות מהירות"
            title="כל מה שצריך, בלחיצה אחת"
            subtitle="הפקת מסמכים וקיצורים מהירים, בלי לחפש, בלי בלגן. הכול מחכה לך במסך הבית."
          />
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            <ShortcutCard
              href="/invoices/new?type=receipt"
              tone="teal"
              icon={<ReceiptIcon className="size-[26px]" />}
              title="קבלה"
              desc="תיעוד תקבול שהתקבל, תוך שניות."
              kbd="⌘ R"
            />
            <ShortcutCard
              href="/invoices/new?type=business-account"
              tone="beige"
              icon={<FileTextIcon className="size-[26px]" />}
              title="חשבון עסקה"
              desc="דרישת תשלום מלקוח, מעוצבת ומסודרת."
              kbd="⌘ I"
            />
            <ShortcutCard
              href="/invoices/new?type=quote"
              tone="green"
              icon={<ClipboardCheckIcon className="size-[26px]" />}
              title="הצעת מחיר"
              desc="הצעה ללקוח עוד לפני שנסגרת העסקה."
              kbd="⌘ Q"
            />
            <ShortcutCard
              href="/dashboard"
              tone="navy"
              icon={<BarChartIcon className="size-[26px]" />}
              title="לוח הבקרה"
              desc="הכנסות, הוצאות ומי לא שילם — במסך אחד."
              kbd="⌘ D"
            />
          </div>
        </div>
      </section>

      {/* ===== EITAN ===== */}
      <section id="eitan-section" className="bg-paper py-24 md:py-[96px]">
        <div className="mx-auto max-w-screen-xl px-8">
          <SectionHead
            eyebrow="איתן"
            title="שאלה של שנייה, תשובה בגובה העיניים"
            subtitle="מה זה מקדמות? מה מוכר כהוצאה? מי עוד לא שילם לי? איתן, הנציג הדיגיטלי שלנו, עונה בשפה של בני אדם — צמוד לנתונים האמיתיים של העסק."
          />
          <div
            id="eitan"
            className="mx-auto grid max-w-xl grid-cols-1 items-center gap-8"
          >
            {/* Eitan chat preview */}
            <div className="flex flex-col gap-[15px]">
              <div className="mb-0.5 flex items-center gap-[13px]">
                <span className="flex size-14 items-center justify-center rounded-full border-2 border-beige-100 bg-beige-100 text-brand-deep">
                  <SparklesIcon className="size-7" />
                </span>
                <div>
                  <div className="flex items-center gap-[7px] text-lg font-extrabold text-brand-navy">
                    איתן
                    <CheckCircleIcon className="size-4 text-brand-deep" />
                  </div>
                  <div className="text-[13.5px] font-semibold text-teal-600">
                    הנציג הדיגיטלי שלנו · מחובר
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <ChatBubble from="bot">
                  שני חשבונות עסקה עדיין פתוחים החודש —{" "}
                  <b className="font-bold">5,900 ₪ בחוץ</b>.
                </ChatBubble>
                <ChatBubble from="me">מה עושים עם זה?</ChatBubble>
                <ChatBubble from="bot">
                  <span className="mb-[7px] inline-flex items-center gap-1.5 rounded-lg bg-teal-100 px-[9px] py-[3px] text-[12.5px] font-bold text-teal-600">
                    <CheckCircleIcon className="size-[13px]" />
                    תזכורת מוכנה לשליחה
                  </span>
                  <br />
                  הכנתי נוסח מנומס לוואטסאפ — רואים אותו, מאשרים, ונשלח. ברגע
                  שהתשלום נכנס, הקבלה מחכה בלחיצה.
                </ChatBubble>
              </div>

              <div className="mt-1 flex items-center gap-2.5">
                <Link
                  href="/coach"
                  className="flex-1 rounded-full border border-line bg-paper px-[18px] py-[13px] text-sm text-faint transition-colors hover:border-brand-deep hover:text-teal-600"
                >
                  כתבו לאיתן…
                </Link>
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-brand-navy">
                  <MicIcon className="size-[21px]" />
                </span>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Link href="/setup" className={btn("primary")}>
              התחילו עכשיו
              <ArrowLeftIcon className="size-[18px]" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SOCIAL (marquee) ===== */}
      <section
        id="social"
        className="relative overflow-hidden bg-brand-navy py-24 text-white md:py-[96px]"
      >
        <div className="mx-auto max-w-screen-xl px-8">
          <SectionHead
            eyebrow="תרחישים"
            title="מה עושים עם countme"
            subtitle="דוגמאות שימוש מתוך המוצר — להמחשה. לא ציטוטי לקוחות."
            dark
          />
        </div>
        <div
          className="relative"
          style={{
            WebkitMaskImage:
              "linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)",
            maskImage:
              "linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)",
          }}
        >
          <div className="cm-marquee flex w-max gap-5">
            {[...SCENARIOS, ...SCENARIOS].map((t, i) => (
              <PostCard key={i} {...t} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="bg-paper py-24 md:py-[96px]">
        <div className="mx-auto max-w-screen-xl px-8">
          <div
            className="relative overflow-hidden rounded-[30px] px-10 py-[72px] text-center text-white"
            style={{
              background:
                "radial-gradient(600px 360px at 80% 0%, rgba(165,141,102,.32), transparent 60%), linear-gradient(160deg, #0c4860, var(--color-navy-900))",
            }}
          >
            <h2 className="mb-4 font-display text-[clamp(30px,4.4vw,48px)] font-extrabold leading-[1.08] tracking-[-0.025em]">
              מוכנים להוריד את הלחץ
              <span className="text-brand"> ולהחזיר את הראש לעסק?</span>
            </h2>
            <p className="mx-auto mb-[34px] max-w-[520px] text-lg text-aqua/[0.82]">
              פתחו חשבון חינם ותנו ל-countme לספור — כדי שאתם תוכלו לעבוד.
            </p>
            <div className="flex flex-wrap justify-center gap-[18px]">
              <Link
                href="/setup"
                className={btn("gold", "md", "px-8 py-[15px] text-base")}
              >
                פתחו חשבון חינם
              </Link>
              <Link
                href="/coach"
                className={btn(
                  "secondary",
                  "md",
                  "border-white/30 bg-white/10 px-8 py-[15px] text-base text-white backdrop-blur-md hover:border-white/50 hover:bg-white/20",
                )}
              >
                <SparklesIcon className="size-[18px]" /> תכירו את איתן
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-navy-900 py-[54px] text-aqua/[0.62]">
        <div className="mx-auto max-w-screen-xl px-8">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5">
                <LogoMark size={26} className="text-brand" />
                <span className="font-display text-[22px] font-extrabold tracking-tight text-white">
                  CountMe
                </span>
              </div>
              <p className="mt-3 max-w-[280px] text-[13.5px] leading-relaxed">
                השקט הנפשי שמגיע לעצמאים. אנחנו סופרים, אתם עובדים.
              </p>
            </div>
            <div className="flex flex-wrap gap-16">
              <FooterCol
                heading="מוצר"
                links={[
                  { label: "דשבורד", href: "/dashboard" },
                  { label: "חשבוניות וקבלות", href: "/invoices" },
                  { label: "מי לא שילם לי", href: "/receivables" },
                  { label: "מחירים", href: "/pricing" },
                  { label: "איתן", href: "/coach" },
                ]}
              />
              <FooterCol
                heading="חברה"
                links={[
                  { label: "אודות", href: "/about" },
                ]}
              />
              <FooterCol
                heading="משפטי"
                links={[
                  { label: "תנאי שימוש", href: "/terms" },
                  { label: "פרטיות", href: "/privacy" },
                ]}
              />
            </div>
          </div>
          <div className="mt-10 flex flex-wrap justify-between gap-2.5 border-t border-aqua/[0.14] pt-[22px] text-[13px]">
            <span>© {new Date().getFullYear()} countme · לעצמאים בישראל</span>
            <span>נבנה בישראל</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavAnchor({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-[10px] px-[13px] py-2 text-[14.5px] font-semibold text-muted transition-colors hover:bg-cream hover:text-brand-navy"
    >
      {children}
    </a>
  );
}

/** Eyebrow + heading + subtitle block, matching the mockup's `.sec-head`. */
function SectionHead({
  eyebrow,
  title,
  subtitle,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  dark?: boolean;
}) {
  return (
    <div className="mx-auto mb-14 max-w-[680px] text-center">
      <span
        className={
          "mb-3.5 inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.04em] " +
          (dark ? "text-aqua" : "text-teal-600")
        }
      >
        <span className="h-0.5 w-5 rounded-sm bg-brand" />
        {eyebrow}
      </span>
      <h2
        className={
          "font-display text-[clamp(30px,4vw,44px)] font-extrabold leading-[1.1] tracking-[-0.025em] " +
          (dark ? "text-white" : "text-brand-navy")
        }
      >
        {title}
      </h2>
      <p
        className={
          "mt-3.5 text-[17px] leading-relaxed " +
          (dark ? "text-aqua/80" : "text-muted")
        }
      >
        {subtitle}
      </p>
    </div>
  );
}

const SHORTCUT_TONES = {
  teal: "bg-teal-100 text-brand-deep",
  beige: "bg-beige-100 text-beige-600",
  green: "bg-success-light text-success",
  navy: "bg-[#E3EAEC] text-brand-navy",
} as const;

function ShortcutCard({
  href,
  tone,
  icon,
  title,
  desc,
  kbd,
}: {
  href: string;
  tone: keyof typeof SHORTCUT_TONES;
  icon: React.ReactNode;
  title: string;
  desc: string;
  kbd: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-[20px] border border-line bg-paper p-[26px] shadow-brand-sm transition-all hover:-translate-y-1 hover:border-aqua hover:shadow-brand"
    >
      <span
        className={
          "mb-[18px] flex size-[54px] items-center justify-center rounded-2xl " +
          SHORTCUT_TONES[tone]
        }
      >
        {icon}
      </span>
      <h3 className="mb-[5px] text-lg font-bold text-brand-navy">{title}</h3>
      <p className="text-sm leading-snug text-muted">{desc}</p>
      <span className="mt-4 inline-block w-fit rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-600">
        {kbd}
      </span>
    </Link>
  );
}

function FormRow({
  code,
  label,
  sub,
  value,
  highlight = false,
}: {
  code: string;
  label: string;
  sub: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "mt-[3px] grid grid-cols-[54px_1fr_122px] items-center gap-3.5 rounded-xl p-3 first:mt-0 " +
        (highlight
          ? "bg-beige-100 shadow-[inset_0_0_0_1.5px_var(--color-brand)]"
          : "")
      }
    >
      <span
        className="rounded-lg bg-teal-100 py-1.5 text-center text-[13px] font-extrabold text-teal-600"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {code}
      </span>
      <span className="text-[14.5px] font-semibold text-ink">
        {label}
        <small className="mt-px block text-xs font-medium text-faint">
          {sub}
        </small>
      </span>
      <span
        className={
          "text-start text-base font-bold " +
          (highlight ? "text-beige-600" : "text-brand-navy")
        }
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
    </div>
  );
}

function ChatBubble({
  from,
  children,
}: {
  from: "bot" | "me";
  children: React.ReactNode;
}) {
  if (from === "me") {
    return (
      <div className="max-w-[94%] self-end rounded-[18px] rounded-ee-[5px] bg-brand-navy px-4 py-[13px] text-[15px] leading-relaxed text-white">
        {children}
      </div>
    );
  }
  return (
    <div className="max-w-[94%] self-start rounded-[18px] rounded-es-[5px] border border-line bg-paper px-4 py-[13px] text-[15px] leading-relaxed text-ink">
      {children}
    </div>
  );
}

// Illustrative product scenarios — NOT customer testimonials. The previous
// version showed fictional named people with social handles and a specific
// refund figure; replaced 2026-07-02 (misleading-advertising exposure, product
// decision). Roles only, no names, capability statements the product actually
// delivers. Copy: DRAFT — NEEDS LEGAL REVIEW.
type Scenario = {
  initial: string;
  avatarColor: string;
  role: string;
  tag: string;
  quote: string;
  body: React.ReactNode;
};

const SCENARIOS: Scenario[] = [
  {
    initial: "ק",
    avatarColor: BRAND_COLORS.teal,
    role: "עצמאית בתחום הקריאייטיב",
    tag: "עוסקת פטורה",
    quote: "מעקב תקרת עוסק פטור בזמן אמת",
    body: (
      <>
        התראה לפני שמתקרבים לתקרה — כולל כמה נשאר עד המעבר למורשה.
      </>
    ),
  },
  {
    initial: "י",
    avatarColor: BRAND_COLORS.navy,
    role: "יועץ עסקי עצמאי",
    tag: "עוסק מורשה",
    quote: "מאתר ניכויים וזיכויים לפי הנתונים",
    body: (
      <>
        קרן השתלמות, ביטוח לאומי, תרומות — כל סעיף עם הנוסחה והמקור שלו.
      </>
    ),
  },
  {
    initial: "מ",
    avatarColor: BRAND_COLORS.beige600,
    role: "מפתחת פרילנסרית",
    tag: "טופס 1301",
    quote: "כל שדה בטופס — עם חישוב ומקור",
    body: (
      <>
        בלי קודים סתומים: לוחצים על ערך ורואים בדיוק איך הוא חושב.
      </>
    ),
  },
  {
    initial: "ע",
    avatarColor: BRAND_COLORS.success,
    role: "עוסק זעיר",
    tag: "לוח מועדים",
    quote: "כל המועדים במקום אחד",
    body: <>מקדמות, ביטוח לאומי, דוח שנתי — עם תזכורות ליומן.</>,
  },
  {
    initial: "א",
    avatarColor: BRAND_COLORS.teal600,
    role: "מטפלת עצמאית",
    tag: "צ׳אט איתן",
    quote: "שאלה בעברית, תשובה עם מספרים",
    body: (
      <>
        עובדות מתוך הנתונים שלך — בגובה העיניים, בלי ז׳רגון.
      </>
    ),
  },
];

function PostCard({
  initial,
  avatarColor,
  role,
  tag,
  quote,
  body,
}: Scenario) {
  return (
    <div className="w-[336px] shrink-0 overflow-hidden rounded-[20px] bg-paper text-ink shadow-brand">
      <div className="flex items-center gap-[11px] px-4 py-3.5">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold text-white"
          style={{ background: avatarColor }}
        >
          {initial}
        </span>
        <div>
          <div className="text-sm font-bold text-brand-navy">{role}</div>
          <div className="text-xs text-faint">{tag}</div>
        </div>
      </div>
      <div className="flex h-[180px] items-center justify-center bg-cream px-[22px] text-center">
        <p className="text-[19px] font-extrabold leading-[1.3] tracking-[-0.01em] text-brand-navy">
          {quote}
        </p>
      </div>
      <div className="px-4 pb-[18px] pt-3.5">
        <p className="text-[13.5px] leading-snug text-ink">{body}</p>
      </div>
    </div>
  );
}

function FooterCol({
  heading,
  links,
}: {
  heading: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-white">
        {heading}
      </h4>
      {links.map((l) => (
        <Link
          key={l.label}
          href={l.href}
          className="mb-[9px] block text-sm transition-colors hover:text-white"
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
