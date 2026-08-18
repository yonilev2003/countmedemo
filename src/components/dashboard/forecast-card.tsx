"use client";

import { useMemo, useState } from "react";
import { Persona, MikdamotPlan } from "@/lib/persona";
import {
  buildForecast,
  planVsActual,
  type ForecastBasis,
} from "@/lib/forecast/index";
import { persistPersona } from "@/lib/data/persona-store";
import { TrendingUpIcon } from "@/components/brand/icons";
import { LegalNote } from "@/components/brand/legal-note";
import { ils, numberInputWheelGuard } from "@/lib/utils";
import { btn } from "@/components/brand/button";

const BASIS_META: Record<ForecastBasis, { label: string; hint: string }> = {
  strong: { label: "חודש חזק", hint: "הקרנה זהירה־כלפי־מעלה — משלמים יותר עכשיו, פחות הפתעות בסוף השנה" },
  average: { label: "ממוצע", hint: "הקרנה לפי ממוצע החודשים הפעילים" },
  weak: { label: "חודש חלש", hint: "הקרנה שמרנית — מתאימה אם צפויה האטה" },
};

const TONE_STYLES = {
  ok: { box: "border-success/40 bg-success-light", text: "text-success" },
  under: { box: "border-alert/40 bg-overdue-bg", text: "text-alert" },
  over: { box: "border-teal-100 bg-info", text: "text-brand-navy" },
  neutral: { box: "border-line bg-cream", text: "text-muted" },
} as const;

const fmt = (n: number) => ils(Math.round(n));

const MONTH_NAMES_FULL = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export function ForecastCard({
  persona,
  onPersonaUpdate,
}: {
  persona: Persona;
  /** Called after the advances plan is saved, so the parent page's persona
   *  state (and every card reading it) picks up the change immediately. */
  onPersonaUpdate?: (persona: Persona) => void;
}) {
  const [basis, setBasis] = useState<ForecastBasis>("average");
  const forecast = useMemo(() => buildForecast(persona), [persona]);

  const scenario = forecast.scenarios[basis];
  const hasPlan = !!forecast.planComparison;
  const pva = planVsActual(scenario, forecast.paidMikdamot, hasPlan);
  const tone = TONE_STYLES[pva.tone];

  return (
    <section className="rounded-2xl border border-line bg-paper p-5 shadow-brand">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-teal-100 text-brand-deep">
            <TrendingUpIcon className="size-5" />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold text-brand-navy">
              תכנון מול ביצוע — מקדמות
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {forecast.yearIsComplete
                ? `שנת ${persona.income.year} הסתיימה — אלו הנתונים בפועל, לא הקרנה.`
                : `תחזית קדימה על בסיס ${forecast.monthsElapsed} החודשים שחלפו השנה. על איזה חודש לחשב?`}
            </p>
          </div>
        </div>
        {/* Strong / average / weak basis toggle — the "ask strong or weak" dialog */}
        <div className="flex gap-1 rounded-full bg-cream p-1">
          {(["strong", "average", "weak"] as ForecastBasis[]).map((b) => (
            <button
              key={b}
              onClick={() => setBasis(b)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                basis === b
                  ? "bg-paper text-brand-navy shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              {BASIS_META[b].label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-faint">{BASIS_META[basis].hint}</p>

      {!forecast.hasEnoughData && (
        <div className="mt-3 rounded-xl border border-due/40 bg-due-bg px-3 py-2 text-[11px] text-due-ink">
          התחזית מבוססת על הקצב החודשי הממוצע של {forecast.monthsElapsed} החודשים שחלפו השנה —
          אין עדיין מספיק חשבוניות מתוארכות כדי לפצל בין חודש חזק לחלש. העלאת חשבוניות מתוארכות
          תחדד את הפילוח.
        </div>
      )}

      {/* Projection figures */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Figure label="הקרנה חודשית" value={fmt(scenario.monthlyRunRate)} />
        <Figure label="מחזור שנתי צפוי" value={fmt(scenario.projectedAnnualRevenue)} />
        <Figure
          label="מקדמות שנתיות צפויות"
          value={fmt(scenario.projectedAdvancesDue)}
          sub="לפי התחזית השנתית"
        />
        <Figure label="מקדמה חודשית לפי התחזית" value={fmt(scenario.recommendedMonthlyMikdama)} />
      </div>

      {/* Proactive ceiling-crossing projection (Yoni, 18/08): "צפי" and
          "הכנסה" are different things — a run-rate that implies crossing
          the עוסק פטור/זעיר ceiling later this year is exactly the kind of
          forward warning a YTD-only number can't give on its own. */}
      {forecast.projectedCeilingCrossingMonth && (
        <div className="mt-3 rounded-xl border border-due/40 bg-due-bg px-3 py-2 text-[11px] text-due-ink">
          בקצב הנוכחי, המחזור צפוי לחצות את התקרה במהלך{" "}
          <b>{MONTH_NAMES_FULL[forecast.projectedCeilingCrossingMonth - 1]}</b> — כדאי להתחיל להיערך
          למעבר לעוסק מורשה מבעוד מועד.
        </div>
      )}

      {/* Plan vs actual (basis-scenario comparison) */}
      <div className={`mt-4 rounded-xl border px-4 py-3 ${tone.box}`}>
        <div className={`text-sm font-bold ${tone.text}`}>{pva.headlineHe}</div>
        <div className="mt-1 text-xs text-muted">{pva.detailHe}</div>
        <div className="mt-2 flex items-center gap-4 text-[11px] text-muted">
          <span>תחזית: <b className="text-ink tabular-nums">{fmt(pva.due)}</b></span>
          <span>שולם בפועל: <b className="text-ink tabular-nums">{fmt(pva.paid)}</b></span>
          <span>
            פער: <b className={`${tone.text} tabular-nums`}>{pva.gap >= 0 ? "" : "−"}{fmt(Math.abs(pva.gap))}</b>
          </span>
        </div>
      </div>

      {/* Strong / weak month context */}
      {forecast.hasEnoughData && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted">
          <span>
            חודשים חזקים:{" "}
            <b className="text-ink">
              {forecast.strongMonths.map((m) => m.label).join(", ")}
            </b>
          </span>
          <span>
            חודשים חלשים:{" "}
            <b className="text-ink">
              {forecast.weakMonths.map((m) => m.label).join(", ")}
            </b>
          </span>
        </div>
      )}

      {/* תכנון מקדמות — the advances-plan mechanic (task #24) */}
      <div className="mt-4">
        <AdvancesPlanBlock persona={persona} onPersonaUpdate={onPersonaUpdate} />
      </div>

      {/* WS8 audit K1 — shared estimate note + the factual "who sets the real number" */}
      <div className="mt-3">
        <LegalNote variant="estimate" />
        <p className="mt-0.5 text-[10px] text-faint leading-relaxed">
          המקדמות בפועל נקבעות ע״י רשות המסים לפי שיעור מקדמה שנתי; התחזית כאן מבוססת על תכנון
          ההכנסה הצפויה.
        </p>
      </div>
    </section>
  );
}

function Figure({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line-soft bg-cream p-3">
      <div className="text-[11px] text-muted mb-0.5">{label}</div>
      <div className="font-display text-base font-extrabold tabular-nums text-brand-navy">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[10px] text-faint">{sub}</div>}
    </div>
  );
}

const SETTLEMENT_DISCLAIMER =
  "האומדן אינו כולל ריביות, הצמדות וקנסות — הסכום הסופי נקבע בשומה.";

function settlementLine(estimate: { balance: number; direction: "due" | "refund" | "even" }): {
  headline: string;
  tone: "under" | "over" | "ok";
} {
  if (estimate.direction === "due") {
    return {
      headline: `צפוי הפרש לתשלום בסוף השנה: ${fmt(Math.abs(estimate.balance))}, בתוספת הצמדה`,
      tone: "under",
    };
  }
  if (estimate.direction === "refund") {
    return {
      headline: `צפוי החזר בסוף השנה: ${fmt(Math.abs(estimate.balance))}, כולל הצמדה וריבית ככל שזכאי/ת`,
      tone: "over",
    };
  }
  return { headline: "התשלומים בקנה אחד עם התחזית — לא צפוי הפרש משמעותי בסוף השנה", tone: "ok" };
}

/** Blank/edit form state — strings so the inputs can be empty, parsed to
 *  numbers only on save. */
interface PlanFormState {
  plannedAnnualRevenue: string;
  plannedAnnualExpenses: string;
  monthlyAdvance: string;
  setBy: "user" | "authority";
}

function planToFormState(plan?: MikdamotPlan): PlanFormState {
  return {
    plannedAnnualRevenue: plan?.plannedAnnualRevenue != null ? String(plan.plannedAnnualRevenue) : "",
    plannedAnnualExpenses: plan?.plannedAnnualExpenses != null ? String(plan.plannedAnnualExpenses) : "",
    monthlyAdvance: plan?.monthlyAdvance != null ? String(plan.monthlyAdvance) : "",
    setBy: plan?.setBy ?? "user",
  };
}

function AdvancesPlanBlock({
  persona,
  onPersonaUpdate,
}: {
  persona: Persona;
  onPersonaUpdate?: (persona: Persona) => void;
}) {
  const forecast = useMemo(() => buildForecast(persona), [persona]);
  const plan = forecast.planComparison;
  const [editing, setEditing] = useState(!plan);
  const [form, setForm] = useState<PlanFormState>(() => planToFormState(plan?.plan));
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setForm(planToFormState(plan?.plan));
    setEditing(true);
  }

  async function save() {
    const parsed = (s: string) => (s.trim() === "" ? undefined : Number(s));
    const nextPlan: MikdamotPlan = {
      plannedAnnualRevenue: parsed(form.plannedAnnualRevenue),
      plannedAnnualExpenses: parsed(form.plannedAnnualExpenses),
      monthlyAdvance: parsed(form.monthlyAdvance),
      setBy: form.setBy,
    };
    // Nothing usable entered — don't save an empty plan.
    if (
      nextPlan.plannedAnnualRevenue == null &&
      nextPlan.plannedAnnualExpenses == null &&
      nextPlan.monthlyAdvance == null
    ) {
      return;
    }
    setSaving(true);
    const updated: Persona = {
      ...persona,
      income: { ...persona.income, mikdamotPlan: nextPlan },
    };
    try {
      await persistPersona(updated);
      onPersonaUpdate?.(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-line-soft bg-cream p-4">
        <div className="text-sm font-bold text-brand-navy">תכנון מקדמות</div>
        <p className="mt-0.5 text-[11px] text-muted leading-relaxed">
          תכנון שנתי של הכנסות/הוצאות והמקדמה החודשית ששולמת בפועל לאורך השנה — כמו הדיווח שמגישים
          לרשות המסים, או השיעור שהיא קובעת עבורך.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-muted">
            הכנסות מתוכננות לשנה
            <input
              type="number"
              inputMode="numeric"
              value={form.plannedAnnualRevenue}
              onChange={(e) => setForm((f) => ({ ...f, plannedAnnualRevenue: e.target.value }))}
              onWheel={numberInputWheelGuard}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm font-normal text-ink"
              placeholder="0"
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            הוצאות מתוכננות לשנה
            <input
              type="number"
              inputMode="numeric"
              value={form.plannedAnnualExpenses}
              onChange={(e) => setForm((f) => ({ ...f, plannedAnnualExpenses: e.target.value }))}
              onWheel={numberInputWheelGuard}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm font-normal text-ink"
              placeholder="0"
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            מקדמה חודשית מתוכננת
            <input
              type="number"
              inputMode="numeric"
              value={form.monthlyAdvance}
              onChange={(e) => setForm((f) => ({ ...f, monthlyAdvance: e.target.value }))}
              onWheel={numberInputWheelGuard}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm font-normal text-ink"
              placeholder="0"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted">מי קבע את השיעור:</span>
          {(["user", "authority"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setForm((f) => ({ ...f, setBy: v }))}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                form.setBy === v
                  ? "bg-brand-navy text-white"
                  : "bg-paper border border-line text-muted hover:border-brand-deep"
              }`}
            >
              {v === "user" ? "קבעתי בעצמי" : "נקבע ע\"י רשות המסים"}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={save} disabled={saving} className={btn("primary", "sm")}>
            {saving ? "שומר…" : "שמירת תוכנית מקדמות"}
          </button>
          {plan && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={btn("ghost", "sm")}
            >
              ביטול
            </button>
          )}
        </div>
      </div>
    );
  }

  // plan is guaranteed non-null here (editing is forced true when !plan).
  const p = plan!;
  const primarySettlement = p.yearEndSettlement.planBasis ?? p.yearEndSettlement.actualBasis;
  const primaryLine = settlementLine(primarySettlement);
  const primaryTone = TONE_STYLES[primaryLine.tone];

  return (
    <div className="rounded-xl border border-line-soft bg-cream p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-brand-navy">תכנון מקדמות</div>
        <button type="button" onClick={startEdit} className="text-[11px] font-bold text-brand-deep hover:underline">
          עדכון תוכנית
        </button>
      </div>

      {/* Comparison rows: מתוכנן / לפי התחזית / שולם בפועל */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <PlanRow label="מתוכנן" value={p.plannedMonthlyAdvance != null ? fmt(p.plannedMonthlyAdvance) : "לא הוגדר"} />
        <PlanRow label="לפי התחזית" value={fmt(p.recommendedMonthlyAdvance)} />
        <PlanRow label="שולם בפועל" value={fmt(p.paidSoFar)} sub="מתחילת השנה" />
      </div>

      {/* Year-end settlement — primary line (plan basis when present) */}
      <div className={`mt-3 rounded-lg border px-3 py-2.5 ${primaryTone.box}`}>
        <div className={`text-[13px] font-bold ${primaryTone.text}`}>{primaryLine.headline}</div>
        {p.yearEndSettlement.planBasis && (
          <div className="mt-1 text-[11px] text-muted">
            לפי הנתונים בפועל עד כה: {settlementLine(p.yearEndSettlement.actualBasis).headline}
          </div>
        )}
        <p className="mt-1.5 text-[10px] leading-relaxed text-faint">{SETTLEMENT_DISCLAIMER}</p>
      </div>
    </div>
  );
}

function PlanRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-line-soft bg-paper px-3 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="font-display text-sm font-extrabold tabular-nums text-brand-navy">{value}</div>
      {sub && <div className="text-[10px] text-faint">{sub}</div>}
    </div>
  );
}
