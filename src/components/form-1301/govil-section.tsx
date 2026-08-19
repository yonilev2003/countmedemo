"use client";

/**
 * Gov.il-faithful section renderer — the SectionCard + FieldRow + FieldValue
 * machinery extracted from form-preview.tsx so it can be reused by the
 * companion track (and any other place that wants a snippet of the real form).
 */

import { FormField, FormSection, form1301 } from "@/lib/form-1301/schema";
import { calculate } from "@/lib/calculators";
import { Persona, readPersonaPath } from "@/lib/persona";
import { cn } from "@/lib/utils";
import { InteractiveValue } from "./interactive-value";
import { InlineCopyButton } from "./copy-button";
import { formatFieldValue } from "@/lib/form-1301/format-value";

/** Find form sections that contain any of the given field codes. */
export function findSectionsByCodes(codes: string[]): FormSection[] {
  if (codes.length === 0) return [];
  const wanted = new Set(codes);
  const out: FormSection[] = [];
  for (const tab of form1301) {
    for (const section of tab.sections) {
      if (section.fields.some((f) => f.code && wanted.has(f.code))) {
        out.push(section);
      }
    }
  }
  return out;
}

interface GovilSectionsProps {
  persona: Persona;
  /** Field codes to focus on — sections containing any of these are rendered. */
  fieldCodes: string[];
  /** When provided, fields whose code is NOT in this list are dimmed. */
  highlightCodes?: string[];
}

/**
 * Renders a gov.il-faithful slice of Form 1301 — just the sections relevant
 * to the given field codes. Uses the same blue-grey palette and copy buttons
 * as /demo, so visually the user sees the actual form snippet.
 */
export function GovilSections({
  persona,
  fieldCodes,
  highlightCodes,
}: GovilSectionsProps) {
  const sections = findSectionsByCodes(fieldCodes);
  if (sections.length === 0) return null;
  return (
    <div
      className="bg-[#f5f7fa] p-3 space-y-2 border border-stone-300"
      style={{ borderRadius: 2 }}
    >
      {sections.map((s) => (
        <SectionCard
          key={s.title}
          section={s}
          persona={persona}
          highlightCodes={highlightCodes ?? fieldCodes}
        />
      ))}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   SectionCard — gov.il blue-grey section header style.
   When highlightCodes is provided, fields outside it are dimmed,
   guiding the user to the relevant ones for the current step.
   ─────────────────────────────────────────────────────────── */
export function SectionCard({
  section,
  persona,
  highlightCodes,
}: {
  section: FormSection;
  persona: Persona;
  highlightCodes?: string[];
}) {
  return (
    <div
      className="border border-[#9bb5cf] overflow-hidden bg-white"
      style={{ borderRadius: 2 }}
    >
      <div className="bg-gradient-to-l from-[#dde7f0] to-[#cdddec] border-b border-[#9bb5cf] px-3 py-2 flex items-center gap-2">
        {section.letter && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1a3f6a] text-white text-[9px] font-black shrink-0">
            {section.letter.replace(".", "")}
          </span>
        )}
        <span className="text-[12px] font-bold text-[#1a3f6a] leading-tight">
          {section.title}
        </span>
        {section.description && (
          <span className="mr-auto text-[10px] text-[#3a5775]">
            {section.description}
          </span>
        )}
      </div>

      {/* Column-header row mirrors the FieldRow grid below — only meaningful
          in the 4-column desktop layout, so it's hidden on the stacked
          mobile layout (task: don't let it mislabel the stacked rows). */}
      <div
        className="hidden sm:grid bg-[#eef3f8] border-b border-[#bdcde0] px-3 py-1 text-[10px] text-[#3a5775] font-medium"
        style={{ gridTemplateColumns: "1fr 28px 140px 36px" }}
      >
        <div>פרטים</div>
        <div />
        <div className="text-center">בן/בת הזוג הרשום</div>
        <div />
      </div>

      <div className="divide-y divide-stone-100 bg-white">
        {section.fields.map((f, i) => {
          const isHighlighted =
            !highlightCodes ||
            (f.code !== undefined && highlightCodes.includes(f.code));
          return (
            <FieldRow
              key={i}
              field={f}
              persona={persona}
              isHighlighted={isHighlighted}
            />
          );
        })}
      </div>
    </div>
  );
}

function FieldRow({
  field,
  persona,
  isHighlighted = true,
}: {
  field: FormField;
  persona: Persona;
  isHighlighted?: boolean;
}) {
  const isSkip = field.status === "skip";
  // Compute the calculator ONCE per row and thread the result down — this
  // used to run identically in isNotApplicable + rawCopyValue + FieldValue
  // (3x per rendered field; efficiency-audit finding).
  const calc =
    field.status === "calculated" && field.calculator
      ? calculate(field.calculator, persona)
      : null;
  const notApplicable = !isSkip && calc?.value === false;
  // Dim irrelevant fields (skip, not applicable, or outside highlight).
  const isDimmed = isSkip || notApplicable || !isHighlighted;

  const copyValue = !isDimmed ? rawCopyValue(field, persona, calc) : null;

  return (
    // Mobile (<sm): stacked — label on its own full-width line, then a
    // compact row of copy-button / value / code-chip beneath it.
    // Desktop (>=sm): `sm:grid` + the original inline gridTemplateColumns
    // restores today's exact 4-column layout (label | copy | value | code).
    <div
      className={cn(
        "flex flex-col gap-1.5 px-3 py-1.5",
        "sm:grid sm:items-center sm:gap-2",
        isDimmed && "opacity-40",
      )}
      style={{ gridTemplateColumns: "1fr 28px 140px 36px" }}
    >
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

      {/* `sm:contents` makes this wrapper disappear at the desktop
          breakpoint so its three children become direct grid items again
          (same DOM order → same 4 grid columns as before). Below sm it's a
          plain flex row: copy-button, value, code-chip. */}
      <div className="flex items-center gap-2 sm:contents">
        <div className="flex items-center justify-center">
          {copyValue !== null && <InlineCopyButton value={copyValue} />}
        </div>

        <div className="flex items-center justify-center flex-1 min-w-0">
          <FieldValue
            field={field}
            persona={persona}
            calc={calc}
            notApplicable={notApplicable}
          />
        </div>

        <div className="flex items-center justify-end">
          {field.code && (
            <span className="inline-flex items-center justify-center min-w-[28px] px-1 py-0.5 rounded-sm text-[9px] font-bold bg-[#c62828] text-white font-mono">
              {field.code}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Returns the string to paste into gov.il — must match what's displayed in the
 * cell (Hebrew enum labels, formatted dates, etc.).
 */
function rawCopyValue(
  field: FormField,
  persona: Persona,
  calc: ReturnType<typeof calculate> | null,
): string | null {
  if (field.status === "calculated" && field.calculator) {
    const r = calc;
    if (!r || r.value === false || r.value === null || r.value === undefined)
      return null;
    if (typeof r.value === "number" && r.value === 0) return null;
    const rendered = formatFieldValue(r.value, field);
    return rendered === "—" ? null : rendered;
  }
  if (field.status === "personal" && field.personaPath) {
    const v = readPersonaPath(persona, field.personaPath);
    if (v === null || v === undefined || v === "") return null;
    const rendered = formatFieldValue(v, field);
    return rendered === "—" ? null : rendered;
  }
  return null;
}

function FieldValue({
  field,
  persona,
  calc,
  notApplicable,
}: {
  field: FormField;
  persona: Persona;
  calc: ReturnType<typeof calculate> | null;
  notApplicable?: boolean;
}) {
  if (field.status === "calculated" && field.calculator) {
    if (notApplicable) {
      return (
        <span className="text-[11px] text-stone-400 italic">לא רלוונטי</span>
      );
    }
    const result = calc;
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
    const hasValue = v != null && v !== "";
    const display = formatFieldValue(v, field);
    return (
      <span
        className={cn(
          "inline-block border px-2 py-0.5 text-[12px] font-medium min-w-[100px] text-center",
          hasValue
            ? "border-[#a8b8c8] bg-[#eef3f8] text-[#1a3f6a]"
            : "border-stone-300 bg-white text-stone-400",
        )}
      >
        {display}
      </span>
    );
  }

  return <span className="text-xs text-stone-300">—</span>;
}
