"use client"

import { useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Building2, Check, ChevronDownIcon } from "@/components/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { switchCompany } from "@/lib/actions"
import { shortCompany } from "@/lib/company"

/** Sections that belong to one company only: training is Quality Care's, the tractor is Highlead's. */
const ONE_COMPANY = ["/trainees", "/batches", "/certificates", "/trainers", "/import", "/tractor", "/payments"]

/** Where to land after switching: a single record or a one-company section belongs to the old company. */
function landing(pathname: string) {
  const section = "/" + (pathname.split("/")[1] ?? "")
  if (ONE_COMPANY.includes(section)) return "/dashboard"
  const parts = pathname.split("/").filter(Boolean)
  if (section === "/books") return parts.length > 2 ? `/books/${parts[1]}` : null
  return parts.length > 1 ? section : null
}

export function CompanySwitcher({ company, companies }: { company: string; companies: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, start] = useTransition()

  if (companies.length < 2) return <span className="hidden text-[#9A9DB8] sm:inline">{shortCompany(company)}</span>

  function choose(name: string) {
    if (name === company) return
    start(async () => {
      await switchCompany(name)
      const next = landing(pathname)
      if (next) router.push(next)
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Company: ${company}. Change company`}
        className="flex items-center gap-1.5 rounded-full border border-[#E3E5F1] bg-white px-3 py-1.5 text-[13px] font-medium text-[#2E3094] transition-colors outline-none hover:bg-[#F3F4FB] focus-visible:ring-2 focus-visible:ring-[#00A3E0]/40 data-[pending=true]:opacity-60"
        data-pending={pending}
      >
        <Building2 className="size-4" />
        <span className="max-w-40 truncate">{shortCompany(company)}</span>
        <ChevronDownIcon className="size-3.5 text-[#7B7E9C]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Work in</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {companies.map((name) => (
            <DropdownMenuItem key={name} onClick={() => choose(name)} className="justify-between gap-3">
              <span>{name}</span>
              {name === company && <Check className="size-4 text-[#2E3094]" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
