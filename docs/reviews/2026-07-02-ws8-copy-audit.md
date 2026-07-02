# WS8 — Regulatory-Positioning Copy Audit

**Date:** 2026-07-02 · **Scope:** all user-facing Hebrew copy (pages, components, LLM system prompts, PWA manifest, error pages, alert/deadline/insight libraries)
**Calibration (founder):**
- (a) Never imply licensed tax advice / representation — no license exists.
- (b) Numeric accuracy *within stated scope* is guaranteed by the deterministic engine + golden tests — NOT by disclaimers. Don't hedge the arithmetic.
- Target register: **"מחשבון מדויק. לא ייעוץ מס."** — confident about arithmetic, honest about scope, warm גובה-העיניים tone.

> **All proposed copy in this document is DRAFT — NEEDS LEGAL REVIEW.**

**Method:** grep sweep over `src/**` + `public/manifest.json` for: ייעוץ, רואה חשבון/רו"ח, מחליף, אחריות, מומלץ, כדאי, עדיף, שווה, רצוי, מדויק, מובטח, 100%, בלי, אוטומטי, הערכה, בלבד, מאומת, מבטיח — then manual read of every user-facing surface (`/`, `/home`, `/demo`, `/dashboard`, `/dashboard/pl-report`, `/alerts`, `/coach`, `/business-expenses`, `/setup`, `/file`, `/file/guided`, `/deadlines`, `/pricing`, `/about`, `/invoices/*`, `error.tsx`, `global-error.tsx`, `layout.tsx` metadata, `manifest.json`) and every model-facing prompt (`api/chat`, `api/coach`, `lib/agent/tools.ts`; `api/upload` + `api/parse-invoice` + `lib/regulatory/classify.ts` reviewed and classified N-A — machine-to-machine JSON extraction, output never rendered verbatim).

## Summary counts

| Classification | Count |
|---|---|
| OVERCLAIM | 11 |
| OVER-HEDGE | 11 |
| OK (incl. positive examples to preserve) | 12 |
| N-A (internal, not user-facing) | 6 |

Requirement-(b) contradictions (copy that undermines the deterministic engine): **6** — marked ⚠️(b) in the table.

---

## 1. Findings table

Column key: **Class** = OVERCLAIM / OVER-HEDGE / OK / N-A. All replacements: DRAFT — NEEDS LEGAL REVIEW.

### 1a. OVERCLAIM

| # | file:line | Current text | Class | Proposed replacement (DRAFT — NEEDS LEGAL REVIEW) | Notes |
|---|---|---|---|---|---|
| O1 | `src/app/layout.tsx:17` | „המוצר שמלווה עצמאים בישראל במילוי דו״חות מס **בלי רואה חשבון**. מבוסס על AI…" | OVERCLAIM | „המוצר שמלווה עצמאים בישראל בהכנת דו״ח המס השנתי. AI שלוקח את הנתונים שלך ומראה בדיוק מה למלא בכל שדה — מחשבון מדויק, לא ייעוץ מס." | Site-wide meta description (SEO + link previews) — the single most-visible positioning string. „בלי רואה חשבון" reads as replacement of a licensed professional. Note `public/manifest.json:4` already uses the safe version — align on the safe one. |
| O2 | `src/app/api/coach/route.ts:24` | „אח חכם, בגובה העיניים, אחראי. **לא מפנה לרואה חשבון — אתה הוא המערכת שמחליפה אותו.**" | OVERCLAIM (worst) | „אח חכם, בגובה העיניים, אחראי. אתה עוזר לה/לו להגיע מוכנ/ה לדוח — לא מחליף ייעוץ מקצועי. כשעולה שאלה שדורשת שיקול דעת של רואה חשבון או יועץ מס (סיווג חריג, מס שבח, מבנה עסקי, ביקורת), אמור זאת ישירות ובחום — בלי לוותר על הטון." | Founder-approved direction. Prompt copy IS user-facing via model output: the current instruction actively steers Eitan toward „אני מחליף רואה חשבון" answers when users ask. Keep the direct big-brother tone; only the replacement claim goes. |
| O3 | `src/app/api/coach/route.ts:48` | „אם המשתמש/ת עובד/ת מהבית — 30% מחשבונות הבית … מוכרים. **הכנס בשקט לחישוב.**" | OVERCLAIM | „אם המשתמש/ת עובד/ת מהבית — לפי הכלל המקובל, חלק יחסי מחשבונות הבית (עד ~30%, לפי שטח החדר) מוכר. הוסף לחישוב **ואמור זאת במפורש**, כולל ההנחה שהשתמשת בה." | „בשקט" instructs silent inclusion of a deduction the user never confirmed — a determination + concealment, exactly the licensed-judgement territory. Transparency also protects (b): every number keeps its visible source. |
| O4 | `src/app/api/coach/route.ts:55` | „סוכן נדל"ן יוקרה עם בגד יוקרה — זה מדים מקצועיים." | OVERCLAIM (domain accuracy) | „לפני שאתה דוחה הוצאה, שאל האם היא נדרשת לייצור הכנסה. כשההכרה תלויה בפרשנות (ביגוד, אירוח, נסיעות מעורבות) — הצג את הכלל, ציין שההכרה תלוית-נסיבות, ואל תפסוק." | Regular clothing is generally **not** deductible in Israel (only true uniforms / מדים עם זיהוי עסקי per תקנות מס הכנסה). The example trains the model to make aggressive determinations. Align with `israeli-expense-categorizer` skill before rewording. |
| O5 | `src/app/page.tsx:639` | Testimonial quote: „כאילו יש לי רואה חשבון בכיס" | OVERCLAIM (judgement call — discuss) | Option 1: „סוף סוף מישהו שמסביר לי כל מספר". Option 2: „כאילו יש לי אח גדול שמבין במסים". | Founder flagged for discussion. A testimonial saying the product = accountant is the claim we can't make ourselves — putting it in a customer's mouth doesn't cure it (and these testimonials are fictional, see O6). |
| O6 | `src/app/page.tsx:602-606` | Testimonial: „החזר מס שלא ידעתי שמגיע לי" / „איתן מצא ₪2,300 שפספסתי. המלצה חמה." (also mock UI at :193, :243 „איתן מצא עוד ₪2,300 להחזר") | OVERCLAIM (judgement call — discuss) | If keeping: reframe as product-capability copy, not a person: „איתן סורק את ההוצאות שלך ומצביע על זיכויים ששכחת — תרומות, קרן השתלמות, מילואים." For the mock UI screens: fine as obviously-illustrative product mockups; add a small „להמחשה בלבד" caption near the testimonial strip. | Fabricated named people + specific refund amounts = misleading-advertising exposure (separate from the licensing issue). The in-mockup ₪2,300 is lower risk (clearly a product screenshot) but the „testimonials" section presents them as real users. |
| O7 | `src/components/agent/chat-panel.tsx:60` | „כל הערכים מוכנים… אפשר להעתיק לטופס ברשות המסים **בלי דאגה**." | OVERCLAIM (mild) | „כל הערכים מוכנים. לחצי על כל מספר כדי לראות מאיפה הוא הגיע ואיך חישבתי אותו — ואז להעתיק לטופס ברשות המסים." | The arithmetic IS guaranteed (b), but „בלי דאגה" blesses the *filing as a whole* — inputs, completeness, classification. Confidence stays via „כל מספר עם נוסחה ומקור", which is the stronger claim anyway. |
| O8 | `src/lib/p-and-l/expense-ratio.ts:105` | „…זעיר מכיר לך יותר ממה שצברת בפועל. **שמרי על המסלול.**" | OVERCLAIM (advice) | „…זעיר מכיר לך {X} ₪ — יותר מ-{Y} ₪ ההוצאות שצברת בפועל." | Direct instruction to keep a tax track = advice. **This phrase is NOT stripped by `neutralizeAdvice()`** in `expense-ratio-card.tsx` (it only strips O9/O10 phrases) — it renders to users today. Fix at source; the card's neutralizer then becomes a no-op as its comment intends. |
| O9 | `src/lib/p-and-l/expense-ratio.ts:108` | „…**מומלץ לבטל את המסלול ולדווח כעוסק/ת פטור/ה רגיל/ה.**" | OVERCLAIM (advice) | „…במסלול זעיר יוכרו {X} ₪ בלבד; {Y} ₪ מעבר לתקרה לא ייכללו בחישוב המסלול. בדיווח רגיל מוכרות ההוצאות בפועל." | Currently stripped at render by `expense-ratio-card.tsx` — but the lib is a shared seam; any new consumer leaks the advice. Fix at source (matches the „facts, not advice" product decision already enforced in the coach prompt, route.ts:28). |
| O10 | `src/lib/p-and-l/expense-ratio.ts:113` | „…אם תיכנס/י למסלול זעיר תוכל/י להכיר ב-{X} ₪ אוטומטית… — **חיסכון פוטנציאלי במס**." (headline :112 „שקול/י מסלול זעיר") | OVERCLAIM (advice) | Headline: „יחס הוצאות {N}% — מתחת לסף מסלול זעיר". Detail: „הוצאותיך נמוכות מ-30% מהמחזור. במסלול זעיר מוכרים {X} ₪ (30% מהמחזור); ההוצאות שדיווחת: {Y} ₪." | Same seam as O8/O9. „שקול/י" + promised savings = recommendation to elect a tax track. The headline substitution here matches what the card's neutralizer already does — move it to the source. |
| O11 | `src/components/agent/chat-panel.tsx:236`, `src/components/agent/coach-chat.tsx:360` | Verified-check badge on Eitan's avatar, `aria-label="מאומת"` | OVERCLAIM (minor, judgement call) | Keep the visual if wanted, change semantics: `aria-label="איתן — הסוכן הרשמי של countme"`; or replace check-badge with the brand mark. | A social-network „verified" check on a tax agent can read as official certification/accreditation. Low priority; screen-reader users literally hear „מאומת". |

### 1b. OVER-HEDGE

| # | file:line | Current text | Class | Proposed replacement (DRAFT — NEEDS LEGAL REVIEW) | Notes |
|---|---|---|---|---|---|
| H1 | `src/app/demo/page.tsx:91-100` | Full-width banner: „הצהרת אחריות: המידע המוצג מבוסס על נתונים שהוזנו ידנית **ועל מקורות ציבוריים ברשת** — הוא אינו מהווה ייעוץ מס, ייעוץ משפטי, או ייעוץ פיננסי מקצועי. **האחריות על נכונות כל הפרטים… חלה על הממלא/ת בלבד.** לפני הגשת הדוח, מומלץ להתייעץ עם רואה חשבון מוסמך." | OVER-HEDGE ⚠️(b) | Replace with **canonical `<LegalNote>`** (§2). | Triple-advice-type pile-on + bolded liability shift at the top of the money surface. „מקורות ציבוריים ברשת" makes the deterministic engine sound like it scraped the web ⚠️(b). One banner per page, canonical text. |
| H2 | `src/app/demo/page.tsx:146-148` | Footer: „…countme מבוסס על מידע זמין לציבור **ואינו אחראי לטעויות, שינויי חקיקה, או אי-דיוקים בנתונים**. הגשת הדוח ומילוי הפרטים הנכונים הינה באחריות הממלא/ת בלבד." | OVER-HEDGE ⚠️(b) | Replace with **one-line variant** (§2): „מחשבון מדויק, לא ייעוץ מס — ההגשה לרשות המסים באחריותך." | „אינו אחראי לטעויות" directly contradicts (b): we DO stand behind the arithmetic (golden tests). Legislation-change risk belongs in the /legal scope page, not repeated per-footer. Second disclaimer on a page that already has H1 = drift. |
| H3 | `src/app/demo/page.tsx:184` | Estimate-gate subtitle: „לפי הנתונים והערכים בדו״ח — ההערכה אינה מחייבת ואינה מהווה ייעוץ מס" | OVER-HEDGE (mild) | „הערכה לפי הנתונים שהזנת — הסכום הסופי נקבע בשומה של רשות המסים." | This IS a genuine estimate surface — „הערכה" is right. But „אינה מחייבת ואינה מהווה ייעוץ מס" inside a subtitle is the third not-advice notice on this page. Say what makes it an estimate instead. |
| H4 | `src/app/demo/page.tsx:271` | „ערכים אלה **אינם מחייבים ואינם מהווים ייעוץ מס**. לפני הגשה — התייעץ עם רואה חשבון." | OVER-HEDGE | Delete sentence; keep the preceding paragraph (:267-268, genuinely useful estimate caveats — indexation, unentered income, etc.). If a note is wanted here, use the estimate one-liner (§2). | Fourth repetition on /demo. Also gender-drifts (התייעץ masculine vs התייעצי elsewhere) — symptom of copy-paste divergence the shared component solves. |
| H5 | `src/app/dashboard/page.tsx:409-411` | „הצהרת אחריות: הנתונים המוצגים מבוססים על נתונים שהוזנו ידנית **ועל הערכות** — אינם מהווים ייעוץ מס או ייעוץ פיננסי מקצועי. לפני הגשת הדוח, מומלץ להתייעץ עם רואה חשבון מוסמך." | OVER-HEDGE ⚠️(b) | Replace with **canonical `<LegalNote>`** (§2). | „ועל הערכות" blankets the whole dashboard — but revenue/expenses/P&L from dated invoices are **exact** computations; only the tax KPI is an estimate (and it's already labeled „הערכה שנתית", correctly). Per-figure calibration beats page-level hedging. |
| H6 | `src/app/alerts/page.tsx:217-219` | „הצהרת אחריות: התראות אלו מבוססות על נתונים שהוזנו ידנית **ועל היגיון תקופתי בלבד** — אינן מהוות ייעוץ מס מקצועי. **לפני כל פעולה רגולטורית**, מומלץ להתייעץ עם רואה חשבון מוסמך." | OVER-HEDGE | **One-line variant** (§2) + one factual sentence: „מועדי ההגשה נלקחים מלוח המועדים הרשמי; ההתראות מחושבות מהנתונים שהזנת." | Statutory deadlines are facts, not opinions — „היגיון תקופתי בלבד" undersells them. „לפני כל פעולה רגולטורית התייעץ עם רו״ח" tells users they need an accountant to file a VAT report on time — the opposite of the product promise. |
| H7 | `src/app/coach/page.tsx:78-79` | „המידע אינו מהווה ייעוץ מס. countme מבוסס על **מקורות פומביים** ופקודת מס הכנסה 2024. לפני הגשה — התייעצי עם רואה חשבון." | OVER-HEDGE ⚠️(b) | **One-line variant** (§2): „מחשבון מדויק, לא ייעוץ מס — ההגשה לרשות המסים באחריותך." | Under-chat placement is right; the text drifts (feminine-only התייעצי, „מקורות פומביים" vagueness, hardcoded „2024" will rot when tax-year is 2025 — year-versioned data rule says never hardcode). |
| H8 | `src/app/business-expenses/page.tsx:230-238` (`FooterDisclaimer`) | „המידע המוצג מבוסס על פקודת מס הכנסה ({year}) ופרסומים פומביים של רשות המסים. קטגוריות והכרה ספציפית עשויות להשתנות לפי מצב העסק. לפני הגשת הדו״ח — התייעצי עם רואה חשבון." | OVER-HEDGE (mild) | Keep sentences 1–2 (genuine scope caveat — recognition IS business-specific). Replace sentence 3 with the one-liner (§2). | Closest of the old banners to the right register. Fix gendered התייעצי via the shared component. |
| H9 | `src/components/form-1301/form-preview.tsx:164-170` (`DisclaimerFooter`) | „✦ ערכים מחושבים ע״י countme מבוססים על נתוני הלקוח — המידע אינו מהווה ייעוץ מס. האחריות על נכונות הפרטים המוגשים לרשות המסים חלה על הממלא/ת בלבד." | OVER-HEDGE | **One-line variant** (§2). Note: this component is inside the gov.il-faithful frame — keep gov.il styling (exempt from brand tokens per CLAUDE.md), but the TEXT should be the shared canonical string (import the string constant, not the styled component). | „מבוססים על נתוני הלקוח" is actually good (source honesty). The liability sentence duplicates H1 on the same screen. Also: „✦" glyph borders on the no-emoji/no-dingbat brand rule. |
| H10 | `src/components/form-1301/interactive-value.tsx:108-110` | Tooltip badge on every calculated value: „ביטחון גבוה / ביטחון בינוני / ביטחון נמוך" | OVER-HEDGE ⚠️(b) | Relabel the concept from confidence to **data coverage**: „מבוסס על נתונים מלאים / מבוסס על נתונים חלקיים — {מה חסר}". For `confidence === "high"` (the normal case) consider showing nothing — the formula + sources ARE the trust signal. | Flagship surface of the demo. A „ביטחון בינוני" chip on a deterministic computation tells the user our arithmetic might be wrong — it isn't; at most the *inputs* are incomplete. Requires a small `CalcResult` semantic pass (Batch B), not just copy. |
| H11 | `src/app/setup/page.tsx:1389` | Live preview label: „הכנסה חייבת (**הערכה** לשדה 150)" | OVER-HEDGE ⚠️(b) | „הכנסה חייבת (חישוב לשדה 150, לפי הנתונים שהזנת עד כה)" | Field 150 is an exact calculator output — the flagship deterministic number. Calling it „הערכה" undermines (b). The honest caveat is input-completeness, not calculation quality. |

### 1c. OK — correct register today (preserve; several are the model to copy)

| # | file:line | Current text | Class | Notes |
|---|---|---|---|---|
| K1 | `src/components/dashboard/forecast-card.tsx:117` | „הערכה בלבד, לא ייעוץ מס. המקדמות בפועל נקבעות ע״י רשות המסים…; התחזית כאן מבוססת על תכנון ההכנסה הצפויה." | OK | **Positive example.** Genuine estimate surface, says *why* it's an estimate and who decides the real number. Optional micro-tweak to the shared estimate one-liner for consistency; no substantive change needed. |
| K2 | `src/app/dashboard/page.tsx:233` | KPI „מס הכנסה משוער" · sub „הערכה שנתית" | OK | Correct calibration — the tax figure genuinely is an annual estimate. |
| K3 | `src/app/dashboard/page.tsx:306` | „נתונים אמיתיים מתוך החשבוניות וההוצאות" vs „פילוג מוערך — יוצג מדויק עם העלאת חשבוניות תאריכיות" | OK | **Positive example** — exactly the exact-vs-estimate distinction requirement (b) asks for, done inline. |
| K4 | `src/app/dashboard/pl-report/page.tsx:138` | „מס ההכנסה הוא הערכה לפי מדרגות {year}… לחישוב מדויק עיין/י ב-/file." | OK | Correctly labels the one estimated line and points to the exact surface. |
| K5 | `src/app/setup/page.tsx:1192` | „נתוני 2025 מאומתים (מדרגות מס, נקודות זיכוי, תקרות…). תקרות הניכוי לפנסיה ממתינות לאישור סופי…" | OK | **Positive example** — confident where verified, explicit about the one pending item. This is the (b) register. |
| K6 | `src/lib/deadlines/calendar.ts:211,215,222` | „הארכה דרך רואה חשבון…", „אינו אוטומטי — יש לוודא עם רואה החשבון שהגיש בקשת הארכה בשמך." | OK | Factual statements about the ITA extension arrangement — accountant mentions here are correct and pro-coexistence. |
| K7 | `src/app/pricing/page.tsx:31` | „חבילת מסמכים מסודרת לרואה החשבון" | OK | Positions countme as *feeding* the accountant, not replacing — keep; this is good positioning evidence. |
| K8 | `src/app/page.tsx:591` | Testimonial: „כל דיווח בזמן, בלי לרדוף אחרי רואה חשבון." | OK (borderline) | „Without chasing" ≠ „without having" — reads as an ops/latency claim. Fine, pending the O6 decision on fictional testimonials generally. |
| K9 | `public/manifest.json:4` | „המוצר שמלווה עצמאים ישראלים במילוי דו״חות מס" | OK | The safe phrasing — use it as the base for fixing O1. |
| K10 | `src/lib/alerts/index.ts` (all alert copy, e.g. :153, :161, :238, :257) | Deadline facts + gentle operational nudges („כדאי לרשום אותן עכשיו") | OK | Operational bookkeeping nudges, not tax advice. Note: mild style drift vs the coach's facts-not-advice word-ban — acceptable; that ban is an LLM-guardrail, not a legal rule. |
| K11 | `src/lib/form-1301/modules.ts:135,145,147,171` | Eitan step narration („פה אנחנו חוסכים כסף", „שווה לדווח") | OK (watch) | Factual rules with warm framing. „שווה לדווח" (:171) is a mild advice-word — acceptable (reporting a donation is not a judgement call), but keep off the advice-verb list in future copy. |
| K12 | `src/app/demo/page.tsx:212`, `src/app/setup/page.tsx:1715-1735` (`OsekZeirNote`), `src/lib/calculators/index.ts` formula/notes strings | Zeir-track math explanations, calculator formulas and notes | OK | Pure facts with numbers — the register the rest of the product should converge to. |

### 1d. N-A — internal / not user-facing

| # | file:line | What | Notes |
|---|---|---|---|
| N1 | `src/lib/regulatory/classify.ts:40-51` | Regulatory-watch classification prompt | Machine pipeline; output feeds internal constants review, not UI prose. |
| N2 | `src/app/api/upload/route.ts:295-324` | Document-extraction prompts | Returns JSON; never rendered verbatim. |
| N3 | `src/app/api/parse-invoice/route.ts:13-25` | Invoice NL→JSON prompt | Same. |
| N4 | `src/lib/regulatory/deductions.ts:104,136`, `src/lib/business-expenses/profiles.ts:108-116,285` | „ייעוץ מקצועי / רואה חשבון" as expense *categories* + „הציגי בקבלה אצל רו״ח" pointer | Factual domain data; the רו״ח mentions are pro-coexistence, keep. |
| N5 | `src/lib/persona.ts:166`, `src/lib/calculators/capital.ts:7` | Code comments („flagged to a רו"ח") | Comments only. |
| N6 | `src/app/about/page.tsx` | Technical architecture page (developer-facing) | Describes Eitan as „אח חכם" — fine; no advice/replacement claims. |

---

## 2. Canonical disclaimer — for a future shared `<LegalNote>` component

**DRAFT — NEEDS LEGAL REVIEW**

**Canonical (max 2 sentences) — the ONE banner text, everywhere a banner exists today (H1, H5, H6, H8-context, H9):**

> countme מחשב במדויק לפי הנתונים שהזנת וכללי המס הרשמיים — מחשבון מדויק, לא ייעוץ מס. האחריות על הדוח המוגש לרשות המסים היא שלך, ושאלה שדורשת שיקול דעת מקצועי — מקומה אצל רואה חשבון או יועץ מס מוסמך.

**One-line variant (tight spots — footers, tooltips, chat underline; H2, H4, H7, H9):**

> מחשבון מדויק, לא ייעוץ מס — ההגשה לרשות המסים באחריותך.

**Estimate-surface variant (ONLY on genuine estimates — tax estimate gate, forecast card, undated P&L split; H3, K1):**

> הערכה לפי הנתונים שהזנת — הסכום הסופי נקבע בשומה של רשות המסים.

Component rules (for the Batch-B pass):
1. **One `<LegalNote>` per page, max.** Today /demo carries four notices; the count itself signals doubt (violates (b)).
2. Gender-neutral phrasing baked in once (current banners drift: התייעצי/התייעץ, הממלא/ת).
3. Text lives as an exported string constant next to the component so `form-preview.tsx` (gov.il-styled, brand-exempt) can import the *string* without the brand styling.
4. No tax-year hardcoding inside the note (H7's „פקודת מס הכנסה 2024" would have rotted).

---

## 3. Scope statement — for /legal or footer page

**DRAFT — NEEDS LEGAL REVIEW**

### מה countme כן

- מחשב במדויק כל שדה נתמך בטופס 1301 מהנתונים שהזנת — כל מספר מגיע עם הנוסחה והמקור שלו, וניתן ללחוץ ולבדוק.
- עוקב אחרי מועדי הדיווח שלך — מע״מ, מקדמות, ביטוח לאומי, דוח שנתי — ומתריע בזמן, לפי לוח המועדים הרשמי.
- מסביר בעברית פשוטה את כללי המס הפומביים הרלוונטיים לך: מדרגות, נקודות זיכוי, הוצאות מוכרות, מסלול עוסק זעיר.
- מארגן חשבוניות, קבלות והוצאות לאורך השנה — כולל חבילת מסמכים מסודרת לרואה החשבון, אם יש לך כזה.
- מציג הערכת מס שנתית לפי הנתונים שהזנת — ומסמן אותה תמיד כהערכה.
- מתעדכן לפי פרסומים רשמיים של רשות המסים והביטוח הלאומי, בנפרד לכל שנת מס.

### מה countme לא

- לא ייעוץ מס, ייעוץ פיננסי או ייעוץ משפטי — ואיננו מייצגים אותך מול רשות המסים.
- לא מגיש את הדוח בשמך — את/ה מגיש/ה, והאחריות על הנתונים שמוגשים היא שלך.
- לא תחליף לשיקול דעת מקצועי במצבים מורכבים: מס שבח, שינוי מבנה עסקי, הכנסות חו״ל מורכבות, ביקורת או השגה.
- לא ממציא נתונים — מחשב רק ממה שהזנת; נתון שחסר לא ייכנס לחישוב.
- לא מבטיח תוצאה מול רשות המסים — קביעת השומה הסופית בידי הרשות.
- לא מאמת את מסמכי המקור שלך — נכונות החשבוניות והקבלות שהזנת באחריותך.

---

## 4. Requirement-(b) calibration map — exact vs estimate surfaces

The core drift found: **hedging language sits at page level, so it blankets exact computations together with genuine estimates.** The fix is per-figure calibration:

**Exact surfaces — deterministic engine + golden tests. Never say „הערכה", „בלבד", „עלול להכיל טעויות"; say what it's computed FROM:**
- The 8 star-field calculators + 046/miluim (`lib/calculators/index.ts`) and every `<InteractiveValue>` (H10 — fix the „ביטחון" chip).
- Setup live preview of field 150 (H11).
- Dashboard revenue / expenses / net-profit KPIs and dated-invoice P&L (H5 — banner wrongly says „ועל הערכות").
- Form-1301 preview values (H1/H2/H9 — „לא אחראי לטעויות" contradicts the guarantee).
- Eitan's tool-fetched numbers (`lib/agent/tools.ts` — already instructs „אל תמציא מספרים… קרא לכלי"; OK).

**Estimate surfaces — keep (better: standardize) estimate framing + say who/what determines the final number:**
- `estimateTaxLiability` everywhere it renders: /demo estimate gate (H3), dashboard tax KPI (K2), P&L income-tax line (K4).
- Cash-flow / mikdamot forecast (K1 — already exemplary).
- Undated P&L monthly split (K3 — already exemplary).

**The one honest caveat exact surfaces MAY carry:** input completeness („לפי הנתונים שהזנת") — never calculation quality.

---

## 5. Batch-B application checklist (ordered)

1. **P0 — `api/coach/route.ts:24`** (O2): the replacement-claim prompt line; also :48 (O3), :55 (O4). Model output multiplies these on every chat.
2. **P0 — `layout.tsx:17`** (O1): site-wide meta description.
3. **P1 — build `<LegalNote>`** (canonical + one-line + estimate variants, §2) and replace H1, H2, H4, H5, H6, H7, H8(sentence 3), H9. Enforce one-per-page on /demo.
4. **P1 — `lib/p-and-l/expense-ratio.ts`** (O8-O10): make copy factual at source; then delete `neutralizeAdvice()` in `expense-ratio-card.tsx` (its comment says exactly this).
5. **P2 — requirement-(b) relabels:** interactive-value confidence chip (H10), setup „הערכה לשדה 150" (H11), estimate-gate subtitle (H3), chat-panel greeting „בלי דאגה" (O7).
6. **P2 — landing testimonials** (O5, O6): founder + legal decision on fictional testimonials; at minimum swap the O5 quote and add „להמחשה בלבד".
7. **P3 — minor:** „מאומת" aria-labels (O11), „✦" glyph in form-preview footer (H9 note), gendered-drift cleanup (handled by the shared component).

*Everything in §§2-3 and every „Proposed replacement" above: DRAFT — NEEDS LEGAL REVIEW.*
