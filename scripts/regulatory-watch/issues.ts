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

export interface IssueRef {
  url: string;
  number: number;
}

export function canOpenIssues(): boolean {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY);
}

/** Build the Hebrew issue body from an item + its classification. */
export function buildIssueBody(item: RegulatoryItem, cls: Classification): string {
  const diffs =
    cls.affectedConstants.length > 0
      ? cls.affectedConstants
          .map(
            (c) =>
              `- \`${c.name}\`: ${JSON.stringify(c.oldValue)} → **${JSON.stringify(c.proposedValue)}**`,
          )
          .join("\n")
      : "_לא זוהו קבועים מושפעים_";

  return [
    `**מקור:** ${item.source}`,
    `**פורסם:** ${item.publishedAt}`,
    `**קישור:** ${item.url}`,
    `**סוג שינוי:** ${cls.changeType}`,
    `**רמת ודאות:** ${cls.confidence}`,
    "",
    "## סיכום",
    cls.summaryHe,
    "",
    "## קבועים מושפעים",
    diffs,
    "",
    "---",
    "_נפתח אוטומטית על ידי countme Regulatory-Watch._",
  ].join("\n");
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
