"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPersona } from "@/lib/setup-storage";
import { Persona } from "@/lib/persona";
import { Alert, AlertSeverity, generateAllAlerts } from "@/lib/alerts/index";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import {
  StatusBadge,
  type Status,
} from "@/components/brand/status";
import {
  BellIcon,
  AlertTriangleIcon,
  InfoIcon,
  CheckCircleIcon,
} from "@/components/brand/icons";

// ─── Severity → brand status mapping ─────────────────────────────────────────

const SEVERITY_STATUS: Record<AlertSeverity, Status> = {
  alert: "overdue",
  warn: "due",
  info: "plan",
  ok: "on-track",
};

const SEVERITY_CARD: Record<AlertSeverity, string> = {
  alert: "border-s-2 border-s-alert bg-overdue-bg/30",
  warn: "border-s-2 border-s-due bg-due-bg/30",
  info: "border-s-2 border-s-brand-deep bg-info/30",
  ok: "border-s-2 border-s-success bg-success-light/30",
};

const SEVERITY_BADGE_LABEL: Record<AlertSeverity, string> = {
  alert: "דחוף",
  warn: "שים לב",
  info: "מידע",
  ok: "תקין",
};

function SeverityIcon({
  severity,
  className,
}: {
  severity: AlertSeverity;
  className?: string;
}) {
  if (severity === "alert" || severity === "warn") {
    return <AlertTriangleIcon className={cn("text-alert", severity === "warn" && "text-due", className)} />;
  }
  if (severity === "ok") {
    return <CheckCircleIcon className={cn("text-success", className)} />;
  }
  return <InfoIcon className={cn("text-brand-deep", className)} />;
}

// ─── Alert card ───────────────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: Alert }) {
  const cardBorder = SEVERITY_CARD[alert.severity];
  const status = SEVERITY_STATUS[alert.severity];

  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-paper shadow-brand-sm overflow-hidden transition-shadow hover:shadow-brand",
        cardBorder,
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="shrink-0 mt-0.5" aria-hidden="true">
            <SeverityIcon severity={alert.severity} className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-brand-navy leading-snug">
              {alert.headlineHe}
            </div>
            <div className="mt-1 text-sm text-muted leading-relaxed">
              {alert.detailHe}
            </div>
          </div>
        </div>
        <StatusBadge status={status} showDot className="shrink-0">
          {SEVERITY_BADGE_LABEL[alert.severity]}
        </StatusBadge>
      </div>

      {alert.cta && (
        <div className="px-5 pb-4 pt-0">
          <Link
            href={alert.cta.href}
            className={btn("secondary", "sm")}
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
      <span className="mb-4 grid size-16 place-items-center rounded-full bg-success-light text-success">
        <CheckCircleIcon className="size-8" />
      </span>
      <h2 className="font-display text-xl font-bold text-brand-navy mb-2">
        הכל תקין!
      </h2>
      <p className="text-muted text-sm max-w-xs leading-relaxed">
        אין התראות פעילות כרגע. כשיהיה משהו שדורש תשומת לב — נציג כאן.
      </p>
    </div>
  );
}

// ─── Badge for unread count in header ────────────────────────────────────────

function SeverityCount({ alerts }: { alerts: Alert[] }) {
  const urgentCount = alerts.filter(
    (a) => a.severity === "alert" || a.severity === "warn",
  ).length;

  if (urgentCount === 0) return null;

  return (
    <span className="inline-flex items-center justify-center rounded-full bg-alert text-white text-[10px] font-bold h-4 min-w-4 px-1">
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
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-sm font-semibold text-muted">· התראות</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/dashboard" className={btn("secondary", "sm")}>
              דשבורד
            </Link>
            <Link href="/demo" className={btn("secondary", "sm")}>
              לדוח 1301
            </Link>
            <Link href="/coach" className={btn("gold", "sm")}>
              <span className="text-brand-navy">שוחח עם איתן</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-md px-6 py-8">
        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-navy flex items-center gap-2">
              <BellIcon className="size-6" />
              תיבת התראות
              {urgentCount > 0 && <SeverityCount alerts={alerts} />}
            </h1>
            <p className="text-sm text-muted mt-0.5">
              {persona
                ? `${persona.personal.firstName} ${persona.personal.lastName} · שנת מס ${persona.income.year}`
                : "טוען..."}
            </p>
          </div>

          {alerts.length > 0 && (
            <div className="text-xs text-faint bg-sand rounded-full px-3 py-1">
              {alerts.length} התראות
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="rounded-2xl border border-line bg-paper px-5 py-3 mb-6 flex items-start gap-2">
          <AlertTriangleIcon className="size-4 shrink-0 mt-0.5 text-due" />
          <p className="text-[11px] text-muted leading-relaxed">
            <span className="font-semibold text-ink">הצהרת אחריות: </span>
            התראות אלו מבוססות על נתונים שהוזנו ידנית ועל היגיון תקופתי בלבד — אינן מהוות ייעוץ מס מקצועי.
            לפני כל פעולה רגולטורית, מומלץ להתייעץ עם רואה חשבון מוסמך.
          </p>
        </div>

        {/* Alerts list */}
        {!persona ? (
          /* Skeleton loader */
          <div className="space-y-4 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-sand" />
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
          <div className="mt-8 rounded-2xl bg-paper border border-line p-4 shadow-brand-sm">
            <h2 className="text-xs font-semibold text-muted mb-3">
              סיכום לפי רמת חומרה
            </h2>
            <div className="flex flex-wrap gap-2">
              {(["alert", "warn", "info", "ok"] as AlertSeverity[]).map(
                (sev) => {
                  const count = alerts.filter((a) => a.severity === sev).length;
                  if (count === 0) return null;
                  return (
                    <StatusBadge
                      key={sev}
                      status={SEVERITY_STATUS[sev]}
                      showDot
                    >
                      {SEVERITY_BADGE_LABEL[sev]}: {count}
                    </StatusBadge>
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
