/**
 * Eitan's knowledge layer (CEO plan §3.4):
 *
 * 1. renderEitanConstants(year) — the year-keyed tax constants serialized into
 *    prompt text. THE ONLY numbers Eitan may quote come from here (or from the
 *    deterministic tools). Stable key order + fixed formatting so the rendered
 *    block is byte-identical per year → a shared, cacheable prompt prefix.
 *
 * 2. EITAN_KNOWLEDGE — the first 12 curated Q&As of the 60–80 target
 *    (docs/specs/beta/eitan.md). Answers are CONCEPTUAL — every figure is
 *    referenced by constant name, never hardcoded, so answers stay correct
 *    when the regulator updates a year.
 *
 * STATUS: every answer is DRAFT — pending Roy's verification (EIT-6). The
 * prompt discloses draft status honestly (per Yoni's 19/07 escalation
 * decision: Eitan admits the system is new and info may be incomplete).
 */

import { getTaxYearConstants } from "@/lib/calculators/types";

const nis = (n: number) => `${n.toLocaleString("he-IL")} ₪`;
const pct = (r: number) => `${Math.round(r * 100)}%`;

/**
 * Deterministic constants block for the system prompt. Key order is fixed —
 * do not reorder (byte-stability keys the Anthropic prompt cache).
 */
export function renderEitanConstants(year: number): string {
  const c = getTaxYearConstants(year);
  return `טבלת קבועים רשמית לשנת ${year} (מקור האמת היחיד למספרים — צטט רק מכאן או מתוצאות הכלים):
מע"מ: ${pct(c.vatRate)}
תקרת עוסק פטור: ${nis(c.osekPaturThreshold)} לשנה
תקרת מסלול עוסק זעיר: ${nis(c.osekZeirThreshold)} לשנה
הכרה אוטומטית במסלול זעיר: ${pct(c.osekZeirExpenseRate)} מהמחזור
סף חובת טופס 6111: מחזור ${nis(c.form6111Threshold)}
זיכוי תרומות (סעיף 46): ${pct(c.donationsCreditPercent)} מהתרומה, מרצפה של ${nis(c.donationsCreditMinimum)} ועד תקרה של ${pct(c.donationsCreditIncomeCeilingRate)} מההכנסה החייבת
שווי נקודת זיכוי: ${nis(c.pointValueAnnual)} לשנה
נקודות זיכוי תושב/ת: ${c.residentCreditPoints} (ולאישה תוספת ${c.femaleResidentBonusPoints})
תקרת הפקדה מוטבת לקרן השתלמות: ${nis(c.kerenExemptDepositCap)}
מס יסף: ${pct(c.surtaxRate)} על הכנסה מעל ${nis(c.surtaxThreshold)}`;
}

export interface KnowledgeEntry {
  id: string;
  question: string;
  /** Conceptual answer — figures only by reference to the constants block. */
  answer: string;
  status: "draft" | "verified";
}

// DRAFT — NEEDS ROY VERIFICATION (EIT-6). Sourced from the israeli-* skills;
// factual register, no advice verbs, no hardcoded year-figures.
export const EITAN_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "osek-types",
    question: "מה ההבדל בין עוסק פטור, עוסק מורשה ועוסק זעיר?",
    answer:
      "עוסק פטור — פטור מגביית מע\"מ ומדיווחי מע\"מ שוטפים, כל עוד המחזור השנתי מתחת לתקרה שבטבלה; מפיק קבלות, לא חשבוניות מס. עוסק מורשה — גובה מע\"מ, מדווח למע\"מ, ומפיק חשבוניות מס. עוסק זעיר איננו סוג עוסק שלישי אלא מסלול מס הכנסה מפושט לעוסקים קטנים, שבו מוכר אוטומטית אחוז קבוע מהמחזור כהוצאות בלי לתעד אותן.",
    status: "draft",
  },
  {
    id: "mikdamot",
    question: "מה זה מקדמות מס הכנסה?",
    answer:
      "מקדמות הן תשלומים חודשיים או דו-חודשיים על חשבון המס של השנה הנוכחית, לפי אחוז מהמחזור שקובעת רשות המסים. בסוף השנה, הדוח השנתי עושה התחשבנות: שילמת יותר מדי — מקבלים החזר; פחות מדי — משלימים.",
    status: "draft",
  },
  {
    id: "vat-basics",
    question: "מה זה מע\"מ ומתי מדווחים?",
    answer:
      "מס ערך מוסף נגבה מהלקוח על כל עסקה של עוסק מורשה, בשיעור שבטבלת הקבועים. העוסק מעביר לרשות המסים את ההפרש בין המע\"מ שגבה למע\"מ ששילם על הוצאות מוכרות (מס תשומות). הדיווח חודשי או דו-חודשי, לפי גובה המחזור. עוסק פטור לא גובה ולא מדווח מע\"מ שוטף — רק הצהרה שנתית על המחזור.",
    status: "draft",
  },
  {
    id: "deductible-expenses",
    question: "אילו הוצאות מוכרות לעצמאי?",
    answer:
      "העיקרון: הוצאה שמשמשת לייצור ההכנסה — מוכרת. חלק מההוצאות מוכרות במלואן (חומרים, תוכנות מקצועיות, שיווק), חלק חלקית לפי כללים קבועים (רכב, טלפון, משרד ביתי), וציוד יקר מוכר בפריסה על כמה שנים (פחת). הוצאה מעורבת עסקי-פרטי מוכרת לפי החלק העסקי, וההכרה תלוית נסיבות.",
    status: "draft",
  },
  {
    id: "bituach-leumi",
    question: "מה זה ביטוח לאומי לעצמאי ואיך זה עובד?",
    answer:
      "עצמאי משלם דמי ביטוח לאומי ודמי ביטוח בריאות בעצמו, לפי מקדמות שנקבעות מהצהרת ההכנסה שלו, בשובר משולב אחד. בתמורה יש כיסוי לזכויות כמו דמי לידה, מילואים ונכות. חלק מהתשלום (רכיב הביטוח הלאומי בלבד, לא הבריאות) מוכר כניכוי בדוח השנתי.",
    status: "draft",
  },
  {
    id: "credit-points",
    question: "מה זה נקודות זיכוי?",
    answer:
      "נקודת זיכוי היא הנחה קבועה מהמס, בשווי השנתי שבטבלת הקבועים. כל תושב/ת ישראל מקבל/ת נקודות בסיס, ויש תוספות לפי מצב אישי — ילדים, תואר, שירות צבאי, עלייה ועוד. הנקודות מקוזזות מהמס לפני חישוב היתרה לתשלום — מי שהמס שלו נמוך משווי הנקודות פשוט לא משלם, אך ההפרש לא מוחזר.",
    status: "draft",
  },
  {
    id: "annual-report",
    question: "מה זה הדוח השנתי (טופס 1301) ומתי מגישים?",
    answer:
      "הדוח השנתי מרכז את כל ההכנסות, הניכויים והזיכויים של שנת מס אחת, ולפיו נקבע המס הסופי. עצמאים מחויבים בהגשה כל שנה, בדרך כלל עד סוף מאי של השנה העוקבת להגשה מקוונת, עם ארכות למיוצגים. אחרי ההגשה מתקבלת שומה — חישוב המס הרשמי של רשות המסים.",
    status: "draft",
  },
  {
    id: "doc-types",
    question: "מה ההבדל בין חשבונית מס, קבלה, חשבון עסקה והצעת מחיר?",
    answer:
      "הצעת מחיר — הצעה לא מחייבת לפני עסקה. חשבון עסקה — דרישת תשלום אחרי שהעבודה סוכמה, עדיין לא מסמך מס. קבלה — אישור שהתשלום התקבל בפועל. חשבונית מס — מסמך המס שמפיק עוסק מורשה ומאפשר ללקוח עסקי לקזז מע\"מ; אצל עצמאים נפוץ המסמך המשולב חשבונית מס/קבלה. עוסק פטור מפיק קבלות בלבד.",
    status: "draft",
  },
  {
    id: "keren-hishtalmut",
    question: "מה זה קרן השתלמות לעצמאי?",
    answer:
      "קרן השתלמות היא אפיק חיסכון לטווח בינוני עם הטבת מס כפולה לעצמאים: חלק מההפקדה מוכר כניכוי מההכנסה החייבת, והרווחים פטורים ממס רווח הון עד תקרת ההפקדה המוטבת שבטבלה. הכסף נזיל אחרי שש שנים.",
    status: "draft",
  },
  {
    id: "donations",
    question: "תרמתי לעמותה — מה מקבלים בחזרה?",
    answer:
      "תרומה למוסד ציבורי מוכר לפי סעיף 46 מזכה בזיכוי מס בשיעור שבטבלת הקבועים, בתנאי שסך התרומות עובר את הרצפה השנתית ועד תקרת ההכנסה שבטבלה. נדרשת קבלה מקורית עם ציון 'מוסד מוכר לעניין סעיף 46'. לחישוב הסכום המדויק אצל משתמש ספציפי — כלי get_form_value עם שדה 046.",
    status: "draft",
  },
  {
    id: "patur-ceiling",
    question: "עברתי את תקרת עוסק פטור — מה קורה עכשיו?",
    answer:
      "חציית התקרה שבטבלה מחייבת מעבר לעוסק מורשה — רישום במע\"מ, גביית מע\"מ מהלקוחות ודיווח שוטף, החל מנקודת החצייה. המחזור שמעל התקרה חייב במע\"מ. המערכת עוקבת אחרי ההתקדמות לתקרה ומתריעה מראש.",
    status: "draft",
  },
  {
    id: "open-osek",
    question: "איך פותחים תיק עוסק?",
    answer:
      "פתיחת עצמאות כוללת רישום בשלוש רשויות: מס ערך מוסף (קביעת סוג העוסק — פטור או מורשה), מס הכנסה (פתיחת תיק), וביטוח לאומי (רישום כעצמאי). את שלושתן אפשר כיום לבצע אונליין. מדריך מלווה צעד-אחר-צעד נמצא בפיתוח — בינתיים, שירות 'פתיחת תיק לעצמאים' באתר gov.il מרכז את שלושת התהליכים.",
    status: "draft",
  },
];

/** Serialize the knowledge catalog into the system prompt (stable order). */
export function renderKnowledgeCatalog(): string {
  const entries = EITAN_KNOWLEDGE.map(
    (e) => `ש: ${e.question}\nת: ${e.answer}`,
  ).join("\n\n");
  return `מאגר ידע מאושר-מראש (בסיס לתשובות על שאלות נפוצות — נסח בסגנון שלך, אל תסטה מהעובדות):\n\n${entries}`;
}
