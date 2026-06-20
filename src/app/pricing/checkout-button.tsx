"use client";

import { useState } from "react";
import { btn } from "@/components/brand/button";

/**
 * Pro checkout CTA. POSTs to /api/billing/checkout and reacts to the gated
 * responses: redirectUrl → go to the hosted payment page; notConnected/disabled
 * → show a calm inline message (no charge). Rendered only when billing is live.
 */
export function ProCheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId: "pro" }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = "/login?next=/pricing";
        return;
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      setMsg(
        data.notConnected
          ? "התשלום עדיין לא מחובר — ניצור איתך קשר."
          : "התשלום אינו פעיל כרגע.",
      );
    } catch {
      setMsg("שגיאה זמנית, נסה/י שוב.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-7">
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className={btn("gold", "md", "w-full")}
      >
        {loading ? "רגע…" : "למסלול המלא"}
      </button>
      {msg && <p className="mt-2 text-center text-xs text-aqua/80">{msg}</p>}
    </div>
  );
}
