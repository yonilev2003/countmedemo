---
name: israeli-osek-murshe
description: Rules, obligations, and workflow guidance for Israeli עוסק מורשה (VAT-registered sole proprietor) with annual turnover above the patur ceiling (~120,000 NIS). Handles VAT charging (17%), periodic VAT reports (Doch Maam), input VAT deduction, tax-invoice requirements (hashbonit mas), SHAAM allocation numbers, and transition from עוסק פטור. Auto-invoke when persona.business.osekType === "morshe", or when the user asks about מע"מ registration, charging VAT, דוח מע"מ, or crossing the patur ceiling. Do NOT use for VAT-exempt dealers (use israeli-osek-patur or israeli-osek-zeir), for corporate tax (Chevra Ba'am uses Form 1214 not 1301), or for VAT report preparation in detail (use israeli-vat-reporting for that).
license: MIT
allowed-tools: Read Edit Write Bash(python:*)
compatibility: Claude Code, Claude.ai
---

# עוסק מורשה — מדריך מלא

## מהו עוסק מורשה

עוסק מורשה הוא עצמאי (או עסק) שמחזורו השנתי **עולה על תקרת עוסק פטור** (120,000 ₪ ל-2024/2025 — `osekPaturThreshold` ב-`src/lib/calculators/types.ts`). חייב:
1. **לגבות מע"מ 17%** מכל לקוח (מלבד עסקאות פטורות/אפס)
2. **להגיש דוח"ות מע"מ** לרשות המסים (חודשי / דו-חודשי)
3. **לנהל ספרי חשבונות מלאים** (חשבוניות מס, קבלות, ספרי הזמנות)

> **מקור-אמת לתקרה**: `getTaxYearConstants(year).osekPaturThreshold` — אל תקשה.

---

## מסמכים חובה — עוסק מורשה

| מסמך | מתי | פרטים |
|---|---|---|
| חשבונית מס (hashbonit mas) | כל עסקה חייבת | מספר הקצאה מ-SHAAM (≥ 25,000 ₪ מ-2025) |
| חשבונית מס-קבלה | כשגובים גם תשלום | משולב |
| קבלה (doc-type 320) | לעסקאות פטורות | לא כולל מע"מ |
| ספר הזמנות | כשיש הזמנות מוקדמות | |
| ספר תקבולות | בחנות/שירות לציבור | |

**סקיל סמכות**: `israeli-e-invoice` לכל שאלות הפקת חשבוניות ומספרי הקצאה.

---

## תחשיבי מע"מ — עקרונות

```
מע"מ עסקאות (Output VAT) = סך מכירות × 17%
מע"מ תשומות (Input VAT)  = סך רכישות עסקיות × 17%  [בהתאם לכללי ניכוי]
חוב / זכות מע"מ נטו      = מע"מ עסקאות − מע"מ תשומות
```

**כללי ניכוי תשומות**:
- כלי רכב: 2/3 ניכוי (1/3 חסום — שימוש פרטי)
- אירוח: **לא מוכר** כתשומה
- ציוד / שירותים עסקיים: 100% (עם חשבונית מס תקינה)
- הוצאות מעורבות: יחסי עפ"י שימוש עסקי

---

## תדירות הגשת דוח"ות מע"מ

| מחזור שנתי | תדירות |
|---|---|
| > 1,500,000 ₪ | **חודשי** — עד ה-19 לחודש העוקב |
| ≤ 1,500,000 ₪ | **דו-חודשי** — עד ה-19 לחודש השני |

**מועד תשלום**: ה-15 לחודש (ידני) / ה-19 (אונליין). מוארך ל-23 למגישים מפורטים.

> לשאלות מפורטות על הגשת דוח מע"מ → הפעל `israeli-vat-reporting`.

---

## שדות בטופס 1301 — ייחודיים למורשה

| שדה | תיאור | הערה |
|---|---|---|
| **150** | הכנסה מעסק (ייגיעה אישית) | כולל כל המחזור |
| **238** | מחזור לא כולל מע"מ | הכנסה ברוטו ללא 17% |
| **030** | ביטוח לאומי לעצמאי | 52% מוכר (כמו פטור) |
| **137** | קרן השתלמות | מוכר גם למורשה |

**הבדל מפטור**: עוסק מורשה מדווח בטופס 1301 על **הכנסה ללא מע"מ** (המע"מ הוא עניין נפרד מול SHAAM).

---

## מעבר מעוסק פטור → מורשה

### מתי נדרש המעבר
```
if turnover_this_year > osekPaturThreshold:
    → חובת הרשמה מחודש החריגה
    → עד 30 יום לפני החריגה הצפויה (אפשרי להירשם מוקדם)
```

### שלבי המעבר
1. **הגשת בקשה לרישום** — קישור: `https://www.misim.gov.il` (מסים מקוון)
2. **קבלת מספר עוסק מורשה** (זהה לת"ז לרוב)
3. **שינוי כל המסמכים** — קבלות → חשבוניות מס
4. **רכישת תוכנת חשבונות** שמפיקה חשבוניות עם SHAAM

### עדכון בקוד
```typescript
// personas/dana-cohen.json או כל פרסונה
persona.business.osekType = "morshe";
persona.business.isOsekZeir = false;  // לא רלוונטי למורשה
```
לאחר שינוי זה, `calculateTaxForPersona()` מסלק את ה-30% ומחשב הוצאות בפועל.

---

## מתי להפעיל סקיל אחר

| מצב | סקיל לקריאה |
|---|---|
| הכנת / חישוב דוח מע"מ (874) | `israeli-vat-reporting` |
| שאלה על קטגוריית הוצאה (% ניכוי) | `israeli-expense-categorizer` |
| חישוב ביטוח לאומי (שדה 030) | `israeli-bituach-leumi` |
| שאלות על חשבוניות מס / SHAAM | `israeli-e-invoice` |
| הכנת דו"ח שנתי 1301 | `israeli-tax-returns` |
| ניתוח רווח-והפסד שנתי | `israeli-financial-reports` |
| משתמש מתחת לתקרה (עדיין פטור) | `israeli-osek-patur` או `israeli-osek-zeir` |

---

## Hook: זיהוי מורשה בתחילת session

```
if persona.business.osekType === "morshe":
    → טען סקיל זה (israeli-osek-murshe)
    → זיהוי תדירות דיווח מע"מ (חודשי/דו-חודשי)
    → בדיקת מועד הגשה הקרוב
    → הצג סטטוס: האם יש חשבוניות שלא נכללו בדוח האחרון
```

---

## הבדל מרכזי ממסלולי הפטור

| | עוסק פטור | עוסק זעיר | עוסק מורשה |
|---|---|---|---|
| גובה מע"מ | ❌ | ❌ | ✅ 17% |
| מנכה תשומות | ❌ | ❌ | ✅ |
| דוח מע"מ | ❌ | ❌ | ✅ חודשי/דו-חודשי |
| חשבונית מס | ❌ (קבלה בלבד) | ❌ | ✅ חובה |
| מסלול הוצאות | בפועל | 30% אוטומטי | **בפועל בלבד** |

---

## קבצים רלוונטיים בפרויקט

| קובץ | תוכן |
|---|---|
| `src/lib/persona.ts` | `OsekType = "patur" | "morshe"` |
| `src/lib/invoice-generator/index.ts` | `calculateInvoiceTotals` (VAT logic by osekType) |
| `src/lib/alerts/index.ts` | `getOsekType()` — מחזיר "osek-patur" / "osek-murshe" |
| `src/lib/alerts/ceiling.ts` | מעבר פטור→מורשה + אזהרות |
| `src/lib/calculators/index.ts` | כל 8 calculators — קוראים `osekType` |
| `src/lib/regulatory/deductions.ts` | ניכויים + `plImpact` per osekType |
