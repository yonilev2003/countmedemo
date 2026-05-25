/**
 * Renders a run of the regulatory-watch agent into a print-ready Hebrew HTML
 * report. The GitHub Actions workflow converts the HTML to PDF via Puppeteer
 * and uploads both as an artifact, so this file only owns the HTML.
 *
 * Kept dependency-free (no React, no template engine) — it's a build-time
 * script, not part of the Next.js bundle.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const REPORTS_DIR = join(REPO_ROOT, ".regulatory-watch", "reports");

export interface ReportFindingChange {
  name: string;
  from: unknown;
  to: unknown;
}

export interface ReportFinding {
  title: string;
  sourceUrl: string;
  issuer: string;
  publishedAt: string;
  summaryHe: string;
  changeType: string;
  confidence: "high" | "medium" | "low";
  affectedConstants: ReportFindingChange[];
  relevantToCurrentFiling: boolean;
  issueNumber?: number;
  issueUrl?: string;
}

export interface ReportSkipped {
  title: string;
  issuer: string;
  reason: string;
}

export interface RunSummary {
  runDate: string; // ISO timestamp
  filingYear: number;
  dryRun: boolean;
  sourcesScanned: number;
  rawPublications: number;
  newPublications: number;
  relevantFindings: ReportFinding[];
  irrelevantPublications: ReportSkipped[];
}

const CONFIDENCE_LABEL: Record<ReportFinding["confidence"], string> = {
  high: "גבוה",
  medium: "בינוני",
  low: "נמוך",
};

const CHANGE_TYPE_LABEL: Record<string, string> = {
  legislation: "חקיקה",
  temporary_order: "הוראת שעה",
  clarification: "הבהרה",
  guidance: "הנחיה",
  technical: "טכני",
  irrelevant: "לא רלוונטי",
};

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtValue(v: unknown): string {
  if (typeof v === "number") return v.toLocaleString("he-IL");
  if (typeof v === "string") return v;
  if (v === null || v === undefined) return "—";
  return JSON.stringify(v);
}

function fmtDate(iso: string): string {
  if (!iso) return "לא ידוע";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function findingCard(f: ReportFinding): string {
  const changesRows = f.affectedConstants.length
    ? f.affectedConstants
        .map(
          (c) => `
        <tr>
          <td class="mono">${esc(c.name)}</td>
          <td class="old">${esc(fmtValue(c.from))}</td>
          <td class="arrow">←</td>
          <td class="new">${esc(fmtValue(c.to))}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="muted">אין הצעת diff מכני — נדרש תכנון ידני</td></tr>`;

  const issueLink =
    f.issueUrl && f.issueNumber
      ? `<a href="${esc(f.issueUrl)}">Issue #${f.issueNumber}</a>`
      : f.issueNumber
        ? `Issue #${f.issueNumber}`
        : "<span class=\"muted\">לא נפתח Issue (dry-run)</span>";

  return `
    <section class="finding">
      <div class="finding-head">
        <h3>${esc(f.title)}</h3>
        <span class="badge badge-${f.confidence}">ביטחון: ${CONFIDENCE_LABEL[f.confidence]}</span>
      </div>
      <div class="meta">
        <span>מקור: <a href="${esc(f.sourceUrl)}">${esc(f.issuer)}</a></span>
        <span>פורסם: ${esc(fmtDate(f.publishedAt))}</span>
        <span>סוג: ${esc(CHANGE_TYPE_LABEL[f.changeType] ?? f.changeType)}</span>
        <span class="${f.relevantToCurrentFiling ? "rel-yes" : "rel-no"}">
          ${f.relevantToCurrentFiling ? "רלוונטי להגשות הנוכחיות" : "תחולה עתידית בלבד"}
        </span>
      </div>
      <p class="summary">${esc(f.summaryHe)}</p>
      <table class="diff">
        <thead><tr><th>קבוע</th><th>נוכחי</th><th></th><th>מוצע</th></tr></thead>
        <tbody>${changesRows}</tbody>
      </table>
      <div class="issue-link">${issueLink}</div>
    </section>`;
}

function skippedTable(rows: ReportSkipped[]): string {
  if (!rows.length) {
    return `<p class="muted">כל הפרסומים החדשים סווגו כרלוונטיים.</p>`;
  }
  return `
    <table class="skipped">
      <thead><tr><th>כותרת</th><th>מקור</th><th>סיבת דחייה</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr>
              <td>${esc(r.title)}</td>
              <td>${esc(r.issuer)}</td>
              <td class="muted">${esc(r.reason)}</td>
            </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
}

export function generateHtmlReport(summary: RunSummary): string {
  const findings = summary.relevantFindings.map(findingCard).join("\n");
  const findingsSection = summary.relevantFindings.length
    ? findings
    : `<p class="muted">לא נמצאו פרסומים רלוונטיים לטופס 1301 בריצה זו.</p>`;

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<title>countme · דוח סריקה רגולטורית · ${esc(summary.runDate.slice(0, 10))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&family=Rubik:wght@500;700&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: 'Heebo', system-ui, sans-serif;
    color: #1f2937;
    margin: 0;
    padding: 0;
    background: #fff;
    direction: rtl;
    font-size: 13px;
    line-height: 1.6;
  }
  .page { padding: 0 4mm; }
  header.report-head {
    border-bottom: 3px solid #1e3a5f;
    padding-bottom: 12px;
    margin-bottom: 18px;
  }
  header.report-head .brand {
    font-family: 'Rubik', sans-serif;
    font-weight: 700;
    font-size: 22px;
    color: #1e3a5f;
  }
  header.report-head .subtitle { font-size: 15px; color: #475569; margin-top: 2px; }
  header.report-head .date { font-size: 12px; color: #64748b; margin-top: 6px; }
  .dry-run-flag {
    display: inline-block;
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #d4af37;
    border-radius: 4px;
    padding: 1px 8px;
    font-size: 11px;
    margin-top: 6px;
  }
  .summary-cards { display: flex; gap: 10px; margin-bottom: 22px; }
  .card {
    flex: 1;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
    background: #f8fafc;
  }
  .card .num { font-size: 26px; font-weight: 700; color: #1e3a5f; font-family: 'Rubik', sans-serif; }
  .card .lbl { font-size: 11px; color: #64748b; }
  .card.highlight { background: #fff8d6; border-color: #d4af37; }
  .card.highlight .num { color: #92400e; }
  h2 {
    font-family: 'Rubik', sans-serif;
    font-size: 16px;
    color: #1e3a5f;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 4px;
    margin: 24px 0 12px;
  }
  .finding {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 14px;
    page-break-inside: avoid;
  }
  .finding-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
  .finding-head h3 { font-size: 14px; margin: 0; color: #0f172a; }
  .meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; color: #64748b; margin: 6px 0 8px; }
  .meta a { color: #1d4ed8; text-decoration: none; }
  .rel-yes { color: #047857; font-weight: 500; }
  .rel-no { color: #b45309; font-weight: 500; }
  .summary { margin: 0 0 10px; font-size: 12.5px; }
  table.diff, table.skipped { width: 100%; border-collapse: collapse; font-size: 12px; }
  table.diff th, table.skipped th {
    text-align: right;
    background: #eef3f8;
    color: #1e3a5f;
    padding: 5px 8px;
    border: 1px solid #d3e0ec;
    font-weight: 500;
  }
  table.diff td, table.skipped td { padding: 5px 8px; border: 1px solid #e2e8f0; }
  .mono { font-family: ui-monospace, 'SF Mono', monospace; font-size: 11px; }
  td.old { color: #b91c1c; text-decoration: line-through; }
  td.new { color: #047857; font-weight: 600; }
  td.arrow { text-align: center; color: #94a3b8; }
  .badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    white-space: nowrap;
  }
  .badge-high { background: #dcfce7; color: #166534; }
  .badge-medium { background: #fef9c3; color: #854d0e; }
  .badge-low { background: #fee2e2; color: #991b1b; }
  .issue-link { margin-top: 8px; font-size: 12px; }
  .issue-link a { color: #1d4ed8; text-decoration: none; }
  .muted { color: #94a3b8; font-style: italic; }
  footer {
    margin-top: 28px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
    font-size: 10px;
    color: #94a3b8;
    text-align: center;
  }
  @page { size: A4; margin: 15mm 12mm; }
</style>
</head>
<body>
<div class="page">
  <header class="report-head">
    <div class="brand">✦ countme</div>
    <div class="subtitle">דוח סריקה רגולטורית — מעקב שינויים בטופס 1301</div>
    <div class="date">הופק: ${esc(fmtDate(summary.runDate))} · שנת הגשה נוכחית: ${summary.filingYear}</div>
    ${summary.dryRun ? '<div class="dry-run-flag">ריצת dry-run — לא נפתחו Issues</div>' : ""}
  </header>

  <div class="summary-cards">
    <div class="card"><div class="num">${summary.sourcesScanned}</div><div class="lbl">מקורות נסרקו</div></div>
    <div class="card"><div class="num">${summary.newPublications}</div><div class="lbl">פרסומים חדשים</div></div>
    <div class="card highlight"><div class="num">${summary.relevantFindings.length}</div><div class="lbl">רלוונטיים לטופס 1301</div></div>
  </div>

  <h2>ממצאים רלוונטיים</h2>
  ${findingsSection}

  <h2>פרסומים שנסרקו ולא נמצאו רלוונטיים</h2>
  ${skippedTable(summary.irrelevantPublications)}

  <footer>
    countme · regulatory-watch agent · ${esc(summary.runDate)}<br />
    הדוח אינו ייעוץ מס. כל שינוי בקוד מחייב סקירה אנושית לפני מיזוג.
  </footer>
</div>
</body>
</html>`;
}

export function writeReport(summary: RunSummary): string {
  mkdirSync(REPORTS_DIR, { recursive: true });
  const datePart = summary.runDate.slice(0, 10);
  const path = join(REPORTS_DIR, `${datePart}.html`);
  writeFileSync(path, generateHtmlReport(summary), "utf-8");
  return path;
}
