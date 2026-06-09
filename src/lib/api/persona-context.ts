import { Persona } from "@/lib/persona";
import { getTaxYearConstants } from "@/lib/calculators/types";

/**
 * Persona → system-prompt context builders for the chat routes.
 *
 * The persona arrives from the client, so every interpolated value is coerced
 * and capped here. Without this, a crafted persona (e.g. a megabyte-long
 * firstName) would bypass MAX_MESSAGE_CHARS and inflate input tokens on our
 * Anthropic bill.
 */

const MAX_FIELD_CHARS = 120;
export const MAX_PERSONA_CONTEXT_CHARS = 3000;

/** Coerce to a control-char-free string, capped at maxChars. */
function str(v: unknown, maxChars = MAX_FIELD_CHARS): string {
  return String(v ?? "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .slice(0, maxChars);
}

/** Coerce to a finite non-negative number (0 otherwise). */
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function ils(v: unknown): string {
  return num(v).toLocaleString("he-IL");
}

function cap(context: string): string {
  return context.slice(0, MAX_PERSONA_CONTEXT_CHARS);
}

function bituachFigures(p: Persona) {
  // getTaxYearConstants falls back to a known year for any out-of-registry input
  const TC = getTaxYearConstants(num(p.income?.year));
  const paid = num(p.deductionsAndCredits?.bituachLeumiSelfEmployed?.annualPaid);
  return {
    paid,
    deductible: Math.round(paid * TC.bituachLeumiDeductibleRate),
    TC,
  };
}

/** System context for /api/chat — the form-1301 companion chat. */
export function buildChatPersonaContext(persona: Persona): string {
  const p = persona;
  const { paid, deductible, TC } = bituachFigures(p);

  const creditLines: string[] = ["תושב (2.25)"];
  if (p.personal?.isNewResident) creditLines.push("עולה חדש");
  if (p.personal?.isSoldierDischarged) creditLines.push("חייל משוחרר");

  const form6111 =
    num(p.vatAndTurnover?.annualTurnoverWithoutVat) > TC.form6111Threshold
      ? "חייב בטופס 6111"
      : "לא חייב";

  return cap(`נתוני המשתמש:
שם: ${str(p.personal?.firstName)} ${str(p.personal?.lastName)}
הכנסות ברוטו: ${ils(p.income?.totalRevenue)} ₪
הוצאות מוכרות: ${ils(p.income?.totalDeductibleExpenses)} ₪
הכנסה חייבת (שדה 150): ${ils(p.income?.netIncome)} ₪
מחזור שנתי (שדות 238/294): ${ils(p.income?.totalRevenue)} ₪
ביטוח לאומי ששולם: ${ils(paid)} ₪ (מוכר לניכוי: ${ils(deductible)} ₪)
קרן השתלמות: ${ils(p.deductionsAndCredits?.kerenHishtalmut?.annualContribution)} ₪
עסק: ${str(p.business?.tradeName)}, ${str(p.business?.primaryOccupation)}
סוג עוסק: ${str(p.business?.osekType, 20)}
טופס 6111: ${form6111}
נקודות זיכוי: ${creditLines.join(", ")}`);
}

/** System context for /api/coach — Eitan, the digital partner. */
export function buildCoachPersonaContext(persona: Persona): string {
  const p = persona;
  const { paid, deductible } = bituachFigures(p);
  const gender = p.personal?.gender === "male" ? "זכר" : "נקבה";

  return cap(`נתוני המשתמש/ת מהדוח שלהם:
שם: ${str(p.personal?.firstName)} ${str(p.personal?.lastName)}
מגדר: ${gender}
עסק: ${str(p.business?.tradeName)}, ${str(p.business?.primaryOccupation)}
סוג עוסק: ${str(p.business?.osekType, 20)}${p.business?.isOsekZeir ? " (מסלול עוסק זעיר)" : ""}
מחזור שנתי: ${ils(p.income?.totalRevenue)} ש"ח
הוצאות מוכרות שכבר דווחו: ${ils(p.income?.totalDeductibleExpenses)} ש"ח
ביטוח לאומי ששולם: ${ils(paid)} ש"ח (מוכר ${ils(deductible)} ש"ח)
קרן השתלמות: ${ils(p.deductionsAndCredits?.kerenHishtalmut?.annualContribution)} ש"ח

כשאתה חוקר איתם, התייחס לנתונים האלה. אם משהו חסר או נמוך משמעותית מהצפוי לעיסוק שלהם, ציין את זה.`);
}
