import Link from "next/link"
import { cn } from "@/lib/utils"

/** Filter tabs as plain links, so a filtered list can be bookmarked or opened from the dashboard. */
export function StatusTabs({
  path,
  param = "status",
  current,
  options,
  keep,
}: {
  path: string
  param?: string
  current?: string
  options: { value: string; label: string; count?: number }[]
  keep?: Record<string, string | undefined>
}) {
  const href = (value: string) => {
    const query = new URLSearchParams(Object.entries(keep ?? {}).filter((entry): entry is [string, string] => !!entry[1]))
    query.delete("page")
    query.delete("more")
    if (value) query.set(param, value)
    else query.delete(param)
    return query.size ? `${path}?${query}` : path
  }
  return (
    <div role="tablist" className="mb-4 flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = (current ?? "") === option.value
        return (
          <Link prefetch={false}
            key={option.value}
            role="tab"
            aria-selected={active}
            href={href(option.value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              active ? "bg-[#2E3094] text-white" : "bg-white text-[#5E6182] ring-1 ring-[#E3E5F1] hover:text-[#12133D]"
            )}
          >
            {option.label}
            {option.count !== undefined && <span className={cn("ml-1.5 tabular-nums", active ? "text-white/75" : "text-[#9A9DB8]")}>{option.count}</span>}
          </Link>
        )
      })}
    </div>
  )
}
