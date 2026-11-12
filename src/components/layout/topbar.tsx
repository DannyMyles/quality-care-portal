"use client"

import { usePathname, useRouter } from "next/navigation"
import { Bell, ChevronDownIcon, ExternalLink, LogOut, UserCircle } from "@/components/icons"
import { CompanySwitcher } from "@/components/layout/company-switcher"
import { GlobalSearch } from "@/components/layout/global-search"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/lib/actions"
import { PORTAL_NAV } from "@/lib/nav/portal-nav"

export interface TopbarNotification {
  id: string
  title: string
  description: string
  href: string
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

const iconButton =
  "relative flex size-10 items-center justify-center rounded-full bg-white text-[#3B3E63] shadow-[0_1px_6px_rgba(18,19,61,0.08)] transition-all hover:bg-[#F3F4FB] outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]/40"

export function Topbar({
  userName,
  primaryRole,
  desk,
  notifications,
  company,
  companies,
}: {
  userName: string
  primaryRole?: string
  desk: boolean
  notifications: TopbarNotification[]
  company: string
  companies: string[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const current = [...PORTAL_NAV].sort((a, b) => b.href.length - a.href.length).find((item) => pathname.startsWith(item.href))

  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-4 bg-white/90 px-4 shadow-[0_2px_20px_rgba(18,19,61,0.05)] backdrop-blur-md lg:px-7">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
        <CompanySwitcher company={company} companies={companies} />
        <span className="hidden text-[#C4C6DA] sm:inline">/</span>
        <span className="truncate font-semibold text-[#12133D]">{current?.label ?? (pathname.startsWith("/account") ? "My account" : "Portal")}</span>
      </nav>

      <div className="flex items-center gap-3">
        <GlobalSearch />
        {desk && (
          <a
            href="/desk"
            target="_blank"
            rel="noopener"
            className="hidden items-center gap-2 rounded-full border border-[#E3E5F1] bg-white px-4 py-2 text-[13px] font-medium whitespace-nowrap text-[#2E3094] transition-colors hover:bg-[#F3F4FB] xl:flex"
          >
            <ExternalLink className="size-4" />
            Open Full System
          </a>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className={iconButton} aria-label={`Notifications, ${notifications.length} waiting`}>
            <Bell className="size-5" />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-[18px] items-center justify-center rounded-full bg-[#EB2239] text-[10px] font-semibold text-white ring-2 ring-white">
                {notifications.length}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Needs your attention</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>}
              {notifications.map((item) => (
                <DropdownMenuItem key={item.id} onClick={() => router.push(item.href)} className="flex-col items-start gap-0.5 py-2.5">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 rounded-full py-1 pr-3 pl-1 transition-colors outline-none hover:bg-[#F3F4FB] focus-visible:ring-2 focus-visible:ring-[#00A3E0]/40">
            <Avatar className="size-10">
              <AvatarFallback className="bg-gradient-to-br from-[#2E3094] to-[#00A3E0] text-sm font-semibold text-white">{initials(userName)}</AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="text-sm leading-tight font-semibold text-[#12133D]">{userName}</p>
              {primaryRole && <p className="text-xs text-[#7B7E9C]">{primaryRole}</p>}
            </div>
            <ChevronDownIcon className="hidden size-4 text-[#7B7E9C] sm:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{userName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/account")}>
                <UserCircle className="size-4" />
                My account
              </DropdownMenuItem>
              {desk && (
                <DropdownMenuItem onClick={() => window.open("/desk", "_blank", "noopener")}>
                  <ExternalLink className="size-4" />
                  Open Full System
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
