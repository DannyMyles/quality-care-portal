"use client"

import { useState, useTransition, type ComponentProps } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Mail, Paperclip } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LoadingButton } from "@/components/shared/loading-button"
import { Spinner } from "@/components/shared/spinner"
import { emailDraft, sendEmail, type EmailDraft } from "@/lib/actions"
import type { EmailKind } from "@/lib/frappe/types"

const TITLES: Record<EmailKind, string> = {
  invoice: "Email this invoice",
  receipt: "Email this receipt",
  customer: "Email their statement",
  supplier: "Email their statement",
  certificate: "Email this certificate",
}

/**
 * Opens an email with the document's PDF attached, already addressed and worded, for the sender to check
 * and change before it goes. It is sent from the company's own mailbox.
 */
export function EmailButton({
  kind,
  name,
  label = "Email",
  variant = "outline",
  size,
}: {
  kind: EmailKind
  name: string
  label?: string
  variant?: ComponentProps<typeof Button>["variant"]
  size?: ComponentProps<typeof Button>["size"]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<EmailDraft | null>(null)
  const [values, setValues] = useState({ to: "", cc: "", subject: "", message: "" })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pending, start] = useTransition()
  const set = (field: keyof typeof values, value: string) => setValues((current) => ({ ...current, [field]: value }))

  const openDialog = (next: boolean) => {
    setOpen(next)
    if (!next) return
    setError(null)
    setDraft(null)
    setLoading(true)
    emailDraft(kind, name).then((result) => {
      setLoading(false)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setDraft(result.data)
      setValues({ to: result.data.to, cc: "", subject: result.data.subject, message: result.data.message })
    })
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!values.to.trim()) {
      setError("Enter the email address to send it to.")
      return
    }
    setError(null)
    start(async () => {
      const result = await sendEmail(kind, name, values)
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast.success(`Email sent to ${values.to}`)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={openDialog}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>
        <Mail className="size-4" />
        {label}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{TITLES[kind]}</DialogTitle>
            <DialogDescription>{draft?.sender ? `From ${draft.sender}` : "Check the wording before it goes."}</DialogDescription>
          </DialogHeader>
          {loading && (
            <div className="flex items-center gap-2 py-6 text-sm text-[#6A6C8C]">
              <Spinner className="size-4" /> Preparing the email…
            </div>
          )}
          {draft && !draft.ready && (
            <p role="alert" className="rounded-lg bg-[#F5C400]/15 px-3 py-2.5 text-sm text-[#5C4600]">
              {draft.problem}
            </p>
          )}
          {draft?.ready && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="email-to">
                  To<span aria-hidden className="text-[#B5152A]"> *</span>
                </Label>
                <Input id="email-to" type="text" inputMode="email" autoComplete="off" value={values.to} placeholder="name@example.com" onChange={(event) => set("to", event.target.value)} />
                {!draft.to && <p className="text-xs text-[#6A6C8C]">No email address is saved for them, so type one in.</p>}
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="email-cc">Copy to</Label>
                <Input id="email-cc" type="text" inputMode="email" autoComplete="off" value={values.cc} placeholder="Optional. Separate addresses with commas" onChange={(event) => set("cc", event.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="email-subject">Subject</Label>
                <Input id="email-subject" value={values.subject} onChange={(event) => set("subject", event.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="email-message">Message</Label>
                <Textarea id="email-message" rows={10} className="min-h-52" value={values.message} onChange={(event) => set("message", event.target.value)} />
              </div>
              <p className="flex items-center gap-2 text-sm text-[#5E6182] sm:col-span-2">
                <Paperclip className="size-4 text-[#2E3094]" />
                {draft.attachment} is attached
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-[#EB2239]/10 px-3 py-2 text-sm text-[#87000A]">
              {error}
            </p>
          )}
          <DialogFooter>
            {draft?.ready ? (
              <LoadingButton type="submit" loading={pending}>
                Send email
              </LoadingButton>
            ) : (
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
