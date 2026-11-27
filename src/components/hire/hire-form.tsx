"use client"

import { useEffect, useRef, useState, useTransition } from "react"
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
import { hireEquipment, saveHire } from "@/lib/actions"
import { formatKes } from "@/lib/format"
import type { Hire } from "@/lib/frappe/types"

export const CONDITIONS = ["Good", "Fair", "Worn", "Damaged"]
export const selectClass = "h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

interface Option {
  name: string
  label: string
  item_code: string
  day: number
  week: number
}

interface Line {
  key: number
  asset: string
  label: string
  condition_out: string
  /** The set rates for this kind of equipment, from its type. */
  day: number
  week: number
  rate: string
}

/** Searches equipment that's in, showing its rates, and fills the row when one is picked. */
function EquipmentPicker({ id, label, onPick, taken }: { id: string; label: string; onPick: (option: Option) => void; taken: string[] }) {
  const [text, setText] = useState(label)
  const [options, setOptions] = useState<Option[]>([])
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => hireEquipment(text).then((rows) => setOptions(rows.filter((row) => !taken.includes(row.name)))), 200)
    return () => clearTimeout(timer)
  }, [text, open, taken])
  return (
    <div ref={box} className="relative">
      <Input
        id={id}
        value={text}
        placeholder="Type to search equipment"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(event) => {
          setText(event.target.value)
          setOpen(true)
        }}
      />
      {open && options.length > 0 && (
        <ul role="listbox" className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-lg">
          {options.map((option) => (
            <li key={option.name} role="option" aria-selected={false}>
              <button
                type="button"
                className="flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm hover:bg-[#F3F4FB]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onPick(option)
                  setText(option.label)
                  setOpen(false)
                }}
              >
                {option.label}
                <span className="text-xs text-[#6A6C8C]">
                  {option.day ? `${formatKes(option.day)} a day` : "No daily rate"} · {option.week ? `${formatKes(option.week)} a week` : "no weekly rate"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && options.length === 0 && text.length > 1 && <p className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-[#6A6C8C] shadow-lg">Nothing in that matches. Equipment that&apos;s out on hire isn&apos;t listed.</p>}
    </div>
  )
}

let nextKey = 1
const blankLine = (): Line => ({ key: nextKey++, asset: "", label: "", condition_out: "Good", day: 0, week: 0, rate: "" })

/** Record a hire, or change one that isn't invoiced yet. */
export function HireForm({ hire }: { hire?: Hire }) {
  const router = useRouter()
  const start = () => ({
    hire_date: hire?.hire_date ?? new Date().toISOString().slice(0, 10),
    customer: hire?.customer ?? "",
    hire_basis: hire?.hire_basis ?? "Days",
    periods: String(hire?.periods ?? 1),
    negotiated: !!hire?.negotiated,
    negotiation_reason: hire?.negotiation_reason ?? "",
    notes: hire?.notes ?? "",
  })
  const startLines = () =>
    hire?.items.map((row) => ({ key: nextKey++, asset: row.asset, label: row.asset_name, condition_out: row.condition_out, day: hire.hire_basis === "Days" ? row.standard_rate : 0, week: hire.hire_basis === "Weeks" ? row.standard_rate : 0, rate: String(row.rate) })) ?? [blankLine()]
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(start)
  const [lines, setLines] = useState<Line[]>(startLines)
  const [error, setError] = useState<string | null>(null)
  const [pending, run] = useTransition()
  const set = (field: string, value: string | boolean) => setValues((current) => ({ ...current, [field]: value }))
  const setLine = (key: number, change: Partial<Line>) => setLines((current) => current.map((line) => (line.key === key ? { ...line, ...change } : line)))

  const periods = Math.max(Number(values.periods) || 0, 0)
  const unit = values.hire_basis === "Weeks" ? "week" : "day"
  const setRate = (line: Line) => (values.hire_basis === "Weeks" ? line.week : line.day)
  const rateOf = (line: Line) => (values.negotiated ? Number(line.rate) || 0 : setRate(line))
  const chosen = lines.filter((line) => line.asset)
  const total = chosen.reduce((sum, line) => sum + rateOf(line) * periods, 0)
  const missingRate = !values.negotiated ? chosen.find((line) => !setRate(line)) : undefined

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!values.customer) return setError("Choose the customer from the list.")
    if (!chosen.length) return setError("Add the equipment being hired.")
    if (periods < 1) return setError(`Enter how many ${unit}s.`)
    if (missingRate) return setError(`${missingRate.label} has no hire rate per ${unit}. Set it on the equipment page, or tick Negotiated rate.`)
    if (values.negotiated && !values.negotiation_reason.trim()) return setError("Say why the rate was changed.")
    if (values.negotiated && chosen.some((line) => !(Number(line.rate) > 0))) return setError("Enter the agreed rate for each item.")
    setError(null)
    run(async () => {
      const result = await saveHire({
        ...(hire ? { name: hire.name } : {}),
        hire_date: values.hire_date,
        customer: values.customer,
        hire_basis: values.hire_basis,
        periods,
        negotiated: values.negotiated ? 1 : 0,
        negotiation_reason: values.negotiated ? values.negotiation_reason : "",
        notes: values.notes,
        items: chosen.map((line) => ({ asset: line.asset, condition_out: line.condition_out, rate: values.negotiated ? Number(line.rate) : undefined })),
      })
      if (!result.ok) return setError(result.error)
      toast.success(hire ? "Hire updated" : "Hire recorded")
      setOpen(false)
      if (hire) router.refresh()
      else {
        setValues(start())
        setLines([blankLine()])
        router.push(`/hires/${encodeURIComponent(String(result.data))}`)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {hire ? (
        <DialogTrigger render={<Button variant="outline" size="icon-sm" aria-label="Edit hire" />}>
          <Pencil className="size-4 text-[#2E3094]" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button aria-label="Record hire" title="Record hire" className="gap-0 px-3" />}>
          <HoverLabel icon={Plus} label="Record hire" />
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{hire ? "Edit hire" : "Record an equipment hire"}</DialogTitle>
            <DialogDescription>Rates come from each item&apos;s set rate per day or week, unless the customer negotiated a different one.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="customer">Customer<span aria-hidden className="text-[#B5152A]"> *</span></Label>
              <LookupInput field={{ name: "customer", label: "Customer", lookup: "customer", required: true, initial: values.customer }} value={values.customer} onChange={(value) => set("customer", value)} onPick={() => undefined} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hire_date">Hire date<span aria-hidden className="text-[#B5152A]"> *</span></Label>
              <Input id="hire_date" type="date" required value={values.hire_date} onChange={(event) => set("hire_date", event.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hire_basis">Charged by</Label>
                <select id="hire_basis" className={selectClass} value={values.hire_basis} onChange={(event) => set("hire_basis", event.target.value)}>
                  <option value="Days">Days</option>
                  <option value="Weeks">Weeks</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="periods">How many<span aria-hidden className="text-[#B5152A]"> *</span></Label>
                <Input id="periods" type="number" min={1} step={1} required value={values.periods} onChange={(event) => set("periods", event.target.value)} />
              </div>
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Equipment<span aria-hidden className="text-[#B5152A]"> *</span></legend>
            {lines.map((line, index) => (
              <div key={line.key} className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-xl border border-[#EEF0F8] p-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto]">
                <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                  <Label htmlFor={`asset-${line.key}`} className="text-xs text-[#6A6C8C]">Item {index + 1}</Label>
                  <EquipmentPicker
                    id={`asset-${line.key}`}
                    label={line.label}
                    taken={lines.filter((other) => other.key !== line.key).map((other) => other.asset)}
                    onPick={(option) => setLine(line.key, { asset: option.name, label: option.label, day: option.day, week: option.week, rate: line.rate || String((values.hire_basis === "Weeks" ? option.week : option.day) || "") })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`condition-${line.key}`} className="text-xs text-[#6A6C8C]">Condition</Label>
                  <select id={`condition-${line.key}`} className={selectClass} value={line.condition_out} onChange={(event) => setLine(line.key, { condition_out: event.target.value })}>
                    {CONDITIONS.map((condition) => <option key={condition}>{condition}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`rate-${line.key}`} className="text-xs text-[#6A6C8C]">Rate per {unit}</Label>
                  {values.negotiated ? (
                    <Input id={`rate-${line.key}`} type="number" min={0} step="any" value={line.rate} onChange={(event) => setLine(line.key, { rate: event.target.value })} />
                  ) : (
                    <p id={`rate-${line.key}`} className={`flex h-9 items-center text-sm tabular-nums ${line.asset && !setRate(line) ? "text-[#B5152A]" : ""}`}>{line.asset ? (setRate(line) ? formatKes(setRate(line)) : "No rate set") : "—"}</p>
                  )}
                </div>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove item ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((other) => other.key !== line.key))}>
                  <Trash className="size-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setLines((current) => [...current, blankLine()])}>
              <Plus className="size-4" />
              Add another item
            </Button>
          </fieldset>

          <div className="flex flex-col gap-2 rounded-xl bg-[#F7F8FC] p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="size-4 accent-[#2E3094]" checked={values.negotiated} onChange={(event) => set("negotiated", event.target.checked)} />
              Negotiated rate
            </label>
            <p className="text-xs text-[#6A6C8C]">Only when the customer asked for a different rate. A Director must approve it before the hire can be invoiced.</p>
            {values.negotiated && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="negotiation_reason">Why the rate was changed<span aria-hidden className="text-[#B5152A]"> *</span></Label>
                <Textarea id="negotiation_reason" value={values.negotiation_reason} onChange={(event) => set("negotiation_reason", event.target.value)} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={values.notes} placeholder="Who collected it, where it's going" onChange={(event) => set("notes", event.target.value)} />
          </div>

          <p className="text-sm" aria-live="polite">
            Total: <strong className="tabular-nums">{formatKes(total, true)}</strong>
            <span className="text-[#6A6C8C]"> for {periods} {unit}{periods === 1 ? "" : "s"}</span>
          </p>
          {error && <p role="alert" className="rounded-lg bg-[#EB2239]/10 px-3 py-2 text-sm text-[#87000A]">{error}</p>}
          <DialogFooter>
            <LoadingButton type="submit" loading={pending}>Save</LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
