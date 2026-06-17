/**
 * Calculators for הצהרת הון (Form 1219) — capital declaration.
 *
 * Pure functions over `persona.capitalDeclaration`. They aggregate the user's own
 * asset/liability entries into the form's subtotals and the bottom-line net
 * capital (הון נקי). Facts, not advice: we sum what the user declared and cite
 * each line as a source; we do NOT opine on valuation (that's flagged to a רו"ח).
 */

import type { Persona } from "@/lib/persona";
import type {
  AssetCategory,
  LiabilityCategory,
  AssetItem,
  LiabilityItem,
} from "@/lib/persona";
import type { Calculator, CalcResult, CalcSource } from "./types";

const ils = (n: number) => `${n.toLocaleString("he-IL")} ₪`;

export const ASSET_CATEGORY_HE: Record<AssetCategory, string> = {
  "cash-and-deposits": "מזומן, עו״ש ופיקדונות",
  securities: "ניירות ערך וקרנות",
  "provident-and-pension": "קופות גמל, קרן השתלמות ופנסיה",
  "real-estate": "נדל״ן",
  vehicles: "כלי רכב",
  "business-capital": "הון בעסק (מלאי, ציוד, לקוחות)",
  "loans-receivable": "הלוואות שניתנו",
  "life-insurance": "ביטוח חיים (ערך פדיון)",
  "personal-property": "מטלטלין, תכשיטים ואומנות",
  "other-assets": "נכסים אחרים",
};

export const LIABILITY_CATEGORY_HE: Record<LiabilityCategory, string> = {
  mortgage: "משכנתא",
  "bank-loan": "הלוואה בנקאית",
  "private-loan": "הלוואה פרטית/מקרוב",
  "credit-balance": "יתרת אשראי וכרטיסים",
  "supplier-debt": "חוב לספקים",
  "other-liability": "התחייבויות אחרות",
};

function declaration(p: Persona) {
  return p.capitalDeclaration ?? {
    declarationDate: "",
    assets: [] as AssetItem[],
    liabilities: [] as LiabilityItem[],
  };
}

function sources(items: { description: string; value: number; evidence?: string }[]): CalcSource[] {
  return items.map((it) => ({
    label: it.description || "פריט",
    detail: `${ils(it.value)}${it.evidence ? ` · ${it.evidence}` : ""}`,
  }));
}

/** Sum of one asset category. */
function assetCategoryCalc(category: AssetCategory): Calculator {
  return (p) => {
    const items = declaration(p).assets.filter((a) => a.category === category);
    const total = items.reduce((s, a) => s + (a.value || 0), 0);
    return {
      value: total,
      formula: `סכום ${items.length} פריטים בקטגוריית "${ASSET_CATEGORY_HE[category]}"`,
      sources: sources(items),
      confidence: items.length > 0 ? "high" : "low",
    };
  };
}

/** Sum of one liability category. */
function liabilityCategoryCalc(category: LiabilityCategory): Calculator {
  return (p) => {
    const items = declaration(p).liabilities.filter((l) => l.category === category);
    const total = items.reduce((s, l) => s + (l.value || 0), 0);
    return {
      value: total,
      formula: `סכום ${items.length} פריטים בקטגוריית "${LIABILITY_CATEGORY_HE[category]}"`,
      sources: sources(items),
      confidence: items.length > 0 ? "high" : "low",
    };
  };
}

const capitalTotalAssets: Calculator = (p): CalcResult => {
  const assets = declaration(p).assets;
  const total = assets.reduce((s, a) => s + (a.value || 0), 0);
  return {
    value: total,
    formula: "סכום כל הנכסים המוצהרים",
    sources: sources(assets),
    confidence: assets.length > 0 ? "high" : "low",
  };
};

const capitalTotalLiabilities: Calculator = (p): CalcResult => {
  const liabilities = declaration(p).liabilities;
  const total = liabilities.reduce((s, l) => s + (l.value || 0), 0);
  return {
    value: total,
    formula: "סכום כל ההתחייבויות המוצהרות",
    sources: sources(liabilities),
    confidence: liabilities.length > 0 ? "high" : "low",
  };
};

const capitalNet: Calculator = (p): CalcResult => {
  const d = declaration(p);
  const assets = d.assets.reduce((s, a) => s + (a.value || 0), 0);
  const liabilities = d.liabilities.reduce((s, l) => s + (l.value || 0), 0);
  return {
    value: assets - liabilities,
    formula: `סך נכסים (${ils(assets)}) − סך התחייבויות (${ils(liabilities)})`,
    sources: [
      { label: "סך נכסים", detail: ils(assets) },
      { label: "סך התחייבויות", detail: ils(liabilities) },
    ],
    confidence: d.assets.length > 0 ? "high" : "low",
    notes: [
      "הון נקי = נכסים פחות התחייבויות לפי מה שהזנת. כללי שומה והערכת שווי — לאימות מול רואה/ת חשבון.",
    ],
  };
};

/** 1219 calculators, registered into the shared map in calculators/index.ts. */
export const capitalCalculators: Record<string, Calculator> = {
  "capital-total-assets": capitalTotalAssets,
  "capital-total-liabilities": capitalTotalLiabilities,
  "capital-net": capitalNet,
  // Per-category subtotals (the ones the 1219 schema references).
  "capital-asset-cash-and-deposits": assetCategoryCalc("cash-and-deposits"),
  "capital-asset-securities": assetCategoryCalc("securities"),
  "capital-asset-provident-and-pension": assetCategoryCalc("provident-and-pension"),
  "capital-asset-real-estate": assetCategoryCalc("real-estate"),
  "capital-asset-vehicles": assetCategoryCalc("vehicles"),
  "capital-asset-business-capital": assetCategoryCalc("business-capital"),
  "capital-asset-loans-receivable": assetCategoryCalc("loans-receivable"),
  "capital-asset-life-insurance": assetCategoryCalc("life-insurance"),
  "capital-asset-personal-property": assetCategoryCalc("personal-property"),
  "capital-asset-other-assets": assetCategoryCalc("other-assets"),
  "capital-liability-mortgage": liabilityCategoryCalc("mortgage"),
  "capital-liability-bank-loan": liabilityCategoryCalc("bank-loan"),
  "capital-liability-private-loan": liabilityCategoryCalc("private-loan"),
  "capital-liability-credit-balance": liabilityCategoryCalc("credit-balance"),
  "capital-liability-supplier-debt": liabilityCategoryCalc("supplier-debt"),
  "capital-liability-other-liability": liabilityCategoryCalc("other-liability"),
};
