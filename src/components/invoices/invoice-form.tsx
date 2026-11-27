"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Plus, Trash } from "@/components/icons"
import { LookupInput } from "@/components/forms/form-dialog"
import { LoadingButton } from "@/components/shared/loading-button"
import { HoverLabel } from "@/components/forms/hover-label"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { saveInvoice } from "@/lib/actions"
import { formatKes } from "@/lib/format"

export interface InvoiceItemOption {
  name: string
  item_name: string
  item_group: string
  standard_rate?: number
  stock_uom: string
}

export interface InvoiceDraft {
  name: string
  customer: string
  posting_date: string
  due_date?: string
  remarks?: string
  lines: { item_code: string; qty: number; rate: number; description?: string }[]
}

interface Line {
  key: number
  item_code: string
  description: string
  qty: string
  rate: string
}

const selectClass = "h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
let nextKey = 1
const blank = (): Line => ({ key: nextKey++, item_code: "", description: "", qty: "1", rate: "" })

/** A new invoice, or changes to a draft: who it's for, when it's due, and its lines. Saved as a draft to check and submit. */
export function InvoiceForm({ items, invoice }: { items: InvoiceItemOption[]; invoice?: InvoiceDraft }) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const start = () => ({ customer: invoice?.customer ?? "", posting_date: invoice?.posting_date ?? today, due_date: invoice?.due_date ?? today, remarks: invoice?.remarks ?? "" })
  const startLines = () => invoice?.lines.map((row) => ({ key: nextKey++, item_code: row.item_code, description: row.description ?? "", qty: String(row.qty), rate: String(row.rate) })) ?? [blank()]
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(start)
  const [lines, setLines] = useState<Line[]>(startLines)
  const [error, setError] = useState<string | null>(null)
  const [pending, run] = useTransition()
  const set = (field: string, value: string) => setValues((current) => ({ ...current, [field]: value }))
  const setLine = (key: number, change: Partial<Line>) => setLines((current) => current.map((line) => (line.key === key ? { ...line, ...change } : line)))
  const chosen = lines.filter((line) => line.item_code)
  const total = chosen.reduce((sum, line) => sum + (Number(line.qty) || 0) * (Number(line.rate) || 0), 0)
  const groups = Array.from(new Set(items.map((item) => item.item_group)))

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!values.customer) return setError("Choose the customer from the list.")
    if (!chosen.length) return setError("Add at least one line.")
    if (chosen.some((line) => !(Number(line.qty) > 0) || line.rate === "" || Number(line.rate) < 0)) return setError("Each line needs a quantity and a price.")
    if (values.due_date < values.posting_date) return setError("The due date can't be before the invoice date.")
    setError(null)
    run(async () => {
      const result = await saveInvoice({
        ...(invoice ? { name: invoice.name } : {}),
        ...values,
        items: chosen.map((line) => ({ item_code: line.item_code, qty: Number(line.qty), rate: Number(line.rate), description: line.description })),
      })
      if (!result.ok) return setError(result.error)
      toast.success(invoice ? "Draft updated" : "Draft invoice saved")
      setOpen(false)
      if (invoice) router.refresh()
      else {
        setValues(start())
        setLines([blank()])
        router.push(`/invoices/${encodeURIComponent(String(result.data))}`)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {invoice ? (
        <DialogTrigger render={<Button variant="outline" size="icon-sm" aria-label="Edit draft invoice" />}>
          <Pencil className="size-4 text-[#2E3094]" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button aria-label="New invoice" title="New invoice" className="gap-0 px-3" />}>
          <HoverLabel icon={Plus} label="New invoice" />
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{invoice ? `Edit ${invoice.name}` : "New invoice"}</DialogTitle>
            <DialogDescription>It saves as a draft. Check it, then submit it to put it in the books.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5 sm:col-span-3">
              <Label htmlFor="customer">Customer<span aria-hidden className="text-[#B5152A]"> *</span></Label>
              <LookupInput field={{ name: "customer", label: "Customer", lookup: "customer", required: true, initial: values.customer }} value={values.customer} onChange={(value) => set("customer", value)} onPick={() => undefined} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="posting_date">Invoice date</Label>
              <Input id="posting_date" type="date" required value={values.posting_date} onChange={(event) => set("posting_date", event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="due_date">Due by</Label>
              <Input id="due_date" type="date" required min={values.posting_date} value={values.due_date} onChange={(event) => set("due_date", event.target.value)} />
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Lines<span aria-hidden className="text-[#B5152A]"> *</span></legend>
            {lines.map((line, index) => (
              <div key={line.key} className="grid grid-cols-2 items-end gap-2 rounded-xl border border-[#EEF0F8] p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_5rem_7rem_auto]">
                <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                  <Label htmlFor={`item-${line.key}`} className="text-xs text-[#6A6C8C]">Line {index + 1}</Label>
                  <select
                    id={`item-${line.key}`}
                    className={selectClass}
                    value={line.item_code}
                    onChange={(event) => {
                      const item = items.find((row) => row.name === event.target.value)
                      setLine(line.key, { item_code: event.target.value, rate: line.rate || (item?.standard_rate ? String(item.standard_rate) : ""), description: line.description || item?.item_name || "" })
                    }}
                  >
                    <option value="">Choose</option>
                    {groups.map((group) => (
                      <optgroup key={group} label={group}>
                        {items.filter((item) => item.item_group === group).map((item) => (
                          <option key={item.name} value={item.name}>{item.item_name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                  <Label htmlFor={`description-${line.key}`} className="text-xs text-[#6A6C8C]">Description</Label>
                  <Input id={`description-${line.key}`} value={line.description} onChange={(event) => setLine(line.key, { description: event.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`qty-${line.key}`} className="text-xs text-[#6A6C8C]">Qty</Label>
                  <Input id={`qty-${line.key}`} type="number" min={0} step="any" value={line.qty} onChange={(event) => setLine(line.key, { qty: event.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`rate-${line.key}`} className="text-xs text-[#6A6C8C]">Price (KES)</Label>
                  <Input id={`rate-${line.key}`} type="number" min={0} step="any" value={line.rate} onChange={(event) => setLine(line.key, { rate: event.target.value })} />
                </div>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove line ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((other) => other.key !== line.key))}>
                  <Trash className="size-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setLines((current) => [...current, blank()])}>
              <Plus className="size-4" />
              Add a line
            </Button>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="remarks">Note on the invoice</Label>
            <Textarea id="remarks" value={values.remarks} placeholder="Optional, such as an order number" onChange={(event) => set("remarks", event.target.value)} />
          </div>
          <p className="text-sm" aria-live="polite">Total: <strong className="tabular-nums">{formatKes(total, true)}</strong></p>
          {error && <p role="alert" className="rounded-lg bg-[#EB2239]/10 px-3 py-2 text-sm text-[#87000A]">{error}</p>}
          <DialogFooter>
            <LoadingButton type="submit" loading={pending}>Save draft</LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
