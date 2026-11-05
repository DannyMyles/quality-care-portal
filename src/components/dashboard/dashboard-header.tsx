"use client"

import { useEffect, useState, type ReactNode } from "react"
import { LiveClock } from "@/components/dashboard/live-clock"

function greetingFor(date: Date) {
  const hour = date.getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function DashboardHeader({ firstName, subtitle, actions, quote }: { firstName: string; subtitle: string; actions?: ReactNode; quote?: ReactNode }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const tick = () => setNow(new Date())
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, 1000)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [])

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-[26px] leading-tight tracking-tight text-[#12133D]">
          {now ? greetingFor(now) : "Welcome"}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-[#6A6C8C]">{subtitle}</p>
        {actions && <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="flex w-full flex-col divide-y divide-[#ECEEF7] rounded-2xl border border-[#ECEEF7] bg-white shadow-sm sm:flex-row sm:divide-x sm:divide-y-0 lg:w-[620px]">
        {quote}
        <LiveClock now={now} />
      </div>
    </div>
  )
}
