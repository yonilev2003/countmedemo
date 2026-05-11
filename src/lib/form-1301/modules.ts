/**
 * The 12 modules of the guided Form 1301 flow.
 * Each module groups related fields into a single conversation step with Eitan.
 *
 * The `picture` / `screenshot` / `pointerPosition` / `narration` fields are
 * used by the "ליווי צמוד" (companion) track at /file/companion. The classic
 * "מסלול מודרך" at /file/guided uses only `title` + `eitanIntro` + `fieldCodes`.
 */

import {
  picture1, picture2, picture3, picture4, picture5, picture6,
  picture7, picture8, picture9, picture10, picture11, picture12,
  screenshot1, screenshot2, screenshot3, screenshot4, screenshot5, screenshot6,
  screenshot7, screenshot8, screenshot9, screenshot10, screenshot11, screenshot12,
} from "./companion-assets";

export type PointerPosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left";

export interface FormModule {
  id: number;
  title: string;
  /** Short bubble — shown in both guided and companion tracks. */
  eitanIntro: string;
  /** Codes from FormField.code (in schema.ts) — shown with copy buttons. */
  fieldCodes: string[];
  /** Optional longer text to read aloud via TTS (companion track only).
   *  Falls back to `eitanIntro` if absent. */
  narration?: string;
  /** Eitan "pointing" image (companion only). */
  picture?: string;
  /** Where to anchor the Eitan image over the screenshot. */
  pointerPosition?: PointerPosition;
  /** Screenshot of the gov.il section relevant to this step. */
  screenshot?: string;
}

export const FORM_MODULES: FormModule[] = [
  {
    id: 1,
    title: "זיהוי ופרטי תיק",
    eitanIntro:
      "בוא/י נתחיל מהבסיס — הפרטים שמזהים אותך אצל רשות המסים. תוודא/י שגיל הנישום ופרטי ת.ז. נכונים.",
    narration:
      "ברוכ/ה הבא/ה. נתחיל מהפרטים האישיים — שם, תעודת זהות וגיל. אלה הפרטים שמזהים אותך אצל רשות המסים. תוודא/י שהכל נכון לפני שממשיכים.",
    picture: picture1,
    pointerPosition: "top-right",
    screenshot: screenshot1,
    fieldCodes: ["010", "066"],
  },
  {
    id: 2,
    title: "מצב משפחתי",
    eitanIntro:
      "המצב המשפחתי קריטי — הוא קובע כמה נקודות זיכוי מגיעות לך. הכל נראה עדכני?",
    narration:
      "השלב הזה חשוב מאוד. המצב המשפחתי שלך משפיע ישירות על נקודות הזיכוי וכמות המס שתשלמ/י. רווק/ה, נשוי/אה, גרוש/ה או אלמן/ה — לכל אחד יש השלכות שונות.",
    picture: picture2,
    pointerPosition: "top-right",
    screenshot: screenshot2,
    fieldCodes: ["066", "043"],
  },
  {
    id: 3,
    title: "כתובת ויצירת קשר",
    eitanIntro:
      "כדי שרשות המסים תדע לאן לשלוח הודעות (ואולי החזרים). הנה הכתובת שרשומה.",
    narration:
      "בלעדי כתובת מעודכנת לא יוכלו לשלוח לך הודעות, ובמקרה של החזר מס — לא תקבל/י אותו בזמן. עבור/י על הפרטים בקפידה.",
    picture: picture3,
    pointerPosition: "bottom-right",
    screenshot: screenshot3,
    fieldCodes: [],
  },
  {
    id: 4,
    title: "זהות העסק",
    eitanIntro:
      'ככה העסק שלך רשום. שים/י לב לתחום העיסוק — הוא משפיע על אופן ההסתכלות של רשות המסים.',
    narration:
      "תחום העיסוק שלך הוא מפתח חשוב. עוסק פטור, מורשה או זעיר — לכל אחד חוקים שונים. גם תחום הפעילות (קריאייטיב, טכנולוגיה, ייעוץ) משפיע על ההוצאות שמוכרות לך.",
    picture: picture4,
    pointerPosition: "top-right",
    screenshot: screenshot4,
    fieldCodes: ["034"],
  },
  {
    id: 5,
    title: "פרטי בנק להחזר",
    eitanIntro:
      "החלק הכי חשוב — לאן נכנס ההחזר. ודא/י שפרטי החשבון מדויקים.",
    narration:
      "אם מגיע לך החזר מס, הוא ייכנס לחשבון שתזיני כאן. ספרה שגויה אחת — וההחזר מתעכב. בדק/י את שם הבנק, קוד הסניף ומספר החשבון פעמיים.",
    picture: picture5,
    pointerPosition: "bottom-right",
    screenshot: screenshot5,
    fieldCodes: ["278", "277"],
  },
  {
    id: 6,
    title: "שאלות כלליות",
    eitanIntro:
      'כמה שאלות טכניות כן/לא — רווחי הון, מטבע וירטואלי, הכנסות מחו"ל. סימנתי לפי מה שידוע לי, תאשר/י.',
    narration:
      "אלה שאלות שמשפיעות על המורכבות של הדוח שלך. אם יש לך רווחים מחשבון השקעות, ביטקוין, או הכנסות מחוץ לישראל — סמני כן. אני סימנתי לפי מה שיש לי, תאמתי לי.",
    picture: picture6,
    pointerPosition: "top-left",
    screenshot: screenshot6,
    fieldCodes: ["290", "054", "056", "331"],
  },
  {
    id: 7,
    title: "רווחים מהעסק",
    eitanIntro:
      "הגענו למספרים. הכנסות מהעסק הן הלב של הדוח — שדה 150 הוא מה שרשות המסים תסתכל עליו ראשון.",
    narration:
      "זה הלב של הדוח. שדה 150 — הכנסות מהעסק שלך אחרי הוצאות מוכרות. כל הוצאה שתיעדת מקטינה את המס. אם מספר נראה לך גבוה מדי או נמוך מדי, נחזור לעבור על ההוצאות.",
    picture: picture7,
    pointerPosition: "top-right",
    screenshot: screenshot7,
    fieldCodes: ["032", "150"],
  },
  {
    id: 8,
    title: "הכנסות נוספות ומחזור",
    eitanIntro:
      'מחזור הוא ההכנסות לפני ניכויים — חשוב לצרכי מקדמות ובדיקת חובת הגשת טופס 6111.',
    narration:
      "המחזור הוא סך כל ההכנסות לפני שמורידים הוצאות. אם המחזור שלך גבוה מ-256,000 שקל, חייבים גם טופס 6111. אני אבדוק את זה אוטומטית.",
    picture: picture8,
    pointerPosition: "top-right",
    screenshot: screenshot8,
    fieldCodes: ["238", "294", "297"],
  },
  {
    id: 9,
    title: "ניכויים אישיים",
    eitanIntro:
      "פה אנחנו חוסכים כסף. ביטוח לאומי, קרן השתלמות, פנסיה, ביטוחים — כל אחד מוריד את המס שתשלמ/י.",
    narration:
      "השלב הזה חוסך הכי הרבה כסף. כל שקל בקרן השתלמות, בפנסיה, בביטוח אובדן כושר עבודה — מוריד את המס. הביטוח הלאומי שלך נכנס פה אוטומטית, חמישים ושתיים אחוז ממנו מוכרים.",
    picture: picture9,
    pointerPosition: "top-right",
    screenshot: screenshot9,
    fieldCodes: ["030", "112", "135", "137"],
  },
  {
    id: 10,
    title: "נקודות זיכוי",
    eitanIntro:
      "כל נקודה שווה סכום מסוים בהפחתת מס. סיום תואר, שירות צבאי, עולה חדש/ה — ספר/י לי אם הכל תקין.",
    narration:
      "כל נקודת זיכוי שווה בערך אלפיים ותשע מאות ארבע שקלים בשנה, ישר מהמס. עולה חדש/ה זוכה לנקודות נוספות בשלוש השנים הראשונות, חייל/ת משוחרר/ת — שלוש שנים מהשחרור. בדקי שלא פספסתי כלום.",
    picture: picture10,
    pointerPosition: "top-right",
    screenshot: screenshot10,
    fieldCodes: ["020", "044", "068", "181"],
  },
  {
    id: 11,
    title: "תרומות — סעיף 46",
    eitanIntro:
      "תרומות למוסדות מוכרים מזכות ב-35% החזר מס. אם תרמת/תרמה השנה — כל שקל שווה.",
    narration:
      "סעיף ארבעים ושש לפקודת מס הכנסה — תרומה למוסד מוכר מחזירה לך שלושים וחמישה אחוז ממנה כזיכוי מס. אם תרמת מאתיים שקל ויותר במצטבר — שווה לדווח.",
    picture: picture11,
    pointerPosition: "bottom-right",
    screenshot: screenshot11,
    fieldCodes: ["037", "046", "364", "045"],
  },
  {
    id: 12,
    title: "מקדמות ותשלומים",
    eitanIntro:
      "ישורת אחרונה — כמה מס כבר שולם השנה כמקדמות וניכוי במקור. זה יקוזז מהחוב הסופי.",
    narration:
      "ישורת אחרונה. מקדמות זה מס שכבר שילמת במהלך השנה, ניכוי במקור זה מס שלקוחות הורידו לך. שניהם מתקזזים מהחוב הסופי. אם המקדמות גבוהות מהחוב — מגיע לך החזר.",
    picture: picture12,
    pointerPosition: "bottom-right",
    screenshot: screenshot12,
    fieldCodes: ["042", "115"],
  },
];
