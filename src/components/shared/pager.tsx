import Link from "next/link"
import { ChevronLeft, ChevronRight } from "@/components/icons"
import { LoadMoreButton } from "@/components/shared/load-more-button"
import { canLoadMore, PAGE_SIZE, pageOf } from "@/lib/format"
import { cn } from "@/lib/utils"

const SHAPE = "flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-white px-2 text-sm tabular-nums transition-colors hover:bg-[#F3F4FB]"

/** Page numbers to show: the first, the last, and those around the current ones. Gaps are null. */
function pageList(first: number, last: number, pages: number) {
  const wanted = new Set([1, pages])
  for (let n = first - 1; n <= last + 1; n++) if (n >= 1 && n <= pages) wanted.add(n)
  const sorted = [...wanted].sort((a, b) => a - b)
  return sorted.flatMap((n, index) => (index && n - sorted[index - 1] > 1 ? [null, n] : [n]))
}

export function Pager({ total, page, path, params }: { total: number; page: number; path: string; params: Record<string, string | undefined> }) {
  const { more } = pageOf(params)
  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1)
  const lastShown = Math.min(page + more, pages)
  const firstRow = (page - 1) * PAGE_SIZE + 1
  const lastRow = Math.min(lastShown * PAGE_SIZE, total)
  const href = (changes: { page?: number; more?: number }) => {
    const query = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => !!entry[1]))
    query.delete("page")
    query.delete("more")
    if (changes.page && changes.page > 1) query.set("page", String(changes.page))
    if (changes.more) query.set("more", String(changes.more))
    return query.size ? `${path}?${query}` : path
  }
  return (
    <nav aria-label="Pages" className="flex flex-col items-center gap-3 pt-1 text-sm text-muted-foreground sm:flex-row sm:justify-between">
      <span className="tabular-nums">
        Showing {firstRow}–{lastRow} of {total}
      </span>
      {lastRow < total && canLoadMore(more) && <LoadMoreButton href={href({ page, more: more + 1 })} />}
      {pages > 1 ? (
        <ul className="flex flex-wrap items-center justify-center gap-1">
          {page > 1 && (
            <li>
              <Link prefetch={false} aria-label="Previous page" href={href({ page: page - 1 })} className={SHAPE}>
                <ChevronLeft className="size-4" />
              </Link>
            </li>
          )}
          {pageList(page, lastShown, pages).map((n, index) =>
            n === null ? (
              <li key={`gap${index}`} aria-hidden className="px-1">
                …
              </li>
            ) : (
              <li key={n}>
                <Link
                  prefetch={false}
                  aria-label={`Page ${n}`}
                  aria-current={n >= page && n <= lastShown ? "page" : undefined}
                  href={href({ page: n })}
                  className={cn(SHAPE, n >= page && n <= lastShown && "border-[#2E3094] bg-[#2E3094] text-white hover:bg-[#23257A]")}
                >
                  {n}
                </Link>
              </li>
            )
          )}
          {lastShown < pages && (
            <li>
              <Link prefetch={false} aria-label="Next page" href={href({ page: lastShown + 1 })} className={SHAPE}>
                <ChevronRight className="size-4" />
              </Link>
            </li>
          )}
        </ul>
      ) : (
        <span />
      )}
    </nav>
  )
}
