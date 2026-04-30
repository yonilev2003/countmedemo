"use client";

import { useState } from "react";
import {
  form1301,
  FormField,
  FormSection,
  FormTab,
} from "@/lib/form-1301/schema";
import { calculate, CalcResult } from "@/lib/calculators";
import { Persona, readPersonaPath } from "@/lib/persona";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { InteractiveValue } from "./interactive-value";

interface Props {
  persona: Persona;
  /** Called when the user clicks the bottom "המשך" button — same destination as the page-level "ראה הערכת מס" CTA. */
  onContinue?: () => void;
}

export function FormPreview({ persona, onContinue }: Props) {
  const [activeTab, setActiveTab] = useState<FormTab["id"]>("personal");
  const tab = form1301.find((t) => t.id === activeTab) ?? form1301[0];

  return (
    <div className="overflow-hidden border border-stone-400 shadow-sm bg-white" style={{ borderRadius: 2 }}>
      <GovTopBar />
      <GovTitleBar />
      <GovNavBar tabs={form1301} activeId={activeTab} onSelect={(id) => setActiveTab(id)} />
      <FileInfoTable persona={persona} />

      <div className="bg-[#fdfaf0] px-3 py-3 space-y-2">
        {tab.sections.map((s, i) => (
          <SectionCard key={i} section={s} persona={persona} />
        ))}
      </div>

      {onContinue && (
        <div className="bg-white border-t border-stone-300 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-[11px] text-stone-500">
            סיימת לעבור על הדו״ח? המשך להערכת המס השנתית.
          </p>
          <button
            onClick={onContinue}
            className="rounded-xl bg-[#1a3f6a] hover:bg-[#1e4d8c] text-white font-bold px-6 py-2.5 text-sm transition-colors shadow-md whitespace-nowrap"
          >
            המשך →
          </button>
        </div>
      )}

      <DisclaimerFooter />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Gov.il Top bar — two-part header replicating secapp.taxes.gov.il
   ────────────────────────────────────────────────────────── */
function GovTopBar() {
  return (
    <div className="bg-[#1a3f6a] text-white px-4 py-1.5 flex items-center justify-between text-[11px]">
      <div className="font-extrabold tracking-wider">gov.il</div>
      <div className="text-blue-300 text-[10px]">C11 · שנת מס 2024</div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div className="font-bold leading-tight text-[11px]">רשות המסים בישראל</div>
          <div className="text-blue-300 text-[9px]">Israel Tax Authority</div>
        </div>
        {/* State of Israel emblem — simple menorah shape in CSS */}
        <div className="text-[18px] leading-none opacity-90">🕎</div>
      </div>
    </div>
  );
}

function GovTitleBar() {
  return (
    <div className="bg-[#1e4d8c] text-white text-center px-4 py-2">
      <div className="text-[13px] font-bold tracking-wide">
        שידור דו״ח מס הכנסה ליחיד טופס 1301
      </div>
    </div>
  );
}

function GovNavBar({
  tabs,
  activeId,
  onSelect,
}: {
  tabs: FormTab[];
  activeId: string;
  onSelect: (id: FormTab["id"]) => void;
}) {
  return (
    <div className="bg-[#2d5f9e] flex">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={cn(
            "flex-1 py-2 text-xs font-medium transition-colors border-b-2",
            activeId === t.id
              ? "bg-white text-[#1a3f6a] font-bold border-[#fac832]"
              : "text-blue-100 border-transparent hover:bg-[#3a6db0] hover:text-white",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function FileInfoTable({ persona }: { persona: Persona }) {
  return (
    <div className="bg-white border-b border-stone-300 px-4 py-2.5">
      <div className="text-[10px] font-bold text-[#1a3f6a] mb-1.5 border-b border-stone-200 pb-1">
        פרטי תיק
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[11px]">
        <div className="flex gap-1.5">
          <span className="text-stone-500 shrink-0">מספר תיק:</span>
          <span className="font-mono font-semibold">{persona.business.osekFileNumber}</span>
        </div>
        <div className="flex gap-1.5">
          <span className="text-stone-500 shrink-0">שנת מס:</span>
          <span className="font-semibold">{persona.income.year}</span>
        </div>
        <div className="flex gap-1.5">
          <span className="text-stone-500 shrink-0">שם:</span>
          <span className="font-semibold">{persona.personal.lastName} {persona.personal.firstName}</span>
        </div>
        <div className="flex gap-1.5">
          <span className="text-stone-500 shrink-0">ת.ז.:</span>
          <span className="font-mono">{persona.personal.teudatZehut}</span>
        </div>
        <div className="col-span-2 flex gap-1.5">
          <span className="text-stone-500 shrink-0">עיסוק:</span>
          <span>{persona.business.primaryOccupation}</span>
        </div>
        <div className="flex gap-1.5">
          <span className="text-stone-500 shrink-0">בנק:</span>
          <span>{persona.bank.bankName} · סניף {persona.bank.branchCode}</span>
        </div>
        <div className="flex gap-1.5">
          <span className="text-stone-500 shrink-0">חשבון:</span>
          <span className="font-mono">{persona.bank.accountNumber}</span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Section + Field rendering — gov.il cream header style
   ────────────────────────────────────────────────────────── */
function SectionCard({
  section,
  persona,
}: {
  section: FormSection;
  persona: Persona;
}) {
  return (
    <div className="border border-[#c8c0a0] overflow-hidden" style={{ borderRadius: 1 }}>
      {/* Cream section header, matching gov.il */}
      <div className="bg-[#e8dfc0] border-b border-[#c8c0a0] px-3 py-1.5 flex items-center gap-2">
        {section.letter && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1a3f6a] text-white text-[9px] font-black shrink-0">
            {section.letter.replace(".", "")}
          </span>
        )}
        <span className="text-[12px] font-bold text-stone-800 leading-tight">
          {section.title}
        </span>
        {section.description && (
          <span className="mr-auto text-[10px] text-stone-500">{section.description}</span>
        )}
      </div>

      {/* Column header row for two-filer layout */}
      <div className="grid bg-[#f5f0e0] border-b border-[#c8c0a0] px-3 py-1 text-[10px] text-stone-500" style={{ gridTemplateColumns: "1fr 140px 36px" }}>
        <div>פרטים</div>
        <div className="text-center">בן הזוג הרשום</div>
        <div />
      </div>

      <div className="divide-y divide-stone-100 bg-white">
        {section.fields.map((f, i) => (
          <FieldRow key={i} field={f} persona={persona} />
        ))}
      </div>
    </div>
  );
}

function isNotApplicable(field: FormField, persona: Persona): boolean {
  if (field.status !== "calculated" || !field.calculator) return false;
  const result = calculate(field.calculator, persona);
  return result?.value === false;
}

function FieldRow({
  field,
  persona,
}: {
  field: FormField;
  persona: Persona;
}) {
  const isSkip = field.status === "skip";
  const notApplicable = !isSkip && isNotApplicable(field, persona);
  const isDimmed = isSkip || notApplicable;

  return (
    <div
      className={cn(
        "grid items-center gap-2 px-3 py-1.5",
        isDimmed && "opacity-40",
      )}
      style={{ gridTemplateColumns: "1fr 140px 36px" }}
    >
      {/* Label + hint */}
      <div className="min-w-0">
        <span
          className={cn(
            "text-[12px] text-stone-800 leading-snug",
            isSkip && "line-through decoration-stone-400",
          )}
        >
          {field.label}
        </span>
        {field.hint && !isDimmed && (
          <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">
            {field.hint}
          </p>
        )}
      </div>

      {/* Value — looks like a form input box */}
      <div className="flex items-center justify-center">
        <FieldValue field={field} persona={persona} notApplicable={notApplicable} />
      </div>

      {/* Field code badge — red, on the left of the value column (RTL: left = code side) */}
      <div className="flex items-center justify-end">
        {field.code && (
          <span className="inline-flex items-center justify-center min-w-[28px] px-1 py-0.5 rounded-sm text-[9px] font-bold bg-[#c62828] text-white font-mono">
            {field.code}
          </span>
        )}
      </div>
    </div>
  );
}

function FieldValue({
  field,
  persona,
  notApplicable,
}: {
  field: FormField;
  persona: Persona;
  notApplicable?: boolean;
}) {
  if (field.status === "calculated" && field.calculator) {
    if (notApplicable) {
      return (
        <span className="text-[11px] text-stone-400 italic">לא רלוונטי</span>
      );
    }
    const result = calculate(field.calculator, persona);
    if (result && result.value !== false) {
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
      <span className="inline-block border border-stone-300 bg-white px-2 py-0.5 text-[12px] font-medium text-stone-700 min-w-[100px] text-center">
        {renderPersonalValue(v, field)}
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
    if (v === "false" || v === "true") return v === "true" ? "כן" : "לא";
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

function DisclaimerFooter() {
  return (
    <div className="bg-stone-50 border-t border-stone-200 px-4 py-2.5 text-[10px] text-stone-400 leading-relaxed text-center">
      ✦ ערכים מחושבים ע״י countme מבוססים על נתוני הלקוח — המידע אינו מהווה ייעוץ מס.
      האחריות על נכונות הפרטים המוגשים לרשות המסים חלה על הממלא/ת בלבד.
    </div>
  );
}
