"use client";

import { useState } from "react";
import { SparklesIcon, XIcon } from "@/components/ui/icon";

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-center gap-3 bg-gradient-to-l from-brand-50 to-amber-50 border-b border-amber-200 px-4 py-2 text-sm">
      <SparklesIcon className="h-4 w-4 text-amber-700 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-amber-900">מצב הדגמה</span>
        <span className="text-amber-800 ms-2">
          הנתונים זמניים — לא נשמרים בין הפעלות שרת. הגדר Supabase ב-`.env.local` כדי לעבור למצב חי.
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-amber-100 rounded"
        aria-label="סגור"
      >
        <XIcon className="h-3.5 w-3.5 text-amber-700" />
      </button>
    </div>
  );
}
