# SPEC — הרשמה קלילה עם גיימיפיקציה (בטא)

> רכיב 3.1 בתוכנית האסטרטגית · יעד: מוכן לרביעי בערב 22.7.2026 · ענף: `claude/system-beta-preparation-oiyzpy`
> סטטוס קופי: כל טקסט משפטי-למחצה בספק הזה הוא **DRAFT — NEEDS LEGAL REVIEW** (אין עורך-דין מלווה).

## מטרה

מימוש סעיף 3.1 בתוכנית ה-CEO: תהליך הרשמה של **עד 3 דקות**, שאלות בשפה אנושית ("מה אתה עושה?", "כמה בערך נכנס בחודש?"), פס התקדמות, חגיגה קטנה בסיום — והמשתמש נוחת בדשבורד שכבר מותאם אליו. השאלון החדש **מחליף את אשף 7 השלבים** (`/setup`) כנקודת הכניסה לבטא. הדגש: **חיי היומיום של העצמאי** (מסמכים, הוצאות, מי-לא-שילם), לא הדוח השנתי — שדות "כבדים" של הדוח (ת"ז, בנק, ביטוח לאומי, קרן השתלמות, תרומות) עוברים לזרימה נדחית "השלמת פרטים לדוח".

הרעיון קיים כבר בזרעים ב-`memory/plan-pilot.md:143-150` ("שני מישורי onboarding": חדש-מאפס מול עם-ניסיון) — הספק הזה מרחיב אותו לשלוש רמות מסע (journey tiers) ומעגן אותו במודל הנתונים.

## מה קיים היום

| רכיב | קובץ | מצב |
|---|---|---|
| אשף 7 שלבים (0=העלאת מסמכים, 1–6 טפסים) | `src/app/setup/page.tsx:34-42,195-197` | מלא ומעמיק — אבל כבד: ת"ז + ולידציה (`:23-32,324-337`), נקודות זיכוי, הכנסות שנתיות, ניכויים, בנק. לא "3 דקות" |
| בניית Persona מהאשף | `src/app/setup/page.tsx:477-601` (`buildPersona`) | דורש את כל השדות; כולל **פברוק שקט** של ביטוח לאומי: `bituach \|\| Math.round(netIncome * 0.12)` בשורה `:586` |
| שאלת ב"ל באשף | `src/app/setup/page.tsx:1305-1326` | "ביטוח לאומי ששילמת השנה… 52% מהסכום מוכר לניכוי" — מבלבל דמי ב"ל עם מס בריאות; `src/lib/persona.ts:141-150` (FLAG(Roy)) קובע שה-52% חל על רכיב הב"ל בלבד |
| טעינת משתמש חוזר | `src/app/setup/page.tsx:266-322` | **באג**: משחזר s1–s6 אבל אף פעם לא קורא `setSelectedYear(saved.income.year)` — שנת המס חוזרת ל-2025 (`:207`) |
| קופי סיכום | `src/app/setup/page.tsx:1537-1539` | "הנתונים נשמרים מקומית בדפדפן שלך, אין שמירה בשרת" — **שקר** למשתמש מחובר: `persistPersona` כותב ל-Supabase (`src/lib/data/persona-store.ts:16-19` → `upsertPersona` ב-`src/lib/data/persona-repository.ts:45-66`) |
| טיפוס Persona | `src/lib/persona.ts:211-227` | **אין שדה רמת-ניסיון/מסע**. `OsekType = "patur" \| "morshe"` (`:10`) + `isOsekZeir` נפרד (`:107`) |
| סכימת JSON | `personas/persona.schema.json` | **מיושנת**: enum של `osekType` עדיין כולל `"company"` (הוסר מהמוצר), חסרים `isOsekZeir`, `reserveDaysByYear`, `soldierServiceMonths` |
| שכבת persistence | `setup-storage.ts` (localStorage) → `persona-store.ts` (write-through) → `persona-repository.ts` (Supabase `profiles.persona` jsonb) | **עובד, לא נוגעים** — האונבורדינג החדש משתמש באותו seam. נגזרת `user_type` (zaair/patur/murshe) ב-`persona-repository.ts:10-13` |
| ניתוב אחרי login | `src/app/home/page.tsx:47-50` | persona ריקה → `router.replace("/setup")`. עוד ~15 אתרי redirect/קישור ל-`/setup` (למשל `dashboard/page.tsx:129`, `invoices/new/page.tsx:96`, `file/page.tsx:20`, `demo/page.tsx:33`, `page.tsx:41`) |
| אנליטיקס | `src/lib/analytics/track.ts:15-27`, `src/lib/analytics/track-client.ts:8-24`, ולידציה ב-`src/app/api/track/route.ts:11-23` | שמות `setup_started`/`setup_step_completed`/`setup_completed` קיימים — אבל **אף אירוע לא נורה היום מ-/setup** (אין `trackClient` בקובץ) |
| אנימציה | `src/components/brand/motion.tsx` | `Reveal`/`Stagger`/`CountUp`, כולם reduced-motion-aware. כל אנימציה חדשה **חייבת** לגור כאן |
| פרופילי הוצאות לפי עיסוק | `src/lib/business-expenses/profiles.ts:125-352` | CREATIVE / TECH / CONSULTANT / DEFAULT; התאמה ב-`pickProfile` לפי `matchKeywords` על מחרוזת העיסוק |

## מה בונים

### 1. מסלול חדש: `/onboarding` — שאלון ≤3 דקות

עמוד client יחיד (`src/app/onboarding/page.tsx`) עם מכונת-מצבים פנימית, **מסך אחד = שאלה אחת**, mobile-first (viewport ייחוס 390px; דסקטופ = אותו טור ממורכז `max-w-md`). כפתורים רק דרך `btn()`, אייקונים רק מ-`brand/icons.tsx`, מאפיינים לוגיים בלבד (`ms-/me-/ps-/pe-`), בלי אימוג'י.

רצף המסכים (כיוון קופי — ניסוח סופי בטון של איתן אצל תומי, ONB-13):

| # | מסך | כיוון קופי (עברית) | נשמר אל |
|---|---|---|---|
| 0 | פתיחה | "בוא נכיר. שלוש דקות — ובסוף יש לך עסק מסודר ב-countme." CTA: "מתחילים" | fires `setup_started` |
| 1 | שם | "איך קוראים לך?" (שם פרטי + משפחה) | `personal.firstName/lastName` |
| 2 | עיסוק | "מה אתה עושה?" — רשת צ'יפים של 10–12 מקצועות הליבה (עיצוב גרפי, פיתוח והייטק, צילום, יצירת תוכן, אימון כושר, שליחויות, הוראה פרטית, איקומרס, ייעוץ, טיפול וקוסמטיקה, מוזיקה) + "משהו אחר" עם שדה חופשי | `business.primaryOccupation` → מזין את `pickProfile` (profiles.ts:340-352) |
| 3 | מסע | "איפה אתה במסע?" — 3 כרטיסים: **"עוד אין לי תיק"** (tier `pre`) / **"שנה ראשונה שלי"** (tier `first-year`) / **"כבר עצמאי מנוסה"** (tier `experienced`) | `journey.tier`; fires `setup_step_completed` עם `props.tier` |
| 3a | (רק tier=pre) סינון רשויות | ראו סעיף 4 להלן | `journey.authorities` |
| 4 | סוג עוסק | "איזה סוג עוסק אתה?" — זעיר / פטור / מורשה עם הסבר של שורה (ניסוחים קיימים ב-`setup/page.tsx:1630-1647`, התקרה **תמיד** מ-`getTaxYearConstants(year).osekZeirThreshold` — אפס ליטרלים). ל-tier=pre נוספת אופציה רביעית: "עוד לא פתחתי — נחליט אחר כך" (ברירת מחדל `patur`) | `business.osekType` + `business.isOsekZeir` (אותו מיפוי zeir→patur+flag כמו `OsekTypeChoice`, setup/page.tsx:1604-1648) |
| 5 | הכנסה | "כמה בערך נכנס בחודש?" — צ'יפים של טווחים: עד 5,000 ₪ / 5–10 אלף / 10–20 אלף / מעל 20 אלף / "משתנה, אין קבוע". **טווח, לא מספר** — לא ממציאים דיוק | `journey.incomeBand` בלבד. **לא** נכתב ל-`income.totalRevenue` (ראו "עקרון אי-פברוק" להלן) |
| 6 | שם העסק | "איך קוראים לעסק? (זה מה שיופיע על המסמכים שלך)" — ברירת מחדל: השם המלא מהמסך הראשון, אפשר לדלג | `business.tradeName` (ל-branding חשבוניות — `invoices/new/page.tsx:349` מציג אותו) |
| 7 | חגיגה | ראו סעיף 2 | fires `setup_completed`; ניווט ל-`/dashboard` |

**עקרון אי-פברוק (נגזרת של "המנוע דטרמיניסטי, לא ממציאים מספרים"):** האונבורדינג הקליל לא כותב אף מספר למנוע המס. `income.totalRevenue = 0`, `bituachLeumiSelfEmployed.annualPaid = 0` (בלי fallback של 12%!), כל הניכויים 0. `journey.incomeBand` הוא הקשר לקופי בדשבורד ("מצב ריק") בלבד — לעולם לא קלט לחישוב.

**מה האונבורדינג עדיין חייב לאסוף (המינימום לדשבורד-יומיום + מסמכים):** שם מלא, עיסוק (→ פרופיל הוצאות), סוג עוסק (→ מע"מ במסמכים: `calculateInvoiceTotals(amount, persona.business.osekType)` ב-`invoices/new/page.tsx:119`), טווח הכנסה חודשי (קופי בלבד), שם עסק (branding). זהו. כל השאר — נדחה.

### 2. פס התקדמות + חגיגת סיום

- פס התקדמות דק בראש המסך (progress = step/total), מונפש דרך primitive קיים/חדש ב-`motion.tsx` בלבד.
- מעברי מסכים: `Reveal` קיים. **primitive חדש אחד** ל-motion.tsx: `PopIn` (scale 0.9→1 + fade, ~250ms, `useReducedMotion` → מצב סופי סטטי) — לחגיגה ולצ'יפ נבחר.
- מסך חגיגה: `CheckIcon` בתוך עיגול navy עם `PopIn`, כותרת "העסק שלך מסודר ב-countme", `Stagger` של 3 שורות "מה כבר יש לך" (פרופיל הוצאות לפי {עיסוק} · מסמכים ממותגים בשם {שם העסק} · איתן זמין לשאלות), CTA `btn("primary")` "לדשבורד שלי" → `router.push("/dashboard")`. בלי קונפטי-ספריות — **אין תלות חדשה**.

### 3. הזרימה הנדחית — `/setup` הופך ל"השלמת פרטים לדוח"

- ה-route `/setup` **נשאר** על כל 7 השלבים (כולל שלב 0 העלאת מסמכים) — אבל מפסיק להיות כניסת המערכת. כותרת העמוד (`setup/page.tsx:679`) משתנה מ"הגדרת פרופיל" ל"השלמת פרטים לדוח", ותת-כותרת מסבירה: "הפרטים האלה נדרשים רק כשמכינים את הדוח השנתי — אפשר להשלים מתי שנוח".
- `/setup` נטען עם prefill מה-persona הקיימת (המנגנון כבר קיים ב-`:266-322`) — האשף יראה את השם/עיסוק/עוסק מהאונבורדינג הקליל.
- בסיום `/setup` (submit, `:603-610`) נקבע `journey.filingDetailsCompleted = true`.
- נגישות: כרטיס "השלמת פרטים לדוח" ברשימת "הצעד הבא" בדשבורד (סעיף 6), וכניסה מ-`/file` (שממילא דורש את הנתונים).
- **תיקוני חובה ב-/setup אגב המעבר** (הוא נשאר בפרודקשן): שחזור `selectedYear` מ-`saved.income.year`; תיקון שורת הקופי השקרית `:1538` ("לנרשמים — הנתונים נשמרים גם בחשבון שלך"); הסרת פברוק ה-12% ב-`:586` (ערך שהוזן או 0, בלי המצאה); הבהרת קופי ב"ל: "כמה שילמת לביטוח לאומי (בלי דמי ביטוח בריאות)? אם יש לך רק סכום כולל — סמן זאת" — ההפרדה המבנית `{ bituachLeumi, healthTax }` היא FLAG(Roy) ונשארת מחוץ לבטא.

### 4. שאלות סינון פתיחת-רשויות (tier=pre בלבד)

שלוש שאלות, כל אחת tri-state (כן / לא / לא בטוח):

1. "יש לך כבר תיק במס הכנסה?"
2. "נרשמת במע"מ (פתיחת עוסק)?"
3. "פתחת תיק עצמאי בביטוח לאומי?"

כל תשובת "לא"/"לא בטוח" מציגה כרטיס עובדתי קצר ("עובדות, לא עצות") עם קישור לעמוד placeholder חדש `src/app/guides/opening/page.tsx`: עמוד סטטי אחד עם 3 סעיפים (מס הכנסה / מע"מ / ביטוח לאומי), 3–4 שורות עובדתיות לכל רשות + קישור לעמוד הרשמי, ובאנר **"DRAFT — טיוטה, לא ייעוץ"**. המדריכים האינטראקטיביים המלאים = שלב 2 במפת הדרכים (CEO §4, "פתיחת תיק עוסק") — כאן רק placeholder שמראה שאנחנו מכירים את המצב שלו.

**מה כל tier פותח (מטריצת unlock, לאישור יוני ב-ONB-14):**

| יכולת | `pre` | `first-year` | `experienced` |
|---|---|---|---|
| דשבורד יומיומי | ✓ (מצב "צעדים ראשונים" + כרטיסי המדריכים) | ✓ | ✓ |
| הפקת מסמכים | הצעת מחיר בלבד + הערה עובדתית DRAFT ("חשבונית/קבלה של עוסק דורשות תיק פתוח") | ✓ מלא | ✓ מלא |
| המלצות הוצאות לפי מקצוע | ✓ | ✓ | ✓ |
| מועדים והתראות | מוסתר (אין תיק → אין מועדים) | ✓ | ✓ |
| "השלמת פרטים לדוח" (nudge) | מוסתר | עדיפות נמוכה | מוצג ברשימת הצעד-הבא |
| ייבוא מסמכים (שלב 0 של /setup) | מוסתר | אופציונלי | מוצע ("מגיע מכלי אחר?") — מישור 2 של plan-pilot.md:147 |

### 5. מודל נתונים + תאימות לאחור

תוספת ל-`src/lib/persona.ts` (שדה **אופציונלי** — אפס breaking):

```ts
export type JourneyTier = "pre" | "first-year" | "experienced";
export type IncomeBand = "0-5k" | "5-10k" | "10-20k" | "20k-plus" | "irregular";
export type TriState = "yes" | "no" | "unsure";

export interface PersonaJourney {
  tier: JourneyTier;
  /** טווח הכנסה חודשי — קונטקסט לקופי בלבד. לעולם לא קלט למנוע המס. */
  incomeBand: IncomeBand | null;
  /** תשובות סינון רשויות — נאסף רק כש-tier === "pre" */
  authorities?: {
    masHachnasa: TriState;
    maam: TriState;
    bituachLeumi: TriState;
  };
  onboardingVersion: "lite-v1";
  onboardingCompletedAt: string; // ISO
  /** האם הזרימה הנדחית /setup הושלמה (שדות הדוח מלאים) */
  filingDetailsCompleted: boolean;
}

export interface Persona {
  // ...קיים (persona.ts:211-227)...
  journey?: PersonaJourney;
}

/** קורא journey עם ברירת legacy: persona ותיקה (יוני/תומי/רוי, dana-cohen)
 *  שנוצרה באשף המלא — נחשבת experienced + filingDetailsCompleted=true. */
export function getJourney(p: Persona): PersonaJourney { /* ... */ }
```

- factory חדש `src/lib/onboarding/build-lite-persona.ts` — `buildLitePersona(answers): Persona` עם ברירות מחדל אינרטיות מתועדות: `teudatZehut: ""`, `birthDate: ""`, `gender: "female"` (ערך חובה בטיפוס; אינרטי עד השלמת /setup — מתועד בהערה), `maritalStatus: "single"`, כל המספרים 0, `income.year = 2025`, בנק ריק. persistence דרך `persistPersona()` הקיים — בלי seam חדש.
- **מיגרציית Supabase: לא נדרשת.** `journey` נוסע בתוך `profiles.persona` (jsonb). ה-personas הקיימות של יוני/תומי/רוי וה-localStorage שלהן נשארות תקפות כמו שהן (`journey` חסר ⇒ legacy דרך `getJourney`). סקיצה אופציונלית לשאילתות קוהורט — **נדחית, לא לבטא**:

```sql
-- OPTIONAL / DEFERRED — נוחות שאילתות בלבד, לא נדרש לבטא
alter table public.profiles
  add column if not exists journey_tier text
  generated always as (persona -> 'journey' ->> 'tier') stored;
```

- רענון `personas/persona.schema.json`: הסרת `"company"` מ-enum של osekType, הוספת `isOsekZeir`, `soldierServiceMonths`, `reserveDaysByYear`, `journey`.
- ניתוב: קבוע משותף `export const ONBOARDING_ROUTE = "/onboarding"` (ב-`src/lib/onboarding/route.ts` או persona.ts) ומחליפים בכל ~15 אתרי ה-redirect-על-ריק (`home/page.tsx:49`, `dashboard/page.tsx:129`, `invoices/*`, `file/*`, `alerts:158`, `deadlines:92`, `business-expenses:34`, `demo:33`, `pl-report:30`) + CTA בדף הנחיתה (`page.tsx:41,89,327`) ו-login (`login-form.tsx:64`). קישורים שמכוונים בכוונה לאשף המלא (about) מתעדכנים בקופי.

### 6. גיימיפיקציה v1 — מה נחגג, מתי

בלי נקודות, בלי streaks, בלי אינפלציה. שני מנגנונים בלבד:

1. **רגעי חגיגה** (אנימציית `PopIn` + קופי): סיום אונבורדינג (מסך 7). זה הרגע היחיד שהאונבורדינג עצמו חוגג.
2. **"הצעד הבא"** — הגשר לדשבורד (CEO: "איך זה ממשיך לדשבורד"): util חדש `src/lib/onboarding/next-steps.ts` שגוזר צ'ק-ליסט של עד 3 צעדים **מנתונים אמיתיים בלבד** (בלי state נשמר): הפקת מסמך ראשון (`income.invoices?.length`), תיעוד הוצאה ראשונה (`income.expenses?.length`), השלמת פרטים לדוח (`journey.filingDetailsCompleted`; מוסתר ל-pre). הדשבורד (ספק נפרד) צורך את ה-interface הזה ומציג ✓ על צעד שהושלם. "רמת סדר" של העסק — **נדחה במפורש** לשלב 2.

### 7. אנליטיקס

שימוש חוזר בשמות הקיימים (בלי לגעת ב-`ALLOWED` ב-`api/track/route.ts:11-23`), דרך `trackClient` הקיים:

- `setup_started` — מסך 0, `props: { flow: "lite-v1" }`
- `setup_step_completed` — כל מסך, `props: { flow: "lite-v1", step: "name" | "occupation" | "tier" | "authorities" | "osek" | "income" | "business-name" , tier? }` (במסך המסע — כולל ה-tier שנבחר; זהו אירוע "tier chosen")
- `setup_completed` — מסך החגיגה, `props: { flow: "lite-v1", tier, incomeBand, osekType, isOsekZeir, occupationChip }`

זה מאפשר את מדד ההצלחה של הבטא (CEO §3.7: ‎40%+ מסיימים הרשמה ומפיקים מסמך תוך 48 שעות) בשאילתה על `public.events`. הערה: היום שום אירוע לא נורה מ-/setup — הרישות כולו net-new.

## מה במפורש לא בבטא (נדחה לשלבים 2–4)

- מדריכי פתיחת תיק אינטראקטיביים צעד-אחר-צעד (שלב 2) — כאן רק עמוד placeholder עובדתי אחד.
- מדריך מעבר לעוסק זעיר (שלב 2).
- "רמת סדר", streaks, הישגים מצטברים — הוגדר במפורש ב-CEO §5 ונדחה; v1 = רגעי חגיגה + צעד-הבא בלבד.
- הקלטה קולית וקיצורי-דרך ווידג'ט (CEO §5) — לא בבטא.
- הפרדה מבנית `{ bituachLeumi, healthTax }` במודל + במחשבונים — FLAG(Roy), לא לפני אימות מקצועי.
- מיגרציית עמודת `journey_tier` ב-DB — נדחית (jsonb מספיק).
- בדיקת פרוטוטייפ עם 5–8 משתמשים לפני קוד (עבודת-הכנה של CEO 3.1) — לא ריאלית עד רביעי; מוחלף ב-self-test מייסדים + ראיונות בטא (ראו סיכונים).
- מחיקת האשף `/setup` — הוא נשאר כזרימת "השלמת פרטים לדוח". לא כותבים אשף שני.
- רשימת המתנה מגוימפקת (CEO §6) — שיווק, לא מוצר.

## פירוק משימות

| ID | משימה | שעות | Owner | DoD | תלויות |
|---|---|---|---|---|---|
| ONB-1 | הרחבת `Persona` — `journey` + `getJourney` + רענון `persona.schema.json` | 2 | ai | טיפוס מקומפל; dana-cohen.json עובר את הסכימה; `"company"` הוסר; legacy ללא journey מוחזר כ-experienced+completed בטסט יחידה | — |
| ONB-2 | `buildLitePersona` + טסטים | 3 | ai | vitest: persona תקפה נשמרת דרך `persistPersona`; כל ערכי המנוע 0 (אין fallback 12%); `user_type` נגזר נכון לכל שילוב עוסק | ONB-1 |
| ONB-3 | שלד `/onboarding`: מכונת מצבים, פס התקדמות, layout mobile-first RTL | 5 | ai | 8 מסכים ניווטים ב-390px; חזרה אחורה שומרת תשובות; `btn()`/icons בלבד; אפס אימוג'י; אפס ליטרלים של תקרות | ONB-1 |
| ONB-4 | מסכי השאלות: צ'יפים (`ChoiceChips`), עיסוק+טקסט חופשי, עוסק, טווח הכנסה, שם עסק — קופי v1 | 3 | ai | שאלון שלם ≤3 דק' במדידה ידנית; תקרת עוסק מוצגת מ-`getTaxYearConstants` בלבד; קופי מסומן לעריכת תומי | ONB-3 |
| ONB-5 | מסך סינון רשויות (pre) + עמוד `guides/opening` placeholder עם קופי DRAFT | 3 | ai | tri-state נשמר ב-`journey.authorities`; העמוד נגיש רק מקישורי הסינון והדשבורד; באנר DRAFT | ONB-3 |
| ONB-6 | מסך חגיגה + primitive `PopIn` ב-`motion.tsx` | 2 | ai | reduced-motion מציג מצב סופי סטטי; נחיתה ב-`/dashboard`; אנימציה רק ב-motion.tsx | ONB-3 |
| ONB-7 | קבוע `ONBOARDING_ROUTE` + החלפת כל ~15 אתרי redirect/CTA; כותרת `/setup` → "השלמת פרטים לדוח" | 2 | ai | `grep '"/setup"'` לא מחזיר אף redirect-על-ריק; `/setup` נטען prefilled מה-lite persona | ONB-2 |
| ONB-8 | `lib/onboarding/next-steps.ts` — צ'ק-ליסט נגזר + interface לדשבורד | 2 | ai | טסטים ל-3 מצבי צעדים; pre לא מקבל צעד "השלמת פרטים"; שום state נשמר | ONB-1 |
| ONB-9 | רישות אנליטיקס (started/step/completed + tier ב-props) | 1 | ai | אירועים נוחתים ב-`public.events` עם `props.flow="lite-v1"`; tier מופיע ב-completed | ONB-3 |
| ONB-10 | תיקוני `/setup`: שחזור `selectedYear`; קופי שמירה-בשרת; הסרת פברוק 12%; הבהרת קופי ב"ל | 2 | ai | משתמש חוזר רואה את שנת המס השמורה; `annualPaid` = קלט או 0; golden tests ירוקים | — |
| ONB-11 | מעבר תאימות: personas קיימות (מייסדים + dana-cohen) בכל הדפים ללא journey | 2 | ai | אין לולאת redirect; אין קריסה על שדות ריקים; legacy = experienced | ONB-7 |
| ONB-12 | Playwright e2e: משתמש חדש → אונבורדינג → דשבורד; ענף pre; משתמש legacy עוקף | 2 | ai | `npm run test:e2e` ירוק (כולל env של קונטיינר מנוהל) | ONB-4, ONB-7 |
| ONB-13 | מעבר קופי מלא בטון של איתן + מיקרו-קופי שגיאות | 2 | tomi | כל המחרוזות אושרו והוחלפו; שגיאות בשפה אנושית | ONB-4 |
| ONB-14 | אישורי מוצר: מטריצת unlock, רשימת צ'יפים, יעד נחיתה אחרי חגיגה | 1 | yoni | החלטות נרשמו ב-`memory/decisions.md` | — |
| ONB-15 | אימות עובדות: שורות ההסבר לעוסק, עובדות פתיחת-רשויות, הכרעת פיצול ב"ל/בריאות | 1.5 | roy | אישור כתוב; סימוני DRAFT מוסרים או נשארים לפי ההכרעה | ONB-5 |

סה"כ ai: ‎~29 שעות (ראשון–רביעי, במקביל לרכיבי בטא אחרים).

## סיכונים

1. **עבודת ההכנה של ה-CEO (בדיקת 5–8 משתמשים על פרוטוטייפ לפני קוד) לא תקרה עד רביעי.** מיטיגציה: self-test של שלושת המייסדים ביום ג', וראיונות הבטא של תומי (CEO §3.7) הופכים לבדיקת-המשתמשים בפועל. שינויי קופי/סדר-שאלות זולים אחרי הבנייה.
2. **ברירות מחדל אינרטיות (gender, ת"ז ריקה) עלולות לזלוג למנוע המס** אם lite-persona מגיעה ל-`/file` או למחשבונים. מיטיגציה: `/file` שוער על `journey.filingDetailsCompleted`; ONB-11 עובר על כל הדפים.
3. **~15 אתרי redirect ל-/setup** — פספוס של אחד מפיל משתמש חדש לאשף הכבד. מיטיגציה: קבוע משותף + grep ב-DoD של ONB-7 + e2e.
4. **צ'יפים של מקצועות ליבה (שליחויות, אימון כושר…) נופלים היום ל-DEFAULT_PROFILE** ב-`profiles.ts` — חוויית "דשבורד מותאם" נחלשת עד שרשימות CEO 3.5 ייבנו (ספק נפרד/שלב 2). מיטיגציה: להרחיב `matchKeywords` נקודתית.
5. **מסלול אנונימי → התחברות**: אימוץ ה-cache דרך `syncPersonaFromDb` (persona-store.ts:47-62, חותמת owner) — קצוות של שני חשבונות באותו דפדפן. מכוסה חלקית בקוד קיים; להוסיף למקרי הבדיקה של ONB-12.
6. **קופי משפטי-למחצה בלי עורך-דין** (הסברי עוסק, עובדות רשויות, הערת "אין תיק → אין חשבונית") — נשאר DRAFT, מרוכז ברשימה המובנית בסוף כל סשן AI לפי נוהל הפרויקט.
7. **התנגשות משאבים** עם רכיבי הבטא האחרים על אותם קבצים (`motion.tsx`, redirect-ים, דשבורד) — לתאם סדר merge; ONB-8 מגדיר interface כדי שהדשבורד לא ייחסם.

## מה צריך מהצוות

- **יוני (ONB-14):** אישור מטריצת ה-unlock לשלושת ה-tiers (במיוחד: הגבלת pre להצעות מחיר בלבד); אישור רשימת 10–12 צ'יפים של מקצועות; אישור יעד נחיתה `/dashboard` אחרי החגיגה; הכרעה אם `/onboarding` פתוח גם אנונימית או רק אחרי login (ברירת מחדל בספק: גם וגם, כמו היום).
- **תומי (ONB-13):** קופי סופי בטון של איתן לכל 8 המסכים + מיקרו-קופי שגיאות (עבודת-הכנה מפורשת ב-CEO 3.1); רשימת משתמשי הבטא של יום חמישי כדי לתזמן self-test מייסדים ביום ג'.
- **רוי (ONB-15):** אימות שורות ההסבר של זעיר/פטור/מורשה; אימות עובדות פתיחת-התיק לשלוש הרשויות בעמוד ה-placeholder; הכרעה על פיצול ב"ל/מס-בריאות (FLAG קיים ב-`persona.ts:141-150`) — לבטא מספיקה הבהרת קופי, אבל צריך הכרעה כתובה.
