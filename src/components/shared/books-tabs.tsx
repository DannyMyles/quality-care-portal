"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BOOKS_NAV } from "@/lib/nav/portal-nav"
import type { Can } from "@/lib/frappe/types"
import { cn } from "@/lib/utils"

/** The same pages as the sidebar's Books children, for when the sidebar is folded down to icons. */
export function BooksTabs({ can }: { can: Can }) {
  const pathname = usePathname()
  const items = BOOKS_NAV.filter((item) => !item.can || can[item.can])
  const current = [...items].sort((a, b) => b.href.length - a.href.length).find((item) => pathname.startsWith(item.href))
  return (
    <nav aria-label="Books pages" className="mb-5 flex flex-wrap gap-1.5 border-b border-[#E3E5F1] pb-3">
      {items.map((item) => (
        <Link
          prefetch={false}
          key={item.href}
          href={item.href}
          aria-current={current?.href === item.href ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
            current?.href === item.href ? "bg-[#2E3094]/10 text-[#2E3094]" : "text-[#5E6182] hover:bg-white hover:text-[#12133D]"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
