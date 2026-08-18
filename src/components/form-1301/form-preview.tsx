"use client";

import { useState } from "react";
import { form1301, FormTab } from "@/lib/form-1301/schema";
import { Persona } from "@/lib/persona";
import { cn } from "@/lib/utils";
import { LEGAL_NOTE_LINE } from "@/components/brand/legal-note";
import { SectionCard } from "./govil-section";

interface Props {
  persona: Persona;
  /** Called when the user clicks the bottom "המשך" button — same destination as the page-level "ראה הערכת מס" CTA. */
  onContinue?: () => void;
  /**
   * The resolved schema for this filing year (see lib/form-1301/get-form-schema.ts).
   * Optional and defaults to the static `form1301` export so any caller that
   * hasn't been wired to the year-keyed resolver yet keeps working unchanged.
   */
  schema?: FormTab[];
}

export function FormPreview({ persona, onContinue, schema = form1301 }: Props) {
  const [activeTab, setActiveTab] = useState<FormTab["id"]>("personal");
  const tab = schema.find((t) => t.id === activeTab) ?? schema[0];

  return (
    <div
      // overflow-x-auto (not overflow-hidden) so that if any chrome row is
      // still wider than a narrow viewport, it scrolls into view instead of
      // being silently clipped. No horizontal overflow occurs at desktop
      // widths, so this is a no-op there (no visible scrollbar).
      className="overflow-x-auto border border-stone-400 shadow-sm bg-white"
      style={{ borderRadius: 2 }}
    >
      <GovTopBar year={persona.income.year} />
      <GovTitleBar />
      <GovNavBar
        tabs={schema}
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id)}
      />
      <FileInfoTable persona={persona} />

      <div className="bg-[#f5f7fa] px-3 py-3 space-y-2">
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

/* ───────────────────────────────────────────────────────────
   Gov.il chrome — top bar, title bar, tab strip, file info.
   ─────────────────────────────────────────────────────────── */
function GovTopBar({ year }: { year: number }) {
  return (
    <div className="bg-[#1a3f6a] text-white px-4 py-1.5 flex items-center justify-between text-[11px]">
      <div className="font-extrabold tracking-wider">gov.il</div>
      <div className="text-blue-300 text-[10px]">C11 · שנת מס {year}</div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div className="font-bold leading-tight text-[11px]">
            רשות המסים בישראל
          </div>
          <div className="text-blue-300 text-[9px]">Israel Tax Authority</div>
        </div>
        <div className="text-[18px] leading-none opacity-90">🕮</div>
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
    <div className="bg-white border-b border-[#bdcde0] px-4 py-2.5">
      <div className="text-[10px] font-bold text-[#1a3f6a] mb-1.5 border-b border-[#cdddec] pb-1">
        פרטי תיק
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[11px]">
        <div className="flex gap-1.5">
          <span className="text-stone-500 shrink-0">מספר תיק:</span>
          <span className="font-mono font-semibold">
            {persona.business.osekFileNumber}
          </span>
        </div>
        <div className="flex gap-1.5">
          <span className="text-stone-500 shrink-0">שנת מס:</span>
          <span className="font-semibold">{persona.income.year}</span>
        </div>
        <div className="flex gap-1.5">
          <span className="text-stone-500 shrink-0">שם:</span>
          <span className="font-semibold">
            {persona.personal.lastName} {persona.personal.firstName}
          </span>
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
          <span>
            {persona.bank.bankName} · סניף {persona.bank.branchCode}
          </span>
        </div>
        <div className="flex gap-1.5">
          <span className="text-stone-500 shrink-0">חשבון:</span>
          <span className="font-mono">{persona.bank.accountNumber}</span>
        </div>
      </div>
    </div>
  );
}

function DisclaimerFooter() {
  // gov.il-faithful styling kept (brand-exempt per CLAUDE.md); the TEXT is the
  // shared canonical string (WS8 audit H9 — import the string, not the styled
  // component). The ✦ glyph is owned by a later icon pass.
  return (
    <div className="bg-stone-50 border-t border-stone-200 px-4 py-2.5 text-[10px] text-stone-400 leading-relaxed text-center">
      ✦ ערכים מחושבים ע״י countme מבוססים על נתוני הלקוח. {LEGAL_NOTE_LINE}
    </div>
  );
}
