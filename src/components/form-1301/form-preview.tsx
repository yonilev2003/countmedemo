"use client";

import { useState } from "react";
import {
  form1301,
  FormField,
  FormSection,
  FormTab,
} from "@/lib/form-1301/schema";
import { calculate, estimateTaxLiability } from "@/lib/calculators";
import { Persona, readPersonaPath } from "@/lib/persona";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { InteractiveValue } from "./interactive-value";

interface Props {
  persona: Persona;
}

export function FormPreview({ persona }: Props) {
  const [activeTab, setActiveTab] = useState<FormTab["id"]>("income");
  const tab = form1301.find((t) => t.id === activeTab) ?? form1301[0];

  return (
    <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm bg-white">
      <FormHeader persona={persona} />
      <TabBar
        tabs={form1301}
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id)}
      />

      <div className="bg-[#fdfaf0] px-4 py-4 space-y-3">
        {tab.sections.map((s, i) => (
          <SectionCard key={i} section={s} persona={persona} />
        ))}
      </div>

      <TaxEstimateCard persona={persona} />
      <DisclaimerFooter />
    </div>
  );
}

function FormHeader({ persona }: { persona: Persona }) {
  return (
    <div className="bg-[#1d3a6e] text-white px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium text-blue-200 uppercase tracking-wider mb-1">
            תצוגה מקדימה
          </div>
          <h2 className="text-base font-bold leading-tight">
            דו&quot;ח שנתי ליחיד — טופס 1301
          </h2>
          <div className="text-[11px] text-blue-200 mt-1">
            ערכים מחושבים ע&quot;י countme&nbsp;·&nbsp;שנת מס {persona.income.year}
          </div>
        </div>
        <div className="text-left shrink-0">
          <div className="text-[10px] text-blue-300 mb-0.5">מספר תיק</div>
          <div className="font-mono text-sm font-bold">
            {persona.business.osekFileNumber}
          </div>
          <div className="text-[10px] text-blue-300 mt-1">
            {persona.personal.lastName} {persona.personal.firstName}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBar({
  tabs,
  activeId,
  onSelect,
}: {
  tabs: FormTab[];
  activeId: string;
  onSelect: (id: FormTab["id"]) => void;
}) {
  return (
    <div className="flex border-b border-stone-200 bg-white">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={cn(
            "flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px",
            activeId === t.id
              ? "border-[#fac832] text-[#1d3a6e] font-bold bg-[#fffbeb]"
              : "border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function SectionCard({
  section,
  persona,
}: {
  section: FormSection;
  persona: Persona;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-[#d9c97a] bg-white">
      <div className="bg-[#1d3a6e] text-white px-4 py-2.5 flex items-center gap-2">
        {section.letter && (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#fac832] text-[#1d3a6e] text-xs font-black shrink-0">
            {section.letter.replace(".", "")}
          </span>
        )}
        <span className="text-xs font-semibold leading-tight">{section.title}</span>
        {section.description && (
          <span className="mr-auto text-[10px] text-blue-200">{section.description}</span>
        )}
      </div>

      <div className="divide-y divide-stone-100">
        {section.fields.map((f, i) => (
          <FieldRow key={i} field={f} persona={persona} />
        ))}
      </div>
    </div>
  );
}

function FieldRow({
  field,
  persona,
}: {
  field: FormField;
  persona: Persona;
}) {
  const isSkip = field.status === "skip";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5",
        isSkip && "opacity-40",
      )}
    >
      {/* Field code badge — rightmost column in RTL layout */}
      <div className="shrink-0 w-10 flex justify-end">
        {field.code && (
          <span className="inline-flex items-center justify-center min-w-[32px] px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#c62828] text-white font-mono">
            {field.code}
          </span>
        )}
      </div>

      {/* Label + hint */}
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "text-[12px] text-stone-700 leading-snug",
            isSkip && "line-through decoration-stone-400",
          )}
        >
          {field.label}
        </span>
        {field.hint && !isSkip && (
          <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">
            {field.hint}
          </p>
        )}
      </div>

      {/* Value */}
      <div className="shrink-0 text-left">
        <FieldValue field={field} persona={persona} />
      </div>
    </div>
  );
}

function FieldValue({
  field,
  persona,
}: {
  field: FormField;
  persona: Persona;
}) {
  if (field.status === "calculated" && field.calculator) {
    const result = calculate(field.calculator, persona);
    if (result) {
      const variant =
        field.kind === "currency"
          ? "currency"
          : field.kind === "integer"
            ? "integer"
            : "raw";
      return (
        <InteractiveValue
          result={result}
          variant={variant}
          fieldCode={field.code}
        />
      );
    }
  }

  if (field.status === "personal" && field.personaPath) {
    const v = readPersonaPath(persona, field.personaPath);
    return (
      <span className="inline-block rounded border border-stone-200 bg-stone-50 px-2 py-0.5 text-[12px] font-medium text-stone-700 min-w-[80px] text-center">
        {renderPersonalValue(v, field)}
      </span>
    );
  }

  if (field.status === "manual") {
    return (
      <span className="inline-block rounded border border-dashed border-stone-300 bg-white px-2 py-0.5 text-[11px] text-stone-400 min-w-[80px] text-center">
        למילוי ידני
      </span>
    );
  }

  return <span className="text-xs text-stone-300">—</span>;
}

function renderPersonalValue(v: unknown, field: FormField): string {
  if (v == null) return "—";
  if (typeof v === "string") {
    if (field.kind === "date") return formatDate(v);
    if (v === "morshe") return "מורשה";
    if (v === "patur") return "פטור";
    if (v === "company") return "חברה";
    if (v === "single-entry") return "חד-צדדית";
    if (v === "double-entry") return "כפולה";
    if (v === "manual") return "ידני";
    if (v === "computerized") return "ממוחשב";
    if (v === "single") return "רווק/ה";
    if (v === "married") return "נשוי/אה";
    if (v === "divorced") return "גרוש/ה";
    if (v === "widowed") return "אלמן/ה";
    return v;
  }
  if (typeof v === "number") {
    if (field.kind === "currency") return formatCurrency(v);
    return formatNumber(v);
  }
  if (typeof v === "boolean") return v ? "כן" : "לא";
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("street" in o) {
      return `${o.street ?? ""} ${o.houseNumber ?? ""}, ${o.city ?? ""}`.trim();
    }
    return JSON.stringify(v);
  }
  return String(v);
}

/* ────────────────────────────────────────────────────────────
   Tax Estimate Card — bonus collapsible, NOT part of Form 1301
   Pure math — no API calls.
   ──────────────────────────────────────────────────────────── */
function TaxEstimateCard({ persona }: { persona: Persona }) {
  const [open, setOpen] = useState(false);
  const est = estimateTaxLiability(persona);
  const isRefund = est.balance < 0;

  return (
    <div className="border-t-2 border-dashed border-amber-300 bg-amber-50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-right hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xl text-amber-500">≈</span>
          <div className="text-right">
            <div className="text-xs font-bold text-amber-800">
              הערכת מס — לא חלק מהדוח
            </div>
            <div className="text-[11px] text-amber-600 mt-0.5">
              {isRefund
                ? `החזר צפוי: ${formatCurrency(Math.abs(est.balance))}`
                : `חיוב נוסף צפוי: ${formatCurrency(est.balance)}`}
              {est.mikdamot > 0 && (
                <span className="mr-2 opacity-70">
                  (לאחר {formatCurrency(est.mikdamot)} מקדמות)
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="text-amber-500 text-sm ml-2">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-1.5 text-[12px]">
          <EstimateRow label="הכנסה מעסק (שדה 150)" value={est.businessIncome} />
          <EstimateRow label="ניכוי קרן השתלמות" value={est.kerenDeduction} deduct />
          <EstimateRow label="ניכוי ביטוח לאומי (52%)" value={est.blDeduction} deduct />
          <EstimateRow label="ניכוי פנסיה (סעיף 47)" value={est.pensionDeduction} deduct />
          <div className="border-t border-amber-300 pt-2 my-1">
            <EstimateRow label="הכנסה חייבת (בקירוב)" value={est.taxableIncome} bold />
          </div>
          <EstimateRow label="מס גולמי (לפי מדרגות)" value={est.grossTax} />
          <EstimateRow label="זיכוי נקודות (×2,904 ₪)" value={est.creditPointsValue} deduct />
          <EstimateRow label="זיכוי ביטוח לאומי (48%)" value={est.blCredit} deduct />
          <div className="border-t border-amber-300 pt-2 my-1">
            <EstimateRow label="מס אחרי זיכויים" value={est.taxAfterCredits} bold />
          </div>
          {est.mikdamot > 0 && (
            <EstimateRow label="מקדמות ששולמו השנה" value={est.mikdamot} deduct />
          )}
          <div className="border-t-2 border-amber-400 pt-2 mt-2">
            <div className="flex justify-between font-bold text-[13px]">
              <span className={isRefund ? "text-emerald-700" : "text-red-700"}>
                {isRefund ? "החזר מס צפוי" : "חיוב נוסף צפוי"}
              </span>
              <span className={isRefund ? "text-emerald-700" : "text-red-700"}>
                {formatCurrency(Math.abs(est.balance))}
              </span>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-amber-100 border border-amber-300 p-3 text-[11px] text-amber-800 leading-relaxed space-y-1.5">
            <p className="font-bold">⚠ הערה חשובה</p>
            <p>
              ההחזר או החיוב הסופי עשוי לכלול <strong>הפרשי הצמדה וריבית</strong> על
              מקדמות שלא שולמו במועד.
            </p>
            <p>
              הערכה זו <strong>אינה מחשבת</strong>: הכנסות נוספות, מס שבח, שינויי מצב
              משפחתי, זיכויים מיוחדים, פטורים ייחודיים, או שנות מס קודמות.
            </p>
            <p>
              המידע מבוסס על הנתונים שהזנת —{" "}
              <strong>האחריות על נכונות הפרטים חלה עליך בלבד</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function EstimateRow({
  label,
  value,
  deduct = false,
  bold = false,
}: {
  label: string;
  value: number;
  deduct?: boolean;
  bold?: boolean;
}) {
  return (
    <div className={cn("flex justify-between text-amber-900", bold && "font-semibold")}>
      <span>{deduct ? `− ${label}` : label}</span>
      <span className="font-mono tabular-nums">
        {deduct ? `(${formatCurrency(value)})` : formatCurrency(value)}
      </span>
    </div>
  );
}

function DisclaimerFooter() {
  return (
    <div className="bg-stone-50 border-t border-stone-200 px-5 py-3 text-[10px] text-stone-400 leading-relaxed text-center">
      המידע מוצג לצורכי הכוונה בלבד ואינו מהווה ייעוץ מס, ייעוץ משפטי, או ייעוץ פיננסי.
      הנתונים מבוססים על המידע שהוזן ועל מקורות ציבוריים — האחריות על נכונות הפרטים
      המוגשים לרשות המסים חלה על הממלא/ת בלבד.
    </div>
  );
}
