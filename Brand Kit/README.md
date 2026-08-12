# Handoff: CountMe — Brand System & Product Screens

## Overview
**CountMe** is a Hebrew-first (RTL) financial-compliance app for Israeli freelancers/self-employed (עצמאים). It tracks reporting deadlines (מע״מ / VAT, מקדמות / advance tax, ביטוח לאומי / national insurance, ניכויים / withholdings), surfaces income vs. the exemption ceiling, generates invoices & receipts, and provides a smart assistant character. The brand voice is calm, premium, trustworthy — "we count, so you can work."

> **2026-08-12 update:** the assistant persona is now named **שקל (Shekel)** in-product (a coin-mascot character, replacing the original "איתן/Eitan" name from these mockups). The screen/interaction descriptions below still reference "Eitan" since that's what the original hifi mockup files literally contain — read every "Eitan" mention below as the current Shekel persona. The Design Tokens table below is kept current with the live app (2026-08-12 palette refresh); the per-screen sections still describe the original mockups' colors/copy verbatim.

This bundle contains the full brand system plus high-fidelity mockups of every core screen.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing the intended look and behavior. They are **not production code to copy directly**. Several use React via in-browser Babel (auth, chat) purely for prototyping convenience; others are static HTML/CSS.

The task is to **recreate these designs in the target codebase's existing environment** (React/Next, Vue, React Native, SwiftUI, etc.) using its established component patterns, state management, and styling approach. If no environment exists yet, choose the most appropriate framework — for this product I'd suggest **React + a CSS solution that supports RTL well** (CSS logical properties are used throughout). Everything must remain **RTL (`dir="rtl"`)** and Hebrew.

## Fidelity
**High-fidelity (hifi).** These are pixel-level mockups with final colors, typography, spacing, radii, shadows, and interaction states. Recreate the UI faithfully using the codebase's libraries. The only "lofi" aspect is that data is mocked (sample amounts/dates) and there is no real backend.

---

## Design Tokens

### Colors
*(2026-08-12 refresh: `--beige`/`--beige-600`/`--beige-100` shifted warmer-gold and `--teal`/`--teal-600`/`--teal-100` shifted to periwinkle, converging both new Shekel/expense-upload/onboarding artifacts' palettes into the existing token names — see `globals.css` for the canonical values. Navy is unchanged.)*

| Token | Hex | Use |
|---|---|---|
| `--navy` | `#083A4F` | Primary. Headings, primary buttons, sidebar, user chat bubble |
| `--navy-700` | `#0C4860` | Gradient top / hover surfaces |
| `--navy-900` | `#052532` | Darkest — footers, gradient base, dark-card base |
| `--beige` (now gold) | `#F5A93F` | Accent (premium). Logo mark, secondary CTA, checkbox-on, FAB |
| `--beige-600` | `#E0922A` | Gold hover |
| `--beige-100` | `#FFF1D9` | Soft gold fill |
| `--teal` (now periwinkle) | `#5B67E8` | Interaction. Links, icons, charts, focus ring |
| `--teal-600` | `#4550C4` | Periwinkle text / hover |
| `--teal-100` | `#E4E6FB` | Soft periwinkle fill, chips |
| `--aqua` | `#C0D5D6` | Soft highlights, text on dark |
| `--aqua-soft` | `#E6EEEE` | Focus glow, soft surface |
| `--sand` | `#E5E1DD` | Page background (neutral) |
| `--sand-50` | `#F1EFEA` | App background, inset fields |
| `--paper` | `#FBFAF8` | Card surface |
| `--ink` | `#0B2027` | Body text |
| `--muted` | `#6A7A80` | Secondary text |
| `--faint` | `#9AA7AC` | Tertiary text / placeholders |
| `--line` | `#E7E2DA` | Borders |
| `--line-soft` | `#EFEBE3` | Subtle borders |

### Status (traffic-light) system
| State | Text/dot | Background | Meaning |
|---|---|---|---|
| On-track / paid | `--on-track #17C29B` (mint, 2026-08-12 refresh) | `--on-track-bg #D3F4EA` | Paid or plenty of time (שולם / במסלול) |
| Due / approaching | `--due #A88A3F` (a warm beige-gold) | `--due-bg #F1E9D4` | Deadline approaching (מתקרב) |
| Overdue | `--overdue #C05B45` (calm terracotta) | `--overdue-bg #F3DED7` | Past due (באיחור) |

### Typography
- **Family:** `Assistant` (Google Fonts, weights 300–800) for body text; **`Rubik`** (Google Fonts, weights 500–900, added 2026-08-12) for headings/display — both new Shekel-era artifacts use Rubik for display type. Assistant remains the free stand-in for **Almoni** — the typeface used on gov.il. For production, Almoni (AlefAlefAlef, commercial) may be swapped in without layout changes; otherwise keep Assistant/Rubik.
- **Numerals:** use tabular figures for money/dates — `font-feature-settings: "tnum"` / `font-variant-numeric: tabular-nums`.
- **Scale (used across kit):** Display 58/800/-3.5%; H1 40/800/-2.5%; H2 30/700/-2%; H3 23/700; Body-L 18/400; Body 16/400; Small 13.5/500. Headings use negative letter-spacing.

### Radius
`--r-sm 8px · --r-md 12px · --r-lg 16px · --r-xl 24px · --r-pill 999px`. Cards 12–16px; buttons are **pills (999px)** in product, 12px in some kit examples; inputs 12px.

### Shadow
- sm: `0 1px 2px rgba(8,40,55,.06)`
- md (cards): `0 1px 2px rgba(8,40,55,.04), 0 12px 28px -16px rgba(8,40,55,.18)`
- lg (modals/devices): `0 40px 80px -30px rgba(8,40,55,.4)`

### Layout
- **RTL everywhere.** Use CSS **logical properties** (`inset-inline-start/end`, `margin-inline`, `padding-inline`, `border-start-*`) — the mockups rely on them so the same code mirrors correctly.
- Flex/grid with `gap` for all groupings (no inline-flow spacing).
- Mobile device frame: 390×844 (iPhone), 48px outer radius, Dynamic-Island pill, home indicator. Touch targets ≥44px.

---

## Screens / Views

> File → screen map. Each HTML file contains multiple framed screens labeled with a Hebrew `frame-cap`/`sec-label`.

### 1. Brand Kit — `CountMe Brand Kit.html`
Reference document (not a product screen). Sections: Logo lockups, Brand personality, Color & tokens, Typography, Components (buttons/forms/deadline cards), Iconography, **איתן (Eitan) character** (profile, tone-of-voice do/don't, 8 pose situations, chat component spec), and "המותג בפעולה" (embedded previews of all product screens). Use this as the source of truth for tokens and component styling.

### 2. Auth — `CountMe Auth.html` (React/Babel prototype)
- **Mobile (login & sign-up)** and **Web (split brand panel + card)**.
- **Frosted-glass aesthetic** over a blurred **navy-teal gradient** backdrop (radial aqua + gold glows; `linear-gradient(157deg,#0e4f68,#0a4358,#062c3b)`). Glass card: `backdrop-filter: blur(26px) saturate(140%)`, translucent white, hairline border, inset top highlight.
- **Fields:** underline-only inputs (bottom border, transparent bg), right-aligned (RTL), white text on glass / navy text on web card.
- **Buttons (pills, 54px tall):** primary = navy filled; secondary = white with Google icon ("התחברות/הרשמה עם Google").
- Title accent words use a light blue-grey (`rgb(159,180,191)`) on the dark background.
- "החלף רקע" control lets the user upload a background photo (persists to `localStorage`).
- Remember-me / terms rows use a custom 22px checkbox (beige when on).
- Login⇄sign-up toggled via footer link.

### 3. Web Dashboard — `CountMe Dashboard Web.html`
- **Shell:** glass app container (1340px), left **icon sidebar** (104px: logo, nav items w/ tooltips, avatar) bordered on the inline-end.
- **Top bar:** greeting ("בוקר טוב, דנה" — no emoji), search pill, weather chip, notification bell (with dot), gold "דוח חדש" CTA.
- **Card grid** (`grid-template-areas`), top to bottom:
  - `income` (full width, **top**): "מצב הכנסות השנה" — big income figure vs. exemption ceiling, teal progress bar, remaining-to-ceiling note; divider; **expense-to-income ratio %** with income/expense breakdown.
  - `timeline`: "ציר המועדים" Gantt-style bars (ok/due/over/plan colors) with a "היום" now-line; day/week/month/year segmented control.
  - `status`: period status % with sparkline + paid/due/overdue legend.
  - `next` (dark navy card, tall): "המועד הקרוב" countdown (days left), amount breakdown, gold "הגש דיווח עכשיו" button.
  - `docs`: recent documents list (pdf/xls/img/generic colored icons).
  - `finance`: stats + monthly income bar chart (last bar highlighted gold).
- Uses a JS `fit()` scaler (transform: scale) to letterbox the fixed canvas — replace with responsive layout in production.

### 4. App Dashboard — `CountMe Dashboard App.html`
- Two phone screens: **Home** and **Deadlines (מועדים)**.
- **Home:** header (avatar + greeting + bell); **income card at top** (same income-vs-ceiling + ratio as web, compact); dark **next-deadline hero** (countdown, amount, gold CTA); "מצב התקופה" (68% ring + mini stats); "מועדים קרובים" traffic-light list; bottom tab bar with center **gold FAB**.
- **Deadlines:** month title, filter chips (הכל/באיחור/השבוע/שולם), grouped lists "דורש טיפול" / "הושלם", each row a traffic-light deadline item.
- Deadline row: 42px rounded status icon, name + meta, date + status pill, colored inline-end edge stripe.

### 5. Chat with Eitan — `CountMe Chat.html` (React/Babel prototype)
- **Mobile chat:** header (back, Eitan avatar, name + verified badge, "מחובר" status, info); message list (bot bubbles white/left-radius-cut, user bubbles navy/right-radius-cut, timestamps); **deadline card embedded inside a bubble**; **quick-reply chips**; input bar with attach (clip) + **mic record button** (beige).
- **Mobile voice screen:** Eitan avatar with pulsing rings, animated waveform, live transcription line with blinking cursor, 0:06 timer, controls (cancel / big navy stop / confirm).
- **Web:** 3-pane — conversations rail (new-chat, recent list, Eitan card), main chat (same bubble system, send + mic buttons), right suggestions panel (Eitan hero + FAQ buttons).
- **Eitan** = the assistant persona. Avatar/poses are the user's uploaded illustration (see Assets). Tone: clear answer first then detail, proactive about deadlines, never alarming/jargon-heavy/judgmental.

### 6. Invoicing — `CountMe Invoice.html`
Two document types, each shown **in-editor (web), final document, and mobile**:
- **חשבון עסקה (invoice / payment demand)** + **קבלה (receipt)**.
- **Editor:** line-underline form fields grouped in cards (customer details, line items table with qty/price/total, totals incl. VAT 18%, notes), live preview, "הפקה" (issue) pill button.
- **Final document:** clean printable doc — business header, "חשבון עסקה 40312" / "קבלה 80399", customer block, items table, totals, "לתשלום עד …" / "התקבל במלואו · תודה". Uses navy headings on paper.
- Sample data only; do not reuse the placeholder customer details.

### 7. Shortcuts — `CountMe Shortcuts.html`
- **Quick-action arc menu** (mobile): a single thin circular guide line; four shortcut icon-pills hug the arc; the active one expands to a teal-bordered pill + label chip, with a navy drag "handle". Bottom-left expand & search controls.
- The four shortcuts: **קבלה** (receipt), **חשבון עסקה (דרישת תשלום)** (invoice/payment demand), **הצעת מחיר** (quote), **מעבר ל-Dashboard**.
- A side legend lists all four with icons, descriptions, and ⌘ shortcuts.

---

## Interactions & Behavior
- **Auth:** login/sign-up toggle (state); checkbox toggles; background-image upload → FileReader → `localStorage` (key `cm-bg-<slot>`), re-read on load.
- **Chat:** quick-reply chips populate/send; mic button → voice screen; typing indicator (3 dots, `bln` keyframe). Web: clicking a conversation loads it; suggestions populate input.
- **Voice:** waveform bars animate (`wv` keyframe, staggered delays); pulse rings (`pulse`); transcription cursor blink (`bln`).
- **Dashboards:** segmented controls switch ranges; nav hover tooltips; bars/rings are static (drive from data in production). The web dashboard's `fit()` scales the fixed 1340×1024 canvas to viewport — **replace with real responsive layout**.
- **Shortcuts:** scroll/drag arc to change selection, tap to activate (prototype shows the selected state statically).
- **Transitions:** subtle — buttons `transform: translateY(-1px)` + shadow on hover (.15–.2s); avoid flashy motion. Respect `prefers-reduced-motion`.

## State Management
- Auth: `mode` (login|signup), `remember`, `agree`, uploaded bg per slot.
- Chat: `messages[]`, `mode` (text|voice), recording state + elapsed time, transcription text, active conversation id, suggestions.
- Dashboards: selected time-range per chart; data objects for deadlines (name, type, amount, dueDate, status), income (earned, ceiling, expenses, ratio), documents.
- Invoicing: document type (invoice|receipt), business info, customer info, line items[], totals (subtotal, VAT 18%, total), issue state (draft|issued).
- Shortcuts: active shortcut index.
- Data fetching: deadlines, income/expense aggregates, documents, generated docs, chat completions (assistant). All mocked here.

## Assets
- **Logo:** the **¢ mark** (C + currency stroke) is an inline SVG — `path` arc + vertical `line`, `stroke` = `--beige` (`#C8B59A`) on light/dark, white on beige. Recreate as SVG component; color via `currentColor`/prop. Wordmark "CountMe" in Assistant 800.
- **Eitan character:** the user's uploaded illustration, cropped into poses. Originals in `/uploads/` of the source project; cropped poses were embedded as data-URIs in the prototypes. **Obtain final character art from the user / brand owner** for production; do not ship the cropped JPEGs as final.
- **Icons:** line style, **1.75px** stroke, round caps/joins, 24px grid, no fill, default color `--teal`. Inline SVGs throughout — map to your icon library (e.g. Lucide/Feather have close equivalents) keeping the line weight.
- **Fonts:** Assistant via Google Fonts; consider self-hosting. Almoni optional production swap.
- **Flags / brand:** none beyond the above. No emoji anywhere — the brand deliberately avoids them.

## Files
- `CountMe Brand Kit.html` — tokens, components, Eitan, full reference (start here).
- `CountMe Auth.html` — login / sign-up (mobile + web).
- `CountMe Dashboard Web.html` — web dashboard.
- `CountMe Dashboard App.html` — mobile home + deadlines.
- `CountMe Chat.html` — Eitan chat (mobile + web) + voice recording.
- `CountMe Invoice.html` — invoice & receipt (editor, final, mobile).
- `CountMe Shortcuts.html` — quick-action arc menu.

> Tip for implementers: open each file in a browser to inspect exact computed styles. Tokens are defined as CSS custom properties in each file's `:root` — lift them verbatim into your theme. All layout uses logical properties so it mirrors correctly in RTL.
