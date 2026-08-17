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

  // Cache key: insights only change when the underlying P&L numbers change.
  // Without this, every mount of /dashboard/pro paid for a fresh Sonnet call
  // that almost always produced the same 2-3 observations (cost audit
  // finding) — sessionStorage keeps it per-tab, per-session.
  const cacheKey = `countme_insights:${pl.totalRevenue}:${pl.totalExpenses}:${pl.netProfit}`;

  useEffect(() => {
    let cancelled = false;

    try {
      const cachedText = sessionStorage.getItem(cacheKey);
      if (cachedText) {
        setInsights(cachedText);
        setLoading(false);
        return;
      }
    } catch {
      /* private mode — fall through to a live fetch */
    }

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
      let buffer = "";
      let finished = false;

      while (!finished) {
        const { done, value } = await reader.read();
        if (done || cancelled) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]" || data.startsWith("[ERROR]")) {
            finished = true;
            break;
          }
          // Text deltas are JSON-encoded (newline-safe) by the server.
          let text = data;
          try {
            text = JSON.parse(data) as string;
          } catch {
            /* fall back to raw data if it isn't JSON */
          }
          accumulated += text;
        }
        if (!cancelled) setInsights(accumulated);
      }
      if (!cancelled) {
        setLoading(false);
        if (accumulated) {
          try {
            sessionStorage.setItem(cacheKey, accumulated);
          } catch {
            /* private mode / quota — cache miss next time, no harm */
          }
        }
      }
    }

    fetchInsights();
    return () => {
      cancelled = true;
    };
    // cacheKey encodes the P&L numbers, so it (not the object identities)
    // is the real dependency; persona identity changes don't warrant a
    // fresh paid call when the numbers are unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return (
    <div className="rounded-2xl border border-line bg-aqua-soft p-5 shadow-brand">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-brand-navy text-brand shadow-brand">
          <SparklesIcon className="size-5" />
        </div>
        <div className="leading-tight">
          <div className="text-[10px] font-bold uppercase tracking-wider text-brand-deep">
            עוזר חכם
          </div>
          <div className="text-sm font-bold text-brand-navy">שקל אומר</div>
        </div>
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
