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

// Brand palette for the pie slices (navy → teal → beige → aqua → terracotta).
const COLORS = ["#083A4F", "#407E8C", "#C8B59A", "#C0D5D6", "#C05B45"];
const GRID_STROKE = "#E7E2DA"; // --color-line
const AXIS_TICK = "#6A7A80"; // --color-muted
const NAVY = "#083A4F"; // brand-navy
const TEAL = "#407E8C"; // brand-deep (teal)
const PAPER = "#FBFAF8"; // --color-paper (pie slice divider)

interface Props {
  monthlyData: MonthlyPL[];
  expenseBreakdown: PLSummary["expenseBreakdown"];
}

function formatShekels(v: number) {
  return `₪${(v / 1000).toFixed(0)}K`;
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
                border: "1px solid #E7E2DA",
                boxShadow: "0 12px 28px -16px rgba(8,40,55,.18)",
                fontSize: 12,
              }}
              labelStyle={{ color: "#083A4F", fontWeight: 700 }}
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
                  border: "1px solid #E7E2DA",
                  boxShadow: "0 12px 28px -16px rgba(8,40,55,.18)",
                  fontSize: 12,
                }}
                labelStyle={{ color: "#083A4F", fontWeight: 700 }}
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
