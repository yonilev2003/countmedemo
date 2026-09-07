---
title: "ארכיטקטורת ה-RAG של שקל + רעיון לפטנט: Jurisdiction Packs"
date: 2026-09-07
type: spec
status: draft
related: "memory/decisions.md (RAG = Claude-native; graphify; 4-tier confidence) · memory/risk-gap.md §7-9"
---

# ארכיטקטורת ה-RAG של שקל — ומה בה יכול להיות פטנט ובסיס למדינות אחרות (IRS)

> נכתב 07/09/2026 לבקשת יוני. חלק 1 מתאר **מה קיים בפועל בקוד** (מאומת מול הקבצים, לא מהזיכרון).
> חלק 2 הוא הרעיון-לפטנט. חלק 3 — איך אותו רעיון מתורגם ל-IRS. חלק 4 — הסתייגויות כנות.

## 1. מה יש לנו היום — "RAG בלי מספרים" עם עיגון דטרמיניסטי

הדבר הלא-שגרתי בארכיטקטורה שלנו הוא לא ה-retrieval עצמו (pg_trgm + FTS זה סטנדרטי) אלא
**החלוקה הקשיחה של סמכות**: המודל מותר לו להסביר ולנתב; **רק מנוע דטרמיניסטי מייצר מספר**.

```
knowledge/**/*.md  (Obsidian, 66 רשומות, 7 תחומים, עברית)
   │  כלל-ברזל: אפס מספרים ברשומות — "תקרת עוסק פטור (ראו שדה 238)" ולא "120,000 ₪"
   ▼
scripts/index-knowledge.mjs — חיתוך לפי H2 (id = "{note}#{slug}"), חילוץ [[wikilinks]]
   ▼
public.knowledge_chunks (id, note_path, title, topic, tags[], form_fields[], year_sensitive, body, links[])
   GIN pg_trgm על title||body  +  GIN to_tsvector('simple') — 'simple' בכוונה: אין stemming אנגלי שמשבש עברית
   RLS deny-all; רק service_role
   ▼
search_knowledge_chunks(p_query, p_limit=8) — ציון היברידי:
   ts_rank(OR-tsquery) + word_similarity(title,q)×2 + similarity(title||body, q)
   + הרחבה-של-קפיצה-אחת דרך links / form_fields בציון קבוע 0.01 (ממלאת רק מקומות פנויים)
   ▼
כלים למודל: search_knowledge (→ {id,title,snippet}) · read_knowledge (עד 4 ids → body מלא)
   + toc.generated.json כבלוק system עם cache_control (TOC של כל הרשומות — "מה בכלל קיים")
   ▼
צד דטרמיניסטי (הסמכות היחידה למספרים):
   get_form_value(field) → FIELD_TO_CALCULATOR → lib/calculators (פונקציות טהורות על Persona)
   get_tax_estimate · get_upcoming_deadlines · get_ceiling_status
   renderEitanConstants(year) — טבלת-קבועים לשנה, byte-stable, מוזרקת ל-system prompt
   client-graph.ts — גרף דטרמיניסטי מהפרסונה (customer/document/vendor/expense/category/deadline)
      → top_customers · expense_breakdown_by_category · open_receivables_by_customer
   ▼
Guardrails בפרומפט: "אתה לא מחשב — אף פעם"; מחוץ-לכיסוי → "מערכת חדשה, ייתכן שחסר לי", לא ניחוש
```

**שכבת-הפרובננס (החלק השני הלא-שגרתי):** כל קבוע ב-`lib/calculators/types.ts` נושא הערת-מקור
+ תאריך-אימות + רמת-ודאות; מ-06/09 יש מתודולוגיה נעולה של 4 דרגות (CONFIRMED / STRONGLY-SUPPORTED
/ UNVERIFIED / REFUTED) שקובעת מה מותר להציג כעובדה; `TAX_CONSTANT_META` + `scripts/regulatory-watch/`
מנסים לזהות שינוי-רגולטורי ולהציע patch כ-diff לביקורת-אדם (לעולם לא merge אוטומטי).

**שלושה פערים אמיתיים במצב הנוכחי (מאומתים בקוד):**
1. שתי מיגרציות ה-knowledge (`20260818100000`, `20260818110000`) **כתובות אך לא הוחלו על hbsgz** —
   `probeKnowledgeAvailable()` מזהה זאת ומוריד את הכלים; כלומר ה-retrieval הטקסטואלי **לא חי היום**.
2. ה-TOC-בקאש מוזרק רק ב-`/api/chat`, **לא** ב-`/api/coach` (שקל) — שקל מקבל את הקטלוג הסטטי הישן
   (`EITAN_KNOWLEDGE`, 12 Q&A) במקום את הכספת.
3. הגנת-"אפס מספרים" ברשומות היא **נוהל, לא lint** — אין בדיקה אוטומטית באינדוקס שרשומה לא מכילה ₪/%.

## 2. הרעיון לפטנט — "Numberless Retrieval with Deterministic, Provenance-Tiered Grounding"

**הבעיה שכולם פותרים גרוע:** LLM על מסמכי-מס מייצר מספרים שנראים סמכותיים ומתיישנים/מהוזים.
כל פתרון-RAG רגיל שם את המספרים *בתוך* הקורפוס ומקווה שה-retrieval יביא את הגרסה הנכונה.

**הטענה המרכזית (system claim):** מערכת להנחיית-מס שבה —
1. **קורפוס-ידע "נטול-כמויות" באכיפה**: בזמן-אינדוקס, כל צ'אנק עובר מסנן שדוחה פרמטרים מספריים
   של מס (סכומים, אחוזים, ספים, תאריכי-תחולה) ומחליף אותם ב-**הפניה סמלית** לישות במנוע
   (`{calculator:"field-238"}`, `{constant:"osekPaturThreshold"}`). הרשומה מסבירה *מה* ו*למה*; לעולם לא *כמה*.
2. **מנוע דטרמיניסטי ממוענן לפי (jurisdiction, tax_year)**: כל כמות נובעת מפונקציה טהורה על
   מודל-נתונים של הנישום/ה + רג'יסטרי-קבועים שנתי. המודל-הלשוני נגיש למנוע דרך כלים בלבד.
3. **פרובננס דרגתי שזורם קדימה**: לכל קבוע מצורפים מקור, תאריך-אימות ודרגת-ודאות; הדרגה
   **מתפשטת** דרך המחשבון אל התוצאה (`confidence` על כל `CalcResult`) ואל שכבת-התצוגה, שבה
   **פעולות בעלות-השלכה (העתקה לטופס הרשמי, הגשה) חסומות/מסויגות מתחת לדרגה מוגדרת**.
4. **לולאת-משמר-רגולציה**: תהליך שמשווה מקורות רשמיים מול הרג'יסטרי ומייצר הצעת-שינוי כ-diff
   מבוקר-אדם; שינוי מאושר מעדכן קבוע יחיד — וכל הרשומות שמפנות אליו סמלית "מתעדכנות" בלי לגעת בטקסט.
5. **הנחיית-מסמכים מצבית עם התאמה-חוזרת**: רג'יסטרי {מצב-נישום → מסמך רשמי → מקור → סכימת-OCR →
   שדה-יעד}, ומנגנון העלאה-חוזרת שמשווה ערך-חדש לערך-מוחל בטולרנס פר-מסמך ומציג קונפליקט במקום דריסה.

**מה כאן שונה מפריור-ארט (בזהירות — ראו §4):** tool-use RAG וגם guardrails קיימים. השילוב
שלא ראינו כ-*מערכת אחת*: (א) איסור-כמויות **נאכף מכנית** באינדוקס, לא רק בפרומפט; (ב) הפניות
סמליות שמאפשרות לקורפוס להישאר נכון לנצח בזמן שרק הרג'יסטרי משתנה; (ג) דרגת-ודאות שהיא
**תכונת-נתונים שזורמת עד ה-UI** ומגבילה פעולות, לא רק טקסט-הסתייגות; (ד) ה-regulatory-watch כלולאה
סגורה שמייצרת diff לבן-אדם. הערך העסקי: "מודל אחד, קורפוס אחד, N מדינות" — כי כל הידע-הכמותי
מבודד ב-**Jurisdiction Pack**.

## 3. Jurisdiction Pack — מה צריך להחליף כדי לעשות את זה ל-IRS

הקוד היום כבר מפריד, לא-במכוון-לגמרי, בין **גנרי** ל**ישראלי**. ניסוח מפורש של הגבול:

| שכבה | גנרי (נשאר כמו שהוא) | Jurisdiction Pack (מוחלף למדינה) |
|---|---|---|
| Retrieval | `knowledge_chunks` schema, RPC היברידי, TOC-in-cache, כלי search/read | **תוכן** הכספת (+ FTS config: `'simple'` לעברית → `'english'` ל-IRS) |
| מנוע | חוזה `Calculator → CalcResult{value,formula,sources,confidence,notes}`, dispatcher | `types.ts` (קבועים שנתיים), `lib/calculators` (חוקים), `FIELD_TO_CALCULATOR` |
| טופס | `getFormSchema(formId, year)` resolver, `InteractiveValue`, גייטינג-לפי-confidence | `form-1301/schema.ts` → `form-1040/schema.ts` + Schedule C/SE |
| ניכויים | `DeductionDef{rule, ratePercent, formFields, plImpact, skill}`, `classifyExpensePLImpact` | טבלת-הניכויים + aliases + מאגר-המקצועות |
| מסמכים | רג'יסטרי הנחיה + OCR + reconcile | רשימת-המסמכים (867/806/3010 → W-2/1099-NEC/1099-K/Form 8829) |
| Graph | `client-graph.ts` (persona → nodes/edges), 3 כלים | כלום — כבר גנרי |
| שפה | קומפוננטות RTL-לוגיות | מילון-UI + `dir` (הסקופינג לצרפתית/אנגלית כבר מיפה: 160/162 קבצים עם עברית מוטבעת — זה הפער האמיתי) |

**מיפוי-מושגים ל-IRS (Schedule C self-employed, כדי להראות שהתבנית מחזיקה):**

| ישראל (היום) | IRS (מקביל) | הערה |
|---|---|---|
| טופס 1301 + שדה 150 (הכנסה מעסק) | Form 1040 + Schedule C line 31 | אותו "star field" |
| ב"ל לעצמאי, 52% ניכוי (שדה 030) | SE tax (Schedule SE) + ניכוי מחצית SE (Schedule 1 line 15) | אותו דפוס "תשלום-חובה עם ניכוי חלקי" |
| קרן השתלמות / פנסיה (137/135) | SEP-IRA / Solo 401(k) (Schedule 1 line 16) | תקרות שנתיות — רג'יסטרי |
| רכב 45% (convention) / לפי-מקצוע | Standard mileage rate (¢/מייל, שנתי) או actual-expense % | בדיוק ה-`DeductionDef{rule:"partial"}` |
| משרד-ביתי לפי יחס-שטח | Form 8829 או simplified method ($/sqft, תקרה) | הפער "אין שדה-שטח" זהה |
| עוסק פטור/מורשה (מע"מ) | אין מע"מ פדרלי; sales-tax ברמת-מדינה | ההפרדה-הקשיחה-לפי-סוג-עוסק (decisions 22/08) הופכת ל"לפי-state" |
| מקדמות | Estimated taxes (1040-ES, רבעוני) | `deadlines/calendar.ts` |
| טופס 867 / 806 (מנכים) | 1099-INT / 1099-NEC, 1099-K | רג'יסטרי-מסמכים |
| אישור מצה"ל (מילואים) | אין מקבילה | דוגמה שה-Pack יכול להשמיט פריטים |

**סדר-בנייה מומלץ אם מחליטים ללכת לשם:** (1) לחלץ את הגבול לאינטרפייס `JurisdictionPack`
(constants, calculators, formSchemas, deductions, documents, locale) בלי לשנות התנהגות — refactor
טהור עם golden tests קיימים כרשת-ביטחון; (2) lint-באינדוקס לאיסור-כמויות (סוגר פער §1.3 וגם
מחזק את הטענה-לפטנט); (3) להפעיל את מיגרציות-ה-knowledge ולחבר את ה-TOC ל-`/api/coach` (פערים
§1.1-1.2); (4) Pack שני צר מאוד (Schedule C בלבד) כהוכחת-תבנית.

## 4. הסתייגויות כנות (לא לדלג)

- **פטנט = שאלה לעו"ד-פטנטים, לא לי.** יש פריור-ארט משמעותי ב-tool-use RAG, guardrails, ו-
  "calculator tools". מה שאולי בר-הגנה הוא **השילוב הספציפי** (איסור-כמויות נאכף + הפניה סמלית +
  ודאות-זורמת-שמגבילה-פעולות + לולאת-diff רגולטורית). Pearl Cohen הוזכרו בפגישת CPA-BNG — נקודת-
  התחלה טבעית לחיפוש-חדשנות (prior-art search) לפני כל הגשה. עד אז: **לא לפרסם את המסמך הזה
  פומבית** (פרסום קודם יכול לפגוע בזכאות במדינות רבות).
- **הרעיון עובד רק אם הרג'יסטרי אמין** — וה-risk-gap מראה שהיום 20+ ממצאים פתוחים, ו-`TAX_CONSTANT_META`
  מכסה 13/34 סקלרים. הפטנט מתאר את המערכת ה*מכוונת*; המימוש עדיין חלקי.
- **בסביבת-הפיתוח הזו לא ניתן fetch ישיר ל-gov.il** (מדיניות egress) — לכן דרגה-1 ("CONFIRMED")
  דורשת בן-אדם. ל-IRS זה קל יותר (irs.gov נגיש בד"כ) — יתרון מעשי לגרסה האמריקאית.
