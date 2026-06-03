import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { ArrowLeftIcon } from "@/components/brand/icons";

export const metadata = {
  title: "תיעוד טכני · countme",
};

export default function AboutPage() {
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
          <p className="text-xs uppercase tracking-wider text-brand-deep/70 mb-1">תיעוד טכני</p>
          <h1 className="font-display text-3xl font-bold text-brand-navy">countme — מבנה הפרויקט</h1>
          <p className="mt-2 text-muted leading-relaxed">
            מסמך טכני למפתחים: ארכיטקטורה, זרימת נתונים, וכלים שמרכיבים את countme.
          </p>
        </div>

        {/* What */}
        <Section title="מה זה countme">
          <p>
            מלווה דיגיטלי לעצמאיים ישראלים לאורך כל שנת המס. מקבל חשבוניות והוצאות,
            מחשב אוטומטית כל שדה בטופס 1301, ונותן לך מסלול מילוי עם
            <strong className="text-brand-navy"> איתן</strong>, סוכן ה-AI שמתנהג כ-״אח חכם״.
          </p>
        </Section>

        {/* Stack */}
        <Section title="טכנולוגיות">
          <Table rows={[
            ["Framework", "Next.js 16 (App Router)"],
            ["UI", "React 19 + Tailwind CSS 4"],
            ["AI", "Anthropic Claude (Sonnet 4.6 / Haiku 4.5)"],
            ["Charts", "Recharts 3"],
            ["Excel", "exceljs (no CVE)"],
            ["Hosting", "Vercel"],
            ["DB", "— (Supabase מתוכנן)"],
            ["Lang", "Hebrew RTL only"],
          ]} />
        </Section>

        {/* Pages */}
        <Section title="דפים עיקריים">
          <ul className="space-y-2">
            <Bullet href="/setup" name="/setup" desc="אשף הכנסת נתונים — 7 שלבים, כולל העלאת דוחות ו-PDF" />
            <Bullet href="/demo" name="/demo" desc="תצוגת טופס 1301 הנאמנה ל-gov.il, עם InteractiveValue והעתק וצ׳אט" />
            <Bullet href="/file" name="/file" desc="Gateway: בחירת מסלול — מהיר (/demo) או מודרך (/file/guided)" />
            <Bullet href="/file/guided" name="/file/guided" desc="מסלול מודרך עם איתן ב-12 שלבים, עריכה inline + סינכרון אוטומטי" />
            <Bullet href="/dashboard" name="/dashboard" desc="דשבורד רווח והפסד עם סינון אוטומטי לפי תאריכים" />
            <Bullet href="/invoices" name="/invoices" desc="הנפקת חשבונית מס/קבלה (305) או קבלה (320) — תואם SHAAM" />
            <Bullet href="/coach" name="/coach" desc="צ׳אט עם איתן — אבחון, איתור הוצאות, סיכום שיחה" />
            <Bullet href="/business-expenses" name="/business-expenses" desc="הוצאות מוכרות לפי תחום עיסוק עם כללי ניכוי" />
          </ul>
        </Section>

        {/* Architecture */}
        <Section title="מבנה התיקיות">
          <pre className="bg-brand-navy text-paper rounded-xl p-4 text-xs leading-relaxed overflow-x-auto" dir="ltr">
{`src/
├── app/
│   ├── api/              # Anthropic streaming + upload parser
│   ├── setup/            # Persona wizard (7 steps)
│   ├── demo/             # gov.il-faithful preview
│   ├── file/             # Gateway + guided + (expert→demo)
│   ├── dashboard/        # P&L (Recharts) + Eitan insights
│   ├── invoices/         # List, new, [id] (with @media print)
│   ├── coach/            # Eitan chat
│   ├── business-expenses/ # Per-occupation expense profiles
│   └── about/            # ← This page
├── components/
│   ├── form-1301/        # FormPreview, InteractiveValue, CopyButton
│   ├── agent/            # Coach + chat panel
│   └── dashboard/        # PLChart, EitanInsights
└── lib/
    ├── persona.ts        # Type defs + readPersonaPath
    ├── setup-storage.ts  # localStorage + setPersonaPath
    ├── form-1301/        # Schema + 12 modules
    ├── calculators/      # 20 pure-function calculators
    ├── p-and-l/          # Auto-period detection from dates
    ├── invoice-generator/# nextInvoiceNumber, validate
    └── business-expenses/profiles.ts`}
          </pre>
        </Section>

        {/* Star fields */}
        <Section title="שדות הכוכב של 1301">
          <Table rows={[
            ["150", "הכנסות מיגיעה אישית — מהמחזור פחות הוצאות"],
            ["238", "מחזור שנתי (ללא מע״מ)"],
            ["030", "ביטוח לאומי עצמאי — 52% מההפרשה"],
            ["137", "קרן השתלמות לעצמאי"],
            ["020", "תושב/ת ישראל — נקודת זיכוי"],
            ["044", "עולה חדש/ה (3 שנים מעלייה)"],
            ["068", "חייל/ת משוחרר/ת (36 חודש משחרור)"],
            ["046", "זיכוי תרומות סעיף 46 — 35% מהתרומה"],
            ["042", "מקדמות ששולמו"],
          ]} />
        </Section>

        {/* Eitan */}
        <Section title="איתן — סוכן ה-AI">
          <p>
            איתן מופעל ב-<code>/api/coach</code> עם streaming SSE ו-prompt caching על ה-system prompt.
            יש לו שלושה מצבים:
          </p>
          <ul className="space-y-1.5 me-4 list-disc">
            <li><strong>eitan</strong> — שיחה מלאה (default). מזהה אוטומטית את הצורך — ביקורת לפני הגשה או גילוי הוצאות.</li>
            <li><strong>dashboard-insights</strong> — 2-3 תצפיות קצרות לדשבורד.</li>
          </ul>
          <p>
            כללים מוטמעים: 30% משרד ביתי, 35% תרומות סעיף 46, מבחן ייצור הכנסה,
            וכלל זהב חדש — לא להמליץ על מסלול עוסק זעיר אם הוצאות &gt; 30% מהמחזור (תיקון 257, 2024).
          </p>
        </Section>

        {/* Dev */}
        <Section title="הרצה מקומית">
          <pre className="bg-brand-navy text-paper rounded-xl p-4 text-xs leading-relaxed overflow-x-auto" dir="ltr">
{`npm install
echo "ANTHROPIC_API_KEY=sk-..." > .env.local
npm run dev          # http://localhost:3000

# Type check + build
npm run build`}
          </pre>
        </Section>

        {/* Brand tokens */}
        <Section title="טוקני עיצוב">
          <Table rows={[
            ["--color-cream", "#F1EFEA — רקע כללי"],
            ["--color-brand-navy", "#083A4F — CTA ראשי"],
            ["--color-brand-deep", "#407E8C — אינטראקציה ו-teal"],
            ["--color-success", "#4A7C59 — פעולות חיוביות"],
            ["--color-info", "#DCE9EB — בועות צ׳אט"],
            ["--color-alert", "#C05B45 — אזהרות"],
          ]} />
          <p className="text-xs text-faint mt-2">
            כל token יוצר אוטומטית את ה-utilities של Tailwind 4 (<code>bg-brand-navy</code>, <code>text-success</code>, וכו׳).
            <strong className="text-brand-navy"> חריג:</strong> <code>form-preview.tsx</code> משתמש בפאלטה של gov.il (hex hardcoded) — לא לשנות.
          </p>
        </Section>

        <div className="rounded-2xl border border-brand-deep/20 bg-info/40 p-5 text-center">
          <p className="font-medium text-brand-navy mb-3">רוצה לראות את זה בפעולה?</p>
          <Link href="/setup" className={btn("primary", "sm")}>
            התחל/י עם countme
            <ArrowLeftIcon className="size-3.5 rotate-180" />
          </Link>
        </div>

        <p className="text-center text-xs text-faint">
          countme · נבנה במסגרת Momentum — אקסלרטור סטודנטים ישראלי
        </p>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-paper border border-line shadow-brand p-6">
      <h2 className="font-display text-xl font-bold text-brand-navy mb-3">{title}</h2>
      <div className="space-y-2 text-sm text-ink leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([key, val], i) => (
          <tr key={i} className={i % 2 === 0 ? "bg-cream" : "bg-paper"}>
            <td className="px-3 py-2 font-mono text-brand-deep text-xs whitespace-nowrap align-top w-1/3">
              {key}
            </td>
            <td className="px-3 py-2 text-muted">{val}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Bullet({ href, name, desc }: { href: string; name: string; desc: string }) {
  return (
    <li className="flex items-start gap-3">
      <Link
        href={href}
        className="font-mono text-xs text-brand-deep hover:underline whitespace-nowrap mt-0.5 shrink-0"
      >
        {name}
      </Link>
      <span className="text-muted">{desc}</span>
    </li>
  );
}
