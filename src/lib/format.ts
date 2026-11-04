const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", currencyDisplay: "code", maximumFractionDigits: 0 })
const KES_CENTS = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", currencyDisplay: "code", minimumFractionDigits: 2 })

export function formatKes(value: number | null | undefined, cents = false) {
  return (cents ? KES_CENTS : KES).format(value ?? 0)
}

/** Short money for chart axes and tiles: 19.9M, 340K. */
export function compactKes(value: number) {
  const size = Math.abs(value)
  if (size >= 1_000_000) return `${(value / 1_000_000).toFixed(size >= 10_000_000 ? 1 : 2)}M`
  if (size >= 1_000) return `${Math.round(value / 1_000)}K`
  return `${Math.round(value)}`
}

export function formatDate(value?: string | null) {
  if (!value) return "—"
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export const PAGE_SIZE = 25
const MAX_MORE = 19

/** A page is 25 rows. "Load more" keeps the same start and shows more rows, up to 500. */
export function pageOf(params: Record<string, string | undefined>) {
  const page = Math.max(Number(params.page) || 1, 1)
  const more = Math.min(Math.max(Number(params.more) || 0, 0), MAX_MORE)
  return { page, more, start: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE * (1 + more) }
}

export function canLoadMore(more: number) {
  return more < MAX_MORE
}
