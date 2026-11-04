"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import type { ActionResult } from "@/lib/actions"

export function CompletedToggle({ checked, label, action }: { checked: boolean; label: string; action: (value: boolean) => Promise<ActionResult> }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Checkbox
      aria-label={label}
      checked={checked}
      disabled={pending}
      onCheckedChange={(value) =>
        start(async () => {
          const result = await action(!!value)
          if (result.ok) router.refresh()
          else toast.error(result.error)
        })
      }
    />
  )
}
