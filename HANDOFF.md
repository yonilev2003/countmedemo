# Handoff — לסשן הבא

> מסמך מסירה בין סשנים. סשן ענן (Claude Code on the web) מקבל **רק את הריפו** — לא את היסטוריית
> השיחה. כל מה שצריך כדי להמשיך נמצא כאן, בקוד, ובמעקב המשימות החי.
>
> מצב: הסבב הנוכחי מוזג ל-`main`. מקור-אמת למשימות: `docs/meeting-records/yoni-tasks-27032026.md`.
> עודכן: 2026-05-29.

---

## 1. מטרת-העל

countme — מוצר fin-ops מבוסס-AI לעצמאים ישראלים מתחת לגיל 35. היעד הקרוב: **דמו ל-EY** דרך מאיץ
Momentum — טופס 1301 עם כל הערכים מחושבים מראש, כל ערך לחיץ (נוסחה + מקור), וצ'אט חופשי. מעבר
לדמו — בניית ה-MVP לפי 11 משימות הפ"ע (ראו טבלת המעקב).

---

## 2. מה הושלם בסבב הזה (אינטגרציה + בנייה)

**שחזור ענפים תקועים** (במקום בנייה מאפס):
- `dazzling-keller-aHGGa` → **PWA** (manifest+SW), **ceiling-alert** (תקרת ₪120K), **`TAX_YEAR_2025`** +
  `getTaxYearConstants()`, ומרשם הניכויים year-keyed. מיזוג נקי.
- `funny-maxwell-K7dK2` → 5 סקילי Tier-1 (כולל `israeli-freelancer-ops` עם `deadline-calendar`).
- `build-crm-system-KcTPb` → CRM כ-`crm-snapshot/` תוספתי בלבד (sub-app עצמאי, מבודד מה-build).

**פיצ'רים שנבנו:**
- **#4 בורר שנת מס** (2024/2025) ב-`setup`, מחליף את הקיבוע ל-2024; ברירת מחדל 2024 (ערכי 2025 = `TODO(Roy)`).
- **#3 תיבת התראות `/alerts`** — תקרת זעיר + מקדמות מע"מ (לפי מחזור/תדירות) + תזכורת הוצאות חודשית + התראות מועדים.
- **#5 לוח מועדים** — `src/lib/deadlines/calendar.ts` (9 מועדים) + דף `/deadlines` + חיבור ל-`/alerts`.
- **#8 פולו-אפ/הערות (v1)** — `src/lib/crm/notes.ts` (localStorage), הערות על מועדים ב-`/deadlines`.
- **#9 תחזית מקדמות** — `src/lib/forecast/` + `ForecastCard` בדשבורד: הקרנה לפי חודש חזק/ממוצע/חלש + תכנון-מול-ביצוע.

**בדיקה עצמית (תוקן):** תוויות שנה דינמיות בדשבורד/דמו (היו קשיחות 2024) · הסרת כפילות מע"מ בין #3 ל-#5
(התראות-מועד מדלגות `maam`) · ריצת מס יחידה לכל תרחיש ב-#9.

---

## 3. אחוזי ביצוע (11 משימות הפ"ע)

| מצב | משימות | % |
|---|---|---|
| ✅ מוגמר/כמעט | #7 (100%), #4 (90%), #3 (90%), #9 (85%), #5 (90%) | — |
| 🟡 חלקי | #8 (70% — הליבה עובדת) | — |
| ⛔ חסום על פגישות | #1, #2, #6, #10, #11 (0%) | — |

**סיכום: ≈48% כולל · ≈100% מהסקופ הלא-חסום.** כל מה שאינו חסום על רוי/תומי הושלם.

---

## 4. מה נותר — הכל חסום על אנשים

| משימה | חסום על | מה צריך |
|---|---|---|
| #1 גבול רו"ח↔AI | פ"ע שלושתנו | מיפוי מה מחייב רו"ח מול מה ש-AI מכסה |
| #2 תיאום מס + מקדמות ב"ל | רוי | נוסחאות → ואז shell UI |
| #6 מעבר לגוגל קלאוד | רוי | פגישת בירור עלות (כיום Vercel) |
| #10 תכנון↔ביצוע 1301 | רוי | פגישת אפיון פערים |
| #11 מסמך MVP | רוי + תומי (נפרד) | ליצור `MVP.md` + פגישות |

**חסום משני:** ערכי 2025 (#4) ומבנה משימות CRM (#8) ← רוי/תומי · חיבור Supabase (#3 persist, #8 מלא) = "יום 2+".

---

## 5. נקודות כניסה מהירות (ramp-up)

| נושא | קבצים |
|---|---|
| מעקב משימות חי (מקור-אמת) | `docs/meeting-records/yoni-tasks-27032026.md` |
| קבועי מס per-year + בורר שנה | `src/lib/calculators/types.ts`, `src/app/setup/page.tsx` |
| מרשם ניכויים (rate/cap/formFields/plImpact/skill) | `src/lib/regulatory/deductions.ts` |
| 8 ה-calculators + הערכת מס | `src/lib/calculators/index.ts` |
| התראות (תקרה/מע"מ/הוצאות/מועדים) | `src/lib/alerts/index.ts`, `src/app/alerts/page.tsx` |
| לוח מועדים + פולו-אפ | `src/lib/deadlines/calendar.ts`, `src/lib/crm/notes.ts`, `src/app/deadlines/page.tsx` |
| תחזית מקדמות | `src/lib/forecast/index.ts`, `src/components/dashboard/forecast-card.tsx` |
| דו"ח רווח-והפסד (seam של plImpact) | `src/lib/p-and-l/{index,israeli-report}.ts`, `src/app/dashboard/pl-report/page.tsx` |
| CRM עצמאי (sub-app) | `crm-snapshot/`, `docs/crm-architecture.md` |
| מודל התקנת סקילים + קטלוג | `CLAUDE.md` ("Skills — install model"), `skills-lock.json`, `.claude/skills/` |

**להרצה:** `npm install && npm run dev` → `localhost:3000`. **לפני push:** `npm run build`.
**סקיל on-demand:** `npx skills add skills-il/<category> --skill <name> --agent claude-code --copy -y`.
