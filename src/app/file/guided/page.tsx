"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPersona, setPersonaPath } from "@/lib/setup-storage";
import { persistPersona } from "@/lib/data/persona-store";
import { Persona, readPersonaPath } from "@/lib/persona";
import { form1301, FormField } from "@/lib/form-1301/schema";
import { calculate } from "@/lib/calculators/index";
import { CopyButton } from "@/components/form-1301/copy-button";
import { FORM_MODULES } from "@/lib/form-1301/modules";
import { formatFieldValue } from "@/lib/form-1301/format-value";
import { Logo } from "@/components/brand/logo";
import { btn, Button } from "@/components/brand/button";
import {
  SparklesIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  PencilIcon,
} from "@/components/brand/icons";

function buildFieldMap(persona: Persona): Map<string, { field: FormField; displayValue: string }> {
  const map = new Map<string, { field: FormField; displayValue: string }>();
  for (const tab of form1301) {
    for (const section of tab.sections) {
      for (const field of section.fields) {
        if (!field.code) continue;
        let displayValue: string;
        if (field.calculator) {
          const calc = calculate(field.calculator, persona);
          displayValue = calc ? formatFieldValue(calc.value, field) : "—";
        } else if (field.personaPath) {
          const raw = readPersonaPath(persona, field.personaPath);
          displayValue = formatFieldValue(raw, field);
        } else {
          displayValue = "—";
        }
        map.set(field.code, { field, displayValue });
      }
    }
  }
  return map;
}

export default function GuidedPage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [moduleIndex, setModuleIndex] = useState(0);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    const p = loadPersona();
    if (!p) {
      router.push("/setup");
      return;
    }
    setPersona(p);
  }, [router]);

  if (!persona) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="space-y-3 w-96 animate-pulse">
        <div className="h-6 rounded-lg bg-sand w-1/2 mx-auto" />
        <div className="h-16 rounded-2xl bg-sand" />
        <div className="h-32 rounded-2xl bg-sand" />
        <div className="h-10 rounded-xl bg-sand w-1/3 me-auto" />
      </div>
    </div>
  );

  const totalModules = FORM_MODULES.length;
  const currentModule = FORM_MODULES[moduleIndex];
  const fieldMap = buildFieldMap(persona);
  const progress = ((moduleIndex + 1) / totalModules) * 100;
  const isLast = moduleIndex === totalModules - 1;

  function goNext() { if (!isLast) setModuleIndex((i) => i + 1); }
  function goBack() { if (moduleIndex > 0) setModuleIndex((i) => i - 1); }

  function updatePath(path: string, value: unknown) {
    if (!persona) return;
    const updated = setPersonaPath(persona, path, value);
    setPersona(updated);
    persistPersona(updated);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  const moduleFields = currentModule.fieldCodes
    .map((code) => fieldMap.get(code))
    .filter((entry): entry is { field: FormField; displayValue: string } => entry !== undefined);

  const showContactInfo = currentModule.id === 3;
  const showBusinessInfo = currentModule.id === 4;
  const showBankInfo = currentModule.id === 5;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link href="/file" className="flex items-center gap-2 text-sm text-muted hover:text-brand-navy">
            <ArrowRightIcon className="size-4" />
            בחירת מסלול
          </Link>
          <Link href="/" className="flex items-center gap-3">
            <Logo size={32} />
            <span className="font-bold text-brand-navy hidden sm:inline">מסלול מודרך</span>
          </Link>
          <Link href="/demo" className={btn("secondary", "sm")}>
            טופס Gov.il
            <ArrowLeftIcon className="size-4" />
          </Link>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-paper border-b border-line px-6 py-3">
        <div className="mx-auto max-w-screen-md">
          <div className="flex items-center justify-between text-xs text-muted mb-2">
            <span>שלב {moduleIndex + 1} מתוך {totalModules} — {currentModule.title}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="flex gap-1 items-center">
            {FORM_MODULES.map((m, idx) => (
              <div
                key={m.id}
                className={[
                  "h-1.5 flex-1 rounded-full transition-colors",
                  idx < moduleIndex
                    ? "bg-success"
                    : idx === moduleIndex
                    ? "bg-brand-navy"
                    : "bg-sand",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Saved flash */}
      {savedFlash && (
        <div className="fixed top-20 start-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 rounded-full bg-success text-white px-4 py-1.5 text-xs font-medium shadow-brand">
          <CheckCircleIcon className="size-3.5" />
          נשמר
        </div>
      )}

      <main className="flex-1 mx-auto w-full max-w-screen-md px-6 py-8">
        <h1 className="font-display text-2xl font-bold text-brand-navy mb-6">
          {currentModule.title}
        </h1>

        {/* Eitan bubble */}
        <div className="flex gap-3 mb-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy text-white shadow-brand-sm">
            <SparklesIcon className="size-4" />
          </div>
          <div className="rounded-2xl rounded-ts-none bg-info border border-line px-4 py-3 text-sm text-ink leading-relaxed">
            {currentModule.eitanIntro}
          </div>
        </div>

        {/* Schema fields */}
        {moduleFields.length > 0 && (
          <div className="space-y-2 mb-4">
            {moduleFields.map(({ field, displayValue }) => (
              <SchemaFieldRow
                key={field.code}
                field={field}
                displayValue={displayValue}
                persona={persona}
                onChange={updatePath}
              />
            ))}
          </div>
        )}

        {/* Contact info editable rows */}
        {showContactInfo && (
          <div className="space-y-2 mb-4">
            <EditableRow label="רחוב" value={persona.contact.mailingAddress.street} path="contact.mailingAddress.street" onChange={updatePath} />
            <EditableRow label="מספר בית" value={persona.contact.mailingAddress.houseNumber} path="contact.mailingAddress.houseNumber" onChange={updatePath} />
            <EditableRow label="עיר" value={persona.contact.mailingAddress.city} path="contact.mailingAddress.city" onChange={updatePath} />
            <EditableRow label="מיקוד" value={persona.contact.mailingAddress.zipCode} path="contact.mailingAddress.zipCode" onChange={updatePath} />
            <EditableRow label="דואר אלקטרוני" value={persona.contact.email} path="contact.email" onChange={updatePath} type="email" />
            <EditableRow label="טלפון נייד" value={persona.contact.phoneMobile} path="contact.phoneMobile" onChange={updatePath} type="tel" />
          </div>
        )}

        {/* Business info editable rows */}
        {showBusinessInfo && (
          <div className="space-y-2 mb-4">
            <EditableRow label="שם העסק" value={persona.business.tradeName} path="business.tradeName" onChange={updatePath} />
            <EditableRow label="תחום עיסוק" value={persona.business.primaryOccupation} path="business.primaryOccupation" onChange={updatePath} />
            <ReadOnlyRow label="סוג עוסק" value={persona.business.osekType === "patur" ? "עוסק פטור" : "עוסק מורשה"} hint="ניתן לשנות במסך הכנסת הנתונים" />
            <EditableRow label="מספר תיק עוסק" value={persona.business.osekFileNumber} path="business.osekFileNumber" onChange={updatePath} copyable />
          </div>
        )}

        {/* Bank info editable rows */}
        {showBankInfo && (
          <div className="space-y-2 mb-4">
            <EditableRow label="שם בנק" value={persona.bank.bankName} path="bank.bankName" onChange={updatePath} />
            <EditableRow label="קוד בנק" value={persona.bank.bankCode} path="bank.bankCode" onChange={updatePath} copyable />
            <EditableRow label="קוד סניף" value={persona.bank.branchCode} path="bank.branchCode" onChange={updatePath} copyable />
            <EditableRow label="מספר חשבון" value={persona.bank.accountNumber} path="bank.accountNumber" onChange={updatePath} copyable />
          </div>
        )}

        {/* Empty state */}
        {moduleFields.length === 0 && !showContactInfo && !showBusinessInfo && !showBankInfo && (
          <div className="rounded-2xl border border-line bg-paper px-4 py-4 text-sm text-muted text-center">
            אין שדות ספציפיים לשלב זה — המידע משתקף בשלבים אחרים.
          </div>
        )}

        <p className="mt-4 text-center text-[11px] text-faint leading-relaxed">
          עריכה שומרת אוטומטית — הערכים מתעדכנים מיד גם ב-/demo, ב-/dashboard, ובהכנסת הנתונים.
        </p>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          {moduleIndex > 0 ? (
            <Button variant="secondary" size="sm" onClick={goBack}>
              <ArrowRightIcon className="size-4" />
              חזרה
            </Button>
          ) : (
            <div />
          )}
          {isLast ? (
            <Link href="/demo" className={btn("primary")}>
              סיום — פתח/י את טופס Gov.il
              <ArrowLeftIcon className="size-4" />
            </Link>
          ) : (
            <Button variant="primary" onClick={goNext}>
              המשך
              <ArrowLeftIcon className="size-4" />
            </Button>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-faint">
            רוצה לדלג?{" "}
            <Link href="/demo" className="text-brand-deep hover:underline">
              עבור/י למבט מומחה (טופס gov.il עם העתקה)
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function SchemaFieldRow({
  field,
  displayValue,
  persona,
  onChange,
}: {
  field: FormField;
  displayValue: string;
  persona: Persona;
  onChange: (path: string, value: unknown) => void;
}) {
  const isPersonal = field.status === "personal" && field.personaPath;
  const isCalc = field.status === "calculated";
  const showCopy = displayValue !== "—" && displayValue !== "0";
  const hint = isCalc ? "מחושב מנתוני הפרסונה" : "ניתן לעריכה";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-paper px-4 py-2.5">
      <span className="w-12 text-end text-xs font-mono text-alert/80 shrink-0">{field.code}</span>
      <span className="flex-1 text-sm text-ink">{field.label}</span>
      {isPersonal ? (
        <InlineEdit
          value={String(readPersonaPath(persona, field.personaPath!) ?? "")}
          path={field.personaPath!}
          onChange={onChange}
          type={field.kind === "currency" || field.kind === "integer" ? "number" : "text"}
        />
      ) : (
        <span className="font-semibold text-brand-navy text-sm" dir="ltr" title={hint}>
          {displayValue}
        </span>
      )}
      {showCopy && <CopyButton value={displayValue} />}
    </div>
  );
}

function EditableRow({
  label,
  value,
  path,
  onChange,
  type = "text",
  copyable = false,
}: {
  label: string;
  value: string | null | undefined;
  path: string;
  onChange: (path: string, value: unknown) => void;
  type?: "text" | "tel" | "email" | "number";
  copyable?: boolean;
}) {
  const display = value ?? "";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-paper px-4 py-2.5">
      <span className="flex-1 text-sm text-muted">{label}</span>
      <InlineEdit value={display} path={path} onChange={onChange} type={type} />
      {copyable && display && <CopyButton value={display} />}
    </div>
  );
}

function ReadOnlyRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-cream px-4 py-2.5">
      <span className="flex-1 text-sm text-muted">{label}</span>
      <span className="font-semibold text-ink text-sm" title={hint}>
        {value}
      </span>
    </div>
  );
}

function InlineEdit({
  value,
  path,
  onChange,
  type = "text",
}: {
  value: string;
  path: string;
  onChange: (path: string, value: unknown) => void;
  type?: "text" | "tel" | "email" | "number";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }
  function commit() {
    setEditing(false);
    if (draft === value) return;
    const out = type === "number" ? Number(draft) || 0 : draft;
    onChange(path, out);
  }

  if (editing) {
    return (
      <input
        type={type}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="rounded-lg border border-brand-deep bg-paper px-2 py-0.5 text-sm font-semibold text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-deep min-w-[140px] text-end"
        dir={type === "tel" || type === "email" || type === "number" ? "ltr" : "rtl"}
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      className="group flex items-center gap-1.5 rounded-lg px-2 py-0.5 hover:bg-aqua-soft transition-colors"
      title="לחץ/י לעריכה"
    >
      <span className="font-semibold text-brand-navy text-sm" dir="ltr">
        {value || <span className="text-faint italic">—</span>}
      </span>
      <PencilIcon className="size-3.5 text-faint group-hover:text-brand-deep transition-colors" />
    </button>
  );
}
