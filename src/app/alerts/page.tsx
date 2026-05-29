"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPersona } from "@/lib/setup-storage";
import { Persona } from "@/lib/persona";
import { Alert, AlertSeverity, generateAllAlerts } from "@/lib/alerts/index";
import { cn } from "@/lib/utils";

// ─── Alert card ───────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<
  AlertSeverity,
  {
    card: string;
    icon: string;
    badge: string;
    badgeText: string;
    label: string;
  }
> = {
  alert: {
    card: "bg-red-50 border-red-300",
    icon: "🔴",
    badge: "bg-red-100 text-red-800 border border-red-200",
    badgeText: "דחוף",
    label: "alert",
  },
  warn: {
    card: "bg-amber-50 border-amber-300",
    icon: "🟡",
    badge: "bg-amber-100 text-amber-800 border border-amber-200",
    badgeText: "שים לב",
    label: "warn",
  },
  info: {
    card: "bg-blue-50 border-blue-200",
    icon: "🔵",
    badge: "bg-blue-100 text-blue-800 border border-blue-200",
    badgeText: "מידע",
    label: "info",
  },
  ok: {
    card: "bg-emerald-50 border-emerald-200",
    icon: "🟢",
    badge: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    badgeText: "תקין",
    label: "ok",
  },
};

function AlertCard({ alert }: { alert: Alert }) {
  const styles = SEVERITY_STYLES[alert.severity];

  return (
    <div
      className={cn(
        "rounded-xl border p-5 space-y-3 transition-shadow hover:shadow-md",
        styles.card,
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-xl mt-0.5 shrink-0" aria-hidden="true">
            {styles.icon}
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-stone-900 leading-snug">
              {alert.headlineHe}
            </div>
            <div className="mt-1 text-sm text-stone-600 leading-relaxed">
              {alert.detailHe}
            </div>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            styles.badge,
          )}
        >
          {styles.badgeText}
        </span>
      </div>

      {alert.cta && (
        <div className="pt-1">
          <Link
            href={alert.cta.href}
            className="inline-flex items-center gap-1 rounded-lg bg-white/70 border border-stone-300 px-3 py-1.5 text-xs font-medium text-brand-navy hover:bg-white transition-colors"
          >
            {alert.cta.labelHe}
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="font-display text-xl font-bold text-brand-navy mb-2">
        הכל תקין!
      </h2>
      <p className="text-stone-500 text-sm max-w-xs leading-relaxed">
        אין התראות פעילות כרגע. כשיהיה משהו שדורש תשומת לב — נציג כאן.
      </p>
    </div>
  );
}

// ─── Badge for unread count in header ────────────────────────────────────────

function SeverityCount({
  alerts,
}: {
  alerts: Alert[];
}) {
  const urgentCount = alerts.filter(
    (a) => a.severity === "alert" || a.severity === "warn",
  ).length;

  if (urgentCount === 0) return null;

  return (
    <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold h-4 min-w-4 px-1">
      {urgentCount}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [now] = useState(() => new Date());

  useEffect(() => {
    const p = loadPersona();
    if (!p) {
      router.push("/setup");
      return;
    }
    setPersona(p);
    setAlerts(generateAllAlerts(p, now));
  }, [router, now]);

  const urgentCount = alerts.filter(
    (a) => a.severity === "alert" || a.severity === "warn",
  ).length;

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/countme-logo.svg" alt="CountMe" className="h-10 w-10" />
            <span className="text-lg font-bold">CountMe · התראות</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-full border border-brand-navy/20 px-3 py-1 text-xs text-brand-navy hover:bg-info/20 transition-colors"
            >
              דשבורד ←
            </Link>
            <Link
              href="/demo"
              className="rounded-full border border-brand-navy/20 px-3 py-1 text-xs text-brand-navy hover:bg-info/20 transition-colors"
            >
              לדוח 1301 ←
            </Link>
            <Link
              href="/coach"
              className="rounded-full border border-success/30 px-3 py-1 text-xs text-success hover:bg-success/10 transition-colors"
            >
              ✦ שוחח עם איתן
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-md px-6 py-8">
        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-navy flex items-center gap-2">
              תיבת התראות
              {urgentCount > 0 && <SeverityCount alerts={alerts} />}
            </h1>
            <p className="text-sm text-stone-500 mt-0.5">
              {persona
                ? `${persona.personal.firstName} ${persona.personal.lastName} · שנת מס ${persona.income.year}`
                : "טוען..."}
            </p>
          </div>

          {alerts.length > 0 && (
            <div className="text-xs text-stone-500 bg-stone-100 rounded-full px-3 py-1">
              {alerts.length} התראות
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-5 py-2.5 text-[11px] text-stone-500 leading-relaxed mb-6">
          <span className="font-semibold text-stone-600">⚠ הצהרת אחריות: </span>
          התראות אלו מבוססות על נתונים שהוזנו ידנית ועל היגיון תקופתי בלבד — אינן מהוות ייעוץ מס מקצועי.
          לפני כל פעולה רגולטורית, מומלץ להתייעץ עם רואה חשבון מוסמך.
        </div>

        {/* Alerts list */}
        {!persona ? (
          /* Skeleton loader */
          <div className="space-y-4 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-stone-200" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}

        {/* Summary footer */}
        {alerts.length > 0 && persona && (
          <div className="mt-8 rounded-xl bg-white border border-stone-200 p-4">
            <h2 className="text-xs font-semibold text-stone-500 mb-3">
              סיכום לפי רמת חומרה
            </h2>
            <div className="flex flex-wrap gap-2">
              {(["alert", "warn", "info", "ok"] as AlertSeverity[]).map(
                (sev) => {
                  const count = alerts.filter((a) => a.severity === sev).length;
                  if (count === 0) return null;
                  const styles = SEVERITY_STYLES[sev];
                  return (
                    <span
                      key={sev}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        styles.badge,
                      )}
                    >
                      {styles.icon} {styles.badgeText}: {count}
                    </span>
                  );
                },
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
