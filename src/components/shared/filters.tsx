"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search } from "@/components/icons"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PRESETS } from "@/lib/period"

const ALL = "__all__"

function useParamUpdater() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const update = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    params.delete("page")
    params.delete("more")
    router.push(params.size ? `${pathname}?${params}` : pathname)
  }
  return { searchParams, update }
}

export function SearchFilter({ param = "search", placeholder = "Search…" }: { param?: string; placeholder?: string }) {
  const { searchParams, update } = useParamUpdater()
  const initial = searchParams.get(param) ?? ""
  const [value, setValue] = useState(initial)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const id = setTimeout(() => update({ [param]: value.trim() || null }), 350)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative min-w-[220px] flex-1">
      <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input placeholder={placeholder} className="pl-9" value={value} onChange={(e) => setValue(e.target.value)} aria-label={placeholder} />
    </div>
  )
}

export function SelectFilter({
  param,
  placeholder,
  options,
  className = "w-full sm:w-48",
}: {
  param: string
  placeholder: string
  options: { value: string; label: string }[]
  className?: string
}) {
  const { searchParams, update } = useParamUpdater()
  const current = searchParams.get(param) ?? ALL
  return (
    <Select value={current} onValueChange={(v) => update({ [param]: !v || v === ALL ? null : v })}>
      <SelectTrigger className={className} aria-label={placeholder}>
        <SelectValue placeholder={placeholder}>{(v: string) => (v === ALL ? placeholder : options.find((o) => o.value === v)?.label ?? v)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function DateFilter({ fromParam = "from", toParam = "to" }: { fromParam?: string; toParam?: string }) {
  const { searchParams, update } = useParamUpdater()
  return (
    <div className="flex items-center gap-2">
      <Input type="date" className="w-40" aria-label="From date" value={searchParams.get(fromParam) ?? ""} onChange={(e) => update({ [fromParam]: e.target.value || null })} />
      <span className="text-sm text-muted-foreground">to</span>
      <Input type="date" className="w-40" aria-label="To date" value={searchParams.get(toParam) ?? ""} onChange={(e) => update({ [toParam]: e.target.value || null })} />
    </div>
  )
}

const CUSTOM = "__custom__"

/** Pick a preset, any year, or your own dates. The page reads the choice with readPeriod(). */
export function PeriodFilter({ years, defaultLabel, className = "w-full sm:w-48" }: { years: string[]; defaultLabel: string; className?: string }) {
  const { searchParams, update } = useParamUpdater()
  const from = searchParams.get("from") ?? ""
  const to = searchParams.get("to") ?? ""
  const [customOpen, setCustomOpen] = useState(false)
  const custom = customOpen || Boolean(from || to)
  const rawYear = searchParams.get("year")
  const year = rawYear && /^\d{4}$/.test(rawYear) ? rawYear : null
  const rawPreset = searchParams.get("period")
  const preset = PRESETS.some((option) => option.value === rawPreset) ? rawPreset : null
  const current = custom ? CUSTOM : preset ? `period:${preset}` : year ? `year:${year}` : ALL
  const yearOptions = year && !years.includes(year) ? [year, ...years] : years
  const options = [
    ...PRESETS.map((option) => ({ value: `period:${option.value}`, label: option.label })),
    ...yearOptions.map((value) => ({ value: `year:${value}`, label: value })),
    { value: CUSTOM, label: "Custom dates" },
  ]
  const choose = (value: string | null) => {
    if (value === CUSTOM) {
      setCustomOpen(true)
      return
    }
    setCustomOpen(false)
    const [kind, choice] = (value ?? ALL).split(":")
    update({ year: kind === "year" ? choice : null, period: kind === "period" ? choice : null, from: null, to: null })
  }
  const setDate = (changes: Record<string, string | null>) => update({ ...changes, year: null, period: null })
  return (
    <>
      <Select value={current} onValueChange={choose}>
        <SelectTrigger className={className} aria-label="Period">
          <SelectValue placeholder={defaultLabel}>{(value: string) => (value === ALL ? defaultLabel : options.find((option) => option.value === value)?.label ?? value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{defaultLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {custom && (
        <div className="flex items-center gap-2">
          <Input type="date" className="w-40" aria-label="From date" value={from} max={to || undefined} onChange={(e) => setDate({ from: e.target.value || null })} />
          <span className="text-sm text-muted-foreground">to</span>
          <Input type="date" className="w-40" aria-label="To date" value={to} min={from || undefined} onChange={(e) => setDate({ to: e.target.value || null })} />
        </div>
      )}
    </>
  )
}

export function AsAtFilter({ param = "to" }: { param?: string }) {
  const { searchParams, update } = useParamUpdater()
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      As at
      <Input type="date" className="w-40" value={searchParams.get(param) ?? ""} onChange={(e) => update({ [param]: e.target.value || null })} />
    </label>
  )
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-3">{children}</div>
}
