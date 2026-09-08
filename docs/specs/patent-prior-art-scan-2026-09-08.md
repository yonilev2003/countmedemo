---
title: "פריור-ארט ראשוני — Jurisdiction Packs / Numberless Retrieval"
date: 2026-09-08
type: spec
status: draft
related: "docs/specs/rag-jurisdiction-packs.md §2-4 (הרעיון-לפטנט המקורי) · memory/decisions.md (08/09, Evidence/Review/Release)"
---

> **הבהרה קודם-כל (יוני ביקש להתמקד כאן):** זהו סקר ראשוני במקורות פומביים
> בלבד (WebSearch), **לא חוות-דעת משפטית ולא תחליף לחיפוש-פריור-ארט של
> עורך-פטנטים**. אי-מציאת תוצאה אינה הוכחת-חדשנות — היעדר-ראיה, לא ראיית-
> היעדר. הסקר לא כיסה פרסומים לא-אנגליים, בקשות לא-מפורסמות (חלון 18 חודש),
> או סריקת-מחלקות-CPC. שום חלק מהמפרט הפרטי או מהקוד לא הועלה למנוע-חיפוש
> כלשהו, והרעיון לא פורסם.

## מיקוד שביקש יוני

"הייתי ממקד את הבירור בחיבור הטכני בין ראיות, גרסאות, תלויות ובדיקה חוזרת
בעקבות שינוי" — כלומר לא ה-RAG-עם-guardrails הכללי (זה נפוץ), אלא הלולאה
הספציפית: ראיה→גרסה→תלות→בדיקה-חוזרת-אוטומטית. הסקר למטה ממוקד סביב 5
הרכיבים המדויקים מ-`docs/specs/rag-jurisdiction-packs.md` §2, לא סביב "RAG
למס" בכלליות.

## 5 הרכיבים שנבדקו, ומה נמצא

1. **קורפוס נטול-כמויות באכיפה מכנית באינדוקס** (לא רק הוראת-פרומפט) —
   פריור-ארט שכן: הדפוס של strip-and-symbolize קיים היטב ל-**PII** בזמן
   ingestion (US6957205B1, US11836266, ספרות-פרקטיקה של AWS Bedrock
   Guardrails) — מחליפים ישויות בפלייסהולדרים מוקלדים לפני embedding. יש
   גם פטנטים כלליים על ניהול-פלייסהולדרים (US9275089/US9268805/US9904525,
   ~2016). **לא נמצא** יישום של אותו סינון-אכיפה על **כמויות-רגולטוריות**
   עם קישור לרג'יסטרי-מחשבון. Intuit מפרידה LLM מחישוב-מספרים ברמת
   ה-**runtime**, לא כפילטר-אינדוקס על הקורפוס עצמו — הבדל ארכיטקטוני אמיתי.

2. **מנוע דטרמיניסטי ממוענן (jurisdiction, tax_year)** — **פריור-ארט
   משמעותי, לא לראות כחדשני לבדו.** Tax Knowledge Engine / GenOS-GenRuntime
   של Intuit קושר LLM לעובדות-קרקע עם כל חישוב-מספרי מהמנוע
   ([בלוג Intuit](https://www.intuit.com/blog/innovative-thinking/tech-innovation/how-intuit-transformed-tax-filing-experiences/),
   [ZenML case study](https://www.zenml.io/llmops-database/large-scale-tax-ai-assistant-implementation-for-turbotax)).
   פטנטים: [US11386505B1](https://patents.google.com/patent/US11386505B1/en),
   [US10387970B1](https://patents.google.com/patent/US10387970B1/en). אקדמי:
   [NTOL neuro-symbolic tax engine](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2026.1802755/full),
   [RAG מול חישוב-דטרמיניסטי](https://arxiv.org/html/2608.23908v1).

3. **ודאות כשדה-ראשון שחוסם/מדרג פעולת-UI בעלת-השלכה** (לא רק disclaimer
   טקסטואלי) — **פריור-ארט חלקי על שערי-סף כלליים**
   ([WO2022235414A1](https://patents.google.com/patent/WO2022235414A1/en),
   [US20130138439A1](https://patents.google.com/patent/US20130138439A1/en),
   [US10133738B2](https://patents.google.com/patent/US10133738B2/en)), נפוץ
   ב-document-AI ("אמת אוטומטית מעל סף, סמן מתחת לסף" — Mindee). מחקר על
   **תפוצת-אמון לאורך שרשרת-חישוב** קיים
   ([arXiv 2604.04035](https://arxiv.org/pdf/2604.04035),
   [Bayesian RAG לפיננסים](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12886353/)).
   **לא נמצא** שילוב-ספציפי של "רמת-ודאות ברמת-קבוע → זורמת דרך חישוב →
   חוסמת/מדרגת פעולה על **טופס ממשלתי רשמי**".

4. **לולאת-משמר-רגולציה עם diff מול רג'יסטרי + הפצה סימלית** — פריור-ארט
   על ה"משמר" עצמו קיים
   ([US10467717](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10467717)
   — ניטור-פרסומים וזיהוי-שינויי-רגולציה), ומוצרים מסחריים
   (Visualping/PageCrawl/זרימות-Zapier, Avalara/Vertex). **לא נמצא**: עדכון
   קבוע-בודד-מאושר ש"מרענן" באופן-מרומז כל רשומת-קורפוס שמפנה אליו סימלית,
   בלי לגעת בטקסט של הרשומה עצמה — זה החלק הכי ספציפי ולא נמצא לו התאמה.

5. **רג'יסטרי מצבי-נישום→מסמך עם התאמה-חוזרת** — פריור-ארט על ההתאמה
   (reconciliation) בין ערך-OCR לערך-מערכת-קיים קיים
   ([US20090092318A1/US8094976](https://patents.google.com/patent/US20090092318)),
   וכן לוגים-לא-דורסים עם ספי-ודאות (US9607058, ספרות docketing-OCR).
   **לא נמצא** רג'יסטרי שגוזר **אילו** מסמכים נדרשים ממצב-נישום נתון ומנתב
   כל אחד לשדה-טופס-יעד ספציפי.

## מסקנה זהירה

רכיבים 2 ו-5-החצי-של-ההתאמה תפוסים היטב — לא הבסיס לטענה. רכיבים 1, 3, ו-4
כל אחד יש לו פריור-ארט **בתחום-שכן** (redaction של PII, שערי-ודאות
ב-document-AI, ניטור-רגולציה כללי) — זה בדיוק סיכון-הטריוויאליות (obviousness),
לא anticipation ישיר. **הזווית החזקה ביותר בסריקה הזו היא סיפור-הקישור**:
קישור סימלי-בזמן-אינדוקס (1) + הפצה-דרך-קבוע-בודד (4) + ודאות שרוכבת על
אותו-תפר עד חסימת-UI (3) — **כמערכת-אחת**, לא כל רכיב בנפרד. זו בדיוק
ההשערה שיוני ביקש לבדוק, וזו ההמלצה: אם ממשיכים לכיוון פטנט, למקד את
הניסוח בקישור-הזה בין 1+3+4, לא בכל רכיב לחוד.

Pearl Cohen (הוזכרו בפגישת CPA-BNG) פרסמו על כשירות-פטנט ל-AI אחרי
*Ex parte Desjardins* — [כאן](https://www.pearlcohen.com/a-new-era-in-ai-patent-eligibility-in-view-of-ex-parte-desjardins/)
— רלוונטי לניסוח-הטענה כשיפור טכני, לא רק אלגוריתם מופשט. נקודת-פתיחה
טבעית לחיפוש-פריור-ארט מקצועי אם ממשיכים.

## מקורות (הרשימה המלאה שנמצאה בסריקה)

[Intuit TurboTax AI](https://www.intuit.com/blog/innovative-thinking/tech-innovation/how-intuit-transformed-tax-filing-experiences/) ·
[ZenML LLMOps](https://www.zenml.io/llmops-database/large-scale-tax-ai-assistant-implementation-for-turbotax) ·
[US11386505B1](https://patents.google.com/patent/US11386505B1/en) ·
[US10387970B1](https://patents.google.com/patent/US10387970B1/en) ·
[US10467717](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10467717) ·
[WO2022235414A1](https://patents.google.com/patent/WO2022235414A1/en) ·
[US20130138439A1](https://patents.google.com/patent/US20130138439A1/en) ·
[US10133738B2](https://patents.google.com/patent/US10133738B2/en) ·
[US20090092318A1](https://patents.google.com/patent/US20090092318) ·
[US6957205B1](https://patents.google.com/patent/US6957205B1/en) ·
[US9275089](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9275089) ·
[NTOL, Frontiers 2026](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2026.1802755/full) ·
[IRC formalization](https://arxiv.org/pdf/2511.11954) ·
[RAG מול חישוב-דטרמיניסטי](https://arxiv.org/html/2608.23908v1) ·
[Bayesian RAG לפיננסים](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12886353/) ·
[תפוצת-אמון בסוכני tool-calling](https://arxiv.org/pdf/2604.04035) ·
[Blue dot VAT AI](https://www.bluedotcorp.com/blog/ai-tax-software-vat-management/) ·
[Pearl Cohen — כשירות-AI](https://www.pearlcohen.com/a-new-era-in-ai-patent-eligibility-in-view-of-ex-parte-desjardins/)

## הצעד הבא (לא הוכרע, לא בוצע)

יוני לציין אם ממשיכים ל: (א) חיפוש-פריור-ארט מקצועי דרך Pearl Cohen לפני כל
הגשה, (ב) refactor טהור ל-`JurisdictionPack` interface (עדיין לא בוצע — ראו
`docs/specs/rag-jurisdiction-packs.md` §3 "סדר-בנייה מומלץ"), או (ג) לעצור
כאן ולהתמקד בדמו. שלושתם עצמאיים זה מזה.
