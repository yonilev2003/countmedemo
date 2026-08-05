# countme

> AI-native financial-ops לעצמאים בישראל — מילוי טופס 1301, ניהול חשבוניות, ודשבורד רווח והפסד.

**דמו חי:** [countmedemo-eight.vercel.app](https://countmedemo-eight.vercel.app)

---

## מה זה

countme הוא המלווה הדיגיטלי לעצמאים ישראלים לאורך כל שנת המס. הוא לוקח חשבוניות, הוצאות ופרטי עסק — ומחשב אוטומטית כל שדה בטופס 1301 על-פי חוקי מס ההכנסה הישראלי. כל מספר לחיץ ומגלה את החישוב והמקור.

**איתן**, הסוכן הדיגיטלי של countme, מתנהג כ-"אח חכם" — לא מפנה לרואה חשבון, מזהה הוצאות שפספסת, ומחיל כללי ניכוי (30% בית, סעיף 46, ביטוח לאומי וכו') בשקט.

---

## הרצה מקומית

```bash
npm install
npm run dev          # http://localhost:3000
```

משתני סביבה (צור `.env.local`):

```env
ANTHROPIC_API_KEY=sk-...
```

### build + type check

```bash
npm run build        # Next.js production build (webpack mode)
npx tsc --noEmit     # type-check only
```

---

## ארכיטקטורה

```
src/
├── app/
│   ├── page.tsx                    # Landing
│   ├── setup/page.tsx              # אשף נתונים 7 שלבים (כולל העלאת קבצים)
│   ├── demo/page.tsx               # תצוגת טופס 1301 — מקביל לאתר gov.il
│   ├── coach/page.tsx              # צ׳אט עם איתן
│   ├── dashboard/page.tsx          # דשבורד רווח והפסד (Recharts)
│   ├── file/
│   │   ├── page.tsx                # Gateway — 2 מסלולים
│   │   ├── expert/page.tsx         # מבט מומחה — טבלה עם כל השדות + copy
│   │   └── guided/page.tsx         # מסלול מודרך 12 שלב עם איתן
│   ├── invoices/
│   │   ├── page.tsx                # רשימת חשבוניות
│   │   ├── new/page.tsx            # הוצאת חשבונית / קבלה
│   │   └── [invoiceNumber]/page.tsx # תצוגה + הדפסה
│   ├── business-expenses/page.tsx  # הוצאות מוכרות לפי עיסוק
│   └── api/
│       ├── chat/route.ts           # Anthropic streaming (rate-limited)
│       ├── coach/route.ts          # איתן — SSE streaming + prompt caching
│       └── upload/route.ts         # Parser: xlsx (exceljs) + PDF (Claude vision)
├── components/
│   ├── form-1301/
│   │   ├── form-preview.tsx        # תצוגת הטופס (פאלטה gov.il — נעולה)
│   │   ├── interactive-value.tsx   # ערך לחיץ עם tooltip
│   │   └── copy-button.tsx         # 📋 העתק עם feedback 2 שניות
│   ├── agent/
│   │   ├── coach-chat.tsx          # ממשק צ׳אט איתן
│   │   └── chat-panel.tsx          # פאנל הצ׳אט בדמו
│   └── dashboard/
│       ├── pl-chart.tsx            # Recharts BarChart + PieChart
│       └── eitan-insights.tsx      # תובנות streaming מהדשבורד
└── lib/
    ├── persona.ts                  # טיפוסים + loader
    ├── setup-storage.ts            # localStorage helpers
    ├── form-1301/
    │   ├── schema.ts               # מבנה הטופס: 3 טאבים, sections, fields
    │   └── modules.ts              # 12 מודולים למסלול המודרך
    ├── calculators/index.ts        # 20 פונקציות חישוב טהורות
    ├── p-and-l/index.ts            # calculatePL, filterByQuarter
    ├── invoice-generator/index.ts  # nextInvoiceNumber, validateInvoice, formatHebrewDate
    └── business-expenses/profiles.ts # פרופילי הוצאות לפי עיסוק

personas/
├── dana-cohen.json         # פרסונת demo ברירת מחדל
├── persona.schema.json     # JSON Schema לולידציה
└── README.md               # איך להחליף פרסונה
```

---

## זרימת נתונים

```
personas/dana-cohen.json
        │
        ▼
src/lib/persona.ts  ──────────────────► Persona object
        │
        ▼
src/lib/calculators/index.ts           (20 calculators)
   field150BusinessIncome()   ──►  CalcResult { value, formula, sources }
   field238Turnover()
   field030BituachLeumi()     ──► 52% of gross × 0.97
   field137KerenHishtalmut()
   field020Resident()         ──► 2.25 credit points × 219₪ = 492.75₪/month
   field044OlehHadash()
   field068Soldier()
   field032FinancialInstitution()
   field112LossOfWorkCapacity()
   field046DonationsCredit()  ──► 35% of donations ≥ 180₪
   ... (+ 10 more)
        │
        ▼
src/lib/form-1301/schema.ts            (field.calculator → CalcResult)
        │
        ▼
src/components/form-1301/form-preview.tsx
        │
        ▼
<InteractiveValue> — click → tooltip with formula + sources
```

---

## שדות הכוכב של הדמו

| קוד | סעיף | מה זה | calculator |
|-----|------|-------|------------|
| **150** | ג. הכנסות מיגיעה אישית | הכנסה עיקרית מעסק | `field150BusinessIncome` |
| **238** | ז. נתונים נוספים | מחזור שנתי (ללא מע״מ) | `field238Turnover` |
| **294** | טו. מחזור למקדמות | זהה ל-238 — בדיקה | `field238Turnover` |
| **030** | יב. ניכויים | ביטוח לאומי עצמאי (52%) | `field030BituachLeumi` |
| **137** | יב. ניכויים | קרן השתלמות לעצמאי | `field137KerenHishtalmut` |
| **020** | יג. נקודות זיכוי | תושב/ת ישראל | `field020Resident` |
| **044** | יג. נקודות זיכוי | עולה חדש/ה (3 שנים) | `field044OlehHadash` |
| **068** | יג. נקודות זיכוי | חייל/ת משוחרר/ת (36 חודש) | `field068Soldier` |
| **046** | יד. תרומות | זיכוי 35% על תרומות ≥ 180₪ | `field046DonationsCredit` |
| **042** | יז. מקדמות | מקדמות ששולמו | `field042Mikdamot` |

---

## פרסונה ולוקאל סטורג׳

כל הנתונים חיים ב-`localStorage` (מפתח `countme_persona`). אין DB, אין auth — זה קונספט דמו.

```typescript
import { loadPersona, savePersona } from "@/lib/setup-storage";

const persona = loadPersona();   // null אם לא הוכנסו נתונים
savePersona(updatedPersona);
```

כדי להחליף פרסונה לצורכי פיתוח, ערוך `personas/dana-cohen.json` ועדכן את `defaultPersona` ב-`src/lib/persona.ts`.

---

## Eitan — סוכן ה-AI

`/api/coach` מחזיר SSE stream מ-Anthropic SDK עם prompt caching על ה-system prompt.

```typescript
// בקשה
POST /api/coach
{ message: string, history: Message[], persona?: Persona, mode?: "eitan" | "dashboard-insights" }

// תגובה — Server-Sent Events
data: {"token": "..."}
data: [DONE]
```

**Rate limit:** 12 בקשות / דקה / IP (middleware ב-route.ts).

**Modes:**
- `"eitan"` (default) — שיחה מלאה. איתן מזהה את הצורך (audit vs discover) ומגיב בהתאם.
- `"dashboard-insights"` — 2-3 תובנות קצרות על הנתונים הפיננסיים.

---

## חשבוניות — פורמט ישראלי

`/invoices/[invoiceNumber]` מציג חשבונית מס בפורמט חוקי עם `@media print` מלא — הדפסה ישירה מהדפדפן → PDF.

כללים ישראלים מיושמים:
- מספור רץ `YYYY-NNNN` (e.g. `2024-0042`)
- עוסק מורשה: מע״מ 17% + שורת מע״מ
- עוסק פטור: ״עוסק פטור — אין חיוב מע״מ״
- חשבונית > 5,000₪ → שדה ת.ז. / ח.פ. לקוח חובה
- (לצורכי דמו) חשבונית > 25,000₪ → מספר הקצאה mock

---

## טכנולוגיות

| שכבה | בחירה | סיבה |
|------|-------|------|
| Framework | Next.js 16 (App Router) | Latest, Vercel-native |
| React | React 19 | Server components + streaming |
| Styling | Tailwind CSS 4 (`@theme` tokens) | No config file; CSS-native tokens |
| Fonts | Heebo (body) + Rubik (display) | עברית מלאה |
| AI | Anthropic SDK (`claude-sonnet-4-6`) | Prompt caching, streaming |
| Charts | Recharts 3 | React-native, RTL-friendly |
| Excel parsing | exceljs | ללא CVE (במקום `xlsx`) |
| Hosting | Vercel | Free tier, auto-deploy |
| DB | — | לא מחובר עדיין (Supabase מתוכנן) |

---

## טוקני עיצוב (Tailwind 4)

```css
/* globals.css @theme */
--color-cream: #FAF0CA;        /* bg-cream   — רקע כללי */
--color-brand-navy: #0D3B66;   /* bg-brand-navy — CTA ראשי */
--color-success: #9FB878;      /* bg-success  — פעולות חיוביות */
--color-success-light: #D5E79E;
--color-alert: #80181D;        /* bg-alert    — אזהרות */
--color-info: #D2E8FF;         /* bg-info     — בועות AI */
```

**חשוב:** `src/components/form-1301/form-preview.tsx` משתמש בפאלטה של gov.il בלבד (hex hardcoded). לא לשנות — הדמו חייב להיראות כמו האתר האמיתי.

---

## קונבנציות פיתוח

```
claude/<short-name>   # ענפי AI-assisted
feat/<short-name>     # ענפי feature ידניים
fix/<description>     # תיקוני bug
```

לפני כל push:
```bash
npm run build    # חייב לעבור נקי
```

`.env.local` לא מועלה ל-git. משתנים חדשים → גם ב-`.env.template`.

---

## מי מפתח

- יוני — שותף טכנולוגי (AI, לוגיקה, כיוון מוצרי)  
- countme נבנה במסגרת **Momentum** — אקסלרטור סטודנטים ישראלי
