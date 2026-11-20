"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LoadingButton } from "@/components/shared/loading-button"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { returnHire } from "@/lib/actions"
import { formatDate } from "@/lib/format"
import type { Hire } from "@/lib/frappe/types"
import { CONDITIONS, selectClass } from "./hire-form"

/** The equipment is back: when, and what state each item is in. */
export function ReturnForm({ hire }: { hire: Hire }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(hire.return_date ?? new Date().toISOString().slice(0, 10))
  const [conditions, setConditions] = useState<Record<string, string>>(() => Object.fromEntries(hire.items.map((row) => [row.asset, row.condition_in ?? ""])))
  const [notes, setNotes] = useState(hire.return_notes ?? "")
  const [charges, setCharges] = useState<Record<string, string>>(() => Object.fromEntries(hire.items.map((row) => [row.asset, row.charge ? String(row.charge) : ""])))
  const locked = !!hire.damage_invoice
  const chargeable = (asset: string) => ["Worn", "Damaged", "Missing"].includes(conditions[asset])
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const late = date > hire.due_back

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const missing = hire.items.find((row) => !conditions[row.asset])
    if (missing) return setError(`Choose the condition of ${missing.asset_name}.`)
    setError(null)
    start(async () => {
      const amounts = Object.fromEntries(hire.items.filter((row) => chargeable(row.asset)).map((row) => [row.asset, Number(charges[row.asset]) || 0]))
      const result = await returnHire(hire.name, date, conditions, notes, locked ? Object.fromEntries(hire.items.map((row) => [row.asset, row.charge ?? 0])) : amounts)
      if (!result.ok) return setError(result.error)
      toast.success("Return recorded")
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={hire.return_date ? "outline" : "default"} />}>{hire.return_date ? "Edit return" : "Record return"}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Equipment returned</DialogTitle>
            <DialogDescription>It was due back on {formatDate(hire.due_back)}.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="return_date">Returned on<span aria-hidden className="text-[#B5152A]"> *</span></Label>
            <Input id="return_date" type="date" required min={hire.hire_date} value={date} onChange={(event) => setDate(event.target.value)} />
            {late && <p className="text-xs text-[#B5152A]">That&apos;s after the due date. The hire will show as late. The invoice still charges the period booked.</p>}
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Condition on return<span aria-hidden className="text-[#B5152A]"> *</span></legend>
            {hire.items.map((row) => (
              <div key={row.asset} className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-3">
                <Label htmlFor={`in-${row.asset}`} className="flex flex-col items-start gap-0">
                  <span>{row.asset_name}</span>
                  <span className="text-xs font-normal text-[#6A6C8C]">Went out {row.condition_out.toLowerCase()}</span>
                </Label>
                <select
                  id={`in-${row.asset}`}
                  className={selectClass}
                  value={conditions[row.asset]}
                  onChange={(event) => {
                    const value = event.target.value
                    setConditions((current) => ({ ...current, [row.asset]: value }))
                    // A lost item starts from what it cost to replace.
                    if (value === "Missing" && !charges[row.asset] && hire.costs[row.asset]) setCharges((current) => ({ ...current, [row.asset]: String(hire.costs[row.asset]) }))
                  }}
                >
                  <option value="">Choose</option>
                  {[...CONDITIONS, "Missing"].map((condition) => <option key={condition}>{condition}</option>)}
                </select>
                {chargeable(row.asset) && (
                  <div className="col-span-2 flex items-center gap-2 pl-3">
                    <Label htmlFor={`charge-${row.asset}`} className="text-xs font-normal text-[#6A6C8C]">Charge for {conditions[row.asset] === "Missing" ? "replacing it" : "the damage"} (KES)</Label>
                    <Input id={`charge-${row.asset}`} type="number" min={0} step="any" className="h-8 w-32" disabled={locked} value={charges[row.asset]} placeholder="0" onChange={(event) => setCharges((current) => ({ ...current, [row.asset]: event.target.value }))} />
                  </div>
                )}
              </div>
            ))}
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="return_notes">Notes</Label>
            <Textarea id="return_notes" value={notes} placeholder="Damage, missing parts, who brought it back" onChange={(event) => setNotes(event.target.value)} />
          </div>
          {locked && <p className="text-xs text-[#6A6C8C]">The charges are on invoice {hire.damage_invoice}, so they can&apos;t change here.</p>}
          {!locked && <p className="text-xs text-[#6A6C8C]">Charges go on a separate damage invoice, made from the hire page. Leave at 0 to charge nothing.</p>}
          {error && <p role="alert" className="rounded-lg bg-[#EB2239]/10 px-3 py-2 text-sm text-[#87000A]">{error}</p>}
          <DialogFooter>
            <LoadingButton type="submit" loading={pending}>Save return</LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
