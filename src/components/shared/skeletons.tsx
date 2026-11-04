import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "cn"

export function KpiSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className={cn("grid gap-5 sm:grid-cols-2", count >= 4 ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border border-[#EEF0F8] bg-white p-5 shadow-sm">
          <Skeleton className="size-11 rounded-full" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function HeaderSkeleton({ actions = true }: { actions?: boolean }) {
  return (
    <div className="flex items-center justify-between pb-6">
      <div>
        <Skeleton className="h-8 w-56 rounded-xl" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full rounded-lg" />
      </div>
      {actions && <Skeleton className="h-10 w-10 rounded-full" />}
    </div>
  )
}

export function FilterBarSkeleton({ tabs }: { tabs?: boolean }) {
  return (
    <div className="mb-5 space-y-4">
      {tabs && <Skeleton className="h-11 w-96 max-w-full rounded-2xl" />}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-44 rounded-xl" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 6, cols = 5, withActions = true }: { rows?: number; cols?: number; withActions?: boolean }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-1.5">
      <div className="flex gap-6 px-4 pb-2 pt-1">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 rounded" />
        ))}
        {withActions && <Skeleton className="h-3 w-16 rounded" />}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-6 rounded-2xl border border-[#EEF0F8] bg-white px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-4 flex-1 rounded-md", c === 0 && "max-w-[140px]")} />
          ))}
          {withActions && (
            <div className="flex w-16 justify-end gap-1">
              <Skeleton className="size-7 rounded-lg" />
              <Skeleton className="size-7 rounded-lg" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ className, lines = 4 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("rounded-2xl border border-[#EEF0F8] bg-white p-6 shadow-sm", className)}>
      <Skeleton className="h-5 w-40" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={cn("h-4", i % 2 ? "w-3/4" : "w-full")} />
        ))}
      </div>
    </div>
  )
}

export function ListPageSkeleton({ kpis = 0, tabs = false, filters = true, rows = 6, cols = 5, actions = true }: { kpis?: number; tabs?: boolean; filters?: boolean; rows?: number; cols?: number; actions?: boolean }) {
  return (
    <div className="w-full" aria-busy="true" aria-label="Loading">
      <HeaderSkeleton actions={actions} />
      {kpis > 0 && <div className="mb-5"><KpiSkeletons count={kpis} /></div>}
      {(filters || tabs) && <FilterBarSkeleton tabs={tabs} />}
      <TableSkeleton rows={rows} cols={cols} />
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="w-full" aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-4 h-4 w-24" />
      <div className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-2xl" />
          <div>
            <Skeleton className="h-7 w-56 rounded-xl" />
            <Skeleton className="mt-2.5 h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <CardSkeleton className="lg:col-span-2" lines={6} />
        <CardSkeleton lines={4} />
      </div>
      <div className="mt-5"><CardSkeleton lines={3} /></div>
    </div>
  )
}
