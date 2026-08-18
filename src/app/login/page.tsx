import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { PROXY_USER_ID_HEADER } from "@/lib/supabase/proxy";
import { LogoMark } from "@/components/brand/logo";
import {
  AlertTriangleIcon,
  ShieldIcon,
  SparklesIcon,
  FileTextIcon,
} from "@/components/brand/icons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "התחברות — countme",
  description: "התחברות ל-countme עם חשבון Google.",
};

/**
 * Sign-in screen. Server Component so it can read the `error` query param via
 * the page `searchParams` prop (Next 16: a Promise) without needing a Suspense
 * boundary around useSearchParams. The actual OAuth button lives in the client
 * <LoginForm/>.
 *
 * Layout follows the "CountMe Auth" handoff: a frosted-glass card over a
 * navy-teal gradient, paired on wide screens with a brand panel that carries
 * the product promise ("אנחנו סופרים, אתם עובדים").
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const hasError = typeof params.error !== "undefined";

  // Already signed in? Skip the login screen entirely — this was the "why do
  // I have to log in twice?" report (Yoni, 16/08): an authenticated user
  // landing on /login saw the Google button again instead of the app. Honors
  // a valid same-origin `next` target, same open-redirect guard as the
  // OAuth callback.
  //
  // The proxy (updateSession) already ran `auth.getUser()` for this exact
  // request and stamped the result onto PROXY_USER_ID_HEADER — read that
  // instead of a second Supabase auth round-trip here.
  const userId = (await headers()).get(PROXY_USER_ID_HEADER);
  if (userId) {
    const nextParam = typeof params.next === "string" ? params.next : null;
    redirect(
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/dashboard",
    );
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-brand-navy px-6 py-12 md:py-16">
      {/* gradient backdrop — radial aqua + teal + gold glows over navy */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(680px 460px at 82% 2%, rgba(91,103,232,.45) 0%, rgba(91,103,232,0) 60%)," +
            "radial-gradient(720px 520px at 6% 104%, rgba(12,72,96,.85) 0%, rgba(12,72,96,0) 60%)," +
            "radial-gradient(520px 380px at 98% 96%, rgba(245,169,63,.24) 0%, rgba(245,169,63,0) 60%)," +
            "linear-gradient(168deg, #0d4a62 0%, var(--color-brand-navy) 52%, var(--color-navy-900) 100%)",
        }}
      />
      {/* soft glass wash to deepen the base */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(192,213,214,.10) 0%, rgba(8,40,55,.06) 44%, rgba(5,30,40,.42) 100%)," +
            "radial-gradient(140% 70% at 80% 4%, rgba(192,213,214,.16), rgba(192,213,214,0) 55%)",
        }}
      />

      <div className="relative grid w-full max-w-5xl items-center gap-12 md:grid-cols-2 md:gap-16">
        {/* brand panel — hidden on small screens, like the handoff web layout */}
        <div className="hidden text-white md:block">
          <div className="mb-7 flex items-center gap-3">
            <LogoMark size={34} className="text-brand" />
            <span className="font-display text-2xl font-extrabold tracking-tight text-white">
              CountMe
            </span>
          </div>
          <h2
            className="font-display text-4xl font-extrabold leading-[1.18] tracking-[-0.02em]"
            style={{ textShadow: "0 2px 18px rgba(5,30,40,.45)" }}
          >
            השקט הנפשי שמגיע
            <br />
            לעצמאים שלך.
          </h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-aqua/90">
            כל מועדי הדיווח, המע״מ והמקדמות — במקום אחד, בזמן. אנחנו סופרים, אתם
            עובדים.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-aqua/90 backdrop-blur-md">
            <ShieldIcon className="size-4 text-brand" />
            הנתונים שלכם נשמרים בצורה מאובטחת
          </div>
        </div>

        {/* glass auth card */}
        <div
          className="relative mx-auto w-full max-w-md rounded-[26px] border border-white/15 bg-white/[0.07] p-8 text-center shadow-brand backdrop-blur-2xl md:p-10"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.14)" }}
        >
          {/* logo lockup — shown inside the card on mobile where the panel is hidden */}
          <div className="mb-6 flex flex-col items-center gap-4">
            <span
              className="flex size-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.2)" }}
            >
              <LogoMark size={32} className="text-brand" />
            </span>
            <div>
              <h1 className="font-display text-[29px] font-extrabold leading-tight tracking-tight text-white">
                ברוכים השבים ל
                <span className="text-brand">CountMe</span>
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-aqua/90">
                האח החכם שלך לדוח השנתי. התחברו כדי להתחיל.
              </p>
            </div>
          </div>

          {hasError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-2xl border border-alert/40 bg-alert/15 px-4 py-3 text-start text-sm text-white"
            >
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-alert" />
              <span>
                ההתחברות לא הושלמה. נסו שוב, ואם הבעיה חוזרת ודאו שאתם מתחברים עם
                חשבון Google תקין.
              </span>
            </div>
          )}

          <LoginForm />

          {/* What happens next — quiet reassurance that deepens first-time trust */}
          <ul className="mt-6 space-y-2.5 text-start">
            {[
              {
                icon: <SparklesIcon className="size-4 text-brand" />,
                text: "מתחברים פעם אחת — בכל כניסה הבאה נוחתים ישר על קיצורי הדרך",
              },
              {
                icon: <FileTextIcon className="size-4 text-brand" />,
                text: "אנחנו ממלאים מראש את הדוח השנתי — אתם רק מאשרים",
              },
              {
                icon: <ShieldIcon className="size-4 text-brand" />,
                text: "עובדות, לא עצות — והנתונים שלכם נשמרים מאובטחים",
              },
            ].map((item) => (
              <li
                key={item.text}
                className="flex items-start gap-2.5 text-[13px] leading-snug text-aqua/85"
              >
                <span className="mt-0.5 shrink-0">{item.icon}</span>
                {item.text}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-xs leading-relaxed text-aqua/70">
            בהתחברות אתם מאשרים את{" "}
            <a href="/terms" className="underline hover:text-white">
              תנאי השימוש
            </a>{" "}
            ואת{" "}
            <a href="/privacy" className="underline hover:text-white">
              מדיניות הפרטיות
            </a>{" "}
            של countme.
          </p>
        </div>
      </div>
    </main>
  );
}
