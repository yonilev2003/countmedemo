// Eitan's data-retrieval layer (workstream H).
//
// Two things live here:
//   • buildRichContext(persona) — a comprehensive COMPUTED snapshot injected into
//     the system prompt so Eitan answers common questions without a round-trip
//     ("richer static context").
//   • EITAN_TOOLS + runEitanTool() — Anthropic tool-use so Eitan can FETCH a
//     specific computed value on demand ("live data retrieval").
//
// Everything is derived from the Persona that the request already carries +
// the pure calculators, so this works server-side WITHOUT the (currently
// blocked) Supabase DB. When the live DB lands, invoice/expense tools can be
// added here with the same shape, RLS-scoped to the authenticated user.

import type Anthropic from "@anthropic-ai/sdk";
import { effectiveDeductibleExpenses, type Persona } from "@/lib/persona";
import { ils as formatIls } from "@/lib/utils";
import {
  calculate,
  estimateTaxLiability,
  computeBusinessIncome,
  computeTaxableIncome,
  totalCreditPoints,
} from "@/lib/calculators/index";
import { getTaxYearConstants } from "@/lib/calculators/types";
import { getUpcomingDeadlines, type FilerType } from "@/lib/deadlines/calendar";
import { computeCeilingAlert } from "@/lib/alerts/ceiling";

// Rendered into the LLM system prompt only (no UI surface); standardized on ₪.
const ils = (n: number) => formatIls(Math.round(n));

/** Friendly 1301 field code → calculator id in the dispatcher. */
const FIELD_TO_CALCULATOR: Record<string, string> = {
  "150": "field-150-business-income",
  "238": "field-238-turnover",
  "294": "field-238-turnover",
  "030": "field-030-bituach-leumi",
  "137": "field-137-keren-hishtalmut",
  "020": "field-020-resident",
  "044": "field-044-oleh-hadash",
  "068": "field-068-soldier",
  "046": "field-046-donations-credit",
  "297": "field-297-form-6111",
  miluim: "field-miluim-credit",
};

function filerTypeFor(persona: Persona): FilerType {
  return persona.business?.osekType === "morshe" ? "osek-murshe" : "osek-patur";
}

/**
 * A comprehensive, always-injected computed snapshot. Goes beyond the raw
 * persona: it runs the calculators so Eitan sees the actual 1301 numbers, the
 * tax estimate, the turnover-ceiling status, and the next deadlines.
 */
export function buildRichContext(persona: Persona): string {
  const p = persona;
  const year = p.income.year;
  const TC = getTaxYearConstants(year);
  const gender = p.personal.gender === "male" ? "זכר" : "נקבה";

  const businessIncome = computeBusinessIncome(p);
  const taxable = computeTaxableIncome(p);
  const points = totalCreditPoints(p);
  const est = safe(() => estimateTaxLiability(p));
  const ceiling = safe(() => computeCeilingAlert(p));
  const deadlines = safe(() =>
    getUpcomingDeadlines(new Date(), filerTypeFor(p), 3),
  );

  const lines: string[] = [
    `נתוני המשתמש/ת (שנת מס ${year}) — מחושב מהדוח שלהם:`,
    `שם: ${p.personal.firstName} ${p.personal.lastName} · מגדר: ${gender}`,
    `עסק: ${p.business.tradeName}, ${p.business.primaryOccupation} · סוג עוסק: ${p.business.osekType}${p.business.isOsekZeir ? " (מסלול עוסק זעיר)" : ""}`,
    `מחזור שנתי (238): ${ils(p.income.totalRevenue)} · הוצאות שדווחו: ${ils(effectiveDeductibleExpenses(p.income))}`,
    `הכנסה מעסק (150): ${ils(businessIncome)} · הכנסה חייבת: ${ils(taxable)} · נקודות זיכוי: ${points}`,
  ];
  if (est) {
    lines.push(
      `אומדן מס: מס לפני זיכויים ${ils(est.grossTax)} · שווי נק' זיכוי ${ils(est.creditPointsValue)} · מס אחרי זיכויים ${ils(est.taxAfterCredits)} · ${est.balance < 0 ? `החזר צפוי ${ils(-est.balance)}` : `יתרה לתשלום ${ils(est.balance)}`}`,
    );
  }
  if (ceiling) {
    lines.push(
      `תקרת מחזור (${p.business.osekType}): ${ceiling.percent}% מהתקרה (${ils(ceiling.threshold)}), נותרו ${ils(ceiling.remaining)} — ${ceiling.headlineHe}`,
    );
  }
  if (deadlines && deadlines.length) {
    const ds = deadlines
      .map((d) => `${d.titleHe} (בעוד ${d.daysUntilDue} ימים)`)
      .join(" · ");
    lines.push(`מועדים קרובים: ${ds}`);
  }
  lines.push(
    "",
    "יש לך כלים לשליפת ערכים מדויקים (get_form_value, get_tax_estimate, get_upcoming_deadlines, get_ceiling_status). השתמש בהם כשצריך מספר ספציפי, וצטט את הנוסחה/המקור שחוזר מהכלי. אל תמציא מספרים — אם אינך בטוח, קרא לכלי.",
  );
  return lines.join("\n");
}

/** Tool definitions exposed to the model (only meaningful when a persona exists). */
export const EITAN_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_form_value",
    description:
      "מחזיר את הערך המחושב של שדה בטופס 1301 עבור המשתמש/ת, כולל הנוסחה והמקורות. השתמש כשנדרש מספר מדויק של שדה.",
    input_schema: {
      type: "object",
      properties: {
        field: {
          type: "string",
          description:
            "קוד שדה 1301: 150 (הכנסה מעסק), 238/294 (מחזור), 030 (ביטוח לאומי), 137 (קרן השתלמות), 020 (תושב), 044 (עולה חדש), 068 (חייל משוחרר), 046 (תרומות), 297 (טופס 6111), miluim (מילואים).",
        },
      },
      required: ["field"],
    },
  },
  {
    name: "get_tax_estimate",
    description: "מחזיר את אומדן המס המלא: הכנסה חייבת, מס לפני/אחרי זיכויים, מקדמות, ויתרה לתשלום/החזר.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_upcoming_deadlines",
    description: "מחזיר את מועדי הדיווח הקרובים (מע\"מ, מקדמות, דוח שנתי) לפי סוג העוסק של המשתמש/ת.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "כמה מועדים להחזיר (ברירת מחדל 5)." },
      },
    },
  },
  {
    name: "get_ceiling_status",
    description: "מחזיר את מצב תקרת המחזור (עוסק פטור/זעיר): מחזור נוכחי, התקרה, אחוז וניצול.",
    input_schema: { type: "object", properties: {} },
  },
];

/** Run a tool by name against the persona. Always returns a string (never throws). */
export function runEitanTool(
  name: string,
  input: Record<string, unknown>,
  persona: Persona,
): string {
  try {
    switch (name) {
      case "get_form_value": {
        const field = String(input.field ?? "").trim();
        const calcId = FIELD_TO_CALCULATOR[field] ?? field;
        const res = calculate(calcId, persona);
        if (!res) return JSON.stringify({ error: `שדה לא מוכר: ${field}` });
        return JSON.stringify({
          field,
          value: res.value,
          formula: res.formula,
          sources: res.sources,
          confidence: res.confidence,
          notes: res.notes ?? [],
        });
      }
      case "get_tax_estimate": {
        const e = estimateTaxLiability(persona);
        return JSON.stringify(e);
      }
      case "get_upcoming_deadlines": {
        const limit =
          typeof input.limit === "number" ? Math.min(input.limit, 20) : 5;
        const ds = getUpcomingDeadlines(new Date(), filerTypeFor(persona), limit);
        return JSON.stringify(
          ds.map((d) => ({
            title: d.titleHe,
            daysUntilDue: d.daysUntilDue,
            dueDate: d.nextDueDate.toISOString().slice(0, 10),
          })),
        );
      }
      case "get_ceiling_status": {
        const c = computeCeilingAlert(persona);
        return JSON.stringify(c ?? { note: "אין תקרה רלוונטית (עוסק מורשה)" });
      }
      default:
        return JSON.stringify({ error: `כלי לא מוכר: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({
      error: "שגיאה בשליפת הנתון",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

function safe<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}
