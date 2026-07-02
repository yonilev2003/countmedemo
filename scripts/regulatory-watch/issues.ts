/**
 * Regulatory-Watch — GitHub issue opener.
 *
 * Opens a structured issue for each relevant finding via the GitHub REST API.
 * Uses GITHUB_TOKEN (auto-provided to GitHub Actions) and GITHUB_REPOSITORY
 * ("owner/repo", also auto-set in Actions). When no token is available — e.g. a
 * local dry run — `canOpenIssues()` returns false and the orchestrator skips
 * the network call instead of failing.
 */

import type { Classification, RegulatoryItem } from "../../src/lib/regulatory/types.ts";
import { corroborationLabelHe, type CrossRef } from "./cross-ref.ts";

/** Optional enrichments appended to the base issue body. */
export interface IssueExtras {
  /** Cross-reference verdict + provenance (WS5 stage 1). */
  crossRef?: CrossRef;
  /** Pre-rendered markdown patch-proposal section (WS5 stage 2). */
  patchSection?: string;
}

export interface IssueRef {
  url: string;
  number: number;
}

export function canOpenIssues(): boolean {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY);
}

const GH_HEADERS = () => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
  "User-Agent": "countme-regulatory-watch",
});

/**
 * Make sure a label exists before we attach it to issues. Creating an issue
 * with an unknown label can drop the label (or fail), so we create it once,
 * up front, idempotently — tolerating the "already_exists" 422.
 */
export async function ensureLabel(
  name: string,
  color = "fbca04",
  description = "נפתח אוטומטית על ידי countme Regulatory-Watch",
): Promise<void> {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!process.env.GITHUB_TOKEN || !repo) return;
  try {
    const existing = await fetch(
      `https://api.github.com/repos/${repo}/labels/${encodeURIComponent(name)}`,
      { headers: GH_HEADERS() },
    );
    if (existing.ok) return;
    const res = await fetch(`https://api.github.com/repos/${repo}/labels`, {
      method: "POST",
      headers: GH_HEADERS(),
      body: JSON.stringify({ name, color, description }),
    });
    if (!res.ok && res.status !== 422) {
      console.warn(`[regulatory-watch] could not create label "${name}" (${res.status})`);
    }
  } catch (err) {
    console.warn(`[regulatory-watch] ensureLabel failed:`, (err as Error).message);
  }
}

/** Build the Hebrew issue body from an item + its classification (+ WS5 extras). */
export function buildIssueBody(
  item: RegulatoryItem,
  cls: Classification,
  extras?: IssueExtras,
): string {
  const diffs =
    cls.affectedConstants.length > 0
      ? cls.affectedConstants
          .map(
            (c) =>
              `- \`${c.name}\`: ${JSON.stringify(c.oldValue)} → **${JSON.stringify(c.proposedValue)}**`,
          )
          .join("\n")
      : "_לא זוהו קבועים מושפעים_";

  const xref = extras?.crossRef;
  const header = [
    `**מקור:** ${xref?.provenance.sourceLabel ?? item.source} (\`${item.source}\`)`,
    `**פורסם:** ${item.publishedAt}`,
    ...(xref ? [`**נשלף:** ${xref.provenance.fetchedAt}`] : []),
    `**קישור:** ${item.url}`,
    `**סוג שינוי:** ${cls.changeType}`,
    `**רמת ודאות:** ${cls.confidence}`,
  ];

  const body = [
    ...header,
    "",
    "## סיכום",
    cls.summaryHe,
    "",
    "## קבועים מושפעים",
    diffs,
  ];

  if (xref) {
    body.push("", "## אימות צולב", `**סטטוס:** ${corroborationLabelHe(xref.kind)}`);
    if (xref.matches.length > 0) {
      body.push(
        "",
        "פרסומים מקבילים במקורות אחרים:",
        ...xref.matches.map(
          (m) =>
            `- ${m.source}: [${m.title}](${m.url}) — פורסם ${m.publishedAt} (דמיון ${m.similarity})`,
        ),
      );
    } else if (xref.kind === "single-source") {
      body.push(
        "",
        "_אף מקור נוסף לא דיווח על כך בריצה זו — לטפל בזהירות עד לאימות._",
      );
    }
  }

  if (extras?.patchSection) {
    body.push("", extras.patchSection);
  }

  body.push("", "---", "_נפתח אוטומטית על ידי countme Regulatory-Watch._");
  return body.join("\n");
}

export async function openIssue(opts: {
  title: string;
  body: string;
  labels?: string[];
}): Promise<IssueRef> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) {
    throw new Error("GITHUB_TOKEN and GITHUB_REPOSITORY are required to open issues");
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "countme-regulatory-watch",
    },
    body: JSON.stringify({
      title: opts.title,
      body: opts.body,
      labels: opts.labels ?? ["regulatory-watch"],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GitHub issue creation failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as { html_url: string; number: number };
  return { url: json.html_url, number: json.number };
}
