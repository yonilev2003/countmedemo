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
    <div className="gov-form rounded-lg" style={{ overflow: "visible" }}>
      {/* Header */}
      <div
        className="gov-form-header px-5 py-3 flex items-center justify-between text-sm rounded-t-lg"
        style={{ overflow: "hidden" }}
      >
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
      <div className="gov-form-tabs flex" style={{ overflow: "hidden" }}>
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
    <section className="gov-form-section rounded-md overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#e0d4a6] bg-[#f5edca]">
        {section.letter && (
          <span className="inline-flex items-center justify-center rounded bg-blue-100 text-blue-800 text-xs font-bold px-1.5 py-0.5 shrink-0">
            {section.letter}
          </span>
        )}
        <h3 className="text-sm font-bold text-stone-800">{section.title}</h3>
        {section.description && (
          <span className="text-xs text-stone-500 mr-auto">{section.description}</span>
        )}
      </div>

      {/* Fields table */}
      <table className="w-full border-collapse">
        <tbody>
          {section.fields.map((f, i) => (
            <FieldRow key={i} field={f} persona={persona} isLast={i === section.fields.length - 1} />
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
      {/* Column 1: field code */}
      <td
        className="w-[10%] pl-3 pr-2 py-2 text-right align-top"
        style={{ whiteSpace: "nowrap" }}
      >
        {field.code ? (
          <span className="font-mono text-[11px] text-stone-400 leading-5">
            {field.code}
          </span>
        ) : null}
      </td>

      {/* Column 2: label + hint */}
      <td className="w-[70%] px-2 py-2 align-top">
        <span
          className={cn(
            "text-sm text-stone-700 leading-snug",
            isSkip && "line-through decoration-stone-400",
          )}
        >
          {field.label}
        </span>
        {field.hint && !isSkip && (
          <span className="block text-xs text-stone-500 mt-0.5">{field.hint}</span>
        )}
      </td>

      {/* Column 3: value */}
      <td className="w-[20%] pr-3 pl-2 py-2 text-left align-top">
        <FieldValue field={field} persona={persona} />
      </td>
    </tr>
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

  if (field.status === "manual") {
    return (
      <span className="gov-form-input inline-block rounded px-2 py-1 text-sm text-stone-400 min-w-[80px]">
        &nbsp;
      </span>
    );
  }

  if (field.status === "skip") {
    return (
      <span className="text-xs text-stone-400">—</span>
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
