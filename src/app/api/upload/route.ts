import Anthropic from "@anthropic-ai/sdk";
import { MODEL_HAIKU, logAiUsage } from "@/lib/ai/models";
import ExcelJS from "exceljs";
import { requireUserIfGated } from "@/lib/security/api-guard";
import {
  checkRateLimit,
  rateLimitResponse,
  resolveClientKey,
} from "@/lib/security/rate-limit";

/**
 * /api/upload — extract structured tax data from user-uploaded reports.
 *
 * Accepts multipart/form-data with:
 *   - file:  the document (xlsx or pdf)
 *   - kind:  "income-report" | "expenses-excel" | "form-106" | "donations"
 *
 * Returns JSON with extracted fields. The client merges these into the
 * setup wizard's persona-in-progress.
 */

// Rate limiting via the shared limiter (lib/security/rate-limit) — this also
// fixes the previously unbounded bucket map here (the shared limiter sweeps
// and caps its maps). In-memory = per-instance on serverless; see its JSDoc.
const RATE_LIMIT_MAX_UPLOADS = 8; // per client per minute
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

/* ──────────────────────────────────────────────────────────
   Magic-byte (file signature) checks — the extension/MIME
   checks below trust the client; these read the actual bytes.
   ────────────────────────────────────────────────────────── */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04" — .xlsx is a ZIP container

function hasMagic(buf: ArrayBuffer, magic: number[]): boolean {
  if (buf.byteLength < magic.length) return false;
  const head = new Uint8Array(buf, 0, magic.length);
  return magic.every((byte, i) => head[i] === byte);
}

export interface ExtractedData {
  /** Only for income-report PDFs */
  totalRevenue?: number;
  osekFileNumber?: string;
  osekType?: "patur" | "morshe";
  dateRangeStart?: string;
  dateRangeEnd?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  /** Only for expenses-excel — categorized */
  expensesByCategory?: { category: string; amount: number; count: number }[];
  totalExpenses?: number;
  /** For form-106 (employer salary) */
  salaryGross?: number;
  employerName?: string;
  /** For donations */
  donationsTotal?: number;
  /** Optional human-readable summary the UI can show */
  summary?: string;
}

export async function POST(request: Request) {
  const rl = checkRateLimit("upload", resolveClientKey(request), RATE_LIMIT_MAX_UPLOADS);
  if (!rl.allowed) {
    return rateLimitResponse(rl.retryAfter, "יותר מדי העלאות. נסי שוב בעוד כמה שניות.");
  }

  // Auth gate (no-op while AUTH_GATING_ENABLED is off) — after the limiter,
  // before we touch the multipart body or spend Anthropic tokens.
  const guard = await requireUserIfGated(request);
  if (guard.denied) return guard.denied;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const kind = formData.get("kind");

  if (!(file instanceof File)) {
    return Response.json({ error: "file missing" }, { status: 400 });
  }
  if (typeof kind !== "string") {
    return Response.json({ error: "kind missing" }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: "קובץ ריק" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return Response.json({ error: "קובץ גדול מדי (מקסימום 5MB)" }, { status: 413 });
  }

  const validKinds = ["income-report", "expenses-excel", "form-106", "donations"];
  if (!validKinds.includes(kind)) {
    return Response.json({ error: "kind not supported" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  // .xlsx only. Legacy .xls (OLE2 container, magic D0 CF 11 E0) is
  // intentionally NOT supported: exceljs can only read xlsx/csv
  // (wb.xlsx.load), so an .xls upload always failed downstream with a
  // cryptic error anyway — now it's rejected up front with a clear message.
  const isXlsx = file.name.toLowerCase().endsWith(".xlsx");

  try {
    if (kind === "expenses-excel") {
      if (!isXlsx) {
        return Response.json(
          { error: "צרי קובץ Excel (.xlsx)" },
          { status: 400 },
        );
      }
      // Magic-byte check: a real .xlsx is a ZIP container. Catches renamed
      // files that the extension check above happily lets through.
      if (!hasMagic(arrayBuffer, ZIP_MAGIC)) {
        return Response.json(
          { error: "הקובץ אינו קובץ Excel תקין (.xlsx)" },
          { status: 415 },
        );
      }
      const data = await parseExpensesExcel(arrayBuffer);
      return Response.json({ ok: true, data });
    }

    if (!isPdf) {
      return Response.json({ error: "צרי קובץ PDF" }, { status: 400 });
    }
    // Magic-byte check: every valid PDF starts with "%PDF-".
    if (!hasMagic(arrayBuffer, PDF_MAGIC)) {
      return Response.json({ error: "הקובץ אינו PDF תקין" }, { status: 415 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Vision API not configured" },
        { status: 503 },
      );
    }

    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const data = await parsePdfWithClaude(base64, kind, apiKey);
    return Response.json({ ok: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: `שגיאה בעיבוד הקובץ: ${msg}` },
      { status: 500 },
    );
  }
}

/* ──────────────────────────────────────────────────────────
   Excel parser — categorizes expense rows.
   Expects columns roughly: תאריך | שם | מספר קבלה | סכום כולל מעמ | סכום ללא מעמ | פירוט
   We're tolerant: detect headers by Hebrew keywords.
   ────────────────────────────────────────────────────────── */
async function parseExpensesExcel(buffer: ArrayBuffer): Promise<ExtractedData> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error("גליון Excel ריק");

  // Find the header row (first row with > 3 cells matching expense keywords)
  let headerRowIdx = 1;
  let categoryCol = -1;
  let amountCol = -1;
  let amountNoVatCol = -1;

  for (let r = 1; r <= Math.min(10, sheet.rowCount); r++) {
    const row = sheet.getRow(r);
    let matches = 0;
    row.eachCell((cell, col) => {
      const v = String(cell.value ?? "").trim();
      if (/פירוט|קטגוריה|סוג/.test(v)) {
        categoryCol = col;
        matches++;
      } else if (/סכום כולל|כולל מעמ|כולל מע"מ|כולל מע״מ/.test(v)) {
        amountCol = col;
        matches++;
      } else if (/ללא מעמ|ללא מע"מ|ללא מע״מ/.test(v)) {
        amountNoVatCol = col;
        matches++;
      } else if (/תאריך|שם|מספר קבלה/.test(v)) {
        matches++;
      }
    });
    if (matches >= 2) {
      headerRowIdx = r;
      break;
    }
  }

  if (categoryCol === -1 || (amountCol === -1 && amountNoVatCol === -1)) {
    throw new Error(
      "לא הצלחתי לזהות עמודות 'פירוט' ו'סכום' באקסל. ודאי שיש כותרות בעברית.",
    );
  }

  const useCol = amountNoVatCol !== -1 ? amountNoVatCol : amountCol;
  const byCategory = new Map<string, { amount: number; count: number }>();
  let total = 0;

  for (let r = headerRowIdx + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const catRaw = row.getCell(categoryCol).value;
    const amtRaw = row.getCell(useCol).value;

    const category = String(catRaw ?? "").trim();
    const amount = typeof amtRaw === "number" ? amtRaw : parseFloat(String(amtRaw ?? ""));
    if (!category || isNaN(amount) || amount <= 0) continue;

    const cur = byCategory.get(category) ?? { amount: 0, count: 0 };
    cur.amount += amount;
    cur.count += 1;
    byCategory.set(category, cur);
    total += amount;
  }

  const expensesByCategory = Array.from(byCategory.entries())
    .map(([category, v]) => ({ category, amount: Math.round(v.amount), count: v.count }))
    .sort((a, b) => b.amount - a.amount);

  return {
    expensesByCategory,
    totalExpenses: Math.round(total),
    summary: `זוהו ${expensesByCategory.length} קטגוריות הוצאה, סך ${Math.round(total).toLocaleString("he-IL")} ₪ ב-${Array.from(byCategory.values()).reduce((s, v) => s + v.count, 0)} שורות.`,
  };
}

/* ──────────────────────────────────────────────────────────
   PDF parser — Claude vision (haiku for speed/cost).
   Different prompts per document kind so we extract only what's needed.
   ────────────────────────────────────────────────────────── */
async function parsePdfWithClaude(
  base64: string,
  kind: string,
  apiKey: string,
): Promise<ExtractedData> {
  const anthropic = new Anthropic({ apiKey });

  const prompt = pdfExtractionPrompt(kind);

  const response = await anthropic.messages.create({
    model: MODEL_HAIKU,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  logAiUsage({
    route: "upload",
    model: MODEL_HAIKU,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
  });

  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text");
  }

  // Extract JSON object from response (Claude sometimes wraps in markdown)
  const match = textBlock.text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("לא הצלחתי לחלץ נתונים מהקובץ");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    throw new Error("תגובת AI לא תקינה");
  }

  // Whitelist fields we accept (defensive — Claude could return extras)
  const result: ExtractedData = {};
  if (typeof parsed.totalRevenue === "number") result.totalRevenue = parsed.totalRevenue;
  if (typeof parsed.osekFileNumber === "string") result.osekFileNumber = parsed.osekFileNumber;
  if (parsed.osekType === "patur" || parsed.osekType === "morshe") {
    result.osekType = parsed.osekType;
  }
  if (typeof parsed.dateRangeStart === "string") result.dateRangeStart = parsed.dateRangeStart;
  if (typeof parsed.dateRangeEnd === "string") result.dateRangeEnd = parsed.dateRangeEnd;
  if (typeof parsed.fullName === "string") result.fullName = parsed.fullName;
  if (typeof parsed.email === "string") result.email = parsed.email;
  if (typeof parsed.phone === "string") result.phone = parsed.phone;
  if (typeof parsed.address === "string") result.address = parsed.address;
  if (typeof parsed.salaryGross === "number") result.salaryGross = parsed.salaryGross;
  if (typeof parsed.employerName === "string") result.employerName = parsed.employerName;
  if (typeof parsed.donationsTotal === "number") result.donationsTotal = parsed.donationsTotal;
  if (typeof parsed.summary === "string") result.summary = parsed.summary;

  return result;
}

function pdfExtractionPrompt(kind: string): string {
  if (kind === "income-report") {
    return `אתה עוזר לחלץ נתונים מדו"ח הכנסות תקופתי של עצמאי בישראל.
החזר אובייקט JSON בלבד עם השדות הבאים (השמט שדות שאין להם ערך):
- totalRevenue (number, ₪) — סך הכנסות כולל מע"מ
- osekFileNumber (string) — מספר עוסק (8-9 ספרות)
- osekType ("patur" | "morshe") — אם כתוב "עוסק פטור" אז patur, אם "עוסק מורשה" אז morshe
- dateRangeStart, dateRangeEnd (string YYYY-MM-DD) — טווח התקופה
- fullName, email, phone, address (string)
- summary (string, עברית, משפט קצר)

החזר רק JSON תקין, ללא markdown, ללא הסברים.`;
  }
  if (kind === "form-106") {
    return `חלץ מטופס 106 (תלוש שכר שנתי) של עובד שכיר בישראל.
החזר JSON עם:
- salaryGross (number) — סך הכנסה ברוטו
- employerName (string)
- summary (string, עברית קצרה)
החזר JSON בלבד.`;
  }
  if (kind === "donations") {
    return `חלץ סכום תרומות מקבלות לפי סעיף 46.
החזר JSON עם:
- donationsTotal (number)
- summary (string, עברית קצרה)
החזר JSON בלבד.`;
  }
  return `חלץ מידע רלוונטי מהמסמך. החזר JSON בלבד.`;
}
