import Link from "next/link";
import { btn } from "@/components/brand/button";
import { Logo } from "@/components/brand/logo";

export const metadata = {
  title: "העמוד לא נמצא · countme",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-7 text-center shadow-brand">
        <div className="mx-auto mb-5 flex justify-center">
          <Logo size={28} />
        </div>
        <p className="font-display text-5xl font-extrabold tracking-tight text-brand-navy">
          404
        </p>
        <h1 className="mb-2 mt-3 text-lg font-bold text-brand-navy">
          העמוד לא נמצא
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-muted">
          הכתובת שהגעתם אליה לא קיימת, או שהעמוד עבר למקום אחר. הנתונים שלכם
          במקום — אפשר לחזור לדף הבית ולהמשיך משם.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className={btn("primary", "sm")}>
            לדף הבית
          </Link>
          <Link href="/home" className={btn("secondary", "sm")}>
            לאזור האישי
          </Link>
        </div>
      </div>
    </div>
  );
}
