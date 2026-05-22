/**
 * Registry of official Israeli publication feeds the regulatory-watch agent monitors.
 *
 * Each source supplies a fetcher that returns a normalized list of
 * RawPublication items. Fetchers use the global fetch (Node 18+) and minimal
 * regex parsing — no extra deps.
 *
 * When a feed URL or HTML structure breaks, fix only that fetcher. The
 * registry shape is intentionally narrow so adding a new source is a single
 * entry below.
 */

import type { Issuer } from "@/lib/calculators/types";

export interface RawPublication {
  /** Stable id across runs. Hash of (sourceKey + canonical URL). */
  id: string;
  sourceKey: string;
  issuer: Issuer;
  url: string;
  title: string;
  /** Plain-text excerpt (first ~4KB) — full body is fetched lazily if classify wants more. */
  body: string;
  /** ISO date or undefined when the feed didn't carry one. */
  publishedAt: string | undefined;
}

export interface SourceDescriptor {
  key: string;
  label: string;
  issuer: Issuer;
  /** Returns at most ~50 most recent items. May throw on network errors; the agent isolates failures. */
  fetch(): Promise<RawPublication[]>;
}

const TEXT_LIMIT = 4096;

function stripTags(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

/** Minimal RSS/Atom item parser. Good enough for gov.il's feeds. */
function parseFeed(xml: string, sourceKey: string, issuer: Issuer): RawPublication[] {
  const items: RawPublication[] = [];
  const blocks = [
    ...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi),
  ];
  for (const m of blocks) {
    const block = m[0];
    const title = stripTags((block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim());
    const url = stripTags(
      (block.match(/<link[^>]*?href=["']([^"']+)/i)?.[1] ??
        block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ??
        "").trim(),
    );
    const body = stripTags(
      (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ??
        block.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1] ??
        block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ??
        "").trim(),
    ).slice(0, TEXT_LIMIT);
    const dateRaw =
      block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ??
      block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1] ??
      block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1];
    const publishedAt = dateRaw ? new Date(stripTags(dateRaw)).toISOString() : undefined;
    if (!url || !title) continue;
    items.push({
      id: `${sourceKey}:${hash(url)}`,
      sourceKey,
      issuer,
      url,
      title,
      body,
      publishedAt,
    });
  }
  return items;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent": "countme-regulatory-watch/0.1 (+https://github.com/yonilev2003/countmedemo)",
      accept: "application/rss+xml, application/atom+xml, text/html, */*",
    },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return await res.text();
}

/* ============================================================
 * Concrete sources. URLs are best-known endpoints as of 2026-05;
 * if any feed 404s, fix that one fetcher and leave the rest.
 * ============================================================ */

const TAXES_GOV_IL_NEWS: SourceDescriptor = {
  key: "taxes-gov-il-news",
  label: "רשות המסים — הודעות והנחיות מקצועיות",
  issuer: "taxes.gov.il",
  async fetch() {
    // The Israel Tax Authority publishes news under gov.il; the JSON feed is
    // the most stable interface. If it changes, this fetcher needs an update.
    const url =
      "https://www.gov.il/he/api/News/CategoriesIndex?OfficeId=04498F1A-7770-4B47-9A88-2480C660B816";
    const txt = await fetchText(url);
    try {
      const json = JSON.parse(txt) as {
        Results?: Array<{ Title?: string; Description?: string; Url?: string; PublishDate?: string }>;
      };
      return (json.Results ?? [])
        .filter((r) => r.Url && r.Title)
        .map<RawPublication>((r) => ({
          id: `taxes-gov-il-news:${hash(r.Url!)}`,
          sourceKey: "taxes-gov-il-news",
          issuer: "taxes.gov.il",
          url: r.Url!.startsWith("http") ? r.Url! : `https://www.gov.il${r.Url}`,
          title: stripTags(r.Title!),
          body: stripTags(r.Description ?? "").slice(0, TEXT_LIMIT),
          publishedAt: r.PublishDate ? new Date(r.PublishDate).toISOString() : undefined,
        }));
    } catch {
      // Fall back to feed-style parse if the API shape changed.
      return parseFeed(txt, "taxes-gov-il-news", "taxes.gov.il");
    }
  },
};

const GOV_IL_TAX_RSS: SourceDescriptor = {
  key: "gov-il-tax-rss",
  label: "Gov.il — RSS פרסומים בנושא מסים",
  issuer: "gov.il",
  async fetch() {
    const url = "https://www.gov.il/he/RssFeed/Departments/israel_tax_authority";
    const txt = await fetchText(url);
    return parseFeed(txt, "gov-il-tax-rss", "gov.il");
  },
};

const SHITUF_TAXES: SourceDescriptor = {
  key: "shituf-taxes",
  label: "שיתוף ציבור — התייעצויות רשות המסים",
  issuer: "taxes.gov.il",
  async fetch() {
    const url = "https://shituf.taxes.gov.il/";
    const html = await fetchText(url);
    // Loose extractor: pull links + nearby text. Replace with a real
    // selector if the site exposes structured data later.
    const items: RawPublication[] = [];
    for (const m of html.matchAll(
      /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    )) {
      const href = m[1];
      const title = stripTags(m[2]);
      if (!title || title.length < 8) continue;
      if (!/הצעה|טיוטה|התייעצות|הבהרה/.test(title)) continue;
      const absUrl = href.startsWith("http") ? href : `https://shituf.taxes.gov.il${href}`;
      items.push({
        id: `shituf-taxes:${hash(absUrl)}`,
        sourceKey: "shituf-taxes",
        issuer: "taxes.gov.il",
        url: absUrl,
        title,
        body: "",
        publishedAt: undefined,
      });
    }
    return items.slice(0, 50);
  },
};

const ICPAS: SourceDescriptor = {
  key: "icpas",
  label: "לשכת רואי החשבון בישראל",
  issuer: "icpas",
  async fetch() {
    // ICPAS doesn't expose a stable RSS; we poll the news listing.
    // If this URL stops working, replace it with the current news index.
    const url = "https://www.icpas.org.il/he/Pages/News.aspx";
    const html = await fetchText(url);
    const items: RawPublication[] = [];
    for (const m of html.matchAll(
      /<a[^>]+href=["']([^"']*\/news\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    )) {
      const href = m[1];
      const title = stripTags(m[2]);
      if (!title || title.length < 8) continue;
      const absUrl = href.startsWith("http") ? href : `https://www.icpas.org.il${href}`;
      items.push({
        id: `icpas:${hash(absUrl)}`,
        sourceKey: "icpas",
        issuer: "icpas",
        url: absUrl,
        title,
        body: "",
        publishedAt: undefined,
      });
    }
    return items.slice(0, 50);
  },
};

const KNESSET: SourceDescriptor = {
  key: "knesset-tax-laws",
  label: "כנסת — תיקוני חקיקה (פקודת מס הכנסה, חוק מע\"מ)",
  issuer: "knesset",
  async fetch() {
    // Public RSS of tax-related Knesset legislation. URL is best-known —
    // verify in production. The fetcher fails open: an error here doesn't
    // stop the other sources.
    const url = "https://main.knesset.gov.il/Activity/Legislation/Laws/Pages/LawBill.aspx";
    const html = await fetchText(url);
    const items: RawPublication[] = [];
    for (const m of html.matchAll(
      /<a[^>]+href=["']([^"']+LawBill[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    )) {
      const href = m[1];
      const title = stripTags(m[2]);
      if (!title || !/מס|פקודה|מע"מ|ביטוח לאומי/.test(title)) continue;
      const absUrl = href.startsWith("http") ? href : `https://main.knesset.gov.il${href}`;
      items.push({
        id: `knesset-tax-laws:${hash(absUrl)}`,
        sourceKey: "knesset-tax-laws",
        issuer: "knesset",
        url: absUrl,
        title,
        body: "",
        publishedAt: undefined,
      });
    }
    return items.slice(0, 50);
  },
};

export const SOURCES: SourceDescriptor[] = [
  TAXES_GOV_IL_NEWS,
  GOV_IL_TAX_RSS,
  SHITUF_TAXES,
  ICPAS,
  KNESSET,
];

/** Fetch all sources concurrently. A failing source produces an empty list and a console.warn. */
export async function fetchAllSources(): Promise<RawPublication[]> {
  const results = await Promise.allSettled(SOURCES.map((s) => s.fetch()));
  const all: RawPublication[] = [];
  results.forEach((r, i) => {
    const source = SOURCES[i];
    if (r.status === "fulfilled") {
      all.push(...r.value);
    } else {
      console.warn(`[regulatory-watch] source ${source.key} failed: ${r.reason}`);
    }
  });
  return all;
}
