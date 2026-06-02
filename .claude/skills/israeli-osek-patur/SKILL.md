---
name: israeli-osek-patur
description: Rules, obligations, and workflow guidance for Israeli עוסק פטור (VAT-exempt sole proprietor) with annual turnover below the patur ceiling (~120,000 NIS for 2024-2026). Handles income-tax-only filing, expense tracking with actual receipts, ceiling monitoring, and transition triggers to עוסק מורשה. Auto-invoke when persona.business.osekType === "patur" && persona.business.isOsekZeir === false, or when the user asks about עוסק פטור rules, ceiling, or annual filing. Do NOT use for VAT-registered dealers (use israeli-osek-murshe), for users on the simplified 30% track (use israeli-osek-zeir), or for corporate tax (Chevra Ba'am).
license: MIT
allowed-tools: Read Edit Write Bash(python:*)
compatibility: Claude Code, Claude.ai
---

# עוסק פטור — מדריך מלא

## מה זה עוסק פטור

עוסק פטור הוא עצמאי שמחזורו השנתי נמוך מהתקרה (120,000 ₪ ל-2024 ו-2025, קפוא — `osekPaturThreshold` ב-`src/lib/calculators/types.ts`). פטור ממע"מ — לא גובה מלקוחות, לא מקזז תשומות. עדיין חייב במס הכנסה וביטוח לאומי.

> **מקור-אמת לתקרה**: `getTaxYearConstants(year).osekPaturThreshold` — אל תקשה תקרה בקוד.

---

## חובות ותהליכים שנתיים

### 1. ניהול ספרים
- **שיטה**: חד-צידי (single-entry) מספיקה עד תקרה של ~300,000 ₪ מחזור. מעל — דו-צידי (double-entry).
- **מסמכים חובה**: קבלה (`receipt`, doc-type 320) לכל הכנסה. לא מוציאים חשבונית מס — אין מע"מ לחייב.
- **שמירה**: 7 שנים (סעיף 66 לפקודת מס הכנסה).

### 2. תזרים תשלומים שנתי
| תאריך | חובה |
|---|---|
| 30.04 | הגשת דו"ח שנתי 1301 לשנת המס הקודמת |
| כל 15-19 לחודש | מקדמות מס הכנסה (אם נקבעו ע"י פקיד שומה) |
| 30.04 / 31.05 | הצהרת ביטוח לאומי (טופס 652) |

### 3. מקדמות מס הכנסה
עוסק פטור שמרוויח מעל פטור בסיסי (כ-84,120 ₪ ל-2024) משלם מקדמות חודשיות.
- **חישוב**: `(הכנסה חייבת × שיעור המס) / 12` כהערכה — הפקיד קובע % מחזור.
- **מסמך**: פנקס מקדמות 1310.

---

## הוצאות מוכרות — כללי אצבע לעוסק פטור

עוסק פטור עוקב אחרי **הוצאות בפועל** עם קבלות (בניגוד לעוסק זעיר שמקבל 30% אוטומטי).

| קטגוריה | % ניכוי | הערה |
|---|---|---|
| רכב (דלק, טיפולים, ביטוח) | 45% | רכב אחד בלבד |
| טלפון / אינטרנט | 80% | |
| משרד ביתי | יחסי | שטח עסקי / כלל הדירה |
| ציוד משרדי < 1,200 ₪ | 100% | מעל — פחת |
| כיבוד קל במשרד | 80% | לא אירוח לקוחות |
| ספרות מקצועית / הכשרות | 100% | קשר ישיר לעסק |

> **לשאלות מפורטות על קטגוריה ספציפית** → הפעל `israeli-expense-categorizer`. הוא הסמכות לכללי הניכוי.

---

## ניטור תקרה — Hook ראשי

```
if persona.income.totalRevenue >= (osekPaturThreshold * 0.85):
    → הצג אזהרת תקרה (src/lib/alerts/ceiling.ts)
    → הפעל israeli-osek-murshe להכנה למעבר
```

**כלל העברה**: ברגע שהמחזור השנתי עולה על `osekPaturThreshold`, החובה להירשם כ**עוסק מורשה** מתחילה **מהחודש שבו עברו**. חריגה בדיעבד = קנסות + ריבית.

---

## מתי להפעיל סקיל אחר

| מצב | סקיל לקריאה |
|---|---|
| משתמש רוצה מסלול 30% אוטומטי (ללא צורך בקבלות) | `israeli-osek-zeir` |
| מחזור עבר / עומד לעבור תקרה | `israeli-osek-murshe` |
| שאלה על קטגוריית הוצאה ספציפית | `israeli-expense-categorizer` |
| חישוב ביטוח לאומי (שדה 030) | `israeli-bituach-leumi` |
| דו"ח שנתי 1301 — חישובי שדות | `israeli-tax-returns` |

---

## הבדל מרכזי מעוסק זעיר

| | עוסק פטור | עוסק זעיר |
|---|---|---|
| תקרה | ~120,000 ₪ | אותה תקרה |
| מסלול הוצאות | **בפועל עם קבלות** | **30% אוטומטי ללא קבלות** |
| `isOsekZeir` | `false` | `true` |
| עדיף כשה… | הוצאות > 30% מהמחזור | הוצאות < 30% מהמחזור |

> **כלל הוחלטה**: הכנס את `isOsekZeir` ל-`persona.business.isOsekZeir`. אל תגרום למשתמש לנחש — אם ההוצאות הבפועל עולות על 30%, עוסק פטור (לא זעיר) עדיף לו.

---

## קבצים רלוונטיים בפרויקט

| קובץ | תוכן |
|---|---|
| `src/lib/calculators/types.ts` | `osekPaturThreshold`, `osekZeirThreshold` per year |
| `src/lib/alerts/ceiling.ts` | אזהרת תקרה + העברה |
| `src/lib/regulatory/deductions.ts` | כל הניכויים עם `formFields` + `plImpact` |
| `src/lib/calculators/index.ts` | `field150BusinessIncome`, `field238Turnover` |
| `src/lib/persona.ts` | `OsekType`, `PersonaBusiness.isOsekZeir` |
