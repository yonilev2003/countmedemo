/**
 * Expense profiles per occupation type — feeds the /business-expenses page.
 *
 * Rules are based on the israeli-expense-categorizer skill (Israeli Tax Ordinance,
 * 2024 deduction percentages). Source: `pkudat-mas` rules + tax-authority guidance.
 *
 * If you add a new profile, also add it to the `pickProfile()` matcher.
 */

export type DeductionRule =
  | "full" // 100% recognized expense
  | "partial" // partial recognition (specify partialPercent)
  | "depreciation"; // capital expenditure, depreciated over years

export interface ExpenseCategory {
  name: string;
  /** Brief Hebrew description of when this applies. */
  description: string;
  rule: DeductionRule;
  /** For "partial" rules — what % is deductible. */
  partialPercent?: number;
  /** For "depreciation" — useful life in years. */
  depreciationYears?: number;
  /** Concrete examples to help the user identify their own expenses. */
  examples: string[];
  /** Optional gotcha / warning. */
  warning?: string;
}

export interface ExpenseProfile {
  /** Match key — primaryOccupation substring (lowercased). */
  matchKeywords: string[];
  /** Display label for this profile. */
  label: string;
  /** Short tagline. */
  tagline: string;
  categories: ExpenseCategory[];
}

/* ──────────────────────────────────────────────────────────
   Universal categories — apply to almost any self-employed.
   ────────────────────────────────────────────────────────── */
const UNIVERSAL: ExpenseCategory[] = [
  {
    name: "ביטוח לאומי לעצמאי",
    description: "תשלומי המקדמות לבטוח לאומי שמשולמים מדי חודש או רבעון.",
    rule: "partial",
    partialPercent: 52,
    examples: ["מקדמות חודשיות לבטל", "השלמות בסוף שנה"],
  },
  {
    name: "קרן השתלמות לעצמאי",
    description:
      "הפקדה לקרן השתלמות — מוכרת עד 4.5% מהמחזור / תקרה שנתית 19,920 ₪ ל-2024.",
    rule: "full",
    examples: ["הפקדה חודשית קבועה", "הפקדה חד-פעמית בסוף שנה"],
    warning: "מעל 11% מהמחזור — החלק המעל לא מוכר.",
  },
  {
    name: "הפקדות לפנסיה",
    description: "פנסיה לעצמאי — חובה לפי חוק. מוכרת לזיכוי בסעיף 47.",
    rule: "full",
    examples: ["הפקדה לקופ״ג של מבטחים/הראל/כלל"],
  },
  {
    name: "הוצאות אינטרנט וטלפון נייד",
    description: 'בית/משרד — מוכרים חלקית בהנחה שזה בשימוש מעורב (עסקי+פרטי).',
    rule: "partial",
    partialPercent: 80,
    examples: ["חבילת סלולר", "אינטרנט ביתי", "טלפון קווי"],
  },
  {
    name: "ייעוץ מקצועי",
    description: "רואה חשבון, יועץ מס, עורך דין — 100% הוצאה.",
    rule: "full",
    examples: [
      "שכר טרחה לרו״ח",
      "ייעוץ משפטי לחוזה לקוח",
      "ייעוץ עסקי או שיווקי",
    ],
  },
];

/* ──────────────────────────────────────────────────────────
   Profile: Designer / Creative / Influencer
   ────────────────────────────────────────────────────────── */
const CREATIVE: ExpenseProfile = {
  matchKeywords: [
    "מעצב",
    "מעצבת",
    "עיצוב",
    "designer",
    "אומן",
    "אומנית",
    "צלם",
    "צלמת",
    "אילוסטר",
    "מאיירת",
    "מאייר",
    "סטייליסט",
    "creator",
    "תוכן",
    "אינפלואנסר",
    "influencer",
    "יוצר",
    "יוצרת",
    "כותב",
    "כותבת",
    "בלוגרית",
    "בלוגר",
  ],
  label: "יצירה ועיצוב",
  tagline: "לעצמאיות ועצמאים בעיצוב, יצירת תוכן וצילום",
  categories: [
    {
      name: "מחשב, מסך, טאבלט",
      description:
        "ציוד ראשי לעבודה. הוצאת הון — מתפלגת על 3 שנים (פחת בקו ישר).",
      rule: "depreciation",
      depreciationYears: 3,
      examples: ["MacBook Pro", "iPad Pro", "Wacom", "מסך חיצוני"],
    },
    {
      name: "תוכנות ומנויים מקצועיים",
      description: "100% מוכר — שוטפים בשנה הנוכחית.",
      rule: "full",
      examples: [
        "Adobe Creative Cloud",
        "Figma Pro",
        "Notion / Asana",
        "Canva Pro",
        "ChatGPT / Claude Pro",
      ],
    },
    {
      name: "ציוד צילום",
      description: "מצלמות, עדשות, חצובות, תאורה — פחת לפי סוג ציוד.",
      rule: "depreciation",
      depreciationYears: 5,
      examples: ["מצלמת DSLR", "עדשות", "תאורת LED", "ערכות סאונד"],
    },
    {
      name: "מוצרים לתוכן (איפור, אופנה, ספורט)",
      description:
        "אם הם מופיעים בתוכן שלך והוצאתם נדרשת לשם הפקת הכנסה — מוכרים. שמרי קבלות + צילום הפוסט/הסרטון.",
      rule: "full",
      examples: [
        "מוצרי איפור לסרטוני שיווק",
        "ביגוד שמופיע בתוכן",
        "אביזרי ספורט",
      ],
      warning: "מס הכנסה דורש הוכחה שזה לתוכן ולא לשימוש פרטי.",
    },
    {
      name: "השתלמות ולמידה",
      description: "קורסים, סדנאות, מנויים מקצועיים — מוכר במלואו.",
      rule: "full",
      examples: ["קורס Skillshare", "כנסים מקצועיים", "ספרי מקצוע"],
    },
    ...UNIVERSAL,
  ],
};

/* ──────────────────────────────────────────────────────────
   Profile: Developer / Tech / Engineering
   ────────────────────────────────────────────────────────── */
const TECH: ExpenseProfile = {
  matchKeywords: [
    "מפתח",
    "מפתחת",
    "developer",
    "engineer",
    "מהנדס",
    "מהנדסת",
    "תוכנה",
    "תכנות",
    "data",
    "DevOps",
    "fullstack",
    "frontend",
    "backend",
  ],
  label: "טכנולוגיה ופיתוח",
  tagline: "למפתחים, מהנדסים, ואנשי data",
  categories: [
    {
      name: "מחשב פיתוח וציוד",
      description: "פחת בקו ישר על 3 שנים.",
      rule: "depreciation",
      depreciationYears: 3,
      examples: ["MacBook Pro / לפטופ", "מסך 4K", "מקלדת/עכבר ארגונומיים"],
    },
    {
      name: "שירותי ענן ו-SaaS",
      description: "AWS, Vercel, Stripe, Linear, GitHub — 100% מוכר.",
      rule: "full",
      examples: ["AWS / GCP / Azure", "Vercel Pro", "GitHub Copilot", "Linear"],
    },
    {
      name: "AI assistants ו-API",
      description: "Claude, ChatGPT, Cursor — 100% מוכר.",
      rule: "full",
      examples: ["Claude Max", "ChatGPT Pro", "Cursor", "Anthropic API tokens"],
    },
    {
      name: "רישיונות תוכנה",
      description: "JetBrains, Sublime, רישיון Adobe — 100% מוכר.",
      rule: "full",
      examples: ["JetBrains All Pack", "1Password Business", "Tailscale"],
    },
    {
      name: "השתלמות מקצועית",
      description: "קורסים, ספרים, מנויים לפלטפורמות למידה.",
      rule: "full",
      examples: ["Frontend Masters", "Pluralsight", "כנסים — DevCon, ReactConf"],
    },
    ...UNIVERSAL,
  ],
};

/* ──────────────────────────────────────────────────────────
   Profile: Consultant / Coach / Therapist
   ────────────────────────────────────────────────────────── */
const CONSULTANT: ExpenseProfile = {
  matchKeywords: [
    "יועץ",
    "יועצת",
    "מאמן",
    "מאמנת",
    "consultant",
    "coach",
    "מטפל",
    "מטפלת",
    "therapist",
    "פסיכולוג",
    "פסיכולוגית",
    "מנטור",
    "מנטורית",
  ],
  label: "ייעוץ, אימון, טיפול",
  tagline: "ליועצות, מאמנים, מטפלות, פסיכולוגיות",
  categories: [
    {
      name: "שכירות חדר טיפול / קליניקה",
      description:
        "אם החדר רק לעבודה — 100%. אם זה משרד ביתי — לפי שטח יחסי מהדירה.",
      rule: "full",
      examples: ["שכירות חדר בקליניקה משותפת", "שכירות סטודיו"],
      warning: "משרד ביתי דורש חישוב יחס שטחים — הציב בקבלה אצל רו״ח.",
    },
    {
      name: "השתלמות מקצועית והכשרות",
      description: "סופרוויזיה, סדנאות, הכשרות מתמשכות — 100%.",
      rule: "full",
      examples: [
        "סופרוויזיה אצל מטפל בכיר",
        "כנס מקצועי",
        "קורסים והכשרות",
      ],
    },
    {
      name: "פלטפורמות לתאום ותשלום",
      description: "Calendly, Zoom Business, מע״מים לחיוב — 100%.",
      rule: "full",
      examples: ["Zoom Pro", "Calendly", "תוכנת ניהול מטופלים"],
    },
    {
      name: "ביטוח אחריות מקצועית",
      description: "חובה לטיפול / ייעוץ — 100% מוכר.",
      rule: "full",
      examples: ["ביטוח אחריות מקצועית"],
    },
    ...UNIVERSAL,
  ],
};

/* ──────────────────────────────────────────────────────────
   Default profile for unknown occupations
   ────────────────────────────────────────────────────────── */
const DEFAULT_PROFILE: ExpenseProfile = {
  matchKeywords: [],
  label: "עצמאי כללי",
  tagline: "הוצאות בסיסיות לכל סוגי העסקים",
  categories: [
    {
      name: "ציוד עבודה",
      description: "מחשב/ציוד עיקרי — פחת בקו ישר על 3-5 שנים.",
      rule: "depreciation",
      depreciationYears: 3,
      examples: ["מחשב/לפטופ", "ציוד מקצועי"],
    },
    {
      name: "תוכנות ושירותים מקצועיים",
      description: "מנויים שוטפים — 100% מוכרים בשנה הנוכחית.",
      rule: "full",
      examples: ["תוכנות עבודה", "שירותי ענן", "כלים מקצועיים"],
    },
    ...UNIVERSAL,
  ],
};

const ALL_PROFILES = [CREATIVE, TECH, CONSULTANT];

/**
 * Pick the best-matching expense profile for a given primary occupation string.
 * Falls back to the default profile if no profile matches.
 */
export function pickProfile(primaryOccupation: string): ExpenseProfile {
  const lower = primaryOccupation.toLowerCase();
  for (const p of ALL_PROFILES) {
    if (p.matchKeywords.some((k) => lower.includes(k.toLowerCase()))) {
      return p;
    }
  }
  return DEFAULT_PROFILE;
}
