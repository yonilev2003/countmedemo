# ספק בטא — דשבורד קליל (CEO §3.2 + §5)

> ספרינט בטא · נכתב 2026-07-19 (יום א') · יעד: מוכן לבדיקת תומי ביום ד' בערב 2026-07-22
> ענף: `claude/system-beta-preparation-oiyzpy` · בעלים ראשי: סשן AI · מאשר קופי: יוני

---

## מטרה

מימוש "דשבורד קליל" כמסך ברירת המחדל של המוצר, לפי תוכנית ה-CEO:

- **§3.2:** "מסך אחד. שלושה מספרים: הכנסות, הוצאות, יחס הכנסות־הוצאות. ארבעה כפתורי פעולה:
  חשבונית עסקה, קבלה, הצעת מחיר, העלאת הוצאה. זהו. בלי גרפים מיותרים, בלי טאבים."
- **§3.2 הכנה:** הגדרת מודל נתונים (מה הכנסה/הוצאה, מע"מ לפי סוג עוסק), תקופת ברירת מחדל,
  יחס "בצורה שמרגישה טוב ולא מלחיצה", ו"מצב ריק" — **"זה המסך הכי חשוב בבטא"**.
- **§5 עקרונות עיצוב:** "הדשבורד לא נגלל ולא מתפצל. כל מה שמעבר — במרחק הקלקה אחת";
  מובייל קודם; גיימיפיקציה עם משמעות ("רמת סדר של העסק"); טיפוגרפיה גדולה ובוטחת;
  אנימציות קצרות ותגובתיות.

הדגש המוצרי: **בהירות יומיומית**, לא הדוח השנתי. מסלול ה-1301 נשאר במוצר אך יוצא
מאור הזרקורים — עובר ל-`/dashboard/pro`.

---

## מה קיים היום (מאומת מול הקוד)

### הדשבורד הנוכחי — עשיר וכבד-1301

`src/app/dashboard/page.tsx` (534 שורות) הוא ההפך מ-§3.2:

- **טעינת persona מ-localStorage בלבד** דרך `loadPersona()` — `src/app/dashboard/page.tsx:126-134`
  (בניגוד ל-`/home` שמשתמש ב-`usePersona()` המסונכרן מול Supabase — `src/app/home/page.tsx:45`).
- **4 KPI** כולל "מס הכנסה משוער" מ-`estimateTaxLiability` — `src/app/dashboard/page.tsx:202-241` (המס בשורה 233).
- **בורר שנה/רבעון/חודש** — `src/app/dashboard/page.tsx:243-297`.
- **מועדים ודדליינים** (`getUpcomingDeadlines`, שלושה כרטיסים + timeline) — שורות 137-149, 453-463.
- **התראת תקרת עוסק פטור** (`computeCeilingAlert`) — שורות 198, 466-470.
- **גרף רו"ה** (Recharts, dynamic import) — שורות 52-55, 313-320, 495-503.
- **ExpenseRatioCard, ForecastCard, IncomeCeilingCard, סיכום שנתי עם "עבור/י למילוי הדוח"** — שורות 447-449, 484-492, 322-355.
- **EitanInsights — קריאת LLM בכל mount**: `src/components/dashboard/eitan-insights.tsx:17-72` שולח
  `mode: "dashboard-insights"` ל-`/api/coach` (שורה 27; ה-mode קיים ב-`src/app/api/coach/route.ts:124`).
  פרסינג ה-SSE בשורות 51-64 שבור (חסר `JSON.parse`) — **תיקון נפרד, מניחים שנוחת ביום 1**.
  בנוסף: קריאת LLM פר-כניסה = עלות + latency + חשיפה לממצא "פרומפטי איתן מפרים LLM-לא-מחשב"
  (`memory/STATUS.md`, סעיף יום ג' 07/07 פריט 6).
- **QuickActions** — 6 קיצורים בשני layouts (rail דסקטופ / bar+FAB מובייל):
  `src/components/dashboard/quick-actions.tsx:56-105` (הרשימה), 107-116 (variants), 174-217 (ה-bar).
  אין בהם "הצעת מחיר" ואין "העלאת הוצאה" כפעולה ישירה.

### מנוע הנתונים

- `calculatePL(persona)` — `src/lib/p-and-l/index.ts:63-184`. שלוש עובדות קריטיות לבטא:
  1. `totalRevenue`/`totalExpenses` נלקחים מ-`persona.income.totalRevenue/totalDeductibleExpenses`
     (שורות 64-66) — **אומדנים שנתיים מהוויזרד**, לא מסמכים בפועל.
  2. **fallback פילוג אחיד**: בלי נתונים מתוארכים הסכומים השנתיים מחולקים ב-12 (שורות 116-123) —
     משתמש יום-0 שהקליד "בערך 120,000" יראה "הכנסות 10,000 ₪" פיקטיביות. אסור בבטא.
  3. `monthFromIso` מפרסר **חודש בלבד ומתעלם משנה** (שורות 54-61) — נתונים מ-2025 ו-2026 יתמזגו.
- מסמכי הכנסה נשמרים ב-`persona.income.invoices` (`InvoiceLine`, `src/lib/persona.ts:48-60`):
  `amount` לפני מע"מ, `vat` (0 לעוסק פטור), `total`. הוצאות ב-`persona.income.expenses`
  (`ExpenseLine`, `src/lib/persona.ts:62-72`) — `amount` **כבר מנורמל לפי סוג עוסק**:
  "total paid (incl. VAT for patur, ex VAT for morshe)" (שורה 66).
- מע"מ מחושב **רק בהפקת המסמך** דרך `calculateInvoiceTotals` —
  `src/lib/invoice-generator/index.ts:29-39`, עם `getTaxYearConstants(year).vatRate`
  (`src/lib/calculators/types.ts:130` ל-2024 = 0.17, שורה 303 ל-2025 = 0.18, שורה 441 ל-2026 = 0.18).
  הדשבורד לעולם לא מחשב מע"מ בעצמו ולא מכיל literal של שיעור.
- סוגי מסמכים היום: `InvoiceDocType = "tax-invoice-receipt" | "receipt"` (`src/lib/persona.ts:46`).
  **אין הצעת מחיר ואין חשבונית עסקה** — נבנים בספק המסמכים (`docs/specs/beta/documents.md`).
- שמירת מסמך חדש: `src/app/invoices/new/page.tsx:234` דוחף ל-`persona.income.invoices`.

### תשתיות לשימוש חוזר

- `usePersona()` — cache מקומי מיידי + DB מנצח: `src/lib/data/use-persona.ts:15-40`.
- מותג: `btn()` (`src/components/brand/button.tsx`), אייקונים (`src/components/brand/icons.tsx`),
  `Reveal`/`Stagger`/`CountUp` (`src/components/brand/motion.tsx:26-52, 64-102, 109-141`),
  `ils()` (`src/lib/utils.ts:31-33`), `LegalNote` variants `full|line|estimate`
  (`src/components/brand/legal-note.tsx:31-37`).
- אנליטיקס: `trackClient()` (`src/lib/analytics/track-client.ts:8-24`) → `/api/track` עם allowlist
  (`src/app/api/track/route.ts:10-23`) → טבלת `events` ב-Supabase
  (`src/lib/analytics/track.ts:15-27` — ה-union הקנוני של שמות אירועים).
- `/home` — hub קיצורים למשתמש חוזר (`src/app/home/page.tsx:43-118`); ה-OAuth callback שולח לשם.

---

## מה בונים

### 1) ניתוב: `/dashboard` חדש, הקיים עובר ל-`/dashboard/pro`

**החלטה:** הדשבורד העשיר **לא נמחק** — הוא משרת את מסלול ה-1301 (שנשאר במוצר). הוא עובר
כמו-שהוא ל-`src/app/dashboard/pro/page.tsx`, והדשבורד הקליל החדש הופך ל-`src/app/dashboard/page.tsx`.

- קישור שקט בתחתית הדשבורד החדש: "מצב מורחב" (`btn("ghost","sm")`) → `/dashboard/pro`.
- `/dashboard/pro` מקבל בראשו קישור חזרה "לדשבורד" → `/dashboard`. שום שינוי נוסף בו.
- `/dashboard/pl-report` נשאר במקומו (מקושר מ-pro בלבד).
- `/home` נשאר כמות שהוא בבטא (איחוד /home—/dashboard הוא החלטת פוסט-בטא). ספק האונבורדינג
  הוא הבעלים של יעד הנחיתה אחרי הרשמה; החוזה מולו: **נחיתה ב-`/dashboard`**, שחייב להיראות
  מצוין גם עם אפס נתונים (מצב ריק, סעיף 3).

### 2) המסך (mobile-first)

עמודה אחת, `max-w-md` במובייל, `sm:max-w-lg` בדסקטופ (הדסקטופ הוא הרחבה — אותו layout,
מרווחים גדולים יותר; אין layout כפול כמו היום). **אין גלילה נדרשת ב-viewport סטנדרטי של
טלפון (iPhone 15/Pixel 8) — זו דרישת DoD.** אין טאבים, אין גרף.

סדר אנכי (עוטפים ב-`Reveal`/`Stagger` הקיימים; ללא אימוג'י; RTL עם `ms-/me-/ps-/pe-`):

1. **Header** — `Logo` + ברכה (`greeting()` הקיים, לחלץ מ-`dashboard/page.tsx:111-117` ל-util
   משותף כי גם `/home` משכפל אותו) + שם החודש: "יולי 2026".
2. **פס "העסק שלך מסודר"** — סעיף 6 (שורה דקה, לא כרטיס דומיננטי).
3. **שלושת המספרים** — כרטיס אחד `bg-paper rounded-2xl shadow-brand`:
   - שתי עמודות: **הכנסות החודש** (`text-brand-deep`) ו**הוצאות החודש** (`text-ink`),
     `font-display text-3xl sm:text-4xl font-extrabold tabular-nums`, עם `CountUp` + `ils()`.
   - מתחת, שורת **היחס** כמשפט (סעיף 4.3) — לא אחוז יבש ולא צבע אזהרה.
4. **ארבעת כפתורי הפעולה** — grid ‏2×2, tiles בסגנון ה-hub הקיים (`home/page.tsx:88-114`,
   `quick-actions.tsx:120-165` — תקדים קיים; כפתורים אמיתיים תמיד דרך `btn()`):
   מטרות הניווט מרוכזות בקובץ אחד `src/lib/dashboard/actions.ts` (חוזה מול ספק המסמכים):

   | tile | href | אייקון (מ-icons.tsx) |
   |---|---|---|
   | חשבונית עסקה | `/invoices/new?type=proforma` | FileTextIcon |
   | קבלה | `/invoices/new?type=receipt` | ReceiptIcon |
   | הצעת מחיר | `/invoices/new?type=quote` | FileTextIcon (וריאנט tone) |
   | העלאת הוצאה | `/expenses/new` | WalletIcon |

   ה-`type` בפרמטר תואם את הרחבת `InvoiceDocType` בספק המסמכים; עד שהוא נוחת, שני הראשונים
   מצביעים על `/invoices/new` הקיים (שכבר תומך `receipt`/`tax-invoice-receipt` —
   `invoices/new/page.tsx:75`). `/expenses/new` — ראה DSH-9.
5. **צ'יפ "מי לא שילם לי"** — סעיף 5. מוצג רק כשיש סכום פתוח.
6. **כרטיס איתן** — סעיף 7. שימוש חוזר במעטפת הוויזואלית של `eitan-insights.tsx:75-98`
   (chip האייקון + "איתן אומר"), תוכן דטרמיניסטי.
7. **Footer** — `<LegalNote variant="line" />` (כלל WS8: באנר אחד לעמוד; ה-full נשאר ב-pro,
   `dashboard/page.tsx:406-408`) + קישור "מצב מורחב".

**QuickActions bar/rail לא מרונדרים בדשבורד החדש** — ארבעת ה-tiles הם הפעולות. הקומפוננטה
נשארת בשימוש `/home` ו-`/dashboard/pro`.

### 3) מצב ריק — "המסך הכי חשוב בבטא"

טריגר: `summary.isEmpty` — אפס `invoices` **ואפס** `expenses` אי-פעם (לא רק החודש).
זה מצב הנחיתה של כל משתמש חדש מהאונבורדינג.

- **המספרים לא מוסתרים**: "0 ₪" / "0 ₪" והיחס מציג "—". המסגרת קיימת מיום 0; בלי `CountUp`
  (אין מה לספור), בלי skeleton-פחד.
- **כרטיס איתן = הודעת פתיחה** (template דטרמיניסטי, סעיף 7):
  > "היי {firstName}, אני איתן. ברגע שיופק כאן מסמך ראשון — המספרים יתחילו לזוז.
  > הכול נשאר שלך, שקוף ומסודר." *(DRAFT — אישור יוני)*
- **הדגשת פעולה ראשונה**: ה-tile "קבלה" מקבל ring מותג (`ring-2 ring-brand-deep`) ותת-שורה
  "שלושה שדות ומסמך ראשון מוכן" *(DRAFT — אישור יוני)*. שאר ה-tiles רגילים.
- פס "העסק שלך מסודר" מציג 1/3 (הפרופיל הושלם באונבורדינג) — תחושת התקדמות כבר ביום 0.
- צ'יפ "מי לא שילם לי" מוסתר. אין שום אלמנט מס/דוח שנתי/מועדים.
- אנליטיקס: `dashboard_viewed { empty: true }`.

### 4) מודל הנתונים — דטרמיניסטי, ללא LLM, ללא literals

קובץ חדש: **`src/lib/dashboard/summary.ts`** — פונקציות טהורות + golden tests.

```ts
import type { Persona, InvoiceDocType } from "@/lib/persona";

export interface MonthPeriod { year: number; month: number } // month: 1-12

export interface MonthSummary {
  period: MonthPeriod;
  /** מחזור החודש ללא מע"מ — Σ InvoiceLine.amount על מסמכי הכנסה בלבד */
  revenue: number;
  /** הוצאות החודש — Σ ExpenseLine.amount (כבר מנורמל לפי סוג עוסק, persona.ts:66) */
  expenses: number;
  /** expenses/revenue; null כשאין הכנסות בתקופה */
  ratio: number | null;
  revenueCount: number;   // מספר מסמכי הכנסה בתקופה
  expenseCount: number;   // מספר הוצאות בתקופה
  /** true ⇔ אפס מסמכים ואפס הוצאות בכל הזמנים — מפעיל מצב ריק */
  isEmpty: boolean;
}

/** אילו docType נספרים כהכנסה. הצעת מחיר (quote) לעולם לא נספרת. */
export const REVENUE_DOC_TYPES: ReadonlySet<InvoiceDocType>;

export function currentPeriod(now?: Date): MonthPeriod;
/** פרסור year+month מ-ISO — בניגוד ל-monthFromIso (p-and-l/index.ts:54) שמתעלם משנה */
export function yearMonthFromIso(iso: string): MonthPeriod | null;
export function computeMonthSummary(persona: Persona, period: MonthPeriod): MonthSummary;
```

**4.1 מה נחשב הכנסה.** סכימת `InvoiceLine.amount` (לפני מע"מ) של מסמכים ב-
`persona.income.invoices` שתאריכם (`yearMonthFromIso(inv.date)`) בתקופה **ו-docType שלהם
ב-`REVENUE_DOC_TYPES`** (כיום: `tax-invoice-receipt`, `receipt`; ספק המסמכים מוסיף לכאן את
`proforma` אם יוחלט שהיא הכנסה — ברירת מחדל: **לא**, חשבונית עסקה אינה מסמך חשבונאי מחייב;
`quote` לעולם לא).

**4.2 מע"מ לפי סוג עוסק — דטרמיניסטי, אפס חישוב בדשבורד.**
- **מורשה:** מע"מ הוא צינור, לא הכנסה ⇒ סופרים `amount` (לפני מע"מ). ה-`vat` פר-שורה כבר
  חושב בהפקה ע"י `calculateInvoiceTotals` עם `getTaxYearConstants(year).vatRate`
  (`invoice-generator/index.ts:35`).
- **פטור/זעיר:** `vat === 0` ⇒ `amount === total`; אותה נוסחה עובדת.
- **הוצאות:** `ExpenseLine.amount` כבר מנורמל בקלט (כולל מע"מ לפטור, ללא מע"מ למורשה —
  `persona.ts:66`) ⇒ סכימה ישירה. שום שיעור מס לא מופיע בקומפוננטות/קופי.

**4.3 תקופת ברירת מחדל: החודש הקלנדרי הנוכחי.** בלי בורר תקופה בבטא (toggle שנה — שלב 2).
כותרת: "יולי 2026". חודש חדש מתחיל מאפס — זה פיצ'ר (תחושת התחלה נקייה), איתן מציין זאת
בתבנית של ה-1 בחודש.

**4.4 הצגת היחס — "מרגיש טוב, לא מלחיץ".** עיקרון: עובדה, לא ציון.
- `revenue > 0`: **"מכל 100 ₪ שנכנסו החודש — יצאו {round(ratio*100)} ₪"**. צבע ניטרלי
  (`text-ink`) תמיד; **אין** אדום/ירוק ואין שיפוט, גם כשהיחס מעל 100 (העובדה מדברת).
- `revenue === 0 && expenses > 0`: "החודש נרשמו הוצאות; עוד אין הכנסות."
- `isEmpty`: "—".
- כל הניסוחים DRAFT לאישור יוני; ExpenseRatioCard הקיים (עם סמנטיקת זעיר-30%) נשאר ב-pro בלבד.

**4.5 למה לא `calculatePL`.** בגלל שלוש הבעיות שצוינו (אומדני-ויזרד, פילוג-אחיד פיקטיבי,
עיוורון-שנה) — הדשבורד הקליל קורא **אך ורק** נתוני מסמכים בפועל דרך `computeMonthSummary`.
`calculatePL` ממשיך לשרת את pro ואת ה-1301 ללא שינוי.

**4.6 אין מיגרציית Supabase.** הכול נגזר מ-`profiles.persona` (jsonb) הקיים; טבלת `events`
כבר קיימת (`supabase/migrations/20260617091000_events.sql`, ראה `track.ts:2`). אפס DDL.

### 5) צ'יפ "מי לא שילם לי" — חוזה בלבד

המסך והלוגיקה בספק הנפרד (`docs/specs/beta/receivables.md`). הדשבורד צורך ממשק בלבד:

```ts
// src/lib/receivables/summary.ts — בבעלות ספק ה-receivables
export interface ReceivablesSummary {
  outstandingTotal: number;  // ₪ שטרם שולם (כל הזמנים, לא רק החודש)
  outstandingCount: number;  // מספר מסמכים פתוחים
  overdueCount: number;      // מתוכם באיחור
}
export function getReceivablesSummary(persona: Persona, now?: Date): ReceivablesSummary;
```

רנדור: כש-`outstandingCount > 0` — צ'יפ ברוחב מלא מתחת ל-tiles:
"**{ils(outstandingTotal)} עדיין בחוץ** · {outstandingCount} מסמכים" → `Link` ל-`/receivables`,
עם `ArrowLeftIcon`. טון עובדתי; אזכור איחור רק אם `overdueCount > 0` ("מתוכם {n} באיחור").
מוסתר לגמרי ב-0. אם ה-lib לא נוחת עד ג' בערב — הצ'יפ לא נשלח (ה-import מרוכז בשורה אחת).

### 6) גיימיפיקציה v1 — "העסק שלך מסודר"

אינדיקטור אחד, מוזן ממצב אמיתי בלבד. **בלי streaks, בלי נקודות, בלי חגיגות** (חגיגת הפקת
מסמך — בספק המסמכים; רצף שבועי — שלב 2 לפי CEO §5).

```ts
// src/lib/gamification/order-level.ts — טהור + טסטים
export type OrderStepId = "profile" | "first-doc" | "expense-this-month";
export interface OrderStep { id: OrderStepId; label: string; done: boolean; href: string }
export interface OrderLevel { steps: OrderStep[]; done: number; total: 3 }
export function computeOrderLevel(persona: Persona, now?: Date): OrderLevel;
```

- `profile` — שדות ליבה מלאים: `personal.firstName`, `business.osekType`,
  `business.primaryOccupation` (מולאו באונבורדינג).
- `first-doc` — `(persona.income.invoices?.length ?? 0) > 0`.
- `expense-this-month` — קיימת `ExpenseLine` בתקופה הנוכחית (`yearMonthFromIso`).

UI: שורה דקה מתחת לברכה — "העסק שלך מסודר · {done} מתוך 3" + שלוש נקודות
(`bg-success` לבוצע, `bg-line` לפתוח; בלי אדום). לחיצה פותחת רשימת שלושת הצעדים עם
קישורים (`href` של הצעד הפתוח הבא). ב-3/3 השורה הופכת ל-"העסק שלך מסודר" עם `CheckIcon` —
וזהו.

### 7) כרטיס איתן — דטרמיניסטי (ברירת המחדל בבטא)

מיישרים עם "LLM לעולם לא מחשב": **מסירים את קריאת ה-LLM פר-mount מהדשבורד** ומחליפים
בבחירת תבנית עברית טהורה מנתוני ה-summary. (אופציית LLM-cached לפי hash נתונים — נדחתה
במפורש לשלב 2; ה-mode `dashboard-insights` ב-`api/coach/route.ts:124` נשאר עבור pro אחרי
תיקון ה-SSE.)

```ts
// src/lib/eitan/dashboard-line.ts — טהור + טסטים; כל המחרוזות בקובץ הזה בלבד
export function eitanDashboardLine(
  summary: MonthSummary,
  order: OrderLevel,
  firstName: string,
  now?: Date,
): string;
```

סדר בחירה (הראשון שמתאים; מספרים אך ורק דרך `ils()` מה-summary; אפס קבועי מס; אפס עצות
מס — עובדות ו"מה אפשר לעשות במוצר" בלבד; כל הנוסחים DRAFT לאישור יוני):

1. `isEmpty` → הודעת הפתיחה (סעיף 3).
2. `first-doc` הושלם ו-`revenueCount === 1` בכל הזמנים → "המסמך הראשון שלך כבר בפנים.
   מכאן — כל מסמך חדש מתווסף למספרים האלה אוטומטית."
3. יום 1-3 בחודש עם תקופה ריקה אך היסטוריה קיימת → "חודש חדש התחיל — הספירה כאן מתאפסת.
   {month} הקודם נשמר בסדר גמור."
4. `expenseCount === 0 && revenue > 0` → "החודש נכנסו {ils(revenue)} מ-{revenueCount}
   מסמכים. עוד לא תועדו הוצאות החודש."
5. ברירת מחדל → "עד עכשיו ב{month} נכנסו {ils(revenue)} ויצאו {ils(expenses)} —
   הכול מתועד ומסודר."

### 8) אנליטיקס

הוספה **בשני המקומות** — ה-union ב-`src/lib/analytics/track.ts:15-27` וה-ALLOWED ב-
`src/app/api/track/route.ts:10-23` — ושיגור דרך `trackClient()`:

| אירוע | props | מתי |
|---|---|---|
| `dashboard_viewed` | `{ empty: boolean, orderLevel: number }` | mount של `/dashboard` (פעם אחת) |
| `dashboard_action_clicked` | `{ action: "proforma"\|"receipt"\|"quote"\|"expense" }` | לחיצת tile |
| `dashboard_pro_opened` | `{}` | לחיצת "מצב מורחב" |
| `receivables_chip_clicked` | `{ outstandingCount: number }` | לחיצת הצ'יפ |

אלה מזינים את מדד ההפעלה של ה-CEO (§3.7 — % שמפיקים מסמך תוך 48 שעות):
`dashboard_viewed{empty:true}` → `dashboard_action_clicked` → (אירוע ההפקה בספק המסמכים).

---

## מה במפורש לא בבטא (נדחה לפי מפת הדרכים)

- **בורר תקופה / toggle שנתי** — חודש נוכחי בלבד (שלב 2).
- **גרפים, טאבים, PLChart, בורר רבעונים** — נשארים ב-`/dashboard/pro` בלבד.
- **מספרי מס בדשבורד**: אומדן מס, מקדמות, תחזית (`ForecastCard`), התראות תקרה
  (`CeilingAlertCard`, `IncomeCeilingCard`), מועדים (`NextDeadlineCard`, `PeriodStatusCard`,
  `DeadlinesTimeline`) — הכול ב-pro; "התראות חכמות" הן שלב 2 מפורש (CEO §4).
- **Eitan-LLM בדשבורד** (גם cached) — התבנית הדטרמיניסטית היא הבטא.
- **streaks / רצף שבועי / חגיגות** — שלב 2 (CEO §5); חגיגת מסמך ראשון בבעלות ספק המסמכים.
- **הקלטה קולית, ווידג'טים, share-sheet, לחיצה ארוכה** — CEO §5, פוסט-בטא.
- **בנצ'מארק ענפי** — שלב 3.
- **איחוד `/home` עם `/dashboard`** — החלטת פוסט-בטא; לא נוגעים ב-`/home`.
- **סטטוסי תשלום ותזכורות** — ספק ה-receivables; כאן רק הצ'יפ.

---

## פירוק משימות

| id | משימה | שעות | בעלים | תלויות | DoD |
|---|---|---|---|---|---|
| DSH-1 | `lib/dashboard/summary.ts` — `computeMonthSummary` + `yearMonthFromIso` + `REVENUE_DOC_TYPES` + unit tests | 3 | ai | — | `npm test` ירוק; טסטים מכסים: מורשה ex-VAT, פטור, חציית-שנה (2025-12 מול 2026-01 לא מתמזגים), quote לא נספר, isEmpty; אפס literal של שיעור מס (grep) |
| DSH-2 | העברת הדשבורד הקיים ל-`/dashboard/pro` + קישור חזרה + עדכון `tests/e2e/demo-flow.spec.ts` אם מפנה ל-`/dashboard` | 2 | ai | — | `/dashboard/pro` זהה פיקסלית לקיים; build + e2e ירוקים |
| DSH-3 | מסך `/dashboard` חדש: header, 3 מספרים (CountUp), ‏4 tiles מ-`lib/dashboard/actions.ts`, LegalNote line, קישור "מצב מורחב"; `usePersona` + redirect ל-`/setup` על `source==="empty"` (בתבנית `home/page.tsx:48-50`) | 6 | ai | DSH-1, DSH-2 | ב-390px אין גלילה; RTL תקין; אפס אימוג'י; כפתורים רק `btn()`; lighthouse a11y ≥ 90 |
| DSH-4 | מצב ריק: אפסים, הדגשת tile "קבלה", העברת קופי לאישור | 3 | ai | DSH-3 | פרסונה טרייה מהוויזרד רואה מצב ריק (לא 10,000 ₪ פיקטיביים); צילומי מסך מובייל+דסקטופ ליוני |
| DSH-5 | `lib/eitan/dashboard-line.ts` + החלפת EitanInsights בדשבורד החדש בכרטיס דטרמיניסטי | 3 | ai | DSH-1 | אפס קריאות `/api/coach` מ-`/dashboard` (network tab); טסט לכל ענף תבנית; מחרוזות בקובץ אחד |
| DSH-6 | `lib/gamification/order-level.ts` + פס "העסק שלך מסודר" | 3 | ai | DSH-1 | שלושת הצעדים נגזרים ממצב אמיתי (טסט לכל צירוף); 3/3 מציג מצב סיום שקט |
| DSH-7 | צ'יפ "מי לא שילם לי" על בסיס `getReceivablesSummary` | 2 | ai | DSH-3 + lib מספק ה-receivables | מוצג רק כש->0; ניווט ל-`/receivables`; מוסתר בלי שבירה כשה-lib חסר |
| DSH-8 | אירועי אנליטיקס (union + ALLOWED + שיגורים) | 1.5 | ai | DSH-3 | 4 האירועים נכתבים ל-`events` (בדיקה ידנית מול Supabase); שגיאת track לא שוברת UI |
| DSH-9 | מגירה: sheet מינימלי "העלאת הוצאה" (סכום, תאריך, קטגוריה, ספק → `persona.income.expenses` דרך `usePersona().save`) — רק אם `/expenses/new` לא נוחת עד ד' 12:00 | 3 | ai | DSH-3; החלטת ספק ההוצאות | הוצאה שנשמרה מופיעה מיידית ב"הוצאות החודש" וב-order-level |
| DSH-10 | אישור קופי: מצב ריק, 5 תבניות איתן, נוסח היחס, תוויות tiles | 1 | yoni | DSH-4, DSH-5 | אישור בכתב בסשן; כל נוסח שלא אושר נשאר DRAFT ומסומן |
| DSH-11 | QA סוגר: `npm run build` + `npm test` + `npm run test:e2e`, בדיקת viewports ‏390/768/1280, ניגודיות AA | 3 | ai | DSH-1..8 | הכול ירוק; רשימת פערים משפטיים/פיננסיים בסוף הפלט (נוהל הפרויקט) |

סה"כ AI: ‏~26.5 שעות (+3 מגירה) — יומיים-שלושה של סשנים, בתוך חלון א'–ד'.
סדר מומלץ: יום א'–ב': DSH-1, DSH-2, DSH-3 · יום ב'–ג': DSH-4..6, DSH-8 · יום ג'–ד': DSH-7, DSH-9?, DSH-10, DSH-11.

---

## סיכונים

1. **נתונים פיקטיביים ליום-0** — אם בטעות מחברים את המסך ל-`calculatePL` (פילוג אחיד,
   `p-and-l/index.ts:116-123`) או לאומדני הוויזרד, משתמש חדש יראה הכנסות שלא קיימות.
   מנוטרל ב-DSH-1 (מסמכים בפועל בלבד) + טסט מצב-ריק ב-DSH-4.
2. **עיוורון-שנה בפילטר חודשי** — `monthFromIso` הקיים מתעלם משנה (`p-and-l/index.ts:54-61`);
   שימוש בו ימזג יולי-2025 עם יולי-2026. `yearMonthFromIso` החדש חובה, עם golden test חוצה-שנה.
3. **תלות בספקים מקבילים** — `/invoices/new?type=quote|proforma` (ספק מסמכים) ו-
   `lib/receivables/summary.ts` (ספק receivables). מנוטרל: מטרות ניווט בקובץ constants אחד;
   צ'יפ שמוסתר בהיעדר ה-lib; מגירת DSH-9 להוצאה.
4. **שבירת e2e** — `tests/e2e/demo-flow.spec.ts` עלול להסתמך על מבנה `/dashboard` הישן;
   ההעברה ל-pro חייבת לעדכן אותו באותו commit (DSH-2).
5. **תיקון ה-SSE של איתן** — ההנחה שנוחת ביום 1 רלוונטית רק ל-pro (הדשבורד החדש דטרמיניסטי);
   אם יתעכב, pro נשאר עם כרטיס שבור — מקובל, pro מחוץ לזרקור הבטא.
6. **קופי ללא סוקר משפטי** — כל נוסח שיווקי/משפטי-גבולי מסומן DRAFT; `LegalNote` היחיד בעמוד
   הוא variant `line` (כלל WS8). פערים מרוכזים בסוף כל פלט סשן.
7. **חלון זמן צפוף** — אם ד' בבוקר לא הכול ירוק: מוותרים לפי סדר על DSH-7 (צ'יפ), DSH-6 (פס
   הסדר), ולעולם לא על DSH-3/4 (המסך + מצב ריק — לב הבטא).
8. **פער ריצה מול production** — `AUTH_GATING_ENABLED` עדיין כבוי (memory/STATUS.md); בטא של
   תומי עם משתמשים אמיתיים בלי גייטינג = חשיפת תקציב/PII. מחוץ לתחום הספק אך חוסם השקה.

---

## מה צריך מהצוות

- **יוני:** אישור החלטת `/dashboard/pro` (או העדפת toggle "מצב מורחב" באותו URL — ברירת
  המחדל בספק: route נפרד, פשוט יותר) · אישורי קופי DSH-10 · הדלקת `AUTH_GATING_ENABLED=true`
  ב-Vercel לפני יום ה' (צעד ידני קיים מ-STATUS).
- **תומי:** אישור תוויות ארבעת הכפתורים בשפת המשתמשים ("חשבונית עסקה" מול "חשבונית"?) וסדרם ·
  הגדרת מה נבדק ביום ה' הראשון (תסריט: הרשמה → מצב ריק → מסמך ראשון → המספר זז).
- **רועי:** אישור עקרוני שהגדרת "הכנסות = מחזור ללא מע"מ ממסמכים בפועל" עקבית עם הדוחות
  (אין קבוע מס חדש בספק הזה — אין FLAG חדש).
- **תיאום ספקים מקבילים:** ספק המסמכים — חוזה `?type=` + הרחבת `InvoiceDocType` + החלטה אם
  proforma נכנסת ל-`REVENUE_DOC_TYPES` (המלצה: לא) · ספק ה-receivables — חתימת
  `getReceivablesSummary` כמוגדר בסעיף 5 · ספק ההוצאות — בעלות על `/expenses/new` והתראה
  עד ג' בערב אם לא נוחת (מפעיל DSH-9).
