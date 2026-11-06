"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronDownIcon, MoreHorizontal } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * One "Actions" button for a page with several. The actions stay mounted while the panel is shut, so a
 * form or confirmation one of them opens keeps working after the panel closes.
 */
export function ActionsMenu({ children, label = "Actions" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const outside = (event: MouseEvent) => {
      const target = event.target as Element
      // Clicks inside a form the menu opened don't count as leaving it.
      if (box.current?.contains(target) || target.closest?.("[role=dialog], [role=alertdialog]")) return
      setOpen(false)
    }
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", outside)
    document.addEventListener("keydown", escape)
    return () => {
      document.removeEventListener("mousedown", outside)
      document.removeEventListener("keydown", escape)
    }
  }, [open])

  return (
    <div ref={box} className="relative">
      <Button variant="outline" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((value) => !value)}>
        <MoreHorizontal className="size-4" />
        {label}
        <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} />
      </Button>
      <div
        className={cn(
          "absolute top-full right-0 z-40 mt-2 flex w-60 flex-col gap-1 rounded-xl border border-[#E3E5F1] bg-white p-1.5 shadow-[0_12px_32px_rgba(18,19,61,0.12)]",
          // Every action looks like a plain row here, whatever button style it has on its own.
          "[&_a]:h-9 [&_a]:w-full [&_a]:justify-start [&_a]:rounded-lg [&_a]:border-0 [&_a]:bg-transparent [&_a]:px-3 [&_a]:text-[13px] [&_a]:font-medium [&_a]:text-[#12133D] [&_a]:shadow-none [&_a:hover]:bg-[#F3F4FB]",
          "[&_button]:h-9 [&_button]:w-full [&_button]:justify-start [&_button]:rounded-lg [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-3 [&_button]:text-[13px] [&_button]:font-medium [&_button]:text-[#12133D] [&_button]:shadow-none [&_button:hover]:bg-[#F3F4FB]",
          !open && "hidden"
        )}
        onClick={() => setTimeout(() => setOpen(false), 0)}
      >
        {children}
      </div>
    </div>
  )
}
