"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Mail } from "@/components/icons"
import { LoadingButton } from "@/components/shared/loading-button"
import { requestFeedback } from "@/lib/actions"

/** Emails the feedback link to the students who haven't answered, and says what happened. */
export function EmailLinkButton({ batch, waiting }: { batch: string; waiting: number }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const send = () =>
    start(async () => {
      const result = await requestFeedback(batch)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      const { sent, no_email, already } = result.data
      const parts = [`Sent to ${sent} student${sent === 1 ? "" : "s"}`]
      if (already) parts.push(`${already} already had it`)
      if (no_email) parts.push(`${no_email} with no email on record`)
      toast.success(parts.join(", "))
      router.refresh()
    })
  return (
    <LoadingButton variant="outline" size="sm" loading={pending} onClick={send} title={`Email the link to the ${waiting} student${waiting === 1 ? "" : "s"} who haven't answered`}>
      <Mail className="size-4" />
      Email the link
    </LoadingButton>
  )
}
