"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPersona } from "@/lib/setup-storage";
import { Persona, readPersonaPath } from "@/lib/persona";
import { form1301, FormField } from "@/lib/form-1301/schema";
import { calculate } from "@/lib/calculators/index";
import { CopyButton } from "@/components/form-1301/copy-button";
import { FORM_MODULES } from "@/lib/form-1301/modules";

function formatValue(value: number | string | boolean | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "כן" : "לא";
  if (typeof value === "number") return value.toLocaleString("he-IL");
  return String(value);
}

/** Flatten all fields from the schema into a single map by code */
function buildFieldMap(persona: Persona): Map<string, { field: FormField; displayValue: string }> {
  const map = new Map<string, { field: FormField; displayValue: string }>();
  for (const tab of form1301) {
    for (const section of tab.sections) {
      for (const field of section.fields) {
        if (!field.code) continue;
        let displayValue: string;
        if (field.calculator) {
          const calc = calculate(field.calculator, persona);
          displayValue = calc ? formatValue(calc.value) : "—";
        } else if (field.personaPath) {
          const raw = readPersonaPath(persona, field.personaPath);
          displayValue = raw !== undefined && raw !== null ? String(raw) : "—";
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
  const [moduleIndex, setModuleIndex] = useState(0); // 0-based index

  useEffect(() => {
    const p = loadPersona();
    if (!p) {
      router.push("/setup");
      return;
    }
    setPersona(p);
  }, [router]);

  if (!persona) return null;

  const totalModules = FORM_MODULES.length;
  const currentModule = FORM_MODULES[moduleIndex];
  const fieldMap = buildFieldMap(persona);
  const progress = ((moduleIndex + 1) / totalModules) * 100;

  const isLast = moduleIndex === totalModules - 1;

  function goNext() {
    if (!isLast) setModuleIndex((i) => i + 1);
  }

  function goBack() {
    if (moduleIndex > 0) setModuleIndex((i) => i - 1);
  }

  // Build the list of fields to display for this module
  const moduleFields = currentModule.fieldCodes
    .map((code) => fieldMap.get(code))
    .filter((entry): entry is { field: FormField; displayValue: string } => entry !== undefined);

  // For modules with no schema fields (3=contact, 4=business, 5=bank), show persona data
  const showContactInfo = currentModule.id === 3;
  const showBusinessInfo = currentModule.id === 4;
  const showBankInfo = currentModule.id === 5;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link
            href="/file"
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-brand-navy"
          >
            ← בחירת מסלול
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-bold text-white">
              c
            </div>
            <span className="font-bold">countme · מסלול מודרך</span>
          </div>
          <Link
            href="/demo"
            className="rounded-full border border-brand-navy/20 px-3 py-1 text-xs text-brand-navy hover:bg-info/20"
          >
            טופס Gov.il ←
          </Link>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-white border-b border-stone-100 px-6 py-3">
        <div className="mx-auto max-w-screen-md">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span>
              שלב {moduleIndex + 1} מתוך {totalModules} — {currentModule.title}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          {/* Step dots */}
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
                    : "bg-stone-200",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 mx-auto w-full max-w-screen-md px-6 py-8">
        {/* Module title */}
        <h1 className="font-display text-2xl font-bold text-brand-navy mb-6">
          {currentModule.title}
        </h1>

        {/* Eitan speech bubble */}
        <div className="flex gap-3 mb-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-white font-bold text-sm shadow-sm">
            ✦
          </div>
          <div className="rounded-2xl rounded-tr-sm bg-info px-4 py-3 text-sm text-stone-800 leading-relaxed">
            {currentModule.eitanIntro}
          </div>
        </div>

        {/* Fields from schema */}
        {moduleFields.length > 0 && (
          <div className="space-y-2 mb-4">
            {moduleFields.map(({ field, displayValue }) => {
              const showCopy = displayValue !== "—" && displayValue !== "0";
              return (
                <div
                  key={field.code}
                  className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-2.5"
                >
                  <span className="w-12 text-right text-xs font-mono text-alert/80 shrink-0">
                    {field.code}
                  </span>
                  <span className="flex-1 text-sm text-stone-700">
                    {field.label}
                  </span>
                  <span
                    className="font-semibold text-brand-navy text-sm"
                    dir="ltr"
                  >
                    {displayValue}
                  </span>
                  {showCopy && <CopyButton value={displayValue} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Contact info — module 3 */}
        {showContactInfo && (
          <div className="space-y-2 mb-4">
            <PersonaInfoRow label="כתובת" value={formatAddress(persona)} />
            <PersonaInfoRow label="דואר אלקטרוני" value={persona.contact.email} />
            <PersonaInfoRow label="טלפון נייד" value={persona.contact.phoneMobile} />
          </div>
        )}

        {/* Business info — module 4 */}
        {showBusinessInfo && (
          <div className="space-y-2 mb-4">
            <PersonaInfoRow label="שם העסק" value={persona.business.tradeName} />
            <PersonaInfoRow
              label="תחום עיסוק"
              value={persona.business.primaryOccupation}
            />
            <PersonaInfoRow
              label="סוג עוסק"
              value={persona.business.osekType === "patur" ? "עוסק פטור" : "עוסק מורשה"}
            />
            <PersonaInfoRow
              label="מספר תיק עוסק"
              value={persona.business.osekFileNumber}
            />
          </div>
        )}

        {/* Bank info — module 5 */}
        {showBankInfo && (
          <div className="space-y-2 mb-4">
            <PersonaInfoRow label="שם בנק" value={persona.bank.bankName} />
            <PersonaInfoRow label="קוד בנק" value={persona.bank.bankCode} copyable />
            <PersonaInfoRow label="קוד סניף" value={persona.bank.branchCode} copyable />
            <PersonaInfoRow
              label="מספר חשבון"
              value={persona.bank.accountNumber}
              copyable
            />
          </div>
        )}

        {/* Empty module fallback */}
        {moduleFields.length === 0 &&
          !showContactInfo &&
          !showBusinessInfo &&
          !showBankInfo && (
            <div className="rounded-lg border border-stone-200 bg-white px-4 py-4 text-sm text-stone-500 text-center">
              אין שדות ספציפיים לשלב זה — המידע משתקף בשלבים אחרים.
            </div>
          )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          {moduleIndex > 0 ? (
            <button
              onClick={goBack}
              className="rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            >
              ← חזרה
            </button>
          ) : (
            <div />
          )}

          {isLast ? (
            <Link
              href="/demo"
              className="rounded-xl bg-success px-6 py-2.5 text-sm font-bold text-white hover:bg-success/90 transition-colors shadow-sm"
            >
              סיום — פתח/י את טופס Gov.il →
            </Link>
          ) : (
            <button
              onClick={goNext}
              className="rounded-xl bg-brand-navy px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-navy/90 transition-colors shadow-sm"
            >
              המשך →
            </button>
          )}
        </div>

        {/* Step overview */}
        <div className="mt-6 text-center">
          <p className="text-xs text-stone-400">
            רוצה לדלג?{" "}
            <Link href="/file/expert" className="text-brand-navy hover:underline">
              עבור/י למבט מומחה
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function formatAddress(persona: Persona): string {
  const a = persona.contact.mailingAddress;
  const parts = [a.street, a.houseNumber, a.apartment, a.city, a.zipCode].filter(
    Boolean,
  );
  return parts.join(" ");
}

function PersonaInfoRow({
  label,
  value,
  copyable = false,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-2.5">
      <span className="flex-1 text-sm text-stone-600">{label}</span>
      <span className="font-semibold text-brand-navy text-sm" dir="ltr">
        {value || "—"}
      </span>
      {copyable && value && <CopyButton value={value} />}
    </div>
  );
}
