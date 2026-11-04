import { GAIN, LOSS, NEUTRAL } from "@/components/charts/palette"
import { compactKes, formatKes } from "@/lib/format"

/** Longest first, one colour, value at the tip. "All other costs" stays grey and last. */
export function RankedBars({
  rows,
  colour = GAIN,
  valueLabel = (value: number) => compactKes(value),
}: {
  rows: { name: string; value: number; note?: string; other?: boolean }[]
  colour?: string
  valueLabel?: (value: number) => string
}) {
  const biggest = Math.max(...rows.map((row) => row.value), 1)
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.name} title={`${row.name}: ${formatKes(row.value)}${row.note ? ` (${row.note})` : ""}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-[#12133D]">{row.name}</span>
            <span className="shrink-0 font-medium text-[#12133D] tabular-nums">
              {valueLabel(row.value)}
              {row.note && <span className="ml-1.5 text-xs font-normal text-[#6A6C8C]">{row.note}</span>}
            </span>
          </div>
          <div className="h-2.5 rounded-r-[4px] bg-[#F4F5FB]">
            <div className="h-full rounded-r-[4px]" style={{ width: `${(row.value / biggest) * 100}%`, backgroundColor: row.other ? NEUTRAL : colour }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Profit grows right of a centre line and loss grows left, so a loss can't be missed. */
export function DivergingBars({ rows }: { rows: { name: string; value: number; note?: string }[] }) {
  const biggest = Math.max(...rows.map((row) => Math.abs(row.value)), 1)
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row) => {
        const width = `${(Math.abs(row.value) / biggest) * 50}%`
        const positive = row.value >= 0
        return (
          <li key={row.name} title={`${row.name}: ${positive ? "profit" : "loss"} of ${formatKes(Math.abs(row.value))}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="text-[#12133D]">{row.name}</span>
              <span className="font-medium text-[#12133D] tabular-nums">
                {positive ? "" : "Loss "}
                {compactKes(Math.abs(row.value))}
                {row.note && <span className="ml-1.5 text-xs font-normal text-[#6A6C8C]">{row.note}</span>}
              </span>
            </div>
            <div className="relative h-3 rounded-[4px] bg-[#F4F5FB]">
              <span aria-hidden className="absolute top-[-3px] bottom-[-3px] left-1/2 w-px bg-[#B9BCD6]" />
              <div
                className="absolute top-0 h-full"
                style={{
                  width,
                  backgroundColor: positive ? GAIN : LOSS,
                  left: positive ? "50%" : undefined,
                  right: positive ? undefined : "50%",
                  borderRadius: positive ? "0 4px 4px 0" : "4px 0 0 4px",
                }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
