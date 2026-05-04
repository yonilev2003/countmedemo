"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPersona } from "@/lib/setup-storage";
import { Persona, readPersonaPath } from "@/lib/persona";
import { form1301 } from "@/lib/form-1301/schema";
import { calculate } from "@/lib/calculators/index";
import { CopyButton } from "@/components/form-1301/copy-button";

function formatValue(value: number | string | boolean | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "כן" : "לא";
  if (typeof value === "number") return value.toLocaleString("he-IL");
  return String(value);
}

export default function ExpertPage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);

  useEffect(() => {
    const p = loadPersona();
    if (!p) {
      router.push("/setup");
      return;
    }
    setPersona(p);
  }, [router]);

  if (!persona) return null;

  return (
    <div className="min-h-screen bg-cream">
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
            <span className="font-bold">countme · מבט מומחה</span>
          </div>
          <Link
            href="/demo"
            className="rounded-full border border-brand-navy/20 px-3 py-1 text-xs text-brand-navy hover:bg-info/20"
          >
            טופס Gov.il ←
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-screen-lg px-6 py-8">
        <h1 className="font-display text-2xl font-bold text-brand-navy mb-6">
          טופס 1301 — שנת מס {persona.income.year} · {persona.personal.firstName}{" "}
          {persona.personal.lastName}
        </h1>

        {form1301.map((tab) => (
          <div key={tab.id} className="mb-8">
            <h2 className="text-lg font-bold text-brand-navy/80 mb-4 pb-2 border-b border-brand-navy/10">
              {tab.label}
            </h2>
            {tab.sections.map((section) => (
              <div key={section.title} className="mb-6">
                <h3 className="text-sm font-semibold text-stone-600 mb-2">
                  {section.letter ? `${section.letter} ` : ""}
                  {section.title}
                </h3>
                <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {section.fields.map((field, idx) => {
                        let displayValue: string;
                        if (field.calculator) {
                          const calc = calculate(field.calculator, persona);
                          displayValue = calc ? formatValue(calc.value) : "—";
                        } else if (field.personaPath) {
                          const raw = readPersonaPath(persona, field.personaPath);
                          displayValue = raw !== undefined && raw !== null
                            ? String(raw)
                            : "—";
                        } else {
                          displayValue = "—";
                        }

                        const showCopy =
                          displayValue !== "—" && displayValue !== "0";

                        return (
                          <tr
                            key={`${field.code ?? "no-code"}-${idx}`}
                            className={
                              idx % 2 === 0 ? "bg-white" : "bg-stone-50/50"
                            }
                          >
                            <td className="px-4 py-2.5 w-16">
                              {field.code ? (
                                <span className="inline-block rounded bg-alert/10 px-1.5 py-0.5 text-xs font-mono text-alert">
                                  {field.code}
                                </span>
                              ) : (
                                <span className="inline-block w-6" />
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-stone-700 flex-1">
                              {field.label}
                            </td>
                            <td
                              className="px-4 py-2.5 font-semibold text-brand-navy"
                              dir="ltr"
                            >
                              {displayValue}
                            </td>
                            <td className="px-4 py-2.5 w-28">
                              {showCopy && (
                                <CopyButton value={displayValue} />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="mt-8 rounded-xl border border-success/30 bg-success/5 p-4 text-center">
          <p className="text-sm text-stone-700">
            כל הנתונים מוכנים. עכשיו פתח/י את{" "}
            <Link href="/demo" className="text-success font-medium hover:underline">
              טופס 1301 של gov.il
            </Link>{" "}
            והעתק/י את הערכים.
          </p>
        </div>
      </main>
    </div>
  );
}
