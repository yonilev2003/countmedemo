#!/usr/bin/env node
/**
 * Daily regulatory-watch agent.
 *
 * Pipeline:
 *   1. Fetch all configured sources in parallel.
 *   2. Drop publications already in .regulatory-watch/seen.json with matching body hash.
 *   3. For each new/changed item, ask Claude to classify it.
 *   4. Open a GitHub Issue per relevant item (via REST API + GITHUB_TOKEN).
 *   5. Persist updated seen.json.
 *
 * Flags:
 *   --dry-run   Don't open issues, don't write seen.json. Print what would happen.
 *   --limit N   Process at most N new items this run (default: 25).
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { fetchAllSources, type RawPublication } from "../../src/lib/regulatory/sources";
import {
  classifyPublication,
  type Classification,
} from "../../src/lib/regulatory/classify";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const SEEN_PATH = join(REPO_ROOT, ".regulatory-watch", "seen.json");

interface SeenRecord {
  firstSeenAt: string;
  bodyHash: string;
  issueNumber?: number;
  classification?: Classification;
}

interface SeenFile {
  $schema?: string;
  publications: Record<string, SeenRecord>;
}

function readSeen(): SeenFile {
  if (!existsSync(SEEN_PATH)) {
    return { publications: {} };
  }
  return JSON.parse(readFileSync(SEEN_PATH, "utf-8")) as SeenFile;
}

function writeSeen(seen: SeenFile): void {
  mkdirSync(dirname(SEEN_PATH), { recursive: true });
  writeFileSync(SEEN_PATH, JSON.stringify(seen, null, 2) + "\n");
}

function bodyHash(pub: RawPublication): string {
  return createHash("sha256")
    .update(pub.title + "\n" + pub.body)
    .digest("hex")
    .slice(0, 16);
}

function currentFilingYear(now = new Date()): number {
  // In May we file for the previous calendar year.
  return now.getUTCFullYear() - 1;
}

interface IssueDraft {
  title: string;
  body: string;
  labels: string[];
}

function renderIssue(
  pub: RawPublication,
  cls: Classification,
  filingYear: number,
): IssueDraft {
  const relevantToCurrentFiling = cls.effectiveTaxYears.includes(filingYear);
  const labels = [
    "regulatory-update",
    `change-type-${cls.changeType}`,
    cls.mechanical ? "mechanical" : "non-mechanical",
    cls.mechanical ? "awaiting-approval" : "needs-design",
    ...cls.effectiveTaxYears.map((y) => `tax-year-${y}`),
  ];

  const diffBlock = cls.mechanical && cls.proposedChanges.length > 0
    ? [
      "### שינוי מוצע",
      "```diff",
      ...cls.proposedChanges.map(
        (p) =>
          `- ${p.constant} (TY${p.taxYear}): ${JSON.stringify(p.from)}\n+ ${p.constant} (TY${p.taxYear}): ${JSON.stringify(p.to)}`,
      ),
      "```",
      "",
      "**הסבר ה-agent:**",
      ...cls.proposedChanges.map((p) => `- \`${p.constant}\`: ${p.reasoning}`),
    ].join("\n")
    : "### שינוי מוצע\n\nאין הצעת diff אוטומטי — שינוי לא מכני. נדרש תכנון ידני.";

  const tachulaBlock = [
    "### תחולה",
    `- שנות מס: ${cls.effectiveTaxYears.length ? cls.effectiveTaxYears.join(", ") : "לא צוין"}`,
    `- שנת ההגשה הנוכחית: **${filingYear}** (הגשות פתוחות בעת ריצת ה-agent)`,
    `- רלוונטיות להגשות הנוכחיות: **${relevantToCurrentFiling ? "כן" : "לא"}**${relevantToCurrentFiling ? "" : " — הערך החדש ייכנס לתוקף בשנת מס עתידית; הקבוע הנוכחי לא ישתנה עד שנגיע לאותה שנת מס."}`,
    cls.sunsetDate ? `- תאריך פג-תוקף (הוראת שעה): **${cls.sunsetDate}**` : "",
    `- חל על: ${cls.applicability.join(", ") || "לא צוין"}`,
  ].filter(Boolean).join("\n");

  const edgeCasesBlock = cls.edgeCases.length
    ? ["### מקרי קצה לבדיקה", ...cls.edgeCases.map((e) => `- ${e}`)].join("\n")
    : "";

  const body = [
    `**מקור:** [${pub.title}](${pub.url})  `,
    `**מנפיק:** ${pub.issuer}  `,
    `**פורסם:** ${pub.publishedAt ?? "לא ידוע"}  `,
    `**סוג שינוי:** ${cls.changeType}  `,
    `**ביטחון ה-agent:** ${cls.confidence}`,
    "",
    "### סיכום",
    cls.summaryHe,
    "",
    tachulaBlock,
    "",
    diffBlock,
    "",
    cls.affectedConstants.length
      ? `### קבועים מושפעים\n${cls.affectedConstants.map((c) => `- \`${c}\``).join("\n")}`
      : "",
    "",
    edgeCasesBlock,
    "",
    "### סיכון אם נתעלם",
    cls.riskIfIgnored || "לא צוין",
    "",
    "---",
    cls.mechanical
      ? "📌 לאישור אוטומטי: הוסיפו label `approved` → ייפתח PR אוטומטית עם השינוי המוצע, יורצו טסטים ובדיקת מקרי קצה."
      : "📌 שינוי לא מכני — סקור את ההצעה ופתח PR ידנית אם נדרש.",
    "",
    "<details><summary>Agent metadata (machine-readable)</summary>",
    "",
    "```json",
    JSON.stringify(
      {
        publicationId: pub.id,
        proposedChanges: cls.proposedChanges,
        effectiveTaxYears: cls.effectiveTaxYears,
        sunsetDate: cls.sunsetDate,
      },
      null,
      2,
    ),
    "```",
    "",
    "</details>",
  ].join("\n");

  return {
    title: `[regulatory] ${pub.title.slice(0, 120)}`,
    body,
    labels,
  };
}

async function openIssue(draft: IssueDraft): Promise<number> {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN must be set to open issues.");
  }
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
    },
    body: JSON.stringify(draft),
  });
  if (!res.ok) {
    throw new Error(`GitHub Issue creation failed: ${res.status} ${await res.text()}`);
  }
  const issue = (await res.json()) as { number: number };
  return issue.number;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 25;

  console.log(`[regulatory-watch] dryRun=${dryRun} limit=${limit}`);

  const seen = readSeen();
  const publications = await fetchAllSources();
  console.log(`[regulatory-watch] fetched ${publications.length} raw publications`);

  const filingYear = currentFilingYear();

  const candidates: RawPublication[] = [];
  for (const pub of publications) {
    const h = bodyHash(pub);
    const prior = seen.publications[pub.id];
    if (!prior || prior.bodyHash !== h) {
      candidates.push(pub);
    }
  }
  console.log(`[regulatory-watch] ${candidates.length} new or changed items`);

  let processed = 0;
  for (const pub of candidates) {
    if (processed >= limit) {
      console.log(`[regulatory-watch] limit reached, stopping`);
      break;
    }
    processed++;

    let classification: Classification;
    try {
      classification = await classifyPublication(pub, filingYear);
    } catch (e) {
      console.warn(`[regulatory-watch] classify failed for ${pub.id}: ${e}`);
      continue;
    }

    const h = bodyHash(pub);

    if (!classification.relevant) {
      console.log(`[regulatory-watch] skip irrelevant: ${pub.title}`);
      if (!dryRun) {
        seen.publications[pub.id] = {
          firstSeenAt: seen.publications[pub.id]?.firstSeenAt ?? new Date().toISOString(),
          bodyHash: h,
          classification,
        };
      }
      continue;
    }

    const draft = renderIssue(pub, classification, filingYear);
    console.log(`[regulatory-watch] would open: ${draft.title}`);
    if (dryRun) {
      console.log(draft.body);
      console.log("---");
      continue;
    }

    try {
      const issueNumber = await openIssue(draft);
      console.log(`[regulatory-watch] opened #${issueNumber}: ${draft.title}`);
      seen.publications[pub.id] = {
        firstSeenAt: seen.publications[pub.id]?.firstSeenAt ?? new Date().toISOString(),
        bodyHash: h,
        issueNumber,
        classification,
      };
    } catch (e) {
      console.error(`[regulatory-watch] open issue failed for ${pub.id}: ${e}`);
    }
  }

  if (!dryRun) writeSeen(seen);
  console.log(`[regulatory-watch] done, processed ${processed} candidates`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
