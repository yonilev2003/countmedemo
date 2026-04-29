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

/**
 * The demo's central artifact: a side-by-side replica of Form 1301 with
 * calculated values populated. Designed to look "tax-authority-ish" but
 * clearly framed as countme so it's not mistaken for the real form.
 */
export function FormPreview({ persona }: Props) {
  const [activeTab, setActiveTab] = useState<FormTab["id"]>("personal");
  const tab = form1301.find((t) => t.id === activeTab) ?? form1301[0];

  return (
    <div className="gov-form rounded-lg overflow-hidden">
      {/* Header */}
      <div className="gov-form-header px-5 py-3 flex items-center justify-between text-sm">
        <div>
          <div className="font-semibold">
            תצוגה מקדימה — דו"ח שנתי ליחיד טופס 1301
          </div>
          <div className="text-xs text-blue-100/80 mt-0.5">
            ערכים מחושבים ע"י countme · שנת מס {persona.income.year}
          </div>
        </div>
        <div className="text-xs">מספר תיק: {persona.business.osekFileNumber}</div>
      </div>

      {/* Tabs */}
      <div className="gov-form-tabs flex">
        {form1301.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-l last:border-l-0 border-[#b6c8d6] transition-colors",
              activeTab === t.id
                ? "gov-form-tab-active"
                : "hover:bg-blue-100/40",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="bg-white p-4 space-y-4">
        {tab.sections.map((s, i) => (
          <SectionView key={i} section={s} persona={persona} />
        ))}
      </div>
    </div>
  );
}

function SectionView({ section, persona }: { section: FormSection; persona: Persona }) {
  return (
    <section className="gov-form-section rounded-md p-3">
      <h3 className="text-sm font-bold text-stone-800 mb-1">
        {section.letter && (
          <span className="ml-1 text-stone-500">{section.letter}</span>
        )}
        {section.title}
      </h3>
      {section.description && (
        <p className="text-xs text-stone-600 mb-2">{section.description}</p>
      )}
      <ul className="divide-y divide-stone-200">
        {section.fields.map((f, i) => (
          <li key={i} className="py-2">
            <FieldRow field={f} persona={persona} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function FieldRow({ field, persona }: { field: FormField; persona: Persona }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 text-sm text-stone-700">
        {field.label}
        {field.hint && (
          <span className="block text-xs text-stone-500 mt-0.5">
            {field.hint}
          </span>
        )}
      </div>
      <div className="shrink-0 min-w-[120px] text-left">
        <FieldValue field={field} persona={persona} />
      </div>
    </div>
  );
}

function FieldValue({ field, persona }: { field: FormField; persona: Persona }) {
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
      <span className="gov-form-input inline-block rounded px-2 py-1 text-sm text-stone-800">
        {renderPersonalValue(v, field)}
      </span>
    );
  }

  if (field.status === "skip") {
    return (
      <span className="text-xs text-stone-400">לא רלוונטי</span>
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
