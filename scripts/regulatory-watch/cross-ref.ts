/**
 * Regulatory-Watch — cross-reference stage.
 *
 * Sits between fetch and classify: decides, per discovered item, whether the
 * claim is CORROBORATED before we spend attention (and issue noise) on it.
 * An item counts as corroborated when either:
 *   (a) it comes from a PRIMARY source — the Israel Tax Authority publication
 *       API ("taxes-gov") or the official gov.il announcements RSS
 *       ("gov-il-rss"); these ARE the regulator speaking, or
 *   (b) ≥2 DISTINCT sources carry items whose titles match under normalized
 *       Hebrew token overlap (Jaccard similarity — no dependencies, no model).
 * Everything else is still reported, but tagged "single-source" and demoted in
 * issue-creation priority.
 *
 * Every item also gets an explicit provenance record (source id + label +
 * publish date + fetch date) so every downstream claim — issue body, summary
 * JSON, PDF report — carries "who said it and when we saw it".
 *
 * Pure computation: no I/O, never throws (per-item work is guarded so one
 * malformed title can't kill the run — matching the never-throw fetch layer).
 */

import { SOURCES } from "../../src/lib/regulatory/sources.ts";
import type { RegSourceId, RegulatoryItem } from "../../src/lib/regulatory/types.ts";

// --------------------------------------------------------------------------
// Contracts
// --------------------------------------------------------------------------

export type CorroborationKind = "primary-source" | "multi-source" | "single-source";

/** Another source's item that corroborates this one. */
export interface CorroborationMatch {
  source: RegSourceId;
  title: string;
  url: string;
  publishedAt: string;
  /** Jaccard similarity of the normalized title tokens, 0..1. */
  similarity: number;
}

/** Who produced the item and when this run saw it — attached to every claim. */
export interface Provenance {
  source: RegSourceId;
  sourceLabel: string;
  publishedAt: string;
  fetchedAt: string;
}

export interface CrossRef {
  corroborated: boolean;
  kind: CorroborationKind;
  /** Items from OTHER sources that matched (empty for primary-source items with no echo). */
  matches: CorroborationMatch[];
  provenance: Provenance;
}

// --------------------------------------------------------------------------
// Config
// --------------------------------------------------------------------------

/**
 * Sources whose word we take on its own: the Tax Authority's own publication
 * feed and the official gov.il announcements RSS. Ids must match
 * `SOURCES[].id` in src/lib/regulatory/sources.ts.
 */
export const PRIMARY_SOURCES: ReadonlySet<RegSourceId> = new Set<RegSourceId>([
  "taxes-gov",
  "gov-il-rss",
]);

/** Jaccard threshold + minimum shared tokens for a cross-source match. */
const SIMILARITY_THRESHOLD = 0.4;
const MIN_SHARED_TOKENS = 2;

/** Hebrew function words that carry no matching signal. */
const HEBREW_STOPWORDS = new Set([
  "של", "על", "את", "עם", "גם", "לא", "או", "אם", "כי", "כל", "זה", "זו",
  "הוא", "היא", "בין", "עד", "מן", "אל", "לפי", "כמו", "אבל", "רק", "יותר",
  "אין", "יש", "לגבי", "בנושא", "בדבר", "הודעה", "הודעת", "עדכון", "פרסום",
  "חדש", "חדשה", "the", "and", "for", "of", "in", "to",
]);

// --------------------------------------------------------------------------
// Normalization + similarity
// --------------------------------------------------------------------------

/** Fold Hebrew final letters so ך/כ, ם/מ … compare equal. */
function foldFinals(s: string): string {
  return s
    .replace(/ך/g, "כ")
    .replace(/ם/g, "מ")
    .replace(/ן/g, "נ")
    .replace(/ף/g, "פ")
    .replace(/ץ/g, "צ");
}

/** Stopwords in the same folded form the tokens end up in. */
const FOLDED_STOPWORDS = new Set([...HEBREW_STOPWORDS].map(foldFinals));

/**
 * Normalize a Hebrew title into a comparable token set: strip niqqud +
 * punctuation, fold final letters, drop stopwords and 1-char tokens. Prefix
 * particles (ה/ו/ב/ל/מ/ש/כ) are NOT stripped here — stripping mangles words
 * that merely start with those letters ("מוכרת" → "וכרת"); instead the
 * similarity below matches tokens prefix-tolerantly.
 */
export function normalizeTokens(text: string): Set<string> {
  const cleaned = foldFinals(
    text
      .toLowerCase()
      .replace(/[֑-ׇ]/g, "") // niqqud / cantillation
      .replace(/[״׳"'`().,:;!?\-–—_/\\[\]{}|<>«»%]+/g, " "),
  );

  const tokens = new Set<string>();
  for (const raw of cleaned.split(/\s+/)) {
    if (raw.length < 2 || FOLDED_STOPWORDS.has(raw)) continue;
    tokens.add(raw);
  }
  return tokens;
}

/** Single-letter particles that prefix Hebrew words (ה הידיעה, ו, בכל"מ, ש). */
const PREFIX_PARTICLES = ["ה", "ו", "ב", "ל", "מ", "ש", "כ"];

/** Does `b` contain `t`, or `t` ± one leading prefix particle? */
function hasPrefixTolerant(b: Set<string>, t: string): boolean {
  if (b.has(t)) return true;
  // "ההפקדה" matches "הפקדה" (t minus its own leading particle)…
  if (t.length >= 3 && PREFIX_PARTICLES.includes(t[0]) && b.has(t.slice(1))) return true;
  // …and "הפקדה" matches "ההפקדה" (b carries the particle instead).
  for (const p of PREFIX_PARTICLES) if (b.has(p + t)) return true;
  return false;
}

/**
 * Jaccard similarity of two token sets (prefix-tolerant intersection), plus
 * the shared-token count.
 */
export function tokenSimilarity(
  a: Set<string>,
  b: Set<string>,
): { jaccard: number; shared: number } {
  if (a.size === 0 || b.size === 0) return { jaccard: 0, shared: 0 };
  let shared = 0;
  for (const t of a) if (hasPrefixTolerant(b, t)) shared++;
  const union = a.size + b.size - shared;
  return { jaccard: union === 0 ? 0 : shared / union, shared };
}

// --------------------------------------------------------------------------
// Cross-reference
// --------------------------------------------------------------------------

const SOURCE_LABELS: ReadonlyMap<RegSourceId, string> = new Map(
  SOURCES.map((s) => [s.id, s.label]),
);

export function sourceLabel(id: RegSourceId): string {
  return SOURCE_LABELS.get(id) ?? id;
}

/** Tokens for matching: the title, padded with the summary when the title is thin. */
function matchTokens(item: RegulatoryItem): Set<string> {
  const tokens = normalizeTokens(item.title);
  if (tokens.size < 3 && item.summary) {
    for (const t of normalizeTokens(item.summary)) tokens.add(t);
  }
  return tokens;
}

/**
 * Cross-reference every item in a run against every other item. O(n²) over a
 * few hundred items per day — negligible. Returns a map keyed by item id.
 */
export function crossReference(
  items: RegulatoryItem[],
  fetchedAt: string,
): Map<string, CrossRef> {
  const tokenSets: Set<string>[] = items.map((it) => {
    try {
      return matchTokens(it);
    } catch {
      return new Set<string>();
    }
  });

  const out = new Map<string, CrossRef>();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const matches: CorroborationMatch[] = [];
    for (let j = 0; j < items.length; j++) {
      if (i === j || items[j].source === item.source) continue;
      const { jaccard, shared } = tokenSimilarity(tokenSets[i], tokenSets[j]);
      if (jaccard >= SIMILARITY_THRESHOLD && shared >= MIN_SHARED_TOKENS) {
        matches.push({
          source: items[j].source,
          title: items[j].title,
          url: items[j].url,
          publishedAt: items[j].publishedAt,
          similarity: Math.round(jaccard * 100) / 100,
        });
      }
    }
    matches.sort((a, b) => b.similarity - a.similarity);

    const isPrimary = PRIMARY_SOURCES.has(item.source);
    const kind: CorroborationKind = isPrimary
      ? "primary-source"
      : matches.length > 0
        ? "multi-source"
        : "single-source";

    out.set(item.id, {
      corroborated: kind !== "single-source",
      kind,
      matches,
      provenance: {
        source: item.source,
        sourceLabel: sourceLabel(item.source),
        publishedAt: item.publishedAt,
        fetchedAt,
      },
    });
  }
  return out;
}

/** Issue-creation ordering: regulator's own word first, echoes next, rumors last. */
const KIND_PRIORITY: Record<CorroborationKind, number> = {
  "primary-source": 0,
  "multi-source": 1,
  "single-source": 2,
};

export function corroborationPriority(kind: CorroborationKind): number {
  return KIND_PRIORITY[kind];
}

/** Hebrew label for reports / issue bodies. */
export function corroborationLabelHe(kind: CorroborationKind): string {
  switch (kind) {
    case "primary-source":
      return "מאומת — מקור ראשוני (הרגולטור עצמו)";
    case "multi-source":
      return "מאומת — הצלבה בין מקורות";
    case "single-source":
      return "מקור יחיד — טרם אומת (עדיפות נמוכה)";
  }
}

// --------------------------------------------------------------------------
// CLI self-test (import smoke): node --experimental-strip-types cross-ref.ts
// --------------------------------------------------------------------------

if (process.argv[1] && process.argv[1].endsWith("cross-ref.ts")) {
  const now = new Date().toISOString();
  const fixture: RegulatoryItem[] = [
    {
      id: "icpas:aaaa",
      title: "עדכון תקרת ההפקדה לקרן השתלמות לעצמאים לשנת 2026",
      url: "https://www.icpas.org.il/x",
      source: "icpas",
      publishedAt: now,
    },
    {
      id: "taxes-gov:bbbb",
      title: "רשות המסים: תקרת הפקדה מוכרת לקרן השתלמות לעצמאי — 2026",
      url: "https://www.gov.il/y",
      source: "taxes-gov",
      publishedAt: now,
    },
    {
      id: "knesset:cccc",
      title: "הצעת חוק שירותי תיירות (תיקון)",
      url: "https://main.knesset.gov.il/z",
      source: "knesset",
      publishedAt: now,
    },
  ];
  const refs = crossReference(fixture, now);
  for (const item of fixture) {
    const ref = refs.get(item.id)!;
    console.log(
      `${item.id} → ${ref.kind} (matches: ${ref.matches.map((m) => `${m.source}@${m.similarity}`).join(", ") || "none"})`,
    );
  }
  const icpas = refs.get("icpas:aaaa")!;
  const knesset = refs.get("knesset:cccc")!;
  const ok =
    icpas.kind === "multi-source" &&
    knesset.kind === "single-source" &&
    refs.get("taxes-gov:bbbb")!.kind === "primary-source";
  console.log(ok ? "✓ cross-ref self-test passed" : "✗ cross-ref self-test FAILED");
  process.exitCode = ok ? 0 : 1;
}
