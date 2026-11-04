"use client"

import { useTransition, type ComponentProps } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { LoadingButton } from "@/components/shared/loading-button"
import type { ActionResult } from "@/lib/actions"

/** Runs a server action, shows what happened, and can ask first for steps that can't be undone. */
export function ActionButton({
  action,
  label,
  success,
  confirm,
  variant,
  size,
  goTo,
}: {
  action: () => Promise<ActionResult>
  label: string
  success: string
  confirm?: string
  variant?: ComponentProps<typeof LoadingButton>["variant"]
  size?: ComponentProps<typeof LoadingButton>["size"]
  /** Where to go afterwards. Any {result} is replaced with what the action returned. */
  goTo?: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const run = () =>
    start(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(success)
      const value = Array.isArray(result.data) ? result.data[0] : result.data
      if (goTo) router.push(goTo.replace("{result}", encodeURIComponent(String(value))))
      else router.refresh()
    })

  const button = (
    <LoadingButton loading={pending} variant={variant} size={size} onClick={confirm ? undefined : run}>
      {label}
    </LoadingButton>
  )
  return confirm ? <ConfirmDialog trigger={button} title={label} description={confirm} confirmLabel={label} onConfirm={run} /> : button
}
