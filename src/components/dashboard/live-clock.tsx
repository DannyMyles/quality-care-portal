"use client"

import { format } from "date-fns"

function Dial({ now }: { now: Date | null }) {
  const h = now?.getHours() ?? 0
  const m = now?.getMinutes() ?? 0
  const s = now?.getSeconds() ?? 0
  return (
    <svg viewBox="0 0 48 48" className="size-12 shrink-0" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#F4F5FD" stroke="#DDE0F5" strokeWidth="1.5" />
      {[0, 90, 180, 270].map((deg) => (
        <line key={deg} x1="24" y1="5.5" x2="24" y2="8.5" stroke="#9DA3D6" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${deg} 24 24)`} />
      ))}
      <line x1="24" y1="24" x2="24" y2="14" stroke="#12133D" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${(h % 12) * 30 + m * 0.5} 24 24)`} />
      <line x1="24" y1="24" x2="24" y2="9.5" stroke="#2E3094" strokeWidth="1.8" strokeLinecap="round" transform={`rotate(${m * 6 + s * 0.1} 24 24)`} />
      <line x1="24" y1="27" x2="24" y2="8.5" stroke="#F07A2E" strokeWidth="1" strokeLinecap="round" transform={`rotate(${s * 6} 24 24)`} />
      <circle cx="24" cy="24" r="2.2" fill="#F07A2E" />
      <circle cx="24" cy="24" r="0.9" fill="#fff" />
    </svg>
  )
}

export function LiveClock({ now }: { now: Date | null }) {
  return (
    <div className="flex shrink-0 items-center gap-3.5 px-5 py-3" role="timer" aria-label="Current time">
      <Dial now={now} />
      <div>
        <div className="flex items-baseline gap-1.5 whitespace-nowrap tabular-nums">
          <span className="text-[26px] leading-none font-semibold tracking-tight text-[#12133D]">{now ? format(now, "hh:mm") : "--:--"}</span>
          <span className="w-6 text-sm font-medium text-[#6A6C8C]">{now ? format(now, ":ss") : ":--"}</span>
          <span className="rounded-md bg-[#2E3094]/10 px-1.5 py-0.5 text-[10px] leading-none font-semibold tracking-wide text-[#2E3094]">{now ? format(now, "a") : "--"}</span>
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs whitespace-nowrap text-[#6A6C8C]">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#0AC6A2] opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-[#0AC6A2]" />
          </span>
          {now ? format(now, "EEEE, d MMM yyyy") : " "}
        </p>
      </div>
    </div>
  )
}
