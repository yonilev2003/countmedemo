/**
 * Form 1219 — הצהרת הון (Israeli capital / net-worth declaration for individuals).
 *
 * Reuses the generic field model from form-1301 (`FormField` / `FormSection`) so
 * the same gov.il-faithful renderer + clickable `InteractiveValue` machinery
 * drives it. Structure mirrors the real טופס 1219: assets (נכסים), liabilities
 * (התחייבויות), and the net-capital summary (הון נקי).
 *
 * TODO(Roy / gov.il grounding): the live 1219 numbers each asset/liability line
 * with an official code (and splits "in Israel" vs "abroad"). Codes below are
 * placeholders pending verification against the real secapp.taxes.gov.il form —
 * the structure + calculators are correct; the verbatim codes need a pass.
 */

import type { FormField, FormSection } from "@/lib/form-1301/schema";

export type { FormField, FormSection } from "@/lib/form-1301/schema";

export type Form1219TabId = "assets" | "liabilities" | "summary";

export interface Form1219Tab {
  id: Form1219TabId;
  label: string;
  sections: FormSection[];
}

/** A "category subtotal" calculated row — clickable, shows the lines that fed it. */
function subtotalField(label: string, calculator: string): FormField {
  return { label, kind: "currency", status: "calculated", calculator };
}

/* ── Tab 1: נכסים (assets) ─────────────────────────────────────────────────── */
const tabAssets: Form1219Tab = {
  id: "assets",
  label: "נכסים",
  sections: [
    {
      letter: "א.",
      title: "כספים ופיקדונות",
      description: "מזומן, עובר-ושב, פיקדונות וחסכונות נכון לתאריך ההצהרה",
      fields: [subtotalField("סה״כ כספים ופיקדונות", "capital-asset-cash-and-deposits")],
    },
    {
      letter: "ב.",
      title: "ניירות ערך וקרנות",
      fields: [subtotalField("סה״כ ניירות ערך", "capital-asset-securities")],
    },
    {
      letter: "ג.",
      title: "קופות גמל, קרן השתלמות ופנסיה",
      fields: [
        subtotalField("סה״כ חיסכון פנסיוני", "capital-asset-provident-and-pension"),
      ],
    },
    {
      letter: "ד.",
      title: "נדל״ן",
      description: "דירות, מגרשים ונכסי מקרקעין — לפי שווי מוצהר",
      fields: [subtotalField("סה״כ נדל״ן", "capital-asset-real-estate")],
    },
    {
      letter: "ה.",
      title: "כלי רכב",
      fields: [subtotalField("סה״כ כלי רכב", "capital-asset-vehicles")],
    },
    {
      letter: "ו.",
      title: "הון בעסק",
      description: "מלאי, ציוד, יתרת לקוחות והון עצמי בעסק",
      fields: [subtotalField("סה״כ הון בעסק", "capital-asset-business-capital")],
    },
    {
      letter: "ז.",
      title: "הלוואות שניתנו וביטוחי חיים",
      fields: [
        subtotalField("הלוואות שניתנו", "capital-asset-loans-receivable"),
        subtotalField("ביטוח חיים (ערך פדיון)", "capital-asset-life-insurance"),
      ],
    },
    {
      letter: "ח.",
      title: "מטלטלין ונכסים אחרים",
      fields: [
        subtotalField("מטלטלין, תכשיטים ואומנות", "capital-asset-personal-property"),
        subtotalField("נכסים אחרים", "capital-asset-other-assets"),
      ],
    },
  ],
};

/* ── Tab 2: התחייבויות (liabilities) ──────────────────────────────────────── */
const tabLiabilities: Form1219Tab = {
  id: "liabilities",
  label: "התחייבויות",
  sections: [
    {
      letter: "ט.",
      title: "הלוואות ומשכנתאות",
      fields: [
        subtotalField("משכנתא", "capital-liability-mortgage"),
        subtotalField("הלוואות בנקאיות", "capital-liability-bank-loan"),
        subtotalField("הלוואות פרטיות", "capital-liability-private-loan"),
      ],
    },
    {
      letter: "י.",
      title: "אשראי וחובות שוטפים",
      fields: [
        subtotalField("יתרת אשראי וכרטיסים", "capital-liability-credit-balance"),
        subtotalField("חוב לספקים", "capital-liability-supplier-debt"),
        subtotalField("התחייבויות אחרות", "capital-liability-other-liability"),
      ],
    },
  ],
};

/* ── Tab 3: סיכום הון (net capital) ───────────────────────────────────────── */
const tabSummary: Form1219Tab = {
  id: "summary",
  label: "סיכום הון",
  sections: [
    {
      letter: "כ.",
      title: "סיכום הצהרת ההון",
      description: "הון נקי = סך הנכסים פחות סך ההתחייבויות",
      fields: [
        subtotalField("סך כל הנכסים", "capital-total-assets"),
        subtotalField("סך כל ההתחייבויות", "capital-total-liabilities"),
        subtotalField("הון נקי", "capital-net"),
      ],
    },
  ],
};

export const form1219: Form1219Tab[] = [tabAssets, tabLiabilities, tabSummary];

/** Calculated rows that are the headline of the 1219 (for previews/cards). */
export const capitalStarCalculators = [
  "capital-total-assets",
  "capital-total-liabilities",
  "capital-net",
] as const;
