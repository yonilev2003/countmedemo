"use client";

/**
 * Accessibility-preferences widget (Regulation 35 / IS 5568) — the floating
 * control surface for user comfort settings: contrast, text size, line
 * spacing, link highlighting, readable font, stop-animations.
 *
 * Scope fence (per the israeli-accessibility-compliance skill): toggles CSS
 * classes on <html> ONLY — never mutates content DOM / ARIA, and is never a
 * compliance claim by itself. The CSS effects live in globals.css (a11y-*).
 *
 * ARIA notes:
 *  - binary toggles use aria-pressed;
 *  - CYCLING toggles deliberately omit aria-pressed (announcing "pressed" is
 *    wrong for >2 states) — the accessible name carries the current value;
 *  - the polite live region sits OUTSIDE the panel so late announcements
 *    survive the panel closing;
 *  - Alt+A opens/closes, detected via e.code (layout-independent; e.key
 *    breaks on macOS where Alt+A produces "å").
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useA11yPrefs,
  a11yStore,
  nextContrast,
  nextTextSize,
  nextLineSpacing,
  isAnyActive,
  applyPrefsToElement,
  type A11yPrefs,
} from "@/lib/a11y/store";
import { AccessibilityIcon, XIcon } from "@/components/brand/icons";

const CONTRAST_LABEL: Record<A11yPrefs["contrast"], string> = {
  off: "כבוי",
  high: "מוגברת",
  invert: "היפוך צבעים",
  mono: "שחור-לבן",
};
const LINES_LABEL: Record<A11yPrefs["lineSpacing"], string> = {
  normal: "רגיל",
  "16": "מוגדל",
  "20": "כפול",
};

export function AccessibilityWidget() {
  const prefs = useA11yPrefs();
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // Safety net: re-apply persisted classes after mount (covers blocked
  // localStorage in the bootstrap, bfcache restores, etc.).
  useEffect(() => {
    applyPrefsToElement(document.documentElement, a11yStore.getSnapshot());
  }, []);

  // Alt+A — layout-independent via e.code.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === "KeyA") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus the panel when it opens.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const announce = useCallback((label: string, value?: string) => {
    setAnnouncement(value ? `${label}: ${value}` : label);
  }, []);

  const btnBase =
    "w-full rounded-xl border px-3 py-2.5 text-start text-sm font-semibold transition-colors " +
    "focus:outline-none focus-visible:outline-2 focus-visible:outline-brand-deep";
  const btnOff = "border-line bg-paper text-ink hover:border-brand-deep";
  const btnOn = "border-brand-deep bg-teal-100 text-brand-navy";

  return (
    <>
      {/* Live region — outside the panel, so it survives the panel closing */}
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>

      <button
        id="a11y-widget-trigger"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="a11y-widget-panel"
        aria-keyshortcuts="Alt+A"
        aria-label="אפשרויות נגישות (Alt+A)"
        title="אפשרויות נגישות (Alt+A)"
        className={
          "fixed bottom-20 start-4 z-40 grid size-12 place-items-center rounded-full border shadow-brand transition-colors sm:bottom-6 print:hidden " +
          (isAnyActive(prefs)
            ? "border-brand-deep bg-brand-deep text-white"
            : "border-line bg-paper text-brand-navy hover:border-brand-deep")
        }
      >
        <AccessibilityIcon className="size-6" />
      </button>

      {open && (
        <div
          id="a11y-widget-panel"
          ref={panelRef}
          role="dialog"
          aria-label="אפשרויות נגישות"
          tabIndex={-1}
          className="fixed bottom-36 start-4 z-40 w-72 rounded-2xl border border-line bg-cream p-4 shadow-brand sm:bottom-20 print:hidden"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-brand-navy">
              אפשרויות נגישות
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="סגירת אפשרויות נגישות"
              className="grid size-8 place-items-center rounded-full border border-line bg-paper text-muted hover:text-brand-navy"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <div className="space-y-2">
            {/* Cycling toggles — no aria-pressed; the name carries the value */}
            <button
              type="button"
              aria-label={`ניגודיות: ${CONTRAST_LABEL[prefs.contrast]}`}
              onClick={() => {
                const v = nextContrast(prefs.contrast);
                a11yStore.set({ contrast: v });
                announce("ניגודיות", CONTRAST_LABEL[v]);
              }}
              className={`${btnBase} flex items-center justify-between gap-2 ${prefs.contrast !== "off" ? btnOn : btnOff}`}
            >
              <span>ניגודיות</span>
              <span className="text-xs text-muted">
                {CONTRAST_LABEL[prefs.contrast]}
              </span>
            </button>

            <button
              type="button"
              aria-label={`גודל טקסט: ${prefs.textSize}%`}
              onClick={() => {
                const v = nextTextSize(prefs.textSize);
                a11yStore.set({ textSize: v });
                announce("גודל טקסט", `${v}%`);
              }}
              className={`${btnBase} flex items-center justify-between gap-2 ${prefs.textSize !== 100 ? btnOn : btnOff}`}
            >
              <span>גודל טקסט</span>
              <span className="text-xs text-muted" dir="ltr">
                {prefs.textSize}%
              </span>
            </button>

            <button
              type="button"
              aria-label={`ריווח שורות: ${LINES_LABEL[prefs.lineSpacing]}`}
              onClick={() => {
                const v = nextLineSpacing(prefs.lineSpacing);
                a11yStore.set({ lineSpacing: v });
                announce("ריווח שורות", LINES_LABEL[v]);
              }}
              className={`${btnBase} flex items-center justify-between gap-2 ${prefs.lineSpacing !== "normal" ? btnOn : btnOff}`}
            >
              <span>ריווח שורות</span>
              <span className="text-xs text-muted">
                {LINES_LABEL[prefs.lineSpacing]}
              </span>
            </button>

            {/* Binary toggles — aria-pressed */}
            <button
              type="button"
              aria-pressed={prefs.links}
              onClick={() => {
                const v = !prefs.links;
                a11yStore.set({ links: v });
                announce("הדגשת קישורים", v ? "פעיל" : "כבוי");
              }}
              className={`${btnBase} ${prefs.links ? btnOn : btnOff}`}
            >
              הדגשת קישורים
            </button>

            <button
              type="button"
              aria-pressed={prefs.readableFont}
              onClick={() => {
                const v = !prefs.readableFont;
                a11yStore.set({ readableFont: v });
                announce("גופן קריא", v ? "פעיל" : "כבוי");
              }}
              className={`${btnBase} ${prefs.readableFont ? btnOn : btnOff}`}
            >
              גופן קריא
            </button>

            <button
              type="button"
              aria-pressed={prefs.reduceMotion}
              onClick={() => {
                const v = !prefs.reduceMotion;
                a11yStore.set({ reduceMotion: v });
                announce("עצירת אנימציות", v ? "פעיל" : "כבוי");
              }}
              className={`${btnBase} ${prefs.reduceMotion ? btnOn : btnOff}`}
            >
              עצירת אנימציות
            </button>

            <button
              type="button"
              onClick={() => {
                a11yStore.reset();
                announce("הגדרות הנגישות אופסו");
              }}
              className={`${btnBase} ${btnOff} text-alert-ink`}
            >
              איפוס הגדרות
            </button>
          </div>

          <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
            קיצור מקלדת: Alt+A ·{" "}
            <a href="/accessibility" className="underline hover:text-brand-navy">
              הצהרת נגישות
            </a>
          </p>
        </div>
      )}
    </>
  );
}
