# progress — יומן התקדמות לפי סבבים

> החדש למעלה. מקור-אמת למצב המשימות: `docs/meeting-records/yoni-tasks-27032026.md`.

## סבב 17/06/2026 — ספרינט הכנה-לבטא, יום 1 (foundations)

ענף `claude/beta-launch-prep-z2m6f5`. מטרה: לקחת את המוצר לרמת בטא פרטי (יוני+שותפה) ואז 50 חברים,
ב~4 ימים. תוכנית מלאה: `/root/.claude/plans/eager-hopping-blum.md`; צ׳קליסט יומי: `docs/launch/sprint-checklist.md`.

**נבנה (יום 1, build ירוק):**
- **תשלומים (כבוי):** seam אגנוסטי-לספק `src/lib/billing/` — `provider.ts`+`tranzila.ts`
  (**Tranzila ready-to-connect, לא חי** לפי בקשת יוני), `tracks.ts` (מפת מסלול→אינטגרציה→פיצ׳רים),
  `entitlement.ts`. דגל `BILLING_ENABLED`. מיגרציית `plans/subscriptions/payments` (+חשבונית מס).
- **הצהרת הון (1219):** פרסונה הורחבה (נכסים/התחייבויות), `lib/calculators/capital.ts` (הון נקי),
  `lib/form-1219/schema.ts` (מנוע 1301 הגנרי בשימוש חוזר).
- **אנליטיקס:** `lib/analytics/track.ts` + `/api/track` + מיגרציית `events`.
- **עיצוב:** framer-motion 12.40 + `components/brand/motion.tsx` (Reveal/Stagger/CountUp, reduced-motion).
- **GTM כ-vault של Obsidian:** `docs/gtm/` (index+notes), נתפס כחי/בר-שינוי.

**החלטות סשן:** תשלומים=Tranzila (כבוי) · בטא חינם, תשלום בנוי-כבוי · מסלולים מרובים, כל אחד עם
אינטגרציה ברורה משלו · GTM=Obsidian חי.

**חוסם שהתגלה:** ה-Supabase MCP על חשבון שלא רואה את `hbsgzelipeawkvtcazdr` — **מיגרציות לא הוחלו**.
הקוד סובלני (אנליטיקס best-effort, entitlement fail-safe) אז ה-build ירוק בלי הטבלאות.

## סבב 10/06/2026 — מילסטון: דמו → פיילוט SaaS חי בפרודקשן

יום ענק. עברנו מ-דמו-localStorage ל-**פלטפורמת SaaS חיה ומאובטחת** ב-`countmedemo-eight.vercel.app`. **10 PRs מוזגו ל-main, אפס שבירות.**

**לפי PR:**
- **#15** — Phase 0–5 לפרודקשן: Supabase clients + Google OAuth + persona ב-DB + דשבורד device-adaptive.
- **#16** — דיוק-מס (נק' זיכוי 3.25, הסרת זיכוי 48% מומצא, §46/§45A) + "עובדות לא עצות" + GTM/PMF brief.
- **#17** — נעילת TY2025 (קבועים מאומתים, ברירת-מחדל שנה → 2025).
- **#18** — design-fidelity: /login, landing, chat מיושרים ל-handoff.
- **#19** — תיקון תווית מע"מ (17% קבוע בעוד החישוב 18%).
- **#20** — chat SaaS rail + ניקוי דאטה DB-authoritative (תיקון דליפה בין-משתמשים).

**גילויים/החלטות:** הפרויקט האמיתי ב-Supabase = `hbsgzelipeawkvtcazdr` (לא akfg), סכמה נבנתה שם מחדש; Vercel = `countmedemo-eight` (חשבון אישי). · חשבונית-ישראל ספייק → OUT לפיילוט. · מילואים הוכרע 30/40/50.

**נשאר:** הדלקת gating (ידני) · self-test מייסדים · אישור יעל לחיצוני · NEEDS-ROY של רוי.

**עבד טוב:** git worktrees + agents מקבילים; merge אוטומטי דרך ה-API; build-gate על כל PR. **תקלה חוזרת:** `.next` cache התקלקל אחרי שדרוגי SDK → `rm -rf .next` לפני build.

## סבב 03/06/2026 — Brand Kit + ריברנד מלא

ענף `claude/adoring-brahmagupta-u8no8`. CommitHead: `fae935b`.

**מה נעשה:**
- **Brand Kit** הועלה לריפו כ-`Brand Kit/` (8 קבצי HTML + README.md) — הועלה מ-ZIP שסופק ישירות.
- **טוקנים:** `src/app/globals.css` עודכן עם `@theme inline` — צבעי נייבי/בז'/טיל מחליפים את צבעי amber הישנים; טוקני gov.il נשמרו לצד הטוקנים החדשים.
- **פונט:** `src/app/layout.tsx` עבר מ-Heebo/Rubik → `Assistant` (משתנה יחיד `--font-assistant`, Hebrew+Latin, Google Fonts).
- **קומפוננטות brand חדשות:** `src/components/brand/logo.tsx` (LogoMark ¢ + לוגו), `button.tsx` (`btn()` עוזר), `icons.tsx` (35+ אייקוני קו, 1.75px stroke, ללא fill, ללא emoji), `status.tsx` (StatusBadge עם traffic-light: on-track/due/overdue/plan).
- **ריברנד 6 דפים במקביל** (git worktrees): `/` (landing), `/setup`, `/dashboard`, `/coach`+chat, `/invoices`, `/deadlines`. + תיקון ידני של `ceiling-alert.tsx`.
- **`/demo` לא נגע** — הפורם נשאר faithful ל-gov.il (החלטה נעולה).

**בעיות שפתרנו:**
- 3 worktrees היו על base ישן (לפני brand foundation) → פתרנו עם `git checkout <branch> -- <files>` סלקטיבי במקום מיזוג שהיה מוחק את `Brand Kit/` ו-`src/components/brand/`.
- Hook גרסה של git commits (committer לא נכון) → תוקן עם `git rebase --exec "git commit --amend --no-edit --reset-author"`.
- `ceiling-alert.tsx` לא היה בסקופ של אף agent → תוקן ידנית.

**אומת:** build עבר, tsc נקי. אימות ויזואלי בדפדפן ממתין למשתמש.

## סבב 31/05/2026 — מחזור-החיים של שנות המס + ליטוש (9 קומיטים)

ענף `claude/great-sagan-eqzCH`. בנוי משני שלבים.

**שלב 1 — 4 אצוות עצמאיות ב-git worktrees (במקביל):**
- `10cf95b` **fix-ui** — פסיק בכתובת תוקן ב-`format-value.ts` (+כותרת חשבונית); הוסרה תווית "מבוסס
  על הסקיל"; ברכת הצ'אט מציגה סכום הוצאות אמיתי (47,800 ₪) במקום "0".
- `3b90546` **assistant** — `/api/chat` + `/api/coach` עונים על שאלות מוצר; מסגרת "היום 2026 /
  הדו"ח 2024 / לא להמציא נתוני 2026"; איחוד שם הסוכן ל**איתן**.
- `ba14275` **voice** — הקלטת קול ב-`/invoices/new` רציפה (he-IL, auto-restart) — לא נעצרת.
- `991ea50` **time-separation** — חשבוניות/הוצאות מתויגות לפי שנת מס; רשומה מחוץ-לשנה לא מנפחת 2024.

**שלב 2 — מודל שלוש-השנים (מסלול יחיד, על בסיס 991ea50):**
- `a39ba9a` — `TAX_YEAR_2026` **מהסקיל `israeli-tax-returns`**: מדרגות 3–5 הורחבו (חוק ההתייעלות
  2026: 228K/301,200), סף ב"ל 60%-שכר-ממוצע → 7,703; **כל ערך שהשתנה ל-2026 = `TODO(Roy)`**.
  dispatcher תוקן (2026 נפל בטעות ל-2025). מודל סטטוס: `ACTIVE_FILING_YEAR=2025`,
  `DEFAULT_VIEW_YEAR=2024`, `getYearStatus` → filed/open/future, `FILING_STATUS_META`.
- `c79e2fb` — פרסונה רב-שנתית (`dana-cohen.json` נושאת 2024 *וגם* 2025, אותם 248,500/47,800;
  הסקלרים נשארו 2024 → `/demo` ו-`/file` ללא שינוי). `taxYearsForUI` חושף 24/25/26 בבורר;
  `<YearStatusBadge>` בדשבורד+דו"ח+/demo; empty-state ל-2026.
- `021e193` — מספור חשבונית לפי שנת-התאריך (2025-xxxx); `/invoices` ברירת-מחדל לשנה הפתוחה (2025).
- `f50f485` + `e148013` — תיעוד (CLAUDE.md מחזור-חיים; README; טראקר; ובסוף מעבר ל-memory/).

**אומת:** `tsc` נקי · `npm run build` עבר · smoke-test HTTP (8 מסלולים → 200). אימות ויזואלי
ממתין (אין דפדפן headless בענן).

**הוצף לרוי:** הסקילים מעודכנים ל-2026 בעוד הקוד עוגן ל-2024; שינויי חקיקת 2026 (מדרגות 3–5 +
תיקון 252 לב"ל) הוטמעו כ-`TODO(Roy)`. ערכי 2025 *וגם* 2026 ממתינים לאישור.

## סבב 29/05/2026 — אינטגרציה + בנייה

**שחזור ענפים תקועים** (במקום בנייה מאפס):
- `dazzling-keller-aHGGa` → PWA (manifest+SW), ceiling-alert (תקרת ₪120K), `TAX_YEAR_2025` +
  `getTaxYearConstants()`, מרשם ניכויים year-keyed. מיזוג נקי.
- `funny-maxwell-K7dK2` → 5 סקילי Tier-1 (כולל `israeli-freelancer-ops` עם `deadline-calendar`).
- `build-crm-system-KcTPb` → CRM כ-`crm-snapshot/` תוספתי בלבד (sub-app מבודד).

**פיצ'רים:**
- **#4** בורר שנת מס (2024/2025) ב-`setup`, מחליף את הקיבוע ל-2024.
- **#3** תיבת התראות `/alerts` — תקרת זעיר + מקדמות מע"מ + תזכורת הוצאות + מועדים.
- **#5** לוח מועדים — `lib/deadlines/calendar.ts` (9 מועדים) + `/deadlines` + חיבור ל-`/alerts`.
- **#8** פולו-אפ/הערות v1 — `lib/crm/notes.ts` (localStorage).
- **#9** תחזית מקדמות — `lib/forecast/` + `ForecastCard` (חזק/ממוצע/חלש + תכנון-מול-ביצוע).

**תיקוני בדיקה-עצמית:** תוויות שנה דינמיות (היו קשיחות 2024) · הסרת כפילות מע"מ בין #3 ל-#5 ·
ריצת מס יחידה לכל תרחיש ב-#9.
