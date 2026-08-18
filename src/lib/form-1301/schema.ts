/**
 * Form 1301 — דו"ח שנתי ליחיד (Israeli annual tax return for individuals)
 *
 * Source: secapp.taxes.gov.il screenshots, tax year 2024.
 * Order, section names, and field codes are taken verbatim from the live form
 * so the demo's sequence mirrors the real submission flow.
 *
 * Field codes are the 3-digit "מספר שדה" the tax authority uses internally.
 * Two columns exist for married couples — main filer ("בן הזוג הרשום") and spouse —
 * but the demo persona drives only the main filer for now.
 */

export type FieldKind =
  | "currency"
  | "integer"
  | "percent"
  | "text"
  | "id"
  | "date"
  | "boolean"
  | "radio"
  | "select"
  | "checkbox-group";

export type FieldStatus =
  | "calculated" // value comes from a calculator engine — clickable
  | "personal" // value comes from persona.personal/contact/business — auto-filled
  | "manual" // user must enter — out of demo scope
  | "skip"; // not relevant for our persona — auto-skipped

export interface FormField {
  /** 3-digit code used by Reshut HaMisim. Empty if a question without numeric code. */
  code?: string;
  /** Hebrew label as shown in the live form. */
  label: string;
  kind: FieldKind;
  status: FieldStatus;
  /** Free-text helper for the agent panel. */
  hint?: string;
  /** Reference to a calculator engine in lib/calculators. */
  calculator?: string;
  /** Reference to a personal field path on the persona JSON, e.g. "personal.teudatZehut". */
  personaPath?: string;
}

export interface FormSection {
  /** Hebrew letter prefix, e.g. "ג." for the income section. */
  letter?: string;
  title: string;
  /** Optional description shown below the title. */
  description?: string;
  fields: FormField[];
}

export interface FormTab {
  id: "personal" | "general" | "income";
  label: string;
  sections: FormSection[];
}

/**
 * Tab 1: פרטים אישיים
 */
const tabPersonal: FormTab = {
  id: "personal",
  label: "פרטים אישיים",
  sections: [
    {
      title: "מצב משפחתי בשנת המס",
      fields: [
        {
          code: "066",
          label: "מצב משפחתי",
          kind: "radio",
          status: "personal",
          personaPath: "personal.maritalStatus",
        },
        {
          label: "וחי ביחד עם בן הזוג",
          kind: "checkbox-group",
          status: "personal",
        },
      ],
    },
    {
      title: 'בן הזוג הרשום',
      fields: [
        {
          label: "מספר זהות",
          kind: "id",
          status: "personal",
          personaPath: "personal.teudatZehut",
        },
        {
          label: "שם משפחה",
          kind: "text",
          status: "personal",
          personaPath: "personal.lastName",
        },
        {
          label: "שם פרטי",
          kind: "text",
          status: "personal",
          personaPath: "personal.firstName",
        },
        {
          label: "שם האב",
          kind: "text",
          status: "personal",
          personaPath: "personal.fatherName",
        },
        {
          label: "תאריך לידה",
          kind: "date",
          status: "personal",
          personaPath: "personal.birthDate",
        },
      ],
    },
    {
      title: "פרטי התקשרות",
      fields: [
        {
          label: "כתובת למשלוח דואר",
          kind: "text",
          status: "personal",
          personaPath: "contact.mailingAddress",
        },
        {
          label: "כתובת המגורים",
          kind: "text",
          status: "personal",
          personaPath: "contact.mailingAddress",
        },
        {
          label: "כתובת דואר אלקטרוני",
          kind: "text",
          status: "personal",
          personaPath: "contact.email",
        },
        {
          label: "טלפון נייד",
          kind: "text",
          status: "personal",
          personaPath: "contact.phoneMobile",
        },
      ],
    },
    {
      title: "פרטי העסק",
      fields: [
        {
          label: "כתובת העסק",
          kind: "text",
          status: "personal",
          personaPath: "business.address",
        },
        {
          label: "שם העסק",
          kind: "text",
          status: "personal",
          personaPath: "business.tradeName",
        },
        {
          label: "העיסוק העיקרי (פרט)",
          kind: "text",
          status: "personal",
          personaPath: "business.primaryOccupation",
        },
        {
          label: "מספר תיק בעסק העיקרי",
          kind: "text",
          status: "personal",
          personaPath: "business.osekFileNumber",
        },
      ],
    },
    {
      title: "פרטי בנק",
      description:
        "החזר המס, אם מגיע, יועבר לחשבונאי המתנהל על שם בן זוג הרשום בבנק",
      fields: [
        {
          code: "278",
          label: "סמל בנק",
          kind: "integer",
          status: "personal",
          personaPath: "bank.bankCode",
        },
        {
          label: "סמל סניף",
          kind: "integer",
          status: "personal",
          personaPath: "bank.branchCode",
        },
        {
          code: "277",
          label: "מספר חשבון",
          kind: "integer",
          status: "personal",
          personaPath: "bank.accountNumber",
        },
        {
          label: "שם בעל החשבון כפי שמופיע במרשמי הבנק",
          kind: "text",
          status: "personal",
          personaPath: "bank.accountOwnerName",
        },
      ],
    },
  ],
};

/**
 * Tab 2: פרטים כלליים
 */
const tabGeneral: FormTab = {
  id: "general",
  label: "פרטים כלליים",
  sections: [
    {
      title: "שאלות פתיחה",
      fields: [
        {
          label: 'האם הדו"ח כולל נספח ד\' — הכנסות מחו"ל?',
          kind: "boolean",
          status: "skip",
          hint: "דנה לא מקבלת הכנסות מחו״ל — מסומן 'לא' אוטומטית.",
        },
        {
          label: 'האם הדו"ח כולל נספח רווח הון?',
          kind: "boolean",
          status: "skip",
        },
      ],
    },
    {
      title: 'הדו"ח הוא על',
      fields: [
        {
          label: "הכנסותי בלבד / הכנסותי והכנסות בן/בת זוגי",
          kind: "radio",
          status: "personal",
          personaPath: "personal.maritalStatus",
        },
      ],
    },
    {
      letter: "ב.",
      title: "תושב חוזר/עולה חדש/תושב ותיק",
      fields: [
        {
          code: "273",
          label: "בן זוג רשום — סטטוס תושב",
          kind: "radio",
          status: "personal",
          personaPath: "personal.isNewResident",
        },
        {
          code: "274",
          label: "בן זוג — סטטוס תושב",
          kind: "radio",
          status: "skip",
        },
      ],
    },
    {
      title: 'מקור הכנסה משותף לבני הזוג',
      fields: [
        {
          code: "331",
          label: 'בן/בת זוגי עזר/ה לי בהשגת ההכנסה',
          kind: "boolean",
          status: "skip",
        },
      ],
    },
    {
      title: 'נספחים נוספים',
      fields: [
        {
          label: 'מצ"ב נספח לחישוב ההכנסה (טופס 134)',
          kind: "boolean",
          status: "skip",
          hint: "טופס 134 רלוונטי לתשלומי מעביד עודפים לקרן השתלמות. דנה לא במצב הזה.",
        },
        {
          label: 'הנני בעל שליטה ב"חבר בני אדם" שאינו נסחר בחו"ל (טופס 150)',
          kind: "boolean",
          status: "skip",
        },
      ],
    },
    {
      letter: 'דו"ח 6111',
      title: 'דו"ח 6111',
      description: 'נדרש כשהמחזור > 254,237 ₪ (ללא מע"מ, 2025/2026 — 300,000 כולל מע"מ)',
      fields: [
        {
          code: "297",
          label: 'חייב בטופס 6111 / לא חייב / לא רלוונטי',
          kind: "radio",
          status: "calculated",
          calculator: "field-297-form-6111",
        },
      ],
    },
    {
      title: "ניהול ספרים ומאפיינים",
      fields: [
        {
          label: 'הדו"ח מבוסס על פנקסי חשבונות שניהלתי (כפולה / חד-צדדית)',
          kind: "radio",
          status: "personal",
          personaPath: "business.bookkeepingMethod",
        },
        {
          code: "034",
          label: "עוסק פטור ממע״מ",
          kind: "boolean",
          status: "personal",
          personaPath: "business.osekType",
          hint: "תקרת עוסק פטור לשנים 2024–2025: 120,000 ₪ מחזור שנתי (122,833 ₪ מ-2026)",
        },
        {
          label: "הפקת חשבוניות/קבלה (ממוחשב / ידני / לא רלוונטי)",
          kind: "radio",
          status: "personal",
          personaPath: "business.bookkeepingType",
        },
        {
          label: "מסלול עוסק זעיר (ניכוי 30% אוטומטי)",
          kind: "boolean",
          status: "personal",
          personaPath: "business.isOsekZeir",
          hint: "עוסק פטור שמחזורו עד 120,000 ₪ רשאי לדווח במסלול מקוצר: 30% מהמחזור מוכרים כהוצאות אוטומטית (כולל ביטוח לאומי). אין חובת מקדמות. יציאה מהמסלול חוסמת חזרה ל-2 שנים.",
        },
      ],
    },
  ],
};

/**
 * Tab 3: פירוט הכנסות (the long one)
 *
 * Sections in order on the live form:
 *   ג. הכנסות מיגיעה אישית בשיעורי מס רגילים
 *   ד. הכנסות חייבות בשיעורי מס רגילים
 *   ה. הכנסות חייבות בשיעורי מס מיוחדים
 *   ו. מוסד כספי
 *   ז. נתונים נוספים
 *   ח. הכנסות מרווח הון ומשבח מקרקעין
 *   ט. הכנסות חו"ל
 *   י. הכנסות/רווחים פטורים ובלתי חייבים
 *   יא. פרטים נוספים ויתרות להעברה
 *   יב. ניכויים אישיים בעד תשלומים
 *   יג. נקודות זיכוי מהמס
 *   יד. זיכויים אישיים בעד תשלומים
 *   טו. מחזור למקדמות, ניכויים במקור, מס שבח
 *   טז. שדות נוספים
 */
const tabIncome: FormTab = {
  id: "income",
  label: "פירוט הכנסות",
  sections: [
    {
      letter: "ג.",
      title: "הכנסות מיגיעה אישית החייבות בשיעורי מס רגילים",
      fields: [
        {
          code: "150",
          label: 'מיגיעה אישית מעסק או משלח יד (כולל פיצויי בגין נזק עקיף "חרבות ברזל")',
          kind: "currency",
          status: "calculated",
          calculator: "field-150-business-income",
          hint: "סך ההכנסות שלך מהעסק לאחר ניכוי הוצאות מוכרות.",
        },
      ],
    },
    {
      letter: "ד.",
      title: "הכנסות חייבות בשיעורי מס רגילים שאינן מיגיעה אישית",
      fields: [
        {
          code: "158",
          label: 'ריבית, דיבידנד ושכ"ד חייב',
          kind: "currency",
          status: "skip",
        },
        {
          code: "162",
          label: "שכר דירה — הכנסות חייבות (מסלול רגיל)",
          kind: "currency",
          status: "skip",
        },
      ],
    },
    {
      letter: "ה.",
      title: "הכנסות חייבות בשיעורי מס מיוחדים",
      fields: [
        {
          code: "170",
          label: "שכר דירה למגורים — 10% מס קבוע",
          kind: "currency",
          status: "skip",
        },
        {
          code: "174",
          label: 'רווחי הון ממכירת ני"ע סחירים',
          kind: "currency",
          status: "skip",
        },
      ],
    },
    {
      letter: "ו.",
      title: "מוסד כספי",
      fields: [
        {
          code: "032",
          label: "הכנסות מריבית/דיבידנד ממוסד כספי",
          kind: "currency",
          status: "calculated",
          calculator: "field-032-financial-institution",
          hint: "הכנסות ריבית ודיבידנד מבנקים/גופים מוסדיים.",
        },
        {
          code: "180",
          label: "הכנסה חייבת של מוסד כספי",
          kind: "currency",
          status: "skip",
        },
      ],
    },
    {
      letter: "ז.",
      title: "נתונים נוספים",
      fields: [
        {
          code: "238",
          label: 'סך מחזור עסקי או משלח יד (ללא מע"מ)',
          kind: "currency",
          status: "calculated",
          calculator: "field-238-turnover",
          hint: "סכום כל החשבוניות שלך לפני ניכוי הוצאות.",
        },
        {
          code: "239",
          label: 'פרמיית ביטוח חיים כמשמעותו בסעיף 32(14)',
          kind: "currency",
          status: "skip",
        },
        {
          code: "248",
          label: 'תשלומים לקופ"ג לא מוכרת מעל התקרה',
          kind: "currency",
          status: "skip",
        },
        {
          code: "236",
          label: "ניכויים שנדרשו בשנים קודמות בסכום ששולם",
          kind: "currency",
          status: "skip",
        },
        {
          code: "232",
          label: "הפסד שמותר לקיזוז — שנה שוטפת",
          kind: "currency",
          status: "skip",
          hint: "לא רלוונטי — לדנה יש הכנסה חיובית, אין הפסד לקיזוז",
        },
        {
          code: "233",
          label: "הפסד לקיזוז שהועבר מהשנה הקודמת",
          kind: "currency",
          status: "skip",
        },
      ],
    },
    {
      letter: "ח.",
      title: "הכנסות מרווח הון ומשבח מקרקעין",
      fields: [
        {
          code: "054",
          label: "רווח הון ריאלי ממכירת נכסים",
          kind: "currency",
          status: "skip",
          hint: "יש למלא ידנית — ראה טופס 1399",
        },
        {
          code: "056",
          label: "רווח הון ממכירת ניירות ערך",
          kind: "currency",
          status: "skip",
          hint: "יש למלא ידנית — ראה טופס 1322/1325",
        },
        {
          code: "300",
          label: "שבח מקרקעין ורווח הון חייב",
          kind: "currency",
          status: "skip",
        },
        {
          code: "302",
          label: "הפסד הון",
          kind: "currency",
          status: "skip",
        },
      ],
    },
    {
      letter: "ט.",
      title: 'הכנסות חו"ל',
      fields: [
        {
          code: "290",
          label: 'הכנסות מחו׳׳ל',
          kind: "currency",
          status: "skip",
          hint: "יש למלא ידנית — ראה נספח ג׳",
        },
        {
          code: "160",
          label: 'הכנסה מחו״ל חייבת בשיעור מס רגיל',
          kind: "currency",
          status: "skip",
          hint: "סמן 'לא רלוונטי' אם כל הכנסותיך ממקורות ישראליים",
        },
      ],
    },
    {
      letter: "י.",
      title: "הכנסות/רווחים פטורים ובלתי חייבים",
      fields: [
        {
          code: "191",
          label: "פיצויי פיטורין פטורים",
          kind: "currency",
          status: "skip",
        },
        {
          code: "043",
          label: "קצבאות פטורות (ביטוח לאומי וכד')",
          kind: "currency",
          status: "skip",
        },
      ],
    },
    {
      letter: "יא.",
      title: "פרטים נוספים ויתרות להעברה",
      fields: [
        {
          code: "260",
          label: "הפסד עסקי/מקצועי להעברה לשנה הבאה",
          kind: "currency",
          status: "skip",
        },
        {
          code: "261",
          label: "הפסד הון להעברה",
          kind: "currency",
          status: "skip",
        },
        {
          code: "262",
          label: "זיכויים בלתי מנוצלים להעברה",
          kind: "currency",
          status: "skip",
        },
      ],
    },
    {
      letter: "יב.",
      title: "ניכויים אישיים בעד תשלומים שלהלן",
      fields: [
        {
          code: "030",
          label:
            'לביטוח מפני אובדן כושר עבודה ולפיצוי בשל הכנסה כעצמאי — תקבולים והחזרים מבטוח לאומי',
          kind: "currency",
          status: "calculated",
          calculator: "field-030-bituach-leumi",
          hint: "החלק של תשלומי הביטוח הלאומי שמותר לנכות מההכנסה (52%).",
        },
        {
          code: "112",
          label: "ניכוי ביטוח אובדן כושר עבודה",
          kind: "currency",
          status: "calculated",
          calculator: "field-112-loss-of-work-capacity",
          hint: "פרמיית ביטוח אובדן כושר עבודה — 100% ניכוי.",
        },
        {
          code: "135",
          label: "הפקדות לקופת גמל לקיצבה",
          kind: "currency",
          status: "calculated",
          calculator: "field-135-kupat-gemel",
          hint: "הפקדות לקופ״ג — לפי הסכום שהופקד.",
        },
        {
          code: "137",
          label: "קרן השתלמות לעצמאים",
          kind: "currency",
          status: "calculated",
          calculator: "field-137-keren-hishtalmut",
          hint: "ניכוי בשיעור עד 4.5% מההכנסה (תקרת ניכוי מוכר 13,203 ₪, 2024–2026).",
        },
      ],
    },
    {
      letter: "יג.",
      title: "נקודות זיכוי מהמס",
      fields: [
        {
          code: "020",
          label: "תושב",
          kind: "boolean",
          status: "calculated",
          calculator: "field-020-resident",
          hint: "נקודת זיכוי תושב — אוטומטית לכל אזרח ישראלי.",
        },
        {
          code: "044",
          label: "עולה חדש",
          kind: "boolean",
          status: "calculated",
          calculator: "field-044-oleh-hadash",
          hint: "1/4 + 1/6 + 1/12 נקודות זיכוי בשלוש שנים ראשונות. דנה לא עולה חדשה.",
        },
        {
          code: "068",
          label: 'חייל משוחרר — תאריך שחרור מ"שירות סדיר"',
          kind: "boolean",
          status: "calculated",
          calculator: "field-068-soldier",
          hint: "1/6 נקודות זיכוי ב-36 חודשים מהשחרור. דנה השתחררה ב-2018, לא רלוונטי.",
        },
        {
          label: "זיכוי מילואים ללוחם (תיקון 283)",
          kind: "boolean",
          status: "calculated",
          calculator: "field-miluim-credit",
          hint: "נקודות זיכוי לפי ימי מילואים כלוחם בשנה הקודמת. חל מדוח 2026 (בגין שירות 2025); בדוח 2025 מוצג כצפי בלבד. אין עדיין קוד שדה רשמי בטופס.",
        },
        {
          code: "181",
          label: "נקודת זיכוי בגין תואר אקדמי",
          kind: "currency",
          status: "calculated",
          calculator: "field-181-academic-degree",
          hint: "נקודת זיכוי אחת לבעלי תואר אקדמי.",
        },
      ],
    },
    {
      letter: "יד.",
      title: "זיכויים אישיים בעד תשלומים",
      fields: [
        {
          code: "037",
          label: "תרומות — סכום ששולם השנה",
          kind: "currency",
          status: "calculated",
          calculator: "field-037-donations-current",
          hint: "תרומות שנתיות שישמשו לחישוב הזיכוי בשדה 046.",
        },
        {
          code: "364",
          label: "תרומות — הועברו משנים קודמות",
          kind: "currency",
          status: "calculated",
          calculator: "field-364-donations-carried",
          hint: "תרומות שהועברו משנים קודמות לצורך זיכוי.",
        },
        {
          code: "046",
          label: "זיכוי ממס על תרומות (35%)",
          kind: "currency",
          status: "calculated",
          calculator: "field-046-donations-credit",
          hint: "35% מסכום התרומות הכולל (שוטף + מועבר), מינימום 200 ₪.",
        },
        {
          code: "072",
          label: "זיכוי בגין פרמיית ביטוח חיים (סעיף 40)",
          kind: "currency",
          status: "calculated",
          calculator: "field-072-life-insurance",
          hint: "5% מהפרמיה ששולמה. לא רלוונטי אם אין ביטוח חיים.",
        },
        {
          code: "045",
          label: "זיכוי בגין תרומות מוכרות (סעיף 46)",
          kind: "currency",
          status: "calculated",
          calculator: "field-045-donations",
          hint: "35% מסכום התרומות למוסדות מוכרים (מינימום 200 ₪).",
        },
        {
          code: "048",
          label: "זיכוי בגין תשלומים לביטוח לאומי כעצמאי (48%)",
          kind: "currency",
          status: "calculated",
          calculator: "field-048-bituach-leumi-credit",
          hint: "48% מסכום הביטוח הלאומי ששולם — מנוכה ישירות מהמס.",
        },
        {
          code: "079",
          label: "זיכוי בגין הכנסת בן/בת זוג",
          kind: "currency",
          status: "skip",
        },
      ],
    },
    {
      letter: "טו.",
      title: 'מחזור למקדמות, ניכויים במקור, מס שבח',
      fields: [
        {
          code: "294",
          label:
            'סך המחזור (ללא מע"מ מעסק או משלח יד והכנסות אחרות בשיעורים רגילים)',
          kind: "currency",
          status: "calculated",
          calculator: "field-238-turnover",
          hint: "אותו סכום של שדה 238 — הצלבת אימות.",
        },
        {
          code: "042",
          label: "מקדמות ששולמו השנה",
          kind: "currency",
          status: "calculated",
          calculator: "field-042-mikdamot",
          hint: "מקדמות מס הכנסה ששולמו במהלך השנה.",
        },
        {
          code: "115",
          label: "ניכוי מס במקור",
          kind: "currency",
          status: "calculated",
          calculator: "field-115-tax-withheld",
          hint: "ניכוי מס במקור שבוצע על ידי לקוחות.",
        },
      ],
    },
    {
      letter: "טז.",
      title: "שדות נוספים",
      fields: [
        {
          code: "010",
          label: "גיל הנישום בתחילת שנת המס",
          kind: "date",
          status: "personal",
          personaPath: "personal.birthDate",
        },
        {
          code: "011",
          label: "גיל בן/בת הזוג",
          kind: "integer",
          status: "skip",
        },
      ],
    },
  ],
};

export const form1301: FormTab[] = [tabPersonal, tabGeneral, tabIncome];

/** All field codes that are calculated (the "stars" of the demo). */
export const starFields = [
  "150",
  "238",
  "294",
  "030",
  "137",
  "020",
  "044",
  "068",
  "297",
] as const;
