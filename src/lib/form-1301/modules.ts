/**
 * The 12 modules of the guided Form 1301 flow.
 * Each module groups related fields into a single conversation step with Eitan.
 */

export interface FormModule {
  id: number;
  title: string;
  eitanIntro: string;
  fieldCodes: string[]; // match FormField.code values in schema
}

export const FORM_MODULES: FormModule[] = [
  {
    id: 1,
    title: "זיהוי ופרטי תיק",
    eitanIntro:
      "בוא/י נתחיל מהבסיס — הפרטים שמזהים אותך אצל רשות המסים. תוודא/י שגיל הנישום ופרטי ת.ז. נכונים.",
    fieldCodes: ["010", "066"],
  },
  {
    id: 2,
    title: "מצב משפחתי",
    eitanIntro:
      "המצב המשפחתי קריטי — הוא קובע כמה נקודות זיכוי מגיעות לך. הכל נראה עדכני?",
    fieldCodes: ["066", "043"],
  },
  {
    id: 3,
    title: "כתובת ויצירת קשר",
    eitanIntro:
      "כדי שרשות המסים תדע לאן לשלוח הודעות (ואולי החזרים). הנה הכתובת שרשומה.",
    fieldCodes: [], // contact info from persona.contact — no schema codes
  },
  {
    id: 4,
    title: "זהות העסק",
    eitanIntro:
      'ככה העסק שלך רשום. שים/י לב לתחום העיסוק — הוא משפיע על אופן ההסתכלות של רשות המסים.',
    fieldCodes: ["034"], // osek type
  },
  {
    id: 5,
    title: "פרטי בנק להחזר",
    eitanIntro:
      "החלק הכי חשוב — לאן נכנס ההחזר. ודא/י שפרטי החשבון מדויקים.",
    fieldCodes: ["278", "277"], // bank code, account number
  },
  {
    id: 6,
    title: "שאלות כלליות",
    eitanIntro:
      'כמה שאלות טכניות כן/לא — רווחי הון, מטבע וירטואלי, הכנסות מחו"ל. סימנתי לפי מה שידוע לי, תאשר/י.',
    fieldCodes: ["290", "054", "056", "331"],
  },
  {
    id: 7,
    title: "רווחים מהעסק",
    eitanIntro:
      "הגענו למספרים. הכנסות מהעסק הן הלב של הדוח — שדה 150 הוא מה שרשות המסים תסתכל עליו ראשון.",
    fieldCodes: ["032", "150"],
  },
  {
    id: 8,
    title: "הכנסות נוספות ומחזור",
    eitanIntro:
      'מחזור הוא ההכנסות לפני ניכויים — חשוב לצרכי מקדמות ובדיקת חובת הגשת טופס 6111.',
    fieldCodes: ["238", "294", "297"],
  },
  {
    id: 9,
    title: "ניכויים אישיים",
    eitanIntro:
      "פה אנחנו חוסכים כסף. ביטוח לאומי, קרן השתלמות, פנסיה, ביטוחים — כל אחד מוריד את המס שתשלמ/י.",
    fieldCodes: ["030", "112", "135", "137"],
  },
  {
    id: 10,
    title: "נקודות זיכוי",
    eitanIntro:
      "כל נקודה שווה סכום מסוים בהפחתת מס. סיום תואר, שירות צבאי, עולה חדש/ה — ספר/י לי אם הכל תקין.",
    fieldCodes: ["020", "044", "068", "181"],
  },
  {
    id: 11,
    title: "תרומות — סעיף 46",
    eitanIntro:
      "תרומות למוסדות מוכרים מזכות ב-35% החזר מס. אם תרמת/תרמה השנה — כל שקל שווה.",
    fieldCodes: ["037", "046", "364", "045"],
  },
  {
    id: 12,
    title: "מקדמות ותשלומים",
    eitanIntro:
      "ישורת אחרונה — כמה מס כבר שולם השנה כמקדמות וניכוי במקור. זה יקוזז מהחוב הסופי.",
    fieldCodes: ["042", "115"],
  },
];
