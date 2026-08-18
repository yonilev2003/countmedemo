"use client";

import { useState } from "react";
import { form1219, Form1219Tab, Form1219TabId } from "@/lib/form-1219/schema";
import { Persona } from "@/lib/persona";
import { calculate } from "@/lib/calculators";
import { cn } from "@/lib/utils";
import { SectionCard } from "@/components/form-1301/govil-section";

interface Props {
  persona: Persona;
  /**
   * The resolved schema for this filing year (see lib/form-1301/get-form-schema.ts).
   * Optional and defaults to the static `form1219` export so any caller that
   * hasn't been wired to the year-keyed resolver yet keeps working unchanged.
   */
  schema?: Form1219Tab[];
}

/**
 * Gov.il-faithful renderer for Form 1219 (הצהרת הון). Reuses the 1301
 * `SectionCard` (clickable calculated values via the shared dispatcher, which
 * includes the capital calculators) and mirrors the gov chrome, with three tabs:
 * assets / liabilities / net-capital summary.
 */
export function Form1219Preview({ persona, schema = form1219 }: Props) {
  const [activeTab, setActiveTab] = useState<Form1219TabId>("assets");
  const tab = schema.find((t) => t.id === activeTab) ?? schema[0];
  const declarationDate = persona.capitalDeclaration?.declarationDate;

  return (
    <div
      className="overflow-hidden border border-stone-400 shadow-sm bg-white"
      style={{ borderRadius: 2 }}
    >
      {/* Gov top bar */}
      <div className="bg-[#1a3f6a] text-white px-4 py-1.5 flex items-center justify-between text-[11px]">
        <div className="font-extrabold tracking-wider">gov.il</div>
        <div className="text-blue-300 text-[10px]">טופס 1219</div>
        <div className="text-right">
          <div className="font-bold leading-tight text-[11px]">רשות המסים בישראל</div>
          <div className="text-blue-300 text-[9px]">Israel Tax Authority</div>
        </div>
      </div>

      {/* Title bar */}
      <div className="bg-[#cdddec] bg-gradient-to-b from-[#cdddec] to-[#dde7f0] px-4 py-2 border-b border-stone-300">
        <h2 className="text-[13px] font-bold text-[#1a3f6a]">
          הצהרה על הון והתחייבויות ליחיד — טופס 1219
        </h2>
        {declarationDate && (
          <div className="text-[11px] text-stone-600 mt-0.5">
            נכון לתאריך: {new Date(declarationDate).toLocaleDateString("he-IL")}
          </div>
        )}
      </div>

      {/* Tab strip */}
      <div className="flex bg-[#eef3f8] border-b border-stone-300">
        {schema.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "px-4 py-2 text-[12px] font-semibold border-l border-stone-300 transition-colors",
              t.id === activeTab
                ? "bg-white text-[#1a3f6a] border-b-2 border-b-[#1a3f6a]"
                : "text-stone-600 hover:bg-white/60",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sections */}
      <div className="bg-[#f5f7fa] px-3 py-3 space-y-2">
        {tab.sections.map((s, i) => (
          <SectionCard key={i} section={s} persona={persona} />
        ))}
      </div>

      {/* Facts-not-advice footer */}
      <div className="bg-white border-t border-stone-300 px-4 py-2.5">
        <p className="text-[10.5px] text-stone-500 leading-relaxed">
          הסכומים מחושבים מהנתונים שהזנת — countme מסכם ומציג מקורות, לא מייעץ. כללי
          שומה והערכת שווי טעונים אימות מול רואה/ת חשבון.
        </p>
      </div>
    </div>
  );
}
