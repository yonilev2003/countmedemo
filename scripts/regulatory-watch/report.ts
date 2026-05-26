/**
 * Regulatory-Watch — HTML/PDF report generator.
 *
 * Standalone module: takes a RunSummary produced by the daily agent run and
 * renders a print-ready Hebrew (RTL) executive report, then writes both an
 * .html and a .pdf to `.regulatory-watch/reports/YYYY-MM-DD.{html,pdf}`.
 *
 * `generateHtmlReport` is pure (no I/O, no puppeteer) so it is trivially
 * testable. `writeReport` performs the filesystem + Chromium work; puppeteer
 * is imported lazily so that merely importing this module (e.g. in a unit
 * test of the HTML) never launches a browser.
 *
 * The output directory can be overridden with REGWATCH_REPORT_DIR — used by
 * the GitHub Action so paths are injected via env rather than baked into the
 * YAML.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface RunSummary {
  runDate: string; // ISO Date (YYYY-MM-DD)
  sourcesScanned: number;
  newPublications: number;
  relevantFindings: Finding[];
  irrelevantPublications: { title: string; source: string; reason: string }[];
}

export interface Finding {
  title: string;
  sourceUrl: string;
  publishedAt: string;
  summaryHe: string;
  affectedConstants: { name: string; oldValue: unknown; proposedValue: unknown }[];
  confidence: "high" | "medium" | "low";
  issueUrl: string;
  changeType: string;
}

/** Resolve the directory reports are written to (env-overridable for CI). */
function reportDir(): string {
  return (
    process.env.REGWATCH_REPORT_DIR ??
    join(process.cwd(), ".regulatory-watch", "reports")
  );
}

/** HTML-escape arbitrary text so finding/publication content can't break markup. */
function esc(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Render a constant value (number/string/object/null) as readable, escaped text. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") {
    try {
      return esc(JSON.stringify(value));
    } catch {
      return esc(String(value));
    }
  }
  if (typeof value === "number") {
    return esc(value.toLocaleString("he-IL"));
  }
  return esc(value);
}

const CONFIDENCE_LABEL: Record<Finding["confidence"], string> = {
  high: "ודאות גבוהה",
  medium: "ודאות בינונית",
  low: "ודאות נמוכה",
};

/** Format an ISO date as a Hebrew long date, falling back to the raw string. */
function formatDateHe(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return esc(iso);
  return esc(
    d.toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  );
}

function renderStatCard(value: number, label: string, tone: string): string {
  return `
      <div class="stat stat--${tone}">
        <div class="stat__num">${esc(value.toLocaleString("he-IL"))}</div>
        <div class="stat__label">${esc(label)}</div>
      </div>`;
}

function renderDiff(c: Finding["affectedConstants"][number]): string {
  return `
        <div class="diff">
          <code class="diff__name">${esc(c.name)}</code>
          <div class="diff__values">
            <span class="diff__old">${formatValue(c.oldValue)}</span>
            <span class="diff__arrow" aria-hidden="true">←</span>
            <span class="diff__new">${formatValue(c.proposedValue)}</span>
          </div>
        </div>`;
}

function renderFinding(f: Finding, index: number): string {
  const diffs =
    f.affectedConstants.length > 0
      ? f.affectedConstants.map(renderDiff).join("")
      : `<div class="diff diff--empty">לא זוהו קבועים מושפעים</div>`;

  return `
    <article class="finding">
      <header class="finding__head">
        <span class="finding__index">${esc(index)}</span>
        <h3 class="finding__title">${esc(f.title)}</h3>
        <span class="badge badge--${f.confidence}">${esc(CONFIDENCE_LABEL[f.confidence] ?? f.confidence)}</span>
      </header>

      <div class="finding__meta">
        <span class="meta__item"><strong>סוג שינוי:</strong> ${esc(f.changeType)}</span>
        <span class="meta__item"><strong>פורסם:</strong> ${formatDateHe(f.publishedAt)}</span>
        <span class="meta__item"><a href="${esc(f.sourceUrl)}" target="_blank" rel="noopener">מקור</a></span>
        <span class="meta__item"><a href="${esc(f.issueUrl)}" target="_blank" rel="noopener">Issue</a></span>
      </div>

      <p class="finding__summary">${esc(f.summaryHe)}</p>

      <div class="finding__diffs">
        <div class="diffs__title">קבועים מושפעים</div>
        ${diffs}
      </div>
    </article>`;
}

function renderIrrelevant(items: RunSummary["irrelevantPublications"]): string {
  if (items.length === 0) {
    return `<p class="empty">לא נדחו פרסומים בריצה זו.</p>`;
  }
  const rows = items
    .map(
      (p) => `
          <tr>
            <td>${esc(p.title)}</td>
            <td>${esc(p.source)}</td>
            <td>${esc(p.reason)}</td>
          </tr>`,
    )
    .join("");
  return `
      <table class="reject-table">
        <thead>
          <tr>
            <th>כותרת</th>
            <th>מקור</th>
            <th>סיבת דחייה</th>
          </tr>
        </thead>
        <tbody>${rows}
        </tbody>
      </table>`;
}

export function generateHtmlReport(summary: RunSummary): string {
  const findingsHtml =
    summary.relevantFindings.length > 0
      ? summary.relevantFindings.map((f, i) => renderFinding(f, i + 1)).join("")
      : `<p class="empty">לא נמצאו ממצאים רלוונטיים בריצה זו.</p>`;

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>דוח מעקב רגולטורי · ${esc(summary.runDate)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --navy: #1f3a5f;
      --blue: #2f6fb0;
      --bg: #f5f7fa;
      --card: #ffffff;
      --line: #d7e0ea;
      --ink: #1c2a3a;
      --muted: #5b6b7d;
      --gold: #d4af37;
      --gold-bg: #fff8d6;
      --green: #1f8a4c;
      --amber: #b8860b;
      --red: #c0392b;
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: "Heebo", "Segoe UI", system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      max-width: 820px;
      margin: 0 auto;
      padding: 28px 32px;
    }

    /* ---------- Page 1: summary overview ---------- */
    .cover { border-bottom: 3px solid var(--navy); padding-bottom: 18px; margin-bottom: 24px; }
    .cover__brand { color: var(--blue); font-weight: 800; letter-spacing: .5px; font-size: 13px; }
    .cover__title { font-size: 30px; font-weight: 800; color: var(--navy); margin: 6px 0 2px; }
    .cover__date { color: var(--muted); font-size: 15px; }

    .dashboard {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 8px;
    }
    .stat {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 18px 14px;
      text-align: center;
      page-break-inside: avoid;
    }
    .stat__num { font-size: 30px; font-weight: 800; line-height: 1; }
    .stat__label { color: var(--muted); font-size: 12.5px; margin-top: 8px; }
    .stat--sources .stat__num { color: var(--blue); }
    .stat--scanned .stat__num { color: var(--navy); }
    .stat--findings .stat__num { color: var(--red); }
    .stat--rejected .stat__num { color: var(--muted); }

    .section-title {
      font-size: 19px;
      font-weight: 700;
      color: var(--navy);
      margin: 30px 0 14px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--line);
    }

    /* ---------- Findings ---------- */
    .findings { page-break-before: always; }

    .finding {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .finding__head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .finding__index {
      flex: 0 0 auto;
      width: 26px; height: 26px;
      border-radius: 50%;
      background: var(--navy);
      color: #fff;
      font-weight: 700;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .finding__title { flex: 1; font-size: 17px; font-weight: 700; color: var(--navy); margin: 0; }

    .badge {
      flex: 0 0 auto;
      font-size: 11.5px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 999px;
      white-space: nowrap;
    }
    .badge--high { background: #e3f5ea; color: var(--green); }
    .badge--medium { background: #fdf3dc; color: var(--amber); }
    .badge--low { background: #fde6e3; color: var(--red); }

    .finding__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 18px;
      font-size: 12.5px;
      color: var(--muted);
      margin-bottom: 12px;
    }
    .finding__meta a { color: var(--blue); text-decoration: none; }
    .finding__meta strong { color: var(--ink); font-weight: 500; }

    .finding__summary {
      margin: 0 0 14px;
      font-size: 14.5px;
      line-height: 1.7;
    }

    .diffs__title { font-size: 12.5px; font-weight: 700; color: var(--muted); margin-bottom: 6px; }
    .diff {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      background: var(--gold-bg);
      border: 1px dashed var(--gold);
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 6px;
    }
    .diff__name { font-family: "SFMono-Regular", ui-monospace, "Courier New", monospace; font-size: 12.5px; color: var(--navy); direction: ltr; unicode-bidi: embed; }
    .diff__values { display: inline-flex; align-items: center; gap: 10px; direction: ltr; }
    .diff__old { color: var(--red); text-decoration: line-through; }
    .diff__new { color: var(--green); font-weight: 700; }
    .diff__arrow { color: var(--muted); }
    .diff--empty { background: #f3f5f8; border-style: solid; border-color: var(--line); color: var(--muted); justify-content: center; }

    /* ---------- Rejected table ---------- */
    .reject {  }
    .reject-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      page-break-inside: avoid;
    }
    .reject-table th, .reject-table td {
      text-align: right;
      padding: 9px 12px;
      border-bottom: 1px solid var(--line);
    }
    .reject-table thead th {
      background: linear-gradient(180deg, #cdddec, #dde7f0);
      color: var(--navy);
      font-weight: 700;
    }
    .reject-table tbody tr:nth-child(even) { background: #fafbfd; }

    .empty { color: var(--muted); font-style: italic; padding: 8px 0; }

    .footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 11.5px;
      text-align: center;
    }

    /* ---------- Print / A4 ---------- */
    @page { size: A4; margin: 14mm; }
    @media print {
      html, body { background: #fff; }
      .page { max-width: none; margin: 0; padding: 0; }
      .stat, .finding, .reject-table { page-break-inside: avoid; }
      .findings { page-break-before: always; }
      a { color: var(--blue) !important; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="cover">
      <div class="cover__brand">countme · Regulatory-Watch</div>
      <h1 class="cover__title">דוח מעקב רגולטורי</h1>
      <div class="cover__date">ריצת ${formatDateHe(summary.runDate)}</div>
    </header>

    <section class="dashboard">
      ${renderStatCard(summary.sourcesScanned, "מקורות שנסרקו", "sources")}
      ${renderStatCard(summary.newPublications, "פרסומים חדשים", "scanned")}
      ${renderStatCard(summary.relevantFindings.length, "ממצאים רלוונטיים", "findings")}
      ${renderStatCard(summary.irrelevantPublications.length, "נדחו", "rejected")}
    </section>

    <section class="findings">
      <h2 class="section-title">ממצאים מפורטים</h2>
      ${findingsHtml}
    </section>

    <section class="reject">
      <h2 class="section-title">פרסומים שנדחו</h2>
      ${renderIrrelevant(summary.irrelevantPublications)}
    </section>

    <footer class="footer">
      נוצר אוטומטית על ידי countme Regulatory-Watch · ${esc(new Date().toISOString())}
    </footer>
  </main>
</body>
</html>`;
}

export async function writeReport(summary: RunSummary): Promise<string> {
  const dir = reportDir();
  await mkdir(dir, { recursive: true });

  const html = generateHtmlReport(summary);
  const htmlPath = join(dir, `${summary.runDate}.html`);
  const pdfPath = join(dir, `${summary.runDate}.pdf`);

  await writeFile(htmlPath, html, "utf8");

  // Lazy import: keep generateHtmlReport (and unit tests) free of Chromium.
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    // Wait for the Heebo webfont to actually finish loading before painting,
    // otherwise the PDF can render in a fallback font.
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }

  return pdfPath;
}
