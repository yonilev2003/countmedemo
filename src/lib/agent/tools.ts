// Eitan's data-retrieval layer (workstream H; extended for the RAG audit
// #20 knowledge-vault + client-graph tools, 2026-08-18).
//
// What lives here:
//   • buildRichContext(persona) — a comprehensive COMPUTED snapshot injected into
//     the system prompt so Eitan answers common questions without a round-trip
//     ("richer static context").
//   • EITAN_TOOLS + runEitanTool() — Anthropic tool-use so Eitan can FETCH a
//     specific computed value on demand ("live data retrieval"). This now
//     covers three families: (1) the original calculator/deadline/ceiling
//     tools, all pure over Persona; (2) search_knowledge/read_knowledge,
//     which DO hit Supabase (the only DB-backed tools here — see the
//     "Knowledge vault retrieval" section below for the degradation story);
//     (3) top_customers/expense_breakdown_by_category/
//     open_receivables_by_customer, over lib/agent/client-graph.ts (pure
//     over Persona, zero DB, same as family 1).
//   • renderKnowledgeToc() — the prompt-cached table-of-contents block for
//     the knowledge vault (route.ts's 3rd system block).
//   • probeKnowledgeAvailable() (v2 plan item 2.8, 2026-08-18) — a one-shot,
//     cached-promise check for whether knowledge_chunks/its RPC actually
//     exist. EITAN_TOOLS is built from it DYNAMICALLY: search_knowledge/
//     read_knowledge are omitted from the exported list only once the probe
//     has CONFIRMED the schema is missing (a real query error from a
//     reachable Supabase), so the model doesn't burn a whole extra round
//     calling a tool that can only 404 today (the migration is authored but
//     not applied — see the knowledge-vault section below). An ambiguous
//     probe result (no Supabase configured at all, network blip) leaves
//     them advertised — see the doc comment on probeKnowledgeAvailable()
//     for why, and on EITAN_TOOLS for the mechanics of the async update.
//
// Calculator/deadline/ceiling/client-graph tools are derived from the
// Persona the request already carries + pure functions, so they work
// server-side WITHOUT any DB. The knowledge tools are the one place this
// file talks to Supabase — always through createAdminClient(), always
// wrapped so a missing table/env degrades to an honest message instead of
// breaking the chat (see safeKnowledgeCall).

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
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildClientGraph,
  topCustomers,
  expenseBreakdownByCategory,
  openReceivablesByCustomer,
} from "@/lib/agent/client-graph";
// Committed by scripts/index-knowledge.mjs off knowledge/**/*.md — one row
// per note: {id, title, topic, summary}. Statically imported (not read via
// fs at request time) so it's inlined into the serverless bundle at build
// time, same reasoning as any other build-time JSON asset. Ships as `[]`
// until the vault + indexer have run at least once; the TOC block below
// degrades to an honest "still empty" line rather than an empty array dump.
import knowledgeToc from "../../../knowledge/toc.generated.json";

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
    "יש לך כלים לשליפת ערכים מדויקים (get_form_value, get_tax_estimate, get_upcoming_deadlines, get_ceiling_status). השתמש בהם כשצריך מספר ספציפי, וצטט את הנוסחה/המקור שחוזר מהכלי. אל תמציא מספרים — אם אינך בטוח, קרא לכלי. שאלה שאין לה כלי מתאים (כלל רגולטורי, סיבת חוק, מקרה חריג, תאריך מעבר לחלון שהכלים מחזירים) — אמור בפשטות שאין לך מקור מאומת לזה כרגע במקום לענות מהזיכרון, והפנה לרואה חשבון או יועץ מס מוסמך.",
  );
  return lines.join("\n");
}

/* ──────────────────────────────────────────────────────────────────────────
 * Knowledge vault retrieval (RAG audit #20, 2026-08-18) — Claude-native, no
 * embeddings: a prompt-cached table of contents (this section) plus two
 * tools, search_knowledge and read_knowledge, that hit ONE hybrid SQL RPC
 * (pg_trgm + FTS 'simple', supabase/migrations/20260818100000_knowledge_
 * chunks.sql) over rows produced by scripts/index-knowledge.mjs from
 * knowledge/**\/*.md. See that migration's header comment for the full
 * architecture note.
 *
 * Numbers discipline: notes are prose + pointers ONLY — the model is told,
 * here and in the TOC block, to never quote a figure from a note; every
 * number still comes from get_form_value/get_tax_estimate/etc. above.
 * ────────────────────────────────────────────────────────────────────────── */

interface TocEntry {
  id: string;
  title: string;
  topic: string | null;
  summary: string;
}

const KNOWLEDGE_TOC = knowledgeToc as TocEntry[];

/**
 * Prompt-cached system block: instructions + the compact TOC. Deterministic
 * (KNOWLEDGE_TOC is a build-time constant), so it caches as a stable prefix
 * exactly like SYSTEM_PROMPT/buildRichContext's blocks in route.ts.
 */
export function renderKnowledgeToc(): string {
  const header =
    "מאגר ידע (knowledge vault) — טבלת תוכן. לפני מענה על שאלה רגולטורית/מושגית (לא מספר שדה), עיינו בטבלה, ואם רלוונטי קראו לכלי search_knowledge ואז read_knowledge כדי לצטט מדויק. ציינו את שם הפתק כשאתם מסתמכים עליו. לעולם אל תצטטו סכום, אחוז, תקרה או תאריך-יעד ממאגר הידע — מספרים מגיעים אך ורק מכלי המחשבון (get_form_value וכו').";

  if (KNOWLEDGE_TOC.length === 0) {
    return `${header}\n\n(המאגר עדיין ריק — search_knowledge/read_knowledge יחזירו הודעת "לא זמין" עד שהאינדקסר ירוץ על פתקים אמיתיים.)`;
  }

  const rows = KNOWLEDGE_TOC.map(
    (e) => `- [${e.id}] ${e.title}${e.topic ? ` (${e.topic})` : ""}: ${e.summary}`,
  ).join("\n");
  return `${header}\n\n${rows}`;
}

/**
 * Minimal shape for the two knowledge_chunks operations below, used ONLY to
 * cast createAdminClient()'s result at those call sites — see the comment
 * next to each cast for why (the table/RPC predate database.types.ts).
 */
interface UntypedAdmin {
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
  from(table: string): {
    select(cols: string): {
      in(
        col: string,
        vals: string[],
      ): Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
      // Used only by probeKnowledgeAvailable() below (`select id … limit 1`).
      limit(n: number): Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
    };
  };
}

const KNOWLEDGE_UNAVAILABLE = JSON.stringify({
  error: "הידע עוד לא זמין",
  note: "טבלת knowledge_chunks/RPC טרם קיימת או שאין חיבור ל-Supabase — התשובה תמשיך בלי מקור מהמאגר.",
});

/** Run a knowledge-vault operation, degrading to an honest message on any failure
 *  (missing env, missing table/RPC, network) — never throws, matches
 *  checkRateLimitDurable's fail-soft convention for optional Supabase reads. */
async function safeKnowledgeCall<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export async function searchKnowledge(query: string): Promise<string> {
  const q = query.trim();
  if (!q) return JSON.stringify({ error: "שאילתה ריקה" });

  const result = await safeKnowledgeCall(async () => {
    // knowledge_chunks/search_knowledge_chunks are defined in
    // supabase/migrations/20260818100000_knowledge_chunks.sql, but that
    // migration is intentionally NOT applied yet (task scope), so
    // database.types.ts (generated FROM the live schema) doesn't know
    // them. `as UntypedAdmin` narrows ONLY this call site rather than
    // weakening createAdminClient()'s type everywhere — regenerate types
    // and drop this cast once the migration ships.
    const admin = createAdminClient() as unknown as UntypedAdmin;
    const { data, error } = await admin.rpc("search_knowledge_chunks", {
      p_query: q,
      p_limit: 8,
    });
    if (error) throw error;
    return (data ?? []) as { id: string; title: string; snippet: string }[];
  });

  if (result === null) return KNOWLEDGE_UNAVAILABLE;
  return JSON.stringify(
    result.map((r: { id: string; title: string; snippet: string }) => ({
      id: r.id,
      title: r.title,
      snippet: r.snippet,
    })),
  );
}

export async function readKnowledge(ids: string[]): Promise<string> {
  const wanted = ids.filter((id) => typeof id === "string" && id.trim()).slice(0, 4);
  if (wanted.length === 0) return JSON.stringify({ error: "לא סופקו מזהים" });

  const result = await safeKnowledgeCall(async () => {
    // See the identical comment in searchKnowledge above.
    const admin = createAdminClient() as unknown as UntypedAdmin;
    const { data, error } = await admin
      .from("knowledge_chunks")
      .select("id,title,note_path,topic,year_sensitive,body,links")
      .in("id", wanted);
    if (error) throw error;
    return data ?? [];
  });

  if (result === null) return KNOWLEDGE_UNAVAILABLE;
  return JSON.stringify(result);
}

/* ──────────────────────────────────────────────────────────────────────────
 * Knowledge-tool availability probe (v2 plan item 2.8, 2026-08-18).
 *
 * The knowledge_chunks table + search_knowledge_chunks RPC (see the
 * migration header cited above) are authored but NOT applied on the live
 * DB, so until now every turn where the model reached for search_knowledge/
 * read_knowledge burned a full extra Sonnet round just to get back
 * KNOWLEDGE_UNAVAILABLE (safeKnowledgeCall catches the failure, but only
 * AFTER the model already spent a round deciding to call the tool). This
 * probe lets EITAN_TOOLS stop ADVERTISING those two tools while the schema
 * is missing, so the model never reaches for them in the first place.
 *
 * One-shot circuit breaker, same spirit as src/lib/chat/history.ts's
 * `unavailable` flag — but cached as a PROMISE (not a plain boolean) so the
 * many concurrent requests that can hit a fresh serverless instance while
 * the first probe is still in flight all await the SAME check instead of
 * each firing their own. Once resolved, the boolean is fixed for the rest
 * of this module instance's life.
 *
 * Fails closed ONLY on a CONFIRMED "not there yet" response — a real
 * Postgrest query error from a reachable Supabase (e.g. 42P01
 * undefined_table, PGRST202/PGRST205 function/table not in schema cache),
 * exactly the documented target scenario (migration authored, not applied,
 * on the live project). Any AMBIGUOUS failure — missing env/credentials
 * (createAdminClient() throws before any network call, e.g. a preview/test
 * environment with no Supabase configured at all), a bare network blip, an
 * unexpected exception — fails OPEN (stays advertised) instead: we haven't
 * actually confirmed the schema is missing, so hiding the tool would be
 * over-eager, and a genuinely broken call still degrades to the honest
 * KNOWLEDGE_UNAVAILABLE message at call time via safeKnowledgeCall. Same
 * "no false negatives" bias as history.ts's *recognized*-error-code check,
 * just inverted here because this probe's failure mode is "hide a tool
 * from the model" rather than "skip an optional read".
 * ────────────────────────────────────────────────────────────────────────── */

let knowledgeAvailablePromise: Promise<boolean> | null = null;

/**
 * Cheap existence check — `select id from knowledge_chunks limit 1` via the
 * admin client — cached as a single in-flight/resolved promise per module
 * instance. Never throws and never rejects; resolves false ONLY on a
 * confirmed query error, true otherwise (including on ambiguous failures —
 * see the header comment above). Call this (don't read the module-level
 * promise directly) so "start the probe" and "read its cached result" stay
 * the same one-liner everywhere.
 */
function probeKnowledgeAvailable(): Promise<boolean> {
  if (!knowledgeAvailablePromise) {
    knowledgeAvailablePromise = (async () => {
      try {
        // Reuses the same UntypedAdmin cast as searchKnowledge/readKnowledge
        // above — see the comment on that interface for why.
        const admin = createAdminClient() as unknown as UntypedAdmin;
        const { error } = await admin.from("knowledge_chunks").select("id").limit(1);
        return !error;
      } catch {
        // Couldn't even attempt the query (no credentials, network down,
        // etc.) — ambiguous, not a confirmed "schema missing". Fail open.
        return true;
      }
    })();
  }
  return knowledgeAvailablePromise;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Client relationship graph tools (RAG audit #20) — over lib/agent/client-
 * graph.ts, pure/local, no DB. Always available (no degradation path needed).
 * ────────────────────────────────────────────────────────────────────────── */

function runClientGraphTool(name: string, input: Record<string, unknown>, persona: Persona): string | null {
  const graph = buildClientGraph(persona);
  switch (name) {
    case "top_customers": {
      const limit = typeof input.limit === "number" ? Math.min(Math.max(1, input.limit), 20) : 5;
      return JSON.stringify(topCustomers(graph, limit));
    }
    case "expense_breakdown_by_category": {
      const year =
        typeof input.year === "number" ? input.year : persona.income.year;
      return JSON.stringify(expenseBreakdownByCategory(graph, year));
    }
    case "open_receivables_by_customer": {
      return JSON.stringify(openReceivablesByCustomer(graph));
    }
    default:
      return null;
  }
}

/** Full catalog of tool definitions, incl. the two knowledge-vault tools —
 *  NOT exported directly; EITAN_TOOLS below is derived from this and kept
 *  in sync with probeKnowledgeAvailable(). */
const ALL_EITAN_TOOL_DEFS: Anthropic.Tool[] = [
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
  {
    name: "search_knowledge",
    description:
      "מחפש במאגר הידע הרגולטורי (הסברים מושגיים, לא מספרים) לפי שאילתה חופשית. מחזיר עד 8 פתקים רלוונטיים {id, title, snippet}. השתמש לפני שאלות עקרוניות/רגולטוריות; קרא ל-read_knowledge כדי לקבל את הגוף המלא לציטוט.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "שאילתת החיפוש (בעברית, חופשית)." },
      },
      required: ["query"],
    },
  },
  {
    name: "read_knowledge",
    description: "מחזיר את הגוף המלא של עד 4 פתקי ידע לפי מזהה (id שהוחזר מ-search_knowledge).",
    input_schema: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
          description: "עד 4 מזהי פתקים.",
        },
      },
      required: ["ids"],
    },
  },
  {
    name: "top_customers",
    description: "מחזיר את הלקוחות עם ההכנסה הגבוהה ביותר (לא כולל מע\"מ, רק מסמכי תשלום), ממוין מהגבוה לנמוך.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "כמה לקוחות להחזיר (ברירת מחדל 5, מקסימום 20)." },
      },
    },
  },
  {
    name: "expense_breakdown_by_category",
    description:
      "מחזיר פילוח הוצאות לפי קטגוריה לשנה נתונה (ברירת מחדל שנת הדוח), כולל השוואה שנה-מול-שנה (YoY) כשיש נתונים לשנה הקודמת.",
    input_schema: {
      type: "object",
      properties: {
        year: { type: "number", description: "שנת המס לפילוח (ברירת מחדל: שנת הדוח של המשתמש/ת)." },
      },
    },
  },
  {
    name: "open_receivables_by_customer",
    description: "מחזיר את חשבונות העסקה הפתוחים (לא שולמו), מקובצים לפי לקוח, כולל סכום פתוח וסכום באיחור.",
    input_schema: { type: "object", properties: {} },
  },
];

/** The two tools probeKnowledgeAvailable() gates — ONLY these two; every
 *  other tool (calculator/deadline/ceiling/client-graph) is pure over
 *  Persona with zero DB and is always advertised. */
const KNOWLEDGE_TOOL_NAMES = new Set(["search_knowledge", "read_knowledge"]);

/**
 * Tool definitions exposed to the model (only meaningful when a persona
 * exists). Starts EXCLUDING search_knowledge/read_knowledge — fail closed —
 * and is mutated IN PLACE (push, never reassigned) to include them once
 * probeKnowledgeAvailable() resolves true, so every holder of this array
 * reference (both route.ts consumers below, every in-flight request's
 * per-round tool list) observes the change without re-importing anything.
 *
 * Exported as a plain array rather than turned into an async getTools():
 * both src/app/api/chat/route.ts and src/app/api/coach/route.ts import
 * EITAN_TOOLS as a static value and read it synchronously inside their
 * per-round `{ tools: EITAN_TOOLS }` spread — converting the export to a
 * function would require editing those two files, which is out of scope
 * for a tools.ts-only change. TRADEOFF this choice makes: any request whose
 * first tool-use round runs before the probe resolves (in practice, only
 * the first request or two right after a cold start — the probe is one
 * cheap query, not a chain) won't see search_knowledge/read_knowledge for
 * that round even if the schema turns out to be available. That's the
 * intended fail-closed default: the cost of a rare, brief under-advertise
 * is far lower than the cost this whole change exists to remove — a wasted
 * model round calling a tool that 404s on every single turn.
 */
export const EITAN_TOOLS: Anthropic.Tool[] = ALL_EITAN_TOOL_DEFS.filter(
  (t) => !KNOWLEDGE_TOOL_NAMES.has(t.name),
);

// Kick off the probe as soon as this module loads (not lazily on the first
// tool call) so it has the best chance of resolving before any request's
// first tool-use round reads EITAN_TOOLS. Fire-and-forget: deliberately
// never awaited at module scope (a top-level await here would block route
// compilation/cold start on a Supabase round-trip for every request, which
// is strictly worse than the problem this change fixes). Errors are
// already swallowed inside probeKnowledgeAvailable, so this .then() only
// ever receives true/false, never rejects.
void probeKnowledgeAvailable().then((available) => {
  if (!available) return;
  EITAN_TOOLS.push(...ALL_EITAN_TOOL_DEFS.filter((t) => KNOWLEDGE_TOOL_NAMES.has(t.name)));
});

/** Run a tool by name against the persona. Always returns a string (never throws). */
export async function runEitanTool(
  name: string,
  input: Record<string, unknown>,
  persona: Persona,
): Promise<string> {
  try {
    const graphResult = runClientGraphTool(name, input, persona);
    if (graphResult !== null) return graphResult;

    switch (name) {
      case "search_knowledge": {
        const query = String(input.query ?? "").trim();
        return await searchKnowledge(query);
      }
      case "read_knowledge": {
        const ids = Array.isArray(input.ids) ? input.ids.map(String) : [];
        return await readKnowledge(ids);
      }
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
