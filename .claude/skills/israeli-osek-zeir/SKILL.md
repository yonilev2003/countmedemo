---
name: israeli-osek-zeir
description: Rules and workflow for Israeli עוסק זעיר — the simplified 30% automatic expense track available to עוסק פטור registrants (persona.business.osekType === "patur" && persona.business.isOsekZeir === true). Handles the תיקון 257 30%-of-turnover deduction, break-even analysis vs. actual expenses, and transition decisions. Auto-invoke when isOsekZeir is true, or when user asks about "מסלול הוצאות אוטומטי", "30%", or "עוסק זעיר". Do NOT use for VAT-registered dealers (use israeli-osek-murshe), for users who track actual expenses (use israeli-osek-patur), or if annual turnover exceeds the patur ceiling.
license: MIT
allowed-tools: Read Edit Write Bash(python:*)
compatibility: Claude Code, Claude.ai
---

# עוסק זעיר — מסלול 30% (תיקון 257)

## מהו עוסק זעיר

עוסק זעיר הוא עוסק פטור שבחר במסלול הפשוט: **30% מהמחזור השנתי מוכרים אוטומטית כהוצאות** — ללא צורך בשמירת קבלות לצורך הניכוי. אושר בתיקון 257 לפקודת מס הכנסה.

> **תנאי סף**: `osekType === "patur"` בלבד. עוסק מורשה **אינו** יכול להיכנס למסלול זה.

> **תקרה**: שווה לתקרת עוסק פטור — `getTaxYearConstants(year).osekZeirThreshold` (120,000 ₪ ל-2024/2025, קפוא). אל תקשה.

---

## כיצד עובד החישוב

```
הכנסה ברוטו (מחזור)               = X
הוצאות מוכרות אוטומטיות (30%)    = X × 0.30
הכנסה חייבת                       = X × 0.70

→ המשתמש לא מגיש קבלות הוצאה ל-70% הנותרים.
   ה-30% ניכוי הוא סטטוטורי, לא דורש אסמכתאות.
```

**מקור בקוד**: `osekZeirExpenseRate: 0.30` ב-`getTaxYearConstants()` — `src/lib/calculators/types.ts`.

---

## מתי המסלול הזה עדיף

**עדיף מסלול עוסק זעיר (30% אוטומטי) כאשר:**
- ההוצאות הבפועל **נמוכות מ-30%** מהמחזור
- אין נכסים ברי-פחת (ציוד יקר, רכב — אלה מנוצלים טוב יותר בחישוב בפועל)
- המשתמש לא שומר קבלות באופן שיטתי ומעדיף פשטות

**עדיף מסלול עוסק פטור (הוצאות בפועל) כאשר:**
- ההוצאות הבפועל **עולות על 30%** מהמחזור
- יש הוצאות גדולות חד-פעמיות (ציוד, הכשרה) בשנה

### חישוב נקודת האיזון

```python
turnover = persona.income.totalRevenue
actual_expenses = persona.income.totalDeductibleExpenses
zeir_deduction = turnover * 0.30

if actual_expenses > zeir_deduction:
    recommendation = "עוסק פטור (הוצאות בפועל) — חיסכון: {:.0f} ₪".format(
        (actual_expenses - zeir_deduction) * marginal_tax_rate
    )
else:
    recommendation = "עוסק זעיר (30%) — חיסכון: {:.0f} ₪".format(
        (zeir_deduction - actual_expenses) * marginal_tax_rate
    )
```

> הצג חישוב זה בכל פעם שהמשתמש שואל "כמה ישלם" או "איזה מסלול עדיף".

---

## חובות ותהליכים — עוסק זעיר

כמו עוסק פטור, בתוספת:
- בחירת מסלול עוסק זעיר **עם הגשת הדו"ח השנתי** (לא ניתן לשנות בדיעבד לאותה שנה)
- מסמן בדו"ח 1301 כי בחר מסלול עוסק זעיר
- **עדיין** חייב בקבלות על **הכנסות** — ה-30% פוטר רק מתיעוד הוצאות

---

## הוצאות שמוכרות **בנוסף** ל-30%

גם עם מסלול זעיר, חלק מהניכויים הנוספים נשמרים:
- **קרן השתלמות לעצמאי** (שדה 137) — ניתן לנכות **בנוסף** ל-30%
- **ביטוח לאומי** (חלק ה-52% המוכר, שדה 030) — ניתן לנכות **בנוסף**
- **פנסיה/קרן פנסיה** לעצמאי — ניתן לנכות **בנוסף**

> אל תכלול ניכויים אלה בחישוב ה-30% — הם ניכויים נפרדים בטופס 1301.

---

## מתי להפעיל סקיל אחר

| מצב | סקיל לקריאה |
|---|---|
| הוצאות בפועל גדולות מ-30% מהמחזור | `israeli-osek-patur` (שקול מעבר) |
| מחזור עבר / עומד לעבור תקרת פטור | `israeli-osek-murshe` (חובה להירשם) |
| שאלה על ניכוי ביטוח לאומי / קרן השתלמות | `israeli-bituach-leumi` |
| שאלה ספציפית על קטגוריית הוצאה | `israeli-expense-categorizer` |
| מילוי שדות בטופס 1301 | `israeli-tax-returns` |

---

## Hook: זיהוי עוסק זעיר בתחילת session

```
if persona.business.osekType === "patur" AND persona.business.isOsekZeir === true:
    → טען סקיל זה (**israeli-osek-zeir**)
    → חשב zeir_deduction = totalRevenue × 0.30
    → השווה ל-totalDeductibleExpenses
    → הצג המלצת מסלול
```

---

## הבדל מרכזי ממורשה

עוסק זעיר **אינו** גובה מע"מ ואינו מגיש דוח"ות מע"מ. ברגע שהמחזור עובר את `osekZeirThreshold`, חלה חובת הרשמה כ**עוסק מורשה** — הפעל `israeli-osek-murshe` מיד.

---

## קבצים רלוונטיים בפרויקט

| קובץ | תוכן |
|---|---|
| `src/lib/calculators/types.ts` | `osekZeirExpenseRate: 0.30`, `osekZeirThreshold` |
| `src/lib/p-and-l/expense-ratio.ts` | לוגיקת פיצול 30% לדו"ח רווח-והפסד |
| `src/lib/persona.ts` | `PersonaBusiness.isOsekZeir: boolean` |
| `src/lib/alerts/ceiling.ts` | אזהרה כשמחזור מתקרב לתקרה |
| `personas/dana-cohen.json` | דוגמה — `isOsekZeir: false` (דנה על מסלול פטור רגיל) |
