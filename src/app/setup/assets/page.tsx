"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { persistPersona } from "@/lib/data/persona-store";
import type {
  Persona,
  AssetItem,
  LiabilityItem,
  AssetCategory,
  LiabilityCategory,
} from "@/lib/persona";
import { ASSET_CATEGORY_HE, LIABILITY_CATEGORY_HE } from "@/lib/calculators/capital";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ArrowRightIcon } from "@/components/brand/icons";
import { ils as formatIls } from "@/lib/utils";

const ils = (n: number) => formatIls(Math.round(n));
const ASSET_CATS = Object.keys(ASSET_CATEGORY_HE) as AssetCategory[];
const LIAB_CATS = Object.keys(LIABILITY_CATEGORY_HE) as LiabilityCategory[];

type Row = { category: string; description: string; value: string; evidence: string };

const emptyAsset: Row = { category: "cash-and-deposits", description: "", value: "", evidence: "" };
const emptyLiab: Row = { category: "mortgage", description: "", value: "", evidence: "" };

export default function AssetsCapturePage() {
  const router = useRouter();
  const { persona, setPersona } = useRequiredPersona();
  const [hydrated, setHydrated] = useState(false);
  const [declarationDate, setDeclarationDate] = useState("");
  const [assets, setAssets] = useState<Row[]>([]);
  const [liabilities, setLiabilities] = useState<Row[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!persona) return;
    const cd = persona.capitalDeclaration;
    setDeclarationDate(cd?.declarationDate ?? new Date().toISOString().slice(0, 10));
    setAssets(
      (cd?.assets ?? []).map((a) => ({
        category: a.category,
        description: a.description,
        value: String(a.value),
        evidence: a.evidence ?? "",
      })),
    );
    setLiabilities(
      (cd?.liabilities ?? []).map((l) => ({
        category: l.category,
        description: l.description,
        value: String(l.value),
        evidence: l.evidence ?? "",
      })),
    );
    setHydrated(true);
  }, [persona]);

  const totalAssets = assets.reduce((s, r) => s + (Number(r.value) || 0), 0);
  const totalLiab = liabilities.reduce((s, r) => s + (Number(r.value) || 0), 0);
  const net = totalAssets - totalLiab;

  function save(thenGoTo?: string) {
    if (!persona) return;
    const cleanAssets: AssetItem[] = assets
      .filter((r) => Number(r.value) > 0)
      .map((r) => ({
        category: r.category as AssetCategory,
        description: r.description.trim() || ASSET_CATEGORY_HE[r.category as AssetCategory],
        value: Number(r.value),
        evidence: r.evidence.trim() || undefined,
      }));
    const cleanLiab: LiabilityItem[] = liabilities
      .filter((r) => Number(r.value) > 0)
      .map((r) => ({
        category: r.category as LiabilityCategory,
        description: r.description.trim() || LIABILITY_CATEGORY_HE[r.category as LiabilityCategory],
        value: Number(r.value),
        evidence: r.evidence.trim() || undefined,
      }));
    const next: Persona = {
      ...persona,
      capitalDeclaration: {
        declarationDate: declarationDate || new Date().toISOString().slice(0, 10),
        assets: cleanAssets,
        liabilities: cleanLiab,
      },
    };
    persistPersona(next);
    setPersona(next);
    setSaved(true);
    if (thenGoTo) router.push(thenGoTo);
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-full max-w-screen-md px-6 animate-pulse space-y-4">
          <div className="h-8 w-56 mx-auto rounded-lg bg-sand" />
          <div className="h-72 rounded-2xl bg-sand" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={36} />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/file/1219" className={btn("ghost", "sm")}>
              לטופס 1219
              <ArrowRightIcon className="size-4" />
            </Link>
            <div className="border-s border-line ps-2">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-screen-md px-6 py-10">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-brand-navy mb-2">
            נתוני הון — נכסים והתחייבויות
          </h1>
          <p className="text-muted">
            הזן/י את מה שיש ומה שחייבים נכון לתאריך ההצהרה. אנחנו מסכמים להון נקי
            ומראים כל מקור — לא מייעצים.
          </p>
        </div>

        {/* Declaration date */}
        <div className="mb-6 rounded-xl border border-line bg-paper p-4">
          <label htmlFor="decl-date" className="block text-sm font-semibold text-brand-navy mb-1.5">
            תאריך ההצהרה
          </label>
          <input
            id="decl-date"
            type="date"
            value={declarationDate}
            onChange={(e) => setDeclarationDate(e.target.value)}
            dir="ltr"
            className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-sm"
          />
        </div>

        <RowEditor
          title="נכסים"
          rows={assets}
          setRows={setAssets}
          categories={ASSET_CATS}
          catLabels={ASSET_CATEGORY_HE}
          template={emptyAsset}
          addLabel="+ הוסף/י נכס"
        />

        <RowEditor
          title="התחייבויות"
          rows={liabilities}
          setRows={setLiabilities}
          categories={LIAB_CATS}
          catLabels={LIABILITY_CATEGORY_HE}
          template={emptyLiab}
          addLabel="+ הוסף/י התחייבות"
        />

        {/* Live totals */}
        <div className="sticky bottom-0 mt-6 rounded-2xl border border-brand/40 bg-beige-100 p-4 shadow-brand">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">סך נכסים</span>
            <span className="font-bold text-brand-navy" style={{ fontVariantNumeric: "tabular-nums" }}>
              {ils(totalAssets)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted">סך התחייבויות</span>
            <span className="font-bold text-brand-navy" style={{ fontVariantNumeric: "tabular-nums" }}>
              {ils(totalLiab)}
            </span>
          </div>
          <div className="mt-2 border-t border-brand/30 pt-2 flex items-center justify-between">
            <span className="font-semibold text-brand-navy">הון נקי</span>
            <span className="text-xl font-extrabold text-brand-navy" style={{ fontVariantNumeric: "tabular-nums" }}>
              {ils(net)}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button onClick={() => save()} className={btn("ghost", "sm")}>
              {saved ? "נשמר ✓" : "שמירה"}
            </button>
            <button onClick={() => save("/file/1219")} className={btn("primary", "sm")}>
              שמירה וצפייה בטופס 1219
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function RowEditor({
  title,
  rows,
  setRows,
  categories,
  catLabels,
  template,
  addLabel,
}: {
  title: string;
  rows: Row[];
  setRows: (r: Row[]) => void;
  categories: string[];
  catLabels: Record<string, string>;
  template: Row;
  addLabel: string;
}) {
  function update(i: number, patch: Partial<Row>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-lg font-bold text-brand-navy">{title}</h2>
        <button
          type="button"
          onClick={() => setRows([...rows, { ...template }])}
          className="text-sm font-medium text-brand-deep hover:underline"
        >
          {addLabel}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-faint py-2">לא הוזנו פריטים</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-paper p-3 sm:grid-cols-[1.1fr_1.4fr_0.9fr_auto]"
            >
              <select
                value={r.category}
                onChange={(e) => update(i, { category: e.target.value })}
                className="rounded-lg border border-line bg-cream px-2 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {catLabels[c]}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="תיאור (למשל: דירה בת״א)"
                value={r.description}
                onChange={(e) => update(i, { description: e.target.value })}
                className="rounded-lg border border-line bg-cream px-2 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="₪"
                value={r.value}
                onChange={(e) => update(i, { value: e.target.value })}
                dir="ltr"
                className="rounded-lg border border-line bg-cream px-2 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                className="text-xs text-alert hover:underline px-2"
                aria-label="הסר/י פריט"
              >
                הסר
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
