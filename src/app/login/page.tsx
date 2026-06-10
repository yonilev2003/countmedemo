import type { Metadata } from "next";
import { LogoMark } from "@/components/brand/logo";
import { AlertTriangleIcon } from "@/components/brand/icons";
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
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const hasError = typeof params.error !== "undefined";

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-brand-navy px-6 py-16">
      {/* gradient backdrop — same auth aesthetic as the landing hero */}
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

      {/* card */}
      <div
        className="relative w-full max-w-md rounded-3xl border border-white/15 bg-white/5 p-8 text-center shadow-brand backdrop-blur-md md:p-10"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.14)" }}
      >
        <div className="mb-6 flex flex-col items-center gap-4">
          <span
            className="flex size-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md"
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.2)" }}
          >
            <LogoMark size={32} className="text-brand" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
              ברוכים הבאים ל-countme
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-aqua/90">
              האח החכם שלך לדוח השנתי. התחברו כדי להתחיל — הנתונים שלכם נשמרים
              בצורה מאובטחת.
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

        <p className="mt-6 text-xs leading-relaxed text-aqua/70">
          בהתחברות אתם מאשרים את תנאי השימוש ומדיניות הפרטיות של countme.
        </p>
      </div>
    </main>
  );
}
