import Link from "next/link"
import type { ReactNode } from "react"
import { ListChecks, type AppIcon } from "@/components/icons"
import { EmptyState } from "@/components/shared/empty-state"
import { Pager } from "@/components/shared/pager"
import { cn } from "@/lib/utils"

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
  align?: "right"
  /** Hide on narrow screens, for detail that isn't needed to recognise the row. */
  wide?: boolean
}

/** A server-rendered table with card-style rows. Links keep paging working without scripts. */
export function RecordTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  emptyDescription,
  emptyIcon = ListChecks,
  emptyAction,
  total,
  page,
  path,
  params,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  empty: string
  emptyDescription?: string
  emptyIcon?: AppIcon
  emptyAction?: ReactNode
  total?: number
  page?: number
  path?: string
  params?: Record<string, string | undefined>
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#DADCEB] bg-white/60">
        <EmptyState icon={emptyIcon} title={empty} description={emptyDescription} action={emptyAction} />
      </div>
    )
  }
  const paged = !!total && !!page && !!path
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-1.5 text-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={cn(
                    "px-4 py-2 text-xs font-medium whitespace-nowrap text-[#6A6C8C]",
                    column.align === "right" ? "text-right" : "text-left",
                    column.wide && "hidden lg:table-cell"
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="[&>td]:border-y [&>td]:border-[#EEF0F8] [&>td]:bg-white [&>td:first-child]:rounded-l-xl [&>td:first-child]:border-l [&>td:last-child]:rounded-r-xl [&>td:last-child]:border-r">
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={cn("px-4 py-3 align-middle text-[#12133D]", column.align === "right" && "text-right tabular-nums", column.wide && "hidden lg:table-cell")}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paged && <Pager total={total!} page={page!} path={path!} params={params ?? {}} />}
    </div>
  )
}

export function RecordLink({ href, children, sub }: { href: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <Link prefetch={false} href={href} className="font-medium text-[#2E3094] hover:underline">
        {children}
      </Link>
      {sub && <p className="mt-0.5 text-xs text-[#6A6C8C]">{sub}</p>}
    </div>
  )
}
