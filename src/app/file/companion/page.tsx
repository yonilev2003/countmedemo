"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import type { Persona } from "@/lib/persona";
import { GovilSections } from "@/components/form-1301/govil-section";
import { InlineCopyButton } from "@/components/form-1301/copy-button";
import { FORM_MODULES } from "@/lib/form-1301/modules";
import { PLACEHOLDER_SHEKEL } from "@/lib/form-1301/companion-assets";
import { AppHeader } from "@/components/brand/app-header";
import { btn, Button } from "@/components/brand/button";
import {
  SparklesIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  MicIcon,
  XIcon,
} from "@/components/brand/icons";

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

const COMPANION_STEP_KEY = "countme_companion_step";

export default function CompanionPage() {
  const { persona } = useRequiredPersona();
  const [moduleIndex, setModuleIndex] = useState(0);
  const { speaking, supported, speak, stop } = useHebrewSpeech();
  const lastIndexRef = useRef(moduleIndex);

  useEffect(() => {
    if (!persona) return;
    // Restore saved step
    try {
      const saved = localStorage.getItem(COMPANION_STEP_KEY);
      if (saved !== null) {
        const idx = parseInt(saved, 10);
        if (!isNaN(idx) && idx >= 0) setModuleIndex(idx);
      }
    } catch { /* ignore */ }
  }, [persona]);

  useEffect(() => {
    if (lastIndexRef.current !== moduleIndex) {
      stop();
      lastIndexRef.current = moduleIndex;
    }
    // Persist step to localStorage
    try { localStorage.setItem(COMPANION_STEP_KEY, String(moduleIndex)); } catch { /* ignore */ }
  }, [moduleIndex, stop]);

  if (!persona) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="space-y-3 w-80 animate-pulse">
        <div className="h-8 rounded-lg bg-sand w-2/3 mx-auto" />
        <div className="h-24 rounded-2xl bg-sand" />
        <div className="h-40 rounded-2xl bg-sand" />
      </div>
    </div>
  );

  const totalModules = FORM_MODULES.length;
  const currentModule = FORM_MODULES[moduleIndex];
  const isLast = moduleIndex === totalModules - 1;
  const isFirst = moduleIndex === 0;

  const narration = currentModule.narration ?? currentModule.eitanIntro;

  function goNext() {
    if (!isLast) setModuleIndex((i) => i + 1);
  }
  function goBack() {
    if (!isFirst) setModuleIndex((i) => i - 1);
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-paper border-b border-line">
        <AppHeader
          className="border-b-0"
          pageLabel="ליווי צמוד"
          actions={
            <>
              <Link href="/file" className="flex items-center gap-1.5 text-sm text-muted hover:text-brand-navy">
                <ArrowRightIcon className="size-4" />
                מסלולים
              </Link>
              <span className="text-xs rounded-full bg-info border border-brand-navy/20 px-2 py-0.5 text-brand-navy font-mono">
                {moduleIndex + 1}/{totalModules}
              </span>
              <Link href="/demo" className="text-xs text-faint hover:text-brand-navy">
                דלג
              </Link>
            </>
          }
        />
        {/* Step progress dots */}
        <div className="mx-auto max-w-screen-md px-4 pb-2">
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

      <main className="flex-1 mx-auto w-full max-w-screen-md px-4 py-5 space-y-4">
        {/* Step title card */}
        <div className="bg-paper border border-line rounded-2xl p-5 shadow-brand">
          <p className="text-xs uppercase tracking-wider text-muted mb-1">
            שלב {moduleIndex + 1} מתוך {totalModules}
          </p>
          <h1 className="font-display text-2xl font-bold text-brand-navy">
            {currentModule.title}
          </h1>
        </div>

        {/* Eitan narration bubble */}
        <div className="bg-info border border-brand-navy/10 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            {/* Bot avatar — white paper bubble look */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy text-white shadow-brand-sm">
              <SparklesIcon className="size-4" />
            </div>
            {/* Bubble shows the same text TTS reads — perfect alignment */}
            <p className="text-sm text-ink leading-relaxed flex-1">{narration}</p>
          </div>
          <button
            onClick={() => speak(narration)}
            disabled={!supported}
            className={[
              "mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors shadow-brand-sm border",
              !supported
                ? "border-line bg-sand text-faint cursor-not-allowed"
                : speaking
                ? "border-alert/30 bg-alert/10 text-alert animate-pulse"
                : "border-line bg-paper text-brand-navy hover:bg-brand-navy hover:text-white hover:border-brand-navy",
            ].join(" ")}
            title={
              !supported
                ? "ההקראה הקולית אינה נתמכת בדפדפן הזה"
                : speaking
                ? "לחץ/י לעצירה"
                : "הקראה קולית של ההסבר"
            }
          >
            {speaking ? (
              <XIcon className="size-4" />
            ) : (
              <MicIcon className="size-4" />
            )}
            <span>
              {speaking
                ? "עצור הקראה"
                : !supported
                ? "הקראה לא נתמכת בדפדפן"
                : "הקרא/י לי את ההסבר"}
            </span>
          </button>
        </div>

        {/* Layout: Eitan in a side column, form in the main area.
            On mobile: Eitan above the form. On desktop (RTL): Eitan on the
            right (first DOM child = rightmost in flex-row RTL), form on the left. */}
        <div className="flex flex-col md:flex-row gap-4 items-start">
          {currentModule.picture && (
            <div className="w-24 sm:w-32 md:w-36 lg:w-44 mx-auto md:mx-0 shrink-0">
              <EitanIllustration src={currentModule.picture} />
            </div>
          )}

          <div className="flex-1 w-full min-w-0">
            <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-brand">
              <div className="bg-sand px-4 py-2 border-b border-line flex items-center gap-2">
                <span className="inline-block rounded-full bg-brand-navy w-2 h-2" />
                <p className="text-xs font-semibold text-muted">
                  הקטע הרלוונטי בטופס gov.il — לחצ/י על כפתור ההעתקה ליד כל ערך
                </p>
              </div>
              <div className="p-2">
                {currentModule.fieldCodes.length > 0 ? (
                  <GovilSections persona={persona} fieldCodes={currentModule.fieldCodes} />
                ) : (
                  <ContactInfoCard persona={persona} moduleId={currentModule.id} />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky nav bar */}
      <nav className="sticky bottom-0 bg-paper border-t border-line shadow-brand-lg">
        <div className="mx-auto max-w-screen-md px-4 py-3 flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={goBack}
            disabled={isFirst}
            aria-label="חזרה לשלב הקודם"
            className="shrink-0"
          >
            <ArrowRightIcon className="size-4" />
          </Button>
          {isLast ? (
            <Link
              href="/"
              onClick={() => {
                try { localStorage.removeItem(COMPANION_STEP_KEY); } catch { /* ignore */ }
              }}
              className={btn("primary", "md", "flex-1 text-center")}
            >
              סיום — חזרה לדף הבית
              <ArrowLeftIcon className="size-4" />
            </Link>
          ) : (
            <Button variant="primary" onClick={goNext} className="flex-1">
              המשך
              <ArrowLeftIcon className="size-4" />
            </Button>
          )}
        </div>
        <div className="mx-auto max-w-screen-md px-4 pb-3 text-center">
          <Link
            href="/demo"
            className="text-xs text-faint hover:text-muted underline-offset-2 hover:underline"
          >
            דלג על הסיור
          </Link>
        </div>
      </nav>
    </div>
  );
}

/**
 * Fallback for modules with no field codes (currently only module 3 — contact info).
 */
function ContactInfoCard({ persona, moduleId }: { persona: Persona; moduleId: number }) {
  const rows: { label: string; value: string | null | undefined }[] =
    moduleId === 3
      ? [
          { label: "רחוב", value: persona.contact.mailingAddress.street },
          { label: "מספר בית", value: persona.contact.mailingAddress.houseNumber },
          { label: "עיר", value: persona.contact.mailingAddress.city },
          { label: "מיקוד", value: persona.contact.mailingAddress.zipCode },
          { label: "דואר אלקטרוני", value: persona.contact.email },
          { label: "טלפון נייד", value: persona.contact.phoneMobile },
        ]
      : [];

  if (rows.length === 0) {
    return (
      <div className="px-4 py-4 text-sm text-muted text-center">
        אין שדות מספריים לשלב זה — הפרטים מתועלים בשלבים אחרים.
      </div>
    );
  }

  return (
    <div className="bg-[#f5f7fa] p-3 border border-stone-300" style={{ borderRadius: 2 }}>
      <div className="border border-[#9bb5cf] overflow-hidden bg-white" style={{ borderRadius: 2 }}>
        <div className="bg-gradient-to-l from-[#dde7f0] to-[#cdddec] border-b border-[#9bb5cf] px-3 py-2 flex items-center gap-2">
          <span className="text-[12px] font-bold text-[#1a3f6a] leading-tight">פרטי התקשרות</span>
        </div>
        <div className="divide-y divide-stone-100">
          {rows.map(({ label, value }) => (
            <div
              key={label}
              className="grid items-center gap-2 px-3 py-1.5"
              style={{ gridTemplateColumns: "1fr 28px 140px" }}
            >
              <span className="text-[12px] text-stone-800 leading-snug">{label}</span>
              <div className="flex items-center justify-center">
                {value ? <InlineCopyButton value={value} /> : null}
              </div>
              <span
                className={
                  "inline-block border px-2 py-0.5 text-[12px] font-medium min-w-[100px] text-center " +
                  (value
                    ? "border-[#a8b8c8] bg-[#eef3f8] text-[#1a3f6a]"
                    : "border-stone-300 bg-white text-stone-400")
                }
                dir="ltr"
              >
                {value || "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Eitan illustration placed in a side column next to the form (not overlaying it).
 * Falls back to the placeholder SVG if the real image is missing.
 */
function EitanIllustration({ src }: { src: string }) {
  const [actualSrc, setActualSrc] = useState(src);
  useEffect(() => {
    setActualSrc(src);
  }, [src]);
  return (
    <div className="md:sticky md:top-28">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={actualSrc}
        alt="שקל"
        className="w-full h-auto drop-shadow-[0_8px_16px_rgba(13,59,102,0.18)]"
        onError={() => setActualSrc(PLACEHOLDER_SHEKEL)}
      />
    </div>
  );
}
