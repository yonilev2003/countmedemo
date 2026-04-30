"use client";

import { useState } from "react";
import {
  form1301,
  FormField,
  FormSection,
  FormTab,
} from "@/lib/form-1301/schema";
import { calculate } from "@/lib/calculators";
import { Persona, readPersonaPath } from "@/lib/persona";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { InteractiveValue } from "./interactive-value";

interface Props {
  persona: Persona;
}

export function FormPreview({ persona }: Props) {
  const [activeTab, setActiveTab] = useState<FormTab["id"]>("personal");
  const tab = form1301.find((t) => t.id === activeTab) ?? form1301[0];

  const today = new Date();
  const dateStamp = `C11 ${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear()}`;

  return (
    <div className="gov-form rounded-lg" style={{ overflow: "visible" }}>
      <BrandBar dateStamp={dateStamp} />
      <AppTabBar />
      <SubTabBar
        tabs={form1301}
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id)}
      />
      <ActionBar />
      <FileInfoTable persona={persona} />

      <div className="px-4 py-3 space-y-4">
        <SectionTitle title={`דו"ח שנתי מס הכנסה: ${tab.label}`} />
        {tab.sections.map((s, i) => (
          <SectionCard key={i} section={s} persona={persona} />
        ))}
      </div>
    </div>
  );
}

function BrandBar({ dateStamp }: { dateStamp: string }) {
  return (
    <div className="gov-brandbar flex items-center justify-between px-4 py-2.5 rounded-t-lg">
      <div className="flex items-center gap-1 font-bold text-lg leading-none">
        <span>gov</span>
        <span className="text-blue-700">.il</span>
      </div>
      <div className="text-center flex-1 px-3">
        <div className="text-sm font-bold leading-tight">
          שידור דו&quot;ח מס הכנסה ליחיד טופס 1301
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 text-[10px] leading-tight">
        <span className="font-mono opacity-70">{dateStamp}</span>
        <span className="font-bold">רשות המסים בישראל</span>
        <span className="opacity-70">Israel Tax Authority</span>
      </div>
    </div>
  );
}

function AppTabBar() {
  const tabs = [
    { label: "דוח שנתי", active: true },
    { label: "העלאת מסמכים", active: false },
    { label: "הדפסת טפסים נלווים", active: false },
    { label: "עזרה", active: false },
    { label: "יציאה למערכת", active: false },
  ];
  return (
    <div className="gov-appbar flex">
      {tabs.map((t) => (
        <div
          key={t.label}
          className={cn(
            "px-4 py-2 text-xs font-medium border-l border-[var(--color-tax-blue-darker)] last:border-l-0 cursor-default",
            t.active && "gov-appbar-tab-active",
          )}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}

function SubTabBar({
  tabs,
  activeId,
  onSelect,
}: {
  tabs: FormTab[];
  activeId: string;
  onSelect: (id: FormTab["id"]) => void;
}) {
  return (
    <div className="gov-form-tabs flex">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={cn(
            "px-4 py-2 text-xs font-medium border-l border-[var(--color-tax-blue-darker)] last:border-l-0 transition-colors",
            activeId === t.id ? "gov-form-tab-active" : "hover:bg-white/10",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function ActionBar() {
  const buttons = ["בדיקה", "שמירה", "ניקוי", "הבא"];
  return (
    <div className="gov-form-actions flex gap-2 px-4 py-2">
      {buttons.map((b) => (
        <button key={b} className="gov-action-btn cursor-default" disabled>
          {b}
        </button>
      ))}
    </div>
  );
}

function FileInfoTable({ persona }: { persona: Persona }) {
  const cols = [
    { label: "גרסה", value: "8" },
    { label: "ברקוד", value: persona.business.osekFileNumber || "—" },
    { label: 'ת"ז', value: persona.personal.teudatZehut },
    { label: "חוליה", value: "3" },
    { label: 'פ"ש', value: "38" },
    { label: "שם משפחה", value: persona.personal.lastName },
    { label: "שם פרטי", value: persona.personal.firstName },
    { label: "שנת מס", value: String(persona.income.year) },
    {
      label: "מספר תיק",
      value: persona.business.osekFileNumber || "—",
    },
  ];
  return (
    <div className="px-4 pt-3">
      <div className="text-xs font-bold text-[var(--color-tax-blue)] mb-1">
        פרטי תיק
      </div>
      <table className="gov-info-table">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.label}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {cols.map((c) => (
              <td key={c.label}>{c.value}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="text-center text-sm font-bold text-[var(--color-tax-blue)] py-1">
      {title}
    </h2>
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
    <section className="gov-form-section">
      <div className="gov-form-section-header flex items-center gap-2 px-3 py-2">
        {section.letter && (
          <span className="text-sm font-bold">{section.letter}.</span>
        )}
        <h3 className="text-sm">{section.title}</h3>
        {section.description && (
          <span className="text-[11px] font-normal opacity-70 mr-auto">
            {section.description}
          </span>
        )}
      </div>

      <table className="w-full border-collapse">
        <tbody>
          {section.fields.map((f, i) => (
            <FieldRow
              key={i}
              field={f}
              persona={persona}
              isLast={i === section.fields.length - 1}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function FieldRow({
  field,
  persona,
  isLast,
}: {
  field: FormField;
  persona: Persona;
  isLast: boolean;
}) {
  const isSkip = field.status === "skip";

  return (
    <tr
      className={cn(
        "border-b border-stone-100",
        isLast && "border-b-0",
        isSkip && "opacity-50",
      )}
    >
      {/* Field code badge — far right (in RTL = column 1) */}
      <td className="w-[60px] px-2 py-2 text-right align-middle">
        {field.code ? (
          <span className="gov-field-code">{field.code}</span>
        ) : null}
      </td>

      {/* Label + hint */}
      <td className="px-2 py-2 align-middle">
        <span
          className={cn(
            "text-[13px] text-stone-800 leading-snug",
            isSkip && "line-through decoration-stone-400",
          )}
        >
          {field.label}
        </span>
        {field.hint && !isSkip && (
          <span className="block text-[11px] text-stone-500 mt-0.5">
            {field.hint}
          </span>
        )}
      </td>

      {/* Value (calculated / personal / manual) */}
      <td className="w-[160px] pr-3 pl-2 py-2 text-left align-middle">
        <FieldValue field={field} persona={persona} />
      </td>
    </tr>
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
      <span className="gov-form-input inline-block min-w-[120px]">
        {renderPersonalValue(v, field)}
      </span>
    );
  }

  if (field.status === "manual") {
    return (
      <span className="gov-form-input inline-block min-w-[120px]">&nbsp;</span>
    );
  }

  return <span className="text-xs text-stone-400">—</span>;
}

function renderPersonalValue(v: unknown, field: FormField): string {
  if (v == null) return "—";
  if (typeof v === "string") {
    if (field.kind === "date") return formatDate(v);
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
