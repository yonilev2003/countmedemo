import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export const metadata = {
  title: "קישור חסר · CountMe",
  robots: { index: false, follow: false },
};

/**
 * /d (no token) — a shared-document link always carries a token as
 * /d/{token}; landing here bare means the id was lost along the way
 * (a messaging app's own shortened link-preview text was tapped/copied
 * instead of the real link, a client cut the URL, etc — investigated
 * 2026-08-18, the token minting + verification round-trip itself is
 * correct in both local testing and production runtime logs). A generic
 * framework 404 gave no next step; this explains it and offers one.
 */
export default function BareDocLinkPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-7 text-center shadow-brand">
        <div className="mx-auto mb-4 flex justify-center">
          <Logo size={26} />
        </div>
        <h1 className="text-lg font-bold text-brand-navy">חסר חלק מהקישור</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          קישור לצפייה במסמך תמיד מגיע עם מזהה בסוף הכתובת, וכאן הוא חסר —
          כנראה שהועתק רק חלק מהקישור. אפשר לבקש מהשולח/ת לשלוח שוב את ההודעה
          המלאה, או ללחוץ ישירות על הקישור בתוכה במקום להעתיק אותו.
        </p>
        <Link href="/" className="mt-5 inline-block text-sm font-semibold text-brand-deep underline">
          לדף הבית של countme
        </Link>
      </div>
    </div>
  );
}
