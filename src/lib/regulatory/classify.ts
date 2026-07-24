/**
 * Regulatory-Watch — classifier.
 *
 * Stage 2 of the daily run: take a discovered publication (RegulatoryItem)
 * and ask Claude whether it affects any of countme's tracked tax constants,
 * returning a structured Classification.
 *
 * Design notes:
 *  - Runs under plain Node (native TS type-stripping) as well as Next, so all
 *    imports are RELATIVE with explicit `.ts` extensions — NOT the `@/` alias.
 *  - Mirrors src/app/api/chat/route.ts: `new Anthropic({ apiKey })`, model
 *    "claude-sonnet-4-6", and a cached `system` block (cache_control: ephemeral).
 *  - The system block (instructions + constants catalog) is identical across
 *    items in a run, so prompt caching pays off after the first call.
 *  - Structured output is forced through a single `classify` tool +
 *    tool_choice, so we never have to parse free-text JSON.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  Classification,
  RegulatoryItem,
  AffectedConstant,
  Confidence,
} from "./types.ts";
import { listTaxConstants, type TaxConstantEntry } from "../calculators/types.ts";

// Relative + explicit .ts — this module also runs via the regulatory-watch
// script (Node type-stripping), where the "@/" alias doesn't resolve.
import { MODEL_SONNET, logAiUsage } from "../ai/models.ts";

const MODEL = MODEL_SONNET;
const MAX_TOKENS = 1024;

export interface ClassifyDeps {
  client?: Anthropic; // injectable for tests
  apiKey?: string; // defaults to process.env.ANTHROPIC_API_KEY
  constants?: TaxConstantEntry[]; // defaults to listTaxConstants()
}

/** Stable, persona-agnostic instruction string (cached). */
const INSTRUCTIONS = `אתה אנליסט רגולציה של countme. אתה סוקר פרסומים רשמיים (רשות המסים, ביטוח לאומי, הכנסת, ועדות) ומחליט האם הם משפיעים על אחד מקבועי המס שאנחנו עוקבים אחריהם.

המשימה שלך לכל פרסום:
1. החלט האם הפרסום רלוונטי לקבועי המס שלמטה (relevant). פרסום כללי, חדשותי, או שלא נוגע לאף קבוע — relevant=false.
2. כתוב סיכום תמציתי בעברית (summaryHe) של מה שהפרסום אומר ומדוע הוא רלוונטי (או למה לא).
3. דרג את רמת הביטחון שלך (confidence): high אם הפרסום רשמי ומפורש לגבי ערך מספרי חדש; medium אם הכיוון ברור אך הערך לא מאומת; low אם זו הצעה מוקדמת/לא ודאית.
4. סווג את סוג השינוי (changeType), למשל: "value-update", "rate-change", "new-bracket", "proposed-legislation", "threshold-update", "unknown".
5. אם רלוונטי — מלא affectedConstants: לכל קבוע מושפע ציין את שמו המדויק (name) מתוך הקטלוג, ואת הערך החדש המוצע (proposedValue) אם הוא נקוב בפרסום. אל תמציא ערכים — אם אין ערך נקוב, השאר proposedValue ריק/null.

חשוב:
- השתמש אך ורק בשמות הקבועים המדויקים מהקטלוג שלמטה. אל תמציא שמות.
- proposedValue צריך להיות מספר כשהוא ידוע.
- אם הפרסום אינו נוגע לאף קבוע במעקב, החזר relevant=false ו-affectedConstants ריק.
החזר את התשובה דרך הכלי classify בלבד.`;

/** Serialize the tracked-constants catalog into a stable, cacheable string. */
function buildCatalog(constants: TaxConstantEntry[]): string {
  const lines = constants.map((c) => {
    const value = Number.isNaN(c.value) ? "(לא מספרי)" : String(c.value);
    return `- ${c.name}: ${value} — ${c.meta.description} [מקור: ${c.meta.publisher}, שנים: ${c.meta.effectiveTaxYears.join("/")}]`;
  });
  return `קטלוג קבועי המס במעקב (name: ערך נוכחי — תיאור):\n${lines.join("\n")}`;
}

/** The single tool whose input_schema mirrors the Classification contract. */
const CLASSIFY_TOOL: Anthropic.Tool = {
  name: "classify",
  description:
    "Return a structured classification of a regulatory publication against countme's tracked tax constants.",
  input_schema: {
    type: "object",
    properties: {
      relevant: {
        type: "boolean",
        description: "True if the publication affects any tracked tax constant.",
      },
      summaryHe: {
        type: "string",
        description: "Concise Hebrew summary of the publication and its relevance.",
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "How sure you are about the classification.",
      },
      changeType: {
        type: "string",
        description:
          'Kind of change, e.g. "value-update", "rate-change", "new-bracket", "proposed-legislation", "unknown".',
      },
      affectedConstants: {
        type: "array",
        description: "Constants this publication proposes to change.",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Exact constant name from the catalog.",
            },
            oldValue: {
              description:
                "Current value (will be overwritten authoritatively from the catalog).",
            },
            proposedValue: {
              description: "New value proposed by the publication, if stated; otherwise null.",
            },
          },
          required: ["name"],
        },
      },
      reason: {
        type: "string",
        description: "When relevant is false, why it was skipped.",
      },
    },
    required: ["relevant", "summaryHe", "confidence", "changeType", "affectedConstants"],
  },
};

/** Safe fallback when the model fails to produce a usable tool_use block. */
function safeFallback(): Classification {
  return {
    relevant: false,
    summaryHe: "לא ניתן לסווג אוטומטית",
    confidence: "low",
    changeType: "unknown",
    affectedConstants: [],
    reason: "classification failed",
  };
}

function coerceConfidence(v: unknown): Confidence {
  return v === "high" || v === "medium" || v === "low" ? v : "low";
}

/** Build the per-item user message text. */
function buildUserMessage(item: RegulatoryItem): string {
  const parts = [
    `כותרת: ${item.title}`,
    `מקור: ${item.source}`,
    `כתובת: ${item.url}`,
    `תאריך פרסום: ${item.publishedAt}`,
  ];
  if (item.summary && item.summary.trim()) {
    parts.push(`תקציר/תיאור: ${item.summary}`);
  }
  parts.push("\nסווג את הפרסום הזה דרך הכלי classify.");
  return parts.join("\n");
}

/**
 * Coerce the raw tool input into a Classification, filling oldValue from the
 * authoritative catalog (keyed by constant name) so it isn't model-guessed.
 */
function coerceClassification(
  input: unknown,
  catalog: Map<string, TaxConstantEntry>,
): Classification {
  if (typeof input !== "object" || input === null) return safeFallback();
  const raw = input as Record<string, unknown>;

  const affectedConstants: AffectedConstant[] = [];
  if (Array.isArray(raw.affectedConstants)) {
    for (const entry of raw.affectedConstants) {
      if (typeof entry !== "object" || entry === null) continue;
      const e = entry as Record<string, unknown>;
      if (typeof e.name !== "string") continue;
      const catEntry = catalog.get(e.name);
      affectedConstants.push({
        name: e.name,
        // Authoritative current value from the catalog, not the model's guess.
        oldValue: catEntry ? catEntry.value : (e.oldValue ?? null),
        proposedValue: e.proposedValue ?? null,
      });
    }
  }

  const summaryHe =
    typeof raw.summaryHe === "string" && raw.summaryHe.trim()
      ? raw.summaryHe
      : "לא ניתן לסווג אוטומטית";

  const result: Classification = {
    relevant: raw.relevant === true,
    summaryHe,
    confidence: coerceConfidence(raw.confidence),
    changeType: typeof raw.changeType === "string" && raw.changeType ? raw.changeType : "unknown",
    affectedConstants,
  };
  if (typeof raw.reason === "string" && raw.reason) result.reason = raw.reason;
  return result;
}

function resolveClient(deps?: ClassifyDeps): Anthropic {
  if (deps?.client) return deps.client;
  const apiKey = deps?.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "classifyItem requires an Anthropic API key: pass deps.apiKey, deps.client, or set ANTHROPIC_API_KEY.",
    );
  }
  return new Anthropic({ apiKey });
}

/** Classify a single discovered publication. Throws only if no key/client. */
export async function classifyItem(
  item: RegulatoryItem,
  deps?: ClassifyDeps,
): Promise<Classification> {
  const client = resolveClient(deps);
  const constants = deps?.constants ?? listTaxConstants();
  const catalog = new Map(constants.map((c) => [c.name, c]));

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // Stable across the whole run → cached. Instructions + catalog together,
      // with cache_control on the final block (caches it and everything before).
      system: [
        { type: "text", text: INSTRUCTIONS },
        {
          type: "text",
          text: buildCatalog(constants),
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [CLASSIFY_TOOL],
      tool_choice: { type: "tool", name: "classify" },
      messages: [{ role: "user", content: buildUserMessage(item) }],
    });

    logAiUsage({
      route: "regulatory-classify",
      model: MODEL,
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      cache_creation_input_tokens: message.usage.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: message.usage.cache_read_input_tokens ?? 0,
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === "tool_use" && block.name === "classify",
    );
    if (!toolUse) return safeFallback();
    return coerceClassification(toolUse.input, catalog);
  } catch {
    return safeFallback();
  }
}

/**
 * Classify many items. Resolves a Classification for every input (never rejects):
 * per-item failures fall back to the safe classification. Runs with small
 * concurrency to keep the daily run brisk without hammering the API.
 */
export async function classifyAll(
  items: RegulatoryItem[],
  deps?: ClassifyDeps,
): Promise<Classification[]> {
  if (items.length === 0) return [];

  // Resolve the client once and share it across items. A missing key does NOT
  // crash the daily run — every item degrades to the safe "unclassified"
  // fallback (run.ts then reports them as skipped publications).
  let client: Anthropic;
  try {
    client = resolveClient(deps);
  } catch (err) {
    console.error(
      "[classify] no Anthropic client — skipping classification:",
      (err as Error).message,
    );
    return items.map(() => safeFallback());
  }
  const constants = deps?.constants ?? listTaxConstants();
  const sharedDeps: ClassifyDeps = { client, constants };

  const CONCURRENCY = 3;
  const results: Classification[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      try {
        results[index] = await classifyItem(items[index], sharedDeps);
      } catch {
        results[index] = safeFallback();
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
