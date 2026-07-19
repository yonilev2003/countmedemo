# ספק בטא: איתן — הנציג הדיגיטלי + ארכיטקטורת עלויות AI

תאריך: 2026-07-19 · יעד: מוכן לבטא עד יום רביעי בערב 2026-07-22 (תומי מתחיל בטא אמיתי ביום חמישי 2026-07-23)
ענף: `claude/system-beta-preparation-oiyzpy` · בעלים ראשי: AI session · מסמך אחות: `docs/specs/beta/dashboard.md`, `docs/specs/beta/onboarding.md`

---

## מטרה

מימוש רכיב 3.4 בתוכנית האסטרטגית ("איתן — הנציג הדיגיטלי"): צ'אט זמין מכל מסך, שעונה על השאלות הנפוצות של עוסק פטור/מורשה/זעיר בשפה פשוטה ("מה זה מקדמות?" — תשובה של שלוש שורות שבן אדם מבין), יודע להגיד "אני לא יודע" ולהציע המשך עם בן אדם. הדגש הוא **בהירות יומיומית**, לא הדוח השנתי — הדוח 1301 והמחשבונים נשארים שכבה שקטה מאחורי איתן (evolution not rebuild).

במקביל, ארכיטקטורת עלויות AI מחדש לפי בקשת יוני: היום אין שום מדידת שימוש, רוב נקודות ה-cache לא עובדות בפועל (silent no-op), ולולאת הכלים מחייבת מחדש את כל ההיסטוריה והקבצים המצורפים בכל סבב. לפני שתומי מכניס משתמשים אמיתיים — חייבים לוגים, caching אמיתי, והורדת קריאות LLM מיותרות.

מדדי הצלחה (סעיף 3.7 בתוכנית): מספר שיחות למשתמש + אחוז שאלות שנענו ללא אסקלציה (יעד שנתי: מעל 50%). שני המדדים נמדדים דרך אירועי `coach_question_asked` / `coach_answer_escalated` הקיימים כבר ב-`src/lib/analytics/track.ts:22-24`.

---

## מה קיים היום (ממצאי קוד מאומתים)

### נקודות קריאה ל-Anthropic — 5 בדיוק

| # | קובץ | מודל | הערות |
|---|---|---|---|
| 1 | `src/app/api/coach/route.ts:305,348` | `claude-sonnet-4-6` | סטרימינג + לולאת כלים (`MAX_TOOL_ROUNDS = 4`, שורה 333 — עד 5 בקשות להודעה) |
| 2 | `src/app/api/chat/route.ts:139,164` | `claude-sonnet-4-6` | אותו דפוס, ל-`/demo` |
| 3 | `src/app/api/upload/route.ts:246,251` | `claude-haiku-4-5-20251001` | מזהה מודל מתוארך — שונה מיתר הקבצים; בלי `cache_control` בכלל |
| 4 | `src/app/api/parse-invoice/route.ts:105,109` | `claude-haiku-4-5` | alias בלי תאריך |
| 5 | `src/lib/regulatory/classify.ts:28,200,213` | `claude-sonnet-4-6` | המסווג הרגולטורי היומי, `CONCURRENCY = 3` (שורה 269) |

**אפס לוגים של usage** — אף אחת מ-5 הנקודות לא קוראת `response.usage` / `finalMessage().usage`. אין שום דרך לדעת כמה טוקנים נשרפים או אם ה-cache עובד.

### נקודות cache_control — רובן no-op שקט

מינימום prefix ל-cache (מתועד רשמית): **Sonnet 4.6 — 2,048 טוקנים; Haiku 4.5 — 4,096 טוקנים**. מתחת למינימום אין שגיאה — פשוט לא נוצר cache.

| מיקום | גודל נמדד | סטטוס |
|---|---|---|
| `coach/route.ts:312-318` — `SYSTEM_EITAN` | 5,865 בתים עברית ≈ 1,500–2,000 טוקנים (הערכה) | **גבולי/מתחת** ל-2,048 — כנראה no-op. לאמת ב-`count_tokens` (משימה EIT-13) |
| `coach/route.ts:322-328` — `buildRichContext` | ~700 טוקנים; ה-breakpoint מכסה גם את הבלוק שלפניו | גבולי; per-persona בכל מקרה |
| `coach/route.ts` במצב `dashboard-insights` — `SYSTEM_DASHBOARD_INSIGHTS` (שורות 91-97) | 857 בתים ≈ ~300 טוקנים | **no-op ודאי** |
| `chat/route.ts:145-148` — `SYSTEM_PROMPT` (825 בתים ≈ ~280 טוקנים) + context | בלוק 1 no-op ודאי; בלוק 2 גבולי | |
| `parse-invoice/route.ts:111-117` (1,881 בתים ≈ ~650 טוקנים, Haiku) | **לעולם לא יכול לפעול** — מינימום Haiku הוא 4,096 | להסיר או להשלים |
| `classify.ts:218-225` — instructions + קטלוג קבועים | תלוי בגודל הקטלוג; בנוסף, ריצה מקבילית (3 workers) על prefix זהה משלמת write מלא בכל ה-3 (ה-cache קריא רק אחרי שהתגובה הראשונה מתחילה לזרום) | |

### לולאת הכלים מחייבת הכל מחדש

ב-`coach/route.ts:346-396` (וזהה ב-`chat/route.ts:162-204`): כל סבב כלי שולח מחדש את **כל** ההיסטוריה + הקובץ המצורף (PDF/תמונה base64, עד 5MB — `coach/route.ts:271-295`) בלי אף `cache_control` ברמת messages. PDF של 10 עמודים (~20K טוקנים) בהודעה עם 2 סבבי כלים = ~60K טוקנים input במחיר מלא על קובץ אחד.

### הפרות "LLM לא מחשב" ב-SYSTEM_EITAN (`coach/route.ts:31-89`)

| שורות | ההפרה |
|---|---|
| 58 | משרד ביתי: "חלק יחסי... עד ~30%... **הוסף לחישוב**" — הנחיה למודל לעשות אריתמטיקה |
| 61-62 | תרומות: "מזכה ב-**35%** החזר מס... **חשב: תרמת X ₪ → זיכוי של X×0.35 ₪**" — גם קבוע מקודד וגם הוראת חישוב |
| 54 | "ביטוח לאומי **52%**" — קבוע מקודד בפרומפט |
| 67-74 | עוסק זעיר: "מחזור עד **120,000 ₪**" (שגוי מ-2026 — 122,833 לפי `TAX_YEAR_2026`), "אם expenses/revenue > 0.3 → ציין במספרים... בסכום Y" — השוואות וחישובים על המודל |
| 67 | "**תיקון 257** לפקודה" — סותר את הקטלוג ב-`calculators/types.ts` שמציין **תיקון 265** (`osekZeirExpenseRate`) — הדגמה חיה לסכנת עובדות מקודדות בפרומפט |
| 79 | "באיזה אחוז (100%, 80% טלפון, 45% רכב, 30% משרד ביתי)" — כל הקבועים מקודדים |

### רכיבי UI

- `src/components/agent/coach-chat.tsx` — הצ'אט המלא של איתן (avatar, קבצים, quick-replies). **פרסור SSE נכון** בשורות 251-297: buffer שורות + `JSON.parse` לכל delta + טיפול ב-`[DONE]`/`[ERROR]`. זה הדפוס להעתקה. ממונט רק ב-`src/app/coach/page.tsx:74`.
- `src/components/agent/chat-panel.tsx` — צ'אט ה-demo (`src/app/demo/page.tsx:129`), פרסור תקין גם כן.
- `src/components/dashboard/eitan-insights.tsx` — **באג**: שורות 55-63 מצברות את ה-`data` הגולמי **בלי `JSON.parse`**, בעוד השרת מקודד כל delta כ-JSON (`coach/route.ts:365`). התוצאה: התובנות מוצגות עם גרשיים ו-`\n` מוקלטרים. בנוסף `break` על `[DONE]` יוצא רק מהלולאה הפנימית. ממונט ב-`src/app/dashboard/page.tsx:498` — קריאת Sonnet מלאה בכל טעינת דשבורד.
- אין כפתור צ'אט צף — איתן נגיש רק מ-`/coach` ומ-`/demo`. סותר את "צ'אט זמין מכל מסך" (CEO 3.4).

### תשתית תומכת קיימת

- `src/lib/agent/tools.ts` — `EITAN_TOOLS` (4 כלים דטרמיניסטיים: `get_form_value`, `get_tax_estimate`, `get_upcoming_deadlines`, `get_ceiling_status`) + `runEitanTool` (שורות 142-192, לא זורק לעולם) + `buildRichContext` (שורות 56-99). כלי תרומות כבר קיים דרך `get_form_value("046")` (`FIELD_TO_CALCULATOR`, שורה 42).
- `src/lib/calculators/types.ts` — `getTaxYearConstants(year)` (שורה 517), `listTaxConstants()` (שורה 730), `TaxConstantEntry` (שורה 622). המקור היחיד המותר לקבועי מס.
- `src/lib/analytics/track.ts:37` — `track()` שרת אל טבלת `events` (migration `20260617091000_events.sql`), כולל כבר את שמות האירועים `coach_question_asked`, `coach_answer_escalated`. **לא צריך migration חדש לרכיב הזה.**
- `src/lib/security/rate-limit.ts` — 12 בקשות/דקה לכל client, in-memory per-instance בלבד (מתועד בשורות 8-19).

---

## מה בונים

### 1. בסיס ידע — 60–80 שאלות (CEO 3.4)

**מבנה: מודול TypeScript, לא YAML** (בלי תלות חדשה, type-safety, ו-import ישיר של הקבועים):

```
src/lib/eitan/knowledge/
├── types.ts        # הטיפוסים למטה
├── entries/        # קובץ לקטגוריה: vat.ts, income-tax.ts, bituach-leumi.ts,
│                   # expenses.ts, documents.ts, deadlines.ts, general.ts
├── index.ts        # מאחד + ולידציה בבנייה (ids ייחודיים, placeholders מוכרים)
└── render.ts       # renderCatalog(year) — סריאליזציה דטרמיניסטית
```

```ts
// src/lib/eitan/knowledge/types.ts
export type KnowledgeStatus = "draft" | "verified";
export type OsekAudience = "patur" | "morshe" | "zeir";
export type KnowledgeCategory =
  | "vat" | "income-tax" | "bituach-leumi" | "expenses"
  | "documents" | "deadlines" | "general";

export interface KnowledgeEntry {
  id: string;                    // "what-are-mikdamot"
  question: string;              // עברית, כפי שמשתמש שואל
  /** עברית, עד ~3 שורות. קבועים אך ורק כ-placeholders: {{osekPaturThreshold}}.
   *  אסור מספר-מס ליטרלי בטקסט — נאכף בבדיקת יחידה. */
  answerTemplate: string;
  audience: OsekAudience[];      // למי רלוונטי
  category: KnowledgeCategory;
  keywords: string[];            // לעתיד (retrieval); לא בשימוש ב-v1
  formFields?: string[];         // קודי 1301 קשורים, אם יש
  sourceSkill: string;           // "israeli-tax-returns" / "israeli-vat-reporting" / ...
  status: KnowledgeStatus;       // "draft" עד אימות רועי — חוסם הצגה כעובדה מאומתת
  verifiedAt?: string;           // ISO date
}
```

**הזרקת קבועים ב-runtime:** `renderCatalog(year)` ממלא כל `{{key}}` מ-`getTaxYearConstants(year)` (ומ-`getDeductionsTable(year)` עבור אחוזי הכרה) — **אפס ליטרלים**. סריאליזציה יציבה לטובת ה-cache: מיון לפי `id`, מספרים מעוגלים דרך `ils()` מ-`lib/utils`, בלי `Date.now()`, בלי איטרציה על `Set`/`Object.keys` לא ממוין. בדיקת יחידה: `renderCatalog(2025)` מחזיר מחרוזת זהה בייטית בשתי קריאות.

**איך איתן משתמש בו — קטלוג קומפקטי בתוך system prompt עם cache (ההמלצה):**
- כל הקטלוג המרונדר (60–80 שאלות × ~3 שורות ≈ 6–10K טוקנים) נכנס כבלוק system שני, אחרי `SYSTEM_EITAN` המקוצץ.
- יתרון כפול: (א) אפס לוגיקת retrieval ואפס סיכון פספוס; (ב) **מעבה את ה-prefix הרבה מעבר למינימום 2,048** — ה-cache מתחיל סוף-סוף לעבוד. קריאת cache עולה 0.1× — הקטלוג כמעט חינם מהבקשה השנייה.
- Retrieval לפי keywords בצד שרת — נדחה במפורש: בקנה מידה של 50–100 משתמשי בטא אין הצדקה, וזה שובר יציבות prefix (קטלוג משתנה לכל בקשה = ביטול cache). לשקול מחדש רק אם הקטלוג יעבור ~15K טוקנים.
- כללי שימוש בפרומפט: "כשיש תשובה בקטלוג — ענה לפיה, בסגנון שלך, בלי להוסיף עובדות. כשאין — אמור שאין לך תשובה מאומתת והפעל את מנגנון האסקלציה (סעיף 3)."
- ערכים עם `status: "draft"` מרונדרים עם סימון פנימי שמנחה את איתן להצמיד את נוסח ה-disclaimer (סעיף 2).

**מקור התוכן:** טיוטות מה-skills `israeli-tax-returns`, `israeli-vat-reporting`, `israeli-bituach-leumi`, `israeli-freelancer-ops`, `israeli-expense-categorizer`, `israeli-e-invoice`. כל תשובה נולדת `draft`; רק רועי מעביר ל-`verified` (עם תאריך). אין עורך דין — כל ניסוח משפטי-כלכלי מסומן DRAFT ונכנס לרשימת הפערים בסוף פלט הסשן (נוהל קיים).

**12 השאלות הראשונות (סדר עדיפות לבטא, לפני היעד המלא של 60–80):**

1. מה זה מקדמות מס הכנסה ולמה מבקשים ממני לשלם באמצע השנה?
2. מה ההבדל בין עוסק פטור, עוסק מורשה ועוסק זעיר?
3. מה זה מע"מ ומי מדווח? (פטור לא גובה; מורשה 18%)
4. מתי מדווחים מע"מ — חודשי/דו-חודשי, ומה קורה אם מאחרים?
5. מה זה ביטוח לאומי לעצמאי וכמה משלמים?
6. אילו הוצאות מוכרות לי? (עקרון ייצור הכנסה + הפניה ל-`/business-expenses`)
7. מה ההבדל בין חשבונית עסקה, חשבונית מס וקבלה, ומתי מוציאים כל אחת?
8. מה קורה אם אני עובר את תקרת עוסק פטור ({{osekPaturThreshold}})?
9. מה זה מסלול עוסק זעיר ומה ההכרה האוטומטית של {{osekZeirExpenseRate}}?
10. מתי מגישים דוח שנתי ומה קורה אם מאחרים?
11. מה זה נקודות זיכוי וכמה שווה נקודה ({{pointValueAnnual}})?
12. מה זה קרן השתלמות לעצמאי ומה התקרה ({{kerenHishtalmutCap}})?

### 2. טון ואישיות + disclaimer

**מה כבר מקובע ב-`SYSTEM_EITAN` (שורות 34-38, 88-89) — נשמר:** אח חכם בגובה העיניים; עברית בלבד; גוף שני נקבה כברירת מחדל עם מעבר לזכר כשידוע; בלי markdown; שאלה אחת בכל פעם; "עובדות, לא ייעוץ" עם רשימת המילים האסורות (מומלץ/כדאי/עדיף/צריך/רצוי/שווה); הפניה חמה לאיש מקצוע בנושאי שיקול דעת.

**הפערים — מסמך טון לתומי (`docs/eitan/tone.md`, ה-AI מכין שלד, תומי ממלא):**
- איך איתן פותח: 3 נוסחי פתיחה לפי הקשר (דשבורד / מסמכים / שאלה כללית), עד שורה, בלי "שלום, אני עוזר וירטואלי".
- איך איתן מודה שאינו יודע: נוסח קבוע, בלי התנצלות מוגזמת. כיוון: "על זה אין לי תשובה מאומתת, ואני לא מנחש במספרים."
- מתי ואיך מפנה לבן אדם: הנוסח שמלווה את האסקלציה (סעיף 3).
- אורך: ברירת מחדל עד 3 שורות (CEO 3.4); פירוט רק כשמבקשים.
- **Disclaimer שלא הורס את החוויה (DRAFT — טעון אישור):** לא באנר קבוע ולא פסקה משפטית בכל תשובה. כיוון מוצע: משפט אחד, פעם אחת בתחילת שיחה ראשונה + הצמדה נקודתית לתשובות `draft` בלבד: "אני מסביר ומכווין — זה לא ייעוץ מס מחייב." שאר הזמן — שקט. הנוסח הסופי של תומי, מסומן `DRAFT — NEEDS LEGAL REVIEW` כמו כל עותק משפטי בפרויקט.

### 3. מנגנון אסקלציה v1

בלי מערכת טיקטים בבטא. הזרימה:

1. איתן מזהה שאין תשובה (אין ערך בקטלוג, אין כלי רלוונטי, או נושא מוחרג — מס שבח, סיווג חריג, ביקורת) → אומר את נוסח "אני לא יודע" מהמסמך של תומי.
2. קורא לכלי חדש `escalate_to_human` (מתווסף ל-`EITAN_TOOLS` ב-`src/lib/agent/tools.ts`):

```ts
{
  name: "escalate_to_human",
  description: "כשאין לך תשובה מאומתת או שהנושא דורש איש מקצוע — קרא לכלי הזה. הוא מתעד את הפנייה ומחזיר את פרטי ההמשך האנושי להצגה למשתמש/ת.",
  input_schema: { type: "object", properties: {
    topic: { type: "string" },       // נושא בקצרה
    question: { type: "string" },    // השאלה המקורית
  }, required: ["topic", "question"] },
}
```

3. השרת (`runEitanTool` הופך async או מקבל callback): `track("coach_answer_escalated", { topic, question: question.slice(0, 200) })` — האירוע קיים כבר ב-`EventName`. ה-tool result מחזיר `{ ok: true, contactHe: "..." }` עם שורת יצירת קשר (ערוץ + כתובת — החלטת יוני, נשמר כקבוע `EITAN_ESCALATION_CONTACT_HE` במודול config, לא env של קופי).
4. איתן מציג את שורת הקשר כטקסט רגיל. בלי UI חדש ב-v1.
5. מדידה: אחוז אסקלציות = `coach_answer_escalated` / `coach_question_asked` — נכנס לסקירת הבטא של תומי.

### 4. תיקון הפרות "LLM לא מחשב"

- **מסירים מ-`SYSTEM_EITAN`** את כל הוראות האריתמטיקה והקבועים (הטבלה למעלה): חישוב תרומות ×0.35, השוואת 30% עוסק זעיר, "הוסף לחישוב" של משרד ביתי, וכל אחוז/סכום ליטרלי (52%, 35%, 120,000, 45/80/30/100%).
- **בלוק קבועים דטרמיניסטי חדש** `buildConstantsContext(year)` (ב-`src/lib/agent/tools.ts` או מודול נלווה): טבלת עובדות מרונדרת מ-`getTaxYearConstants(year)` + `getDeductionsTable(year)` — תקרות, שיעורים, אחוזי הכרה לפי קטגוריה — בסריאליזציה יציבה (אותם כללים כמו `renderCatalog`). הפרומפט מפנה אליו: "כל מספר — מהבלוק הזה או מכלי. אסור להמציא או לחשב."
- **כלים דטרמיניסטיים חדשים ב-`EITAN_TOOLS`:**
  - `compute_deductible_amount({ amount, category })` — מכפיל בשיעור ההכרה מ-`getDeductionsTable(year)` ומחזיר `{ recognized, rate, ruleHe }`. מחליף את חישובי ה-35%/80%/45% שהמודל התבקש לעשות.
  - `get_zeir_track_comparison()` — מחשב `0.30 × turnover` מול `totalDeductibleExpenses` מהפרסונה ומחזיר את שני המספרים + ההפרש, בלי המלצה (הצגת העובדות נשארת אצל איתן לפי כללי "עובדות, לא עצות").
  - תרומות: נשאר `get_form_value("046")` הקיים.
- כללי הפרשנות והטון (מבחן ייצור הכנסה, ביגוד, "אל תפסוק") — נשארים בפרומפט; הם שיפוט, לא חישוב.
- אותו טיפול ל-`chat/route.ts` (ה-`SYSTEM_PROMPT` שם נקי מחישובים — רק מוודאים שהבלוק החדש מוזרק גם שם).

### 5. ארכיטקטורת עלויות (הבקשה של יוני)

**5א. לוג usage בכל 5 הנקודות** — `src/lib/ai/usage.ts`:

```ts
export interface AiUsageLog {
  tag: "ai-usage";                       // לסינון ב-Vercel logs
  route: "coach" | "chat" | "upload" | "parse-invoice" | "regulatory-classify";
  model: string;
  round: number;                          // סבב בלולאת כלים; 0 לקריאה בודדת
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  stopReason: string | null;
}
export function logAiUsage(entry: Omit<AiUsageLog, "tag">): void; // console.log(JSON.stringify(...)) → Vercel logs
```

בלולאות הסטרימינג — אחרי `await anthropicStream.finalMessage()` בכל סבב (`coach/route.ts:369`, `chat/route.ts:181`); ב-upload/parse-invoice — אחרי ה-`create`; ב-classify — לכל פריט + סיכום ריצה. זה הבסיס לכל החלטת עלות עתידית (כולל השוואת Sonnet 5).

**5ב. מזהי מודל מאוחדים** — `src/lib/ai/models.ts`:

```ts
export const MODEL_CHAT = "claude-sonnet-4-6";  // צ'אט: איתן + demo + מסווג (בינתיים)
export const MODEL_FAST = "claude-haiku-4-5";   // פרסינג: upload, parse-invoice
```

מחליף את המחרוזת המתוארכת `claude-haiku-4-5-20251001` ב-`upload/route.ts:251` (אותו מודל — ה-alias רשמי) ואת כל שאר הליטרלים. הוספה ל-CLAUDE.md אחרי המיזוג.

**5ג. פריסת cache חדשה ל-`/api/coach` (ו-`/api/chat` באותו דפוס):**

```
system = [
  SYSTEM_EITAN (מקוצץ, יציב)                          — בלי breakpoint
  renderCatalog(year)  (יציב לשנה)                     — בלי breakpoint
  buildConstantsContext(year) (יציב לשנה)              — cache_control  ← A: prefix חוצה-משתמשים
  buildRichContext(persona) (per-user, יציב תוך-יום)   — cache_control  ← B: per-user
]
messages: cache_control על בלוק התוכן האחרון של ההודעה האחרונה  ← C: לולאת כלים + היסטוריה
```

3 breakpoints מתוך 4 מותרים. A מבטיח שכל המשתמשים חולקים prefix מעל 2,048 (בזכות הקטלוג — ~8-10K טוקנים); B מנצל בין הודעות של אותו משתמש; C הוא התיקון ללולאת הכלים — הקובץ המצורף וההיסטוריה נכתבים ל-cache בסבב הראשון ונקראים ב-0.1× בסבבים הבאים ובהודעות הבאות. מימוש: helper `withMessageCacheBreakpoint(messages)` שמסמן רק את ההודעה האחרונה בכל בקשה.

**5ד. תובנות דשבורד → תבנית דטרמיניסטית (ראשי), הסרת נתיב ה-LLM:**

```ts
// src/lib/eitan/insights.ts — אפס LLM, אפס עלות, אפס latency
export interface EitanInsight { kind: "ceiling" | "deadline" | "ratio" | "gap"; text: string }
export function buildInsights(persona: Persona, pl: PLSummary): EitanInsight[]; // 2–3 לפי עדיפות
```

חוקים (עובדות בלבד, מספרים מ-calculators בלבד): תקרה ≥ 70% → משפט מ-`computeCeilingAlert`; דדליין ≤ 14 יום → מ-`getUpcomingDeadlines`; יחס הוצאות/הכנסות עובדתי מ-`pl`; אין הפקדות קרן השתלמות מתועדות → משפט עובדתי. `eitan-insights.tsx` הופך לרינדור סינכרוני (בלי fetch, בלי skeleton), ומצב `dashboard-insights` נמחק מ-`coach/route.ts` (כולל `SYSTEM_DASHBOARD_INSIGHTS`). זה גם מייתר את באג הפרסור — אבל תיקון ה-`JSON.parse` נעשה בכל מקרה ביום 1 כביטוח, ליום-יומיים שבהם הרכיב הישן עוד חי.

**5ה. המסווג הרגולטורי → Haiku + Batch API (היגיינה, לא חוסם בטא):** ריצה יומית לא רגישת-latency ⇒ `messages.batches.create` עם `custom_id` לכל פריט, polling עד `ended` — 50% הנחה, ופותר גם את בעיית ה-write המקבילי (CONCURRENCY=3 על prefix זהה). מודל → `MODEL_FAST`; שומרים את `CLASSIFY_TOOL` + `tool_choice` הכפוי (הפלט המובנה ממשיך לעבוד). fallback: אם ה-batch נכשל — הנתיב הסינכרוני הקיים. פריטי confidence נמוך ממילא נופלים לסקירה אנושית, כך שסיכון האיכות תחום.

**5ו. החלטת מודל:** נשארים על **Sonnet 4.6 לצ'אט** ($3/$15 למיליון) ו-**Haiku 4.5 לפרסינג** ($1/$5). Sonnet 5: מחיר היכרות $2/$10 עד 2026-08-31 — מפתה, אבל טוקנייזר חדש (~+30% טוקנים שאוכל את רוב ההנחה), adaptive thinking כברירת מחדל (latency + טוקני פלט), ודורש כוונון מחדש של כל הפרומפטים — לא בספרינט של 3 ימים. להחליט מחדש אחרי הבטא, עם נתוני 5א ביד.

**5ז. אומדן עלות למשתמש/יום (גס — לאימות ב-EIT-13):**

הנחות: 8 הודעות לאיתן/יום, ממוצע 1.5 סבבי כלים, היסטוריה ~2K טוקנים, פלט ~300/הודעה; 4 ביקורי דשבורד; בלי קבצים מצורפים.

| רכיב | היום | אחרי |
|---|---|---|
| צ'אט איתן | ‎~$0.25–0.35 (הכל input במחיר מלא, כל סבב מחדש) | ‎~$0.10–0.13 (prefix ב-0.1×, היסטוריה ב-cache) |
| תובנות דשבורד | ‎~$0.04 | ‎$0 (דטרמיניסטי) |
| הודעה עם PDF (10 עמ') | ‎+$0.15 להודעה | ‎+$0.05–0.07 |
| **סה"כ טיפוסי** | **‎~$0.30–0.45** | **‎~$0.10–0.15** |

ב-100 משתמשי בטא: ~$30–45/יום → ~$10–15/יום. חיסכון ~65%. המסווג: ~$1–2/יום ארגוני → ~$0.2 עם Haiku+Batch.

### 6. צ'אט זמין מכל מסך — Eitan FAB

`src/components/agent/eitan-fab.tsx` — **mobile-first**:

- כפתור צף `fixed bottom-4 end-4 z-50` (לוגיים בלבד — RTL), עיגול `size-14`, `bg-brand-navy`, בתוכו `EitanAvatar` (ה-fallback ל-`LogoMark` כבר קיים ב-`coach-chat.tsx:29-53` — לחלץ לקומפוננטה משותפת `src/components/agent/eitan-avatar.tsx`). `aria-label="פתח שיחה עם איתן"`. בלי אימוג'י, כפתורים דרך `btn()` בלבד בתוך הפאנל.
- מובייל (ברירת המחדל): לחיצה פותחת overlay מסך-מלא (`fixed inset-0`) עם `<CoachChat persona={persona} />` וכפתור סגירה; נעילת scroll לרקע. דסקטופ (`md:`): פאנל צד `md:inset-y-0 md:end-0 md:w-[420px]` — enhancement.
- אנימציית פתיחה רק דרך `src/components/brand/motion.tsx` (reduced-motion-aware) או ללא אנימציה.
- `CoachChat` נשאר כמות שהוא (מקבל `persona` — `coach-chat.tsx:111-116`); שינוי יחיד: prop אופציונלי `onClose` לכותרת.
- מיקום מונטאז': הדשבורד החדש ומסכי המסמכים (בתיאום עם `dashboard.md` — ה-FAB בבעלות הספק הזה, נקודות המונטאז' בבעלות ספקי המסכים). לא ב-`/demo` (יש `ChatPanel`) ולא ב-`/coach` (הוא עצמו הצ'אט).
- מדידה: `trackClient("coach_question_asked", { source: "fab" })` בפתיחה ראשונה של שיחה.

---

## מה במפורש לא בבטא (נדחה לפי מפת הדרכים)

| מה | למה נדחה | שלב |
|---|---|---|
| הקלטה קולית בצ'אט (mic פעיל) | CEO §5 — עיצוב מחדש; ה-mic ב-`coach-chat.tsx:611-620` נשאר ללא handler | שלב 2 |
| התראות פרואקטיביות מאיתן | CEO §4 — "התראות חכמות ראשונות" אחרי פידבק | שלב 2 |
| מערכת טיקטים / inbox לאסקלציות | v1 = לוג + שורת קשר; בונים לפי נפח אמיתי | שלב 2 |
| Retrieval/embeddings לבסיס הידע | קטלוג ב-prompt מספיק ל-60–80; לשקול מעל ~15K טוקנים | שלב 2-3 |
| דירוג שביעות רצון בצ'אט (יעד 4.5) | נמדד בראיונות העומק של הבטא (CEO 3.7); UI דירוג אחר כך | שלב 2 |
| שמירת שיחות ב-Supabase | פתוח PII minimization (סעיף 3 ב"מה פתוח"); היסטוריה נשארת client-side | שלב 2 |
| מעבר ל-Sonnet 5 | סעיף 5ו — החלטה אחרי הבטא עם נתוני usage | אחרי בטא |
| מדריך מעבר לעוסק זעיר אינטראקטיבי | CEO שלב 2 במפורש | שלב 2 |
| השלמת 80 השאלות המלאות | 12 מאומתות עד רביעי; היתר נכנסות תוך כדי הבטא בקצב אימות רועי | שוטף |

---

## פירוק משימות

| ID | משימה | שעות | בעלים | תלויות | DoD |
|---|---|---|---|---|---|
| EIT-1 | תיקון פרסור SSE ב-`eitan-insights.tsx` (יום 1, ביטוח) | 0.5 | ai | — | תובנות מוצגות בלי גרשיים/‏`\n` מוקלטרים; `JSON.parse` לכל delta כמו `coach-chat.tsx:288-296` |
| EIT-2 | `src/lib/ai/models.ts` + החלפת 5 הליטרלים | 1 | ai | — | `grep "claude-" src/` מחזיר מופעים רק ב-`models.ts`; build ירוק |
| EIT-3 | `src/lib/ai/usage.ts` + חיווט ב-5 הנקודות | 3 | ai | EIT-2 | כל קריאת Anthropic מדפיסה שורת `{"tag":"ai-usage",...}` עם 4 שדות ה-cache; נצפה ב-Vercel logs בסביבת preview |
| EIT-4 | ניקוי SYSTEM_EITAN מחישובים + `buildConstantsContext(year)` + כלים `compute_deductible_amount`, `get_zeir_track_comparison` | 6 | ai | — | אפס ספרות-מס ליטרליות ב-route (בדיקת יחידה); הכלים מחזירים ערכים זהים ל-`getDeductionsTable`; תרחישי תרומות/זעיר/משרד-ביתי עוברים דרך כלים (בדיקה ידנית מתועדת) |
| EIT-5 | שלד בסיס ידע (`types.ts`, `render.ts`, ולידציה) + 12 השאלות הראשונות כ-draft | 8 | ai | — | `renderCatalog(2025)` דטרמיניסטי (בדיקת יחידה בייטית); 12 ערכים עם placeholders בלבד; בדיקה שאין ליטרל מספרי בתבניות |
| EIT-6 | אימות רועי ל-12 הראשונות → `status: "verified"` | 4 | roy | EIT-5 | כל ערך מאומת מול המקור, `verifiedAt` מולא; אי-התאמות (כמו תיקון 257/265) הוכרעו |
| EIT-7 | שילוב הקטלוג + פריסת cache חדשה (A/B/C) בשני ה-routes | 4 | ai | EIT-4, EIT-5 | `cache_read_input_tokens > 0` מהבקשה השנייה באותה שיחה (נמדד דרך EIT-3); `count_tokens` על ה-prefix ≥ 2,048 |
| EIT-8 | breakpoint ברמת messages בלולאות הכלים (`withMessageCacheBreakpoint`) | 2 | ai | EIT-7 | בהודעה עם PDF + סבב כלים: הסבב השני מציג `cache_read` בגובה הקובץ; סה"כ ≤ 4 breakpoints |
| EIT-9 | `src/lib/eitan/insights.ts` דטרמיניסטי + החלפת הרכיב + מחיקת מצב `dashboard-insights` | 4 | ai | EIT-1 | דשבורד מציג 2–3 תובנות בלי קריאת רשת ל-`/api/coach`; בדיקות יחידה לחוקי העדיפות; `SYSTEM_DASHBOARD_INSIGHTS` נמחק |
| EIT-10 | אסקלציה v1: כלי `escalate_to_human` + `track("coach_answer_escalated")` + שורת קשר | 4 | ai | EIT-4, החלטת ערוץ מיוני | שאלה מחוץ לקטלוג מפעילה את הכלי; אירוע נרשם ב-`events`; המשתמש רואה נוסח "לא יודע" + פרטי קשר |
| EIT-11 | מסמך טון `docs/eitan/tone.md`: שלד (ai) + מילוי (תומי) + נוסח disclaimer DRAFT | 2+4 | tomi | — | פתיחות/הודאה-באי-ידיעה/אסקלציה/disclaimer סגורים; הנוסחים שולבו ב-SYSTEM_EITAN וב-EIT-10; כל קופי משפטי מסומן DRAFT |
| EIT-12 | `eitan-fab.tsx` + `eitan-avatar.tsx` משותף + מונטאז' בדשבורד/מסמכים | 5 | ai | תיאום עם dashboard.md | FAB נראה ועובד במובייל 360px (מסך מלא) ובדסקטופ (פאנל צד); logical properties בלבד; אפס אימוג'י; `btn()` בלבד |
| EIT-13 | אימות עלויות: `count_tokens` על ה-prefix, צילום usage לפני/אחרי, עדכון טבלת 5ז | 2 | ai | EIT-3, EIT-7, EIT-8 | טבלת לפני/אחרי אמיתית ב-PR; אישור `cache_read > 0` בכל נתיב צ'אט |
| EIT-14 | מסווג רגולטורי → Haiku + Batch API (היגיינה — מותר להחליק אחרי רביעי) | 4 | ai | EIT-2, EIT-3 | הריצה היומית עוברת batch; עלות ריצה נרשמת; fallback סינכרוני נבדק |
| EIT-15 | השלמה ל-60–80 שאלות (מקביל לבטא, בקצב אימות רועי) | 10 | ai | EIT-5, EIT-6 | כל שבוע נכנסות ≥ 15 שאלות מאומתות; קטלוג נשאר ≤ ~12K טוקנים |

סדר מומלץ: יום א' (19.7) EIT-1..3 + תחילת EIT-4/5 · יום ב' EIT-4/5 + שלד EIT-11 לתומי + EIT-9 · יום ג' EIT-7/8 + EIT-10 + EIT-6 (רועי) + EIT-12 · יום ד' EIT-13 + באפר + בדיקות E2E. סה"כ ai ≈ 39.5 ש' (בלי EIT-14/15 שמותר להן להחליק).

---

## סיכונים

1. **קיבולת רועי היא צוואר הבקבוק של הידע** — בלי EIT-6 עד יום ג', 12 השאלות עולות לבטא כ-draft עם disclaimer צמוד. מוטיגציה: המשימה קטנה (12 ערכים × ~3 שורות), וה-fallback המוגדר הוא "עולה כ-draft" — לא חסימה.
2. **אין רשת ביטחון תקציבית אמיתית** — rate limit הוא in-memory per-instance (`rate-limit.ts:8-19`), `AUTH_GATING_ENABLED` עדיין כבוי, ואין התראת תקציב Anthropic (פריטים פתוחים 1, 6 ב-CLAUDE.md). משתמש זדוני יכול לשרוף תקציב לפני שהלוגים של EIT-3 בכלל ייקראו. תלוי ביוני — מחוץ לסקופ הרכיב אבל חוסם בטא בפועל.
3. **קופי משפטי בלי עורך דין** — ה-disclaimer, נוסחי הידע והאסקלציה כולם DRAFT. מוטיגציה קיימת: סימון DRAFT + רשימת פערים מובנית בסוף כל פלט סשן; החשיפה נשארת עד סקירה חיצונית.
4. **שבירות cache שקטה** — כל שינוי בייט ב-prefix (עריכת פרומפט, ערך לא דטרמיניסטי שמתגנב ל-render) מאפס את החיסכון בלי שגיאה. מוטיגציה: בדיקת היחידה הבייטית על `renderCatalog`, ולוג EIT-3 שהופך cache_read=0 לגלוי מיד.
5. **רגרסיית איכות במסווג על Haiku** — תחום: tool_choice כפוי + confidence נמוך ממילא הולך לסקירה אנושית + fallback ל-flow הקיים; ואפשר לדחות את EIT-14 כולו אחרי הבטא.
6. **התנהגות איתן אחרי ניתוח הפרומפט** — הסרת הוראות החישוב עלולה לגרום לו לסרב לענות על שאלות חישוביות במקום לקרוא לכלי. מוטיגציה: תרחישי הבדיקה הידניים ב-EIT-4 (תרומות, זעיר, משרד ביתי, קבלה מצורפת) הם חלק מה-DoD.
7. **עומס טוקנים מהקטלוג בכתיבה קרה** — write ראשון של ~10K טוקנים עולה 1.25×; ב-traffic דליל (בטא) ייתכנו writes תכופים. מקובל בקנה המידה הזה; אם יכאב — TTL של שעה (write 2×, כדאי מעל 3 קריאות).

---

## מה צריך מהצוות

- **יוני:** (1) החלטה על ערוץ הקשר לאסקלציה — כתובת מייל ייעודית או מספר וואטסאפ, עד יום ב' (חוסם EIT-10); (2) הפעלת התראת תקציב ב-Anthropic Console + חוק rate-limit ב-Vercel WAF לפני יום חמישי (סיכון 2); (3) אישור ההמלצה להישאר על Sonnet 4.6 לבטא; (4) החלטת עיתוי `AUTH_GATING_ENABLED=true`.
- **תומי:** (1) מילוי מסמך הטון — פתיחות, נוסח "לא יודע", נוסח אסקלציה, נוסח disclaimer — עד יום ג' (חוסם EIT-10/11); (2) סדר עדיפויות ל-15 השאלות הבאות אחרי ה-12 (מהשטח — מה שואלים בפועל); (3) בדיקת חוויית ה-FAB במובייל אמיתי לפני חמישי.
- **רועי:** (1) אימות 12 תשובות הידע (EIT-6) עד יום ג' — כולל הכרעת תיקון 257/265 לעוסק זעיר; (2) המשך burn-down של `FLAG(Roy)` ב-`lib/calculators/types.ts` (תקרות פנסיה 2025/2026, רצפת תרומות 2026) — הקבועים האלה מוזרקים ישירות לתשובות איתן; (3) קצב אימות שוטף של ~15 שאלות/שבוע ל-EIT-15.
