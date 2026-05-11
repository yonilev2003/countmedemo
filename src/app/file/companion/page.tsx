"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPersona } from "@/lib/setup-storage";
import { Persona, readPersonaPath } from "@/lib/persona";
import { form1301, FormField } from "@/lib/form-1301/schema";
import { calculate } from "@/lib/calculators/index";
import { CopyButton } from "@/components/form-1301/copy-button";
import { FORM_MODULES, PointerPosition } from "@/lib/form-1301/modules";
import {
  PLACEHOLDER_EITAN,
  PLACEHOLDER_SCREENSHOT,
} from "@/lib/form-1301/companion-assets";

function formatValue(v: number | string | boolean | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "כן" : "לא";
  if (typeof v === "number") return v.toLocaleString("he-IL");
  return String(v);
}

function buildFieldMap(
  persona: Persona,
): Map<string, { field: FormField; displayValue: string }> {
  const map = new Map<string, { field: FormField; displayValue: string }>();
  for (const tab of form1301) {
    for (const section of tab.sections) {
      for (const field of section.fields) {
        if (!field.code) continue;
        let displayValue: string;
        if (field.calculator) {
          const r = calculate(field.calculator, persona);
          displayValue = r ? formatValue(r.value) : "—";
        } else if (field.personaPath) {
          const raw = readPersonaPath(persona, field.personaPath);
          displayValue =
            raw !== undefined && raw !== null ? String(raw) : "—";
        } else {
          displayValue = "—";
        }
        map.set(field.code, { field, displayValue });
      }
    }
  }
  return map;
}

/** Hook wrapping the Web Speech API for Hebrew narration. */
function useHebrewSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function speak(text: string) {
    if (!supported || typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "he-IL";
    utter.rate = 0.95;
    utter.pitch = 1.05;
    const voices = synth.getVoices();
    const heVoice = voices.find((v) => v.lang.startsWith("he"));
    if (heVoice) utter.voice = heVoice;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    synth.speak(utter);
    setSpeaking(true);
  }

  function stop() {
    if (!supported || typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  return { speaking, supported, speak, stop };
}

export default function CompanionPage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [moduleIndex, setModuleIndex] = useState(0);
  const { speaking, supported, speak, stop } = useHebrewSpeech();
  const lastIndexRef = useRef(moduleIndex);

  useEffect(() => {
    const p = loadPersona();
    if (!p) {
      router.push("/setup");
      return;
    }
    setPersona(p);
  }, [router]);

  useEffect(() => {
    if (lastIndexRef.current !== moduleIndex) {
      stop();
      lastIndexRef.current = moduleIndex;
    }
  }, [moduleIndex, stop]);

  if (!persona) return null;

  const totalModules = FORM_MODULES.length;
  const currentModule = FORM_MODULES[moduleIndex];
  const fieldMap = buildFieldMap(persona);
  const isLast = moduleIndex === totalModules - 1;
  const isFirst = moduleIndex === 0;

  const narration = currentModule.narration ?? currentModule.eitanIntro;

  const moduleFields = currentModule.fieldCodes
    .map((c) => fieldMap.get(c))
    .filter(
      (e): e is { field: FormField; displayValue: string } => e !== undefined,
    );

  function goNext() {
    if (!isLast) setModuleIndex((i) => i + 1);
  }
  function goBack() {
    if (!isFirst) setModuleIndex((i) => i - 1);
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="mx-auto flex max-w-screen-sm items-center justify-between px-4 py-3">
          <Link
            href="/file"
            className="text-sm text-stone-600 hover:text-brand-navy"
          >
            ← מסלולים
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <span className="font-bold text-brand-navy text-sm">ליווי צמוד</span>
            <span className="text-xs rounded-full bg-info px-2 py-0.5 text-brand-navy font-mono">
              {moduleIndex + 1}/{totalModules}
            </span>
          </div>
          <Link
            href="/demo"
            className="text-xs text-stone-400 hover:text-brand-navy"
          >
            דלג ←
          </Link>
        </div>
        <div className="mx-auto max-w-screen-sm px-4 pb-2">
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
      </header>

      <main className="flex-1 mx-auto w-full max-w-screen-sm px-4 py-5 space-y-4">
        <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-brand-navy/60 mb-1">
            שלב {moduleIndex + 1} מתוך {totalModules}
          </p>
          <h1 className="font-display text-2xl font-bold text-brand-navy">
            {currentModule.title}
          </h1>
        </div>

        <div className="rounded-2xl bg-info border border-brand-navy/10 p-4 relative">
          <div className="flex items-start gap-3 pl-12">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-white font-bold text-sm shadow-sm">
              ✦
            </div>
            <p className="text-sm text-stone-800 leading-relaxed flex-1">
              {currentModule.eitanIntro}
            </p>
          </div>
          {supported && (
            <button
              onClick={() => speak(narration)}
              className={[
                "absolute top-3 left-3 h-9 w-9 rounded-full flex items-center justify-center transition-colors shadow-sm",
                speaking
                  ? "bg-alert text-white animate-pulse"
                  : "bg-white text-brand-navy hover:bg-brand-navy hover:text-white border border-brand-navy/20",
              ].join(" ")}
              aria-label={speaking ? "עצור הקראה" : "הקראה קולית"}
              title={speaking ? "עצור" : "הקראה קולית"}
            >
              {speaking ? "■" : "🔊"}
            </button>
          )}
        </div>

        <div className="relative rounded-2xl bg-white border border-stone-200 overflow-hidden shadow-sm">
          <ScreenshotImage src={currentModule.screenshot} />
          {currentModule.picture && (
            <EitanPointer
              src={currentModule.picture}
              position={currentModule.pointerPosition ?? "bottom-right"}
            />
          )}
        </div>

        {moduleFields.length > 0 && (
          <div className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
            <div className="bg-stone-50 px-4 py-2 border-b border-stone-200">
              <p className="text-xs font-semibold text-stone-500">
                ערכים להעתקה — הקש/י על 📋 לכל שדה
              </p>
            </div>
            <div className="divide-y divide-stone-100">
              {moduleFields.map(({ field, displayValue }) => {
                const showCopy =
                  displayValue !== "—" && displayValue !== "0";
                return (
                  <div
                    key={field.code}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className="inline-block rounded bg-alert/10 px-1.5 py-0.5 text-xs font-mono text-alert shrink-0">
                      {field.code}
                    </span>
                    <span className="flex-1 text-sm text-stone-700">
                      {field.label}
                    </span>
                    <span
                      className="font-semibold text-brand-navy text-sm tabular-nums"
                      dir="ltr"
                    >
                      {displayValue}
                    </span>
                    {showCopy && <CopyButton value={displayValue} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {moduleFields.length === 0 && (
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm text-stone-500 text-center">
            לשלב הזה אין שדות מספריים — רק לעבור על הפרטים בצילום למעלה.
          </div>
        )}
      </main>

      <nav className="sticky bottom-0 bg-white border-t border-stone-200 shadow-[0_-4px_16px_rgba(13,59,102,0.06)]">
        <div className="mx-auto max-w-screen-sm px-4 py-3 flex items-center gap-3">
          <button
            onClick={goBack}
            disabled={isFirst}
            className="rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ←
          </button>
          {isLast ? (
            <Link
              href="/demo"
              className="flex-1 text-center rounded-full bg-success px-6 py-3 text-sm font-bold text-white hover:bg-success/90 transition-colors shadow-sm"
            >
              סיום — פתח/י את gov.il →
            </Link>
          ) : (
            <button
              onClick={goNext}
              className="flex-1 rounded-full bg-brand-navy px-6 py-3 text-sm font-bold text-white hover:bg-brand-navy/90 transition-colors shadow-sm"
            >
              המשך →
            </button>
          )}
        </div>
        <div className="mx-auto max-w-screen-sm px-4 pb-3 text-center">
          <Link
            href="/demo"
            className="text-xs text-stone-400 hover:text-stone-700 underline-offset-2 hover:underline"
          >
            דלג על הסיור
          </Link>
        </div>
      </nav>
    </div>
  );
}

function ScreenshotImage({ src }: { src?: string }) {
  const [actualSrc, setActualSrc] = useState(src ?? PLACEHOLDER_SCREENSHOT);
  useEffect(() => {
    setActualSrc(src ?? PLACEHOLDER_SCREENSHOT);
  }, [src]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={actualSrc}
      alt="צילום מסך של החלק הרלוונטי בטופס 1301"
      className="w-full h-auto block"
      onError={() => setActualSrc(PLACEHOLDER_SCREENSHOT)}
    />
  );
}

function EitanPointer({
  src,
  position,
}: {
  src: string;
  position: PointerPosition;
}) {
  const [actualSrc, setActualSrc] = useState(src);
  useEffect(() => {
    setActualSrc(src);
  }, [src]);

  const positionClass = {
    "top-right": "top-3 right-3",
    "top-left": "top-3 left-3",
    "bottom-right": "bottom-3 right-3",
    "bottom-left": "bottom-3 left-3",
  }[position];

  return (
    <div className={`absolute ${positionClass} pointer-events-none`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={actualSrc}
        alt="איתן מצביע"
        className="h-32 sm:h-40 w-auto drop-shadow-[0_8px_16px_rgba(13,59,102,0.25)]"
        onError={() => setActualSrc(PLACEHOLDER_EITAN)}
      />
    </div>
  );
}
