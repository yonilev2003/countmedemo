import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import type { TiptapDoc } from "@/types/db";

const EXTENSIONS = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Link,
  TextAlign.configure({ types: ["heading", "paragraph"], defaultAlignment: "right" }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Table,
  TableRow,
  TableHeader,
  TableCell,
];

const STYLES = `
  @page { size: A4; margin: 20mm 15mm; }
  body {
    font-family: 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    direction: rtl;
    color: #1f2937;
    line-height: 1.6;
    font-size: 11pt;
  }
  h1 { font-size: 24pt; font-weight: 700; margin: 16pt 0 8pt; }
  h2 { font-size: 18pt; font-weight: 700; margin: 14pt 0 6pt; }
  h3 { font-size: 14pt; font-weight: 600; margin: 12pt 0 4pt; }
  p { margin: 0 0 8pt; }
  ul, ol { padding-inline-start: 24pt; margin: 0 0 8pt; }
  li { margin-bottom: 2pt; }
  ul[data-type="taskList"] { list-style: none; padding-inline-start: 0; }
  ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 6pt; }
  ul[data-type="taskList"] li > label > input { margin-top: 4pt; }
  blockquote {
    border-inline-start: 3px solid #d1d5db;
    padding-inline-start: 12pt;
    color: #6b7280;
    font-style: italic;
    margin: 8pt 0;
  }
  code { background: #f3f4f6; padding: 1pt 4pt; border-radius: 3pt; font-size: 10pt; font-family: 'Courier New', monospace; }
  pre { background: #f3f4f6; padding: 8pt; border-radius: 4pt; overflow: auto; }
  pre code { background: transparent; padding: 0; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 16pt 0; }
  a { color: #2563eb; text-decoration: underline; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  th, td { border: 1px solid #d1d5db; padding: 6pt 8pt; text-align: right; vertical-align: top; }
  th { background: #f9fafb; font-weight: 600; }
  .doc-title { font-size: 28pt; font-weight: 700; margin: 0 0 20pt; padding-bottom: 8pt; border-bottom: 2px solid #e5e7eb; }
`;

export async function tiptapToPdf(doc: TiptapDoc, title: string): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = generateHTML(doc as any, EXTENSIONS);

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>${STYLES}</style>
</head>
<body>
  <h1 class="doc-title">${escapeHtml(title)}</h1>
  ${body}
</body>
</html>`;

  const isVercel = !!process.env.VERCEL;
  const puppeteer = await import("puppeteer-core");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let launchOptions: any;
  if (isVercel) {
    const chromium = (await import("@sparticuz/chromium")).default;
    launchOptions = {
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    };
  } else {
    const localPath =
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      process.env.CHROME_PATH ||
      "/usr/bin/chromium-browser";
    launchOptions = {
      executablePath: localPath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    };
  }

  const browser = await puppeteer.default.launch(launchOptions);
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
