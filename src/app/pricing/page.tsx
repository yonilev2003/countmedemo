import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { Reveal } from "@/components/brand/motion";
import { CheckIcon, SparklesIcon } from "@/components/brand/icons";
import { TRACKS, type Feature } from "@/lib/billing/tracks";
import { isBillingEnabled } from "@/lib/billing/entitlement";

export const metadata: Metadata = {
  title: "מחירים — CountMe",
  description: "המסלולים של CountMe — חינם בזמן הבטא, מסלול מלא לכשנפתח לתשלום.",
};

/**
 * /pricing — public plan comparison built on the billing seam (TRACKS).
 * Checkout is a no-op while BILLING_ENABLED is off (free beta) — the CTA reflects
 * that. When billing turns on, the Pro CTA links to the (gated) checkout route.
 *
 * NOTE: ₪39/mo is a PLACEHOLDER hypothesis (docs/gtm/pricing.md) — not final.
 */
const PRO_PRICE_MONTHLY = 39; // TODO(GTM): validate in beta — see docs/gtm/pricing.md

const FEATURE_HE: Record<Feature, string> = {
  form_1301_full: "מילוי מלא של טופס 1301 + העתקה בלחיצה",
  form_1219_full: "הצהרת הון (טופס 1219) מלאה",
  deduction_finder: "מאתר ההוצאות וההטבות של איתן",
  coach_unlimited: "שיחות ללא הגבלה עם איתן",
  multi_year: "כל שנות המס שלך במקום אחד",
  accountant_export: "חבילת מסמכים מסודרת לרואה החשבון",
};

const FREE_PERKS = [
  "כל מועדי הדיווח, המע״מ והמקדמות",
  "התראות על תקרות וסיכונים",
  "דשבורד הכנסות והוצאות",
];

export default function PricingPage() {
  const billingLive = isBillingEnabled();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-20 pt-8 sm:px-6 sm:pt-12">
      <Reveal>
        <header className="mb-10 text-center">
          <Logo className="mx-auto mb-5" />
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
            תשלום פשוט, בלי הפתעות
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted">
            {billingLive
              ? "בחרו את המסלול שמתאים לכם. אפשר לבטל בכל רגע."
              : "בזמן הבטא הכול פתוח וחינם. כשנפתח לתשלום — תוכלו להמשיך במסלול המלא."}
          </p>
        </header>
      </Reveal>

      <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
        {/* Free */}
        <Reveal>
          <section className="flex h-full flex-col rounded-3xl border border-line bg-paper p-7 shadow-brand">
            <h2 className="text-lg font-bold text-brand-navy">{TRACKS.free.he}</h2>
            <div className="mt-3 font-display text-4xl font-extrabold text-brand-navy">
              ₪0
              <span className="text-base font-semibold text-faint"> / לחודש</span>
            </div>
            <p className="mt-1 text-sm text-muted">מנועי ההזכרה שמחזיקים אתכם בזמן.</p>
            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {FREE_PERKS.map((f) => (
                <FeatureRow key={f} label={f} />
              ))}
            </ul>
            <Link href="/home" className={btn("secondary", "md", "mt-7 w-full")}>
              התחילו חינם
            </Link>
          </section>
        </Reveal>

        {/* Pro */}
        <Reveal delay={0.08}>
          <section className="relative flex h-full flex-col rounded-3xl border-2 border-brand-deep bg-brand-navy p-7 text-white shadow-brand">
            <span className="absolute end-6 top-6 inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-xs font-bold text-brand-navy">
              <SparklesIcon className="size-3.5" />
              הכי שלם
            </span>
            <h2 className="text-lg font-bold text-brand">{TRACKS.pro.he}</h2>
            <div className="mt-3 font-display text-4xl font-extrabold">
              ₪{PRO_PRICE_MONTHLY}
              <span className="text-base font-semibold text-aqua/70"> / לחודש</span>
            </div>
            <p className="mt-1 text-sm text-aqua/80">הדוח כולו, מקצה לקצה, עם איתן ללא הגבלה.</p>
            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {TRACKS.pro.features.map((f) => (
                <FeatureRow key={f} label={FEATURE_HE[f]} dark />
              ))}
            </ul>
            {billingLive ? (
              <Link href="/checkout" className={btn("gold", "md", "mt-7 w-full")}>
                למסלול המלא
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className={btn("gold", "md", "mt-7 w-full opacity-70")}
                title="התשלום ייפתח בסיום הבטא"
              >
                חינם בזמן הבטא
              </button>
            )}
          </section>
        </Reveal>
      </div>

      {!billingLive && (
        <p className="mt-8 text-center text-xs text-faint">
          התמחור מוצג להמחשה. המחיר הסופי ייקבע לקראת פתיחת התשלום.
        </p>
      )}
    </main>
  );
}

function FeatureRow({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-[14px] leading-snug">
      <CheckIcon
        className={`mt-0.5 size-4 shrink-0 ${dark ? "text-brand" : "text-success"}`}
      />
      <span className={dark ? "text-aqua/90" : "text-ink"}>{label}</span>
    </li>
  );
}
