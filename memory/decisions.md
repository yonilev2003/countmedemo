# decisions — יומן החלטות נעולות

> החלטות שלא חוזרים עליהן בלי דיון מחדש. הטבלה המורחבת של החלטות-המוצר חיה ב-`CLAUDE.md`
> ("Project decisions" + "Design decisions"); כאן ההחלטות הפעילות + ההנמקה התמציתית.

## אבטחה + מבנה ריפו (09/06/2026)

| החלטה | ערך | הנמקה |
|---|---|---|
| זיהוי IP ל-rate-limit | `x-real-ip` קודם, XFF רק fallback | האיבר הראשון ב-`x-forwarded-for` נשלט ע"י הלקוח (Vercel רק *מוסיף* בסוף) — העדפתו = עקיפת rate-limit. סופי. |
| persona מהלקוח → פרומפט | כל שדה עובר cap (`lib/api/persona-context.ts`) | בלי זה שדה ענק עוקף את מגבלת ההודעה ומנפח טוקנים על חשבוננו. סופי. |
| קוד משותף ל-API routes | `src/lib/api/` — לא מעתיקים rate-limit/validation/SSE לתוך route | תיקון אבטחה במקום אחד במקום ארבעה. |
| `docs/form-screenshots` | נשאר בריפו | חשוב לתהליך ולניהול ידע (הפך החלטה קודמת; CLAUDE.md עודכן). |
| `crm-snapshot/` | נשאר זמנית, מיועד לריפו נפרד | לא לגדל אותו כאן. ההעברה תיעשה ידנית (אין הרשאת יצירת ריפו מהסשן). |
| `design_handoff_countme 2/` | נשאר | מיועד להטמעה בקרוב. |
| דפדפן-אוטומציה יחיד | Playwright בלבד (`@playwright/test@1.56.1` exact) | puppeteer הוסר; הצמדה ל-1.56.1 כי קונטיינר Claude web מספק Chromium 1194 וחוסם הורדות דפדפן. |

## Brand Kit (נעול 03/06/2026)

| החלטה | ערך | הנמקה |
|---|---|---|
| פונט | **Assistant** בלבד (משתנה `--font-assistant`) | מחליף Heebo/Rubik — פונט יחיד לכל גופות האפליקציה, Hebrew+Latin, Google Fonts. סופי. |
| פלטת צבעים | נייבי `#083A4F` / בז' `#C8B59A` / טיל `#407E8C` | מחליף את צבעי amber הישנים. טוקנים ב-`globals.css`, לא לשנות ישירות בקומפוננטות. סופי. |
| Brand primitives | `src/components/brand/{logo,button,icons,status}.tsx` | מקור-אמת לכל UI מחוץ ל-`/demo`. אסור לכתוב כפתור/אייקון ישירות — רק דרך הפרימיטיבים. |
| `/demo` exempt | הפורם ב-`/demo` לא עבר ריברנד | gov.il faithful — החלטה נעולה מהתחלה. כל `gov-*` class בפורם — לא לגעת. |
| emoji = אסור | ללא emoji בכל האפליקציה | Brand Kit README אומר מפורשות "No emoji". רק אייקוני קו מ-`icons.tsx`. |
| Brand Kit מיקום | `Brand Kit/README.md` | קנוני לכל AI session עתידי — לקרוא לפני עבודת UI. |

## מודל שנות-המס (נעול 31/05/2026)

| החלטה | ערך | הנמקה |
|---|---|---|
| ברירת-מחדל לתצוגה | **2024** (`DEFAULT_VIEW_YEAR`) | יציבות לדמו EY — `/demo` ו-`/file` נוחתים על שנה מוכרת |
| שנה פתוחה להגשה | **2025** (`ACTIVE_FILING_YEAR`) | הדו"ח שמגישים *עכשיו* (היום 2026) הוא לשנת 2025 |
| מודל סטטוס | filed / open / future | 2024 הוגש (קריאה בלבד) · 2025 פתוח · 2026 עתידי/בצבירה |
| נתוני דמו ל-2025 | מיחזור 2024 (אותם 248,500/47,800) | להראות שנה פעילה מאוכלסת בלי נתונים חדשים |
| `TAX_YEAR_2026` | מהסקיל `israeli-tax-returns`, עם `TODO(Roy)` | מדרגות 2025 *שגויות* ל-2026 (חוק ההתייעלות) — עדיף ערך-סקיל מסומן מאשר ערך-שגוי שקט |

## עקרונות עבודה

- **לא משנים מספרי מס בשקט.** כל ערך שנתי-משתנה שאינו ודאי → `TODO(Roy)` עד אישור מול המקור
  הרשמי. הסקילים ה-`israeli-*` הם סמכות-הדומיין; לא להסתמך על ידע training לסכומים שמתעדכנים שנתית.
- **single-source לשנים:** כל rate/cap/rule זורם מ-`lib/calculators/types.ts` → אסור לקודד ערך
  בקומפוננטה/מחרוזת/דוח.
- **worktrees לאצוות עצמאיות בלבד.** פיצ'ר מצומד (קבועים→פרסונה→schema→UI) נעשה במסלול יחיד —
  worktrees מקבילים עליו רק ייצרו קונפליקטים.
- **חתימת commit:** נכשלת בתוך worktrees (שרת החתימה דורש את ה-checkout הראשי) → סוגרים קומיטים
  מהמאגר הראשי (cherry-pick), או `--no-gpg-sign` ב-worktree ואז cherry-pick.

## החלטות תיעוד (31/05/2026)

- **זיכרון הפרויקט = `memory/`** עם 4 מסמכים: `readme` · `status` · `progress` · `decisions`.
- **`HANDOFF.md` נמחק** — הוחלף ע"י `memory/STATUS.md` + `memory/progress.md`.
- **`CLAUDE.md`** נשאר ייעודי ל-Claude Code (הקשר ארכיטקטוני), לא לסטטוס-סשן.
- **טראקר המשימות** (`docs/meeting-records/yoni-tasks-27032026.md`) נשאר מקור-אמת ל-11 המשימות.

## רקע (מ-CLAUDE.md, לא לפתוח מחדש)

Stack: Next.js 16 + React 19 + TS + Tailwind 4 + Anthropic SDK · Vercel · Supabase (יום 2+) ·
מודל AI ברירת-מחדל `claude-sonnet-4-6` · עברית RTL בלבד · הטופס = רפרנס ויזואלי (לא rebuild 1:1) ·
פרסונה כ-JSON יחיד ב-`personas/dana-cohen.json`.
