/**
 * Generates src/lib/expense-engine/data/rules-2026.ts from the canonical
 * data/expense-recognition/2026.xlsx.
 *
 * Run: npm run gen:expense-data
 * (node --experimental-strip-types, same convention as scripts/regulatory-watch)
 *
 * The generated file is committed — the build never depends on this script
 * running. Re-run it only when the xlsx changes.
 */
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { RecognitionFormula } from "../../src/lib/expense-engine/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const XLSX_PATH = path.join(__dirname, "../../data/expense-recognition/2026.xlsx");
const OUT_PATH = path.join(
  __dirname,
  "../../src/lib/expense-engine/data/rules-2026.ts",
);

type Row = Record<string, unknown>;

/**
 * KNOWN SOURCE-WORKBOOK GAP: every sheet in the canonical xlsx is missing its
 * own first data row (rules_global has no VEH-01, professions has no P001,
 * expense_base has no EB-001, expense_by_profession has no EX-0001, and the
 * standalone depreciation sheet has no DEP-01) — confirmed via ExcelJS
 * dimensions (e.g. professions sheet's own bottom=113 but the first data row
 * already reads "P002"), not a parsing bug. Consistent off-by-one across
 * every sheet — most likely an authoring artifact in whatever tool built the
 * workbook. Flagged to Yoni; not silently ignored.
 *
 * Where another part of the SAME dataset lets us cross-validate the missing
 * row's content, we reconstruct it (VEH-01 from the companion PDF's page 2 +
 * professions' own "% רכב"=0.45 default; P001 from expense_by_profession's
 * own P001/"עורך דין" references; DEP-01 from rules_global, which — unlike
 * the standalone depreciation sheet — does still carry its own DEP-01 row).
 * EB-001 and EX-0001 have no cross-reference anywhere in the workbook, so we
 * do NOT invent their content — the dataset genuinely ships 22 base expenses
 * and 595 profession expenses, not 23/596 as the README states.
 */
const RECONSTRUCTED_VEH_01 = {
  ruleId: "VEH-01",
  category: "רכב",
  nameHe: 'רכב פרטי M1 (עד 3,500 ק"ג)',
  formula: { kind: "vehicle-max", floorRate: 0.45, vatRate: 0.667 } as RecognitionFormula,
  incomeTaxFraction: 0.45,
  vatFraction: 0.667,
  conditionHe: "הגבוה מבין: (הוצאות פחות שווי שימוש) או 45% מההוצאות",
  legalSourceHe: 'תק\' 2(1) לתקנות ניכוי הוצאות רכב (התשנ"ה-1995)',
  confidence: "A" as const,
};

const RECONSTRUCTED_P001 = {
  id: "P001",
  verticalId: "V01",
  verticalNameHe: "משפט, ראיית חשבון וייעוץ",
  nameHe: "עורך דין",
  vehicleRuleId: "VEH-01",
  vehicleRateHint: 0.45,
  statusNoteHe: undefined,
  expenseCountHint: undefined,
};

function cellText(v: ExcelJS.CellValue): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && "richText" in (v as object)) {
    return (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join("");
  }
  const s = String(v).trim();
  return s === "" ? null : s;
}

function cellNumber(v: ExcelJS.CellValue): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(cellText(v));
  if (Number.isNaN(n)) return null;
  // Round away float artifacts from the source sheet (e.g. 0.07000000000000001).
  return Math.round(n * 10000) / 10000;
}

/** Read a worksheet into an array of header-keyed row objects. */
function readSheet(workbook: ExcelJS.Workbook, sheetName: string): Row[] {
  const ws = workbook.getWorksheet(sheetName);
  if (!ws) throw new Error(`sheet not found: ${sheetName}`);
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = cellText(cell.value) ?? "";
  });

  const rows: Row[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Row = {};
    let hasContent = false;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      obj[header] = cell.value;
      if (cellText(cell.value) !== null) hasContent = true;
    });
    if (hasContent) rows.push(obj);
  });
  return rows;
}

function asConfidence(v: unknown): "A" | "B" | "C" {
  const s = cellText(v as ExcelJS.CellValue);
  if (s === "A" || s === "B" || s === "C") return s;
  throw new Error(`invalid confidence value: ${JSON.stringify(v)}`);
}

/**
 * Classify a rules_global row into a computable/explainable formula.
 * Only the two patterns the dataset's own README flags as commonly
 * miscalculated (vehicle, mobile phone) get bespoke structured shapes;
 * everything else is flat (both fractions numeric) or custom (verbatim text).
 */
function classifyGlobalFormula(
  ruleId: string,
  category: string,
  incomeTaxFraction: number | null,
  vatFraction: number | null,
  formulaTextHe: string | null,
): RecognitionFormula {
  if (/^VEH-0[1-5]$/.test(ruleId) && incomeTaxFraction !== null) {
    return { kind: "vehicle-max", floorRate: incomeTaxFraction, vatRate: vatFraction };
  }
  if (ruleId === "COM-01") {
    return { kind: "reduce-min-cap", capNis: 1380, rate: 0.5, vatRate: vatFraction };
  }
  if (/^DEP-\d+$/.test(ruleId) && incomeTaxFraction !== null) {
    return { kind: "depreciation", annualRate: incomeTaxFraction, vatRate: vatFraction };
  }
  if (category === "לא מוכר" || /^NON-\d+$/.test(ruleId)) {
    return { kind: "non-deductible" };
  }
  if (incomeTaxFraction !== null && vatFraction !== null) {
    return { kind: "flat", incomeTaxRate: incomeTaxFraction, vatRate: vatFraction };
  }
  return {
    kind: "custom",
    formulaTextHe: formulaTextHe ?? "",
    vatRate: vatFraction,
  };
}

/** Same flat-or-custom split for expense_base / expense_by_profession rows (no special IDs there). */
function classifyExpenseFormula(
  incomeTaxFraction: number | null,
  vatFraction: number | null,
  formulaTextHe: string | null,
): RecognitionFormula {
  if (incomeTaxFraction !== null && vatFraction !== null) {
    return { kind: "flat", incomeTaxRate: incomeTaxFraction, vatRate: vatFraction };
  }
  return {
    kind: "custom",
    formulaTextHe: formulaTextHe ?? "",
    vatRate: vatFraction,
  };
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(XLSX_PATH);

  // ── rules_global ──────────────────────────────────────────────
  const rulesRaw = readSheet(workbook, "rules_global");
  const rules = rulesRaw.map((r) => {
    const ruleId = cellText(r["rule_id"] as ExcelJS.CellValue)!;
    const category = cellText(r["קטגוריה"] as ExcelJS.CellValue) ?? "";
    const nameHe = cellText(r["שם הכלל"] as ExcelJS.CellValue) ?? "";
    const incomeTaxFraction = cellNumber(r["% מס הכנסה"] as ExcelJS.CellValue);
    const vatFraction = cellNumber(r['% מע"מ'] as ExcelJS.CellValue);
    const conditionHe = cellText(r["נוסחה / תקרה / תנאי"] as ExcelJS.CellValue) ?? undefined;
    const legalSourceHe = cellText(r["מקור בדין"] as ExcelJS.CellValue) ?? "";
    const confidence = asConfidence(r["conf"]);
    const formula = classifyGlobalFormula(
      ruleId,
      category,
      incomeTaxFraction,
      vatFraction,
      conditionHe ?? null,
    );
    return {
      ruleId,
      category,
      nameHe,
      formula,
      incomeTaxFraction,
      vatFraction,
      conditionHe,
      legalSourceHe,
      confidence,
    };
  });
  rules.unshift(RECONSTRUCTED_VEH_01);

  // ── professions ───────────────────────────────────────────────
  const professionsRaw = readSheet(workbook, "professions");
  const professions = professionsRaw.map((r) => ({
    id: cellText(r["profession_id"] as ExcelJS.CellValue)!,
    verticalId: cellText(r["vertical_id"] as ExcelJS.CellValue) ?? "",
    verticalNameHe: cellText(r["אנך"] as ExcelJS.CellValue) ?? "",
    nameHe: cellText(r["מקצוע"] as ExcelJS.CellValue) ?? "",
    vehicleRuleId: cellText(r["vehicle_rule_id"] as ExcelJS.CellValue) ?? "",
    vehicleRateHint: cellNumber(r["% רכב"] as ExcelJS.CellValue) ?? undefined,
    statusNoteHe: cellText(r["הערת מעמד / רגולציה"] as ExcelJS.CellValue) ?? undefined,
    expenseCountHint: cellNumber(r["מס' הוצאות ייעודיות"] as ExcelJS.CellValue) ?? undefined,
  }));
  professions.unshift(RECONSTRUCTED_P001);

  // ── expense_base ──────────────────────────────────────────────
  const baseRaw = readSheet(workbook, "expense_base");
  const baseExpenses = baseRaw.map((r) => {
    const incomeTaxFraction = cellNumber(r["% מס הכנסה"] as ExcelJS.CellValue);
    const vatFraction = cellNumber(r['% מע"מ'] as ExcelJS.CellValue);
    const conditionHe = cellText(r["הערה"] as ExcelJS.CellValue) ?? undefined;
    return {
      id: cellText(r["expense_id"] as ExcelJS.CellValue)!,
      nameHe: cellText(r["שם ההוצאה"] as ExcelJS.CellValue) ?? "",
      category: cellText(r["קטגוריה"] as ExcelJS.CellValue) ?? "",
      formula: classifyExpenseFormula(incomeTaxFraction, vatFraction, conditionHe ?? null),
      incomeTaxFraction,
      vatFraction,
      conditionHe,
      legalSourceHe: cellText(r["מקור"] as ExcelJS.CellValue) ?? "",
      rateCertainty: "legal" as const,
      eligibilityConfidence: asConfidence(r["conf"]),
    };
  });

  // ── expense_by_profession ────────────────────────────────────
  const byProfRaw = readSheet(workbook, "expense_by_profession");
  const professionExpenses = byProfRaw.map((r) => {
    const incomeTaxFraction = cellNumber(r["% מס הכנסה"] as ExcelJS.CellValue);
    const vatFraction = cellNumber(r['% מע"מ'] as ExcelJS.CellValue);
    const conditionHe = cellText(r["הערה"] as ExcelJS.CellValue) ?? undefined;
    return {
      id: cellText(r["expense_id"] as ExcelJS.CellValue)!,
      professionId: cellText(r["profession_id"] as ExcelJS.CellValue) ?? "",
      nameHe: cellText(r["שם ההוצאה"] as ExcelJS.CellValue) ?? "",
      category: cellText(r["קטגוריה"] as ExcelJS.CellValue) ?? "",
      formula: classifyExpenseFormula(incomeTaxFraction, vatFraction, conditionHe ?? null),
      incomeTaxFraction,
      vatFraction,
      conditionHe,
      legalSourceHe: cellText(r["מקור"] as ExcelJS.CellValue) ?? "",
      rateCertainty: "legal" as const,
      eligibilityConfidence: asConfidence(r["conf"]),
    };
  });

  // ── depreciation ──────────────────────────────────────────────
  const depRaw = readSheet(workbook, "depreciation");
  const depreciation: {
    ruleId: string;
    category: string;
    nameHe: string;
    formula: RecognitionFormula;
    incomeTaxFraction: number | null;
    vatFraction: number | null;
    conditionHe: string | undefined;
    legalSourceHe: string;
    confidence: "A" | "B" | "C";
  }[] = depRaw.map((r) => {
    const annualRate = cellNumber(r["שיעור פחת שנתי"] as ExcelJS.CellValue);
    const vatFraction = cellNumber(r['% מע"מ'] as ExcelJS.CellValue);
    const conditionHe = cellText(r["הערה"] as ExcelJS.CellValue) ?? undefined;
    // A few rows give a range ("10%-20% לפי סוג הציוד") instead of one rate —
    // no single annualRate to encode; fall back to the verbatim text.
    const formula: RecognitionFormula =
      annualRate !== null
        ? { kind: "depreciation", annualRate, vatRate: vatFraction }
        : { kind: "custom", formulaTextHe: conditionHe ?? "", vatRate: vatFraction };
    return {
      ruleId: cellText(r["rule_id"] as ExcelJS.CellValue)!,
      category: "פחת",
      nameHe: cellText(r["סוג הנכס"] as ExcelJS.CellValue) ?? "",
      formula,
      incomeTaxFraction: annualRate,
      vatFraction,
      conditionHe,
      legalSourceHe: cellText(r["מקור"] as ExcelJS.CellValue) ?? "",
      confidence: asConfidence(r["conf"]),
    };
  });
  // The standalone depreciation sheet is missing its own DEP-01 row, but
  // rules_global (parsed above) still has it — reuse that entry rather than
  // re-deriving anything, since it's the same fact from the same workbook.
  const dep01FromRulesGlobal = rules.find((r) => r.ruleId === "DEP-01");
  if (!dep01FromRulesGlobal) {
    throw new Error("expected DEP-01 to exist in rules_global for depreciation-sheet reconstruction");
  }
  depreciation.unshift({
    ruleId: dep01FromRulesGlobal.ruleId,
    category: "פחת",
    nameHe: dep01FromRulesGlobal.nameHe,
    formula: dep01FromRulesGlobal.formula,
    incomeTaxFraction: dep01FromRulesGlobal.incomeTaxFraction,
    vatFraction: dep01FromRulesGlobal.vatFraction,
    conditionHe: dep01FromRulesGlobal.conditionHe,
    legalSourceHe: dep01FromRulesGlobal.legalSourceHe,
    confidence: dep01FromRulesGlobal.confidence,
  });

  // ── non_deductible ────────────────────────────────────────────
  const nonDedRaw = readSheet(workbook, "non_deductible");
  const nonDeductible = nonDedRaw.map((r) => ({
    ruleId: cellText(r["rule_id"] as ExcelJS.CellValue)!,
    category: cellText(r["קטגוריה"] as ExcelJS.CellValue) ?? "",
    nameHe: cellText(r["הוצאה / עילת פסילה"] as ExcelJS.CellValue) ?? "",
    formula: { kind: "non-deductible" },
    incomeTaxFraction: 0,
    vatFraction: 0,
    conditionHe: cellText(r["פירוט"] as ExcelJS.CellValue) ?? undefined,
    legalSourceHe: cellText(r["מקור"] as ExcelJS.CellValue) ?? "",
    confidence: asConfidence(r["conf"]),
  }));

  // ── validation ────────────────────────────────────────────────
  const errors: string[] = [];
  const expectCount = (label: string, got: number, expected: number) => {
    if (got !== expected) errors.push(`${label}: expected ${expected} rows, got ${got}`);
  };
  // rules_global/professions/depreciation counts below already assume the
  // VEH-01/P001/DEP-01 reconstructions above ran — see the comment on
  // RECONSTRUCTED_VEH_01. expense_base and expense_by_profession are the
  // dataset's REAL counts (22/595, not the README's 23/596) — the source
  // workbook is missing EB-001 and EX-0001 with no way to reconstruct them.
  expectCount("rules_global", rules.length, 62);
  expectCount("professions", professions.length, 113);
  expectCount("expense_base", baseExpenses.length, 22);
  expectCount("expense_by_profession", professionExpenses.length, 595);
  expectCount("depreciation", depreciation.length, 15);
  expectCount("non_deductible", nonDeductible.length, 10);

  const ruleIds = new Set(rules.map((r) => r.ruleId));
  for (const p of professions) {
    if (!ruleIds.has(p.vehicleRuleId)) {
      errors.push(`profession ${p.id} references unknown vehicle_rule_id ${p.vehicleRuleId}`);
    }
  }
  const dupe = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`${label}: duplicate id ${id}`);
      seen.add(id);
    }
  };
  dupe("rules_global", rules.map((r) => r.ruleId));
  dupe("professions", professions.map((p) => p.id));
  dupe("expense_base", baseExpenses.map((e) => e.id));
  dupe("expense_by_profession", professionExpenses.map((e) => e.id));

  const professionIds = new Set(professions.map((p) => p.id));
  for (const e of professionExpenses) {
    if (!professionIds.has(e.professionId)) {
      errors.push(`expense ${e.id} references unknown profession_id ${e.professionId}`);
    }
  }

  const checkFraction = (label: string, v: number | null) => {
    if (v !== null && (v < 0 || v > 1.3)) {
      // allow a little headroom (e.g. foreign "preferred country" 125% surcharges), but flag wild values
      errors.push(`${label}: fraction out of expected range: ${v}`);
    }
  };
  for (const r of rules) {
    checkFraction(`rules_global ${r.ruleId} income`, r.incomeTaxFraction);
    checkFraction(`rules_global ${r.ruleId} vat`, r.vatFraction);
  }

  if (errors.length > 0) {
    console.error("Validation failed:\n" + errors.map((e) => `  - ${e}`).join("\n"));
    process.exit(1);
  }

  const dataset = {
    datasetYear: 2026,
    generatedAt: process.env.EXPENSE_ENGINE_GENERATED_AT ?? "2026-08-11",
    rules,
    professions,
    baseExpenses,
    professionExpenses,
    depreciation,
    nonDeductible,
  };

  const body = JSON.stringify(dataset, null, 2)
    // Un-quote the discriminant-friendly `kind` keys' sibling literal-typed fields is unnecessary;
    // JSON output is valid as a TS object literal as-is.
    .replace(/"rateCertainty": "legal"/g, '"rateCertainty": "legal" as const');

  const out = `/**
 * GENERATED FILE — do not edit by hand.
 * Source: data/expense-recognition/2026.xlsx
 * Regenerate: npm run gen:expense-data (scripts/expense-engine/generate.ts)
 */
import type { ExpenseDataset } from "../types";

export const DATASET_2026: ExpenseDataset = ${body};
`;

  writeFileSync(OUT_PATH, out, "utf-8");
  console.log(
    `wrote ${OUT_PATH}\n` +
      `  rules_global: ${rules.length}\n` +
      `  professions: ${professions.length}\n` +
      `  expense_base: ${baseExpenses.length}\n` +
      `  expense_by_profession: ${professionExpenses.length}\n` +
      `  depreciation: ${depreciation.length}\n` +
      `  non_deductible: ${nonDeductible.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
