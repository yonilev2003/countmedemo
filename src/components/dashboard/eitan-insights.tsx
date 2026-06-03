"use client";

import { useEffect, useState } from "react";
import { Persona } from "@/lib/persona";
import { PLSummary } from "@/lib/p-and-l/index";
import { SparklesIcon } from "@/components/brand/icons";

interface Props {
  persona: Persona;
  pl: PLSummary;
}

export function EitanInsights({ persona, pl }: Props) {
  const [insights, setInsights] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchInsights() {
      setLoading(true);
      setInsights("");

      // /api/coach expects { message, history, mode, persona }
      const body = JSON.stringify({
        mode: "dashboard-insights",
        message: `נתוני הדשבורד של ${persona.personal.firstName}:
הכנסות YTD: ${pl.totalRevenue.toLocaleString("he-IL")} ₪
הוצאות YTD: ${pl.totalExpenses.toLocaleString("he-IL")} ₪
רווח נקי: ${pl.netProfit.toLocaleString("he-IL")} ₪
תן 2-3 תצפיות קצרות ומועילות.`,
        history: [],
        persona,
      });

      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!res.ok || !res.body) {
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done || cancelled) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            if (data.startsWith("[ERROR]")) break;
            accumulated += data;
          }
        }
        if (!cancelled) setInsights(accumulated);
      }
      if (!cancelled) setLoading(false);
    }

    fetchInsights();
    return () => {
      cancelled = true;
    };
  }, [persona, pl]);

  return (
    <div className="rounded-2xl border border-line bg-aqua-soft p-4 shadow-brand">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex size-7 items-center justify-center rounded-full bg-brand-navy text-brand">
          <SparklesIcon className="size-4" />
        </div>
        <span className="text-sm font-semibold text-brand-navy">איתן אומר</span>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 rounded bg-sand animate-pulse w-4/5" />
          <div className="h-3 rounded bg-sand animate-pulse w-3/5" />
        </div>
      ) : (
        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
          {insights}
        </p>
      )}
    </div>
  );
}
