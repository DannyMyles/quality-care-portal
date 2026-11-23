"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LoadingButton } from "@/components/shared/loading-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveReminderSettings } from "@/lib/actions"
import type { ReminderSettings } from "@/lib/frappe/types"

const panel = "flex flex-col gap-3 rounded-2xl border border-[#E3E5F1] bg-white p-5"

type Values = Record<keyof ReminderSettings, string | boolean>

function Toggle({ id, label, hint, checked, disabled, onChange }: { id: string; label: string; hint: string; checked: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex items-start gap-3">
      <input id={id} type="checkbox" className="mt-0.5 size-4 accent-[#2E3094]" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className="flex flex-col">
        <span className="text-sm font-medium text-[#12133D]">{label}</span>
        <span className="text-xs text-[#6A6C8C]">{hint}</span>
      </span>
    </label>
  )
}

function Days({ id, label, value, disabled, onChange }: { id: string; label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 pl-7">
      <Label htmlFor={id} className="text-sm font-normal text-[#5E6182]">{label}</Label>
      <Input id={id} type="number" min={0} step={1} className="h-8 w-20" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

/** Which reminder emails go out, and when. Saved together. */
export function ReminderForm({ settings, canEdit }: { settings: ReminderSettings; canEdit: boolean }) {
  const router = useRouter()
  const [values, setValues] = useState<Values>(() => Object.fromEntries(Object.entries(settings).map(([key, value]) => [key, typeof value === "number" && ["invoices", "hires_due", "hires_late", "certificates", "feedback_requests", "email_receipts"].includes(key) ? !!value : String(value ?? "")])) as Values)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const set = (key: keyof ReminderSettings) => (value: string | boolean) => setValues((current) => ({ ...current, [key]: value }))
  const on = (key: keyof ReminderSettings) => values[key] === true
  const text = (key: keyof ReminderSettings) => String(values[key] ?? "")
  const locked = !canEdit

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    start(async () => {
      const data = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === "boolean" ? (value ? 1 : 0) : key === "copy_to" ? value : Number(value) || 0]))
      const result = await saveReminderSettings(data)
      if (!result.ok) return setError(result.error)
      toast.success("Reminder settings saved")
      router.refresh()
    })
  }

  return (
    <form onSubmit={save} className="grid gap-5 lg:grid-cols-2">
      <section className={panel}>
        <Toggle id="invoices" label="Overdue invoices" hint="To the customer, with the balance and the Pay Now link." checked={on("invoices")} disabled={locked} onChange={set("invoices")} />
        {on("invoices") && (
          <>
            <Days id="invoice_after_days" label="First reminder, days after the due date" value={text("invoice_after_days")} disabled={locked} onChange={set("invoice_after_days")} />
            <Days id="invoice_every_days" label="Then every (days)" value={text("invoice_every_days")} disabled={locked} onChange={set("invoice_every_days")} />
            <Days id="invoice_most" label="At most, per invoice" value={text("invoice_most")} disabled={locked} onChange={set("invoice_most")} />
          </>
        )}
      </section>
      <section className={panel}>
        <Toggle id="certificates" label="Certificates about to expire" hint="To the trainee, inviting them to book a refresher." checked={on("certificates")} disabled={locked} onChange={set("certificates")} />
        {on("certificates") && <Days id="certificate_days_before" label="Days before it expires" value={text("certificate_days_before")} disabled={locked} onChange={set("certificate_days_before")} />}
        <Toggle id="feedback_requests" label="Feedback requests" hint="To each student who hasn't answered, with the class's feedback link, on the last day of the class." checked={on("feedback_requests")} disabled={locked} onChange={set("feedback_requests")} />
      </section>
      <section className={panel}>
        <Toggle id="hires_due" label="Equipment due back" hint="To the customer, before the hire ends." checked={on("hires_due")} disabled={locked} onChange={set("hires_due")} />
        {on("hires_due") && <Days id="hire_days_before" label="Days before it's due" value={text("hire_days_before")} disabled={locked} onChange={set("hire_days_before")} />}
        <Toggle id="hires_late" label="Equipment late" hint="To the customer, until it's recorded as returned." checked={on("hires_late")} disabled={locked} onChange={set("hires_late")} />
        {on("hires_late") && <Days id="late_every_days" label="Every (days)" value={text("late_every_days")} disabled={locked} onChange={set("late_every_days")} />}
      </section>
      <section className={panel}>
        <Toggle id="email_receipts" label="Receipts" hint="Emails the customer their receipt, as a PDF, when a payment comes in: recorded here, paid through Pay Now, or matched from M-Pesa." checked={on("email_receipts")} disabled={locked} onChange={set("email_receipts")} />
      </section>
      <section className={panel}>
        <Label htmlFor="copy_to" className="text-sm font-medium">Send a copy of every reminder to</Label>
        <Input id="copy_to" type="email" placeholder="Optional, such as accounts@quality-care.co.ke" value={text("copy_to")} disabled={locked} onChange={(event) => set("copy_to")(event.target.value)} />
        <p className="text-xs text-[#6A6C8C]">So someone in the office sees what customers were sent.</p>
      </section>
      {error && <p role="alert" className="rounded-lg bg-[#EB2239]/10 px-3 py-2 text-sm text-[#87000A] lg:col-span-2">{error}</p>}
      {canEdit && (
        <div className="lg:col-span-2">
          <LoadingButton type="submit" loading={pending}>Save reminder settings</LoadingButton>
        </div>
      )}
    </form>
  )
}
