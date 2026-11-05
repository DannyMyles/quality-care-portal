/** The date ranges people can pick across the portal. Works on plain YYYY-MM-DD text, so server and browser agree. */

export interface DateRange {
  from: string
  to: string
}

export const PRESETS = [
  { value: "this-month", label: "This month" },
  { value: "this-quarter", label: "This quarter" },
  { value: "this-year", label: "This year" },
  { value: "last-year", label: "Last year" },
  { value: "last-12", label: "Last 12 months" },
]

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date())
}

const pad = (value: number) => String(value).padStart(2, "0")
const parts = (iso: string) => iso.split("-").map(Number) as [number, number, number]
const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()

export function presetRange(preset: string, today = todayIso()): DateRange | null {
  const [year, month] = parts(today)
  switch (preset) {
    case "this-month":
      return { from: `${year}-${pad(month)}-01`, to: today }
    case "this-quarter":
      return { from: `${year}-${pad(Math.floor((month - 1) / 3) * 3 + 1)}-01`, to: today }
    case "this-year":
      return { from: `${year}-01-01`, to: today }
    case "last-year":
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` }
    case "last-12": {
      const start = new Date(Date.UTC(year, month - 12, 1))
      return { from: `${start.getUTCFullYear()}-${pad(start.getUTCMonth() + 1)}-01`, to: today }
    }
    default:
      return null
  }
}

/** Reads ?from&to, ?period or ?year, in that order. Anything malformed counts as no choice. */
export function readPeriod(params: { from?: string; to?: string; period?: string; year?: string }): DateRange | null {
  const { from, to, period, year } = params
  if (from && to && ISO_DATE.test(from) && ISO_DATE.test(to)) return from <= to ? { from, to } : { from: to, to: from }
  const preset = period ? presetRange(period) : null
  if (preset) return preset
  if (year && /^\d{4}$/.test(year)) return { from: `${year}-01-01`, to: `${year}-12-31` }
  return null
}

/** "2025", "Mar 2025", "Jan–Mar 2025", "1 Jan–15 Mar 2025" */
export function describeRange(from: string, to: string) {
  const [fromYear, fromMonth, fromDay] = parts(from)
  const [toYear, toMonth, toDay] = parts(to)
  const wholeMonths = fromDay === 1 && toDay === lastDay(toYear, toMonth)
  const sameYear = fromYear === toYear
  if (wholeMonths && sameYear && fromMonth === 1 && toMonth === 12) return String(fromYear)
  if (wholeMonths && sameYear && fromMonth === toMonth) return `${MONTHS[fromMonth - 1]} ${fromYear}`
  if (wholeMonths) return `${MONTHS[fromMonth - 1]}${sameYear ? "" : ` ${fromYear}`}–${MONTHS[toMonth - 1]} ${toYear}`
  if (from === to) return `${fromDay} ${MONTHS[fromMonth - 1]} ${fromYear}`
  return `${fromDay} ${MONTHS[fromMonth - 1]}${sameYear ? "" : ` ${fromYear}`}–${toDay} ${MONTHS[toMonth - 1]} ${toYear}`
}
