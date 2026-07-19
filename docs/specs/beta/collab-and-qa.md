# ספק בטא — שיתוף פעולה בצוות, QA ידני ומדדי הצלחה (CEO §2, §3.7)

> **סטטוס:** SPEC לביצוע · נכתב 2026-07-19 (יום א') · יעד: מוכן עד רביעי בערב 2026-07-22 (תומי מתחיל בטא אמיתית חמישי 2026-07-23).
> ענף: `claude/system-beta-preparation-oiyzpy` · מסמכי אחות: `docs/specs/beta/{onboarding,dashboard,documents-receivables,eitan}.md`
> **קופי משפטי:** כל טקסט משפטי-למחצה שנוצר מהספק הזה (privacy/terms) הוא **DRAFT — NEEDS LEGAL REVIEW** (אין עורך דין מלווה; נוהל הפרויקט מאז 02/07).

---

## מטרה

שלושה תוצרים שבלעדיהם ארבעת ספקי-הרכיבים לא הופכים לבטא אמיתית:

1. **מדריך תרומה למפתחים-לא-מתכנתים (`CONTRIBUTING-HE.md`)** — תומי ורועי תורמים קוד/תוכן דרך סשני AI. בלי נוהל כתוב בעברית פשוטה, כל סשן שלהם הוא סיכון ל-main. כולל את **מדריך המיזוג של יוני** — מה הוא בודק לפני שהוא ממזג PR של AI. זה מימוש ישיר של מדיניות ניהול הסשנים הנעולה (`memory/decisions.md:52-62`) בשפה שלא-מתכנת מבין.
2. **צ'קליסט QA עצמי (`docs/qa/self-check.md`)** — הבדיקה הידנית שמישהו מהצוות מריץ בבוקר הבטא ואחרי כל deploy. ה-CEO קבע (§3.2) ש"מצב ריק הוא המסך הכי חשוב בבטא" — הצ'קליסט הוא מה שמוודא שאף משתמש ראשון לא פוגש מסך שבור.
3. **אינסטרומנטציית מדדי ההצלחה (CEO §3.7)** — הפעלה (>40% מפיקים מסמך תוך 48 שעות), חזרתיות (>30% בשבוע העוקב), ואיתן (שיחות למשתמש + % ללא אסקלציה). עקרון ה-CEO "פידבק לפני פיתוח" (§2) בלתי אפשרי בלי מדידה — והיום **אף אירוע funnel לא נורה** ואין בכלל טבלת events בפרודקשן.

הכול evolution not rebuild: תשתית ה-analytics קיימת (`track.ts` + migration), ה-CI קיים, מדיניות הסשנים קיימת — הספק מחבר אותם לכדי נוהל עובד.

---

## מה קיים היום (מאומת מול הקוד)

### תהליכי עבודה

- **מוסכמות ב-`CLAUDE.md` ("Working conventions"):** ענפים `claude/<short-name>` / `feat/` / `fix/`; PR עם עד 3 בולטים; `npm run build` וגם `npm test` לפני push; אין סודות בקומיטים; כל env var חדש חייב שורה ריקה ב-`.env.template`; אין framework/ספריה/DB חדשים בלי עדכון CLAUDE.md. **אנגלית, בקובץ שמכוון ל-AI — לא נגיש לתומי/רועי.**
- **מדיניות ניהול סשנים (נעולה 03/07, `memory/decisions.md:52-62`):** merge של memory-PR לפני פתיחת סשן; ענף `claude/<topic>` אחד לסשן; קבצים זרים בלבד בסשנים מקבילים; נגיעה ב-`lib/calculators`/`types.ts` מחייבת **ביקורת-צולבת** לפני merge; שום דיווח-AI אינו אמת בלי אימות; סודות לעולם לא בצ'אט (תקרית הטוקן 02/07 — revoke תוך דקות); סגירת סשן = wrap-up מלא + PR.
- **CI (`.github/workflows/ci.yml`):** שני jobs — `build-and-unit` (שורה 25: build + vitest golden tests) ו-`e2e` (שורה 42: Playwright עם dummy Supabase env). רץ על כל PR ל-main ועל push ל-main. **branch protection פעיל עם required checks בשמות ה-jobs בדיוק** (`build-and-unit`, `e2e`) — הקלדה ידנית של "ci / ..." שברה את זה בעבר (`memory/STATUS.md:165-166`).
- **סקריפטים (`package.json:5-12`):** `build` = `next build --webpack` · `test` = `vitest run` · `test:e2e` = `playwright test`.
- **אין `CONTRIBUTING*.md` בריפו** (אומת ב-ls) ואין `docs/qa/`.
- **הפרויקט הכפול ב-Vercel:** הריפו בונה לשני פרויקטים — הקנוני `countmedemo-eight.vercel.app` תחת `yonilev2003s-projects`, וכפיל תחת `countmes-projects`. כל PR מקבל **שתי** תגובות vercel[bot] (`memory/STATUS.md:41-44`). ניתוק הכפיל = משימת יוני פתוחה.

### אנליטיקס — מוגדר, לא מחובר

- **union קנוני של שמות אירועים:** `src/lib/analytics/track.ts:15-27` — 12 שמות (setup_*, coach_*, pricing/checkout/subscription ועוד).
- **`track()` צד-שרת:** `src/lib/analytics/track.ts:37-64` — best-effort; **כשל נבלע בשקט** (שורות 57-63: `console.warn` בלבד). כלומר: טבלה חסרה = אפס שגיאות למשתמש וגם אפס דאטה.
- **`trackClient()`:** `src/lib/analytics/track-client.ts:8-24` — fire-and-forget אל `/api/track`. **אף קומפוננטת UI לא מייבאת אותו** (grep: היחידים שקוראים `track` הם `api/billing/checkout` ו-`api/billing/webhook`). כל ה-funnel של ההרשמה/דשבורד/מסמכים — לא נורה.
- **`/api/track`:** `src/app/api/track/route.ts:10-23` — allowlist `ALLOWED` שחייב להתעדכן יחד עם ה-union; חותם `user_id` בצד שרת (שורות 46-55).
- **מיגרציית events:** `supabase/migrations/20260617091000_events.sql` — טבלה append-only + אינדקסים + RLS (קריאה עצמית בלבד, כתיבה דרך service-role). idempotent. **לא הוחלה על `hbsgz`** — צעד ידני של יוני ב-SQL Editor (פריט פתוח 2 ב-CLAUDE.md; `memory/STATUS.md:109,222`). ה-MCP של סשני-web לא רואה את hbsgz — אין דרך אוטומטית.
- **אירועי הספקים המקבילים (מתוכננים, טרם קיימים):** `dashboard_viewed`/`dashboard_action_clicked`/`dashboard_pro_opened`/`receivables_chip_clicked` (dashboard.md §8, DSH-8) · `doc_created`/`doc_shared`/`doc_marked_paid`/`reminder_sent`/`receivables_viewed` (documents-receivables.md §6, ANA-1) · `setup_started`/`setup_step_completed`/`setup_completed` עם `props.flow="lite-v1"` (onboarding.md §7, ONB-9) · `coach_answer_escalated` דרך הכלי `escalate_to_human` (eitan.md §3, EIT-10).

### פני המוצר שהצ'קליסט צריך לכסות

- **Footer בדף הנחיתה (`src/app/page.tsx:363-387`):** 8 קישורים חיים (`/file`, `/dashboard`, `/invoices`, `/pricing`, `/coach`, `/about`, `/demo`, `/deadlines`) + **שני קישורים מתים** `href="#"` — "תנאי שימוש" ו"פרטיות" (שורות 384-385).
- **אין routes `/privacy` ו-`/terms`** (grep על `src/` — אפס מופעים) — למרות שתוכננו בתדריך 08/07 (`memory/STATUS.md:95-97`). הבסיס המוכן: scope statement ב-`docs/reviews/2026-07-02-ws8-copy-audit.md`.
- **אין `not-found.tsx`** ב-`src/app` — ‏404 היא ברירת המחדל האנגלית של Next.
- **PWA:** ‏`public/manifest.json` קיים + `public/sw.js`, אבל התוכן טרום-ריברנד וטרום-בטא: `theme_color: "#1a3f6a"` (כחול ישן — לא `#083A4F` של הקיט), שם "CountMe — המלווה לדו״ח שלך" (מיצוב-1301, מנוגד לדגש daily-life של הבטא), `start_url: "/home"` (הבטא נוחתת ב-`/dashboard`), אייקון SVG יחיד `countme-logo.svg`.
- **התנתקות:** `src/components/auth/sign-out-button.tsx:34-38` — מנקה `clearLocalPersona()` + `clearFollowUpNotes()` **לפני** `signOut()`, בדיוק כדי שהמשתמש הבא בדפדפן לא יראה דאטה זר. זה מה שהצ'קליסט מאמת בפועל.
- **דומיין קשיח שגוי** `countmedemo.vercel.app` בפוטר של מסמך מודפס (`src/app/invoices/[invoiceNumber]/page.tsx:241`) — מתוקן ב-DOC-4 של ספק המסמכים; הצ'קליסט מוודא שאין רגרסיה.
- **גייטינג:** `AUTH_GATING_ENABLED` עדיין כבוי בפרודקשן (`memory/STATUS.md`) — הדלקה היא צעד ידני של יוני, חוסם-בטא בכל ארבעת הספקים.

---

## מה בונים

### 1) `CONTRIBUTING-HE.md` — מדריך תרומה בעברית פשוטה (בשורש הריפו)

קובץ אחד, עברית מדוברת, אפס ז'רגון git מעבר להכרחי. קהל: תומי ורועי, שעובדים **רק דרך סשן AI** (Claude סשן-web על הריפו). מבנה מחייב:

**א. "המסלול הזהוב" — כל סשן עבודה, שלב אחרי שלב:**

1. פותחים סשן AI חדש על הריפו. משפט הפתיחה הקבוע: *"קרא את memory/STATUS.md ואשר הבנה בשתי שורות. אני רוצה לעבוד על: ___"*.
2. מבקשים מהסשן: *"פתח ענף חדש בשם `claude/<שם-פרטי>-<נושא>`"* (למשל `claude/tomi-reminder-copy`). **לעולם לא עובדים על `main`** — הסשן יסרב, וגם branch protection יחסום push.
3. עובדים. בסוף — מבקשים מהסשן להריץ `npm run build && npm test` ולראות ירוק **לפני** push. (ה-CI ירוץ שוב בענן — זה בסדר, הבדיקה המקומית חוסכת סבבים.)
4. מבקשים: *"פתח PR עם תיאור של עד 3 בולטים"*.
5. מחכים ל-CI: שני צ'קים חייבים להיות ירוקים — `build-and-unit` ו-`e2e`. אדום? מדביקים לסשן את הלינק לריצה האדומה ומבקשים תיקון באותו ענף.
6. פותחים את קישור ה-Preview מהתגובה של vercel[bot] על ה-PR ובודקים בעיניים (בטלפון!) שמה שביקשתם באמת קרה. **שימו לב: יש כרגע שתי תגובות bot — הנכונה היא של הפרויקט תחת `yonilev2003s-projects`** (עד שיוני ינתק את הכפיל).
7. כותבים ליוני: "PR מס' X מוכן, CI ירוק, בדקתי בפריוויו". **לא ממזגים לבד. אף פעם.**

**ב. "מה אסור" — רשימה שחורה מפורשת:**

- אסור להדביק בצ'אט סודות: מפתחות API, סיסמאות, טוקנים, קבצי `.env`. (תקרית 02/07: טוקן הודבק בטעות — בוטל תוך דקות. אם קרה — לומר ליוני מיד, הוא עושה revoke.)
- אסור לגעת ב-`src/lib/calculators/` וב-`types.ts` בלי לומר ליוני מראש — כל שינוי שם מחייב ביקורת-צולבת של סשן נפרד + golden test באותו commit (`memory/decisions.md:58,68`).
- אסור לערוך את `memory/` באמצע עבודה — רק ב-wrap-up בסוף סשן (אחרת נוצרים קונפליקטים בין סשנים מקבילים).
- אסור לבקש מהסשן "תמזג", "תעשה force push", "תדלג על הבדיקות" — אם הסשן מציע זאת בעצמו, עוצרים ושואלים את יוני.
- אסור להוסיף ספריות/תלויות. אם הסשן מציע `npm install` של משהו חדש — התשובה היא לא, אלא אם יוני אישר ועודכן CLAUDE.md.
- מספרי מס: תומי ורועי לא מאשרים לסשן "לתקן" מספר מס. כל קבוע חי רק ב-`lib/calculators/types.ts`, וכל שינוי בו הוא מסלול של רועי + golden test.

**ג. מדריך המיזוג של יוני — צ'קליסט לכל PR של AI (סעיף בתוך אותו קובץ):**

לפני מיזוג, בסדר הזה:

1. **CI ירוק** — שני ה-required checks (`build-and-unit`, `e2e`). לא ממזגים על צהוב/אדום, ואין bypass בלי סיבה מתועדת ב-decisions.
2. **Preview click-through** — לפתוח את קישור ה-vercel[bot] הנכון, לעבור על המסכים שהשתנו, במובייל (DevTools ‏390px מספיק ל-PR קטן; טלפון אמיתי ל-PR של מסך שלם).
3. **סריקת diff, שלוש דקות, בסדר הזה:**
   - חיפוש סודות: מחרוזות שנראות כמו מפתח (`sk-`, `eyJ`, base64 ארוך), קבצי `.env*` שנוספו ל-git.
   - `package.json` — תלות חדשה? אם כן: יש שורה ב-CLAUDE.md? אין ⇒ לא ממוזג.
   - `src/lib/calculators/**` או `types.ts` בתוך ה-diff? ⇒ עצירה: ביקורת-צולבת (סשן נפרד ב-worktree שמריץ את הטסטים) לפני מיזוג. שינוי קבוע-מס בלי עדכון golden test באותו commit = באג לפי הגדרה.
   - `memory/**` בתוך ה-diff? מותר רק אם זה PR של wrap-up; קונפליקט ב-memory מוכרע לטובת main (התקדים של PR ‏#28).
   - `.github/workflows/**`, `next.config.*`, `proxy.ts` — שינוי שם דורש הבנה מלאה; בספק ⇒ לשאול את הסשן "למה היית חייב לגעת בזה".
4. **Squash-merge** (היסטוריה נקייה — commit אחד לענף) → **מחיקת הענף** → מקומית: `git checkout main && git pull`.
5. **אימות פוסט-מיזוג** (התקן מ-15/07, `memory/decisions.md:40`): לוודא שה-deploy של main עלה READY בפרויקט הקנוני.

**קונפליקטים — הגרסה למי שאינו מתכנת:** אם GitHub מציג "This branch has conflicts", לא פותרים ידנית ב-UI. פותחים סשן AI על הענף ומבקשים: *"עדכן את הענף מ-main, פתור קונפליקטים (memory/ תמיד לטובת main), הרץ build+test, ודחוף"*. אם הקונפליקט הוא בקבצי מוצר מהותיים — יוני מכריע איזו גרסה נכונה לפני שממשיכים.

**מתי יוני מבקש ביקורת-צולבת (מעבר לחובה על calculators):** ‏PR שנוגע ב-auth/גייטינג/`security/` · ‏PR שמשנה נתונים ב-Supabase או migration · כל PR שיוני לא מסוגל להסביר במשפט אחד מה הוא עושה.

### 2) חלוקת תפקידים לספרינט הזה (א'–ד', 19-22/07)

בהתאם לחלוקה שהוגדרה (יוני = שאלון + איתן-פיתוח; תומי = קופי שאלון + תוכן + UX), ממופה על משימות ארבעת הספקים:

| מי | תפקיד בספרינט | משימות בספקים |
|---|---|---|
| **יוני** | מריץ את **כל** סשני הקוד (הוא היחיד שממזג): אונבורדינג + איתן בעדיפות, דשבורד ומסמכים לפי הזמן | אישורים: ONB-14 · DSH-10 · YONI-1 (מסמכים) · החלטות איתן (ערוץ אסקלציה, תקציב, Sonnet 4.6) · צעדים ידניים: מיגרציית events (‏MET-1 כאן), ‏`AUTH_GATING_ENABLED=true`, התראת תקציב Anthropic, ניתוק פרויקט Vercel הכפול |
| **תומי** | קופי + תוכן + UX, דרך סשני-קופי לפי `CONTRIBUTING-HE.md` (נוגע רק במחרוזות/docs — לא בקוד לוגיקה) | ONB-13 (קופי שאלון) · EIT-11 (מסמך הטון של איתן) · TOMI-1 (נוסחי תזכורות) · בדיקת FAB במובייל · תסריט יום-חמישי + רשימת משתמשי בטא · COL-3 + QA-4 כאן |
| **רועי** | נתיב אימות בלבד — לא נוגע בקוד; מוסר אישורים כתובים שיוני/סשן מטמיעים | ONB-15 · ROY-1 (מסמכים — חוסם, עד ג' בערב) · EIT-6 (‏12 תשובות ידע) · המשך FLAG(Roy) ב-`types.ts` |

כלל אצבע לקונפליקטים בין סשנים מקבילים: קבצים זרים בלבד (מדיניות 03/07). נקודות החיכוך הידועות בספרינט — `track.ts`/`api/track/route.ts` (כל הספקים מוסיפים אירועים) ו-`motion.tsx` — מטופלות ב-MET-2 (ריכוז רישום האירועים ל-PR אחד) ובתיאום סדר merge.

### 3) `docs/qa/self-check.md` — הצ'קליסט הידני

קובץ אחד בעברית, שתי רמות: **ריצה מלאה** (בוקר הבטא, רביעי בערב + חמישי בבוקר, ~45 דק') ו**ריצה מהירה** (אחרי כל deploy ל-main, ~10 דק'). כל שורה בפורמט: פעולה → תוצאה מצופה → ריבוע סימון. **הכול נבדק על הדומיין הקנוני `countmedemo-eight.vercel.app`** (לא preview, לא הכפיל).

**הריצה המלאה (בוקר-בטא):**

1. **סיבוב auth מלא:** אינקוגניטו → `/login` → ‏Google OAuth → נחיתה → ‏`/onboarding` מלא בטלפון **עם סטופר: מתחת ל-3 דקות** (יעד CEO §3.1) → חגיגה → `/dashboard` במצב ריק (0 ₪ / 0 ₪, בלי מספרים פיקטיביים) → **התנתקות** → לוודא: חזרה ל-`/login`, ‏localStorage נקי (DevTools → Application → Local Storage: אין persona; המנגנון: `sign-out-button.tsx:34-38`), וכניסה מחדש משחזרת את הנתונים מה-DB.
2. **סריקת 13 המסלולים באינקוגניטו** (עם גייטינג דלוק — לכל מסלול מוגדר מה צפוי: עמוד ציבורי או redirect ל-`/login`):
   `/` · `/file` · `/dashboard` · `/invoices` · `/pricing` · `/coach` · `/about` · `/demo` · `/deadlines` · `/privacy` · `/terms` · `/onboarding` · `/receivables`.
   בכל עמוד: נטען בלי שגיאת קונסול אדומה, RTL תקין, אין אנגלית-של-תבנית, אין emoji.
3. **מעבר מובייל:** ‏iPhone או אנדרואיד אמיתי — דשבורד, הפקת מסמך, ‏`/receivables`, צ'אט איתן (FAB). אין גלילה אופקית, טקסט קריא, כפתורים לחיצים באצבע.
4. **שלמות טקסט של איתן:** לשאול 3 שאלות (אחת מהקטלוג, אחת חישובית — "כמה מוכר לי מ-450 ₪ ציוד?", אחת מחוץ לתחום — "מס שבח?"). לוודא: אין גרשיים/`\n` גולמיים בתשובות (הבאג המתוקן ב-EIT-1), המספרים מגיעים מכלים (לא מומצאים), שאלה זרה מפעילה "אני לא יודע" + אסקלציה, אין מילות-עצה אסורות (מומלץ/כדאי/עדיף).
5. **מסמך מקצה לקצה:** הפקת קבלה (3 שדות) → המספר בדשבורד זז → פתיחת המסמך → **שליחה בוואטסאפ אמיתית** לעצמך: הטקסט העברי שלם ולא נחתך, הקישור החתום נפתח באינקוגניטו ומציג את המסמך, **אין דומיין `countmedemo.vercel.app` ואין "מספר הקצאה" מפוברק** על המסמך.
6. **פרטיות ותנאים:** ‏`/privacy` ו-`/terms` נפתחים מהפוטר (לא `#`), עם באנר DRAFT.
7. **‏404:** ‏URL שטותי (`/xyz`) מציג עמוד עברי ממותג עם קישור חזרה — לא עמוד Next אנגלי.
8. **‏PWA:** התקנה מ-Chrome אנדרואיד + "הוסף למסך הבית" ב-iOS Safari — האייקון הנכון (לוגו countme), השם הנכון, נפתח ב-`/dashboard`.
9. **שפיות מדדים:** אחרי כל הפעולות למעלה — להריץ את שאילתה מס' 4 מ-`docs/qa/beta-metrics.sql` ולראות שהאירועים של הריצה הזו נחתו ב-`public.events` (אם 0 שורות — ראו "התלות במיגרציה" למטה; זו התקלה השקטה המסוכנת ביותר).

**הריצה המהירה (אחרי כל deploy):** סעיפים 1 (בלי סטופר, עד הדשבורד), 5 (עד "המספר זז"), ו-9. ‏~10 דקות.

**בעלות:** מוגדר בראש הקובץ — מי הריץ, תאריך, ‏commit. כשל בצ'קליסט = חוסם השקה או נרשם כ-known issue ביומן, בהחלטת יוני.

### 4) מדדי הצלחה — אינסטרומנטציה (CEO §3.7)

**מיפוי מדד ← אירוע ← מי יורה:**

| מדד CEO | יעד | אירועים | איפה נורה (ספק אחראי) |
|---|---|---|---|
| הפעלה: מסיימים הרשמה ומפיקים מסמך תוך 48 שעות | ‏>40% | `setup_completed` → ‏`doc_created` | ‏ONB-9 (אונבורדינג) · ‏ANA-1 (מסמכים) |
| חזרתיות: חוזרים בשבוע העוקב | ‏>30% | כל אירוע עם `user_id` בימים 7–14 מההרשמה; העוגן: `dashboard_viewed` | ‏DSH-8 (דשבורד) |
| איתן: שיחות למשתמש + % ללא אסקלציה | מדידה (יעד שנתי >50%) | `coach_question_asked` / `coach_answer_escalated` | **פער:** ‏escalated מחווט ב-EIT-10, אבל ‏asked לא נורה משום מקום — נסגר ב-MET-2 |

**MET-2 — שני תיקוני חיווט שבבעלות הספק הזה:**

1. `coach_question_asked` נורה **בצד שרת** בתוך `src/app/api/coach/route.ts`, פעם אחת לכל הודעת-משתמש נכנסת (לפני לולאת הכלים), דרך `track()` הקיים עם `props: { source }`. צד-שרת ולא `trackClient` — אמין יותר (אין תלות ב-JS של הלקוח) וה-`user_id` נחתם ממילא בשרת. אותו דבר ל-`/api/chat` עם `props: { source: "demo" }`.
2. **ריכוז רישום האירועים:** כל הספקים מוסיפים שמות ל-union (`track.ts:15-27`) ול-`ALLOWED` (`api/track/route.ts:10-23`) — שני מקומות, ארבעה ספקים, מתכון לקונפליקט. ‏MET-2 מגיש PR יחיד שמוסיף את **כל** תשעת השמות החדשים המתוכננים (`dashboard_viewed`, `dashboard_action_clicked`, `dashboard_pro_opened`, `receivables_chip_clicked`, `doc_created`, `doc_shared`, `doc_marked_paid`, `reminder_sent`, `receivables_viewed`) מראש, וספקי המסכים רק יורים אותם. מתמזג ראשון, לפני DSH-8/ANA-1/ONB-9.

**התלות הקריטית — המיגרציה על hbsgz (MET-1, ידני-יוני):** בלי הטבלה, כל `track()` נבלע בשקט (`track.ts:57-63`) — הבטא תרוץ, והמדדים יהיו 0 שורות לתמיד. הצעד: ‏Supabase Dashboard → פרויקט `hbsgzelipeawkvtcazdr` → ‏SQL Editor → הדבקת התוכן המלא של `supabase/migrations/20260617091000_events.sql` → ‏Run (‏idempotent — בטוח להריץ פעמיים). אימות: `select count(*) from public.events;` מחזיר 0 (ולא שגיאה), ואחרי ביקור אחד באפליקציה — שורות. (באותה ישיבה: גם מיגרציית ה-billing אם טרם רצה — פריט פתוח קיים.)

**`docs/qa/beta-metrics.sql` — קריאת המדדים בלי BI (MET-3):** קובץ SQL אחד עם 4 שאילתות מוערות בעברית, להדבקה ידנית ב-SQL Editor של hbsgz. שלד מחייב:

```sql
-- 1. הפעלה (יעד >40%): השלימו הרשמה, ומתוכם — מסמך ראשון בתוך 48 שעות
with signups as (
  select user_id, min(created_at) as signed_up_at
  from public.events where name = 'setup_completed' and user_id is not null
  group by user_id
), first_doc as (
  select user_id, min(created_at) as first_doc_at
  from public.events where name = 'doc_created' and user_id is not null
  group by user_id
)
select count(*) as signups,
       count(*) filter (where fd.first_doc_at <= s.signed_up_at + interval '48 hours') as activated,
       round(100.0 * count(*) filter (where fd.first_doc_at <= s.signed_up_at + interval '48 hours')
             / greatest(count(*), 1), 1) as activation_pct
from signups s left join first_doc fd using (user_id);

-- 2. חזרתיות שבוע-2 (יעד >30%): פעילות כלשהי בימים 7–14 אחרי ההרשמה
with signups as (
  select user_id, min(created_at) as signed_up_at
  from public.events where name = 'setup_completed' and user_id is not null
  group by user_id
)
select count(*) as cohort,
       count(*) filter (where exists (
         select 1 from public.events e
         where e.user_id = s.user_id
           and e.created_at between s.signed_up_at + interval '7 days'
                                and s.signed_up_at + interval '14 days'
       )) as returned_week2,
       round(100.0 * count(*) filter (where exists (
         select 1 from public.events e
         where e.user_id = s.user_id
           and e.created_at between s.signed_up_at + interval '7 days'
                                and s.signed_up_at + interval '14 days'
       )) / greatest(count(*), 1), 1) as week2_pct
from signups s;

-- 3. איתן: שאלות למשתמש + אחוז אסקלציה
select count(*) filter (where name = 'coach_question_asked') as questions,
       count(distinct user_id) filter (where name = 'coach_question_asked') as askers,
       round(1.0 * count(*) filter (where name = 'coach_question_asked')
             / greatest(count(distinct user_id) filter (where name = 'coach_question_asked'), 1), 1)
         as questions_per_user,
       count(*) filter (where name = 'coach_answer_escalated') as escalations,
       round(100.0 * count(*) filter (where name = 'coach_answer_escalated')
             / greatest(count(*) filter (where name = 'coach_question_asked'), 1), 1)
         as escalation_pct
from public.events;

-- 4. דופק יומי — ספירת אירועים לפי יום ושם (גם בדיקת השפיות של הצ'קליסט)
select date_trunc('day', created_at)::date as day, name, count(*)
from public.events
group by 1, 2 order by 1 desc, 3 desc;
```

הערות מחייבות בקובץ: (א) שאילתה 2 חוזרת עם משמעות רק מ-**31/07** בערך (7+ ימים אחרי תחילת הבטא) — עד אז תחזיר 0% וזה תקין; (ב) אירועים אנונימיים (`user_id is null`) מוחרגים מה-funnel — עוד סיבה שהגייטינג חייב להיות דלוק בבטא; (ג) אין סכומים ואין שמות לקוחות ב-props (מזעור PII — כלל קיים בספק המסמכים).

### 5) תיקוני מוצר קטנים שהצ'קליסט חושף (בבעלות הספק הזה)

- **QA-2 — עמודי `/privacy` + `/terms`:** שני routes סטטיים (Server Components, בלי צד-לקוח), עברית, על בסיס ה-scope statement מ-`docs/reviews/2026-07-02-ws8-copy-audit.md`. באנר עליון **"טיוטה — DRAFT, טרם עבר סקירה משפטית"** בכל עמוד. עדכון שני הקישורים המתים בפוטר (`page.tsx:384-385`) מ-`#` ל-routes. עמודים ציבוריים (מחוץ לגייטינג — כמו `/login`).
- **QA-3 — רענון PWA + ‏404:** ‏`manifest.json`: ‏`theme_color` → ‏`#083A4F`, ‏`background_color` → ‏`#F1EFEA` (cream), שם → "countme — הכסף של העסק שלך, מסודר" (DRAFT-תומי), ‏`start_url` → ‏`/dashboard`, ‏shortcuts מיושרים לבטא (דשבורד / קבלה / מי-לא-שילם). ‏`src/app/not-found.tsx` חדש: עמוד עברי RTL ממותג ("העמוד לא נמצא"), ‏`btn("primary")` חזרה ל-`/dashboard`, ‏`LogoMark` — בלי emoji, לפי הקיט.

---

## מה במפורש לא בבטא (נדחה לפי מפת הדרכים)

- **כלי BI / דשבורד אנליטיקס (PostHog, Metabase, Amplitude):** קובץ ה-SQL הוא כל מה שצריך ל-50–100 משתמשים. המיגרציה עצמה מתעדת "graduate to PostHog later" (`events.sql:5`). שלב 2+, לפי נפח.
- **אוטומציית review (CODEOWNERS, ‏pre-commit hooks, ‏Codex audit hook):** הצ'קליסט הידני של יוני מספיק לשלושה אנשים; ‏hook ה-Codex כבר מתועד ב-CLAUDE.md כ"אחרי הדמו". שלב 2.
- **הרחבת e2e אוטומטית לכיסוי הצ'קליסט:** ‏self-check נשאר ידני בבטא; המרת סעיפים ל-Playwright — לפי כאב אמיתי אחרי הבטא.
- **דירוג שביעות רצון בצ'אט (יעד 4.5):** נמדד ב-15 ראיונות העומק (CEO §3.7), לא ב-UI. שלב 2 (מוסכם עם ספק איתן).
- **התראות אוטומטיות על מדדים (alerting):** קריאה ידנית של ה-SQL פעם ביום מספיקה. שלב 3.
- **סקירה משפטית של privacy/terms:** אין סוקר — הכול DRAFT עם באנר; סקירה חיצונית היא פריט פתוח קיים (CLAUDE.md פריט 4).
- **מיגרציות סכימה חדשות:** אפס DDL חדש בספק הזה — רק החלת מיגרציית events הקיימת.

---

## פירוק משימות

| ID | משימה | שעות | בעלים | תלויות | DoD (בדיק) |
|---|---|---|---|---|---|
| COL-1 | כתיבת `CONTRIBUTING-HE.md`: המסלול הזהוב + רשימת האסור, בעברית פשוטה | 2.5 | ai | — | הקובץ בשורש הריפו; כל טענת-תהליך תואמת את `decisions.md:52-62` ואת שמות ה-required checks בפועל; אפס ז'רגון לא מוסבר |
| COL-2 | סעיף "מדריך המיזוג של יוני" בתוך `CONTRIBUTING-HE.md` (צ'קליסט 5 שלבים + קונפליקטים + מתי ביקורת-צולבת) | 1 | ai | COL-1 | יוני עבר על הצ'קליסט ואישר שהוא מוכן לעבוד לפיו; ההערה על שתי תגובות ה-vercel[bot] כלולה |
| COL-3 | ‏dry-run של הזרימה: תומי פותח PR-קופי קטן (שינוי מחרוזת אחת) לפי המדריך, יוני ממזג לפי הצ'קליסט | 1 | tomi | COL-1, COL-2 | ‏PR נפתח מענף `claude/tomi-*`, ‏CI ירוק, מוזג squash, הענף נמחק; חיכוכים במדריך תוקנו בו-במקום |
| COL-4 | אישור חלוקת התפקידים לספרינט + רישום ב-`memory/decisions.md` | 0.5 | yoni | — | שורת החלטה ב-decisions עם החלוקה יוני/תומי/רועי כמפורט בסעיף 2 |
| QA-1 | כתיבת `docs/qa/self-check.md`: ריצה מלאה + ריצה מהירה, לפי סעיף 3 | 2 | ai | — | כל סעיף בפורמט פעולה→צפוי→ריבוע; רשימת 13 המסלולים מופיעה במלואה עם התנהגות-גייטינג צפויה לכל אחד |
| QA-2 | עמודי `/privacy` + `/terms` (‏DRAFT) + החלפת שני קישורי ה-`#` בפוטר | 3 | ai | — | שני ה-routes חיים ונגישים באינקוגניטו; באנר DRAFT בשניהם; `grep 'href="#"' src/app/page.tsx` ריק; ‏build+test ירוקים |
| QA-3 | רענון `manifest.json` (צבעי קיט, שם, ‏start_url, ‏shortcuts) + ‏`not-found.tsx` עברי ממותג | 2 | ai | — | התקנת PWA באנדרואיד מציגה אייקון ושם נכונים ונפתחת ב-`/dashboard`; ‏`/xyz` מציג 404 עברי עם כפתור `btn()`; אפס emoji |
| QA-4 | ריצת self-check מלאה על הדומיין הקנוני, רביעי בערב (טלפון אמיתי + סטופר לשאלון) | 1.5 | tomi | QA-1, QA-2, QA-3, ספקי הרכיבים, MET-1 | כל הריבועים סומנו; כשלים נרשמו כ-blockers/known-issues בהכרעת יוני; זמן השאלון שנמדד < 3 דק' |
| MET-1 | החלת מיגרציית `events` על ‏hbsgz ‏(SQL Editor, ידני) | 0.5 | yoni | — | ‏`select count(*) from public.events` רץ בלי שגיאה; אירוע בדיקה אחד מהאפליקציה נוחת בטבלה |
| MET-2 | חיווט `coach_question_asked` צד-שרת ב-`/api/coach` + ‏`/api/chat`; ‏PR מרכז שמוסיף את 9 שמות האירועים החדשים ל-union ול-ALLOWED | 2 | ai | — | שאלה לאיתן מוסיפה שורה ל-events (נבדק ב-SQL); ‏PR האירועים מוזג לפני DSH-8/ANA-1/ONB-9; ‏union ו-ALLOWED זהים בתוכנם |
| MET-3 | כתיבת `docs/qa/beta-metrics.sql` — ‏4 השאילתות + הערות העברית המחייבות | 1.5 | ai | — | הקובץ רץ נקי על hbsgz (או על טבלה מקומית זהה); שאילתה 1 מחזירה אחוז; ההערה על עיכוב שבוע-2 כלולה |
| MET-4 | ‏dry-run מדדים: הרצת הקובץ על hbsgz אחרי יום שימוש-מייסדים, קריאת התוצאות מול תומי | 0.5 | yoni | MET-1, MET-2, MET-3 | ‏4 השאילתות מחזירות נתונים לא-ריקים מפעילות המייסדים; תקלות חיווט שנתגלו נפתחו כמשימות |

סה"כ ‏ai: ‏~14 שעות — מתאים ליום-יום וחצי של סשן, במקביל לספקים הכבדים. סדר מומלץ: ‏MET-2 ו-QA-2 ראשונים (חוסמים ספקים אחרים / את הצ'קליסט), אחר כך COL-1..2, ‏QA-1, ‏QA-3, ‏MET-3.

---

## סיכונים

1. **המיגרציה לא תוחל בזמן (MET-1) — התקלה השקטה המסוכנת ביותר:** ‏`track()` נבלע בשקט בהיעדר טבלה (`track.ts:57-63`); הבטא תיראה תקינה לגמרי, וביום ראיונות-העומק לא יהיה אף מספר. מיטיגציה: סעיף 9 בצ'קליסט (שפיות מדדים) הוא חובה בריצה המהירה, לא רק במלאה; ‏MET-4 מאמת לפני חמישי.
2. **גייטינג כבוי בזמן הבטא:** מעבר לחשיפת תקציב/PII (סיכון קיים בכל הספקים) — אירועים אנונימיים שוברים את ה-funnel לפי `user_id`. ההדלקה היא צעד ידני של יוני, מחוץ לספק אבל תנאי למדידה.
3. **קונפליקט רב-ספקים על `track.ts`/`ALLOWED`:** ‏4 ספקים נוגעים באותם שני קבצים. מיטיגציה: ‏PR האירועים המרכזי של MET-2 מתמזג ראשון; ספקי המסכים רק יורים שמות שכבר רשומים.
4. **המדריך לא ייבדק על אדם אמיתי:** מדריך שנכתב ל-לא-מתכנתים ולא נוסה על אחד מהם הוא ניחוש. מיטיגציה: ‏COL-3 (‏dry-run של תומי) הוא חלק מה-DoD של הספק, לא רשות.
5. **הפרויקט הכפול ב-Vercel מטעה את הצ'קליסט ואת התורמים:** שתי תגובות bot, ‏preview לא-קנוני, ‏builds כפולים. מיטיגציה: אזהרה מפורשת במדריך + הצ'קליסט נועל את הדומיין הקנוני; הניתוק עצמו — משימת יוני קיימת מ-STATUS.
6. **קופי משפטי בלי סוקר (privacy/terms/404/manifest):** הכול DRAFT עם באנר; מרוכז ברשימת הפערים בסוף כל פלט סשן לפי הנוהל. חשיפה נשארת עד סקירה חיצונית.
7. **עומס על יוני כצוואר-בקבוק מיזוג:** כל ה-PRs עוברים דרכו, בשבוע שבו הוא גם מריץ את סשני האונבורדינג ואיתן. מיטיגציה: מדריך המיזוג מקצר כל review ל-‏<10 דק'; משימות תומי/רועי מוגבלות לקופי/אימות שקל לסקור.
8. **מדד שבוע-2 לא מדיד עד סוף החודש:** אין מה לעשות — מובנה במדד. הקובץ מציין זאת כדי שאף אחד לא יסיק "0% חזרתיות" ביום השלישי.

---

## מה צריך מהצוות

- **יוני:** (1) הרצת מיגרציית events על ‏hbsgz — ‏MET-1, ‏10 דקות, **חוסם את כל המדידה**; (2) ‏`AUTH_GATING_ENABLED=true` ‏(Production+Preview) + ‏redeploy לפני חמישי; (3) התראת תקציב ב-Anthropic Console (סיכון קיים מספק איתן); (4) אישור מדריך המיזוג (COL-2) וחלוקת התפקידים (COL-4); (5) ניתוק פרויקט ה-Vercel הכפול — או לפחות אישור שההנחיה "תגובת ה-bot הנכונה" במדריך מדויקת.
- **תומי:** (1) ‏dry-run של זרימת התרומה (COL-3) — לסמן כל מקום שבו המדריך לא ברור; (2) ריצת ה-self-check המלאה רביעי בערב על טלפון אמיתי (QA-4) כולל מדידת סטופר לשאלון; (3) ניסוח שם ה-PWA ("countme — ___", ‏DRAFT ב-QA-3); (4) לוודא שתסריט יום-חמישי שלו כולל את הריצה המהירה אחרי כל deploy.
- **רועי:** אין משימות חדשות בספק הזה (הנתיב שלו — ‏ONB-15, ‏ROY-1, ‏EIT-6 — מוגדר בספקי האחות). נדרש רק אישור עקרוני שסעיפי הצ'קליסט הנוגעים לאיתן (מס' 4) לא סותרים את כללי "עובדות, לא עצות".
