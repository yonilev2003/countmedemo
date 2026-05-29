/**
 * Expense profiles per occupation type — feeds the /business-expenses page.
 *
 * Occupation-specific categories (creative / tech / consultant) are qualitative
 * and live here. The UNIVERSAL categories (B"L, keren hishtalmut, pension, …)
 * carry real percentages and ceilings, so they are derived per tax year from
 * the deductions registry (lib/regulatory/deductions.ts) — which in turn reads
 * the year's constants. Nothing here hardcodes a rate or a cap.
 *
 * If you add a new profile, also add it to the `pickProfile()` matcher.
 */

import {
  getDeductionsTable,
  DeductionRule,
  PLImpact,
} from "@/lib/regulatory/deductions";

export type { DeductionRule };

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
  /** Form 1301 field code(s) this expense feeds (from the deductions registry). */
  formFields?: string[];
  /** How it flows through the annual reports. */
  plImpact?: PLImpact;
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
   Rates & caps are resolved per year from the deductions registry.
   ────────────────────────────────────────────────────────── */
function universalCategories(year: number): ExpenseCategory[] {
  const table = getDeductionsTable(year);
  const byId = (id: string) => {
    const d = table.find((x) => x.id === id);
    if (!d) throw new Error(`unknown deduction id: ${id}`);
    return d;
  };

  const bl = byId("bituach-leumi");
  const keren = byId("keren-hishtalmut");
  const pension = byId("pension");
  const net = byId("internet-phone");
  const prof = byId("professional-services");

  return [
    {
      name: bl.he,
      description: "תשלומי המקדמות לביטוח לאומי שמשולמים מדי חודש או רבעון.",
      rule: bl.rule,
      partialPercent: bl.ratePercent,
      formFields: bl.formFields,
      plImpact: bl.plImpact,
      examples: ["מקדמות חודשיות לביטוח לאומי", "השלמות בסוף שנה"],
    },
    {
      name: keren.he,
      description: `הפקדה לקרן השתלמות — מוכרת עד ${keren.ratePercent}% מהמחזור, עד תקרה שנתית של ${keren.capNis!.toLocaleString("he-IL")} ₪ (${year}).`,
      rule: keren.rule,
      partialPercent: keren.ratePercent,
      formFields: keren.formFields,
      plImpact: keren.plImpact,
      examples: ["הפקדה חודשית קבועה", "הפקדה חד-פעמית בסוף שנה"],
      warning:
        "הפקדה מעבר לתקרה אינה מוכרת כהוצאה (אך עשויה לזכות בפטור ממס על רווחי הון).",
    },
    {
      name: pension.he,
      description: "פנסיה לעצמאי — חובה לפי חוק. מוכרת לניכוי/זיכוי בסעיף 47.",
      rule: pension.rule,
      formFields: pension.formFields,
      plImpact: pension.plImpact,
      examples: ["הפקדה לקופ״ג של מבטחים/הראל/כלל"],
    },
    {
      name: "הוצאות אינטרנט וטלפון נייד",
      description:
        "בית/משרד — מוכרים חלקית בהנחה שזה בשימוש מעורב (עסקי+פרטי).",
      rule: net.rule,
      partialPercent: net.ratePercent,
      formFields: net.formFields,
      plImpact: net.plImpact,
      examples: ["חבילת סלולר", "אינטרנט ביתי", "טלפון קווי"],
    },
    {
      name: "ייעוץ מקצועי",
      description: "רואה חשבון, יועץ מס, עורך דין — 100% הוצאה.",
      rule: prof.rule,
      formFields: prof.formFields,
      plImpact: prof.plImpact,
      examples: [
        "שכר טרחה לרו״ח",
        "ייעוץ משפטי לחוזה לקוח",
        "ייעוץ עסקי או שיווקי",
      ],
    },
  ];
}

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
      examples: ["סופרוויזיה אצל מטפל בכיר", "כנס מקצועי", "קורסים והכשרות"],
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
  ],
};

const ALL_PROFILES = [CREATIVE, TECH, CONSULTANT];

/**
 * Pick the best-matching expense profile for an occupation, resolved for a tax
 * year. The occupation-specific categories are static; the universal ones
 * (rates/caps) are derived for `year` and appended.
 */
export function pickProfile(
  primaryOccupation: string,
  year: number,
): ExpenseProfile {
  const lower = primaryOccupation.toLowerCase();
  const base =
    ALL_PROFILES.find((p) =>
      p.matchKeywords.some((k) => lower.includes(k.toLowerCase())),
    ) ?? DEFAULT_PROFILE;
  return {
    ...base,
    categories: [...base.categories, ...universalCategories(year)],
  };
}
