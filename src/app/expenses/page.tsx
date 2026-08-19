"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { activeExpenses, softDeleteExpense } from "@/lib/expenses/store";
import { getCategoryLabel } from "@/lib/business-expenses/occupation-dataset";
import {
  buildExpensesCsv,
  EXPENSE_PILL_ORDER,
  expensePillLabel,
  filterExpensesByPill,
  type ExpensePillFilter,
} from "@/lib/expenses/export";
import type { ExpenseLine } from "@/lib/persona";
import { cn, formatNumber } from "@/lib/utils";
import { AppHeader } from "@/components/brand/app-header";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { btn } from "@/components/brand/button";
import { LegalNote } from "@/components/brand/legal-note";
import {
  ArrowLeftIcon,
  PlusIcon,
  Trash2Icon,
  ReceiptIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  DownloadIcon,
  FileTextIcon,
} from "@/components/brand/icons";

const STATUS_LABEL: Record<NonNullable<ExpenseLine["status"]>, { label: string; cls: string }> = {
  full: { label: "מלא", cls: "bg-success-light text-success" },
  partial: { label: "חסרים פרטים", cls: "bg-due-bg text-due-ink" },
  needs_review: { label: "דורש בדיקה", cls: "bg-overdue-bg text-alert-ink" },
};

const SOURCE_LABEL: Record<NonNullable<ExpenseLine["source"]>, string> = {
  camera: "צילום",
  gallery: "גלריה",
  file: "קובץ",
  voice: "הקלטה קולית",
  manual: "ידני",
};

/** Client-side file save — the CSV never leaves the browser. */
function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExpensesListPage() {
  const { persona, setPersona } = useRequiredPersona();
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [filter, setFilter] = useState<ExpensePillFilter>("all");

  // Hooks run unconditionally (rules of hooks) — the null-persona guard below
  // returns AFTER these, never before, so hook order never changes.
  const activeSorted = useMemo(() => {
    if (!persona) return [];
    const all = persona.income.expenses ?? [];
    return activeExpenses(persona)
      .map((e) => ({ e, fullIndex: all.indexOf(e) }))
      .sort((a, b) => (a.e.date < b.e.date ? 1 : -1));
  }, [persona]);

  // Same predicate /expenses/print reads off the ?filter= query param — kept
  // in lib/expenses/export.ts so the two screens can't drift (spec §3).
  const filtered = useMemo(() => {
    const matching = new Set(filterExpensesByPill(activeSorted.map(({ e }) => e), filter));
    return activeSorted.filter(({ e }) => matching.has(e));
  }, [activeSorted, filter]);

  if (!persona) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-sm text-muted">טוען...</div>
      </div>
    );
  }

  // Top card, count and category breakdown recompute off the FILTERED set —
  // the pills describe what's currently on screen, not the whole dataset.
  const total = filtered.reduce((s, { e }) => s + e.amount, 0);
  const byCategory = new Map<string, number>();
  for (const { e } of filtered) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  const categoryBreakdown = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);

  function handleDelete(fullIndex: number) {
    const next = softDeleteExpense(persona!, fullIndex);
    setPersona(next);
    setConfirmDelete(null);
  }

  function handleExportCsv() {
    const csv = buildExpensesCsv(filtered.map(({ e }) => e));
    downloadCsv(csv, `countme-expenses-${persona!.income.year}.csv`);
  }

  // Mockup-standard chip — navy pill for active, paper outline otherwise
  // (same pattern as /invoices' year/month filters).
  const chip = (isActive: boolean) =>
    `rounded-full px-3.5 py-1 text-xs font-bold transition-colors ${
      isActive
        ? "bg-brand-navy text-white"
        : "bg-paper border border-line text-ink hover:border-brand-deep hover:bg-aqua-soft"
    }`;

  return (
    <div className="min-h-screen bg-cream">
      {/* AppHeader wraps on narrow phones — the hand-rolled non-wrapping row
          forced a 446px layout viewport at 390px (journey scan round 2). */}
      <AppHeader
        pageLabel="הוצאות שתועדו"
        actions={
          <>
            <Link href="/dashboard" className={btn("secondary", "sm")}>
              <ArrowLeftIcon className="size-3.5" />
              חזור ללוח הבית
            </Link>
            <Link href="/expenses/new" className={btn("primary", "sm")}>
              <PlusIcon className="size-3.5" />
              הוצאה חדשה
            </Link>
          </>
        }
      />

      {/* pb-28: clearance for QuickActionsBar's fixed mobile bottom bar
          (2026-08-19 global-nav sweep, FP-23); lg:pb-8 resets it back since
          the bar is lg:hidden. */}
      <main className="mx-auto max-w-screen-xl px-6 py-8 pb-28 lg:pb-8">
        {activeSorted.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* ── Filters + export ── */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {EXPENSE_PILL_ORDER.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={chip(filter === key)}
                  >
                    {expensePillLabel(key)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleExportCsv} className={btn("gold", "sm")}>
                  <DownloadIcon className="size-3.5" />
                  ייצוא CSV
                </button>
                <Link href={`/expenses/print?filter=${filter}`} className={btn("secondary", "sm")}>
                  <FileTextIcon className="size-3.5" />
                  ייצוא PDF
                </Link>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-paper py-10 text-center text-sm text-muted shadow-brand">
                אין הוצאות מתאימות לסינון הזה
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <div className="rounded-2xl border border-line bg-paper shadow-brand p-5 md:col-span-1">
                    <div className="text-[11px] font-bold text-brand-deep uppercase tracking-wider mb-1">
                      סה״כ מתועד
                    </div>
                    <div className="text-2xl font-extrabold text-brand-navy">
                      {total.toLocaleString("he-IL", { maximumFractionDigits: 0 })} ₪
                    </div>
                    <div className="text-xs text-muted mt-1">{filtered.length} הוצאות</div>
                  </div>
                  <div className="rounded-2xl border border-line bg-paper shadow-brand p-5 md:col-span-2">
                    <div className="text-[11px] font-bold text-brand-deep uppercase tracking-wider mb-2">
                      לפי קטגוריה
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categoryBreakdown.map(([category, amount]) => (
                        <span
                          key={category}
                          className="inline-flex items-center gap-1.5 rounded-full bg-cream border border-line px-3 py-1 text-[11px] text-ink"
                        >
                          {category}
                          <span className="font-bold text-brand-navy">
                            {amount.toLocaleString("he-IL", { maximumFractionDigits: 0 })} ₪
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 mb-6">
                  {filtered.map(({ e, fullIndex }) => (
                    <ExpenseRow
                      key={fullIndex}
                      expense={e}
                      confirming={confirmDelete === fullIndex}
                      onDeleteClick={() => setConfirmDelete(fullIndex)}
                      onConfirmDelete={() => handleDelete(fullIndex)}
                      onCancelDelete={() => setConfirmDelete(null)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <div className="rounded-xl border border-line-soft bg-cream/60 px-4 py-3 text-[11px] text-muted leading-relaxed mb-4">
          המערכת מרכזת ומסווגת הוצאות לצורך מעקב וניהול פנימי בלבד. הפקת חשבונית מס תואמת חוק (לרבות מספרי הקצאה
          מעל התקרה החוקית) מול רשות המסים אינה חלק מהמערכת בשלב זה — זהו שלב עתידי (Phase 2).
        </div>
        <LegalNote variant="dataset" />
      </main>

      {/* Canonical bottom bar (2026-08-19 global-nav sweep, FP-23) — already
          includes a "שקל" chat shortcut, so no separate EitanFab here (would
          be a second chat affordance on the same screen, FP-24). */}
      <QuickActions variant="bar" className="lg:hidden" currentHref="/expenses" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-paper p-10 text-center shadow-brand">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-teal-100 text-brand-deep">
        <ReceiptIcon className="size-6" />
      </div>
      <h2 className="text-lg font-bold text-brand-navy mb-1">עדיין אין הוצאות מתועדות</h2>
      <p className="text-sm text-muted mb-5">
        צלמ/י קבלה, הקליט/י תיאור קולי, או הזינ/י ידנית — כל אחת מוכרת אוטומטית לקטגוריה המתאימה לעסק שלך.
      </p>
      <Link href="/expenses/new" className={btn("primary")}>
        <PlusIcon className="size-4" />
        תיעוד הוצאה ראשונה
      </Link>
    </div>
  );
}

function ExpenseRow({
  expense,
  confirming,
  onDeleteClick,
  onConfirmDelete,
  onCancelDelete,
}: {
  expense: ExpenseLine;
  confirming: boolean;
  onDeleteClick: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const status = expense.status ? STATUS_LABEL[expense.status] : null;
  return (
    <div className="rounded-2xl border border-line bg-paper shadow-brand px-5 py-4 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-brand-navy truncate">{expense.vendorName || "ללא שם ספק"}</span>
          {status && (
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", status.cls)}>
              {expense.status === "full" ? <CheckCircleIcon className="size-3" /> : <AlertTriangleIcon className="size-3" />}
              {status.label}
            </span>
          )}
          {expense.source && (
            <span className="text-[10px] text-faint">{SOURCE_LABEL[expense.source]}</span>
          )}
        </div>
        <div className="text-[12px] text-muted mt-0.5 flex flex-wrap gap-x-3">
          <span>{expense.date}</span>
          <span>{expense.category || "ללא קטגוריה"}</span>
          {expense.docNumber && <span className="font-mono" dir="ltr">#{expense.docNumber}</span>}
        </div>
        {expense.isForeignCurrency && expense.originalAmount && (
          <div className="text-[11px] text-faint mt-0.5">
            {formatNumber(expense.originalAmount)} {expense.originalCurrency} · שער{" "}
            {expense.exchangeRate != null ? formatNumber(expense.exchangeRate) : expense.exchangeRate}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-end">
          <div className="font-bold text-brand-navy">
            {expense.amount.toLocaleString("he-IL", { maximumFractionDigits: 0 })} ₪
          </div>
          {expense.vat != null && expense.vat > 0 && (
            <div className="text-[10px] text-faint">מע״מ {expense.vat.toLocaleString("he-IL")} ₪</div>
          )}
        </div>
        {confirming ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onConfirmDelete}
              className="rounded-lg bg-alert px-2.5 py-1.5 text-[11px] font-bold text-white"
            >
              מחיקה
            </button>
            <button
              type="button"
              onClick={onCancelDelete}
              className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] text-muted"
            >
              ביטול
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onDeleteClick}
            aria-label="הסרת הוצאה"
            className="rounded-lg p-2 text-faint hover:bg-cream hover:text-alert transition-colors"
          >
            <Trash2Icon className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
