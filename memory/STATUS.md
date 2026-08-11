---
tags: [status, countme]
related: "[[progress]] · [[decisions]]"
---

# status — איפה אנחנו עכשיו

> עודכן: 2026-08-11 (Fable) · ענף: `claude/system-updates-optimization-ah8z45` · החלטות: [[decisions]]
> **תדריך לכל סשן חדש:** קרא את המסמך הזה במלואו, אשר הבנה ב-2 שורות, gaps מקובצים בסוף כל פלט
> (ראה CLAUDE.md § Working style). היסטוריה מלאה יותר מכל תאריך → `git log --oneline -- memory/STATUS.md`
> ו-[[progress]] (לא שוכפל כאן).

## 🎯 11/08 — עדכונים רוחביים: מנוע הוצאות 2026, מסקוט חדש, onboarding, expenses, pruning

יוני העביר חבילה: (1) דאטהסט הוצאות מוכרות 2026 מלא (xlsx קנוני — 62 כללים רוחביים, 113 מקצועות/20
אנכים, 22 הוצאות-בסיס + 595 הוצאות פר-מקצוע, 15 כללי פחת, 10 פסילות, כל אחד עם % מס-הכנסה/מע"מ,
מקור-בדין, confidence A/B/C), (2) תמונת מסקוט-שקל חדשה שמחליפה את "איתן" (עולם-דמויות מלא בהמשך),
(3) ארטיפקטים מלאים (קוד+מפרט) להעלאת-הוצאות ול-onboarding, (4) מפה רגולטורית לשימור-ידע. ביצוע עם
Workflows/agents מקבילים לפי בקשת יוני, אימות מלא (tsc+vitest+build+Playwright) בין כל שלב.

**מה נבנה ונדחף (7 קומיטים, כולם build+test ירוקים):**
1. **`src/lib/expense-engine/`** — מנוע-ידע חדש (לא מחובר למחשבוני 1301/P&L — שכבה נפרדת). דאטה
   קנוני ב-`data/expense-recognition/2026.xlsx`, מחולל (`scripts/expense-engine/generate.ts`,
   `npm run gen:expense-data`) פולט מודול TS מוקלד. שחזור מתועד של 3 שורות שחסרו במקור (VEH-01/P001/
   DEP-01, מאומתות-צולבות מגיליונות אחרים באותו קובץ) ו-2 שלא שוחזרו (EB-001/EX-0001 — אין מקור
   לאימות; הספירה האמיתית 22/595 לא 23/596 כפי שה-README טוען). Golden test חדש מוודא עקביות מול
   `getTaxYearConstants(2026)` — אפס סתירה נמצאה.
2. **חיווט הידע:** בורר-מקצוע חיפוש-תחילה ב-`/business-expenses` (113 מקצועות, שיעור=ודאי-בדין
   מוצג **תמיד נפרד** מ-eligibilityConfidence=הערכה A/B/C) · כלי צ'אט חדש `get_expense_rule`
   (דטרמיניסטי, ה-LLM עדיין לעולם לא מחשב) · `/expenses` — זרימת העלאת-קבלות בטא מלאה (ולידציה
   חוסמת, סף-ביטחון 0.75, שדה "מהות ההוצאה" בחובה-דינמית, מטבע-חוץ עם DEMO_RATES מסומן, ייצוא CSV).
3. **מסקוט:** `src/lib/agent/character.ts` (seam יחיד, `CHARACTER.name="שקל"` placeholder) +
   `public/mascot/mascot.svg` זמני. סוויפ 20 קבצים — כל מחרוזת גלויה-למשתמש/פרומפט הוחלפה, מזהי-קוד
   (`EITAN_TOOLS` וכו')/routes/analytics נשארו בכוונה.
4. **`/onboarding`** — שאלון קליל ≤3 דק' לפי `docs/specs/beta/onboarding.md` (ONB-1..ONB-11): מודל
   `journey`/tier עם fallback ל-personas ישנות, `buildLitePersona` באפס-פברוקציה (כל שדה למחשבון = 0
   פשוטו כמשמעו), בורר-עיסוק אמיתי מהדאטהסט (לא 10 צ'יפים קשיחים), מסך-חגיגה עם `PopIn` חדש ב-
   motion.tsx, תיקון redirect מרוכז (`useRequiredPersona`). `/setup` נשאר כזרימת "השלמת פרטים לדוח".
5. **`docs/regulatory/regulatory-map-2026.md`** — המפה הרגולטורית המלאה של יוני, קישור-צולב עם
   [[../memory/regulatory-status|regulatory-status]].
6. **Pruning:** תג `pre-prune-2026-08` (מקומי בלבד — push נכשל 403, הרשאות-טוקן) · נמחקו
   `docs/form-screenshots/` (20 קבצים, אפס רפרנס, 5.2MB) ו-7 קבצי HTML של Brand Kit (~1.7MB, נשאר
   README) · ארכוב ל-`docs/archive/`+`memory/archive/` (reviews היסטוריים, status-vs-plan, plan-pilot,
   retro-07-03 ועוד) · **CLAUDE.md 372→160 שורות** (בסיס: השכתוב מהענף התקוע `system-beta-preparation-
   oiyzpy`, מעודכן מלא לסבב הזה — לא cherry-pick עיוור) · **סקילים 18→8** (הוסרו התיקיות המחויבות של
   expense-categorizer [הוחלף ע"י המנוע!], receipt-scanner, hebrew-ocr-forms, ui-design-system,
   hebrew-tailwind-preset, ai-compliance-kit, id-validator, il-invoice-organizer, financial-reports,
   tax-withholding — כולם נשארים בקטלוג `skills-lock.json`, הפיך ב-`npx skills add`) · **puppeteer→
   playwright** ב-`scripts/regulatory-watch/report.ts` (שימוש אמיתי אומת קודם! לא נמחק עיוור) +
   עדכון `.github/workflows/regulatory-watch.yml` + smoke test אומת (11/11).

**אימות:** כל שלב — `npx tsc --noEmit` נקי + `npm test` ירוק (243/243, מתוכם 65 חדשים) +
`npm run build` ירוק (44 routes, כולל `/onboarding`/`/expenses`/`/guides/opening` חדשים) + בדיקת-
דפדפן אמיתית (Playwright, חדר Chromium) על onboarding (intro→name→עיסוק, בורר-מקצוע אינטראקטיבי)
ו-expenses (מציג נתוני-דמו אמיתיים).

**פערים שנפתחו/נשארו פתוחים (לא הוכרעו בשקט — ראו הודעת-הביניים ליוני בצ'אט לפירוט מלא):**
- **החלטת-פלטה:** ה-onboarding-artifact/מוקאפ-ההוצאות של יוני הגיעו בפלטות-צבע שונות משלנו (Brand
  Kit נעול) ומאזכרים "CountMe-שפה-עיצובית.html" שאין לנו — לא הוחלף בשקט, המשכנו עם הנעול.
- **auth כפול לא נבנה:** ה-onboarding-artifact כלל מסכי סיסמה+SMS OTP — לא הוטמעו (Google OAuth
  בלבד נשאר). אם זו כוונה אמיתית, זו החלטת-ארכיטקטורה נפרדת שדורשת אישור.
- **`/file`/`/demo` לא שוערים על `journey.filingDetailsCompleted`** — משתמש חדש-לגמרי (0 בכל שדה,
  ת"ז ריקה) יכול לנווט ישירות ל"מחשבון" 1301 בלי אזהרה שזה נתוני-placeholder. הסיכון תועד במפורש
  ב-spec המקורי (סיכון #2) אבל לא הפך למשימת-ONB ממוספרת — מומלץ בעדיפות ראשונה לסבב הבא.
- **קבצי קבלות לא נשמרים בפועל** (`receiptPath` נשאר ריק — אין חיבור ל-Supabase Storage) — דורש
  לפני production כדי לעמוד בדרישת שמירה-7-שנים מהמפרט.
- ONB-12 (Playwright e2e) / ONB-13 (ליטוש קופי-תומי) / ONB-14 (אישורי-יוני) / ONB-15 (אימות-רועי) —
  לא בוצעו, לפי ה-spec המקורי.
- ספק OCR אמיתי / שערי בנק ישראל חיים / ייצוא PDF / פיצול PDF רב-עמודי / אינטגרציית ביט-פייבוקס —
  לא נבנו ב-/expenses, מתועדים כפערים ב-spec §8 עצמו.
- מיגרציה אופציונלית `20260811120000_expenses_detail_columns.sql` נכתבה אך **לא הוחלה** על hbsgz —
  לא נדרשת (הפיצ'ר עובד על `persona.income.expenses` jsonb).
- שם הדמות "שקל" + תמונת המסקוט האמיתית — עדיין placeholder, ממתין ליוני.

## חוסמים ידועים (לא השתנו הסבב הזה — ראו [[decisions]] לפירוט מלא)

| נושא | סטטוס |
|---|---|
| סוקר משפטי חיצוני פעיל | 🔴 אין מאז 2026-07-02 — כל קופי DRAFT נשאר DRAFT |
| Tranzila | ⛔ סגור/לא רלוונטי (יוני, 03/08) |
| `AUTH_GATING_ENABLED` + תקציב Anthropic | ✅ בוצעו (יוני, 03/08) |
| רישום מרשם התוכנות לחשבונות ממוחשבים (B1 במפה הרגולטורית) | 🔴 לא התחיל — חוסם-השקה אמיתי, תהליך ארוך |
| Redirect URL חסר ב-Supabase (hbsgz) | 🔴 עדיין לא תוקן |
| הפקת-מסמכים לא-אטומית (`persistPersona` fire-and-forget) | 🔴 נדחה בכוונה |

## פעולה הבאה מומלצת

1. יוני: לבדוק ויזואלית את `/onboarding` ו-`/expenses` (הבטחתי בסיום הסבב — לא בדקתי אני, רק אימות
   טכני).
2. להכריע בפערי הפלטה/auth-כפול שנפתחו לעיל.
3. שיעור `/file`/`/demo` על `journey.filingDetailsCompleted` (ראו למעלה — עדיפות גבוהה, לא ממוספר).
4. חיבור Supabase Storage לקבלות (שמירה-7-שנים).
5. סקירה משפטית חיצונית — עדיין תקוע, לא לשאול שוב עד שיוני מעדכן.
