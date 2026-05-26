/**
 * Smoke test for the Regulatory-Watch HTML/PDF report generator.
 *
 * Run with:
 *   node --experimental-strip-types scripts/regulatory-watch/report.smoke.ts
 *
 * Self-contained: no test framework, no new dependencies. Uses Node built-ins,
 * the report module under test, and the already-installed puppeteer (via the
 * module's own writeReport). Exits 0 if every check passes, 1 otherwise.
 */

import { mkdtempSync, existsSync, statSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  generateHtmlReport,
  writeReport,
  type RunSummary,
} from "./report.ts";

// ---------------------------------------------------------------------------
// Tiny assertion harness
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function assert(cond: boolean, label: string): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}`);
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const INJECTION = "<script>alert('x')</script>";

const richFixture: RunSummary = {
  runDate: "2026-05-26",
  sourcesScanned: 12,
  newPublications: 7,
  relevantFindings: [
    {
      title: `עדכון תקרת הכנסה ${INJECTION}`,
      sourceUrl: "https://www.gov.il/he/example-1",
      publishedAt: "2026-05-20",
      summaryHe:
        "רשות המיסים פרסמה טיוטת תקנות המעדכנת את תקרת ההכנסה החייבת.\n\n" +
        "השינוי המוצע משפיע על חישוב המקדמות לעצמאים ועל מדרגות המס.\n\n" +
        "צוות countme ממליץ לבחון את ההשפעה על המשתמשים לפני כניסת התקנות לתוקף, " +
        "שכן מדובר בשינוי מהותי המשנה את חישוב חבות המס השנתית.",
      affectedConstants: [
        { name: "INCOME_CEILING", oldValue: 256410, proposedValue: 270000 },
        { name: "VAT_RATE_LABEL", oldValue: "17%", proposedValue: "18%" },
        { name: "DEPRECATED_FLAG", oldValue: null, proposedValue: false },
        {
          name: "BRACKETS",
          oldValue: { low: 10, high: 47 },
          proposedValue: { low: 10, high: 50 },
        },
      ],
      confidence: "high",
      issueUrl: "https://github.com/example/repo/issues/1",
      changeType: "תקנה חדשה",
    },
    {
      title: "שינוי בשיעור ביטוח לאומי לעצמאים",
      sourceUrl: "https://www.btl.gov.il/he/example-2",
      publishedAt: "2026-05-18",
      summaryHe: "המוסד לביטוח לאומי בוחן עדכון של שיעורי הדמי לעצמאים בשנת המס הבאה.",
      affectedConstants: [
        { name: "BITUACH_RATE", oldValue: 0.052, proposedValue: 0.055 },
      ],
      confidence: "medium",
      issueUrl: "https://github.com/example/repo/issues/2",
      changeType: "עדכון שיעור",
    },
    {
      title: "הבהרה לגבי נקודות זיכוי לחיילים משוחררים",
      sourceUrl: "https://www.gov.il/he/example-3",
      publishedAt: "not-a-real-date",
      summaryHe: "פרסום הבהרה בלבד, ללא שינוי מספרי ודאי.",
      affectedConstants: [],
      confidence: "low",
      issueUrl: "https://github.com/example/repo/issues/3",
      changeType: "הבהרה",
    },
  ],
  irrelevantPublications: [
    {
      title: "הודעה כללית לעיתונות",
      source: "gov.il",
      reason: `לא רלוונטי ${INJECTION}`,
    },
    {
      title: "עדכון מערכת",
      source: "taxes.gov.il",
      reason: "טכני בלבד, ללא השפעה על חישובים.",
    },
  ],
};

const emptyFixture: RunSummary = {
  runDate: "2026-05-26",
  sourcesScanned: 0,
  newPublications: 0,
  relevantFindings: [],
  irrelevantPublications: [],
};

// ---------------------------------------------------------------------------
// Pure-HTML checks
// ---------------------------------------------------------------------------
function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let from = 0;
  for (;;) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) break;
    count++;
    from = idx + needle.length;
  }
  return count;
}

function runHtmlChecks(): void {
  console.log("HTML checks (generateHtmlReport):");
  const html = generateHtmlReport(richFixture);

  // 1. doctype
  assert(html.trimStart().toLowerCase().startsWith("<!doctype html>"), "1. output starts with <!doctype html>");

  // 2. rtl + he
  assert(html.includes('dir="rtl"') && html.includes('lang="he"'), '2. contains dir="rtl" and lang="he"');

  // 3. Heebo font
  assert(html.includes("family=Heebo"), "3. imports Heebo (family=Heebo)");

  // 4. escaping: raw injection gone, escaped present
  const rawGone = !html.includes("<script>alert(");
  const escapedPresent = html.includes("&lt;script&gt;");
  assert(rawGone && escapedPresent, "4. HTML injection neutralized (&lt;script&gt; present, raw <script>alert( absent)");

  // 5. one finding card per finding
  const cardCount = countOccurrences(html, 'class="finding"');
  assert(
    cardCount === richFixture.relevantFindings.length,
    `5. finding cards rendered == finding count (${cardCount} == ${richFixture.relevantFindings.length})`,
  );

  // 6. empty fixture: no throw + Hebrew empty-state string
  let emptyHtml = "";
  let threw = false;
  try {
    emptyHtml = generateHtmlReport(emptyFixture);
  } catch {
    threw = true;
  }
  assert(
    !threw && emptyHtml.includes("לא נמצאו ממצאים רלוונטיים"),
    "6. empty fixture renders without throwing and shows Hebrew empty-state",
  );
}

// ---------------------------------------------------------------------------
// PDF checks (via writeReport -> puppeteer)
// ---------------------------------------------------------------------------
async function writeReportToFreshDir(summary: RunSummary): Promise<{ pdfPath: string; htmlPath: string; dir: string }> {
  const dir = mkdtempSync(join(tmpdir(), "regwatch-smoke-"));
  process.env.REGWATCH_REPORT_DIR = dir;
  const pdfPath = await writeReport(summary);
  const htmlPath = join(dir, `${summary.runDate}.html`);
  return { pdfPath, htmlPath, dir };
}

async function runPdfChecks(): Promise<void> {
  console.log("PDF checks (writeReport / puppeteer):");

  const rich = await writeReportToFreshDir(richFixture);
  const empty = await writeReportToFreshDir(emptyFixture);

  // 7. both files exist and non-empty (rich)
  const htmlExists = existsSync(rich.htmlPath) && statSync(rich.htmlPath).size > 0;
  const pdfExists = existsSync(rich.pdfPath) && statSync(rich.pdfPath).size > 0;
  assert(htmlExists && pdfExists, "7. rich .html and .pdf exist on disk and are non-empty");

  // 8. pdf magic bytes
  const richPdfBuf = readFileSync(rich.pdfPath);
  assert(richPdfBuf.subarray(0, 4).toString("latin1") === "%PDF", "8. rich .pdf starts with %PDF");

  // 9. grows with content + has a /Type/Page marker
  const emptyPdfBuf = readFileSync(empty.pdfPath);
  assert(
    richPdfBuf.length > emptyPdfBuf.length,
    `9a. rich PDF larger than empty PDF (${richPdfBuf.length} > ${emptyPdfBuf.length})`,
  );
  const pdfStr = richPdfBuf.toString("latin1");
  assert(
    pdfStr.includes("/Type/Page") || pdfStr.includes("/Type /Page"),
    "9b. rich PDF contains a /Type/Page marker",
  );

  // 10. empty fixture produced a valid %PDF
  assert(
    existsSync(empty.pdfPath) &&
      emptyPdfBuf.length > 0 &&
      emptyPdfBuf.subarray(0, 4).toString("latin1") === "%PDF",
    "10. empty fixture writeReport produced a valid %PDF",
  );

  // Cleanup temp dirs (best-effort).
  for (const dir of [rich.dir, empty.dir]) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore cleanup errors */
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("Regulatory-Watch report smoke test\n");

  runHtmlChecks();

  try {
    await runPdfChecks();
  } catch (err) {
    // A genuine Chromium-absence (or any launch failure) must NOT silently pass.
    failed++;
    console.log(`  ✗ PDF checks failed to run: ${err instanceof Error ? err.message : String(err)}`);
    console.log(
      "    (If this is a Chromium/launch problem, ensure puppeteer's browser is installed: `npx puppeteer browsers install chrome`)",
    );
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    console.log("RESULT: FAIL");
    process.exit(1);
  }
  console.log("RESULT: PASS");
  process.exit(0);
}

main().catch((err) => {
  console.error("Unexpected fatal error:", err);
  process.exit(1);
});
