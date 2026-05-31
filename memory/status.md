# status — איפה אנחנו עכשיו

> עודכן: 2026-05-31 · ענף עבודה: `claude/great-sagan-eqzCH` (נדחף ל-origin, טרם מוזג ל-main).

## מצב הקוד

- ✅ עץ עבודה נקי, מסונכרן מלא עם origin, אין שינויים לא-דחופים.
- ✅ `npm run build` עובר · `tsc --noEmit` נקי · smoke-test HTTP (8 מסלולים → 200).

## אחוזי ביצוע (11 משימות הפ"ע)

| מצב | משימות | הערה |
|---|---|---|
| ✅ מוגמר/כמעט | #7 (100%), **#4 (95%)**, #3 (90%), #5 (90%), #9 (85%) | כל הסקופ הלא-חסום |
| 🟡 חלקי | #8 (70% — הליבה עובדת) | חסום DB (יום 2+) |
| ⛔ חסום על פגישות | #1, #2, #6, #10, #11 (0%) | רוי / פ"ע שלושתם |

**≈100% מהסקופ הלא-חסום הושלם.** מקור-אמת מלא: `docs/meeting-records/yoni-tasks-27032026.md`.

## חסום — ממתין לאנשים

| נושא | חסום על | מה צריך |
|---|---|---|
| **ערכי מס 2025 + 2026** (#4) | רוי | אישור כל ה-`TODO(Roy)` ב-`types.ts`: מדרגות 3–5 ל-2026 (228K/301,200), סף/שיעורי ב"ל (7,703 + תיקון 252), תקרות קרן/פנסיה/6111/עוסק-פטור |
| #1 גבול רו"ח↔AI | פ"ע שלושתם | מיפוי מה מחייב רו"ח מול מה ש-AI מכסה |
| #2 תיאום מס + מקדמות ב"ל | רוי | נוסחאות → ואז shell UI |
| #6 מעבר לגוגל קלאוד | רוי | פגישת בירור עלות (כיום Vercel) |
| #10 תכנון↔ביצוע 1301 | רוי | פגישת אפיון פערים |
| #11 מסמך MVP | רוי + תומי | ליצור `MVP.md` + פגישות |

## פתוח ידנית (לא חוסם, לא דורש פגישה)

- 👁️ **אימות ויזואלי** של מודל שנות-המס: באדג'י סטטוס (הוגש/פתוח/עתידי) ב-/demo ובדשבורד, מעבר
  שנים (2025 → 248,500), empty-state של 2026. לא ניתן headless בסביבת הענן (אין דפדפן, חסימת רשת).
- 📋 אפשר לפתוח **PR** מ-`claude/great-sagan-eqzCH` למעבר מסודר על ה-diff.

## נקודות כניסה מהירות

| נושא | קבצים |
|---|---|
| קבועי מס per-year + מחזור-חיים | `src/lib/calculators/types.ts` (`getTaxYearConstants`, `ACTIVE_FILING_YEAR`, `getYearStatus`) |
| באדג' סטטוס שנה + בורר | `src/components/year-status-badge.tsx`, `src/lib/p-and-l/index.ts` (`taxYearsForUI`/`personaForYear`) |
| מרשם ניכויים (rate/cap/formFields/plImpact/skill) | `src/lib/regulatory/deductions.ts` |
| 8 ה-calculators + הערכת מס | `src/lib/calculators/index.ts` |
| התראות / מועדים / תחזית | `src/lib/alerts/index.ts`, `src/lib/deadlines/calendar.ts`, `src/lib/forecast/index.ts` |
| דו"ח רווח-והפסד | `src/lib/p-and-l/{index,israeli-report}.ts`, `src/app/dashboard/pl-report/page.tsx` |
