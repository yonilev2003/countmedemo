"use client";

import { useEffect } from "react";
import Link from "next/link";

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
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="max-w-md w-full rounded-2xl bg-white border border-stone-200 shadow-sm p-7 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 text-2xl">
          ⚠
        </div>
        <h1 className="text-lg font-bold text-stone-800 mb-2">משהו השתבש</h1>
        <p className="text-sm text-stone-600 leading-relaxed mb-5">
          קרתה שגיאה לא צפויה. הנתונים שלך לא אבדו — הם שמורים מקומית בדפדפן.
          אפשר לנסות שוב, או לחזור לדף הבית.
        </p>
        {error.digest && (
          <p className="text-[10px] text-stone-400 font-mono mb-5">
            קוד שגיאה: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm font-medium transition-colors"
          >
            נסי שוב
          </button>
          <Link
            href="/"
            className="rounded-full border border-stone-300 px-5 py-2 text-sm text-stone-700 hover:bg-stone-100 transition-colors"
          >
            לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
