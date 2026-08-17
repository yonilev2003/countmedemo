/**
 * Accessibility-preferences core (Regulation 35 / IS 5568 widget).
 *
 * Pure helpers, no "use client" — safe to import from the Server-Component
 * root layout (needed for the FOUC bootstrap <script> injection).
 *
 * SCOPE FENCE (see the israeli-accessibility-compliance skill): this is a
 * user-preference comfort tool. It toggles CSS classes on <html> and nothing
 * else — it must never mutate content DOM, inject alt text, or rewrite ARIA,
 * and it must never be presented as making the site "compliant" by itself.
 */

export type ContrastMode = "off" | "high" | "invert" | "mono";
export type TextSize = 100 | 115 | 130 | 150;
export type LineSpacing = "normal" | "16" | "20";

export interface A11yPrefs {
  version: number;
  links: boolean;
  contrast: ContrastMode;
  textSize: TextSize;
  lineSpacing: LineSpacing;
  readableFont: boolean;
  reduceMotion: boolean;
}

export const A11Y_VERSION = 1;
export const A11Y_STORAGE_KEY = "countme_a11y_prefs_v1";

export const DEFAULT_PREFS: A11yPrefs = Object.freeze({
  version: A11Y_VERSION,
  links: false,
  contrast: "off",
  textSize: 100,
  lineSpacing: "normal",
  readableFont: false,
  reduceMotion: false,
});

const CONTRAST_CYCLE: ContrastMode[] = ["off", "high", "invert", "mono"];
const TEXT_SIZE_CYCLE: TextSize[] = [100, 115, 130, 150];
const LINE_SPACING_CYCLE: LineSpacing[] = ["normal", "16", "20"];

export function nextContrast(c: ContrastMode): ContrastMode {
  return CONTRAST_CYCLE[(CONTRAST_CYCLE.indexOf(c) + 1) % CONTRAST_CYCLE.length];
}
export function nextTextSize(s: TextSize): TextSize {
  return TEXT_SIZE_CYCLE[(TEXT_SIZE_CYCLE.indexOf(s) + 1) % TEXT_SIZE_CYCLE.length];
}
export function nextLineSpacing(l: LineSpacing): LineSpacing {
  return LINE_SPACING_CYCLE[(LINE_SPACING_CYCLE.indexOf(l) + 1) % LINE_SPACING_CYCLE.length];
}

export function isAnyActive(p: A11yPrefs): boolean {
  return (
    p.links ||
    p.contrast !== "off" ||
    p.textSize !== 100 ||
    p.lineSpacing !== "normal" ||
    p.readableFont ||
    p.reduceMotion
  );
}

// SINGLE SOURCE OF TRUTH: drives both applyPrefsToElement() at runtime and
// the FOUC bootstrap script below — serialized from the same table so the
// two can never drift (a drift = flash of unstyled preferences on load).
const CLASS_RULES: ReadonlyArray<
  [className: string, predicate: (p: A11yPrefs) => boolean, js: string]
> = [
  ["a11y-links", (p) => p.links, "!!p.links"],
  ["a11y-contrast-high", (p) => p.contrast === "high", "p.contrast==='high'"],
  ["a11y-contrast-invert", (p) => p.contrast === "invert", "p.contrast==='invert'"],
  ["a11y-contrast-mono", (p) => p.contrast === "mono", "p.contrast==='mono'"],
  ["a11y-text-115", (p) => p.textSize === 115, "p.textSize===115"],
  ["a11y-text-130", (p) => p.textSize === 130, "p.textSize===130"],
  ["a11y-text-150", (p) => p.textSize === 150, "p.textSize===150"],
  ["a11y-lines-16", (p) => p.lineSpacing === "16", "p.lineSpacing==='16'"],
  ["a11y-lines-20", (p) => p.lineSpacing === "20", "p.lineSpacing==='20'"],
  ["a11y-readable-font", (p) => p.readableFont, "!!p.readableFont"],
  ["a11y-reduce-motion", (p) => p.reduceMotion, "!!p.reduceMotion"],
];

export function applyPrefsToElement(el: HTMLElement, prefs: A11yPrefs): void {
  for (const [cls, pred] of CLASS_RULES) el.classList.toggle(cls, pred(prefs));
}

/** Inline <script> for <head> — applies persisted prefs BEFORE React hydrates. */
export const A11Y_BOOTSTRAP_SCRIPT: string =
  `(function(){try{var raw=localStorage.getItem(${JSON.stringify(A11Y_STORAGE_KEY)});` +
  `if(!raw)return;var p=JSON.parse(raw);if(p.version!==${A11Y_VERSION})return;` +
  `var c=document.documentElement.classList;` +
  CLASS_RULES.map(([cls, , js]) => `c.toggle(${JSON.stringify(cls)},${js})`).join(";") +
  `}catch(e){}})()`;
