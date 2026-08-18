"use client";

import { useMemo, useState } from "react";
import { Persona } from "@/lib/persona";
import {
  buildForecast,
  planVsActual,
  type ForecastBasis,
} from "@/lib/forecast/index";
import { TrendingUpIcon } from "@/components/brand/icons";
import { LegalNote } from "@/components/brand/legal-note";
import { ils } from "@/lib/utils";

const BASIS_META: Record<ForecastBasis, { label: string; hint: string }> = {
  strong: { label: "חודש חזק", hint: "הקרנה זהירה־כלפי־מעלה — משלמים יותר עכשיו, פחות הפתעות בסוף השנה" },
  average: { label: "ממוצע", hint: "הקרנה לפי ממוצע החודשים הפעילים" },
  weak: { label: "חודש חלש", hint: "הקרנה שמרנית — מתאימה אם צפויה האטה" },
};

const TONE_STYLES = {
  ok: { box: "border-success/40 bg-success-light", text: "text-success" },
  under: { box: "border-alert/40 bg-overdue-bg", text: "text-alert" },
  over: { box: "border-teal-100 bg-info", text: "text-brand-navy" },
} as const;

const fmt = (n: number) => ils(Math.round(n));

const MONTH_NAMES_FULL = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export function ForecastCard({ persona }: { persona: Persona }) {
  const [basis, setBasis] = useState<ForecastBasis>("average");
  const forecast = useMemo(() => buildForecast(persona), [persona]);

  const scenario = forecast.scenarios[basis];
  const pva = planVsActual(scenario, forecast.paidMikdamot);
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
          אין עדיין מספיק פילוח חודשי אמיתי כדי להבדיל בין חודש חזק לחלש — התחזית מבוססת על
          פריסה אחידה של המחזור השנתי. העלאת חשבוניות מתוארכות תחדד אותה.
        </div>
      )}

      {/* Projection figures */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Figure label="הקרנה חודשית" value={fmt(scenario.monthlyRunRate)} />
        <Figure label="מחזור שנתי צפוי" value={fmt(scenario.projectedAnnualRevenue)} />
        <Figure label="מקדמות שנתיות צפויות" value={fmt(scenario.projectedAdvancesDue)} />
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

      {/* Plan vs actual */}
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

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line-soft bg-cream p-3">
      <div className="text-[11px] text-muted mb-0.5">{label}</div>
      <div className="font-display text-base font-extrabold tabular-nums text-brand-navy">
        {value}
      </div>
    </div>
  );
}
