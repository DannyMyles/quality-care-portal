"use client"

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartCard, Legend } from "@/components/charts/chart-card"
import { SERIES } from "@/components/charts/palette"
import { compactKes, formatKes } from "@/lib/format"
import type { Period } from "@/lib/frappe/types"

interface Point extends Period {
  name: string
  incomeMonthly: number
  expensesMonthly: number
}

function PeriodTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="rounded-xl bg-[#14154F] px-3.5 py-2.5 text-xs text-white shadow-xl">
      <p className="mb-1.5 font-semibold">{point.label}</p>
      <p>Income {formatKes(point.income)}</p>
      <p>Expenses {formatKes(point.expenses)}</p>
      <p className="mt-1 border-t border-white/20 pt-1 font-semibold">
        {point.profit < 0 ? "Loss" : "Profit"} {formatKes(Math.abs(point.profit))}
      </p>
      {point.months > 1 && <p className="mt-1 text-white/70">Bars show the average per month over {point.months} months.</p>}
    </div>
  )
}

/**
 * Months are the comparable unit, so a period loaded as one lump is drawn as its monthly average and
 * hatched, rather than as one tall bar that would flatten every real month beside it.
 */
export function PeriodChart({ periods, title, subtitle, className }: { periods: Period[]; title: string; subtitle?: string; className?: string }) {
  const data: Point[] = periods.map((period) => ({
    ...period,
    name: period.months > 1 ? `${period.label.split(" ")[0]} avg` : period.label.split(" ")[0],
    incomeMonthly: period.income / period.months,
    expensesMonthly: period.expenses / period.months,
  }))
  const lumped = periods.some((period) => period.months > 1)
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      className={className}
      table={{
        headers: ["Period", "Income", "Expenses", "Profit / (loss)"],
        rows: periods.map((period) => [period.label, formatKes(period.income), formatKes(period.expenses), formatKes(period.profit)]),
      }}
      footer={lumped ? "Hatched bars: January to September came from the workbook as one total, so they show the monthly average." : undefined}
    >
      <div className="mb-3">
        <Legend
          items={[
            { label: "Income", colour: SERIES.income },
            { label: "Expenses", colour: SERIES.expenses },
          ]}
        />
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
          <defs>
            {Object.entries(SERIES).map(([key, colour]) => (
              <pattern key={key} id={`hatch-${key}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill={colour} fillOpacity={0.28} />
                <rect width="3" height="6" fill={colour} />
              </pattern>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="#EEF0F8" />
          <XAxis dataKey="name" interval={0} tick={{ fill: "#6A6C8C", fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
          <YAxis tickFormatter={compactKes} tick={{ fill: "#6A6C8C", fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
          <Tooltip content={<PeriodTooltip />} cursor={{ fill: "#2E3094", fillOpacity: 0.05 }} />
          {(["income", "expenses"] as const).map((key) => (
            <Bar key={key} dataKey={`${key}Monthly`} name={key} maxBarSize={24} radius={[4, 4, 0, 0]} fill={SERIES[key]} isAnimationActive={false}>
              {data.map((point) => (
                <Cell key={point.key} fill={point.months > 1 ? `url(#hatch-${key})` : SERIES[key]} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
