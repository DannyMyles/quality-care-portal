"use client"

import { useState, type ComponentProps } from "react"
import { Eye, EyeOff } from "@/components/icons"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** A password box with a show/hide eye and a Caps Lock warning, the two usual causes of failed sign-ins. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false)
  const [caps, setCaps] = useState(false)
  const Icon = visible ? EyeOff : Eye
  return (
    <div>
      <div className="relative">
        <Input
          {...props}
          type={visible ? "text" : "password"}
          className={cn("pr-12", className)}
          onKeyUp={(event) => setCaps(event.getModifierState("CapsLock"))}
          onBlur={() => setCaps(false)}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#6A6C8C] transition-colors outline-none hover:text-[#12133D] focus-visible:ring-2 focus-visible:ring-[#00A3E0]/50"
        >
          <Icon className="size-5" />
        </button>
      </div>
      {caps && <p role="status" className="mt-1.5 text-xs font-medium text-[#755A00]">Caps Lock is on</p>}
    </div>
  )
}
