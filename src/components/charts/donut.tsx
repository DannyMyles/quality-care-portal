"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { ChartCard } from "@/components/charts/chart-card"
import { formatKes } from "@/lib/format"

export interface DonutSlice {
  name: string
  value: number
  colour: string
}

function DonutTooltip({ active, payload, total, format }: { active?: boolean; payload?: { payload: DonutSlice }[]; total: number; format: (value: number) => string }) {
  const slice = payload?.[0]?.payload
  if (!active || !slice) return null
  return (
    <div className="rounded-xl bg-[#14154F] px-3 py-2 text-xs text-white shadow-xl">
      <p className="font-semibold">{slice.name}</p>
      <p>{format(slice.value)} · {Math.round((slice.value / total) * 100)}%</p>
    </div>
  )
}

/** One whole split into a few parts. Each slice is named with its share, so colour never carries it alone. */
export function DonutCard({
  title,
  subtitle,
  slices,
  centre,
  centreLabel,
  money = false,
  className,
}: {
  title: string
  subtitle?: string
  slices: DonutSlice[]
  centre: string
  centreLabel: string
  /** Server pages can't hand a function to a client chart, so they say what the numbers are. */
  money?: boolean
  className?: string
}) {
  const format = (value: number) => (money ? formatKes(value) : value.toLocaleString("en-KE"))
  const parts = slices.filter((slice) => slice.value > 0)
  const total = parts.reduce((sum, slice) => sum + slice.value, 0)
  const share = (value: number) => `${Math.round((value / total) * 100)}%`
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      className={className}
      table={{ headers: ["Part", "Amount", "Share"], rows: parts.map((slice) => [slice.name, format(slice.value), share(slice.value)]) }}
    >
      <div className="relative mx-auto h-48 w-48" role="img" aria-label={`${title}: ${parts.map((slice) => `${slice.name} ${share(slice.value)}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={parts} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
              {parts.map((slice) => (
                <Cell key={slice.name} fill={slice.colour} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip total={total} format={format} />} wrapperStyle={{ zIndex: 10 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-heading text-2xl font-bold text-[#12133D] tabular-nums">{centre}</span>
          <span className="text-xs text-[#6A6C8C]">{centreLabel}</span>
        </div>
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {parts.map((slice) => (
          <li key={slice.name} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2 text-[#12133D]">
              <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: slice.colour }} />
              <span className="truncate">{slice.name}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums">{share(slice.value)}</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  )
}
