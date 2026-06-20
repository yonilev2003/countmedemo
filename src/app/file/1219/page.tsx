"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadPersona } from "@/lib/setup-storage";
import { Persona } from "@/lib/persona";
import { calculate } from "@/lib/calculators";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { ArrowRightIcon, SparklesIcon } from "@/components/brand/icons";
import { Form1219Preview } from "@/components/form-1219/form-preview";
import { CountUp } from "@/components/brand/motion";

const ils = (n: number) => `${Math.round(n).toLocaleString("he-IL")} ₪`;

export default function Form1219Page() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const p = loadPersona();
    if (!p) {
      router.push("/setup");
      return;
    }
    setPersona(p);
    setHydrated(true);
  }, [router]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-full max-w-screen-md px-6 animate-pulse space-y-4">
          <div className="h-8 w-56 mx-auto rounded-lg bg-sand" />
          <div className="h-96 rounded-2xl bg-sand" />
        </div>
      </div>
    );
  }

  const p = persona!;
  const hasDeclaration = !!p.capitalDeclaration && p.capitalDeclaration.assets.length > 0;
  const netCapital = Number(calculate("capital-net", p)?.value) || 0;
  const totalAssets = Number(calculate("capital-total-assets", p)?.value) || 0;
  const totalLiabilities = Number(calculate("capital-total-liabilities", p)?.value) || 0;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={36} />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/coach" className={btn("ghost", "sm")}>
              <SparklesIcon className="size-4" />
              שאל/י את איתן
            </Link>
            <Link href="/file" className={btn("ghost", "sm")}>
              חזרה למסלולים
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-screen-lg px-6 py-10">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-brand-navy mb-2">
            הצהרת הון — טופס 1219
          </h1>
          <p className="text-muted max-w-xl mx-auto">
            רשות המסים משווה בין שתי הצהרות הון כדי לוודא שהשינוי בשווי הנקי מוסבר
            בהכנסות שדווחו. countme מסכם את הנכסים וההתחייבויות שלך ומראה כל מקור.
          </p>
        </div>

        {!hasDeclaration ? (
          <div className="rounded-2xl border border-line bg-paper p-8 text-center shadow-brand">
            <p className="text-brand-navy font-semibold mb-2">
              עדיין לא הזנת נתוני הון
            </p>
            <p className="text-sm text-muted mb-5">
              כדי שנמלא עבורך את טופס 1219, הוסף/י את הנכסים וההתחייבויות שלך.
            </p>
            <Link href="/setup/assets" className={btn("primary", "sm")}>
              להוספת נתוני הון
            </Link>
          </div>
        ) : (
          <>
            {/* Net-capital highlight */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-6">
              <SummaryStat label="סך נכסים" value={totalAssets} tone="navy" />
              <SummaryStat label="סך התחייבויות" value={totalLiabilities} tone="muted" />
              <SummaryStat label="הון נקי" value={netCapital} tone="gold" />
            </div>

            {/* The form in the countme beige frame (signals "this is countme, not gov.il") */}
            <div
              className="rounded-lg p-2 sm:p-3"
              style={{ border: "3px dashed #C8B59A", background: "#fbfaf8" }}
            >
              <Form1219Preview persona={p} />
            </div>

            <p className="mt-4 text-center text-xs text-faint">
              לחצו על כל ערך מחושב כדי לראות מאילו פריטים הוא מורכב ·{" "}
              <Link href="/setup/assets" className="text-brand-deep hover:underline">
                עריכת נתוני הון
              </Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "navy" | "muted" | "gold";
}) {
  const toneCls =
    tone === "gold"
      ? "border-brand/60 bg-beige-100"
      : tone === "navy"
        ? "border-brand-navy/20 bg-paper"
        : "border-line bg-paper";
  return (
    <div className={`rounded-xl border p-4 text-center shadow-sm ${toneCls}`}>
      <div className="text-xs font-semibold text-muted mb-1">{label}</div>
      <CountUp
        value={value}
        format={ils}
        className="text-xl font-extrabold text-brand-navy"
      />
    </div>
  );
}
