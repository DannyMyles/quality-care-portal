import { HeaderSkeleton, KpiSkeletons, TableSkeleton } from "@/components/shared/skeletons"

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <KpiSkeletons />
      <TableSkeleton />
    </div>
  )
}
