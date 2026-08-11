/**
 * GENERATED FILE — do not edit by hand.
 * Source: data/expense-recognition/2026.xlsx
 * Regenerate: npm run gen:expense-data (scripts/expense-engine/generate.ts)
 */
import type { ExpenseDataset } from "../types";

export const DATASET_2026: ExpenseDataset = {
  "datasetYear": 2026,
  "generatedAt": "2026-08-11",
  "rules": [
    {
      "ruleId": "VEH-01",
      "category": "רכב",
      "nameHe": "רכב פרטי M1 (עד 3,500 ק\"ג)",
      "formula": {
        "kind": "vehicle-max",
        "floorRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "conditionHe": "הגבוה מבין: (הוצאות פחות שווי שימוש) או 45% מההוצאות",
      "legalSourceHe": "תק' 2(1) לתקנות ניכוי הוצאות רכב (התשנ\"ה-1995)",
      "confidence": "A"
    },
    {
      "ruleId": "VEH-02",
      "category": "רכב",
      "nameHe": "אופנוע L3",
      "formula": {
        "kind": "vehicle-max",
        "floorRate": 0.25,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.25,
      "vatFraction": 0.667,
      "conditionHe": "הגבוה מבין: (הוצאות פחות שווי שימוש) או 25%",
      "legalSourceHe": "תק' 2(1)(א) לתקנות ניכוי הוצאות רכב",
      "confidence": "A"
    },
    {
      "ruleId": "VEH-03",
      "category": "רכב",
      "nameHe": "מונית / אוטובוס ציבורי (M1 סיווג משנה)",
      "formula": {
        "kind": "vehicle-max",
        "floorRate": 0.9,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.9,
      "vatFraction": 1,
      "conditionHe": "הגבוה מבין: (הוצאות פחות שווי שימוש) או 90%",
      "legalSourceHe": "תק' 2(1ב) לתקנות ניכוי הוצאות רכב",
      "confidence": "A"
    },
    {
      "ruleId": "VEH-04",
      "category": "רכב",
      "nameHe": "רכב סיור / רכב מדברי",
      "formula": {
        "kind": "vehicle-max",
        "floorRate": 0.8,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.8,
      "vatFraction": 1,
      "conditionHe": "הגבוה מבין: (הוצאות פחות שווי שימוש) או 80%",
      "legalSourceHe": "תק' 2(1ג) לתקנות ניכוי הוצאות רכב",
      "confidence": "A"
    },
    {
      "ruleId": "VEH-05",
      "category": "רכב",
      "nameHe": "רכב להוראת נהיגה",
      "formula": {
        "kind": "vehicle-max",
        "floorRate": 0.775,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.775,
      "vatFraction": 1,
      "conditionHe": "77.5%; אם בבעלות שני רכבים ורק אחד אוטומטי - 68%",
      "legalSourceHe": "תק' 2(1ד) לתקנות ניכוי הוצאות רכב",
      "confidence": "A"
    },
    {
      "ruleId": "VEH-06",
      "category": "רכב",
      "nameHe": "רכב מעל 3,500 ק\"ג (משאית/אוטובוס)",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "מחוץ להגדרת \"רכב\" בתקנות - מלוא ההוצאות + מע\"מ מלא, כולל ברכישה",
      "legalSourceHe": "הגדרת \"רכב\" בתק' 1 לתקנות ניכוי הוצאות רכב",
      "confidence": "A"
    },
    {
      "ruleId": "VEH-07",
      "category": "רכב",
      "nameHe": "רכב תפעולי / רכב עבודה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "מוחרג מהגדרת \"רכב\"; דורש הוכחת אי-שימוש פרטי",
      "legalSourceHe": "הגדרת \"רכב\" בתק' 1 לתקנות ניכוי הוצאות רכב",
      "confidence": "A"
    },
    {
      "ruleId": "VEH-08",
      "category": "רכב",
      "nameHe": "תחבורה ציבורית / מונית / רכבת לצורך עסקי",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "100% - אינה \"הוצאת החזקת רכב\"",
      "legalSourceHe": "סעיף 17 לפקודה",
      "confidence": "B"
    },
    {
      "ruleId": "VEH-09",
      "category": "רכב",
      "nameHe": "נסיעה מהבית למקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0,
        "vatRate": 0
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "לא מוכרת - הוצאה פרטית",
      "legalSourceHe": "הלכת בן-שלום ופסיקה עקבית",
      "confidence": "B"
    },
    {
      "ruleId": "COM-01",
      "category": "תקשורת",
      "nameHe": "טלפון נייד (רט\"ן)",
      "formula": {
        "kind": "reduce-min-cap",
        "capNis": 1380,
        "rate": 0.5,
        "vatRate": 0.667
      },
      "incomeTaxFraction": null,
      "vatFraction": 0.667,
      "conditionHe": "לא יותר בניכוי הנמוך מבין 1,380 ₪ לשנה או 50% מההוצאה. כלומר: ניכוי = הוצאה פחות MIN(1380, 50%×הוצאה). עד 2,760 ₪ שנתי -> 50%. מעל -> הוצאה פחות 1,380 ₪. הסכום תקף 2023-2027.",
      "legalSourceHe": "תק' 2(3) לתקנות מ\"ה (ניכוי הוצאות מסויימות), התשל\"ב-1972",
      "confidence": "A"
    },
    {
      "ruleId": "COM-02",
      "category": "תקשורת",
      "nameHe": "טלפון קווי בבית המגורים - עד 26,600 ₪ לשנה",
      "formula": {
        "kind": "custom",
        "formulaTextHe": "רק אם הוכח שהבית משמש את עיקר העסק. ניכוי = הנמוך מבין 80% מההוצאה או החלק העולה על 2,700 ₪. סכומים תקפים 2024-2027.",
        "vatRate": null
      },
      "incomeTaxFraction": null,
      "vatFraction": null,
      "conditionHe": "רק אם הוכח שהבית משמש את עיקר העסק. ניכוי = הנמוך מבין 80% מההוצאה או החלק העולה על 2,700 ₪. סכומים תקפים 2024-2027.",
      "legalSourceHe": "תק' 2(2)(א)(1) לתקנות ניכוי הוצאות מסויימות",
      "confidence": "A"
    },
    {
      "ruleId": "COM-03",
      "category": "תקשורת",
      "nameHe": "טלפון קווי בבית המגורים - מעל 26,600 ₪ לשנה",
      "formula": {
        "kind": "custom",
        "formulaTextHe": "ניכוי = החלק העולה על 5,300 ₪ בלבד. תקף 2024-2027.",
        "vatRate": null
      },
      "incomeTaxFraction": null,
      "vatFraction": null,
      "conditionHe": "ניכוי = החלק העולה על 5,300 ₪ בלבד. תקף 2024-2027.",
      "legalSourceHe": "תק' 2(2)(א)(2) לתקנות ניכוי הוצאות מסויימות",
      "confidence": "A"
    },
    {
      "ruleId": "COM-04",
      "category": "תקשורת",
      "nameHe": "טלפון קווי במקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "100%",
      "legalSourceHe": "סעיף 17 לפקודה",
      "confidence": "B"
    },
    {
      "ruleId": "COM-05",
      "category": "תקשורת",
      "nameHe": "אינטרנט במקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "100%",
      "legalSourceHe": "סעיף 17 לפקודה",
      "confidence": "B"
    },
    {
      "ruleId": "COM-06",
      "category": "תקשורת",
      "nameHe": "שיחות לחו\"ל מהבית",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "מוכר במלואו בתנאי רישום: תאריך, שעה, יעד, פרטי מקבל, משך, נושא, מחיר",
      "legalSourceHe": "תק' 2(2) לתקנות ניכוי הוצאות מסויימות",
      "confidence": "A"
    },
    {
      "ruleId": "HOM-01",
      "category": "עבודה מהבית",
      "nameHe": "שכירות/משכנתא/ארנונה/חשמל בדירת מגורים",
      "formula": {
        "kind": "custom",
        "formulaTextHe": "לפי יחס שטח/חדרים המשמשים את העסק. נוהג: 3 חדרים ~33%, 4 ~25%, 5 ~20%. אין שיעור קבוע בתקנות - נקבע מול פקיד שומה.",
        "vatRate": null
      },
      "incomeTaxFraction": null,
      "vatFraction": null,
      "conditionHe": "לפי יחס שטח/חדרים המשמשים את העסק. נוהג: 3 חדרים ~33%, 4 ~25%, 5 ~20%. אין שיעור קבוע בתקנות - נקבע מול פקיד שומה.",
      "legalSourceHe": "סעיף 17 לפקודה + נוהג מקצועי",
      "confidence": "C"
    },
    {
      "ruleId": "HOM-02",
      "category": "עבודה מהבית",
      "nameHe": "ציוד לדירה המשמש גם עסקית",
      "formula": {
        "kind": "custom",
        "formulaTextHe": "אותו אחוז שנקבע להוצאות הדירה השוטפות",
        "vatRate": null
      },
      "incomeTaxFraction": null,
      "vatFraction": null,
      "conditionHe": "אותו אחוז שנקבע להוצאות הדירה השוטפות",
      "legalSourceHe": "נוהג מקצועי",
      "confidence": "C"
    },
    {
      "ruleId": "ENT-01",
      "category": "כיבוד ואירוח",
      "nameHe": "כיבוד קל במקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.8,
        "vatRate": 0
      },
      "incomeTaxFraction": 0.8,
      "vatFraction": 0,
      "conditionHe": "80% למס הכנסה. מע\"מ תשומות על כיבוד לא מותר בקיזוז.",
      "legalSourceHe": "תק' 2(1) לתקנות ניכוי הוצאות מסויימות + תק' 15א לתקנות מע\"מ",
      "confidence": "A"
    },
    {
      "ruleId": "ENT-02",
      "category": "כיבוד ואירוח",
      "nameHe": "אירוח בארץ",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0,
        "vatRate": 0
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "לא מוכר כלל",
      "legalSourceHe": "תק' 2(4) לתקנות ניכוי הוצאות מסויימות",
      "confidence": "A"
    },
    {
      "ruleId": "ENT-03",
      "category": "כיבוד ואירוח",
      "nameHe": "אירוח אורח מחו\"ל",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "conditionHe": "ללא תקרה, בתנאי סבירות ורישום: שם האורח, ארץ מוצא, ימי אירוח, נסיבות, קשר, סכום",
      "legalSourceHe": "תק' 2(4) לתקנות ניכוי הוצאות מסויימות",
      "confidence": "A"
    },
    {
      "ruleId": "ENT-04",
      "category": "כיבוד ואירוח",
      "nameHe": "ארוחות של העצמאי לעצמו",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0,
        "vatRate": 0
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "לא מוכר - הוצאה פרטית",
      "legalSourceHe": "סעיף 32(1) לפקודה",
      "confidence": "A"
    },
    {
      "ruleId": "GFT-01",
      "category": "מתנות",
      "nameHe": "מתנה לספק/לקוח בישראל",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "עד 240 ₪ לאדם לשנה (תקף 2024-2027). חובת רישום: זהות מקבל, מקום, קבלה.",
      "legalSourceHe": "תק' 2(5) לתקנות ניכוי הוצאות מסויימות",
      "confidence": "A"
    },
    {
      "ruleId": "GFT-02",
      "category": "מתנות",
      "nameHe": "מתנה מחוץ לישראל",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "conditionHe": "עד 15$ לאדם לשנה",
      "legalSourceHe": "תק' 2(5) לתקנות ניכוי הוצאות מסויימות",
      "confidence": "A"
    },
    {
      "ruleId": "CLO-01",
      "category": "ביגוד",
      "nameHe": "ביגוד שניתן לשימוש פרטי",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.8,
        "vatRate": 0.8
      },
      "incomeTaxFraction": 0.8,
      "vatFraction": 0.8,
      "conditionHe": "80% - כשחובה ללבוש בעבודה אך ניתן ללבוש גם פרטית (למשל חולצה לבנה לעו\"ד)",
      "legalSourceHe": "תק' 2(6) לתקנות ניכוי הוצאות מסויימות",
      "confidence": "A"
    },
    {
      "ruleId": "CLO-02",
      "category": "ביגוד",
      "nameHe": "ביגוד שלא ניתן לשימוש פרטי / עם לוגו בולט",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "100% - מדים, חלוק, סרבל, נעלי בטיחות, ביגוד עם סימון בולט של העסק",
      "legalSourceHe": "תק' 2(6) לתקנות ניכוי הוצאות מסויימות",
      "confidence": "A"
    },
    {
      "ruleId": "ABR-01",
      "category": "נסיעות חו\"ל",
      "nameHe": "כרטיס טיסה - מחלקת תיירים/עסקים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "conditionHe": "100%. במחלקה ראשונה - עד מחיר כרטיס עסקים באותה טיסה.",
      "legalSourceHe": "תק' 2(2) לתקנות ניכוי הוצאות מסויימות",
      "confidence": "A"
    },
    {
      "ruleId": "ABR-02",
      "category": "נסיעות חו\"ל",
      "nameHe": "לינה - 7 לילות ראשונים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "conditionHe": "מלוא ההוצאה, עד 365$ ללילה (2026)",
      "legalSourceHe": "תק' 2(2)(ב) לתקנות ניכוי הוצאות מסויימות",
      "confidence": "A"
    },
    {
      "ruleId": "ABR-03",
      "category": "נסיעות חו\"ל",
      "nameHe": "לינה - מהלילה ה-8 ואילך",
      "formula": {
        "kind": "custom",
        "formulaTextHe": "לילה עד 160$ -> מלא. לילה מעל 160$ -> 75% מההוצאה המוכרת, אך לא פחות מ-160$. תקרת \"הוצאת לינה מוכרת\": 365$ (2026)",
        "vatRate": 0
      },
      "incomeTaxFraction": null,
      "vatFraction": 0,
      "conditionHe": "לילה עד 160$ -> מלא. לילה מעל 160$ -> 75% מההוצאה המוכרת, אך לא פחות מ-160$. תקרת \"הוצאת לינה מוכרת\": 365$ (2026)",
      "legalSourceHe": "תק' 2(2)(ב) לתקנות ניכוי הוצאות מסויימות",
      "confidence": "A"
    },
    {
      "ruleId": "ABR-04",
      "category": "נסיעות חו\"ל",
      "nameHe": "אש\"ל - כשנדרשו גם הוצאות לינה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "conditionHe": "עד 102$ ליום שהייה (2026)",
      "legalSourceHe": "תק' 2(2)(ג)(1) לתקנות ניכוי הוצאות מסויימות",
      "confidence": "A"
    },
    {
      "ruleId": "ABR-05",
      "category": "נסיעות חו\"ל",
      "nameHe": "אש\"ל - כשלא נדרשו הוצאות לינה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "conditionHe": "עד 171$ ליום שהייה (2026)",
      "legalSourceHe": "תק' 2(2)(ג)(2) לתקנות ניכוי הוצאות מסויימות",
      "confidence": "A"
    },
    {
      "ruleId": "ABR-06",
      "category": "נסיעות חו\"ל",
      "nameHe": "שכירת רכב בחו\"ל",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "conditionHe": "עד 80$ ליום (2026) - כולל דלק וכל הוצאות ההחזקה",
      "legalSourceHe": "תק' 2(2)(ד) לתקנות ניכוי הוצאות מסויימות",
      "confidence": "A"
    },
    {
      "ruleId": "ABR-07",
      "category": "נסיעות חו\"ל",
      "nameHe": "מדינות מועדפות - תוספת 25%",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "conditionHe": "125% מהסכומים בלינה ואש\"ל. הרשימה כוללת: אוסטרליה, אוסטריה, איטליה, איסלנד, אירלנד, אנגולה, בלגיה, גרמניה, דובאי, דנמרק, הולנד, הונג קונג, בריטניה, טייוואן, יוון, יפן, לוקסמבורג, נורווגיה, ספרד, עומאן, פינלנד, צרפת, קטאר, קוריאה, קמרון, קנדה, שבדיה, שווייץ",
      "legalSourceHe": "קביעת מ\"ה (רשימת מקומות לענין ניכוי הוצאות בחו\"ל), התשס\"ו-2005",
      "confidence": "A"
    },
    {
      "ruleId": "SOC-01",
      "category": "ביטוח וחיסכון",
      "nameHe": "דמי ביטוח לאומי ששילם עצמאי",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.52,
        "vatRate": 0
      },
      "incomeTaxFraction": 0.52,
      "vatFraction": 0,
      "conditionHe": "52% מהסכום ששולם. לא כולל דמי ביטוח בריאות, קנסות והפרשי הצמדה על פיגורים. הניכוי לא יעלה על ההכנסה החייבת שלפני הניכוי.",
      "legalSourceHe": "סעיף 47א לפקודת מס הכנסה",
      "confidence": "A"
    },
    {
      "ruleId": "SOC-02",
      "category": "ביטוח וחיסכון",
      "nameHe": "קרן השתלמות לעצמאי",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "conditionHe": "ניכוי עד 4.5% מההכנסה הקובעת. הכנסה מזכה מרבית 2026: 293,397 ₪. ניכוי מרבי 2026: 13,203 ₪. תקרה מוטבת לפטור ממס רווח הון 2026: 20,566 ₪.",
      "legalSourceHe": "סעיף 17(5א) לפקודה + הודעת רשות המסים לשנת 2026",
      "confidence": "A"
    },
    {
      "ruleId": "SOC-03",
      "category": "ביטוח וחיסכון",
      "nameHe": "הפקדה לפנסיה / קופ\"ג לעצמאי",
      "formula": {
        "kind": "custom",
        "formulaTextHe": "ניכוי לפי סעיף 47 + זיכוי 35% לפי סעיף 45א, בכפוף לתקרות",
        "vatRate": 0
      },
      "incomeTaxFraction": null,
      "vatFraction": 0,
      "conditionHe": "ניכוי לפי סעיף 47 + זיכוי 35% לפי סעיף 45א, בכפוף לתקרות",
      "legalSourceHe": "סעיפים 45א, 47 לפקודה",
      "confidence": "B"
    },
    {
      "ruleId": "SOC-04",
      "category": "ביטוח וחיסכון",
      "nameHe": "ביטוח אובדן כושר עבודה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "conditionHe": "ניכוי עד 3.5% מההכנסה החייבת, בכפוף לתקרה",
      "legalSourceHe": "סעיף 32(14) לפקודה + תקנות מ\"ה (ניכוי הוצאות מסויימות - ביטוח מועדף)",
      "confidence": "B"
    },
    {
      "ruleId": "SOC-05",
      "category": "ביטוח וחיסכון",
      "nameHe": "ביטוח חיים / בריאות פרטי",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0,
        "vatRate": 0
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "לא מוכר כהוצאה עסקית (עשוי לזכות בזיכוי אישי)",
      "legalSourceHe": "סעיף 32(1) לפקודה",
      "confidence": "B"
    },
    {
      "ruleId": "DEP-01",
      "category": "פחת",
      "nameHe": "מחשבים אישיים וציוד היקפי",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "conditionHe": "33% לשנה",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941 - סעיף מחשבים",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-02",
      "category": "פחת",
      "nameHe": "מחשבים אחרים / שרתים",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.25,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.25,
      "vatFraction": 1,
      "conditionHe": "25% לשנה",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-03",
      "category": "פחת",
      "nameHe": "תוכנת מחשב",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "conditionHe": "מסווגת כחלק מהמחשבים: 33% (אישי) או 25% (אחר)",
      "legalSourceHe": "עמדת רשות המסים; חוזר מ\"ה 15/2002",
      "confidence": "B"
    },
    {
      "ruleId": "DEP-04",
      "category": "פחת",
      "nameHe": "אתר אינטרנט - עלויות הקמה",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "conditionHe": "מהוונות ומופחתות כמחשבים (25%-33%)",
      "legalSourceHe": "חוזר מ\"ה 15/2002",
      "confidence": "B"
    },
    {
      "ruleId": "DEP-05",
      "category": "פחת",
      "nameHe": "ציוד אלקטרוני",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "conditionHe": "15% לשנה",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941 - סעיף יד(1)",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-06",
      "category": "פחת",
      "nameHe": "ריהוט ואביזרים - כללי",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.06,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.06,
      "vatFraction": 1,
      "conditionHe": "6% לשנה",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-07",
      "category": "פחת",
      "nameHe": "ריהוט וציוד בתי קפה ומסעדות",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.12,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.12,
      "vatFraction": 1,
      "conditionHe": "12% לשנה",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-08",
      "category": "פחת",
      "nameHe": "מכונת אספרסו",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "conditionHe": "20% לשנה - סעיף מפורש בתקנות",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-09",
      "category": "פחת",
      "nameHe": "ציוד מטבח כללי",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.07,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.07,
      "vatFraction": 1,
      "conditionHe": "7% לשנה",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "B"
    },
    {
      "ruleId": "DEP-10",
      "category": "פחת",
      "nameHe": "ציוד ומכונות - כללי",
      "formula": {
        "kind": "custom",
        "formulaTextHe": "10%-20% לפי סוג הציוד",
        "vatRate": 1
      },
      "incomeTaxFraction": null,
      "vatFraction": 1,
      "conditionHe": "10%-20% לפי סוג הציוד",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "B"
    },
    {
      "ruleId": "DEP-11",
      "category": "פחת",
      "nameHe": "רכב פרטי / אופנוע / טנדר עד 3 טון",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.15,
        "vatRate": null
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": null,
      "conditionHe": "15% לשנה. הפחת עצמו כפוף למגבלת 45% (או השיעור הרלוונטי לסוג הרכב).",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941 + תקנות ניכוי הוצאות רכב",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-12",
      "category": "פחת",
      "nameHe": "מונית / אוטובוס / משאית / טנדר מעל 3 טון",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.2,
        "vatRate": null
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": null,
      "conditionHe": "20% לשנה",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-13",
      "category": "פחת",
      "nameHe": "רכב ללימוד נהיגה",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.25,
        "vatRate": null
      },
      "incomeTaxFraction": 0.25,
      "vatFraction": null,
      "conditionHe": "25% לשנה",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-14",
      "category": "פחת",
      "nameHe": "מבנים",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.04,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.04,
      "vatFraction": 1,
      "conditionHe": "2%-4% לפי סוג המבנה והשימוש",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-15",
      "category": "פחת",
      "nameHe": "שיפורים במושכר",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.1,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.1,
      "vatFraction": 1,
      "conditionHe": "10% לשנה, או לפי תקופת השכירות אם קצרה יותר",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "B"
    },
    {
      "ruleId": "STA-01",
      "category": "מעמד ומסלול",
      "nameHe": "תקרת עוסק פטור",
      "formula": {
        "kind": "custom",
        "formulaTextHe": "122,833 ₪ מחזור שנתי (2026). מעל - חובת מעבר לעוסק מורשה.",
        "vatRate": null
      },
      "incomeTaxFraction": null,
      "vatFraction": null,
      "conditionHe": "122,833 ₪ מחזור שנתי (2026). מעל - חובת מעבר לעוסק מורשה.",
      "legalSourceHe": "חוק מע\"מ + הודעת רשות המסים לשנת 2026",
      "confidence": "A"
    },
    {
      "ruleId": "STA-02",
      "category": "מעמד ומסלול",
      "nameHe": "מסלול עוסק זעיר - ניכוי נורמטיבי",
      "formula": {
        "kind": "custom",
        "formulaTextHe": "ניכוי אוטומטי של 30% מהמחזור ללא הוכחת הוצאות. תקרת מחזור 2026: 122,833 ₪ (צמודה לתקרת עוסק פטור). תנאים: עבודה אישית, ללא עובדים, הכנסה מיגיעה אישית.",
        "vatRate": null
      },
      "incomeTaxFraction": 0.3,
      "vatFraction": null,
      "conditionHe": "ניכוי אוטומטי של 30% מהמחזור ללא הוכחת הוצאות. תקרת מחזור 2026: 122,833 ₪ (צמודה לתקרת עוסק פטור). תנאים: עבודה אישית, ללא עובדים, הכנסה מיגיעה אישית.",
      "legalSourceHe": "פרק חדש בחלק ד' לפקודה - רפורמת בעל עסק זעיר",
      "confidence": "A"
    },
    {
      "ruleId": "STA-03",
      "category": "מעמד ומסלול",
      "nameHe": "עוסק פטור - מע\"מ תשומות",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0,
        "vatRate": 0
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "עוסק פטור אינו מקזז מע\"מ. המע\"מ ששולם מתווסף לסכום ההוצאה לצורכי מס הכנסה.",
      "legalSourceHe": "חוק מע\"מ",
      "confidence": "A"
    },
    {
      "ruleId": "STA-04",
      "category": "מעמד ומסלול",
      "nameHe": "שיעור מע\"מ",
      "formula": {
        "kind": "custom",
        "formulaTextHe": "18% (החל מ-1.1.2025)",
        "vatRate": 0.18
      },
      "incomeTaxFraction": null,
      "vatFraction": 0.18,
      "conditionHe": "18% (החל מ-1.1.2025)",
      "legalSourceHe": "חוק מע\"מ",
      "confidence": "A"
    },
    {
      "ruleId": "NON-01",
      "category": "לא מוכר",
      "nameHe": "קנסות, דוחות חניה ותנועה",
      "formula": {
        "kind": "non-deductible"
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "לא מוכר",
      "legalSourceHe": "סעיף 32 לפקודה",
      "confidence": "A"
    },
    {
      "ruleId": "NON-02",
      "category": "לא מוכר",
      "nameHe": "עסקה במזומן מעל 6,000 ₪ שבגינה הוטל עיצום",
      "formula": {
        "kind": "non-deductible"
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "חל על עסקאות מיום 1.1.2026. התקרה 6,000 ₪ נכון ל-2026.",
      "legalSourceHe": "חוק לצמצום השימוש במזומן + סעיף 32 לפקודה",
      "confidence": "A"
    },
    {
      "ruleId": "NON-03",
      "category": "לא מוכר",
      "nameHe": "חשבונית ללא מספר הקצאה",
      "formula": {
        "kind": "non-deductible"
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "חל על חשבוניות שהוצאו מיום 1.8.2025 ומעלה סף ההקצאה. ההוצאה כולה נפסלת.",
      "legalSourceHe": "מודל חשבוניות ישראל - חוק ההסדרים",
      "confidence": "A"
    },
    {
      "ruleId": "NON-04",
      "category": "לא מוכר",
      "nameHe": "מע\"מ ברכישת רכב פרטי (M1 עד 3.5 טון)",
      "formula": {
        "kind": "non-deductible"
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "אין קיזוז מע\"מ תשומות ברכישה",
      "legalSourceHe": "תק' 14 לתקנות מע\"מ",
      "confidence": "A"
    },
    {
      "ruleId": "NON-05",
      "category": "לא מוכר",
      "nameHe": "הוצאות לימודים להסבה מקצועית / תואר ראשון",
      "formula": {
        "kind": "non-deductible"
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "הוצאה הונית או פרטית. רק השתלמות לשימור הידע הקיים מוכרת.",
      "legalSourceHe": "סעיף 17 + הלכת בנק יהב ופסיקה",
      "confidence": "B"
    },
    {
      "ruleId": "NON-06",
      "category": "לא מוכר",
      "nameHe": "הוצאות פרטיות (מזון יומי, ביגוד רגיל, בילויים)",
      "formula": {
        "kind": "non-deductible"
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "לא מוכר",
      "legalSourceHe": "סעיף 32(1) לפקודה",
      "confidence": "A"
    }
  ],
  "professions": [
    {
      "id": "P001",
      "verticalId": "V01",
      "verticalNameHe": "משפט, ראיית חשבון וייעוץ",
      "nameHe": "עורך דין",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45
    },
    {
      "id": "P002",
      "verticalId": "V01",
      "verticalNameHe": "משפט, ראיית חשבון וייעוץ",
      "nameHe": "רואה חשבון",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "statusNoteHe": "חייב עוסק מורשה ללא קשר למחזור",
      "expenseCountHint": 6
    },
    {
      "id": "P003",
      "verticalId": "V01",
      "verticalNameHe": "משפט, ראיית חשבון וייעוץ",
      "nameHe": "יועץ מס",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "statusNoteHe": "חייב עוסק מורשה ללא קשר למחזור",
      "expenseCountHint": 4
    },
    {
      "id": "P004",
      "verticalId": "V01",
      "verticalNameHe": "משפט, ראיית חשבון וייעוץ",
      "nameHe": "יועץ עסקי / אסטרטגי",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P005",
      "verticalId": "V01",
      "verticalNameHe": "משפט, ראיית חשבון וייעוץ",
      "nameHe": "מגשר / בורר",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 3
    },
    {
      "id": "P006",
      "verticalId": "V01",
      "verticalNameHe": "משפט, ראיית חשבון וייעוץ",
      "nameHe": "נוטריון / מתרגם משפטי",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 3
    },
    {
      "id": "P007",
      "verticalId": "V02",
      "verticalNameHe": "פיננסים, ביטוח ונדל\"ן",
      "nameHe": "סוכן ביטוח",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P008",
      "verticalId": "V02",
      "verticalNameHe": "פיננסים, ביטוח ונדל\"ן",
      "nameHe": "יועץ משכנתאות",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 3
    },
    {
      "id": "P009",
      "verticalId": "V02",
      "verticalNameHe": "פיננסים, ביטוח ונדל\"ן",
      "nameHe": "מתווך נדל\"ן",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 6
    },
    {
      "id": "P010",
      "verticalId": "V02",
      "verticalNameHe": "פיננסים, ביטוח ונדל\"ן",
      "nameHe": "שמאי מקרקעין",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "statusNoteHe": "חייב עוסק מורשה ללא קשר למחזור",
      "expenseCountHint": 5
    },
    {
      "id": "P011",
      "verticalId": "V02",
      "verticalNameHe": "פיננסים, ביטוח ונדל\"ן",
      "nameHe": "יועץ השקעות / מנהל תיקים",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 3
    },
    {
      "id": "P012",
      "verticalId": "V02",
      "verticalNameHe": "פיננסים, ביטוח ונדל\"ן",
      "nameHe": "מנהל חשבונות / חשב שכר",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 3
    },
    {
      "id": "P013",
      "verticalId": "V03",
      "verticalNameHe": "רפואה ובריאות",
      "nameHe": "רופא - קליניקה פרטית",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "statusNoteHe": "חייב עוסק מורשה ללא קשר למחזור",
      "expenseCountHint": 10
    },
    {
      "id": "P014",
      "verticalId": "V03",
      "verticalNameHe": "רפואה ובריאות",
      "nameHe": "רופא שיניים",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "statusNoteHe": "חייב עוסק מורשה ללא קשר למחזור",
      "expenseCountHint": 7
    },
    {
      "id": "P015",
      "verticalId": "V03",
      "verticalNameHe": "רפואה ובריאות",
      "nameHe": "וטרינר",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "statusNoteHe": "חייב עוסק מורשה ללא קשר למחזור",
      "expenseCountHint": 7
    },
    {
      "id": "P016",
      "verticalId": "V03",
      "verticalNameHe": "רפואה ובריאות",
      "nameHe": "פיזיותרפיסט",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P017",
      "verticalId": "V03",
      "verticalNameHe": "רפואה ובריאות",
      "nameHe": "דיאטן/ית קליני/ת",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P018",
      "verticalId": "V03",
      "verticalNameHe": "רפואה ובריאות",
      "nameHe": "קלינאי תקשורת / מרפא בעיסוק",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P019",
      "verticalId": "V03",
      "verticalNameHe": "רפואה ובריאות",
      "nameHe": "מטפל ברפואה משלימה",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P020",
      "verticalId": "V04",
      "verticalNameHe": "בריאות הנפש וטיפול רגשי",
      "nameHe": "פסיכולוג",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 6
    },
    {
      "id": "P021",
      "verticalId": "V04",
      "verticalNameHe": "בריאות הנפש וטיפול רגשי",
      "nameHe": "פסיכיאטר",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "statusNoteHe": "חייב עוסק מורשה ללא קשר למחזור",
      "expenseCountHint": 5
    },
    {
      "id": "P022",
      "verticalId": "V04",
      "verticalNameHe": "בריאות הנפש וטיפול רגשי",
      "nameHe": "עובד סוציאלי קליני",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 3
    },
    {
      "id": "P023",
      "verticalId": "V04",
      "verticalNameHe": "בריאות הנפש וטיפול רגשי",
      "nameHe": "מטפל בהבעה ויצירה",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P024",
      "verticalId": "V04",
      "verticalNameHe": "בריאות הנפש וטיפול רגשי",
      "nameHe": "מאמן אישי / קואצ'ר",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P025",
      "verticalId": "V04",
      "verticalNameHe": "בריאות הנפש וטיפול רגשי",
      "nameHe": "מטפל זוגי ומשפחתי",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 3
    },
    {
      "id": "P026",
      "verticalId": "V05",
      "verticalNameHe": "הייטק, תוכנה ודיגיטל",
      "nameHe": "מפתח תוכנה פרילנסר",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 6
    },
    {
      "id": "P027",
      "verticalId": "V05",
      "verticalNameHe": "הייטק, תוכנה ודיגיטל",
      "nameHe": "מעצב UX/UI",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P028",
      "verticalId": "V05",
      "verticalNameHe": "הייטק, תוכנה ודיגיטל",
      "nameHe": "מהנדס DevOps / SRE",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P029",
      "verticalId": "V05",
      "verticalNameHe": "הייטק, תוכנה ודיגיטל",
      "nameHe": "יועץ סייבר / Pentester",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P030",
      "verticalId": "V05",
      "verticalNameHe": "הייטק, תוכנה ודיגיטל",
      "nameHe": "אנליסט דאטה / BI",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 3
    },
    {
      "id": "P031",
      "verticalId": "V05",
      "verticalNameHe": "הייטק, תוכנה ודיגיטל",
      "nameHe": "מנהל מוצר עצמאי",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 2
    },
    {
      "id": "P032",
      "verticalId": "V05",
      "verticalNameHe": "הייטק, תוכנה ודיגיטל",
      "nameHe": "מפתח אפליקציות מובייל",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P033",
      "verticalId": "V06",
      "verticalNameHe": "עיצוב, מדיה ויצירה חזותית",
      "nameHe": "צלם",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 10
    },
    {
      "id": "P034",
      "verticalId": "V06",
      "verticalNameHe": "עיצוב, מדיה ויצירה חזותית",
      "nameHe": "עורך וידאו",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P035",
      "verticalId": "V06",
      "verticalNameHe": "עיצוב, מדיה ויצירה חזותית",
      "nameHe": "מעצב גרפי",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P036",
      "verticalId": "V06",
      "verticalNameHe": "עיצוב, מדיה ויצירה חזותית",
      "nameHe": "אנימטור / מוגרפיסט",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 3
    },
    {
      "id": "P037",
      "verticalId": "V06",
      "verticalNameHe": "עיצוב, מדיה ויצירה חזותית",
      "nameHe": "אילוסטרטור",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 3
    },
    {
      "id": "P038",
      "verticalId": "V06",
      "verticalNameHe": "עיצוב, מדיה ויצירה חזותית",
      "nameHe": "מפיק וידאו / סרטים",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 7
    },
    {
      "id": "P039",
      "verticalId": "V07",
      "verticalNameHe": "שיווק, תוכן ומכירות",
      "nameHe": "יועץ שיווק דיגיטלי",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P040",
      "verticalId": "V07",
      "verticalNameHe": "שיווק, תוכן ומכירות",
      "nameHe": "מנהל מדיה חברתית",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P041",
      "verticalId": "V07",
      "verticalNameHe": "שיווק, תוכן ומכירות",
      "nameHe": "קופירייטר",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P042",
      "verticalId": "V07",
      "verticalNameHe": "שיווק, תוכן ומכירות",
      "nameHe": "יוצר תוכן / משפיען",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 7
    },
    {
      "id": "P043",
      "verticalId": "V07",
      "verticalNameHe": "שיווק, תוכן ומכירות",
      "nameHe": "סוכן מכירות עצמאי",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 6
    },
    {
      "id": "P044",
      "verticalId": "V07",
      "verticalNameHe": "שיווק, תוכן ומכירות",
      "nameHe": "יחצ\"ן",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 3
    },
    {
      "id": "P045",
      "verticalId": "V08",
      "verticalNameHe": "הוראה, הדרכה והכשרה",
      "nameHe": "מורה פרטי",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P046",
      "verticalId": "V08",
      "verticalNameHe": "הוראה, הדרכה והכשרה",
      "nameHe": "מרצה עצמאי",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P047",
      "verticalId": "V08",
      "verticalNameHe": "הוראה, הדרכה והכשרה",
      "nameHe": "מדריך טיולים",
      "vehicleRuleId": "VEH-04",
      "vehicleRateHint": 0.8,
      "statusNoteHe": "רכב סיור/מדברי - 80% אם מסווג ככזה ברישיון",
      "expenseCountHint": 6
    },
    {
      "id": "P048",
      "verticalId": "V08",
      "verticalNameHe": "הוראה, הדרכה והכשרה",
      "nameHe": "מורה נהיגה",
      "vehicleRuleId": "VEH-05",
      "vehicleRateHint": 0.775,
      "statusNoteHe": "רכב הוראת נהיגה - 77.5% (או 68%)",
      "expenseCountHint": 5
    },
    {
      "id": "P049",
      "verticalId": "V08",
      "verticalNameHe": "הוראה, הדרכה והכשרה",
      "nameHe": "מדריך צלילה / ספורט אתגרי",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P050",
      "verticalId": "V08",
      "verticalNameHe": "הוראה, הדרכה והכשרה",
      "nameHe": "מפתח קורסים דיגיטליים",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P051",
      "verticalId": "V09",
      "verticalNameHe": "בנייה, שיפוצים ומקצועות ביצוע",
      "nameHe": "קבלן שיפוצים",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "statusNoteHe": "רכב מסחרי N1 עד 3.5 טון - עדיין 45%",
      "expenseCountHint": 10
    },
    {
      "id": "P052",
      "verticalId": "V09",
      "verticalNameHe": "בנייה, שיפוצים ומקצועות ביצוע",
      "nameHe": "חשמלאי",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P053",
      "verticalId": "V09",
      "verticalNameHe": "בנייה, שיפוצים ומקצועות ביצוע",
      "nameHe": "אינסטלטור",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P054",
      "verticalId": "V09",
      "verticalNameHe": "בנייה, שיפוצים ומקצועות ביצוע",
      "nameHe": "נגר",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P055",
      "verticalId": "V09",
      "verticalNameHe": "בנייה, שיפוצים ומקצועות ביצוע",
      "nameHe": "מסגר / רתך",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P056",
      "verticalId": "V09",
      "verticalNameHe": "בנייה, שיפוצים ומקצועות ביצוע",
      "nameHe": "טכנאי מיזוג וקירור",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P057",
      "verticalId": "V09",
      "verticalNameHe": "בנייה, שיפוצים ומקצועות ביצוע",
      "nameHe": "צבע / גבס / רצף",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P058",
      "verticalId": "V10",
      "verticalNameHe": "אדריכלות, הנדסה ועיצוב פנים",
      "nameHe": "אדריכל",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 9
    },
    {
      "id": "P059",
      "verticalId": "V10",
      "verticalNameHe": "אדריכלות, הנדסה ועיצוב פנים",
      "nameHe": "מהנדס אזרחי / קונסטרוקטור",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P060",
      "verticalId": "V10",
      "verticalNameHe": "אדריכלות, הנדסה ועיצוב פנים",
      "nameHe": "מעצב פנים",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P061",
      "verticalId": "V10",
      "verticalNameHe": "אדריכלות, הנדסה ועיצוב פנים",
      "nameHe": "מודד מוסמך",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P062",
      "verticalId": "V10",
      "verticalNameHe": "אדריכלות, הנדסה ועיצוב פנים",
      "nameHe": "יועץ נגישות / בטיחות",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P063",
      "verticalId": "V11",
      "verticalNameHe": "מסחר, קמעונאות ואיקומרס",
      "nameHe": "חנות פיזית",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 8
    },
    {
      "id": "P064",
      "verticalId": "V11",
      "verticalNameHe": "מסחר, קמעונאות ואיקומרס",
      "nameHe": "חנות אונליין / איקומרס",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 9
    },
    {
      "id": "P065",
      "verticalId": "V11",
      "verticalNameHe": "מסחר, קמעונאות ואיקומרס",
      "nameHe": "דרופשיפינג",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P066",
      "verticalId": "V11",
      "verticalNameHe": "מסחר, קמעונאות ואיקומרס",
      "nameHe": "סוחר בשווקים / דוכן",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P067",
      "verticalId": "V11",
      "verticalNameHe": "מסחר, קמעונאות ואיקומרס",
      "nameHe": "יבואן / סיטונאי",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 6
    },
    {
      "id": "P068",
      "verticalId": "V12",
      "verticalNameHe": "מזון ומשקאות",
      "nameHe": "מסעדה / בית קפה",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 14
    },
    {
      "id": "P069",
      "verticalId": "V12",
      "verticalNameHe": "מזון ומשקאות",
      "nameHe": "קייטרינג",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 6
    },
    {
      "id": "P070",
      "verticalId": "V12",
      "verticalNameHe": "מזון ומשקאות",
      "nameHe": "מאפייה / קונדיטוריה",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 6
    },
    {
      "id": "P071",
      "verticalId": "V12",
      "verticalNameHe": "מזון ומשקאות",
      "nameHe": "פודטראק",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 6
    },
    {
      "id": "P072",
      "verticalId": "V12",
      "verticalNameHe": "מזון ומשקאות",
      "nameHe": "שף פרטי",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P073",
      "verticalId": "V12",
      "verticalNameHe": "מזון ומשקאות",
      "nameHe": "בר / מיקסולוג",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P074",
      "verticalId": "V13",
      "verticalNameHe": "יופי, טיפוח ואסתטיקה",
      "nameHe": "ספר/ית",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 7
    },
    {
      "id": "P075",
      "verticalId": "V13",
      "verticalNameHe": "יופי, טיפוח ואסתטיקה",
      "nameHe": "קוסמטיקאית",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 8
    },
    {
      "id": "P076",
      "verticalId": "V13",
      "verticalNameHe": "יופי, טיפוח ואסתטיקה",
      "nameHe": "מניקוריסטית",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P077",
      "verticalId": "V13",
      "verticalNameHe": "יופי, טיפוח ואסתטיקה",
      "nameHe": "מאפרת",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P078",
      "verticalId": "V13",
      "verticalNameHe": "יופי, טיפוח ואסתטיקה",
      "nameHe": "מעצב/ת גבות ואיפור קבוע",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P079",
      "verticalId": "V13",
      "verticalNameHe": "יופי, טיפוח ואסתטיקה",
      "nameHe": "מעסה / מטפל בספא",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P080",
      "verticalId": "V14",
      "verticalNameHe": "ספורט וכושר",
      "nameHe": "מאמן כושר אישי",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 8
    },
    {
      "id": "P081",
      "verticalId": "V14",
      "verticalNameHe": "ספורט וכושר",
      "nameHe": "מדריך יוגה / פילאטיס",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P082",
      "verticalId": "V14",
      "verticalNameHe": "ספורט וכושר",
      "nameHe": "מאמן קבוצתי / קרוספיט",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P083",
      "verticalId": "V14",
      "verticalNameHe": "ספורט וכושר",
      "nameHe": "תזונאי ספורט",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 3
    },
    {
      "id": "P084",
      "verticalId": "V14",
      "verticalNameHe": "ספורט וכושר",
      "nameHe": "פיזיולוג מאמץ",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 3
    },
    {
      "id": "P085",
      "verticalId": "V15",
      "verticalNameHe": "תחבורה, שילוח ולוגיסטיקה",
      "nameHe": "נהג מונית",
      "vehicleRuleId": "VEH-03",
      "vehicleRateHint": 0.9,
      "statusNoteHe": "מונית - 90% + מע\"מ מלא",
      "expenseCountHint": 7
    },
    {
      "id": "P086",
      "verticalId": "V15",
      "verticalNameHe": "תחבורה, שילוח ולוגיסטיקה",
      "nameHe": "נהג הסעות / מיניבוס",
      "vehicleRuleId": "VEH-03",
      "vehicleRateHint": 0.9,
      "statusNoteHe": "אוטובוס ציבורי 90%; מעל 3.5 טון - 100%",
      "expenseCountHint": 6
    },
    {
      "id": "P087",
      "verticalId": "V15",
      "verticalNameHe": "תחבורה, שילוח ולוגיסטיקה",
      "nameHe": "שליח",
      "vehicleRuleId": "VEH-02",
      "vehicleRateHint": 0.25,
      "statusNoteHe": "אופנוע L3 - 25%. רכב M1 - 45%",
      "expenseCountHint": 6
    },
    {
      "id": "P088",
      "verticalId": "V15",
      "verticalNameHe": "תחבורה, שילוח ולוגיסטיקה",
      "nameHe": "מוביל / הובלות",
      "vehicleRuleId": "VEH-06",
      "vehicleRateHint": 1,
      "statusNoteHe": "משאית מעל 3.5 טון - 100% + מע\"מ מלא ברכישה",
      "expenseCountHint": 7
    },
    {
      "id": "P089",
      "verticalId": "V15",
      "verticalNameHe": "תחבורה, שילוח ולוגיסטיקה",
      "nameHe": "עמיל מכס / לוגיסטיקה",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P090",
      "verticalId": "V16",
      "verticalNameHe": "תיירות, אירוח ואירועים",
      "nameHe": "מארח Airbnb / צימר",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 8
    },
    {
      "id": "P091",
      "verticalId": "V16",
      "verticalNameHe": "תיירות, אירוח ואירועים",
      "nameHe": "סוכן נסיעות",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P092",
      "verticalId": "V16",
      "verticalNameHe": "תיירות, אירוח ואירועים",
      "nameHe": "מפיק אירועים",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 6
    },
    {
      "id": "P093",
      "verticalId": "V16",
      "verticalNameHe": "תיירות, אירוח ואירועים",
      "nameHe": "DJ / מוזיקאי אירועים",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 6
    },
    {
      "id": "P094",
      "verticalId": "V16",
      "verticalNameHe": "תיירות, אירוח ואירועים",
      "nameHe": "צלם אירועים",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P095",
      "verticalId": "V17",
      "verticalNameHe": "חקלאות ובעלי חיים",
      "nameHe": "חקלאי",
      "vehicleRuleId": "VEH-07",
      "vehicleRateHint": 1,
      "statusNoteHe": "רכב עבודה/טרקטור - מחוץ להגדרת \"רכב\"",
      "expenseCountHint": 9
    },
    {
      "id": "P096",
      "verticalId": "V17",
      "verticalNameHe": "חקלאות ובעלי חיים",
      "nameHe": "מגדל בעלי חיים",
      "vehicleRuleId": "VEH-07",
      "vehicleRateHint": 1,
      "expenseCountHint": 6
    },
    {
      "id": "P097",
      "verticalId": "V17",
      "verticalNameHe": "חקלאות ובעלי חיים",
      "nameHe": "גנן / אדריכל נוף",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 7
    },
    {
      "id": "P098",
      "verticalId": "V17",
      "verticalNameHe": "חקלאות ובעלי חיים",
      "nameHe": "דוגווקר / פנסיון כלבים",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P099",
      "verticalId": "V17",
      "verticalNameHe": "חקלאות ובעלי חיים",
      "nameHe": "מאלף כלבים",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P100",
      "verticalId": "V18",
      "verticalNameHe": "שירותים לבית ולעסק",
      "nameHe": "חברת ניקיון",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 6
    },
    {
      "id": "P101",
      "verticalId": "V18",
      "verticalNameHe": "שירותים לבית ולעסק",
      "nameHe": "מדביר",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 6
    },
    {
      "id": "P102",
      "verticalId": "V18",
      "verticalNameHe": "שירותים לבית ולעסק",
      "nameHe": "מאבטח / חברת אבטחה",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 5
    },
    {
      "id": "P103",
      "verticalId": "V18",
      "verticalNameHe": "שירותים לבית ולעסק",
      "nameHe": "טכנאי מחשבים / IT",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P104",
      "verticalId": "V18",
      "verticalNameHe": "שירותים לבית ולעסק",
      "nameHe": "מנעולן",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P105",
      "verticalId": "V19",
      "verticalNameHe": "אמנות, בידור והופעות",
      "nameHe": "מוזיקאי / נגן",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 7
    },
    {
      "id": "P106",
      "verticalId": "V19",
      "verticalNameHe": "אמנות, בידור והופעות",
      "nameHe": "שחקן",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 6
    },
    {
      "id": "P107",
      "verticalId": "V19",
      "verticalNameHe": "אמנות, בידור והופעות",
      "nameHe": "אמן פלסטי",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 6
    },
    {
      "id": "P108",
      "verticalId": "V19",
      "verticalNameHe": "אמנות, בידור והופעות",
      "nameHe": "סופר / כותב",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 6
    },
    {
      "id": "P109",
      "verticalId": "V19",
      "verticalNameHe": "אמנות, בידור והופעות",
      "nameHe": "סטנדאפיסט / מנחה",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P110",
      "verticalId": "V20",
      "verticalNameHe": "דת, קהילה וטקסים",
      "nameHe": "רב / משגיח כשרות",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P111",
      "verticalId": "V20",
      "verticalNameHe": "דת, קהילה וטקסים",
      "nameHe": "חזן / בעל תפילה",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P112",
      "verticalId": "V20",
      "verticalNameHe": "דת, קהילה וטקסים",
      "nameHe": "מוהל",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    },
    {
      "id": "P113",
      "verticalId": "V20",
      "verticalNameHe": "דת, קהילה וטקסים",
      "nameHe": "מנחה טקסים אזרחיים",
      "vehicleRuleId": "VEH-01",
      "vehicleRateHint": 0.45,
      "expenseCountHint": 4
    }
  ],
  "baseExpenses": [
    {
      "id": "EB-002",
      "nameHe": "ארנונה עסקית",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EB-003",
      "nameHe": "חשמל, מים, גז במקום העסק",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EB-004",
      "nameHe": "ניקיון ואחזקת מקום העסק",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EB-005",
      "nameHe": "הנהלת חשבונות / רו\"ח / יועץ מס",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EB-006",
      "nameHe": "ייעוץ משפטי שוטף",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "ייעוץ בעל אופי הוני - מהוון",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EB-007",
      "nameHe": "ביטוח עסק / תכולה / צד ג'",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "conditionHe": "אין מע\"מ בפוליסות ביטוח",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EB-008",
      "nameHe": "ביטוח אחריות מקצועית",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EB-009",
      "nameHe": "פרסום דיגיטלי - Google / Meta",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "conditionHe": "ספק חו\"ל - אין מע\"מ ישראלי לקזז",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EB-010",
      "nameHe": "בניית אתר ותחזוקה",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "עלויות הקמה מהוונות - פחת 25%-33%",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EB-011",
      "nameHe": "דומיין ואחסון",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EB-012",
      "nameHe": "כרטיסי ביקור, שילוט, מיתוג",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EB-013",
      "nameHe": "תוכנות SaaS ומנויים מקצועיים",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "conditionHe": "ספק ישראלי - מע\"מ 100%",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EB-014",
      "nameHe": "מחשב נייד / נייח",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "conditionHe": "הוצאה הונית - פחת 33%",
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EB-015",
      "nameHe": "ציוד משרדי מתכלה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EB-016",
      "nameHe": "ריהוט משרדי",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.06,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.06,
      "vatFraction": 1,
      "conditionHe": "פחת 6%",
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EB-017",
      "nameHe": "עמלות בנק וסליקה",
      "category": "מימון",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EB-018",
      "nameHe": "ריבית על הלוואה עסקית",
      "category": "מימון",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17(1)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EB-019",
      "nameHe": "שכר עובדים וסוציאליות",
      "category": "כוח אדם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EB-020",
      "nameHe": "תשלום לפרילנסרים / קבלני משנה",
      "category": "כוח אדם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "לוודא חשבונית + ניכוי במקור",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EB-021",
      "nameHe": "ספרות מקצועית ומנויים",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EB-022",
      "nameHe": "כנסים והשתלמויות לשימור הידע",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "הסבה מקצועית - לא מוכרת",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EB-023",
      "nameHe": "דואר ומשלוחים",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    }
  ],
  "professionExpenses": [
    {
      "id": "EX-0002",
      "professionId": "P001",
      "nameHe": "דמי חבר בלשכת עורכי הדין",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0003",
      "professionId": "P001",
      "nameHe": "מנוי למאגרי פסיקה (נבו, תקדין, פדאור)",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0004",
      "professionId": "P001",
      "nameHe": "חלוק בית משפט וחולצה לבנה",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.8,
        "vatRate": 0.8
      },
      "incomeTaxFraction": 0.8,
      "vatFraction": 0.8,
      "conditionHe": "חולצה לבנה 80% - ניתנת לשימוש פרטי; חלוק 100%",
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0005",
      "professionId": "P001",
      "nameHe": "שכר מתמחה",
      "category": "כוח אדם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0006",
      "professionId": "P001",
      "nameHe": "שליחויות ומסירות כתבי בי-דין",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0007",
      "professionId": "P001",
      "nameHe": "הדפסות וכריכות תיקים",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0008",
      "professionId": "P001",
      "nameHe": "חניה בבתי משפט",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "conditionHe": "חלק מהוצאות החזקת רכב",
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0009",
      "professionId": "P002",
      "nameHe": "רישיון רו\"ח ודמי חבר בלשכה",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0010",
      "professionId": "P002",
      "nameHe": "תוכנות חשבשבת / רו\"ח / מיסים אונליין",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0011",
      "professionId": "P002",
      "nameHe": "חתימה דיגיטלית",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0012",
      "professionId": "P002",
      "nameHe": "השתלמויות חובה של הלשכה",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0013",
      "professionId": "P002",
      "nameHe": "ארכיון וגריסה מאובטחת",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0014",
      "professionId": "P002",
      "nameHe": "ביטוח סייבר",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0015",
      "professionId": "P003",
      "nameHe": "רישיון יועץ מס ודמי חבר",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0016",
      "professionId": "P003",
      "nameHe": "תוכנות ייצוג ושידור לרשות המסים",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0017",
      "professionId": "P003",
      "nameHe": "מנוי למאגרי חקיקה ופסיקת מס",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0018",
      "professionId": "P003",
      "nameHe": "השתלמויות חובה",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0019",
      "professionId": "P004",
      "nameHe": "מנוי למאגרי מידע עסקי (BDI, D&B, IVC)",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0020",
      "professionId": "P004",
      "nameHe": "LinkedIn Sales Navigator",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0021",
      "professionId": "P004",
      "nameHe": "כלי מחקר שוק וסקרים",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0022",
      "professionId": "P004",
      "nameHe": "נסיעות ללקוחות",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0023",
      "professionId": "P005",
      "nameHe": "הסמכות גישור ואגרות",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0024",
      "professionId": "P005",
      "nameHe": "שכירות חדר גישור לפי שעה",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0025",
      "professionId": "P005",
      "nameHe": "השתלמויות והדרכה מקצועית",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0026",
      "professionId": "P006",
      "nameHe": "אגרות נוטריון וחותמות",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0027",
      "professionId": "P006",
      "nameHe": "ביול ואישורי אפוסטיל",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0028",
      "professionId": "P006",
      "nameHe": "תוכנות תרגום (Trados) ומילונים",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0029",
      "professionId": "P007",
      "nameHe": "רישיון סוכן ביטוח - רשות שוק ההון",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0030",
      "professionId": "P007",
      "nameHe": "מערכת ניהול סוכן וכלי השוואת פוליסות",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0031",
      "professionId": "P007",
      "nameHe": "מסלקה פנסיונית",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0032",
      "professionId": "P007",
      "nameHe": "רכב - הוצאה מרכזית בתחום",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0033",
      "professionId": "P007",
      "nameHe": "מתנות ללקוחות",
      "category": "מתנות",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "עד 240 ₪ לאדם לשנה",
      "legalSourceHe": "תק' 2(5)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0034",
      "professionId": "P008",
      "nameHe": "רישיון יועץ משכנתאות",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0035",
      "professionId": "P008",
      "nameHe": "מערכת השוואת מסלולי משכנתא",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0036",
      "professionId": "P008",
      "nameHe": "נסיעות לבנקים ולקוחות",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0037",
      "professionId": "P009",
      "nameHe": "רישיון תיווך וחידושו",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0038",
      "professionId": "P009",
      "nameHe": "דמי חבר בלשכת המתווכים",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0039",
      "professionId": "P009",
      "nameHe": "מנוי ליד2 / מדלן / לוחות נדל\"ן",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0040",
      "professionId": "P009",
      "nameHe": "צילום נכסים והום-סטיילינג",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0041",
      "professionId": "P009",
      "nameHe": "שילוט ובאנרים על נכסים",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0042",
      "professionId": "P009",
      "nameHe": "רכב - הוצאה מרכזית בתחום",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0043",
      "professionId": "P010",
      "nameHe": "רישיון שמאי ודמי חבר",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0044",
      "professionId": "P010",
      "nameHe": "נסחי טאבו ומידע מרשות המקרקעין",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0045",
      "professionId": "P010",
      "nameHe": "ציוד מדידה (מד לייזר, מד מרחק)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "conditionHe": "פחת 15%",
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0046",
      "professionId": "P010",
      "nameHe": "תוכנות שמאות ומיפוי",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0047",
      "professionId": "P010",
      "nameHe": "נסיעות לביקורי נכסים",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0048",
      "professionId": "P011",
      "nameHe": "רישיון רשות ניירות ערך",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0049",
      "professionId": "P011",
      "nameHe": "מנוי Bloomberg / Reuters",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0050",
      "professionId": "P011",
      "nameHe": "מערכות ציות ורגולציה",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0051",
      "professionId": "P012",
      "nameHe": "תוכנות שכר (חילן, מיכפל, עוקץ)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0052",
      "professionId": "P012",
      "nameHe": "הסמכת חשב שכר וחידושה",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0053",
      "professionId": "P012",
      "nameHe": "ארכיון תיקי עובדים",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0054",
      "professionId": "P013",
      "nameHe": "רישיון משרד הבריאות",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0055",
      "professionId": "P013",
      "nameHe": "ביטוח רשלנות רפואית",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "conditionHe": "הוצאה כבדה בתחום",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0056",
      "professionId": "P013",
      "nameHe": "ציוד רפואי",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "conditionHe": "פחת לפי סוג הציוד",
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0057",
      "professionId": "P013",
      "nameHe": "חומרים מתכלים וחד-פעמי",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0058",
      "professionId": "P013",
      "nameHe": "סטריליזציה ואוטוקלב",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0059",
      "professionId": "P013",
      "nameHe": "פינוי פסולת רפואית",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0060",
      "professionId": "P013",
      "nameHe": "מזכירות רפואית",
      "category": "כוח אדם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0061",
      "professionId": "P013",
      "nameHe": "תוכנת ניהול קליניקה",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0062",
      "professionId": "P013",
      "nameHe": "חלוקים ומדים",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "100% - לא ניתן לשימוש פרטי",
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0063",
      "professionId": "P013",
      "nameHe": "כתבי עת רפואיים וכנסים",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0064",
      "professionId": "P014",
      "nameHe": "יחידת טיפול שיניים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0065",
      "professionId": "P014",
      "nameHe": "מכשיר צילום פנורמי / CT",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0066",
      "professionId": "P014",
      "nameHe": "חומרי מילוי, סתימות וחומרי גלם",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0067",
      "professionId": "P014",
      "nameHe": "עבודות מעבדת שיניים",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0068",
      "professionId": "P014",
      "nameHe": "כפפות, מסכות וחד-פעמי",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0069",
      "professionId": "P014",
      "nameHe": "ביטוח רשלנות רפואית",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0070",
      "professionId": "P014",
      "nameHe": "פינוי פסולת רפואית",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0071",
      "professionId": "P015",
      "nameHe": "רישיון וטרינר",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0072",
      "professionId": "P015",
      "nameHe": "תרופות וחיסונים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0073",
      "professionId": "P015",
      "nameHe": "מקררי אחסון תרופות",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0074",
      "professionId": "P015",
      "nameHe": "כלובים וציוד אשפוז",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0075",
      "professionId": "P015",
      "nameHe": "בדיקות מעבדה חיצוניות",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0076",
      "professionId": "P015",
      "nameHe": "פינוי פסולת ביולוגית",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0077",
      "professionId": "P015",
      "nameHe": "רכב לביקורי בית",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0078",
      "professionId": "P016",
      "nameHe": "רישיון פיזיותרפיסט",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0079",
      "professionId": "P016",
      "nameHe": "מיטת טיפולים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0080",
      "professionId": "P016",
      "nameHe": "ציוד שיקום (גומיות, כדורים, TENS, אולטרסאונד)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0081",
      "professionId": "P016",
      "nameHe": "מגבות, סדינים ושירותי כביסה",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0082",
      "professionId": "P016",
      "nameHe": "השתלמויות שיטות טיפול",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0083",
      "professionId": "P017",
      "nameHe": "רישיון דיאטן קליני",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0084",
      "professionId": "P017",
      "nameHe": "מכשיר אנליזת הרכב גוף (InBody)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0085",
      "professionId": "P017",
      "nameHe": "תוכנות תזונה (צמרת)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0086",
      "professionId": "P017",
      "nameHe": "חומרי הדרכה והמחשה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0087",
      "professionId": "P018",
      "nameHe": "ערכות אבחון מקצועיות",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "יקרות ומתחדשות תקופתית",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0088",
      "professionId": "P018",
      "nameHe": "משחקים וחומרים טיפוליים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0089",
      "professionId": "P018",
      "nameHe": "תוכנות אבחון",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0090",
      "professionId": "P018",
      "nameHe": "רישיון מקצועי",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0091",
      "professionId": "P019",
      "nameHe": "מיטת טיפולים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0092",
      "professionId": "P019",
      "nameHe": "שמנים, תכשירים וחומרי טיפול",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0093",
      "professionId": "P019",
      "nameHe": "מחטים חד-פעמיות (דיקור)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0094",
      "professionId": "P019",
      "nameHe": "הסמכות והשתלמויות",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0095",
      "professionId": "P019",
      "nameHe": "מגבות ושירותי כביסה",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0096",
      "professionId": "P020",
      "nameHe": "רישיון פנקס הפסיכולוגים",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0097",
      "professionId": "P020",
      "nameHe": "הדרכה מקצועית (סופרוויז'ן)",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "הוצאה מרכזית וקבועה בתחום",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0098",
      "professionId": "P020",
      "nameHe": "מבחנים פסיכודיאגנוסטיים (WAIS, רורשאך)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "יקרים ומתחדשים",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0099",
      "professionId": "P020",
      "nameHe": "שכירות חדר טיפולים / קליניקה משותפת",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0100",
      "professionId": "P020",
      "nameHe": "פלטפורמת טיפול מרחוק",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0101",
      "professionId": "P020",
      "nameHe": "ביטוח סייבר ואבטחת תיקי מטופלים",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0102",
      "professionId": "P021",
      "nameHe": "רישיון רופא + התמחות",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0103",
      "professionId": "P021",
      "nameHe": "ביטוח רשלנות רפואית",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0104",
      "professionId": "P021",
      "nameHe": "פנקסי מרשמים",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0105",
      "professionId": "P021",
      "nameHe": "מנוי למאגרי תרופות",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0106",
      "professionId": "P021",
      "nameHe": "הדרכה מקצועית",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0107",
      "professionId": "P022",
      "nameHe": "רישיון עו\"ס קליני",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0108",
      "professionId": "P022",
      "nameHe": "הדרכה מקצועית",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0109",
      "professionId": "P022",
      "nameHe": "חומרי טיפול והמחשה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0110",
      "professionId": "P023",
      "nameHe": "חומרי יצירה (צבעים, חימר, בדים)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0111",
      "professionId": "P023",
      "nameHe": "כלי נגינה טיפוליים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0112",
      "professionId": "P023",
      "nameHe": "אביזרי דרמה ותנועה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0113",
      "professionId": "P023",
      "nameHe": "רישיון פנקס המטפלים",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0114",
      "professionId": "P023",
      "nameHe": "הדרכה מקצועית",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0115",
      "professionId": "P024",
      "nameHe": "הסמכות אימון (ICF וכד')",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "הסמכה ראשונית עלולה להיחשב הונית",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0116",
      "professionId": "P024",
      "nameHe": "סופרוויז'ן",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0117",
      "professionId": "P024",
      "nameHe": "כלי אבחון (DISC, StrengthsFinder)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0118",
      "professionId": "P024",
      "nameHe": "חלל עבודה משותף / חדר פגישות",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0119",
      "professionId": "P025",
      "nameHe": "רישיון מטפל משפחתי",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0120",
      "professionId": "P025",
      "nameHe": "הדרכה מקצועית",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0121",
      "professionId": "P025",
      "nameHe": "ריהוט חדר טיפולים זוגי",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.06,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.06,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0122",
      "professionId": "P026",
      "nameHe": "מחשב פיתוח ומסכים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "conditionHe": "פחת 33%",
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0123",
      "professionId": "P026",
      "nameHe": "GitHub / GitLab / JetBrains",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0124",
      "professionId": "P026",
      "nameHe": "AWS / GCP / Azure",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0125",
      "professionId": "P026",
      "nameHe": "כלי AI (Claude, Copilot, ChatGPT)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0126",
      "professionId": "P026",
      "nameHe": "כיסא ארגונומי ושולחן עמידה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.06,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.06,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0127",
      "professionId": "P026",
      "nameHe": "הסמכות ענן (AWS, Azure)",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0128",
      "professionId": "P027",
      "nameHe": "Figma / Adobe Creative Cloud",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0129",
      "professionId": "P027",
      "nameHe": "רישיונות פונטים ואייקונים",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0130",
      "professionId": "P027",
      "nameHe": "מאגרי תמונות (Shutterstock, Adobe Stock)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0131",
      "professionId": "P027",
      "nameHe": "טאבלט גרפי ומסך מכויל",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0132",
      "professionId": "P027",
      "nameHe": "כלי מחקר משתמשים (Maze, Hotjar)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0133",
      "professionId": "P028",
      "nameHe": "תשתיות ענן וסביבות בדיקה",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0134",
      "professionId": "P028",
      "nameHe": "כלי ניטור (Datadog, Grafana)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0135",
      "professionId": "P028",
      "nameHe": "מעבדה ביתית / שרתים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.25,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.25,
      "vatFraction": 1,
      "conditionHe": "מחשבים אחרים - 25%",
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0136",
      "professionId": "P028",
      "nameHe": "הסמכות מקצועיות",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0137",
      "professionId": "P029",
      "nameHe": "כלי בדיקות חדירה (Burp Suite, Metasploit Pro)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0138",
      "professionId": "P029",
      "nameHe": "הסמכות (OSCP, CISSP)",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0139",
      "professionId": "P029",
      "nameHe": "מעבדות תרגול ומנויי מודיעין איומים",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0140",
      "professionId": "P029",
      "nameHe": "ביטוח אחריות מקצועית",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0141",
      "professionId": "P030",
      "nameHe": "Tableau / Power BI",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0142",
      "professionId": "P030",
      "nameHe": "מסדי נתונים ומנויי API",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0143",
      "professionId": "P030",
      "nameHe": "מחשב בעל ביצועים גבוהים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0144",
      "professionId": "P031",
      "nameHe": "כלי ניהול מוצר (Jira, Linear, Amplitude)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0145",
      "professionId": "P031",
      "nameHe": "מחקר שוק וראיונות משתמשים",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0146",
      "professionId": "P032",
      "nameHe": "חשבון Apple Developer (99$ לשנה)",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0147",
      "professionId": "P032",
      "nameHe": "חשבון Google Play (25$)",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0148",
      "professionId": "P032",
      "nameHe": "מכשירי בדיקה (iOS / Android)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0149",
      "professionId": "P032",
      "nameHe": "שירותי Push ואנליטיקס",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0150",
      "professionId": "P033",
      "nameHe": "מצלמות ועדשות",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "conditionHe": "פחת ציוד אלקטרוני",
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0151",
      "professionId": "P033",
      "nameHe": "תאורה, רקעים וחצובות",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0152",
      "professionId": "P033",
      "nameHe": "כרטיסי זיכרון, סוללות ומתכלים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0153",
      "professionId": "P033",
      "nameHe": "רחפן + רישיון רת\"א",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0154",
      "professionId": "P033",
      "nameHe": "שכירות אולפן",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0155",
      "professionId": "P033",
      "nameHe": "Lightroom / Photoshop",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0156",
      "professionId": "P033",
      "nameHe": "אחסון ענן וגיבוי",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0157",
      "professionId": "P033",
      "nameHe": "הדפסות ואלבומים",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0158",
      "professionId": "P033",
      "nameHe": "ביטוח ציוד צילום",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0159",
      "professionId": "P033",
      "nameHe": "רכב לצילומי חוץ",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0160",
      "professionId": "P034",
      "nameHe": "מחשב עריכה בעל ביצועים גבוהים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0161",
      "professionId": "P034",
      "nameHe": "Premiere / DaVinci / Final Cut",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0162",
      "professionId": "P034",
      "nameHe": "אחסון (NAS, כוננים חיצוניים)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0163",
      "professionId": "P034",
      "nameHe": "מוזיקה ברישיון (Epidemic Sound, Artlist)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0164",
      "professionId": "P034",
      "nameHe": "פוטאז' סטוק ופלאגינים",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0165",
      "professionId": "P035",
      "nameHe": "Adobe Creative Cloud",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0166",
      "professionId": "P035",
      "nameHe": "רישיונות פונטים",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0167",
      "professionId": "P035",
      "nameHe": "מאגרי תמונות, וקטורים ומוקאפים",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0168",
      "professionId": "P035",
      "nameHe": "טאבלט גרפי ומסך מכויל",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0169",
      "professionId": "P035",
      "nameHe": "הדפסות דמו ופרוטוטייפים",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0170",
      "professionId": "P036",
      "nameHe": "After Effects / Cinema4D / Blender",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0171",
      "professionId": "P036",
      "nameHe": "פלאגינים וחוות רינדור",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0172",
      "professionId": "P036",
      "nameHe": "אחסון ומחשב חזק",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0173",
      "professionId": "P037",
      "nameHe": "טאבלט (Wacom / iPad + Procreate)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0174",
      "professionId": "P037",
      "nameHe": "חומרי ציור פיזיים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0175",
      "professionId": "P037",
      "nameHe": "סריקה והדפסות",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0176",
      "professionId": "P038",
      "nameHe": "השכרת ציוד הפקה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0177",
      "professionId": "P038",
      "nameHe": "שכר צוות הפקה",
      "category": "כוח אדם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0178",
      "professionId": "P038",
      "nameHe": "ביטוח הפקה",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0179",
      "professionId": "P038",
      "nameHe": "אישורי צילום ואגרות עירייה",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0180",
      "professionId": "P038",
      "nameHe": "לוקיישנים ושכירות אתרי צילום",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0181",
      "professionId": "P038",
      "nameHe": "קייטרינג לצוות ההפקה",
      "category": "כוח אדם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "נבחן קפדנית - להבחין מ'אירוח'",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "C"
    },
    {
      "id": "EX-0182",
      "professionId": "P038",
      "nameHe": "רכישת זכויות שימוש",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0183",
      "professionId": "P039",
      "nameHe": "תקציבי מדיה עבור לקוחות",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "conditionHe": "רק אם מחויב על שם העוסק",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0184",
      "professionId": "P039",
      "nameHe": "SEMrush / Ahrefs",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0185",
      "professionId": "P039",
      "nameHe": "כלי אוטומציה (HubSpot, ActiveCampaign)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0186",
      "professionId": "P039",
      "nameHe": "הסמכות Google / Meta",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0187",
      "professionId": "P040",
      "nameHe": "כלי תזמון (Later, Buffer)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0188",
      "professionId": "P040",
      "nameHe": "Canva Pro ובנקי תמונות",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0189",
      "professionId": "P040",
      "nameHe": "אביזרי צילום ותאורה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0190",
      "professionId": "P040",
      "nameHe": "טלפון נייד",
      "category": "תקשורת",
      "formula": {
        "kind": "custom",
        "formulaTextHe": "הוצאה פחות MIN(1380, 50%)",
        "vatRate": 0.667
      },
      "incomeTaxFraction": null,
      "vatFraction": 0.667,
      "conditionHe": "הוצאה פחות MIN(1380, 50%)",
      "legalSourceHe": "תק' 2(3)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0191",
      "professionId": "P041",
      "nameHe": "תוכנות כתיבה ועריכה",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0192",
      "professionId": "P041",
      "nameHe": "כלי AI לכתיבה",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0193",
      "professionId": "P041",
      "nameHe": "מנויי מגזינים ומחקר",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0194",
      "professionId": "P041",
      "nameHe": "שירותי הגהה ועריכה לשונית",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0195",
      "professionId": "P042",
      "nameHe": "ציוד צילום, תאורה ורינג לייט",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0196",
      "professionId": "P042",
      "nameHe": "מיקרופון וציוד הקלטה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0197",
      "professionId": "P042",
      "nameHe": "תוכנות עריכה",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0198",
      "professionId": "P042",
      "nameHe": "מוצרים לרכישה לצורך ביקורת",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "נבחן קפדנית - דורש תיעוד שהמוצר שימש ליצירת תוכן ולא לשימוש פרטי",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "C"
    },
    {
      "id": "EX-0199",
      "professionId": "P042",
      "nameHe": "נסיעות להפקות",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0200",
      "professionId": "P042",
      "nameHe": "ייעוץ משפטי לחוזי שיתופי פעולה",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0201",
      "professionId": "P042",
      "nameHe": "איפור וסטיילינג להפקות",
      "category": "ביגוד",
      "formula": {
        "kind": "custom",
        "formulaTextHe": "סיכון גבוה לפסילה כהוצאה פרטית - דורש הפרדה מוכחת",
        "vatRate": null
      },
      "incomeTaxFraction": null,
      "vatFraction": null,
      "conditionHe": "סיכון גבוה לפסילה כהוצאה פרטית - דורש הפרדה מוכחת",
      "legalSourceHe": "סעיף 32(1)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "C"
    },
    {
      "id": "EX-0202",
      "professionId": "P043",
      "nameHe": "רכב - הוצאה מרכזית בתחום",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0203",
      "professionId": "P043",
      "nameHe": "כיבוד ללקוחות",
      "category": "כיבוד ואירוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.8,
        "vatRate": 0
      },
      "incomeTaxFraction": 0.8,
      "vatFraction": 0,
      "conditionHe": "80% מ\"ה, מע\"מ לא מוכר",
      "legalSourceHe": "תק' 2(1)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0204",
      "professionId": "P043",
      "nameHe": "מתנות ללקוחות",
      "category": "מתנות",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "עד 240 ₪ לאדם לשנה",
      "legalSourceHe": "תק' 2(5)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0205",
      "professionId": "P043",
      "nameHe": "מערכת CRM",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0206",
      "professionId": "P043",
      "nameHe": "דוגמיות וקטלוגים",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0207",
      "professionId": "P043",
      "nameHe": "תערוכות ודוכנים",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0208",
      "professionId": "P044",
      "nameHe": "מאגרי אנשי תקשורת",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0209",
      "professionId": "P044",
      "nameHe": "כלי ניטור מדיה",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0210",
      "professionId": "P044",
      "nameHe": "אירועי השקה",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "להבחין בין הפקה עסקית לבין 'אירוח בארץ' שאינו מוכר",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "C"
    },
    {
      "id": "EX-0211",
      "professionId": "P045",
      "nameHe": "ספרי לימוד וחוברות",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0212",
      "professionId": "P045",
      "nameHe": "לוח / טאבלט להוראה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0213",
      "professionId": "P045",
      "nameHe": "מנוי Zoom ופלטפורמות (Miro, Kahoot)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0214",
      "professionId": "P045",
      "nameHe": "נסיעות לשיעורי בית",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0215",
      "professionId": "P045",
      "nameHe": "הדפסות חומרי לימוד",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0216",
      "professionId": "P046",
      "nameHe": "שכירות אולם והגברה",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0217",
      "professionId": "P046",
      "nameHe": "ציוד הקרנה ומצגות",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0218",
      "professionId": "P046",
      "nameHe": "נסיעות להרצאות",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0219",
      "professionId": "P046",
      "nameHe": "לינה בהרצאות מרוחקות",
      "category": "נסיעות",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "בארץ - לפי סבירות",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0220",
      "professionId": "P046",
      "nameHe": "עמלת סוכן הרצאות",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0221",
      "professionId": "P047",
      "nameHe": "רישיון מדריך טיולים",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0222",
      "professionId": "P047",
      "nameHe": "אגרות כניסה לאתרים",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0223",
      "professionId": "P047",
      "nameHe": "ציוד שטח (עזרה ראשונה, קשר, ניווט)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0224",
      "professionId": "P047",
      "nameHe": "רכב סיור / מדברי",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.8,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.8,
      "vatFraction": 1,
      "conditionHe": "80% - רק אם מסווג כרכב סיור/מדברי ברישיון",
      "legalSourceHe": "תק' 2(1ג)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0225",
      "professionId": "P047",
      "nameHe": "ביטוח מדריך ומטיילים",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0226",
      "professionId": "P047",
      "nameHe": "השתלמויות רשות הטבע והגנים",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0227",
      "professionId": "P048",
      "nameHe": "רישיון מורה נהיגה",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0228",
      "professionId": "P048",
      "nameHe": "רכב להוראת נהיגה",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.775,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.775,
      "vatFraction": 1,
      "conditionHe": "77.5%; שני רכבים ורק אחד אוטומטי -> 68%",
      "legalSourceHe": "תק' 2(1ד)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0229",
      "professionId": "P048",
      "nameHe": "פחת רכב הוראת נהיגה",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.25,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.25,
      "vatFraction": 1,
      "conditionHe": "25% לשנה, כפוף למגבלת 77.5%",
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0230",
      "professionId": "P048",
      "nameHe": "אגרות טסטים",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0231",
      "professionId": "P048",
      "nameHe": "ביטוח רכב לימוד",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0232",
      "professionId": "P049",
      "nameHe": "הסמכות (PADI וכד')",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0233",
      "professionId": "P049",
      "nameHe": "ציוד צלילה / ספורט",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0234",
      "professionId": "P049",
      "nameHe": "ביטוח מוגבר",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0235",
      "professionId": "P049",
      "nameHe": "בדיקות רפואיות תקופתיות",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0236",
      "professionId": "P049",
      "nameHe": "אגרות רישוי",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0237",
      "professionId": "P050",
      "nameHe": "פלטפורמת קורסים (Teachable, Kajabi)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0238",
      "professionId": "P050",
      "nameHe": "ציוד הקלטה ותאורה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0239",
      "professionId": "P050",
      "nameHe": "מערכת דיוור",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0240",
      "professionId": "P050",
      "nameHe": "שירותי עריכה",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0241",
      "professionId": "P051",
      "nameHe": "רישיון קבלן ורישום בפנקס",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0242",
      "professionId": "P051",
      "nameHe": "כלי עבודה ומכונות",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0243",
      "professionId": "P051",
      "nameHe": "חומרי בניין",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0244",
      "professionId": "P051",
      "nameHe": "השכרת ציוד כבד ופיגומים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0245",
      "professionId": "P051",
      "nameHe": "קבלני משנה ופועלים",
      "category": "כוח אדם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0246",
      "professionId": "P051",
      "nameHe": "רכב מסחרי N1 עד 3.5 טון",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "conditionHe": "N1 עד 3.5 טון בהגדרת 'רכב' - 45% בלבד",
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0247",
      "professionId": "P051",
      "nameHe": "פינוי פסולת ומכולות",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0248",
      "professionId": "P051",
      "nameHe": "ביטוח עבודות קבלניות וצד ג'",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0249",
      "professionId": "P051",
      "nameHe": "ציוד מגן אישי",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "100% - לא ניתן לשימוש פרטי",
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0250",
      "professionId": "P051",
      "nameHe": "בגדי עבודה עם לוגו",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "100% - סימון בולט של העסק",
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0251",
      "professionId": "P052",
      "nameHe": "רישיון חשמלאי",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0252",
      "professionId": "P052",
      "nameHe": "מכשירי מדידה (מגר, בודק מתח)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0253",
      "professionId": "P052",
      "nameHe": "חומרי חשמל ומלאי",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0254",
      "professionId": "P052",
      "nameHe": "השתלמויות תקנים",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0255",
      "professionId": "P052",
      "nameHe": "ציוד מגן אישי",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0256",
      "professionId": "P053",
      "nameHe": "כלים מיוחדים (מחטט, מצלמת צנרת, בודק לחץ)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0257",
      "professionId": "P053",
      "nameHe": "חומרי אינסטלציה",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0258",
      "professionId": "P053",
      "nameHe": "אגרות רישוי",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0259",
      "professionId": "P053",
      "nameHe": "ציוד מגן אישי",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0260",
      "professionId": "P054",
      "nameHe": "מכונות עץ ו-CNC",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0261",
      "professionId": "P054",
      "nameHe": "עץ, לכות ודבקים",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0262",
      "professionId": "P054",
      "nameHe": "שכירות סדנה",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0263",
      "professionId": "P054",
      "nameHe": "מערכת שאיבת אבק וכיבוי אש",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0264",
      "professionId": "P054",
      "nameHe": "ציוד מגן אישי",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0265",
      "professionId": "P055",
      "nameHe": "מכונת ריתוך וגזים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0266",
      "professionId": "P055",
      "nameHe": "מתכות וחומרי גלם",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0267",
      "professionId": "P055",
      "nameHe": "מסכת ריתוך וציוד מגן",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0268",
      "professionId": "P055",
      "nameHe": "שכירות סדנה",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0269",
      "professionId": "P055",
      "nameHe": "ביטוח מוגבר",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0270",
      "professionId": "P056",
      "nameHe": "גז קירור וחומרים",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0271",
      "professionId": "P056",
      "nameHe": "רישיון עבודה בגז",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0272",
      "professionId": "P056",
      "nameHe": "מלאי חלפים",
      "category": "מלאי",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0273",
      "professionId": "P056",
      "nameHe": "כלי עבודה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0274",
      "professionId": "P057",
      "nameHe": "חומרי צבע, גבס ואריחים",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0275",
      "professionId": "P057",
      "nameHe": "כלים ופיגומים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0276",
      "professionId": "P057",
      "nameHe": "יריעות מגן ואביזרים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0277",
      "professionId": "P057",
      "nameHe": "ציוד מגן אישי",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0278",
      "professionId": "P058",
      "nameHe": "רישום בפנקס המהנדסים והאדריכלים",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0279",
      "professionId": "P058",
      "nameHe": "AutoCAD / Revit / ArchiCAD / SketchUp",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0280",
      "professionId": "P058",
      "nameHe": "מחשב בעל ביצועים גבוהים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0281",
      "professionId": "P058",
      "nameHe": "פלוטר והדפסות אדריכליות",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0282",
      "professionId": "P058",
      "nameHe": "אגרות ועדות תכנון ובנייה",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0283",
      "professionId": "P058",
      "nameHe": "ביטוח אחריות מקצועית",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0284",
      "professionId": "P058",
      "nameHe": "יועצים (קונסטרוקציה, אינסטלציה)",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0285",
      "professionId": "P058",
      "nameHe": "דגמים ומוקאפים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0286",
      "professionId": "P058",
      "nameHe": "נסיעות לביקורי אתר",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0287",
      "professionId": "P059",
      "nameHe": "רישום בפנקס המהנדסים",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0288",
      "professionId": "P059",
      "nameHe": "תוכנות חישוב (ETABS, STAAD)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0289",
      "professionId": "P059",
      "nameHe": "רכישת תקנים ישראליים ממכון התקנים",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0290",
      "professionId": "P059",
      "nameHe": "בדיקות מעבדה",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0291",
      "professionId": "P059",
      "nameHe": "ביטוח אחריות מקצועית",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0292",
      "professionId": "P060",
      "nameHe": "תוכנות תלת-ממד ורינדור",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0293",
      "professionId": "P060",
      "nameHe": "קטלוגים ודוגמאות (טקסטיל, פרקט, אריחים)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0294",
      "professionId": "P060",
      "nameHe": "נסיעות לספקים ותערוכות",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0295",
      "professionId": "P060",
      "nameHe": "מנוי לירידי עיצוב",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0296",
      "professionId": "P060",
      "nameHe": "צילום פרויקטים",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0297",
      "professionId": "P061",
      "nameHe": "רישיון מודד מוסמך",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0298",
      "professionId": "P061",
      "nameHe": "ציוד מדידה (טוטאל סטיישן, GPS RTK)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0299",
      "professionId": "P061",
      "nameHe": "כיול תקופתי של הציוד",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0300",
      "professionId": "P061",
      "nameHe": "נסחי טאבו ומידע מיפוי",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0301",
      "professionId": "P061",
      "nameHe": "רכב שטח",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0302",
      "professionId": "P062",
      "nameHe": "הסמכת מורשה נגישות / ממונה בטיחות",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0303",
      "professionId": "P062",
      "nameHe": "רכישת תקנים",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0304",
      "professionId": "P062",
      "nameHe": "ציוד מדידה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0305",
      "professionId": "P062",
      "nameHe": "ביטוח אחריות מקצועית",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0306",
      "professionId": "P063",
      "nameHe": "מלאי סחורה",
      "category": "מלאי",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "נזקף למלאי סגירה - לא הוצאה שוטפת מלאה",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0307",
      "professionId": "P063",
      "nameHe": "קופה רושמת ומסוף סליקה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0308",
      "professionId": "P063",
      "nameHe": "מדפים, תצוגה וריהוט חנות",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.06,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.06,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0309",
      "professionId": "P063",
      "nameHe": "שילוט ועיצוב חזית",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0310",
      "professionId": "P063",
      "nameHe": "מצלמות אבטחה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0311",
      "professionId": "P063",
      "nameHe": "ביטוח תכולה ופריצה",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0312",
      "professionId": "P063",
      "nameHe": "שקיות ואריזה",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0313",
      "professionId": "P063",
      "nameHe": "תמלוגי מוזיקה (אקו\"ם)",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0314",
      "professionId": "P064",
      "nameHe": "פלטפורמה (Shopify, WooCommerce, Wix)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0315",
      "professionId": "P064",
      "nameHe": "עמלות סליקה",
      "category": "מימון",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0316",
      "professionId": "P064",
      "nameHe": "מכס ומע\"מ ביבוא",
      "category": "מלאי",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "מע\"מ יבוא ניתן לקיזוז מול רשימון",
      "legalSourceHe": "חוק המכס + חוק מע\"מ",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0317",
      "professionId": "P064",
      "nameHe": "עמילות מכס ושילוח בינלאומי",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0318",
      "professionId": "P064",
      "nameHe": "מחסן / שירותי פולפילמנט",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0319",
      "professionId": "P064",
      "nameHe": "אריזות ומיתוג",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0320",
      "professionId": "P064",
      "nameHe": "צילומי מוצר",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0321",
      "professionId": "P064",
      "nameHe": "החזרות ואובדן מלאי",
      "category": "מלאי",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0322",
      "professionId": "P064",
      "nameHe": "תוכנת ניהול מלאי",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0323",
      "professionId": "P065",
      "nameHe": "מנויי ספקים (AliExpress, CJ)",
      "category": "מלאי",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0324",
      "professionId": "P065",
      "nameHe": "כלי אוטומציה (DSers)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0325",
      "professionId": "P065",
      "nameHe": "כלי מחקר מוצרים",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0326",
      "professionId": "P065",
      "nameHe": "שער תשלומים",
      "category": "מימון",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0327",
      "professionId": "P066",
      "nameHe": "דמי דוכן ורישיון עסק",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0328",
      "professionId": "P066",
      "nameHe": "רכב מסחרי",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "conditionHe": "N1 עד 3.5 טון - 45%",
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0329",
      "professionId": "P066",
      "nameHe": "סככות, שולחנות וציוד תצוגה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0330",
      "professionId": "P066",
      "nameHe": "מלאי סחורה",
      "category": "מלאי",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0331",
      "professionId": "P067",
      "nameHe": "אשראי דוקומנטרי (LC) ועמלות",
      "category": "מימון",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0332",
      "professionId": "P067",
      "nameHe": "ביטוח מטען ימי/אווירי",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0333",
      "professionId": "P067",
      "nameHe": "אחסנה ולוגיסטיקה",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0334",
      "professionId": "P067",
      "nameHe": "תקינה ואישורי מכון התקנים",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0335",
      "professionId": "P067",
      "nameHe": "רישיונות יבוא",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0336",
      "professionId": "P067",
      "nameHe": "עמילות מכס",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0337",
      "professionId": "P068",
      "nameHe": "רישיון עסק ואגרות",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0338",
      "professionId": "P068",
      "nameHe": "תעודת כשרות",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0339",
      "professionId": "P068",
      "nameHe": "חומרי גלם ומזון",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0340",
      "professionId": "P068",
      "nameHe": "ציוד מטבח מקצועי",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.07,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.07,
      "vatFraction": 1,
      "conditionHe": "ציוד מטבח כללי 7%",
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0341",
      "professionId": "P068",
      "nameHe": "ריהוט וציוד מסעדה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.12,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.12,
      "vatFraction": 1,
      "conditionHe": "12%",
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0342",
      "professionId": "P068",
      "nameHe": "מכונת אספרסו",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "conditionHe": "20% - סעיף מפורש בתקנות",
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0343",
      "professionId": "P068",
      "nameHe": "מנדף ומערכת כיבוי אש",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0344",
      "professionId": "P068",
      "nameHe": "שכר עובדים ותלושים",
      "category": "כוח אדם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0345",
      "professionId": "P068",
      "nameHe": "כלי הגשה ושבירה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0346",
      "professionId": "P068",
      "nameHe": "מדים לעובדים",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "עם לוגו - 100%",
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0347",
      "professionId": "P068",
      "nameHe": "הדברה ובדיקות משרד הבריאות",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0348",
      "professionId": "P068",
      "nameHe": "פינוי שמן ופסולת",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0349",
      "professionId": "P068",
      "nameHe": "תמלוגי מוזיקה (אקו\"ם / הפדרציה)",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0350",
      "professionId": "P068",
      "nameHe": "עמלות משלוחים (Wolt, תן ביס)",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0351",
      "professionId": "P069",
      "nameHe": "רכב הובלה מבודד",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "conditionHe": "N1 עד 3.5 טון - 45%",
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0352",
      "professionId": "P069",
      "nameHe": "ציוד הגשה ניידת",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0353",
      "professionId": "P069",
      "nameHe": "שולחנות, כיסויים ומצעים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.06,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.06,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0354",
      "professionId": "P069",
      "nameHe": "כשרות",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0355",
      "professionId": "P069",
      "nameHe": "ביטוח אחריות מוצר",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0356",
      "professionId": "P069",
      "nameHe": "עובדים זמניים",
      "category": "כוח אדם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0357",
      "professionId": "P070",
      "nameHe": "תנורים ומיקסרים תעשייתיים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0358",
      "professionId": "P070",
      "nameHe": "קמח וחומרי גלם",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0359",
      "professionId": "P070",
      "nameHe": "אריזות וקופסאות",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0360",
      "professionId": "P070",
      "nameHe": "מערכות קירור",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0361",
      "professionId": "P070",
      "nameHe": "כשרות",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0362",
      "professionId": "P070",
      "nameHe": "רכב חלוקה",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0363",
      "professionId": "P071",
      "nameHe": "רישוי משאית מזון",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0364",
      "professionId": "P071",
      "nameHe": "רכב פודטראק",
      "category": "רכב",
      "formula": {
        "kind": "custom",
        "formulaTextHe": "מעל 3.5 טון -> 100%. מתחת -> 45%. לבדוק סיווג ברישיון",
        "vatRate": null
      },
      "incomeTaxFraction": null,
      "vatFraction": null,
      "conditionHe": "מעל 3.5 טון -> 100%. מתחת -> 45%. לבדוק סיווג ברישיון",
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0365",
      "professionId": "P071",
      "nameHe": "גנרטור ודלק",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0366",
      "professionId": "P071",
      "nameHe": "בלוני גז",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0367",
      "professionId": "P071",
      "nameHe": "דמי עמדה/חניה באירועים",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0368",
      "professionId": "P071",
      "nameHe": "כשרות ניידת",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0369",
      "professionId": "P072",
      "nameHe": "ציוד בישול מקצועי",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.07,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.07,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0370",
      "professionId": "P072",
      "nameHe": "חומרי גלם",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0371",
      "professionId": "P072",
      "nameHe": "נסיעות ללקוחות",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0372",
      "professionId": "P072",
      "nameHe": "רישיון עסק ביתי",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0373",
      "professionId": "P072",
      "nameHe": "כלים ואריזות",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0374",
      "professionId": "P073",
      "nameHe": "מלאי אלכוהול",
      "category": "מלאי",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0375",
      "professionId": "P073",
      "nameHe": "רישיון מכירת משקאות משכרים",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0376",
      "professionId": "P073",
      "nameHe": "כלי בר וציוד",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.12,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.12,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0377",
      "professionId": "P073",
      "nameHe": "קרח ומתכלים",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0378",
      "professionId": "P073",
      "nameHe": "אבטחה",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0379",
      "professionId": "P074",
      "nameHe": "כיסאות, תחנות וכיורי שטיפה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0380",
      "professionId": "P074",
      "nameHe": "מספריים, מכונות ומברשות",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "מתחדשות תדיר",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0381",
      "professionId": "P074",
      "nameHe": "צבעים וחומרי טיפול",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0382",
      "professionId": "P074",
      "nameHe": "מגבות ושירותי כביסה",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0383",
      "professionId": "P074",
      "nameHe": "מוצרים למכירה ללקוחות",
      "category": "מלאי",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0384",
      "professionId": "P074",
      "nameHe": "מדים",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0385",
      "professionId": "P074",
      "nameHe": "רישיון עסק ותמלוגי מוזיקה",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0386",
      "professionId": "P075",
      "nameHe": "מיטת טיפולים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0387",
      "professionId": "P075",
      "nameHe": "מכשור אסתטי (RF, לייזר, HIFU)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "conditionHe": "הוצאה הונית משמעותית",
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0388",
      "professionId": "P075",
      "nameHe": "תכשירים, מסכות וחומרים",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0389",
      "professionId": "P075",
      "nameHe": "כפפות וציוד חד-פעמי",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0390",
      "professionId": "P075",
      "nameHe": "אוטוקלב וסטריליזציה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0391",
      "professionId": "P075",
      "nameHe": "רישיון למכשור פולשני",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0392",
      "professionId": "P075",
      "nameHe": "ביטוח אחריות מקצועית",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0393",
      "professionId": "P075",
      "nameHe": "פינוי פסולת",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0394",
      "professionId": "P076",
      "nameHe": "שולחן עבודה ומנורת UV",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0395",
      "professionId": "P076",
      "nameHe": "ג'לים, לקים וחומרים",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0396",
      "professionId": "P076",
      "nameHe": "שואב אבק לציפורניים ומערכת אוורור",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0397",
      "professionId": "P076",
      "nameHe": "כלים וסטריליזציה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0398",
      "professionId": "P076",
      "nameHe": "רישיון עסק",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0399",
      "professionId": "P077",
      "nameHe": "ערכות איפור",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "מתכלה ויקרה",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0400",
      "professionId": "P077",
      "nameHe": "מברשות וסטריליזציה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0401",
      "professionId": "P077",
      "nameHe": "מראה מקצועית ותאורה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0402",
      "professionId": "P077",
      "nameHe": "תיק נסיעה מקצועי",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0403",
      "professionId": "P077",
      "nameHe": "רכב לעבודה ניידת",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0404",
      "professionId": "P078",
      "nameHe": "פיגמנטים וחומרים",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0405",
      "professionId": "P078",
      "nameHe": "מחטים חד-פעמיות",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0406",
      "professionId": "P078",
      "nameHe": "רישיון משרד הבריאות",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0407",
      "professionId": "P078",
      "nameHe": "ביטוח אחריות מקצועית",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0408",
      "professionId": "P078",
      "nameHe": "פינוי פסולת חדה",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0409",
      "professionId": "P079",
      "nameHe": "מיטת עיסוי",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0410",
      "professionId": "P079",
      "nameHe": "שמנים ותכשירים",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0411",
      "professionId": "P079",
      "nameHe": "מגבות ושירותי כביסה",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0412",
      "professionId": "P079",
      "nameHe": "הסמכה והשתלמויות",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0413",
      "professionId": "P080",
      "nameHe": "הסמכת מאמן כושר (וינגייט)",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0414",
      "professionId": "P080",
      "nameHe": "ביטוח אחריות מקצועית",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0415",
      "professionId": "P080",
      "nameHe": "ציוד נייד (גומיות, קטלבל, TRX)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0416",
      "professionId": "P080",
      "nameHe": "שכירת שעות בחדר כושר",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0417",
      "professionId": "P080",
      "nameHe": "אפליקציית תוכניות אימון",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0418",
      "professionId": "P080",
      "nameHe": "ביגוד עם לוגו",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0419",
      "professionId": "P080",
      "nameHe": "רכב לאימוני בית",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0420",
      "professionId": "P080",
      "nameHe": "קורס עזרה ראשונה והחייאה",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0421",
      "professionId": "P081",
      "nameHe": "הסמכה והשתלמויות",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0422",
      "professionId": "P081",
      "nameHe": "מזרנים ואביזרים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0423",
      "professionId": "P081",
      "nameHe": "מכשיר רפורמר",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0424",
      "professionId": "P081",
      "nameHe": "שכירות סטודיו",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0425",
      "professionId": "P081",
      "nameHe": "תמלוגי מוזיקה",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0426",
      "professionId": "P082",
      "nameHe": "ציוד כבד ורצפת גומי",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0427",
      "professionId": "P082",
      "nameHe": "מערכת שמע",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0428",
      "professionId": "P082",
      "nameHe": "ביטוח מוגבר",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0429",
      "professionId": "P082",
      "nameHe": "רישיון עסק",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0430",
      "professionId": "P082",
      "nameHe": "מדים לצוות",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0431",
      "professionId": "P083",
      "nameHe": "הסמכה בתזונת ספורט",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0432",
      "professionId": "P083",
      "nameHe": "מכשירי מדידה והרכב גוף",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0433",
      "professionId": "P083",
      "nameHe": "מלאי תוספי תזונה למכירה",
      "category": "מלאי",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0434",
      "professionId": "P084",
      "nameHe": "ארגומטר ומד לקטט",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0435",
      "professionId": "P084",
      "nameHe": "כיול ציוד",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0436",
      "professionId": "P084",
      "nameHe": "ביטוח אחריות",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0437",
      "professionId": "P085",
      "nameHe": "רישיון והיתר מונית (מספר)",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "conditionHe": "רכישת מספר - נכס הוני",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0438",
      "professionId": "P085",
      "nameHe": "הוצאות החזקת מונית",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.9,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.9,
      "vatFraction": 1,
      "conditionHe": "90% - הגבוה מבין (הוצאות פחות שווי שימוש) או 90%",
      "legalSourceHe": "תק' 2(1ב)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0439",
      "professionId": "P085",
      "nameHe": "פחת מונית",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "conditionHe": "20% לשנה, כפוף למגבלת 90%",
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0440",
      "professionId": "P085",
      "nameHe": "מונה ומערכות",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0441",
      "professionId": "P085",
      "nameHe": "עמלות אפליקציות (Gett, Yango)",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0442",
      "professionId": "P085",
      "nameHe": "ביטוח מונית",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0443",
      "professionId": "P085",
      "nameHe": "כביש 6 וחניונים",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.9,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.9,
      "vatFraction": 1,
      "legalSourceHe": "תק' 2(1ב)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0444",
      "professionId": "P086",
      "nameHe": "רישיון מפעיל הסעות",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0445",
      "professionId": "P086",
      "nameHe": "רכב הסעות עד 3.5 טון",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "conditionHe": "M1/N1 עד 3.5 טון - 45%, אלא אם מסווג כאוטובוס ציבורי",
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0446",
      "professionId": "P086",
      "nameHe": "אוטובוס מעל 3.5 טון",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "מחוץ להגדרה - 100% + מע\"מ מלא",
      "legalSourceHe": "הגדרת 'רכב' בתק' 1",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0447",
      "professionId": "P086",
      "nameHe": "ביטוח נוסעים",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0448",
      "professionId": "P086",
      "nameHe": "טכוגרף ובדיקות תקופתיות",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0449",
      "professionId": "P086",
      "nameHe": "מלווה בהסעות תלמידים",
      "category": "כוח אדם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0450",
      "professionId": "P087",
      "nameHe": "אופנוע / קטנוע L3",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.25,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.25,
      "vatFraction": 0.667,
      "conditionHe": "25% בלבד",
      "legalSourceHe": "תק' 2(1)(א)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0451",
      "professionId": "P087",
      "nameHe": "פחת אופנוע",
      "category": "רכב",
      "formula": {
        "kind": "custom",
        "formulaTextHe": "15%, כפוף למגבלת 25%",
        "vatRate": null
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": null,
      "conditionHe": "15%, כפוף למגבלת 25%",
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0452",
      "professionId": "P087",
      "nameHe": "קסדה וציוד מגן",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0453",
      "professionId": "P087",
      "nameHe": "תיק תרמי ואביזרי משלוח",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0454",
      "professionId": "P087",
      "nameHe": "עמלות אפליקציות",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0455",
      "professionId": "P087",
      "nameHe": "טלפון נייד",
      "category": "תקשורת",
      "formula": {
        "kind": "custom",
        "formulaTextHe": "הוצאה פחות MIN(1380, 50%)",
        "vatRate": 0.667
      },
      "incomeTaxFraction": null,
      "vatFraction": 0.667,
      "conditionHe": "הוצאה פחות MIN(1380, 50%)",
      "legalSourceHe": "תק' 2(3)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0456",
      "professionId": "P088",
      "nameHe": "משאית מעל 3.5 טון",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "מחוץ להגדרת 'רכב' - 100% + מע\"מ מלא גם ברכישה",
      "legalSourceHe": "הגדרת 'רכב' בתק' 1",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0457",
      "professionId": "P088",
      "nameHe": "פחת משאית",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "conditionHe": "20% לשנה",
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0458",
      "professionId": "P088",
      "nameHe": "רישיון מוביל",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0459",
      "professionId": "P088",
      "nameHe": "ביטוח מטען",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0460",
      "professionId": "P088",
      "nameHe": "ציוד קשירה ומנופים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0461",
      "professionId": "P088",
      "nameHe": "סבלים ועובדים",
      "category": "כוח אדם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0462",
      "professionId": "P088",
      "nameHe": "מחסן ביניים",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0463",
      "professionId": "P089",
      "nameHe": "רישיון עמיל מכס",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0464",
      "professionId": "P089",
      "nameHe": "מערכות שער עולמי ומכס",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0465",
      "professionId": "P089",
      "nameHe": "ערבויות בנקאיות",
      "category": "מימון",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0466",
      "professionId": "P089",
      "nameHe": "ביטוח אחריות מקצועית",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0467",
      "professionId": "P090",
      "nameHe": "ריהוט וציוד ליחידת האירוח",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.06,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.06,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0468",
      "professionId": "P090",
      "nameHe": "מצעים, מגבות ושירותי כביסה",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0469",
      "professionId": "P090",
      "nameHe": "ניקיון בין אורחים",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0470",
      "professionId": "P090",
      "nameHe": "חשמל, מים, גז וארנונה",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "לפי חלק היחידה המושכרת",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0471",
      "professionId": "P090",
      "nameHe": "עמלות פלטפורמה (Airbnb, Booking)",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0472",
      "professionId": "P090",
      "nameHe": "ביטוח מארחים",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0473",
      "professionId": "P090",
      "nameHe": "כלכלת בוקר לאורחים",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0474",
      "professionId": "P090",
      "nameHe": "רישוי עסק תיירותי",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0475",
      "professionId": "P091",
      "nameHe": "רישיון סוכן נסיעות וערבות",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0476",
      "professionId": "P091",
      "nameHe": "מערכות הזמנה (Amadeus, Galileo)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0477",
      "professionId": "P091",
      "nameHe": "דמי חבר בהתאחדות סוכני הנסיעות",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0478",
      "professionId": "P091",
      "nameHe": "נסיעות היכרות (Fam Trips)",
      "category": "נסיעות",
      "formula": {
        "kind": "custom",
        "formulaTextHe": "כפוף לכללי נסיעות חו\"ל; דורש תיעוד אופי עסקי",
        "vatRate": null
      },
      "incomeTaxFraction": null,
      "vatFraction": null,
      "conditionHe": "כפוף לכללי נסיעות חו\"ל; דורש תיעוד אופי עסקי",
      "legalSourceHe": "תק' 2(2)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0479",
      "professionId": "P092",
      "nameHe": "שכירות אולם וציוד",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0480",
      "professionId": "P092",
      "nameHe": "הגברה, תאורה ובמה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0481",
      "professionId": "P092",
      "nameHe": "אבטחה וסדרנים",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0482",
      "professionId": "P092",
      "nameHe": "ביטוח אירוע",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0483",
      "professionId": "P092",
      "nameHe": "רישיונות ואגרות עירייה",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0484",
      "professionId": "P092",
      "nameHe": "ספקי משנה וקייטרינג",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "conditionHe": "במסגרת ההפקה - לא 'אירוח'",
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0485",
      "professionId": "P093",
      "nameHe": "ציוד הגברה ותקליטנות",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0486",
      "professionId": "P093",
      "nameHe": "ספריות מוזיקה ורישיונות",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0487",
      "professionId": "P093",
      "nameHe": "כבלים, מיקרופונים ומתכלים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0488",
      "professionId": "P093",
      "nameHe": "רכב להובלת ציוד",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0489",
      "professionId": "P093",
      "nameHe": "ביטוח ציוד",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0490",
      "professionId": "P093",
      "nameHe": "ביגוד הופעה",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.8,
        "vatRate": 0.8
      },
      "incomeTaxFraction": 0.8,
      "vatFraction": 0.8,
      "conditionHe": "80% אם ניתן לשימוש פרטי",
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0491",
      "professionId": "P094",
      "nameHe": "ציוד צילום ותאורה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0492",
      "professionId": "P094",
      "nameHe": "ביטוח ציוד מוגבר",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0493",
      "professionId": "P094",
      "nameHe": "מערכת גיבוי כפולה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0494",
      "professionId": "P094",
      "nameHe": "אלבומים והדפסות",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0495",
      "professionId": "P094",
      "nameHe": "נסיעות לאירועים",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0496",
      "professionId": "P095",
      "nameHe": "זרעים ושתילים",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0497",
      "professionId": "P095",
      "nameHe": "דשנים וחומרי הדברה",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0498",
      "professionId": "P095",
      "nameHe": "מים ומכסות מים",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0499",
      "professionId": "P095",
      "nameHe": "טרקטור וכלים חקלאיים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "conditionHe": "רכב עבודה - מחוץ להגדרת 'רכב'",
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0500",
      "professionId": "P095",
      "nameHe": "חממות ורשתות",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0501",
      "professionId": "P095",
      "nameHe": "עובדים זרים והיתרי העסקה",
      "category": "כוח אדם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0502",
      "professionId": "P095",
      "nameHe": "ביטוח יבול (קנט)",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0503",
      "professionId": "P095",
      "nameHe": "אגרות מועצות ייצור",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0504",
      "professionId": "P095",
      "nameHe": "אחסון וקירור",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0505",
      "professionId": "P096",
      "nameHe": "מזון ותוספים לבעלי חיים",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0506",
      "professionId": "P096",
      "nameHe": "שירותי וטרינר וחיסונים",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0507",
      "professionId": "P096",
      "nameHe": "לולים / רפתות ומבנים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.04,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.04,
      "vatFraction": 1,
      "conditionHe": "מבנים 4%",
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0508",
      "professionId": "P096",
      "nameHe": "ציוד חליבה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0509",
      "professionId": "P096",
      "nameHe": "פינוי זבל",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0510",
      "professionId": "P096",
      "nameHe": "רישוי משרד החקלאות",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0511",
      "professionId": "P097",
      "nameHe": "כלי גינון (מכסחה, מפוח, מזמרה)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0512",
      "professionId": "P097",
      "nameHe": "צמחייה, אדמה ודשן",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0513",
      "professionId": "P097",
      "nameHe": "מערכות השקיה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0514",
      "professionId": "P097",
      "nameHe": "רכב מסחרי ונגרר",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0515",
      "professionId": "P097",
      "nameHe": "פינוי גזם",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0516",
      "professionId": "P097",
      "nameHe": "רישיון ריסוס",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0517",
      "professionId": "P097",
      "nameHe": "ציוד מגן אישי",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0518",
      "professionId": "P098",
      "nameHe": "ביטוח אחריות ונשיכות",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0519",
      "professionId": "P098",
      "nameHe": "רצועות, מוצנים וציוד",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0520",
      "professionId": "P098",
      "nameHe": "רכב מותאם להסעת כלבים",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0521",
      "professionId": "P098",
      "nameHe": "רישוי עירוני לפנסיון",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0522",
      "professionId": "P098",
      "nameHe": "מזון, חיטוי ווטרינר",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0523",
      "professionId": "P099",
      "nameHe": "הסמכת אילוף",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0524",
      "professionId": "P099",
      "nameHe": "ציוד אילוף",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0525",
      "professionId": "P099",
      "nameHe": "שכירות מגרש אילוף",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0526",
      "professionId": "P099",
      "nameHe": "ביטוח נשיכות",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0527",
      "professionId": "P100",
      "nameHe": "חומרי ניקוי",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0528",
      "professionId": "P100",
      "nameHe": "מכונות (שואב תעשייתי, מכונת שטיפה)",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0529",
      "professionId": "P100",
      "nameHe": "מדים עם לוגו",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0530",
      "professionId": "P100",
      "nameHe": "כפפות וציוד מגן",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0531",
      "professionId": "P100",
      "nameHe": "ביטוח צד ג'",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0532",
      "professionId": "P100",
      "nameHe": "עובדים",
      "category": "כוח אדם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0533",
      "professionId": "P101",
      "nameHe": "רישיון מדביר - המשרד להגנת הסביבה",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0534",
      "professionId": "P101",
      "nameHe": "רעלים וחומרי הדברה",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0535",
      "professionId": "P101",
      "nameHe": "ציוד ריסוס",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0536",
      "professionId": "P101",
      "nameHe": "ציוד מגן מלא ומסכות",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0537",
      "professionId": "P101",
      "nameHe": "מחסן מאובטח לרעלים",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0538",
      "professionId": "P101",
      "nameHe": "ביטוח מוגבר",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0539",
      "professionId": "P102",
      "nameHe": "רישיון כלי ירייה",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0540",
      "professionId": "P102",
      "nameHe": "אימוני ירי ואגרות",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0541",
      "professionId": "P102",
      "nameHe": "מדים",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0542",
      "professionId": "P102",
      "nameHe": "ציוד קשר",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0543",
      "professionId": "P102",
      "nameHe": "בדיקות רפואיות תקופתיות",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0544",
      "professionId": "P103",
      "nameHe": "כלי עבודה ותוכנות אבחון",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0545",
      "professionId": "P103",
      "nameHe": "מלאי חלפים",
      "category": "מלאי",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0546",
      "professionId": "P103",
      "nameHe": "רכב לקריאות שירות",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0547",
      "professionId": "P103",
      "nameHe": "הסמכות טכניות",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0548",
      "professionId": "P104",
      "nameHe": "כלים מיוחדים ומכונת שכפול",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0549",
      "professionId": "P104",
      "nameHe": "מלאי צילינדרים ומנעולים",
      "category": "מלאי",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0550",
      "professionId": "P104",
      "nameHe": "רישיון מנעולן",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0551",
      "professionId": "P104",
      "nameHe": "רכב לקריאות",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0552",
      "professionId": "P105",
      "nameHe": "כלי נגינה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0553",
      "professionId": "P105",
      "nameHe": "מיתרים ואביזרים מתכלים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0554",
      "professionId": "P105",
      "nameHe": "אולפן הקלטה, מיקס ומאסטרינג",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0555",
      "professionId": "P105",
      "nameHe": "הפצה דיגיטלית (DistroKid)",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0556",
      "professionId": "P105",
      "nameHe": "תמלוגים (אקו\"ם, אשכולות)",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0557",
      "professionId": "P105",
      "nameHe": "הובלת ציוד ונסיעות",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0558",
      "professionId": "P105",
      "nameHe": "ביטוח כלי נגינה",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0559",
      "professionId": "P106",
      "nameHe": "שיעורי משחק ואודישנים",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0560",
      "professionId": "P106",
      "nameHe": "תיק תמונות (Headshots)",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0561",
      "professionId": "P106",
      "nameHe": "עמלת סוכן / מנג'ר",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0562",
      "professionId": "P106",
      "nameHe": "נסיעות לאודישנים והפקות",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0563",
      "professionId": "P106",
      "nameHe": "דמי חבר באיגוד השחקנים",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0564",
      "professionId": "P106",
      "nameHe": "ביגוד הופעה",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.8,
        "vatRate": 0.8
      },
      "incomeTaxFraction": 0.8,
      "vatFraction": 0.8,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0565",
      "professionId": "P107",
      "nameHe": "חומרי יצירה",
      "category": "חומרי גלם",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0566",
      "professionId": "P107",
      "nameHe": "שכירות סטודיו",
      "category": "מקום העסק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0567",
      "professionId": "P107",
      "nameHe": "מסגור והובלת עבודות",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0568",
      "professionId": "P107",
      "nameHe": "דמי גלריה ותערוכות",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0569",
      "professionId": "P107",
      "nameHe": "צילום עבודות וקטלוגים",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0570",
      "professionId": "P107",
      "nameHe": "ביטוח יצירות",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0571",
      "professionId": "P108",
      "nameHe": "מחקר וספרות מקצועית",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0572",
      "professionId": "P108",
      "nameHe": "עריכה לשונית והגהה",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0573",
      "professionId": "P108",
      "nameHe": "עיצוב עטיפה",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0574",
      "professionId": "P108",
      "nameHe": "הדפסה והוצאה עצמית",
      "category": "תפעול",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0575",
      "professionId": "P108",
      "nameHe": "רכישת ISBN",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0576",
      "professionId": "P108",
      "nameHe": "תוכנות כתיבה (Scrivener)",
      "category": "טכנולוגיה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0577",
      "professionId": "P109",
      "nameHe": "תשלום לכותבי חומר",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0578",
      "professionId": "P109",
      "nameHe": "נסיעות להופעות",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0579",
      "professionId": "P109",
      "nameHe": "ביגוד במה",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.8,
        "vatRate": 0.8
      },
      "incomeTaxFraction": 0.8,
      "vatFraction": 0.8,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0580",
      "professionId": "P109",
      "nameHe": "עמלת סוכן",
      "category": "שירותים מקצועיים",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0581",
      "professionId": "P110",
      "nameHe": "ספרי קודש וספרייה מקצועית",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0582",
      "professionId": "P110",
      "nameHe": "הסמכות ותעודות",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0583",
      "professionId": "P110",
      "nameHe": "נסיעות לבתי עסק (השגחת כשרות)",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0584",
      "professionId": "P110",
      "nameHe": "ביגוד ייצוגי",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.8,
        "vatRate": 0.8
      },
      "incomeTaxFraction": 0.8,
      "vatFraction": 0.8,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0585",
      "professionId": "P111",
      "nameHe": "ביגוד ייצוגי",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.8,
        "vatRate": 0.8
      },
      "incomeTaxFraction": 0.8,
      "vatFraction": 0.8,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0586",
      "professionId": "P111",
      "nameHe": "שיעורי קול והדרכה",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0587",
      "professionId": "P111",
      "nameHe": "הקלטות ודמו",
      "category": "שיווק",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0588",
      "professionId": "P111",
      "nameHe": "נסיעות",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0589",
      "professionId": "P112",
      "nameHe": "ציוד וכלים סטריליים",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 1
      },
      "incomeTaxFraction": 1,
      "vatFraction": 1,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0590",
      "professionId": "P112",
      "nameHe": "רישיון ועדת המוהלים",
      "category": "רגולציה",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0591",
      "professionId": "P112",
      "nameHe": "ביטוח אחריות מקצועית",
      "category": "ביטוח",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0592",
      "professionId": "P112",
      "nameHe": "נסיעות",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0593",
      "professionId": "P113",
      "nameHe": "ציוד הגברה",
      "category": "ציוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "legalSourceHe": "תקנות פחת",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0594",
      "professionId": "P113",
      "nameHe": "ביגוד ייצוגי",
      "category": "ביגוד",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.8,
        "vatRate": 0.8
      },
      "incomeTaxFraction": 0.8,
      "vatFraction": 0.8,
      "legalSourceHe": "תק' 2(6)",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    },
    {
      "id": "EX-0595",
      "professionId": "P113",
      "nameHe": "הסמכת מנחה טקסים",
      "category": "ידע",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 1,
        "vatRate": 0
      },
      "incomeTaxFraction": 1,
      "vatFraction": 0,
      "legalSourceHe": "סעיף 17",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "B"
    },
    {
      "id": "EX-0596",
      "professionId": "P113",
      "nameHe": "נסיעות",
      "category": "רכב",
      "formula": {
        "kind": "flat",
        "incomeTaxRate": 0.45,
        "vatRate": 0.667
      },
      "incomeTaxFraction": 0.45,
      "vatFraction": 0.667,
      "legalSourceHe": "תק' ניכוי הוצאות רכב",
      "rateCertainty": "legal" as const,
      "eligibilityConfidence": "A"
    }
  ],
  "depreciation": [
    {
      "ruleId": "DEP-01",
      "category": "פחת",
      "nameHe": "מחשבים אישיים וציוד היקפי",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "conditionHe": "33% לשנה",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941 - סעיף מחשבים",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-02",
      "category": "פחת",
      "nameHe": "מחשבים אחרים / שרתים",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.25,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.25,
      "vatFraction": 1,
      "conditionHe": "25% לשנה",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-03",
      "category": "פחת",
      "nameHe": "תוכנת מחשב",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "conditionHe": "מסווגת כחלק מהמחשבים: 33% (אישי) או 25% (אחר)",
      "legalSourceHe": "עמדת רשות המסים; חוזר מ\"ה 15/2002",
      "confidence": "B"
    },
    {
      "ruleId": "DEP-04",
      "category": "פחת",
      "nameHe": "אתר אינטרנט - עלויות הקמה",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.33,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.33,
      "vatFraction": 1,
      "conditionHe": "מהוונות ומופחתות כמחשבים (25%-33%)",
      "legalSourceHe": "חוזר מ\"ה 15/2002",
      "confidence": "B"
    },
    {
      "ruleId": "DEP-05",
      "category": "פחת",
      "nameHe": "ציוד אלקטרוני",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.15,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": 1,
      "conditionHe": "15% לשנה",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941 - סעיף יד(1)",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-06",
      "category": "פחת",
      "nameHe": "ריהוט ואביזרים - כללי",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.06,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.06,
      "vatFraction": 1,
      "conditionHe": "6% לשנה",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-07",
      "category": "פחת",
      "nameHe": "ריהוט וציוד בתי קפה ומסעדות",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.12,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.12,
      "vatFraction": 1,
      "conditionHe": "12% לשנה",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-08",
      "category": "פחת",
      "nameHe": "מכונת אספרסו",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.2,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": 1,
      "conditionHe": "20% לשנה - סעיף מפורש בתקנות",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-09",
      "category": "פחת",
      "nameHe": "ציוד מטבח כללי",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.07,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.07,
      "vatFraction": 1,
      "conditionHe": "7% לשנה",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "B"
    },
    {
      "ruleId": "DEP-10",
      "category": "פחת",
      "nameHe": "ציוד ומכונות - כללי",
      "formula": {
        "kind": "custom",
        "formulaTextHe": "10%-20% לפי סוג הציוד",
        "vatRate": 1
      },
      "incomeTaxFraction": null,
      "vatFraction": 1,
      "conditionHe": "10%-20% לפי סוג הציוד",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "B"
    },
    {
      "ruleId": "DEP-11",
      "category": "פחת",
      "nameHe": "רכב פרטי / אופנוע / טנדר עד 3 טון",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.15,
        "vatRate": null
      },
      "incomeTaxFraction": 0.15,
      "vatFraction": null,
      "conditionHe": "15% לשנה. הפחת עצמו כפוף למגבלת 45% (או השיעור הרלוונטי לסוג הרכב).",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941 + תקנות ניכוי הוצאות רכב",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-12",
      "category": "פחת",
      "nameHe": "מונית / אוטובוס / משאית / טנדר מעל 3 טון",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.2,
        "vatRate": null
      },
      "incomeTaxFraction": 0.2,
      "vatFraction": null,
      "conditionHe": "20% לשנה",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-13",
      "category": "פחת",
      "nameHe": "רכב ללימוד נהיגה",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.25,
        "vatRate": null
      },
      "incomeTaxFraction": 0.25,
      "vatFraction": null,
      "conditionHe": "25% לשנה",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-14",
      "category": "פחת",
      "nameHe": "מבנים",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.04,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.04,
      "vatFraction": 1,
      "conditionHe": "2%-4% לפי סוג המבנה והשימוש",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "A"
    },
    {
      "ruleId": "DEP-15",
      "category": "פחת",
      "nameHe": "שיפורים במושכר",
      "formula": {
        "kind": "depreciation",
        "annualRate": 0.1,
        "vatRate": 1
      },
      "incomeTaxFraction": 0.1,
      "vatFraction": 1,
      "conditionHe": "10% לשנה, או לפי תקופת השכירות אם קצרה יותר",
      "legalSourceHe": "תקנות מ\"ה (פחת), 1941",
      "confidence": "B"
    }
  ],
  "nonDeductible": [
    {
      "ruleId": "ENT-02",
      "category": "כיבוד ואירוח",
      "nameHe": "אירוח בארץ",
      "formula": {
        "kind": "non-deductible"
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "לא מוכר כלל",
      "legalSourceHe": "תק' 2(4) לתקנות ניכוי הוצאות מסויימות",
      "confidence": "A"
    },
    {
      "ruleId": "ENT-04",
      "category": "כיבוד ואירוח",
      "nameHe": "ארוחות של העצמאי לעצמו",
      "formula": {
        "kind": "non-deductible"
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "לא מוכר - הוצאה פרטית",
      "legalSourceHe": "סעיף 32(1) לפקודה",
      "confidence": "A"
    },
    {
      "ruleId": "SOC-05",
      "category": "ביטוח וחיסכון",
      "nameHe": "ביטוח חיים / בריאות פרטי",
      "formula": {
        "kind": "non-deductible"
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "לא מוכר כהוצאה עסקית (עשוי לזכות בזיכוי אישי)",
      "legalSourceHe": "סעיף 32(1) לפקודה",
      "confidence": "B"
    },
    {
      "ruleId": "STA-03",
      "category": "מעמד ומסלול",
      "nameHe": "עוסק פטור - מע\"מ תשומות",
      "formula": {
        "kind": "non-deductible"
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "עוסק פטור אינו מקזז מע\"מ. המע\"מ ששולם מתווסף לסכום ההוצאה לצורכי מס הכנסה.",
      "legalSourceHe": "חוק מע\"מ",
      "confidence": "A"
    },
    {
      "ruleId": "NON-01",
      "category": "לא מוכר",
      "nameHe": "קנסות, דוחות חניה ותנועה",
      "formula": {
        "kind": "non-deductible"
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "לא מוכר",
      "legalSourceHe": "סעיף 32 לפקודה",
      "confidence": "A"
    },
    {
      "ruleId": "NON-02",
      "category": "לא מוכר",
      "nameHe": "עסקה במזומן מעל 6,000 ₪ שבגינה הוטל עיצום",
      "formula": {
        "kind": "non-deductible"
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "חל על עסקאות מיום 1.1.2026. התקרה 6,000 ₪ נכון ל-2026.",
      "legalSourceHe": "חוק לצמצום השימוש במזומן + סעיף 32 לפקודה",
      "confidence": "A"
    },
    {
      "ruleId": "NON-03",
      "category": "לא מוכר",
      "nameHe": "חשבונית ללא מספר הקצאה",
      "formula": {
        "kind": "non-deductible"
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "חל על חשבוניות שהוצאו מיום 1.8.2025 ומעלה סף ההקצאה. ההוצאה כולה נפסלת.",
      "legalSourceHe": "מודל חשבוניות ישראל - חוק ההסדרים",
      "confidence": "A"
    },
    {
      "ruleId": "NON-04",
      "category": "לא מוכר",
      "nameHe": "מע\"מ ברכישת רכב פרטי (M1 עד 3.5 טון)",
      "formula": {
        "kind": "non-deductible"
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "אין קיזוז מע\"מ תשומות ברכישה",
      "legalSourceHe": "תק' 14 לתקנות מע\"מ",
      "confidence": "A"
    },
    {
      "ruleId": "NON-05",
      "category": "לא מוכר",
      "nameHe": "הוצאות לימודים להסבה מקצועית / תואר ראשון",
      "formula": {
        "kind": "non-deductible"
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "הוצאה הונית או פרטית. רק השתלמות לשימור הידע הקיים מוכרת.",
      "legalSourceHe": "סעיף 17 + הלכת בנק יהב ופסיקה",
      "confidence": "B"
    },
    {
      "ruleId": "NON-06",
      "category": "לא מוכר",
      "nameHe": "הוצאות פרטיות (מזון יומי, ביגוד רגיל, בילויים)",
      "formula": {
        "kind": "non-deductible"
      },
      "incomeTaxFraction": 0,
      "vatFraction": 0,
      "conditionHe": "לא מוכר",
      "legalSourceHe": "סעיף 32(1) לפקודה",
      "confidence": "A"
    }
  ]
};
