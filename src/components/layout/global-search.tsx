"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "@/components/icons"
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { searchRecords, type SearchHit } from "@/lib/actions"

/** Find anything from anywhere. Ctrl+K opens it, and results only cover what the role can open. */
export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    const text = query.trim()
    if (text.length < 2) return
    let stale = false
    const id = setTimeout(async () => {
      setLoading(true)
      const found = await searchRecords(text)
      if (stale) return
      setHits(found)
      setLoading(false)
    }, 250)
    return () => {
      stale = true
      clearTimeout(id)
    }
  }, [query])

  const change = (value: string) => {
    setQuery(value)
    if (value.trim().length < 2) setHits([])
  }
  const groups = [...new Set(hits.map((hit) => hit.group))]
  const go = (hit: SearchHit) => {
    setOpen(false)
    setQuery("")
    setHits([])
    router.push(`${hit.path}${encodeURIComponent(hit.name)}`)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search everything"
        className="flex size-10 items-center justify-center gap-2 rounded-full bg-white text-[13px] text-[#6A6C8C] shadow-[0_1px_6px_rgba(18,19,61,0.08)] transition-colors outline-none hover:bg-[#F3F4FB] focus-visible:ring-2 focus-visible:ring-[#00A3E0]/40 whitespace-nowrap lg:w-60 lg:justify-start lg:px-4"
      >
        <Search className="size-[18px] shrink-0" />
        <span className="hidden lg:inline">Search everything</span>
        <kbd className="ml-auto hidden rounded bg-[#F1F2FA] px-1.5 py-0.5 text-[11px] lg:inline">Ctrl K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search everything" description="Find trainees, classes, certificates, invoices and more">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Name, invoice number, phone…" value={query} onValueChange={change} />
          <CommandList>
            {query.trim().length >= 2 && !loading && hits.length === 0 && <CommandEmpty>Nothing found.</CommandEmpty>}
            {query.trim().length < 2 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Type at least two letters.</p>}
            {groups.map((group) => (
              <CommandGroup key={group} heading={group}>
                {hits.filter((hit) => hit.group === group).map((hit) => (
                  <CommandItem key={`${group}${hit.name}`} value={`${group}${hit.name}`} onSelect={() => go(hit)}>
                    <span className="min-w-0 truncate font-medium">{hit.title}</span>
                    <span className="ml-auto shrink-0 pl-3 text-xs text-muted-foreground">{hit.detail || hit.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
