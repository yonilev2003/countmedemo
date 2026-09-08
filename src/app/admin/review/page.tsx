"use client";

/**
 * /admin/review — Tinder-style rule/answer review (CPA-BNG collaboration
 * round, 2026-09-08). One card at a time: what's claimed, what the engine
 * does today, the source + evidence tier, and four decisions (approve,
 * propose a change, ask for more info, skip) plus undo-last.
 *
 * GATING: identical posture to /admin (see that page's header comment) — the
 * server route is the only real gate (ADMIN_EMAILS, 404 to everyone else);
 * this page mirrors a 404-shaped screen on any non-2xx so an unauthorized
 * visitor can't tell this route does anything.
 *
 * Queue order (impact-first, per this round's spec): items needing attention
 * (unreviewed / a value changed since approval / a proposed change or
 * info-request still open) come first; a small random SAMPLE of already
 * "approved_current" items is interleaved to catch false confidence — an
 * item nobody has re-checked in months is exactly where a stale approval
 * hides. Filters let the reviewer narrow to one kind or one queue instead.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import {
  CheckIcon,
  XIcon,
  InfoIcon,
  ClockIcon,
  ArrowRightIcon,
} from "@/components/brand/icons";
import type { ReviewItemWithStatus, ReleaseStatus } from "@/app/api/admin/review/route";

type LoadState =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "error" }
  | { kind: "ready"; items: ReviewItemWithStatus[]; decisionsAvailable: boolean };

type Decision = "approved" | "change_proposed" | "needs_info" | "skipped" | "undo";
type KindFilter = "all" | "rule" | "deduction" | "answer";
type QueueFilter = "needs_attention" | "sample" | "all";

const NEEDS_ATTENTION: ReleaseStatus[] = [
  "unreviewed",
  "approved_stale",
  "change_proposed_pending",
  "needs_info_pending",
];

/** Deterministic-enough sampling (no crypto needed): every 5th already-approved
 *  item, picked by a stable hash of its id so the sample doesn't reshuffle on
 *  every refresh mid-session. */
function inSample(id: string): boolean {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 5 === 0;
}

function buildQueue(items: ReviewItemWithStatus[], queueFilter: QueueFilter): ReviewItemWithStatus[] {
  if (queueFilter === "all") return items;
  const attention = items.filter((i) => NEEDS_ATTENTION.includes(i.releaseStatus));
  if (queueFilter === "sample") {
    return items.filter((i) => i.releaseStatus === "approved_current" && inSample(i.id));
  }
  // needs_attention (default): attention items first, then an interleaved
  // sample of approved items so a long, dull queue occasionally revisits a
  // "settled" item instead of only ever seeing what's already flagged.
  const sample = items.filter((i) => i.releaseStatus === "approved_current" && inSample(i.id));
  const merged: ReviewItemWithStatus[] = [];
  let s = 0;
  attention.forEach((item, i) => {
    merged.push(item);
    if ((i + 1) % 6 === 0 && s < sample.length) merged.push(sample[s++]);
  });
  merged.push(...sample.slice(s));
  return merged;
}

export default function AdminReviewPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [year, setYear] = useState<number | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("needs_attention");
  const [cursor, setCursor] = useState(0);
  const [noteDraft, setNoteDraft] = useState("");
  const [pendingAction, setPendingAction] = useState<"change_proposed" | "needs_info" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async (y?: number) => {
    try {
      const url = y ? `/api/admin/review?year=${y}` : "/api/admin/review";
      const res = await fetch(url, { cache: "no-store" });
      if (res.status === 404) {
        setState({ kind: "not-found" });
        return;
      }
      if (!res.ok) {
        setState({ kind: "error" });
        return;
      }
      const data = (await res.json()) as {
        year: number;
        decisionsAvailable: boolean;
        items: ReviewItemWithStatus[];
      };
      setYear(data.year);
      setState({ kind: "ready", items: data.items, decisionsAvailable: data.decisionsAvailable });
    } catch {
      setState({ kind: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (state.kind !== "ready") return [];
    const byKind = kindFilter === "all" ? state.items : state.items.filter((i) => i.kind === kindFilter);
    return buildQueue(byKind, queueFilter);
  }, [state, kindFilter, queueFilter]);

  const current = filtered[cursor] ?? null;

  useEffect(() => {
    setCursor(0);
  }, [kindFilter, queueFilter]);

  const decide = useCallback(
    async (decision: Decision, note?: string) => {
      if (!current || submitting) return;
      setSubmitting(true);
      try {
        const res = await fetch("/api/admin/review/decide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: current.id,
            itemKind: current.kind,
            contentHash: current.contentHash,
            decision,
            note: note || undefined,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setToast(body.error ?? "השמירה נכשלה");
        } else {
          setToast(
            decision === "approved"
              ? "אושר"
              : decision === "skipped"
                ? "דולג"
                : decision === "undo"
                  ? "בוטל"
                  : "נשמר",
          );
          await load(year ?? undefined);
        }
      } finally {
        setSubmitting(false);
        setPendingAction(null);
        setNoteDraft("");
        setTimeout(() => setToast(null), 2500);
      }
    },
    [current, submitting, load, year],
  );

  // Keyboard shortcuts — disabled while typing a note or a modal is open.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (pendingAction || document.activeElement === noteRef.current) return;
      if (!current) return;
      switch (e.key) {
        case "a":
          void decide("approved");
          break;
        case "x":
          setPendingAction("change_proposed");
          break;
        case "?":
          setPendingAction("needs_info");
          break;
        case "s":
          void decide("skipped");
          break;
        case "z":
          if (current.latestDecision) void decide("undo");
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, decide, pendingAction]);

  if (state.kind === "not-found") return <NotFoundLike />;
  if (state.kind === "error") return <ErrorLike onRetry={() => void load()} />;
  if (state.kind === "loading") return <LoadingShell />;

  return (
    <div className="min-h-screen bg-cream" dir="rtl">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-screen-sm items-center justify-between px-4 py-4">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo size={24} />
          </Link>
          <span className="text-xs font-semibold text-muted">
            סקירת כללים {year ? `· שנת ${year}` : ""}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-sm px-4 pb-24 pt-6">
        {!state.decisionsAvailable && (
          <div className="mb-4 rounded-xl border border-due bg-cream px-4 py-3 text-xs text-muted">
            טבלת ההחלטות (review_decisions) עדיין לא הוחלה ב-Supabase — כל
            הכרטיסים מוצגים כ"לא נסקר" עד שהמיגרציה תופעל. אפשר לעבוד ולשמור
            כרגע; ההחלטות ייכתבו ברגע שהטבלה תהיה זמינה.
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <FilterChip active={queueFilter === "needs_attention"} onClick={() => setQueueFilter("needs_attention")}>
            דורש תשומת-לב
          </FilterChip>
          <FilterChip active={queueFilter === "sample"} onClick={() => setQueueFilter("sample")}>
            מדגם מאושרים
          </FilterChip>
          <FilterChip active={queueFilter === "all"} onClick={() => setQueueFilter("all")}>
            הכל
          </FilterChip>
          <span className="mx-1 text-line">|</span>
          {(["all", "rule", "deduction", "answer"] as const).map((k) => (
            <FilterChip key={k} active={kindFilter === k} onClick={() => setKindFilter(k)}>
              {k === "all" ? "כל הסוגים" : k === "rule" ? "כלל" : k === "deduction" ? "ניכוי" : "תשובה"}
            </FilterChip>
          ))}
        </div>

        {!current ? (
          <div className="rounded-2xl border border-line bg-paper p-8 text-center shadow-brand">
            <p className="text-lg font-bold text-brand-navy">אין כרטיסים בתור הזה 🎉</p>
            <p className="mt-1 text-sm text-muted">נסה/י מסנן אחר, או תור "הכל".</p>
          </div>
        ) : (
          <>
            <p className="mb-2 text-xs text-faint">
              כרטיס {cursor + 1} מתוך {filtered.length}
            </p>
            <ReviewCard
              item={current}
              showHistory={showHistory}
              onToggleHistory={() => setShowHistory((v) => !v)}
            />

            {pendingAction ? (
              <div className="mt-4 rounded-2xl border border-line bg-paper p-4 shadow-brand">
                <label className="mb-1.5 block text-xs font-bold text-brand-navy">
                  {pendingAction === "change_proposed" ? "מה השינוי המוצע, ולמה?" : "איזה מידע חסר?"}
                </label>
                <textarea
                  ref={noteRef}
                  autoFocus
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  className="w-full rounded-xl border border-line bg-cream p-3 text-sm"
                  rows={3}
                  placeholder="חובה למלא — כולל מקור אם יש"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={!noteDraft.trim() || submitting}
                    onClick={() => void decide(pendingAction, noteDraft.trim())}
                    className={btn("primary", "sm")}
                  >
                    שמירה
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingAction(null);
                      setNoteDraft("");
                    }}
                    className={btn("ghost", "sm")}
                  >
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ActionButton
                  onClick={() => void decide("approved")}
                  disabled={submitting}
                  icon={<CheckIcon className="size-4" />}
                  label="אישור"
                  hint="a"
                  tone="approve"
                />
                <ActionButton
                  onClick={() => setPendingAction("change_proposed")}
                  disabled={submitting}
                  icon={<XIcon className="size-4" />}
                  label="הצע תיקון"
                  hint="x"
                  tone="reject"
                />
                <ActionButton
                  onClick={() => setPendingAction("needs_info")}
                  disabled={submitting}
                  icon={<InfoIcon className="size-4" />}
                  label="צריך מידע"
                  hint="?"
                  tone="neutral"
                />
                <ActionButton
                  onClick={() => void decide("skipped")}
                  disabled={submitting}
                  icon={<ArrowRightIcon className="size-4" />}
                  label="דילוג"
                  hint="s"
                  tone="neutral"
                />
              </div>
            )}

            {current.latestDecision && !pendingAction && (
              <button
                type="button"
                onClick={() => void decide("undo")}
                disabled={submitting}
                className="mt-3 flex items-center gap-1.5 text-xs text-muted hover:underline"
              >
                <ClockIcon className="size-3.5" /> ביטול ההחלטה האחרונה (z)
              </button>
            )}
          </>
        )}

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-brand-navy px-4 py-2 text-xs font-bold text-white shadow-brand">
            {toast}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────

const TIER_LABEL: Record<string, string> = {
  confirmed: "מאושר (מקור ראשי)",
  strongly_supported: "תמיכה נסיבתית חזקה",
  unverified: "לא מאומת",
  refuted: "הופרך",
};

const TIER_TONE: Record<string, string> = {
  confirmed: "bg-success/15 text-success",
  strongly_supported: "bg-brand-deep/15 text-brand-deep",
  unverified: "bg-due/15 text-due",
  refuted: "bg-alert/15 text-alert",
};

const STATUS_LABEL: Record<ReleaseStatus, string> = {
  unreviewed: "לא נסקר",
  approved_current: "מאושר · עדכני",
  approved_stale: "⚠ מאושר, אך הערך השתנה מאז",
  change_proposed_pending: "תיקון מוצע — ממתין",
  needs_info_pending: "ממתין למידע",
  skipped: "דולג",
};

function ReviewCard({
  item,
  showHistory,
  onToggleHistory,
}: {
  item: ReviewItemWithStatus;
  showHistory: boolean;
  onToggleHistory: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-5 shadow-brand">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-cream px-2.5 py-0.5 text-[11px] font-bold text-muted">
          {item.kind === "rule" ? "כלל" : item.kind === "deduction" ? "ניכוי" : "תשובה"}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TIER_TONE[item.confidenceTier]}`}>
          {TIER_LABEL[item.confidenceTier]}
        </span>
        <span className="rounded-full bg-cream px-2.5 py-0.5 text-[11px] font-medium text-muted">
          {STATUS_LABEL[item.releaseStatus]}
        </span>
      </div>

      <h2 className="text-lg font-bold leading-snug text-brand-navy">{item.label}</h2>

      <div className="mt-3 rounded-xl bg-cream p-3">
        <p className="mb-1 text-[11px] font-bold text-muted">הערך/תשובה כרגע במנוע</p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{item.currentValue}</p>
      </div>

      {item.consumers.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          <span className="font-bold">משפיע על:</span> {item.consumers.join(" · ")}
        </p>
      )}

      {item.sourceUrl && (
        <p className="mt-1 text-xs">
          <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-deep hover:underline">
            מקור: {item.publisher}
          </a>
          {item.effectiveTaxYears && (
            <span className="text-muted"> · שנים: {item.effectiveTaxYears.join(", ")}</span>
          )}
        </p>
      )}

      {item.notes && item.notes.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pe-4 text-xs text-due">
          {item.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}

      {item.history.length > 0 && (
        <button
          type="button"
          onClick={onToggleHistory}
          className="mt-3 text-xs font-medium text-brand-deep hover:underline"
        >
          {showHistory ? "הסתר היסטוריה" : `הצג היסטוריה (${item.history.length})`}
        </button>
      )}
      {showHistory && (
        <ul className="mt-2 space-y-1.5 border-t border-line pt-2">
          {item.history.map((h, i) => (
            <li key={i} className="text-xs text-muted">
              <span className="font-mono" dir="ltr">
                {new Date(h.created_at).toLocaleString("he-IL")}
              </span>{" "}
              · {h.reviewer_email} · <span className="font-bold">{h.decision}</span>
              {h.note ? ` — ${h.note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  icon,
  label,
  hint,
  tone,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  hint: string;
  tone: "approve" | "reject" | "neutral";
}) {
  const toneClass =
    tone === "approve"
      ? "border-success/40 text-success hover:bg-success/10"
      : tone === "reject"
        ? "border-alert/40 text-alert hover:bg-alert/10"
        : "border-line text-muted hover:bg-cream";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 rounded-xl border bg-paper px-3 py-3 text-xs font-bold transition-colors disabled:opacity-50 ${toneClass}`}
    >
      {icon}
      {label}
      <span className="font-mono text-[10px] text-faint" dir="ltr">
        {hint}
      </span>
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-brand-deep bg-brand-deep/10 text-brand-deep"
          : "border-line bg-paper text-muted hover:bg-cream"
      }`}
    >
      {children}
    </button>
  );
}

// ── Loading / error / not-found (mirrors /admin exactly) ────────────────────

function LoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <div className="w-full max-w-sm space-y-3 px-6 animate-pulse">
        <div className="h-8 w-40 rounded-lg bg-sand" />
        <div className="h-48 rounded-2xl bg-sand" />
        <div className="h-10 rounded-xl bg-sand" />
      </div>
    </div>
  );
}

function ErrorLike({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-7 text-center shadow-brand">
        <p className="mb-2 text-lg font-bold text-brand-navy">משהו השתבש</p>
        <p className="mb-6 text-sm leading-relaxed text-muted">
          לא הצלחנו לטעון את הנתונים. נסו שוב בעוד רגע.
        </p>
        <button type="button" onClick={onRetry} className={btn("primary", "sm")}>
          נסה/י שוב
        </button>
      </div>
    </div>
  );
}

function NotFoundLike() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-7 text-center shadow-brand">
        <div className="mx-auto mb-5 flex justify-center">
          <Logo size={28} />
        </div>
        <p className="font-display text-5xl font-extrabold tracking-tight text-brand-navy">404</p>
        <h1 className="mb-2 mt-3 text-lg font-bold text-brand-navy">העמוד לא נמצא</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted">
          הכתובת שהגעתם אליה לא קיימת, או שהעמוד עבר למקום אחר.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className={btn("primary", "sm")}>
            לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
