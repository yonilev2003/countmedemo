"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { MonthlyPL, PLSummary } from "@/lib/p-and-l/index";
import { BarChartIcon, PieChartIcon } from "@/components/brand/icons";
import { BRAND_COLORS } from "@/components/brand/colors";
import { formatNumber } from "@/lib/utils";

// Brand palette for the pie slices (navy → teal → beige → aqua → terracotta).
const COLORS = [
  BRAND_COLORS.navy,
  BRAND_COLORS.teal,
  BRAND_COLORS.beige,
  BRAND_COLORS.aqua,
  BRAND_COLORS.alert,
];
const GRID_STROKE = BRAND_COLORS.line;
const AXIS_TICK = BRAND_COLORS.muted;
const NAVY = BRAND_COLORS.navy;
const TEAL = BRAND_COLORS.teal;
const PAPER = BRAND_COLORS.paper; // pie slice divider

interface Props {
  monthlyData: MonthlyPL[];
  expenseBreakdown: PLSummary["expenseBreakdown"];
}

function formatShekels(v: number) {
  // Grouped even though month totals are realistically <1000K today — cheap
  // to make correct now rather than revisit if a persona ever spikes.
  return `₪${formatNumber(Math.round(v / 1000))}K`;
}

export function PLChart({ monthlyData, expenseBreakdown }: Props) {
  return (
    <div className="space-y-6">
      {/* Monthly bar chart */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-teal-100 text-brand-deep">
              <BarChartIcon className="size-[18px]" />
            </span>
            <h3 className="text-base font-bold text-brand-navy">
              הכנסות והוצאות לפי חודש
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-faint">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-brand-navy" /> הכנסות
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-brand-deep" /> הוצאות
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={monthlyData}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <defs>
              {/* Mockup finance bars: vertical teal→navy gradient */}
              <linearGradient id="barRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={TEAL} />
                <stop offset="1" stopColor={NAVY} />
              </linearGradient>
              <linearGradient id="barExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={TEAL} stopOpacity={0.85} />
                <stop offset="1" stopColor={TEAL} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: AXIS_TICK }}
              stroke={GRID_STROKE}
            />
            <YAxis
              tickFormatter={formatShekels}
              tick={{ fontSize: 11, fill: AXIS_TICK }}
              stroke={GRID_STROKE}
            />
            <Tooltip
              cursor={{ fill: "rgba(8,40,55,.04)" }}
              contentStyle={{
                borderRadius: 12,
                border: `1px solid ${BRAND_COLORS.line}`,
                boxShadow: "0 12px 28px -16px rgba(8,40,55,.18)",
                fontSize: 12,
              }}
              labelStyle={{ color: BRAND_COLORS.navy, fontWeight: 700 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) =>
                typeof v === "number" ? `₪${v.toLocaleString("he-IL")}` : String(v ?? "")
              }
            />
            <Bar
              dataKey="revenue"
              name="הכנסות"
              fill="url(#barRevenue)"
              radius={[7, 7, 4, 4]}
              maxBarSize={34}
            />
            <Bar
              dataKey="expenses"
              name="הוצאות"
              fill="url(#barExpense)"
              radius={[7, 7, 4, 4]}
              maxBarSize={34}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expense pie chart */}
      <div className="border-t border-line-soft pt-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-beige-100 text-beige-600">
            <PieChartIcon className="size-[18px]" />
          </span>
          <h3 className="text-base font-bold text-brand-navy">
            התפלגות הוצאות
          </h3>
        </div>
        <div className="flex gap-6 items-center">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={expenseBreakdown}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={70}
                paddingAngle={2}
                stroke={PAPER}
                strokeWidth={2}
              >
                {expenseBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: `1px solid ${BRAND_COLORS.line}`,
                  boxShadow: "0 12px 28px -16px rgba(8,40,55,.18)",
                  fontSize: 12,
                }}
                labelStyle={{ color: BRAND_COLORS.navy, fontWeight: 700 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) =>
                  typeof v === "number" ? `₪${v.toLocaleString("he-IL")}` : String(v ?? "")
                }
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2.5">
            {expenseBreakdown.map((item, i) => (
              <div
                key={item.category}
                className="flex items-center justify-between gap-3 text-[13px]"
              >
                <span className="flex items-center gap-2 font-semibold text-ink">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  {item.category}
                </span>
                <span className="font-display font-extrabold tabular-nums text-brand-navy">
                  ₪{item.amount.toLocaleString("he-IL")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
