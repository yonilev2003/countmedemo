/**
 * Brand palette as plain JS values — for SVG attributes, recharts props, and
 * inline styles that can't take Tailwind classes.
 *
 * CANONICAL SOURCE: src/app/globals.css `@theme` (the `--color-*` tokens).
 * These hexes must stay byte-identical to globals.css — change there first,
 * then mirror here. Prefer Tailwind classes wherever the context allows.
 */
export const BRAND_COLORS = {
  navy: "#083A4F", // --color-brand-navy
  navy700: "#0C4860", // --color-navy-700
  navy900: "#052532", // --color-navy-900
  beige: "#F5A93F", // --color-brand (gold, 2026-08-12 refresh)
  beige600: "#E0922A", // --color-beige-600
  beige100: "#FFF1D9", // --color-beige-100
  teal: "#5B67E8", // --color-brand-deep (periwinkle, 2026-08-12 refresh)
  teal600: "#4550C4", // --color-teal-600
  teal100: "#E4E6FB", // --color-teal-100
  aqua: "#C0D5D6", // --color-aqua
  aquaSoft: "#E6EEEE", // --color-aqua-soft
  cream: "#F1EFEA", // --color-cream
  sand: "#E5E1DD", // --color-sand
  paper: "#FBFAF8", // --color-paper
  ink: "#0B2027", // --color-ink
  muted: "#6A7A80", // --color-muted
  faint: "#9AA7AC", // --color-faint
  line: "#E7E2DA", // --color-line
  lineSoft: "#EFEBE3", // --color-line-soft
  success: "#17C29B", // --color-success (mint, 2026-08-12 refresh)
  successLight: "#D3F4EA", // --color-success-light
  due: "#A88A3F", // --color-due
  dueBg: "#F1E9D4", // --color-due-bg
  dueInk: "#7d6422", // --color-due-ink
  alert: "#C05B45", // --color-alert
  overdueBg: "#F3DED7", // --color-overdue-bg
  alertInk: "#9c3826", // --color-alert-ink
} as const;
