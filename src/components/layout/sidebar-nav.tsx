"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeftDoubleIcon, ArrowRightDoubleIcon } from "@hugeicons/core-free-icons"
import { useState } from "react"
import { ChevronDownIcon, ExternalLink } from "@/components/icons"
import { cn } from "@/lib/utils"
import { PORTAL_NAV_GROUPS } from "@/lib/nav/portal-nav"
import type { Can } from "@/lib/frappe/types"

export function SidebarNav({
  can,
  desk,
  collapsed,
  onToggle,
}: {
  can: Can
  desk: boolean
  collapsed: boolean
  onToggle: () => void
}) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const groups = PORTAL_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.can || can[item.can]),
  })).filter((group) => group.items.length > 0)

  return (
    <aside className={cn("sticky top-0 z-30 h-screen shrink-0 transition-[width] duration-200 ease-in-out", collapsed ? "w-[76px]" : "w-64")}>
      <div className="flex h-full flex-col overflow-hidden bg-white shadow-[2px_0_24px_rgba(18,19,61,0.05)]">
        <div className={cn("flex shrink-0 items-center", collapsed ? "h-20 justify-center" : "h-24 px-6")}>
          {collapsed ? (
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2E3094] to-[#00A3E0] text-sm font-bold text-white">QC</span>
          ) : (
            <Image src="/logo-full.png" alt="Quality Care" width={788} height={193} className="h-11 w-auto" priority />
          )}
        </div>

        <nav className={cn("flex flex-1 flex-col gap-0.5 overflow-y-auto py-1", collapsed ? "items-center px-3" : "px-4")}>
          {groups.map((group) => (
            <div key={group.label || "top"} className={cn("flex flex-col gap-0.5", collapsed && "items-center")}>
              {group.label && !collapsed && (
                <p className="px-3.5 pt-4 pb-1.5 text-[11px] font-semibold tracking-wider text-[#9A9DB8] uppercase">{group.label}</p>
              )}
              {group.items.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon
                const children = collapsed ? [] : (item.children ?? []).filter((child) => !child.can || can[child.can])
                // Open by default on its own pages, until someone chooses otherwise with the chevron.
                const open = children.length > 0 && (expanded[item.href] ?? isActive)
                return (
                  <div key={item.href}>
                    <div className="relative">
                      <Link
                        prefetch={false}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-label={item.label}
                        aria-current={isActive && !children.length ? "page" : undefined}
                        onClick={children.length ? () => setExpanded((current) => ({ ...current, [item.href]: true })) : undefined}
                        className={cn(
                          "group relative flex items-center text-[14px] font-medium outline-none transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-[#00A3E0]/40",
                          collapsed ? "size-11 justify-center rounded-xl" : "gap-3 rounded-xl px-3.5 py-2.5",
                          children.length > 0 && "pr-10",
                          isActive ? "bg-gradient-to-r from-[#2E3094]/[0.12] to-[#00A3E0]/[0.05] text-[#2E3094]" : "text-[#5E6182] hover:bg-[#F3F4FB] hover:text-[#12133D]"
                        )}
                      >
                        {isActive && !collapsed && <span className="absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[#2E3094]" />}
                        <Icon className={cn("size-[21px] shrink-0 transition-transform", !isActive && "group-hover:scale-105")} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                      {children.length > 0 && (
                        <button
                          type="button"
                          aria-label={`${open ? "Hide" : "Show"} ${item.label} pages`}
                          aria-expanded={!!open}
                          onClick={() => setExpanded((current) => ({ ...current, [item.href]: !open }))}
                          className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#7B7E9C] outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00A3E0]/40"
                        >
                          <ChevronDownIcon className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
                        </button>
                      )}
                    </div>
                    {open && (
                      <ul className="mt-0.5 ml-[25px] flex animate-in flex-col gap-0.5 border-l border-[#E3E5F1] pl-3 duration-150 fade-in slide-in-from-top-1">
                        {children.map((child) => {
                          // "/books" is both the parent and a child, so match the deepest child that fits.
                          const current = [...children].sort((a, b) => b.href.length - a.href.length).find((other) => pathname.startsWith(other.href))
                          const on = current?.href === child.href
                          return (
                            <li key={child.href}>
                              <Link
                                prefetch={false}
                                href={child.href}
                                aria-current={on ? "page" : undefined}
                                className={cn(
                                  "block rounded-lg px-3 py-1.5 text-[13px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]/40",
                                  on ? "bg-[#2E3094]/[0.08] font-semibold text-[#2E3094]" : "font-medium text-[#5E6182] hover:bg-[#F3F4FB] hover:text-[#12133D]"
                                )}
                              >
                                {child.label}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </nav>

        {desk && (
          <div className={cn("relative shrink-0 pt-1 pb-3 before:pointer-events-none before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-gradient-to-t before:from-white before:to-transparent", collapsed ? "flex justify-center px-3" : "px-4")}>
            <a
              href="/desk"
              target="_blank"
              rel="noopener"
              title="Open the full system"
              className={cn(
                "flex items-center rounded-lg bg-[#F1F2FA] text-[13px] font-medium text-[#2E3094] transition-colors hover:bg-[#E9EBF8]",
                collapsed ? "size-11 justify-center" : "gap-3 px-3.5 py-2.5"
              )}
            >
              <ExternalLink className="size-5 shrink-0" />
              {!collapsed && <span>Open Full System</span>}
            </a>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute top-1/2 -right-4 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#14154F] shadow-lg ring-1 ring-black/5 transition-colors hover:bg-[#F3F4FB]"
      >
        <HugeiconsIcon icon={collapsed ? ArrowRightDoubleIcon : ArrowLeftDoubleIcon} size={16} strokeWidth={2} />
      </button>
    </aside>
  )
}
