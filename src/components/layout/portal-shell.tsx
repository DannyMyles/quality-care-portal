"use client"

import { useEffect, useState, type ReactNode } from "react"
import { SidebarNav } from "@/components/layout/sidebar-nav"
import { Topbar, type TopbarNotification } from "@/components/layout/topbar"
import type { Can } from "@/lib/frappe/types"

const STORAGE_KEY = "qc:sidebar-collapsed"

export function PortalShell({
  can,
  desk,
  userName,
  primaryRole,
  notifications,
  company,
  companies,
  children,
}: {
  can: Can
  desk: boolean
  userName: string
  primaryRole?: string
  notifications: TopbarNotification[]
  company: string
  companies: string[]
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    // Hydrate after mount so the first client render matches the server HTML.
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored !== null) setCollapsed(stored === "true")
      else if (window.innerWidth < 1024) setCollapsed(true)
    } catch {
      // localStorage unavailable — keep the default.
    }
  }, [])

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F6F7FB]">
      <SidebarNav can={can} desk={desk} company={company} collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={userName} primaryRole={primaryRole} desk={desk} notifications={notifications} company={company} companies={companies} />
        <main className="min-w-0 flex-1 p-4 lg:px-7 lg:py-6">{children}</main>
      </div>
    </div>
  )
}
