/**
 * Registry of "side option" help links for /setup — small, optional,
 * non-blocking pointers to the OFFICIAL page that explains a decision or
 * document the wizard asks for (gov.il / btl.gov.il / miluim.idf.il /
 * kolzchut.org.il). See CLAUDE.md's help-links task for the full brief.
 *
 * Confidence provenance: every entry here was confirmed only via WebSearch
 * result titles during a single session (2026-09-xx) — WebFetch to Israeli
 * gov/kolzchut domains was blocked by network policy, so nothing is
 * primary-fetch-verified. "strongly-supported" is the ceiling confidence tier
 * available in that session, not proof-read confirmation of live page
 * content. Only "verified" or "strongly-supported" entries may ship in
 * HELP_LINKS. A weaker or unconfirmed candidate goes in the commented-out
 * block at the bottom with a TODO(verify) note — never in the exported array
 * — so an unconfirmed fact can't reach the UI by accident.
 */

export type HelpLinkConfidence = "verified" | "strongly-supported" | "unverified";

export interface HelpLinkEntry {
  /** Stable id — used as the React key and the HELP_LINKS_BY_KEY lookup key. */
  key: string;
  /** 1-7, matches setup/page.tsx's `screen` state. Documentation only — not enforced at runtime. */
  screen: number;
  /** Collapsed-row prompt, e.g. "רוצה לדעת יותר?" */
  labelHe: string;
  /** One sentence shown once the row is expanded. */
  descriptionHe: string;
  url: string;
  confidence: HelpLinkConfidence;
}

export const HELP_LINKS: HelpLinkEntry[] = [
  // ── Screen 2 — מעמד ומשפחה ──────────────────────────────────────────────
  {
    key: "credit-points-overview",
    screen: 2,
    labelHe: "מה זה נקודות זיכוי?",
    // Same URL as oleh-hadash-credit below (kolzchut's general credit-points
    // overview page) — reusing an already-verified URL under a new, more
    // general label for the top-of-screen "special status" collapse
    // (fast-path 2026-09-07: collapse-status-screen).
    descriptionHe:
      "עמוד הריכוז של כל-זכות לנקודות זיכוי במס הכנסה: מה הן, איך הן מקטינות את המס, ומי זכאי לכל סוג.",
    url: "https://www.kolzchut.org.il/he/נקודות_זיכוי_ממס_הכנסה",
    confidence: "strongly-supported",
  },
  {
    key: "soldier-discharge-credit",
    screen: 2,
    labelHe: "רוצה לדעת יותר על נקודת הזיכוי לחייל/ת משוחרר/ת?",
    descriptionHe:
      "תנאי הזכאות המלאים לנקודת הזיכוי במשך 36 חודשים מהשחרור, כולל שירות מלא מול חלקי.",
    url: "https://www.kolzchut.org.il/he/נקודות_זיכוי_ממס_הכנסה_לחיילים_משוחררים_ומסיימי_שירות_לאומי-אזרחי",
    confidence: "strongly-supported",
  },
  {
    key: "oleh-hadash-credit",
    screen: 2,
    labelHe: "רוצה לדעת יותר על נקודות הזיכוי לעולה/ת חדש/ה?",
    descriptionHe:
      "עמוד הריכוז של כל-זכות לנקודות זיכוי במס הכנסה, כולל המסלול לעולים חדשים ותושבים חוזרים.",
    url: "https://www.kolzchut.org.il/he/נקודות_זיכוי_ממס_הכנסה",
    confidence: "strongly-supported",
  },
  {
    key: "academic-degree-credit",
    screen: 2,
    labelHe: "איך מגישים אישור על התואר?",
    descriptionHe:
      "טופס 119 להגשת אישור סיום תואר אקדמי לרשות המסים, לצורך נקודת הזיכוי.",
    url: "https://www.gov.il/he/service/itc119",
    confidence: "strongly-supported",
  },
  {
    key: "reserve-combat-credit",
    screen: 2,
    labelHe: "מה זה נקודות הזיכוי למילואים כלוחם/ת?",
    descriptionHe:
      "הסבר של כל-זכות על זיכוי המס למשרתי מילואים כלוחמים (תיקון 283) ואיך הוא מחושב.",
    url: "https://www.kolzchut.org.il/he/נקודות_זיכוי_ממס_הכנסה_ללוחמי_מילואים",
    confidence: "strongly-supported",
  },
  {
    key: "reserve-combat-credit-source",
    screen: 2,
    labelHe: "המקור הרשמי ברשות המסים",
    descriptionHe:
      "העמוד הרשמי של רשות המסים על זיכוי המס למשרתי מילואים כלוחמים.",
    url: "https://www.gov.il/he/pages/pa181225-1",
    confidence: "strongly-supported",
  },
  {
    key: "children-credit",
    screen: 2,
    labelHe: "איך מחשבים נקודות זיכוי לילדים?",
    descriptionHe:
      "הסבר של כל-זכות על נקודות הזיכוי שמקבל הורה לילד/ה עד גיל 18, לפי גיל הילד/ה.",
    url: "https://www.kolzchut.org.il/he/נקודות_זיכוי_ממס_הכנסה_להורה_לילד_עד_גיל_18",
    confidence: "strongly-supported",
  },

  // ── Screen 3 — היכרות עם העסק ────────────────────────────────────────────
  {
    key: "osek-type-explainer",
    screen: 3,
    labelHe: "מה ההבדל בין עוסק פטור למורשה?",
    descriptionHe:
      "הסבר מלא של כל-זכות על שני המסלולים: תקרת המחזור, חובת מע״מ וההבדלים המעשיים.",
    url: "https://www.kolzchut.org.il/he/עוסק_פטור",
    confidence: "strongly-supported",
  },
  {
    key: "osek-open-file",
    screen: 3,
    labelHe: "איפה פותחים תיק עוסק פטור?",
    descriptionHe:
      "הבקשה המקוונת הרשמית של רשות המסים לפתיחת תיק עוסק פטור, כולל חיבור לביטוח הלאומי.",
    url: "https://www.gov.il/he/service/request-open-exempt-dealer-via-internet",
    confidence: "strongly-supported",
  },

  // ── Screen 5 — הכנסות ────────────────────────────────────────────────────
  {
    key: "revenue-ceiling",
    screen: 5,
    labelHe: "מה קורה אם עוברים את התקרה?",
    descriptionHe:
      "אותו עמוד שמסביר את תקרת המחזור של עוסק פטור ומה קורה בפועל כשחוצים אותה.",
    url: "https://www.kolzchut.org.il/he/עוסק_פטור",
    confidence: "strongly-supported",
  },

  // ── Screen 6 — הוצאות וניכויים ───────────────────────────────────────────
  {
    key: "bl-annual-statement",
    screen: 6,
    labelHe: "איפה משיגים את הסכום ששילמתי?",
    descriptionHe: "האזור האישי באתר הביטוח הלאומי, להורדת אישורי תשלום שנתיים.",
    url: "https://ps.btl.gov.il",
    confidence: "strongly-supported",
  },
  {
    key: "bl-health-tax-split",
    screen: 6,
    labelHe: "למה יש כאן שני שדות?",
    descriptionHe:
      "טבלת שיעורי הביטוח הלאומי לעצמאים של המוסד לביטוח לאומי, שמראה איך מתפצל התשלום בין ביטוח לאומי למס בריאות.",
    url: "https://www.btl.gov.il/Insurance/National%20Insurance/type_list/Self_Employed/Pages/rates.aspx",
    confidence: "strongly-supported",
  },
  {
    key: "keren-hishtalmut",
    screen: 6,
    labelHe: "מה זה קרן השתלמות לעצמאים?",
    descriptionHe:
      "הסבר של כל-זכות על קרן ההשתלמות לעצמאים: מי זכאי, תקרות ההפקדה וההטבה במס.",
    url: "https://www.kolzchut.org.il/he/קרן_השתלמות_לעובד_עצמאי",
    confidence: "strongly-supported",
  },
  {
    key: "pension-contributions",
    screen: 6,
    labelHe: "מה ההטבה על הפקדות לפנסיה/קופת גמל?",
    descriptionHe:
      "הסבר של כל-זכות על ההטבה במס הכנסה בעד הפקדות עצמאיות לביטוח פנסיוני.",
    url: "https://www.kolzchut.org.il/he/הטבות_במס_הכנסה_בגין_הפקדות_עצמאיות_לביטוח_פנסיוני",
    confidence: "strongly-supported",
  },
  {
    key: "donations-recognized",
    screen: 6,
    labelHe: "איך יודעים אם המוסד מוכר לצורך תרומה?",
    descriptionHe: "כלי בדיקה מקוון של רשות המסים לאישור זכאות מס לתרומות (סעיף 46).",
    url: "https://www.gov.il/he/service/confirmation-of-donations",
    confidence: "strongly-supported",
  },
];

export const HELP_LINKS_BY_KEY: Record<string, HelpLinkEntry> = Object.fromEntries(
  HELP_LINKS.map((l) => [l.key, l]),
);

// ── Not shipped — confidence too low, kept for the record only ────────────
// TODO(verify): open boi.org.il/roles/supervisionregulation/banklist/ by hand
// and confirm it actually surfaces a usable list of 2-digit bank codes before
// adding this to HELP_LINKS. Only the search-result TITLE was seen this
// session, never the page content, and it may not be the simple lookup a
// first-time user needs.
// {
//   key: "bank-code-lookup",
//   screen: 7,
//   labelHe: "לא זוכר/ת את קוד הבנק?",
//   descriptionHe:
//     "עמוד בנק ישראל בנושא קודי זיהוי לתאגידים בנקאיים — לא אומת התוכן בפועל.",
//   url: "https://www.boi.org.il/roles/supervisionregulation/banklist/",
//   confidence: "unverified",
// },
