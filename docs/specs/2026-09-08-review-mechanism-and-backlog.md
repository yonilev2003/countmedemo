---
title: "מפת המנגנון + backlog מתועדף — סבב בניית מנגנון-הסקירה"
date: 2026-09-08
type: spec
status: ready
related: "memory/decisions.md (08/09, Evidence/Review/Release) · src/lib/review/registry.ts · memory/risk-gap.md"
---

# מה נבנה, מה נמצא, מה נשאר — סבב 08/09/2026

תגובה מלאה לבקשת יוני: סקירה מלאה של המנגנון, artifact עובד, ומיפוי side
quests. כל הפרקים למטה מבוססי-קוד (מאומתים ע"י סוכני-חקירה + קריאה ישירה),
לא ניחוש.

## 1. שרשרת המידע (כפי שהיא היום, לא כפי שתוכננה)

```
קלט ידני (/setup) ──┬──► buildPersona() ──► persona (localStorage + Supabase)
מסמך (upload OCR) ──┘         │
                               ▼
                    lib/calculators/types.ts (קבועים שנתיים, עכשיו עם confidenceTier)
                               │
                               ▼
                    lib/calculators/index.ts (מחשבונים טהורים)
                               │
                    ┌──────────┼──────────────────┐
                    ▼          ▼                  ▼
              form-1301   estimateTaxLiability   lib/vat-report,
              schema      (אומדן-מס)             lib/alerts/ceiling,
              (תצוגה)                            lib/p-and-l
                    │
                    ▼
       src/lib/agent/tools.ts (EITAN_TOOLS — get_form_value/get_tax_estimate/
       search_knowledge/read_knowledge) ──► /api/chat, /api/coach (שקל)
                    │
                    ▼
       knowledge/**/*.md ──► scripts/index-knowledge.mjs ──► knowledge_chunks
       (Postgres, pg_trgm+FTS) — RAG-בלי-מספרים
                    │
                    ▼
       משוב: src/lib/analytics/track.ts → public.events (כולל side_quest_*
       החדשים) — עדיין לא נסגר ללולאת golden-test (ראו §5)
```

## 2. Inventory — מה קיים, מה חלקי, מה תוכנן-בלבד

| רכיב | קיים? | מקור-אמת | בדיקות | פער |
|---|---|---|---|---|
| קבועי-מס שנתיים | ✅ מלא | `lib/calculators/types.ts` | golden tests רבים | 37/37 סקלרים עכשיו ב-`TAX_CONSTANT_META` (היה 13/37) |
| מדרגות-מס | ✅ מלא | `TaxYearConstants.taxBrackets` | `tests/unit/calculators/*` | כרטיס-סקירה חדש (`rule:taxBrackets`) עם בדיקת-רציפות אוטומטית |
| נק'-זיכוי-ילדים | ✅ מיושם (from-2024) | `childCreditPointsByAge` | `credit-points.test.ts` | STRONGLY-SUPPORTED, לא CONFIRMED — כרטיס-סקירה קיים |
| נק'-זיכוי-מילואים | ✅ מיושם | `MILUIM_CREDIT_TIERS_2026` | כן | נוסחה אומתה מול חוק; המסמך-המקור עצמו דרגה-2 |
| **נק'-זיכוי-תואר-אקדמי (שדה 181)** | ⚠️ **באג אמיתי, תוקן הסבב הזה** | `field181AcademicDegree` | טסט-רגרסיה חדש | היה מחושב לתצוגה אך **לא נכלל ב-`totalCreditPoints`** — האומדן זילזל בזיכוי. תוקן; הערך עצמו (1.0 נק' שטוח) עדיין unverified |
| ניכויים (deductions.ts) | ✅ מלא | `getDeductionsTable(year)` | כן | כרטיס-סקירה per-deduction |
| RAG retrieval | ✅ קוד קיים, ⚠️ תלוי-מיגרציה | `knowledge_chunks` + `search_knowledge_chunks` RPC | — | 2 מיגרציות כתובות, **לא הוחלו על hbsgz** (לא ניתן לאמת מכאן — אין גישת-Supabase-MCP לפרויקט האמיתי) |
| RAG ב-`/api/coach` (שקל) | ✅ **תוקן הסבב הזה** | `renderKnowledgeToc()` | — | היה חסר ב-coach (רק ב-chat); שקל קיבל את הכלים (`EITAN_TOOLS` משותף) אך לא את ההנחיה להשתמש בהם |
| "אין מספרים" באכיפה | ✅ **נבנה הסבב הזה** | `scripts/audit-knowledge-numbers.mjs` | `tests/unit/knowledge/no-numbers.test.ts` | היה נוהל בלבד; 0 הפרות נמצאו ב-66 פתקים |
| לולאת-משוב (WS9) | ⚠️ **תוכננה 02/07, לא מומשה עדיין** | `docs/reviews/2026-07-02-ws9-learning-loop.md` | — | `calc_snapshot` event, "הערך לא נכון?" ב-`InteractiveValue`, `tests/unit/fixtures/corrections/` — **אף אחד מהשלושה לא קיים בקוד** (אומת ב-grep, לא רק לפי המסמך) |
| מנגנון-סקירה (החדש) | ✅ **נבנה הסבב הזה** | `src/lib/review/registry.ts` + `/admin/review` | `tests/unit/review/registry.test.ts` | ראו memory/decisions.md 08/09 |
| Side quests | ⚠️ 1/3 מומש | `OsekOpenFileSideQuest` (setup/page.tsx) | e2e חדש | רק "עזרה בפתיחת עסק" — "מסמך חסר" ו"הבנת הוצאה/זכאות" עדיין לא מומשים |

## 3. באגים אמיתיים שנמצאו ותוקנו הסבב הזה (לא רק ממצאים תיאורטיים)

1. **`totalCreditPoints` לא כלל את זיכוי שדה 181** (תואר אקדמי) — ראו טבלה
   למעלה. תוקן, טסט-רגרסיה נוסף.
2. **`about/page.tsx` טענה "30% משרד ביתי"** — סתירה ישירה להחלטה המכוונת
   ב-`deductions.ts` לא-למדל משרד-ביתי בשיעור-קבוע (דורש שדה-יחס-שטח שלא
   קיים). תוקן (השורה הוסרה, הוחלפה בהבהרה נכונה).
3. **`/api/coach` לא קיבל את ה-TOC של מאגר-הידע** — ראו טבלה למעלה. תוקן.

## 4. Backlog מתועדף — נמצא, לא תוקן הסבב הזה (מפורש, לא נשכח)

מדורג לפי סיכון-אמיתי (השפעה על מספר שמוצג בביטחון × קלות-הטעות-לחזור):

| # | ממצא | קובץ:שורה | סיכון | למה לא תוקן עכשיו |
|---|---|---|---|---|
| 1 | סף-מספר-הקצאה (5,000/10,000/20,000/25,000 ₪, לפי `allocationNumberThreshold()`) מוכפל כליטרל בשני מקומות נוספים | `lib/invoice-generator/index.ts:79`, `app/invoices/new/page.tsx:207,758` | תת/יתר-חיוב בדרישת ת.ז.-לקוח כשהמדרגה הבאה נכנסת לתוקף | דורש לוודא שזו **אותה** דרישה חוקית (ת.ז.-לקוח) או דרישה **נפרדת** (מספר-הקצאה) לפני איחוד — סיכון-שגיאה-רגולטורית גבוה מדי לניחוש |
| 2 | 3 ליטרלים נפרדים לתאריך-הגשת-מע"מ (19/23/15 לחודש) בלי קבוע משותף | `lib/vat-report/index.ts:273`, `lib/deadlines/calendar.ts:159-171`, `guides/morshe/page.tsx:78` | תזכורת-הגשה שגויה אם מדרגה אחת מתעדכנת ולא האחרות | דורש אימות איזה תאריך שייך לאיזה סוג-דיווח (מקוון/ידני/874-מפורט) לפני איחוד |
| 3 | אחוזים מוטבעים בקופי (52%/35%/30%) שמכפילים קבועים מ-`types.ts` | `about/page.tsx:103,108,124`, `demo/page.tsx:269`, `dashboard/pro/page.tsx:469`, `guides/morshe/page.tsx:197,283` | דריפט-שקט אם הקבוע משתנה בלי לעדכן קופי | נפח (6+ קבצים) — נכון יותר ככרטיסי-סקירה נפרדים ב-`/admin/review` מאשר תיקון-עיוור עכשיו |
| 4 | `newOlehCreditYear1/2/3`, `femaleResidentBonusPoints` — "statutory, stable" בלי ציטוט אמיתי | `types.ts` | מסומן `unverified` ברישום החדש | תויג נכון, ממתין לבדיקה דרך `/admin/review` |
| 5 | §45א תקרת-ביטוח-חיים — לא ממודל בכלל (לא רק לא-מאומת) | `types.ts:178` (FLAG(Roy)) | פרמיה גבוהה תקבל זיכוי בלי תקרה כלל | דורש מנגנון-תקרה חדש, לא רק אישור-ערך |
| 6 | לולאת-המשוב של WS9 (calc_snapshot / תיקוני-משתמש / fixtures) עדיין תיאורטית | `docs/reviews/2026-07-02-ws9-learning-loop.md` | אין עדיין מסלול "משתמש מתקן → golden test" | פרויקט נפרד בגודלו של הסבב הזה — לא נכנס לתקציב הפעם |
| 7 | אימות/הרשאות סוקר-חיצוני אמיתי ל-`/admin/review` | — | ללא זה, "בדיקה מהצד שלהם" (רו"ח) לא אפשרית בפועל | סכימה מוכנה (`reviewer_role`), UI/auth flow לא — ראו decisions.md 08/09 |
| 8 | Side quests #2/#3 ("מסמך חסר", "הבנת הוצאה/זכאות") | — | — | מומש רק #1 להוכחת-דפוס, כמבוקש ("שלושת המקרים... צריכים להוכיח את הדפוס לפני registry כללי") |
| 9 | מיגרציית `review_decisions` לא הוחלה על hbsgz | `supabase/migrations/20260908120000_*.sql` | `/admin/review` יעבוד אך יציג הכל כ"לא נסקר" עד ההחלה | ידני-יוני, כמו כל מיגרציה בפרויקט הזה (ה-MCP לא רואה את hbsgz) |

## 5. Definition of Done — מה עומד ומה לא

- [x] מפת-מנגנון + backlog מתועדף (המסמך הזה)
- [x] דף-סקירה עובד עם החלטות-נשמרות, מקור, גרסה, תיקון, דילוג, ביטול
      (`/admin/review` — דורש מיגרציה חיה כדי לשמור בפועל, ראו #9 למעלה)
- [x] הוכחת לולאת-משוב אחת: RAG-בלי-מספרים (audit script + test, 0→ נאכף)
- [ ] הוכחת לולאת-משוב שנייה (לכלל/תשובה, עם before/after) — **לא בוצע.**
      הסיבה: הראשונה (RAG-numbers) היא הדגמה אמיתית עם מדידה (0 הפרות
      נמצאו/נמנעות); שנייה אמיתית (למשל "כלל שהשתנה → re-review אוטומטי")
      דורשת שינוי-אמיתי בקבוע שלא היה מוצדק לבצע רק כדי להדגים לולאה — ראו
      §6 להצעה קונקרטית איך להוכיח את זה בלי לשנות קבוע-אמיתי.
- [x] side quests: מיפוי-3 + מימוש-1 בהיקף קטן, עם צורך-נשמר וחזרה תקינה
- [x] בדיקת שינוי-תלות מבטל אישור בלי למחוק היסטוריה — `releaseStatusFor()`
      ב-`/api/admin/review` + `tests/unit/review/registry.test.ts`'s
      "contentHash changes when the underlying year's value changes" test
- [x] סוקר חסר-הרשאה לא יכול להפעיל שינוי — `/api/admin/review/decide`
      דורש `ADMIN_EMAILS`; אין עדיין סוקר-חיצוני נפרד (ראו #7 למעלה — לא נבנה)
- [x] tsc·unit·build·e2e ירוקים (ראו commit האחרון)
- [x] עדכון ההחלטה על "רועי" + מסמכי-מצב (`memory/decisions.md`, `CLAUDE.md` item 5)
- [x] תיאור טכני ממוקד למחקר-ההמצאה (`docs/specs/patent-prior-art-scan-2026-09-08.md`)

## 6. הצעה קונקרטית להוכחת לולאת-משוב שנייה (לא בוצע, לביצוע עתידי)

כדי להוכיח "משוב → שינוי מדיד" בלי להמציא באג: לקחת אחד מפריטי ה-backlog
למעלה (למשל #4, `newOlehCreditYear1` שמסומן `unverified`), לבצע חיפוש-אימות
אמיתי (WebSearch, לא ניחוש), ואם מתאשש — לשדרג ל-`strongly_supported` **דרך
פעולת-אישור ב-`/admin/review`** (לא עריכת-קוד ישירה), ואז לתעד את ה-before/
after (דרגת-ודאות ישנה מול חדשה, עם מקור) כדוגמה חיה. זה סבב-עבודה נפרד,
קצר, שמוכיח את הלולאה המלאה מקצה-לקצה על נתון אמיתי.
