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

const COLORS = ["#0D3B66", "#9FB878", "#D2E8FF", "#D5E79E", "#80181D"];

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
        <h3 className="text-sm font-semibold text-stone-600 mb-3">
          הכנסות והוצאות לפי חודש
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={monthlyData}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#78716c" }}
            />
            <YAxis
              tickFormatter={formatShekels}
              tick={{ fontSize: 11, fill: "#78716c" }}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) =>
                typeof v === "number" ? `₪${v.toLocaleString("he-IL")}` : String(v ?? "")
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="revenue"
              name="הכנסות"
              fill="#0D3B66"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="expenses"
              name="הוצאות"
              fill="#9FB878"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expense pie chart */}
      <div>
        <h3 className="text-sm font-semibold text-stone-600 mb-3">
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
              >
                {expenseBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
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
                <span className="text-stone-600">{item.category}</span>
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
