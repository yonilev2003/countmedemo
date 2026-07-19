# ספק בטא — הפקת מסמכים (CEO §3.3) + "מי לא שילם לי" (CEO §3.6)

> **סטטוס:** SPEC לביצוע · נכתב 2026-07-19 · יעד: מוכן לבטא עד רביעי 2026-07-22 בערב (תומי מתחיל בטא אמיתית חמישי 2026-07-23).
> **הערת ניווט:** `docs/specs/beta/dashboard.md:216` מפנה ל-`receivables.md` — **הקובץ הזה** הוא הספק המדובר (השם המחייב: `documents-receivables.md`). חוזה הצ'יפ מהדשבורד (`dashboard.md:214-231`) מכובד כאן אחד-לאחד.
> **כלל-על רגולטורי:** כל טענה על הוראות ניהול ספרים / חוק מע"מ / חוק מוסר תשלומים בקובץ הזה היא **DRAFT — ממתין לאימות רועי/רו"ח** (CEO §3.3: "ייעוץ נקודתי עם רו"ח/יועץ מס לאישור הפורמטים לפני השקה — נקודת סיכון רגולטורית שאסור לדלג עליה"). אין reviewer משפטי בצוות.

---

## מטרה

שני הרכיבים הכי "נטו-חדשים" בבטא, ישירות מהתוכנית האסטרטגית:

1. **הפקת מסמכים (CEO §3.3):** "חשבונית עסקה, קבלה והצעת מחיר בשלוש הקלקות. מספור רץ אוטומטי, שליחה בוואטסאפ/מייל, עיצוב נקי במיתוג של המשתמש." היום הגנרטור יודע רק חשבונית מס/קבלה (305) וקבלה (320) — צריך להוסיף **חשבון עסקה** ו**הצעת מחיר**, ולתקן פערים רגולטוריים קיימים (עוסק פטור, מספר הקצאה מדומה).
2. **מי לא שילם לי (CEO §3.6):** "מעקב אחרי חשבוניות והצעות מחיר פתוחות — מי שילם, מי מאחר, וכמה כסף בחוץ. בלחיצה אחת נשלחת ללקוח תזכורת מנוסחת ומנומסת. הכאב הכי גדול של פרילנסר צעיר הוא לא המס — זה לרדוף אחרי כסף."

זה לב ה-daily-life clarity של הבטא: המשתמש מפיק מסמך בבוקר, שולח בוואטסאפ בצהריים, ורואה בערב כמה כסף עוד בחוץ. מנוע ה-1301 נשאר שכבה שקטה — כאן אין שום קשר לדוח השנתי.

**עקרונות מחייבים:** עברית RTL בלבד · mobile-first · "עובדות, לא עצות" · אפס אימוג'י · `btn()` בלבד · אייקונים רק מ-`src/components/brand/icons.tsx` · לוגיקה דטרמיניסטית בלבד (LLM לא מחשב מספרים) · קבועי מס רק דרך `getTaxYearConstants` · **אפס תלויות חדשות** (הכול נבנה עם מה שיש: `node:crypto`, קישורי `wa.me`/`mailto`, `window.print`).

---

## מה קיים היום

### הגנרטור הקיים

- **טיפוסים:** `InvoiceDocType = "tax-invoice-receipt" | "receipt"` (`src/lib/persona.ts:46`); רשומת מסמך `InvoiceLine` עם `invoiceNumber/date/customerName/customerTaxId/description/amount/vat/total/category/docType` (`src/lib/persona.ts:48-60`). **אין** `status`, **אין** `dueDate`, **אין** קישורי המרה בין מסמכים.
- **מספור:** `nextInvoiceNumber` — מונה גלובלי יחיד `persona.invoiceCounter` בפורמט `YYYY-0042`, כשה-YYYY הוא שנת ההפקה בפועל (`new Date()`) ולא תאריך המסמך, והמונה **משותף לקבלות ולחשבוניות מס/קבלה** (`src/lib/invoice-generator/index.ts:5-8`).
- **חישוב סכומים:** `calculateInvoiceTotals` — מע"מ שנתי דרך `getTaxYearConstants(year).vatRate`, פטור ⇒ 0 (`src/lib/invoice-generator/index.ts:29-39`). תקין, נשאר.
- **ולידציה:** `validateInvoice` כולל כלל ת.ז./ח.פ. מעל 5,000 ₪ (`src/lib/invoice-generator/index.ts:17-20`) — **ליטרל 5000 בקוד, מחוץ ל-types.ts** (הפרת כלל year-keyed; לתקן אגב-עבודה, ראו DOC-1).
- **מסך הפקה:** `src/app/invoices/new/page.tsx` — שני כרטיסי סוג בלבד (`DOC_TYPE_LABELS`, שורות 23-34), **ללא סינון לפי סוג עוסק**: עוסק פטור רואה ובוחר "חשבונית מס/קבלה" (שורות 377-401) — **באג רגולטורי: עוסק פטור אינו רשאי להוציא חשבונית מס** (DRAFT-רועי, אבל ברמת ודאות גבוהה — סעיף 31(1) לחוק מע"מ; הקבלה של הקוד עצמו מודה בזה ב-`[invoiceNumber]/page.tsx:238`). ההפקה מוסיפה מיידית ל-`totalRevenue` ול-`monthlyBreakdown` (שורות 214-239).
- **תצוגת מסמך/הדפסה:** `src/app/invoices/[invoiceNumber]/page.tsx` — כותרת לפי `docType` (שורות 39-41); "לתשלום עד" מציג את **תאריך המסמך עצמו** כי אין dueDate (שורות 111-113); **מספר הקצאה (שע"מ) מפוברק** מוצג על המסמך מעל 25,000 ₪ (שורות 42-48, כולל ליטרל 25000) — מסמך עם מספר הקצאה מומצא הוא **סיכון רגולטורי חמור** בבטא אמיתית; פוטר תחתון עם **דומיין קשיח** `countmedemo.vercel.app` (שורה 241).
- **רשימה:** `src/app/invoices/page.tsx` — פילטרים שנה/חודש/לקוח, טבלת `<table>` שאינה מותאמת מובייל (שורות 228-276), תוויות סוג לשני הטיפוסים בלבד (שורות 243-254).
- **הכתבה קולית:** `src/app/api/parse-invoice/route.ts` — Haiku 4.5 מחלץ שדות; ה-prompt מכיר רק שני docTypes (שורות 18-35). ה-LLM מחלץ טקסט בלבד — החישוב נשאר דטרמיניסטי.

### תשתית נתונים ואנליטיקה

- **תבנית persistence:** localStorage (cache סינכרוני, `src/lib/setup-storage.ts`) + write-through ל-Supabase `profiles.persona` (jsonb) דרך `persistPersona` (`src/lib/data/persona-store.ts:16-19` → `upsertPersona`, `src/lib/data/persona-repository.ts:45-66`). RLS פעיל.
- **אנליטיקה:** טבלת `events` קיימת (`supabase/migrations/20260617091000_events.sql:9-30`), `EventName` סגור-טיפוסים (`src/lib/analytics/track.ts:15-27`), `trackClient` fire-and-forget (`src/lib/analytics/track-client.ts:8-24`), route `/api/track` קיים.
- **חוזה הדשבורד:** `dashboard.md:214-231` מגדיר `getReceivablesSummary(persona, now?)` ב-`src/lib/receivables/summary.ts` שמחזיר `{ outstandingTotal, outstandingCount, overdueCount }`, וצ'יפ שמנווט ל-`/receivables`. אירוע `receivables_chip_clicked` בבעלות הדשבורד (`dashboard.md:296`).
- **Auth:** `AUTH_GATING_ENABLED` עדיין כבוי (`src/lib/security/api-guard.ts:31`); persona יכולה להתקיים רק ב-localStorage למשתמש לא מחובר.

### ידע דומייני (skills)

- `israeli-e-invoice`: סוגי מסמכים 300/305/310/320/330 (`SKILL.md` Step 1); שדות חובה לפי סוג (`references/invoice-types.md`) — **330 (פרופורמה) "אינו מסמך מס חוקי"**; ציר סף מספרי הקצאה: **מ-1 ביוני 2026 הסף ירד ל-5,000 ₪ נטו** לחשבוניות מס 300/305/310 (`SKILL.md:36-47`) — כלומר בזמן הבטא הסף כבר 5,000 ₪, לא 25,000 כפי שמקודד היום.
- `israeli-freelancer-ops`: דליי aging — שוטף 0-29 / 30-59 / 60-89 / 90+ עם קאדנס תזכורות מדורג: וואטסאפ ידידותי ביום 30, מייל פורמלי ביום 60, אסקלציה ב-90+ (`SKILL.md` Step 2). **חוק מוסר תשלומים לעצמאים אינו מכוסה באף skill מותקן** (נבדק ב-grep על כל `.claude/skills/`) — כל אזכור שלו הוא DRAFT-רועי בלבד.

---

## מה בונים

### 1) שני סוגי מסמכים חדשים: חשבון עסקה + הצעת מחיר

**האופי המשפטי (DRAFT — ממתין לאימות רועי/רו"ח):**

| מסמך | מהות | מסמך מס? | מע"מ | הקצאה |
|---|---|---|---|---|
| **חשבון עסקה** | דרישת תשלום לפני קבלת הכסף. מתעד עסקה בספרים אך **אינו חשבונית מס** — הלקוח אינו יכול לקזז מע"מ תשומות על סמכו, וחבות המע"מ של המפיק לא נוצרת ממנו | רישומי בלבד (DRAFT) | מוצג כמרכיב בסכום לתשלום אצל מורשה; לא נגבה כמס במסמך | לא נדרשת (DRAFT) |
| **הצעת מחיר** | הצעה בלתי-מחייבת עם תוקף. **אינה מסמך הנהלת חשבונות בכלל** (מקביל רעיוני ל-330 פרופורמה — "not a legal tax document", `invoice-types.md:39-43`) | לא | אינדיקטיבי בלבד | לא |

**מטריצת עוסק ↔ מסמך (DRAFT-רועי):**

| | הצעת מחיר | חשבון עסקה | קבלה (320) | חשבונית מס/קבלה (305) |
|---|---|---|---|---|
| עוסק פטור / עוסק זעיר | ✓ | ✓ | ✓ | ✗ — **אסור** (כיום המסך מאפשר — באג, ראו לעיל) |
| עוסק מורשה | ✓ | ✓ | ✓ | ✓ |

מסך ההפקה יסנן את כרטיסי הסוג לפי `persona.business.osekType` (+`isOsekZeir` שמתנהג כפטור). לפטור שמנסה URL ישיר עם 305 — הפניה לקבלה עם הסבר עובדתי קצר.

**שדות חובה על המסמך המודפס (DRAFT-רועי — לפי הוראות מס הכנסה (ניהול פנקסי חשבונות)):**

- חשבון עסקה: שם העסק + מספר עוסק + כתובת המפיק; הכותרת "חשבון עסקה"; מספר סידורי מסדרה נפרדת; תאריך; שם הלקוח (וכתובת אם ידועה); תיאור; סכום; אצל מורשה — פירוט מע"מ; **תאריך לתשלום (dueDate)**.
- הצעת מחיר: כותרת "הצעת מחיר"; מספר; תאריך; לקוח; תיאור; סכום (מורשה: "כולל מע"מ 18%" דרך `vatRate`, לא ליטרל); **"בתוקף עד {validUntil}"**; שורת הבהרה קבועה: "הצעת מחיר — אינה דרישת תשלום ואינה מסמך לצורכי מס" (DRAFT-תומי לניסוח, DRAFT-רועי לתוכן).
- כל שורות הפוטר המשפטיות (כולל הקיימות ב-`[invoiceNumber]/page.tsx:238-241`) מרוכזות לקובץ אחד `src/lib/documents/legal-copy.ts` עם הערת `// DRAFT — NEEDS LEGAL REVIEW` על כל מחרוזת.

**מספור — סדרות נפרדות (דרישה קשיחה: הצעות מחיר לא צורכות את סדרת החשבוניות):**

```ts
// persona additions
docCounters?: {
  taxInvoiceReceipt?: number; // ממשיך את invoiceCounter הקיים (מיגרציית קריאה)
  receipt?: number;           // סדרה חדשה — R-2026-0001
  invoiceDemand?: number;     // HA-2026-0001
  quote?: number;             // Q-2026-0001
};
```

`nextDocNumber(persona, kind)` מחליף את `nextInvoiceNumber`; פורמט: 305 שומר על הפורמט הקיים `2026-0042` (המשכיות עם ההיסטוריה), חדשים עם קידומת ASCII (המספר משמש ב-URL `/invoices/[invoiceNumber]`). המונה רץ ולא מתאפס בשנה (רציף ללא דילוגים). **פיצול סדרת הקבלות מסדרת ה-305** (היום משותפת) — DRAFT-רועי לאישור כללי רציפות; משתמשי-עבר הם המייסדים בלבד, אז העלות אפסית.

**זרימות המרה (קישורי דאטה, לא העתקות ידניות):**

```
הצעת מחיר ──"הפק חשבון עסקה"──► חשבון עסקה (sourceQuoteNumber)
הצעת מחיר ──"שולם? הפק קבלה"──► קבלה (sourceQuoteNumber)          // תשלום מיידי, בעיקר פטור
חשבון עסקה ──"סמן כשולם"──► מסך קבלה ממולא מראש ──► קבלה (sourceDemandNumber)
                                └─ על החשבון עסקה: settledByReceiptNumber + status="paid"
```

כפתור ההמרה יושב על מסך המסמך; הוא פותח את `/invoices/new` עם `?from={docNumber}` וממלא את הטופס. **מניעת כפל הכנסה:** הכנסה נספרת **רק** ממסמכי קבלת תשלום (קבלה / 305). יצירת חשבון עסקה או הצעה **אינה** נוגעת ב-`totalRevenue`/`monthlyBreakdown` (בניגוד להתנהגות היום ב-`invoices/new/page.tsx:229-239` — לפצל את הכתיבה לפי סוג). "סמן כשולם" עובר תמיד דרך הפקת קבלה (נתיב יחיד; גם נכון חשבונאית — קבלה חובה בקבלת תקבול, DRAFT-רועי) — כך אין שני מסמכים שסופרים את אותו הכסף.

**הכתבה קולית:** להרחיב את ה-prompt ב-`api/parse-invoice/route.ts:18-35` לארבעה docTypes ("תעשה הצעת מחיר לדנה על 4,000") + שדה `dueDays` אופציונלי. ה-LLM ממשיך לחלץ טקסט בלבד.

**מיתוג משתמש על המסמך (בטא = שם עסק + צבע בלבד; לוגו נדחה):** המונוגרמה הקיימת (אות ראשונה של `tradeName`, `[invoiceNumber]/page.tsx:50-51`) נשארת; נוסיף `persona.business.docAccent?: "navy" | "teal" | "beige"` (ברירת מחדל navy) שקובע את צבע בלוק הכותרת. שלושת הערכים מטוקני המותג בלבד — אין color picker חופשי.

### 2) מודל סטטוסים (CEO §3.6 — "נשלח, שולם, באיחור; ידני בבטא")

```ts
// src/lib/documents/model.ts
export type DocKind = "tax-invoice-receipt" | "receipt" | "invoice-demand" | "quote";
export type DocStatus = "draft" | "sent" | "paid";           // נשמר בדאטה
export type EffectiveDocStatus = DocStatus | "overdue" | "expired" | "converted"; // נגזר ברנדור בלבד

export interface DocumentLine extends InvoiceLine {           // הרחבה לאחור-תואמת של InvoiceLine
  docType?: DocKind;                    // absent ⇒ "tax-invoice-receipt" (כמו היום, page.tsx:39)
  status?: DocStatus;                   // absent ⇒ נגזר: קבלה/305 ⇒ "paid", אחרת "draft"
  dueDate?: string;                     // ISO — חובה בחשבון עסקה
  validUntil?: string;                  // ISO — הצעת מחיר בלבד
  sentAt?: string;                      // חותמת שליחה ראשונה
  paidDate?: string;
  sourceQuoteNumber?: string;
  sourceDemandNumber?: string;
  settledByReceiptNumber?: string;      // על חשבון עסקה ששולם
  reminders?: ReminderRecord[];         // ראו §3
}
```

**מה מעביר כל סטטוס (ידני בבטא, אפס cron):**

| מעבר | טריגר |
|---|---|
| ⇒ `draft` | יצירת חשבון עסקה / הצעה (קבלה ו-305 נולדות `paid`, `paidDate = date`) |
| `draft` ⇒ `sent` | אוטומטית בפעולת שיתוף כלשהי (וואטסאפ/מייל/העתקת קישור/הדפסה) — קובע `sentAt`; או ידנית "סמן כנשלח" |
| ⇒ `paid` | ידני — "סמן כשולם" ⇒ זרימת קבלה (§1); קובע `paidDate` |
| `overdue` (נגזר) | `effectiveStatus`: `status==="sent" && dueDate < today` — **מחושב ברנדור, לא נשמר, אין cron** |
| `expired` (נגזר, הצעה) | `validUntil < today` וללא המרה |
| `converted` (נגזר, הצעה) | קיים מסמך עם `sourceQuoteNumber` שמצביע עליה |

`effectiveStatus(doc, now)` — פונקציה טהורה יחידה ב-`model.ts`, עם golden tests. תצוגה: `<StatusBadge>` הקיים — `plan` (טיוטה) / `due` (נשלח) / `on-track` (שולם) / `overdue` (באיחור).

**dueDate UX:** שדה תאריך + צ'יפים מהירים "+14 / +30 / +45 יום". ברירת מחדל: +30 (החלטת יוני, YONI-1). `validUntil` להצעה: ברירת מחדל +30 יום.

### 3) מסך "מי לא שילם לי" — `/receivables`

**Route:** `src/app/receivables/page.tsx` (client, `loadPersona()` → redirect ל-`/setup` כשריק — כמו `invoices/page.tsx:26-29`).

**הספרייה (מממשת את חוזה הדשבורד `dashboard.md:214-231` מילה במילה):**

```ts
// src/lib/receivables/summary.ts — טהור, ללא I/O, עם unit tests
export interface ReceivablesSummary {
  outstandingTotal: number;  // ₪ שטרם שולם (כל הזמנים) — חשבונות עסקה פתוחים בלבד
  outstandingCount: number;
  overdueCount: number;
}
export function getReceivablesSummary(persona: Persona, now?: Date): ReceivablesSummary;

export type AgingBucket = "current" | "d30" | "d60" | "d90plus"; // 0-29/30-59/60-89/90+ ימים מתאריך ההפקה (freelancer-ops Step 2)
export function agingBucketOf(doc: DocumentLine, now?: Date): AgingBucket;
export function openDemands(persona: Persona, now?: Date): DocumentLine[];   // ממוין: באיחור קודם, אח"כ ותיק→חדש
export function openQuotes(persona: Persona, now?: Date): DocumentLine[];    // סקשן נפרד, לא נספר ב-outstandingTotal
```

**החלטה:** "כמה כסף בחוץ" = חשבונות עסקה שאינם `paid` בלבד. הצעות מחיר הן צבר (pipeline), לא חוב — מוצגות בסקשן משני "הצעות פתוחות" ואינן נכנסות ל-`outstandingTotal` (הצ'יפ בדשבורד חייב מספר שהוא עובדה: כסף שהובטח וטרם הגיע).

**UI — mobile-first (עיקרון CEO §2):**

1. **כותרת דביקה:** המספר הגדול — `outstandingTotal` בטיפוגרפיה גדולה (Assistant, `text-brand-navy`), מתחתיו "{count} מסמכים פתוחים · {overdueCount} באיחור" (החלק השני רק כש->0). טון עובדתי, בלי צבע-אזהרה על הסכום עצמו.
2. **רשימת כרטיסים** (לא טבלה במובייל): לכל חשבון עסקה — לקוח, מספר, סכום, "הופק לפני N ימים", `StatusBadge`, ו"לתשלום עד {dueDate}". קיבוץ ויזואלי לפי דלי aging עם כותרות ביניים עובדתיות: "עד 30 יום" / "30-60 יום" / "60-90 יום" / "מעל 90 יום".
3. **פעולות לכל כרטיס** (bottom-sheet במובייל, inline בדסקטופ): "שלח תזכורת" · "סמן כשולם" (⇒ זרימת קבלה) · "צפייה במסמך".
4. **מצב ריק:** "אין כסף בחוץ — כל המסמכים שולמו." + CTA "הפקת מסמך חדש". (כשאין בכלל חשבונות עסקה: "כשתפיק חשבון עסקה ראשון, תראה כאן מי עוד לא שילם.")
5. דסקטופ: אותו DOM, `max-w-screen-md`, הכרטיסים נהיים שורות רחבות. אין גרסה נפרדת.

**תזכורת בלחיצה אחת — 3 נוסחים מדורגים (קופי PLACEHOLDER בטון איתן, DRAFT-תומי לסגירה):**

```ts
// src/lib/receivables/reminders.ts — טהור; ממלא עובדות מהמסמך, אפס LLM
export type ReminderTone = "gentle" | "businesslike" | "assertive";
export interface ReminderRecord { date: string; tone: ReminderTone; channel: "whatsapp" | "email" }
export function buildReminder(doc: DocumentLine, persona: Persona, tone: ReminderTone): {
  waText: string;      // ל-encodeURIComponent בתוך wa.me
  mailSubject: string;
  mailBody: string;
}
```

ברירת מחדל לפי דלי (קאדנס `israeli-freelancer-ops` Step 2): 30 יום ⇒ עדין, 60 ⇒ ענייני, 90+ ⇒ אסרטיבי — והמשתמש חופשי לבחור אחרת.

- **עדין:** "היי {לקוח}, מקווה שהכול טוב. תזכורת קטנה — חשבון עסקה {מספר} על {סכום} ₪ מ-{תאריך} עדיין פתוח. אשמח לעדכון מתי נוח לך להסדיר. תודה, {עסק}"
- **ענייני:** "שלום {לקוח}, חשבון עסקה {מספר} על סך {סכום} ₪ מ-{תאריך} טרם שולם (מועד התשלום: {dueDate}). פרטי חשבון להעברה: {בנק/סניף/חשבון}. אשמח להסדרה בימים הקרובים. {עסק}"
- **אסרטיבי:** "שלום {לקוח}, חשבון עסקה {מספר} על סך {סכום} ₪ פתוח כבר {N} ימים, אחרי תזכורות קודמות. אבקש להסדיר את התשלום עד {תאריך}. אם התשלום כבר בוצע — אעדכן מיד עם קבלה. {עסק}"

**חוק מוסר תשלומים לעצמאים:** אינו מכוסה באף skill מותקן (אומת). **בבטא הנוסחים לא מצטטים את החוק ולא מאיימים בריבית פיגורים** — עובדות בלבד. לאחר אימות רועי (ROY-1) אפשר יהיה להוסיף לנוסח האסרטיבי שורה עובדתית אחת בסגנון "בהתאם למועדי התשלום הקבועים בחוק" — עד אז, בחוץ. שורת הקשר לאיתן ("איתן אומר: רוב הלקוחות פשוט שכחו — תזכורת עדינה סוגרת את רוב המקרים") — עובדה רכה, DRAFT-תומי.

**שליחה (בלי WhatsApp API בבטא):**

- וואטסאפ: `https://wa.me/{phone?}?text={encodeURIComponent(waText)}` — אם אין טלפון ללקוח, `https://wa.me/?text=...` (בחירת נמען אצל המשתמש). דורש נרמול טלפון ישראלי ל-`972…` (util קטן, ללא תלות חדשה).
- מייל: `mailto:?subject=...&body=...`.
- כל שליחה: רושמת `ReminderRecord` על המסמך (persistPersona), מעדכנת `sentAt` אם היה `draft`, ויורה אירוע `reminder_sent`. על הכרטיס מוצג "תזכורת אחרונה: לפני N ימים".

### 4) שליחת המסמכים עצמם בוואטסאפ/מייל + קישור ציבורי חתום

**תבנית "טקסט + קישור":** על מסך המסמך — כפתורי "שליחה בוואטסאפ" / "שליחה במייל" / "העתקת קישור" (לצד "הדפס / שמור כ-PDF" הקיים). הטקסט: "היי {לקוח}, מצורף {סוג מסמך} {מספר} על {סכום} ₪ מ-{עסק}: {URL}".

**החלטת auth לקישור — ההמלצה: קישור ציבורי עם טוקן חתום (capability URL), לא login-required.** הלקוח של המשתמש לעולם לא יתחבר ל-countme; קישור שדורש התחברות הורג את הפיצ'ר. מפרט:

```
טוקן: base64url(JSON{u: userId, d: docNumber, iat}) + "." + HMAC-SHA256(payload, DOC_LINK_SECRET) (base64url, 16 בייט ראשונים)
route ציבורי: src/app/d/[token]/page.tsx  — Server Component:
  1. אימות חתימה (node:crypto.timingSafeEqual) — כישלון ⇒ notFound()
  2. קריאת profiles.persona של u דרך createAdminClient (בצד שרת בלבד)
  3. איתור המסמך לפי d ⇒ רנדור read-only של קומפוננטת המסמך (ללא header של האפליקציה, ללא פעולות)
יצירת קישור: POST /api/doc-link { docNumber } ⇒ { url } — מאחורי requireUserIfGated + rate-limit (כמו parse-invoice/route.ts:69-81)
env: DOC_LINK_SECRET — נוסף ל-.env.template (ריק) ולוורסל (YONI-1). אין תפוגה בבטא; iat בטוקן מאפשר revocation עתידי.
```

- **רכיב משותף:** לחלץ את גוף המסמך מ-`invoices/[invoiceNumber]/page.tsx` לקומפוננטה `src/components/documents/doc-view.tsx` שמשמשת גם את עמוד ההדפסה וגם את `/d/[token]`.
- **משתמש לא מחובר (persona רק ב-localStorage):** אין דרך לשרת קישור ציבורי — כפתור "העתקת קישור" מוסתר, וואטסאפ/מייל שולחים טקסט בלבד עם הערה "רוצה לצרף קישור למסמך? התחבר/י". זה תמריץ טבעי להרשמה, ותואם את כוונת הפעלת `AUTH_GATING_ENABLED` לבטא.
- **תיקון הדומיין הקשיח:** `countmedemo.vercel.app` (`[invoiceNumber]/page.tsx:241`) מוחלף ב-`window.location.origin` בצד לקוח; בצד שרת (`/api/doc-link`) — env חדש `NEXT_PUBLIC_APP_URL` (נוסף ל-.env.template) עם fallback ל-request origin.
- **אייקון:** אין אייקון וואטסאפ ב-`icons.tsx` (נבדק) — מוסיפים `WhatsAppIcon` קווי לפי חוקי הקיט (גריד 24px, stroke 1.75, currentColor). אסור אימוג'י ואסור לוגו-מותג מלא — קו בלבד.

### 5) מודל נתונים — הרחבת jsonb, בלי טבלה חדשה

**המלצה: להישאר בתבנית persona.income + write-through (localStorage → profiles.persona jsonb).** נימוקים: (א) עקביות עם כל הבטא — הדשבורד כבר החליט "אפס DDL" (`dashboard.md` §4.6); (ב) כל הצרכנים (דשבורד, receivables, 1301) קוראים persona אחת; (ג) 3 ימים לבטא — מיגרציית טבלה + RLS + סנכרון דו-כיווני לא נכנסים. **עלות עתידית מוכרת:** שלב 2 (התאמת תשלומים ביט/פייבוקס, CEO §4) ירצה טבלת `documents` אמיתית עם שאילתות צד-שרת; המרה אז = סקריפט חד-פעמי שקורא jsonb וכותב שורות. סקיצת ה-DDL העתידי נשמרת כאן כדי שההחלטה תהיה מודעת:

```sql
-- לא בבטא — סקיצה לשלב 2 בלבד (התאמת תשלומים): טבלת מסמכים נורמלית
-- create table public.documents (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid not null references auth.users(id) on delete cascade,
--   doc_number text not null, doc_type text not null, status text not null,
--   due_date date, paid_date date, customer_name text, total numeric not null,
--   payload jsonb not null, created_at timestamptz not null default now(),
--   unique (user_id, doc_number));
-- alter table public.documents enable row level security;
-- create policy documents_own on public.documents for all to authenticated
--   using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**מיקום הדאטה בבטא:**

- מסמכי כסף (305 / קבלה / חשבון עסקה) — נשארים ב-`persona.income.invoices` (שדה קיים; שינוי שם = מיגרציה מיותרת), עם השדות החדשים של `DocumentLine`.
- הצעות מחיר — מערך חדש `persona.income.quotes?: DocumentLine[]` (לא ב-invoices: הן אינן הכנסה, וכל קוד שסוכם invoices לא צריך לדעת לסנן אותן).
- **defaulting בזמן קריאה, אפס מיגרציה כתובה:** רשומות ישנות בלי `status`/`docType` מקבלות ברירות מחדל ב-`model.ts` (כמו הדפוס הקיים ב-`[invoiceNumber]/page.tsx:39`); `invoiceCounter` הישן נקרא כ-seed ל-`docCounters.taxInvoiceReceipt` כשהאחרון ריק.
- **חוזה חוצה-workstreams:** helper יחיד `isRevenueDoc(doc): boolean` (קבלה/305, או כל מסמך `paid` שאין לו `settledByReceiptNumber`-כפול) ב-`src/lib/documents/model.ts` — גם ההפקה וגם `computeMonthSummary` של הדשבורד חייבים לעבור דרכו. זה הסכר היחיד נגד כפל-ספירה.

### 6) אנליטיקה (הרחבת `EventName` ב-`track.ts:15-27`)

| אירוע | props | מתי |
|---|---|---|
| `doc_created` | `{ docType, osekType, hasDueDate, converted: boolean }` | כל הפקה, לפי סוג (מדד ההפעלה של CEO §3.7 — "מסמך ראשון תוך 48 שעות") |
| `doc_shared` | `{ docType, channel: "whatsapp"\|"email"\|"link"\|"print" }` | פעולת שיתוף |
| `doc_marked_paid` | `{ daysToPayment }` | סימון שולם (דרך קבלה) |
| `reminder_sent` | `{ tone, channel, bucket }` | שליחת תזכורת |
| `receivables_viewed` | `{ outstandingCount, overdueCount }` | כניסה ל-`/receivables` |

(`receivables_chip_clicked` — בבעלות ספק הדשבורד, `dashboard.md:296`; לא לממש כאן פעמיים.) בלי סכומים ובלי שמות לקוחות ב-props (מזעור PII — `israeli-privacy-shield`).

---

## מה במפורש לא בבטא (נדחה לפי מפת הדרכים, CEO §4)

1. **מספרי הקצאה (SHAAM):** אין אינטגרציה. אבל אי-אפשר להתעלם: מאז 1.6.2026 הסף הוא **5,000 ₪ נטו** לחשבוניות מס של מורשה (`israeli-e-invoice/SKILL.md:43-47`) — רלוונטי גם לקהל היעד. פעולת הבטא: (א) **מסירים את מספר ההקצאה המפוברק** (`[invoiceNumber]/page.tsx:42-48`) — הצגת מספר מומצא על מסמך אמיתי אסורה; (ב) על 305 של מורשה מעל הסף מוצגת שורת עובדה (DRAFT-רועי): "לחשבונית מס מעל 5,000 ₪ נדרש מספר הקצאה מרשות המסים. countme עדיין לא מנפיקה אותו — ראו gov.il" + קישור. הסף עצמו נכנס כקבוע year-keyed ל-`lib/calculators/types.ts` (`allocationNumberThreshold`), לא ליטרל. אינטגרציית SHAAM מלאה — שלב 2-3.
2. **התאמת תשלומים אוטומטית (ביט/פייבוקס)** — שלב 2 מפורש (CEO §4, "חיבור ביט/פייבוקס"). בבטא הסטטוסים ידניים.
3. **WhatsApp Business API / שליחה אוטומטית ומתוזמנת של תזכורות** — בבטא רק `wa.me`/`mailto` ידניים; אין cron, אין תורים.
4. **חשבונית זיכוי (310), תשלומים חלקיים, ריבוי שורות פריט** — המסמך נשאר חד-שורתי ("שלוש הקלקות"); זיכויים ופריטים מרובים — שלב 2 לפי פידבק.
5. **העלאת לוגו** — בבטא שם עסק + צבע בלבד (CEO §3.3 "במיתוג של המשתמש" מסופק חלקית ובמודע).
6. **CRM לקוחות** (ספר לקוחות, השלמה אוטומטית מעבר לשם חופשי) — שלב 2.
7. **חשבונית מס (300) נפרדת מקבלה** — הבטא נשארת עם 305 המשולבת; פיצול חשבונית/קבלה נפרדות לפי דרישת משתמשים אמיתית.

---

## פירוק משימות

סדר מומלץ: DOC-1 → DOC-2 → (DOC-3 ∥ DOC-4 ∥ REC-1) → השאר. תלות חוצת-ספקים: הצ'יפ בדשבורד (DSH-7 שם) תלוי ב-REC-1 כאן — REC-1 חייב להסתיים עד שלישי בבוקר.

| ID | משימה | שעות | Owner | תלויות | DoD (בדיק) |
|---|---|---|---|---|---|
| DOC-1 | מודל נתונים: `DocKind`/`DocStatus`/`DocumentLine`/`docCounters`/`income.quotes` ב-`persona.ts` + `src/lib/documents/model.ts` (`effectiveStatus`, `isRevenueDoc`, defaulting לרשומות ישנות) + העברת סף 5,000 ₪ של `validateInvoice` לקבוע year-keyed | 3 | ai | — | `npm test` ירוק עם golden tests ל-effectiveStatus (כולל overdue נגזר ו-expired); persona ישנה בלי status נטענת בלי שגיאה ומציגה קבלה כ-paid |
| DOC-2 | מספור: `nextDocNumber(persona, kind)` — 4 סדרות נפרדות, seed מ-invoiceCounter, קידומות Q-/HA-/R- | 2 | ai | DOC-1 | טסט: הפקת הצעה אינה מקדמת את מונה ה-305; מספרים רציפים ללא דילוג בכל סדרה |
| DOC-3 | מסך הפקה: 4 כרטיסי סוג מסוננים לפי osekType (פטור לא רואה 305), שדות dueDate+צ'יפים / validUntil, mobile-first | 4 | ai | DOC-1, DOC-2 | פרסונת פטור: 3 כרטיסים בלבד; חשבון עסקה בלי dueDate לא נשמר; ב-viewport 375px אין גלילה אופקית |
| DOC-4 | תצוגת מסמך לפי סוג: כותרות, "לתשלום עד" אמיתי, שורת תוקף להצעה, `legal-copy.ts` עם DRAFT, **הסרת מספר ההקצאה המפוברק**, תיקון דומיין קשיח ל-origin, חילוץ `doc-view.tsx` משותף, `docAccent` | 4 | ai | DOC-1 | אין מחרוזת "מספר הקצאה" מדומה בשום מסמך; הדפסה תקינה ל-4 הסוגים; `grep countmedemo.vercel.app src/` ריק |
| DOC-5 | `parse-invoice`: prompt מעודכן ל-4 סוגים + dueDays; ולידציית הפלט מורחבת | 1 | ai | DOC-1 | "הצעת מחיר לדנה על 4000" מחזיר `docType:"quote"`; טסט ידני מתועד ב-PR |
| DOC-6 | זרימות המרה quote→demand→receipt עם קישורי source/settledBy + פיצול כתיבת ההכנסה: רק `isRevenueDoc` מעדכן totalRevenue/monthlyBreakdown | 3 | ai | DOC-3 | תרחיש מלא: הצעה→חשבון עסקה→קבלה מוסיף להכנסות פעם אחת בדיוק (טסט); החשבון מסומן paid עם settledByReceiptNumber |
| DOC-7 | שיתוף: `WhatsAppIcon` חדש ב-icons.tsx, כפתורי wa.me/mailto/העתקת-קישור, `/api/doc-link` (HMAC, rate-limit, auth-guard), `/d/[token]` read-only, env-ים ב-.env.template | 4 | ai | DOC-4 | קישור שנוצר נפתח בחלון גלישה פרטית ומציג את המסמך; טוקן עם חתימה שגויה ⇒ 404; משתמש לא מחובר לא רואה "העתקת קישור" |
| DOC-8 | רשימת `/invoices`: פילטר סוג+סטטוס, StatusBadge לפי effectiveStatus, פריסת כרטיסים במובייל במקום `<table>` | 2 | ai | DOC-1 | ב-375px הרשימה קריאה ללא גלילה אופקית; סינון "באיחור" מציג רק נגזרי overdue |
| REC-1 | `src/lib/receivables/summary.ts` + `reminders.ts`: החוזה מ-dashboard.md:214-231 בדיוק, aging, openDemands/openQuotes, buildReminder — טהור + טסטים | 3 | ai | DOC-1 | חתימת `getReceivablesSummary` זהה לחוזה בדשבורד-ספק; טסטים לגבולות דליים (29/30/59/60/89/90); **מוכן עד שלישי בבוקר** |
| REC-2 | מסך `/receivables` mobile-first: כותרת דביקה, כרטיסים לפי דלי, סקשן הצעות פתוחות, מצבי ריק, פעולות | 4 | ai | REC-1 | כל ה-DoD הוויזואלי ב-375px; מצב ריק מוצג כשאין חשבונות פתוחים; ניווט מהצ'יפ בדשבורד מגיע לכאן |
| REC-3 | תזכורות: bottom-sheet בחירת טון (ברירת מחדל לפי דלי), שליחה wa.me/mailto, רישום ReminderRecord + "תזכורת אחרונה" | 3 | ai | REC-2, DOC-7 | לחיצה פותחת וואטסאפ עם טקסט עברי מקודד תקין (בדיקה ידנית באנדרואיד+iOS מתועדת); הרשומה נשמרת וגם נכתבת ל-DB (write-through) |
| REC-4 | "סמן כשולם" → מסך קבלה ממולא מראש → קישור וסגירה | 2 | ai | DOC-6, REC-2 | אחרי הזרימה: החשבון נעלם מ-/receivables, הקבלה ברשימה, ההכנסה נספרה פעם אחת |
| ANA-1 | הרחבת EventName + אינסטרומנטציה של 5 האירועים | 1.5 | ai | DOC-3, REC-2 | אירועים נכתבים ל-events בסביבת dev (נבדק ב-SQL); אין PII ב-props |
| ROY-1 | אימות רגולטורי מרוכז: שדות חובה לכל מסמך, כללי מספור/רציפות, מטריצת עוסק-מסמך, סף הקצאה 5,000, חוק מוסר תשלומים — צ'קליסט סגור עם מקורות | 3 | roy | — | לכל DRAFT בקובץ הזה יש שורת אישור/תיקון חתומה; מה שלא אושר עד רביעי — מוסתר מהבטא |
| TOMI-1 | קופי סופי: 3 נוסחי התזכורת, שורות משפטיות ב-legal-copy.ts, מיקרו-קופי מצבי ריק ושגיאות | 2 | tomi | REC-1 | כל ה-PLACEHOLDER הוחלפו או אושרו כמו-שהם; טון איתן אחיד עם ספק האונבורדינג |
| YONI-1 | החלטות + תפעול: אישור גישת הקישור החתום, `DOC_LINK_SECRET`+`NEXT_PUBLIC_APP_URL` בוורסל, ברירת מחדל dueDate (+30?), אישור פיצול סדרת הקבלות | 1 | yoni | — | env-ים קיימים ב-Production+Preview; ההחלטות רשומות ב-memory/decisions.md |

סה"כ AI: ‎~36.5 שעות על 3 ימים — צפוף אך ישים במקביליות; **קווי ויתור מוגדרים מראש:** DOC-5 (קול) ו-DOC-8 (רשימה) נחתכים ראשונים אם רביעי מתקרב; DOC-7 מתקפל ל"וואטסאפ טקסט-בלבד" (בלי קישור חתום) כ-fallback של שעתיים.

---

## סיכונים

1. **רגולטורי — פורמטים לא מאומתים (הסיכון המרכזי, במילות ה-CEO עצמו):** כל שדות-החובה והמספור הם DRAFT עד ROY-1. מיטיגציה: כל claim מסומן; מה שלא אושר עד רביעי — לא מוצג (מוסתר, לא מנוחש).
2. **מספר ההקצאה המפוברק הקיים:** אם הבטא עולה בלי DOC-4, משתמש אמיתי עלול לשלוח ללקוח מסמך עם "מספר הקצאה (שע"מ)" מומצא — חשיפה חמורה. DOC-4 הוא חוסם-בטא, לא nice-to-have.
3. **באג פטור-305 הקיים:** עוסק פטור יכול היום להפיק "חשבונית מס/קבלה". חייב להיסגר לפני משתמשים אמיתיים (DOC-3).
4. **כפל/חוסר בספירת הכנסה:** פיצול הכתיבה (DOC-6) נוגע באותו קוד שהדשבורד קורא. בלי החוזה `isRevenueDoc` המשותף — שני הספקים יסתרו. נדרש סנכרון עם ספק הדשבורד לפני מיזוג.
5. **קישור ציבורי = capability URL עם PII:** המסמך חושף שם, ת.ז./ח.פ. לקוח ופרטי בנק. מקובל למסמך שממילא נשלח ללקוח, אבל: אין תפוגה בבטא, והקישור עובר בוואטסאפ. מיטיגציה: iat בטוקן (revocation עתידי), אזכור ב-PII-minimization של WS7, אישור מפורש של יוני (YONI-1).
6. **משתמשי localStorage-בלבד:** בלי התחברות אין קישור חתום ואין גיבוי למונים — איבוד localStorage שובר רציפות מספור (בעיה רגולטורית). מיטיגציה: הבטא של תומי רצה עם `AUTH_GATING_ENABLED=true` וכל משתמשי הבטא מחוברים (כבר open item מס' 1 ב-CLAUDE.md).
7. **wa.me עם עברית ארוכה:** קידוד URL של טקסט עברי + אורך — עלול להיחתך במכשירים מסוימים. DoD של REC-3 כולל בדיקה ידנית בשני מכשירים; הנוסחים קצרים בכוונה.
8. **עומס לו"ז:** ‎36.5 שעות AI בשלושה ימים במקביל לספקים אחרים. קווי הוויתור מוגדרים למעלה; REC-1 (החוזה לדשבורד) מקבל עדיפות מוחלטת.

---

## מה צריך מהצוות

- **רועי (עד שלישי בערב, חוסם):** אימות כל ה-DRAFT — שדות חובה בחשבון עסקה והצעת מחיר לפי הוראות ניהול ספרים; אישור מטריצת עוסק-מסמך (בעיקר: פטור לא מפיק 305 — כן/לא וניואנסים); כללי רציפות מספור והאם מותר לפצל את סדרת הקבלות מסדרת ה-305 באמצע היסטוריה; אישור סף מספרי הקצאה 5,000 ₪ נטו נכון ליולי 2026 והנוסח העובדתי שמוצג; מה מותר להזכיר מחוק מוסר תשלומים לעצמאים בתזכורת ללקוח.
- **תומי (עד רביעי בצהריים):** סגירת קופי — 3 נוסחי התזכורת (עדין/ענייני/אסרטיבי) בטון איתן; שורות legal-copy; מיקרו-קופי מצבי ריק; אישור שהטון אחיד עם האונבורדינג והדשבורד.
- **יוני (עד שני בערב):** אישור החלטת הקישור החתום (public tokenized link) מול חלופת login-required; הוספת `DOC_LINK_SECRET` ו-`NEXT_PUBLIC_APP_URL` לוורסל + `.env.template`; החלטת ברירת מחדל ל-dueDate (+30 יום?); וידוא `AUTH_GATING_ENABLED=true` לפני חמישי; רישום ההחלטות ב-`memory/decisions.md`.
