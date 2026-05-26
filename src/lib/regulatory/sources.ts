/**
 * Regulatory-Watch — source fetchers.
 *
 * Five real sources that the daily watcher polls for Israeli tax / accounting
 * regulatory changes. Each fetcher conforms to `RegSource` (see ./types.ts) and
 * is defensively written so it NEVER throws — on any failure (network, non-200,
 * parse error) it returns `[]` so the daily run survives a dead source.
 *
 * This module is run directly by Node 22 (native TS type-stripping), so imports
 * are RELATIVE with explicit `.ts` extensions, not the `@/` path alias (which
 * does not resolve under plain Node at runtime).
 *
 * Endpoint overrides (each falls back to a real default URL):
 *   REGWATCH_SRC_TAXES_GOV    — Israel Tax Authority updates (gov.il)
 *   REGWATCH_SRC_GOV_IL_RSS   — gov.il news RSS/Atom feed
 *   REGWATCH_SRC_SHITUF       — gov.il public-participation / draft legislation
 *   REGWATCH_SRC_ICPAS        — Institute of CPAs in Israel news (HTML scrape)
 *   REGWATCH_SRC_KNESSET      — Knesset open-data bills (OData/JSON feed)
 *
 * Tunables:
 *   REGWATCH_TIMEOUT_MS       — per-fetch abort timeout (default 10000)
 *   REGWATCH_USER_AGENT       — outbound User-Agent header
 */

import { createHash } from "node:crypto";
import type { RegSource, RegulatoryItem, RegSourceId } from "./types.ts";

// --------------------------------------------------------------------------
// Config
// --------------------------------------------------------------------------

const TIMEOUT_MS = (() => {
  const raw = Number(process.env.REGWATCH_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 10_000;
})();

const USER_AGENT =
  process.env.REGWATCH_USER_AGENT ??
  "countme-RegulatoryWatch/1.0 (+https://countme.co.il)";

const DEFAULT_URLS: Record<RegSourceId, string> = {
  "taxes-gov":
    "https://www.gov.il/he/api/PublicationApi/Index?OfficeId=104cb0f4-d65a-4692-b590-94af928c19c0&limit=25",
  "gov-il-rss": "https://www.gov.il/he/api/news/rss",
  shituf: "https://www.gov.il/he/api/DynamicCollectorApi/Query/shituf",
  icpas: "https://www.icpas.org.il/news/",
  knesset:
    "https://main.knesset.gov.il/Activity/Legislation/Laws/Pages/LawBill.aspx",
};

function urlFor(id: RegSourceId): string {
  switch (id) {
    case "taxes-gov":
      return process.env.REGWATCH_SRC_TAXES_GOV ?? DEFAULT_URLS["taxes-gov"];
    case "gov-il-rss":
      return process.env.REGWATCH_SRC_GOV_IL_RSS ?? DEFAULT_URLS["gov-il-rss"];
    case "shituf":
      return process.env.REGWATCH_SRC_SHITUF ?? DEFAULT_URLS.shituf;
    case "icpas":
      return process.env.REGWATCH_SRC_ICPAS ?? DEFAULT_URLS.icpas;
    case "knesset":
      return process.env.REGWATCH_SRC_KNESSET ?? DEFAULT_URLS.knesset;
  }
}

// --------------------------------------------------------------------------
// Generic helpers
// --------------------------------------------------------------------------

/** sha1 hex, sliced to 16 chars — used for stable dedup ids. */
function sha1(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 16);
}

/** Stable dedup key: `${source}:${sha1(url || title)}`. */
function makeId(source: RegSourceId, url: string, title: string): string {
  return `${source}:${sha1(url || title)}`;
}

/**
 * Fetch with an AbortController timeout and a User-Agent header.
 * Returns the response text, or `null` on any failure / non-200.
 */
async function fetchText(
  url: string,
  accept = "application/xml, text/xml, text/html, application/json;q=0.9, */*;q=0.8",
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: accept,
        "Accept-Language": "he,en;q=0.8",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Strip HTML/XML tags + collapse whitespace, decode common entities, trim to max chars. */
function cleanText(raw: string | undefined, max = 500): string | undefined {
  if (!raw) return undefined;
  const text = decodeEntities(raw.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Decode the handful of XML/HTML entities feeds actually emit. */
function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_m, d: string) => safeFromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h: string) =>
      safeFromCodePoint(parseInt(h, 16)),
    )
    .replace(/&amp;/g, "&"); // last, so we don't double-decode
}

function safeFromCodePoint(cp: number): string {
  try {
    if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return "";
    return String.fromCodePoint(cp);
  } catch {
    return "";
  }
}

/** Best-effort date parse → ISO string; falls back to now. */
function toIso(raw: string | undefined): string {
  if (raw) {
    const trimmed = raw.trim();
    const ms = Date.parse(trimmed);
    if (!Number.isNaN(ms)) return new Date(ms).toISOString();
    // Handle dd/mm/yyyy (common on gov.il / icpas) which Date.parse misreads.
    const dmy = trimmed.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
    if (dmy) {
      const [, d, m, y] = dmy;
      const dt = new Date(Number(y), Number(m) - 1, Number(d));
      if (!Number.isNaN(dt.getTime())) return dt.toISOString();
    }
  }
  return new Date().toISOString();
}

/** Resolve a possibly-relative href against a base URL; returns input on failure. */
function absolutize(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

// --------------------------------------------------------------------------
// XML (RSS + Atom) parsing — tolerant, regex-based, no dependencies
// --------------------------------------------------------------------------

/** Pull every `<tag>…</tag>` block (handles attributes on the open tag). */
function extractBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

/** Inner text of the first `<tag>…</tag>` in a block, decoded + trimmed. */
function tagText(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(block);
  if (!m) return undefined;
  const v = decodeEntities(m[1]).trim();
  return v || undefined;
}

/**
 * Extract a link from an RSS or Atom entry.
 *  - RSS: `<link>URL</link>` (text node)
 *  - Atom: `<link href="URL" rel="alternate"/>` (attribute, prefer rel=alternate)
 */
function extractLink(block: string): string | undefined {
  // Atom self-closing / attribute form.
  const links = block.match(/<link\b[^>]*>/gi) ?? [];
  let fallback: string | undefined;
  for (const tag of links) {
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href) continue;
    const rel = /rel\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    if (!rel || rel === "alternate") return decodeEntities(href).trim();
    fallback ??= decodeEntities(href).trim();
  }
  // RSS text-node form.
  const textLink = tagText(block, "link");
  if (textLink && /^https?:\/\//i.test(textLink)) return textLink;
  return fallback ?? textLink;
}

/**
 * Parse an RSS/Atom feed into RegulatoryItems. Handles both `<item>` (RSS) and
 * `<entry>` (Atom) shapes, with date fields pubDate / published / updated / dc:date.
 */
function parseFeed(
  xml: string,
  source: RegSourceId,
  base: string,
): RegulatoryItem[] {
  const blocks = [...extractBlocks(xml, "item"), ...extractBlocks(xml, "entry")];
  const items: RegulatoryItem[] = [];
  for (const block of blocks) {
    const title = tagText(block, "title");
    const rawLink = extractLink(block);
    if (!title && !rawLink) continue;
    const url = rawLink ? absolutize(rawLink, base) : base;
    const dateRaw =
      tagText(block, "pubDate") ??
      tagText(block, "published") ??
      tagText(block, "updated") ??
      tagText(block, "dc:date") ??
      tagText(block, "date");
    const summaryRaw =
      tagText(block, "description") ??
      tagText(block, "summary") ??
      tagText(block, "content");
    items.push({
      id: makeId(source, url, title ?? ""),
      title: cleanText(title, 300) ?? "(ללא כותרת)",
      url,
      source,
      publishedAt: toIso(dateRaw),
      summary: cleanText(summaryRaw),
    });
  }
  return items;
}

// --------------------------------------------------------------------------
// HTML anchor scraping — tolerant, regex-based
// --------------------------------------------------------------------------

/**
 * Extract `<a href>` anchors with non-trivial text from an HTML page.
 * Best-effort: filters out empty/navigation/anchor-only links.
 */
function parseAnchors(
  html: string,
  source: RegSourceId,
  base: string,
  limit = 40,
): RegulatoryItem[] {
  const re = /<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const items: RegulatoryItem[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && items.length < limit) {
    const rawHref = m[1].trim();
    const title = cleanText(m[2], 300);
    if (!title || title.length < 6) continue;
    if (/^(#|javascript:|mailto:|tel:)/i.test(rawHref)) continue;
    const url = absolutize(rawHref, base);
    if (seen.has(url)) continue;
    seen.add(url);
    items.push({
      id: makeId(source, url, title),
      title,
      url,
      source,
      publishedAt: new Date().toISOString(),
    });
  }
  return items;
}

// --------------------------------------------------------------------------
// JSON parsing — tolerant, schema-agnostic
// --------------------------------------------------------------------------

type JsonRecord = Record<string, unknown>;

/** Walk a parsed JSON blob and return the first array of objects we find. */
function findRecordArray(value: unknown, depth = 0): JsonRecord[] | null {
  if (depth > 6 || value == null) return null;
  if (Array.isArray(value)) {
    const objs = value.filter(
      (v): v is JsonRecord => typeof v === "object" && v !== null && !Array.isArray(v),
    );
    if (objs.length) return objs;
    return null;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as JsonRecord)) {
      const found = findRecordArray(v, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/** First defined string-ish field among candidate keys (case-insensitive). */
function pick(rec: JsonRecord, keys: string[]): string | undefined {
  const lowerMap = new Map<string, unknown>();
  for (const [k, v] of Object.entries(rec)) lowerMap.set(k.toLowerCase(), v);
  for (const key of keys) {
    const v = lowerMap.get(key.toLowerCase());
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

/** Parse a JSON/OData payload into RegulatoryItems with heuristic field mapping. */
function parseJsonRecords(
  text: string,
  source: RegSourceId,
  base: string,
): RegulatoryItem[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const records = findRecordArray(data);
  if (!records) return [];
  const items: RegulatoryItem[] = [];
  for (const rec of records) {
    const title = pick(rec, [
      "Name",
      "BillName",
      "Title",
      "title",
      "SubName",
      "Description",
      "Subject",
    ]);
    let url = pick(rec, ["Url", "url", "Link", "link", "PageUrl", "Href"]);
    const idField = pick(rec, ["BillID", "Id", "ID", "id", "Key", "PublicationId"]);
    if (!url) {
      url = idField ? absolutize(`?id=${encodeURIComponent(idField)}`, base) : base;
    } else {
      url = absolutize(url, base);
    }
    if (!title && !idField) continue;
    const dateRaw = pick(rec, [
      "LastUpdatedDate",
      "PublishDate",
      "Date",
      "date",
      "StatusDate",
      "CreatedDate",
      "UpdateDate",
    ]);
    const summaryRaw = pick(rec, ["Summary", "Description", "Abstract", "Content"]);
    items.push({
      id: makeId(source, url, title ?? idField ?? ""),
      title: cleanText(title, 300) ?? title ?? `(${source} #${idField ?? ""})`,
      url,
      source,
      publishedAt: toIso(dateRaw),
      summary: cleanText(summaryRaw),
    });
  }
  return items;
}

// --------------------------------------------------------------------------
// Content-type dispatch — try the right parser, fall back across shapes
// --------------------------------------------------------------------------

/** Decide parser by sniffing the payload (XML vs JSON vs HTML) and source intent. */
function parsePayload(
  text: string,
  source: RegSourceId,
  base: string,
  hint: "feed" | "html" | "json",
): RegulatoryItem[] {
  const trimmed = text.trimStart();
  const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  const looksXml = /^<\?xml|<rss\b|<feed\b|<item\b|<entry\b/i.test(trimmed);

  if (looksJson) {
    const items = parseJsonRecords(text, source, base);
    if (items.length) return items;
  }
  if (looksXml || hint === "feed") {
    const items = parseFeed(text, source, base);
    if (items.length) return items;
  }
  if (hint === "json") {
    const items = parseJsonRecords(text, source, base);
    if (items.length) return items;
  }
  // Fall back to anchor scraping for HTML pages (or anything else).
  return parseAnchors(text, source, base);
}

// --------------------------------------------------------------------------
// Sources
// --------------------------------------------------------------------------

function makeSource(
  id: RegSourceId,
  label: string,
  hint: "feed" | "html" | "json",
): RegSource {
  return {
    id,
    label,
    async fetch(): Promise<RegulatoryItem[]> {
      try {
        const url = urlFor(id);
        const text = await fetchText(url);
        if (!text) return [];
        return parsePayload(text, id, url, hint);
      } catch {
        return [];
      }
    },
  };
}

export const SOURCES: RegSource[] = [
  makeSource("taxes-gov", "רשות המסים בישראל — עדכונים", "json"),
  makeSource("gov-il-rss", "gov.il — הודעות (RSS)", "feed"),
  makeSource("shituf", "שיתוף ציבור / תזכירי חוק — gov.il", "json"),
  makeSource("icpas", "לשכת רואי חשבון בישראל — חדשות", "html"),
  makeSource("knesset", "הכנסת — הצעות חוק (נתונים פתוחים)", "json"),
];

/**
 * Run every source in parallel. Never rejects: each source already swallows its
 * own errors and returns [], and we additionally guard with Promise.allSettled
 * semantics via the per-source try/catch above.
 */
export async function fetchAllSources(): Promise<RegulatoryItem[]> {
  const results = await Promise.all(SOURCES.map((s) => s.fetch()));
  return results.flat();
}
