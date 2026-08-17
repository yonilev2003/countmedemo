"use client";

import { useState } from "react";
import Link from "next/link";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { activeExpenses, softDeleteExpense } from "@/lib/expenses/store";
import { getCategoryLabel } from "@/lib/business-expenses/occupation-dataset";
import type { ExpenseLine } from "@/lib/persona";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/components/brand/app-header";
import { btn } from "@/components/brand/button";
import { LegalNote } from "@/components/brand/legal-note";
import {
  ArrowLeftIcon,
  PlusIcon,
  Trash2Icon,
  ReceiptIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
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

export default function ExpensesListPage() {
  const { persona, setPersona } = useRequiredPersona();
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  if (!persona) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-sm text-muted">טוען...</div>
      </div>
    );
  }

  const all = persona.income.expenses ?? [];
  const active = activeExpenses(persona)
    .map((e, i) => ({ e, fullIndex: all.indexOf(e) }))
    .sort((a, b) => (a.e.date < b.e.date ? 1 : -1));

  const total = active.reduce((s, { e }) => s + e.amount, 0);
  const byCategory = new Map<string, number>();
  for (const { e } of active) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  const categoryBreakdown = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);

  function handleDelete(fullIndex: number) {
    const next = softDeleteExpense(persona!, fullIndex);
    setPersona(next);
    setConfirmDelete(null);
  }

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

      <main className="mx-auto max-w-screen-xl px-6 py-8">
        {active.length === 0 ? (
          <EmptyState />
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
                <div className="text-xs text-muted mt-1">{active.length} הוצאות</div>
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
              {active.map(({ e, fullIndex }) => (
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

        <div className="rounded-xl border border-line-soft bg-cream/60 px-4 py-3 text-[11px] text-muted leading-relaxed mb-4">
          המערכת מרכזת ומסווגת הוצאות לצורך מעקב וניהול פנימי בלבד. הפקת חשבונית מס תואמת חוק (לרבות מספרי הקצאה
          מעל התקרה החוקית) מול רשות המסים אינה חלק מהמערכת בשלב זה — זהו שלב עתידי (Phase 2).
        </div>
        <LegalNote variant="dataset" />
      </main>
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
            {expense.originalAmount} {expense.originalCurrency} · שער {expense.exchangeRate}
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
