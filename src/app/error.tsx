"use client";

import { useEffect } from "react";
import Link from "next/link";
import { btn } from "@/components/brand/button";
import { AlertTriangleIcon } from "@/components/brand/icons";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface in dev console; in prod, Vercel logs capture this server-side
    // and the user sees the friendly UI below.
    console.error("[countme]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="max-w-md w-full rounded-2xl bg-paper border border-line shadow-brand p-7 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-overdue-bg text-alert">
          <AlertTriangleIcon className="size-6" />
        </div>
        <h1 className="text-lg font-bold text-brand-navy mb-2">משהו השתבש</h1>
        <p className="text-sm text-muted leading-relaxed mb-5">
          קרתה שגיאה לא צפויה. הנתונים שלך לא אבדו — הם שמורים מקומית בדפדפן.
          אפשר לנסות שוב, או לחזור לדף הבית.
        </p>
        {error.digest && (
          <p className="text-[10px] text-faint font-mono mb-5">
            קוד שגיאה: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className={btn("primary", "sm")}>
            נסי שוב
          </button>
          <Link href="/" className={btn("secondary", "sm")}>
            לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
