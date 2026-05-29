# Handoff — לסשן הבא

> מסמך מסירה בין סשנים. נכתב כי סשן ענן (Claude Code on the web) מקבל **רק את הריפו** —
> לא את היסטוריית השיחה הקודמת. כל מה שצריך כדי להמשיך נמצא כאן ובקוד.
>
> ענף עבודה (סשן נוכחי): `claude/skillsalle-ai-accountant-skills-qQ9dF` · HEAD: `be4c09b` · תאריך: 2026-05-29
> עבודה קודמת (תשתית רגולטורית year-keyed + P&L) בענף `claude/dazzling-keller-aHGGa` (HEAD `b521a2b`) — **טרם מוזגה ל-main**, ולכן `src/lib/regulatory/deductions.ts` אינו קיים בענף הנוכחי. שני הענפים יתלכדו ב-main.

---

## 1. מטרת הסשן

**המטרה העל:** countme — מוצר fin-ops מבוסס-AI לעצמאים ישראלים מתחת לגיל 35. היעד הקרוב הוא
ה-**דמו ל-EY** דרך מאיץ Momentum: טופס 1301 עם כל הערכים מחושבים מראש, כל ערך לחיץ (נוסחה +
מקור), וצ'אט חופשי. מעבר לדמו — בניית ה-MVP לפי תוכנית העבודה.

**מטרת הסשן הבא (קונקרטית), לפי סדר עדיפויות:**

1. **`Setup: בורר שנת מס`** — כרגע `income.year` קשיח ל-2024 (`src/app/setup/page.tsx`), כך
   שכל תשתית 2025 שבנינו לא נגישה למשתמש בפועל. שינוי קטן שמפעיל הרבה.
3. להמשיך את שאר ה-worktrees (§5) לפי עדיפות.

---

## 2. מה עשינו (הסשנים האחרונים)

**הסשן הנוכחי — `skills-persistence` (פתרון פער הסקילים):**
- **אבחנה שהושלמה:** ה"website" שיוני קרא לו *SkillsAlle* הוא ארגון [skills-il](https://github.com/skills-il)
  (`agentskills.co.il`). עברנו על כל הקטלוג (~21 ריפו-קטגוריות) ומיינו כל סקיל ל"רלוונטי
  ל-AI accountant / סטארטאפ ישראלי" מול "לא רלוונטי" (כלל: נדיב — בספק → רלוונטי). יוני אישר את החלוקה.
- **שורש הבעיה שתוקן:** `.gitignore` התעלם מכל `.claude/`, ולכן כל סקיל שהותקן מעולם לא נשמר ל-git
  (וגם `~/.claude/` הוא ephemeral בענן). שונה ל-`.claude/*` + `!.claude/skills/` — תיקיית הסקילז נשמרת,
  שאר ה-state המקומי עדיין מוחרג.
- **מודל 3 השכבות (מאושר ע"י יוני, אחרי דיון מעמיק על יתרונות/חסרונות):**
  - **Tier 1 — Core (13, מחויב ל-git):** מומשו כתיקיות תחת `.claude/skills/` ונטענים אוטומטית בכל סשן.
    הרשימה: `israeli-tax-returns`, `israeli-vat-reporting`, `israeli-tax-withholding`, `israeli-bituach-leumi`,
    `israeli-financial-reports`, `israeli-expense-categorizer`, `israeli-receipt-scanner`, `israeli-e-invoice`,
    `israeli-id-validator`, `hebrew-i18n`, `hebrew-tailwind-preset`, `israeli-accessibility-compliance`,
    `israeli-ui-design-system`.
  - **Tier 2 — קטלוג מאומת (122 סקילז, ב-`skills-lock.json` בלבד):** לא ממומשים כתיקיות → אפס עלות
    קונטקסט, ואינם מדללים את בחירת הסקיל. נמשכים on-demand ב-~2ש' עם
    `npx skills add skills-il/<category> --skill <name> --agent claude-code --copy -y`.
  - **Tier 3 — מוחרג:** קטגוריות צרכניות (בריאות/אוכל/חינוך/תחבורה-אישית וכו') — מתועד שלא להתקין.
- **CLAUDE.md שוכתב:** קטע "Skills installed" הישן הוחלף ב"Skills — install model" עם טבלת ה-13,
  מדיניות ה-on-demand, ואזהרה לא להריץ `npx skills experimental_install` שגרתית (היה ממש את כל ה-110 ומדלל).
- **אומת:** כל 13 ה-core נטענים אוטומטית בסשן; משיכת on-demand של סקיל Tier-2 עובדת ב-~2ש';
  `design-systems` אינו ניתן להתקנה כסקיל (DESIGN.md בלבד, אין SKILL.md) → מוחרג בצדק.
- **PR #13** נפתח (לא מוזג, לפי בקשת יוני). CI ירוק (Vercel deploy + preview comments = success).

**סשן קודם — `pl-deductions-connect` (בענף `claude/dazzling-keller-aHGGa`):**
- חיבר את `plImpact` מהמרשם לתוך דו"ח הרווח-וההפסד (`src/lib/p-and-l/israeli-report.ts`).
- `classifyExpensePLImpact(category, year)` ב-`deductions.ts` ממפה קטגוריית הוצאה → `plImpact`
  + שיעור הכרה (`recognizedRate`), מהמרשם.
- `expenseBreakdown` (ב-`src/lib/p-and-l/index.ts`) נושא כעת `plImpact` + `recognizedRate`.
- הדו"ח מנתב לפי impact: עלות-המכר מעל הרווח הגולמי, תפעולי מתחת, ו**ניכויים מההכנסה**
  (ב"ל/קרן/פנסיה) יורדים לסעיף "ניכויים אישיים" מתחת לרווח התפעולי ומקטינים את ההכנסה החייבת.
- **self-audit תפס באג**: הניתוב הוריד 100% מהכנסה חייבת, אבל ביטוח לאומי מוכר רק 52% (המרשם
  עצמו מצהיר `rule:"partial"`/`ratePercent:52`). תוקן — מיישמים את שיעור ההכרה; השורה מסומנת "52% מוכר".

**תשתית רגולטורית year-keyed (הליבה הארכיטקטונית, בענף `claude/dazzling-keller-aHGGa`):**
- `src/lib/calculators/types.ts` — קבועים per-year, `TAX_YEAR_2024` + `TAX_YEAR_2025`,
  `getTaxYearConstants(year)` עם registry. כל ערך ב-2025 הוגדר במפורש (FROZEN/STABLE/CARRIED→`TODO(Roy)`).
  תקרת עוסק פטור === עוסק זעיר מובטחת מבנית (קבוע משותף לכל שנה).
- `src/lib/regulatory/deductions.ts` — מרשם ניכויים year-keyed. כל פריט מצהיר: `formFields`
  (קודי 1301), `plImpact` (איך זורם בדו"ח), `skill` (הסקיל שבבעלותו הכלל — כעת מצביע על סקילים
  אמיתיים שניתנים להתקנה מ-skills-lock.json).
- כל ה-calculators + chat/coach routes + setup + P&L קוראים כעת שנה מהפרסונה, לא קשיח.

**מה שהתברר כבר-בוצע:** `wt/api-hardening` — rate limiting (12/דק' per-IP), ולידציה + ניקוי
control chars (`src/app/api/chat/route.ts`), ו-error boundaries (`error.tsx`, `global-error.tsx`).

קומיטים מרכזיים: `be4c09b` (skills-persistence, ענף נוכחי) · `b521a2b` (fix 52%), `3fcb019`
(pl-deductions-connect), `54f9fe6` (מרשם + מדריך סקילים), `4ee642d` (קבועי שנה), `4014095`
(פילטרי חשבוניות), `7d7fc06` (PWA + ceiling) — האחרונים בענף `claude/dazzling-keller-aHGGa`.

---

## 3. מה הצלחנו

- **פער הסקילים (ה"קריטי ביותר") נפתר** — 13 סקילי core מחויבים לריפו ב-`.claude/skills/`, קטלוג
  מאומת של 122 סקילז ב-`skills-lock.json`, ו-CLAUDE.md משקף את המודל. אומת מקצה-לקצה. נותר רק מיזוג PR #13.
- **`pl-deductions-connect` סגור מקצה לקצה** + תיקון הנכונות, מקומפל (build exit 0) ומאומת
  בריצה אמיתית על שתי פרסונות: דנה (ללא ניכויים אישיים → זהה לקודם, הדמו יציב) ו-fallback
  (ב"ל 10,000 → 5,200 מוכר → מס על 154,800). (בענף הרגולטורי.)
- **התשתית הקשה הושלמה** — backbone רגולטורי year-keyed, ה-seam של P&L, וחיזוק ה-API.
  אלה החלקים הארכיטקטוניים; מה שנשאר הוא בעיקר רוחב-UI ופריטים חסומים על אנשים.

### אחוזי ביצוע

| Worktree / רכיב | מצב | % מספרי | הערכת מאמץ/משאבים |
|---|---|---|---|
| **התקנת סקילים (skills-il): core+קטלוג** | ✅ מוזג | 100% | PR #13 מוזג ל-main |
| תשתית year-keyed + 2025 | ✅ קוד | 100% | ערכי 2025 חסומים על רוי (CARRIED) |
| מרשם ניכויים + מדריך סקילים | ✅ | 100% | — |
| PWA | ✅ | ~90% | אולי חסרים אייקונים — לאמת |
| התראת תקרת ₪120K | ✅ | 100% | — |
| פילטרי חשבוניות + הקצאה יציבה | ✅ | 100% | — |
| `api-hardening` | ✅ | 100% | — |
| `pl-deductions-connect` | ✅ | 100% | סשן קודם |
| `onboarding-tos` | ⬜ | 0% | בורר שנה+שדות בר-ביצוע; TOS חסום על תומי |
| `alerts-inbox` | 🟨 | ~20% | `CeilingAlertCard` קיים; אין route/inbox/תזכורת |
| `tax-coordination-shells` | ⬜ | 0% | shells בר-ביצוע; נוסחאות חסומות על רוי |
| `landing-waitlist` | ⬜ | 0% | — |

**סיכום:** ~8/13 משימות גמורות בקוד. מבחינת מאמץ — החלקים הקשים (תשתית + פתרון פער הסקילים)
גמורים; הנותר מפוזר על הרבה פיסות UI קטנות + 2 מסלולים חסומים על רוי/תומי.

---

## 4. מה לא הצלחנו (פערים פתוחים)

**א. פער הסקילים — ✅ נפתר בסשן הזה (היה ה"קריטי ביותר").**
הסקילים ה-`israeli-*` המתועדים ב-CLAUDE.md אכן **לא היו קיימים בסביבת הענן** (לא בריפו, לא ברמת
המשתמש) — נבדק בעבר על כל ה-filesystem. הסיבה: סשן ענן משכפל רק את הריפו, והסקילים שהותקנו
מקומית ישבו ב-`~/.claude/skills/` (ephemeral) ומעולם לא נוקמטו. **הפתרון (אופציה #1) בוצע:** 13 ה-core
נוקמטו ל-`.claude/skills/` (תוקן ה-`.gitignore` שחסם אותם), והשאר רשומים ב-`skills-lock.json`.
**PR #13 מוזג ל-main** (2026-05-29) — כל סשן ענן עתידי מקבל את 13 הסקילים אוטומטית. שדה ה-`skill:`
במרשם הניכויים מצביע כעת על סקילים שניתנים למשיכה בפועל.

**ב. ערכי 2025 לא מאומתים** — כל `TODO(Roy)` ב-`TAX_YEAR_2025` (תקרות, סף 6111, סף ב"ל) נושאים
את ערך 2024 עד אישור רוי.

**ג. שנת המס קשיחה ב-setup** — `src/app/setup/page.tsx` עדיין `year: 2024`, כך שמסלול 2025
לא נגיש דרך ה-UI.

**ד. worktrees שלא התחילו** — onboarding-tos, alerts-inbox (חלקי), tax-coordination-shells,
landing-waitlist.

---

## 5. מה נותר כדי להצליח

**סקילים — ✅ הושלם לחלוטין:** אופציה #1 בוצעה, PR #13 מוזג ל-main. כל סשן ענן עתידי טוען
את 13 ה-core אוטומטית. (אם סקיל Tier-2 יתברר כנחוץ תדיר → לקדם ל-Tier 1: להוסיף תיקייתו
תחת `.claude/skills/` ושורה בטבלת ה-core ב-CLAUDE.md.)

**worktrees עצמאיים (ניתן במקביל — קבצים נפרדים):**
- `wt/onboarding-tos` — בורר שנת מס (תיקון `setup/page.tsx`) + שדות (מילואים/ילדים/עלייה/בן-זוג). TOS חסום על תומי.
- `wt/alerts-inbox` — route `/alerts` + תזכורת הוצאות חודשית + חיבור `CeilingAlertCard` לתיבה.
- `wt/tax-coordination-shells` — shells לתיאום מס + מקדמות ב"ל ("ממתין רוי") + שדות 1301 חדשים (UI בלבד).
- `wt/landing-waitlist` — עיצוב דף נחיתה + הטמעת Typeform/Google Form + mobile responsive.

**חסום על רוי:** אישור ערכי 2025; נוסחאות תיאום מס; לוגיקת מקדמות ב"ל.
**חסום על תומי:** טקסט TOS; מסמך UX/UI.

---

## נקודות כניסה מהירות (ramp-up)

| נושא | קבצים |
|---|---|
| מודל התקנת הסקילים (3 שכבות) + טבלת core | `CLAUDE.md` (קטע "Skills — install model") |
| קטלוג סקילים מאומת (122, נמשכים on-demand) | `skills-lock.json` |
| סקילי core מחויבים | `.claude/skills/` (13 תיקיות) |
| קבועי מס per-year | `src/lib/calculators/types.ts` |
| מרשם ניכויים (rate/cap/formFields/plImpact/skill) | `src/lib/regulatory/deductions.ts` *(בענף הרגולטורי)* |
| 8 ה-calculators של הדמו | `src/lib/calculators/index.ts` |
| דו"ח רווח-והפסד (ה-seam של plImpact) | `src/lib/p-and-l/{index,israeli-report}.ts` + `src/app/dashboard/pl-report/page.tsx` |
| מדריך הוצאות per-occupation | `src/lib/business-expenses/profiles.ts` + `src/app/business-expenses/page.tsx` |

**להרצה:** `npm install && npm run dev` → `localhost:3000`. **לפני push:** `npm run build`.
**להוספת סקיל on-demand:** `npx skills find <query>` ואז
`npx skills add skills-il/<category> --skill <name> --agent claude-code --copy -y`.
`NEXT_STEPS.md` הוא תוכנית Day-1 ישנה (חלקה לא רלוונטי) — המסמך הזה גובר.
