# Handoff — לסשן הבא

> מסמך מסירה בין סשנים. נכתב כי סשן ענן (Claude Code on the web) מקבל **רק את הריפו** —
> לא את היסטוריית השיחה הקודמת. כל מה שצריך כדי להמשיך נמצא כאן ובקוד.
>
> ענף עבודה: `claude/dazzling-keller-aHGGa` · HEAD בזמן הכתיבה: `b521a2b` · תאריך: 2026-05-28

---

## 1. מטרת הסשן

**המטרה העל:** countme — מוצר fin-ops מבוסס-AI לעצמאים ישראלים מתחת לגיל 35. היעד הקרוב הוא
ה-**דמו ל-EY** דרך מאיץ Momentum: טופס 1301 עם כל הערכים מחושבים מראש, כל ערך לחיץ (נוסחה +
מקור), וצ'אט חופשי. מעבר לדמו — בניית ה-MVP לפי תוכנית העבודה.

**מטרת הסשן הבא (קונקרטית), לפי סדר עדיפויות:**

1. **להכריע ולפעול על פער הסקילים** (ראו §4) — זה משפיע על נכונות *כל* לוגיקת המס.
2. **`Setup: בורר שנת מס`** — כרגע `income.year` קשיח ל-2024 (`src/app/setup/page.tsx:497`), כך
   שכל תשתית 2025 שבנינו לא נגישה למשתמש בפועל. שינוי קטן שמפעיל הרבה.
3. להמשיך את שאר ה-worktrees (§5) לפי עדיפות.

---

## 2. מה עשינו (הסשנים האחרונים)

**תשתית רגולטורית year-keyed (הליבה הארכיטקטונית):**
- `src/lib/calculators/types.ts` — קבועים per-year, `TAX_YEAR_2024` + `TAX_YEAR_2025`,
  `getTaxYearConstants(year)` עם registry. כל ערך ב-2025 הוגדר במפורש (FROZEN/STABLE/CARRIED→`TODO(Roy)`).
  תקרת עוסק פטור === עוסק זעיר מובטחת מבנית (קבוע משותף לכל שנה).
- `src/lib/regulatory/deductions.ts` — מרשם ניכויים year-keyed. כל פריט מצהיר: `formFields`
  (קודי 1301), `plImpact` (איך זורם בדו"ח), `skill` (הסקיל שבבעלותו הכלל).
- כל ה-calculators + chat/coach routes + setup + P&L קוראים כעת שנה מהפרסונה, לא קשיח.

**הסשן הנוכחי — `pl-deductions-connect`:**
- חיברתי את `plImpact` מהמרשם לתוך דו"ח הרווח-וההפסד (`src/lib/p-and-l/israeli-report.ts`).
- `classifyExpensePLImpact(category, year)` ב-`deductions.ts` ממפה קטגוריית הוצאה → `plImpact`
  + שיעור הכרה (`recognizedRate`), מהמרשם.
- `expenseBreakdown` (ב-`src/lib/p-and-l/index.ts`) נושא כעת `plImpact` + `recognizedRate`.
- הדו"ח מנתב לפי impact: עלות-המכר מעל הרווח הגולמי, תפעולי מתחת, ו**ניכויים מההכנסה**
  (ב"ל/קרן/פנסיה) יורדים לסעיף "ניכויים אישיים" מתחת לרווח התפעולי ומקטינים את ההכנסה החייבת.
- **self-audit תפס באג**: הניתוב הוריד 100% מהכנסה חייבת, אבל ביטוח לאומי מוכר רק 52% (המרשם
  עצמו מצהיר `rule:"partial"`/`ratePercent:52`). תוקן — מיישמים את שיעור ההכרה; השורה מסומנת "52% מוכר".

**מה שהתברר כבר-בוצע:** `wt/api-hardening` — rate limiting (12/דק' per-IP), ולידציה + ניקוי
control chars (`src/app/api/chat/route.ts`), ו-error boundaries (`error.tsx`, `global-error.tsx`).

**חקירת סקילים:** גיליתי שהסקילים ה-`israeli-*` **לא מותקנים בסביבת הענן** (ראו §4).

קומיטים מרכזיים: `b521a2b` (fix 52%), `3fcb019` (pl-deductions-connect), `54f9fe6` (מרשם + מדריך
סקילים), `4ee642d` (קבועי שנה), `4014095` (פילטרי חשבוניות), `7d7fc06` (PWA + ceiling).

---

## 3. מה הצלחנו

- **`pl-deductions-connect` סגור מקצה לקצה** + תיקון הנכונות, מקומפל (build exit 0) ומאומת
  בריצה אמיתית על שתי פרסונות: דנה (ללא ניכויים אישיים → זהה לקודם, הדמו יציב) ו-fallback
  (ב"ל 10,000 → 5,200 מוכר → מס על 154,800). נדחף לענף.
- **התשתית הקשה הושלמה** — backbone רגולטורי year-keyed, ה-seam של P&L, וחיזוק ה-API.
  אלה החלקים הארכיטקטוניים; מה שנשאר הוא בעיקר רוחב-UI ופריטים חסומים על אנשים.
- **אבחון חד-משמעי של פער הסקילים** — לא ניחוש, נבדק על כל ה-filesystem.

### אחוזי ביצוע

| Worktree / רכיב | מצב | % מספרי | הערכת מאמץ/משאבים |
|---|---|---|---|
| תשתית year-keyed + 2025 | ✅ קוד | 100% | ערכי 2025 חסומים על רוי (CARRIED) |
| מרשם ניכויים + מדריך סקילים | ✅ | 100% | — |
| PWA | ✅ | ~90% | אולי חסרים אייקונים — לאמת |
| התראת תקרת ₪120K | ✅ | 100% | — |
| פילטרי חשבוניות + הקצאה יציבה | ✅ | 100% | — |
| `api-hardening` | ✅ | 100% | — |
| `pl-deductions-connect` | ✅ | 100% | הסשן הזה |
| `onboarding-tos` | ⬜ | 0% | בורר שנה+שדות בר-ביצוע; TOS חסום על תומי |
| `alerts-inbox` | 🟨 | ~20% | `CeilingAlertCard` קיים; אין route/inbox/תזכורת |
| `tax-coordination-shells` | ⬜ | 0% | shells בר-ביצוע; נוסחאות חסומות על רוי |
| `landing-waitlist` | ⬜ | 0% | — |

**סיכום:** ~7/13 משימות ≈ **54% מספרית**. מבחינת מאמץ — החלקים הקשים (תשתית) גמורים, כך
שמהעבודה ה*עצמאית* (לא חסומה) הושלמו ~60%; הנותר מפוזר על הרבה פיסות UI קטנות + 2 מסלולים
חסומים על רוי/תומי.

---

## 4. מה לא הצלחנו (פערים פתוחים)

**א. פער הסקילים — הקריטי ביותר.**
הסקילים ה-`israeli-*` המתועדים ב-CLAUDE.md (israeli-tax-returns, israeli-bituach-leumi וכו')
**לא קיימים בסביבת הענן הזו** — לא בריפו, לא ברמת המשתמש, בשום מקום. נבדק על כל ה-filesystem;
קיימים רק סקילים גנריים (`/mnt/skills/public/`: pdf/docx/xlsx/frontend-design) ו-`financial-calculator`
גנרי שאינו ישראלי.

*למה:* סשן ענן משכפל רק את הריפו. הסקילים שהותקנו מקומית עם `npx skills-il add` יושבים ב-
`~/.claude/skills/` **על המכונה של יוני** ומעולם לא נוקמטו לריפו, אז הם לא הגיעו לכאן.

*ההשלכה (כנה):* לוגיקת המס לא הוצלבה מול סקיל אוטוריטטיבי — היא נשענת על הקבועים בקוד + ידע
האימון של המודל (שה-CLAUDE.md עצמו מזהיר לא לסמוך עליו למספרים שנתיים). בדיוק בגלל זה באג ה-52%
חמק בהתחלה. ההפניות ב-CLAUDE.md (טבלת "מתי להתייעץ" + שדה `skill:`) הן **תיעוד כוונה, לא הזרקת
קונטקסט חיה** בסביבה הזו.

**ב. ערכי 2025 לא מאומתים** — כל `TODO(Roy)` ב-`TAX_YEAR_2025` (תקרות, סף 6111, סף ב"ל) נושאים
את ערך 2024 עד אישור רוי.

**ג. שנת המס קשיחה ב-setup** — `src/app/setup/page.tsx:497` עדיין `year: 2024`, כך שמסלול 2025
לא נגיש דרך ה-UI.

**ד. worktrees שלא התחילו** — onboarding-tos, alerts-inbox (חלקי), tax-coordination-shells,
landing-waitlist.

---

## 5. מה נותר כדי להצליח

**החלטה ופעולה על סקילים (עדיפות #1):** לבחור אחת —
1. **לנקמט את הסקילים לריפו** (`.claude/skills/israeli-*`) → כל סשן ענן יקבל אותם. הפתרון העמיד.
2. **Setup script לסביבה** שירוץ `npx skills-il add ...` באתחול ([docs](https://code.claude.com/docs/en/claude-code-on-the-web)).
3. להשאיר כפי שהוא ולסמוך על המרשם + אימות אנושי מול המקורות הרשמיים.
   *המלצה: #1.* כדי להחליט — להריץ מקומית `ls ~/.claude/skills/` ולראות מה קיים.

**worktrees עצמאיים (ניתן במקביל — קבצים נפרדים):**
- `wt/onboarding-tos` — בורר שנת מס (תיקון `setup/page.tsx:497`) + שדות (מילואים/ילדים/עלייה/בן-זוג). TOS חסום על תומי.
- `wt/alerts-inbox` — route `/alerts` + תזכורת הוצאות חודשית + חיבור `CeilingAlertCard` לתיבה.
- `wt/tax-coordination-shells` — shells לתיאום מס + מקדמות ב"ל ("ממתין רוי") + שדות 1301 חדשים (UI בלבד).
- `wt/landing-waitlist` — עיצוב דף נחיתה + הטמעת Typeform/Google Form + mobile responsive.

**חסום על רוי:** אישור ערכי 2025; נוסחאות תיאום מס; לוגיקת מקדמות ב"ל.
**חסום על תומי:** טקסט TOS; מסמך UX/UI.

---

## נקודות כניסה מהירות (ramp-up)

| נושא | קבצים |
|---|---|
| קבועי מס per-year | `src/lib/calculators/types.ts` |
| מרשם ניכויים (rate/cap/formFields/plImpact/skill) | `src/lib/regulatory/deductions.ts` |
| 8 ה-calculators של הדמו | `src/lib/calculators/index.ts` |
| דו"ח רווח-והפסד (ה-seam של plImpact) | `src/lib/p-and-l/{index,israeli-report}.ts` + `src/app/dashboard/pl-report/page.tsx` |
| מדריך הוצאות per-occupation | `src/lib/business-expenses/profiles.ts` + `src/app/business-expenses/page.tsx` |
| מדריך "מתי להתייעץ עם איזה סקיל" + דיאגרמת זרימה | `CLAUDE.md` |

**להרצה:** `npm install && npm run dev` → `localhost:3000`. **לפני push:** `npm run build`.
