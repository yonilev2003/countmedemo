/**
 * Claude-powered classification for raw publications.
 *
 * For each unseen publication, we ask Claude to decide:
 *   - is it relevant to Form 1301 calculators at all?
 *   - what kind of change is it (legislation / temporary order / clarification / …)?
 *   - which tax year(s) does it apply to?
 *   - which TAX_YEAR_*_RAW constants might be affected?
 *   - is the change mechanical enough to propose a concrete diff?
 *
 * The model is given a flattened view of the existing constants (with their
 * sources and current values) so it can correctly match a publication to a
 * specific code-level constant.
 */

import Anthropic from "@anthropic-ai/sdk";
import { TAX_YEAR_TABLES, type TaxConstant } from "@/lib/calculators/types";
import type { RawPublication } from "./sources";

export interface ProposedConstantChange {
  /** Key into TAX_YEAR_YYYY_RAW. */
  constant: string;
  /** Tax year whose table holds it. */
  taxYear: number;
  /** JSON-encoded current value (for arrays/objects) or raw scalar. */
  from: unknown;
  /** Proposed new value (same shape as `from`). */
  to: unknown;
  /** Why the agent thinks this is the right new value. */
  reasoning: string;
}

export interface Classification {
  relevant: boolean;
  changeType:
    | "legislation"
    | "temporary_order"
    | "clarification"
    | "guidance"
    | "technical"
    | "irrelevant";
  /** Tax years the change applies to. Empty when the publication is not change-bearing. */
  effectiveTaxYears: number[];
  /** ISO date — set for הוראות שעה only. */
  sunsetDate: string | null;
  applicability: Array<
    "self_employed" | "employees" | "employers" | "representatives" | "all"
  >;
  /** Constants the agent suspects are affected (may be empty for non-mechanical changes). */
  affectedConstants: string[];
  /** Concrete diff — populated only when changeType is mechanical-ish AND confidence is high. */
  mechanical: boolean;
  proposedChanges: ProposedConstantChange[];
  /** Edge cases the human reviewer should look into. */
  edgeCases: string[];
  /** Short Hebrew summary suitable for the Issue body. */
  summaryHe: string;
  confidence: "high" | "medium" | "low";
  riskIfIgnored: string;
}

const SYSTEM_PROMPT = `אתה עוזר רגולטורי לאפליקציית מס ישראלית.
תפקידך: לקרוא פרסום רשמי ולסווג אותו לפי השפעה על מחשבוני טופס 1301.

כללי החלטה:
- relevant=false אם הפרסום הוא הודעת עיתונאות כללית, סקירת ביצועים, או נושא שאינו נוגע להכנסה/ניכויים/זיכויים/ספים של יחיד.
- changeType:
  - "legislation": תיקון פקודת מס הכנסה / חוק מע"מ / חוק ביטוח לאומי
  - "temporary_order": הוראת שעה (sunsetDate חובה)
  - "clarification": הבהרה לפרסום קודם
  - "guidance": חוזר מקצועי, הנחיית מנהל
  - "technical": שינוי טכני (טופס חדש, פורמט דיווח)
- effectiveTaxYears: רשימת שנות מס שאליהן השינוי חל. למשל [2026] אם פורסם בשנת 2025 וחל מ-2026.
- sunsetDate: רק להוראת שעה — תאריך תפוגה ב-ISO.
- mechanical: true רק אם הצעת השינוי היא החלפת מספר בודד בערך ידוע (כמו "נקודת זיכוי 2904 → 3012") עם ביטחון גבוה. אם נדרשת לוגיקה חדשה — mechanical=false.
- proposedChanges: רק אם mechanical=true. לכל שינוי תן constant (מפתח מדויק מתוך הקבועים שהוצגו), taxYear, from (הערך הנוכחי), to (הערך החדש), reasoning.
- edgeCases: רשימת מקרי קצה לבדיקה אנושית — למשל "האם הערך משפיע על חישוב אחר?", "האם יש personas ב-localStorage עם הערך הישן?".
- summaryHe: 2–4 משפטים, עברית רשמית, ללא ניחוש מעבר למה שכתוב בפרסום.
- confidence: high רק אם הפרסום הוא הסופי+אופציות חישוב ברורות. אחרת medium/low.

ענה תמיד ב-JSON בלבד, ללא טקסט מסביב. הקפד שהשדות יהיו בדיוק לפי הסכמה.`;

function flatRawTablesForPrompt() {
  const out: Record<number, Record<string, unknown>> = {};
  for (const [year, table] of Object.entries(TAX_YEAR_TABLES)) {
    const flat: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(table)) {
      const c = raw as TaxConstant<unknown>;
      flat[key] = {
        value: c.value,
        effectiveFrom: c.effectiveFrom,
        effectiveTo: c.effectiveTo,
        sourceUrl: c.source.url,
        sourceTitle: c.source.title,
        lastVerified: c.lastVerified,
      };
    }
    out[Number(year)] = flat;
  }
  return out;
}

export async function classifyPublication(
  pub: RawPublication,
  /** The tax year currently being filed (e.g. today is May 2026 → filings are for tax year 2025). */
  currentFilingYear: number,
  client: Anthropic = new Anthropic(),
): Promise<Classification> {
  const userBlock = JSON.stringify(
    {
      currentFilingYear,
      publication: {
        issuer: pub.issuer,
        url: pub.url,
        title: pub.title,
        publishedAt: pub.publishedAt,
        body: pub.body.slice(0, 6000),
      },
      knownConstants: flatRawTablesForPrompt(),
    },
    null,
    2,
  );

  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userBlock }],
  });

  const text = res.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("");
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(`classify: model returned non-JSON for ${pub.id}: ${text.slice(0, 200)}`);
  }
  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Classification;
  // Minimal shape guard — caller treats anything missing as not actionable.
  return {
    relevant: parsed.relevant ?? false,
    changeType: parsed.changeType ?? "irrelevant",
    effectiveTaxYears: parsed.effectiveTaxYears ?? [],
    sunsetDate: parsed.sunsetDate ?? null,
    applicability: parsed.applicability ?? [],
    affectedConstants: parsed.affectedConstants ?? [],
    mechanical: parsed.mechanical ?? false,
    proposedChanges: parsed.proposedChanges ?? [],
    edgeCases: parsed.edgeCases ?? [],
    summaryHe: parsed.summaryHe ?? "",
    confidence: parsed.confidence ?? "low",
    riskIfIgnored: parsed.riskIfIgnored ?? "",
  };
}
