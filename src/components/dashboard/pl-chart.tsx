"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { MonthlyPL, PLSummary } from "@/lib/p-and-l/index";

// Brand palette for the pie slices (navy → teal → beige → aqua → terracotta).
const COLORS = ["#083A4F", "#407E8C", "#C8B59A", "#C0D5D6", "#C05B45"];
const GRID_STROKE = "#E7E2DA"; // --color-line
const AXIS_TICK = "#6A7A80"; // --color-muted
const REVENUE_FILL = "#083A4F"; // brand-navy
const EXPENSE_FILL = "#407E8C"; // brand-deep (teal)

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
        <h3 className="text-sm font-semibold text-brand-navy mb-3">
          הכנסות והוצאות לפי חודש
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={monthlyData}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
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
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="revenue"
              name="הכנסות"
              fill={REVENUE_FILL}
              radius={[7, 7, 0, 0]}
            />
            <Bar
              dataKey="expenses"
              name="הוצאות"
              fill={EXPENSE_FILL}
              radius={[7, 7, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expense pie chart */}
      <div>
        <h3 className="text-sm font-semibold text-brand-navy mb-3">
          התפלגות הוצאות
        </h3>
        <div className="flex gap-6 items-center">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={expenseBreakdown}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={70}
                stroke="#FBFAF8"
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
          <div className="space-y-1.5">
            {expenseBreakdown.map((item, i) => (
              <div key={item.category} className="flex items-center gap-2 text-xs">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-muted">{item.category}</span>
                <span className="font-medium text-brand-navy">
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
