"use client"

import { useEffect, useRef, useState, useTransition, type ComponentProps } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Plus } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { LoadingButton } from "@/components/shared/loading-button"
import { lookup, type ActionResult, type FormValues } from "@/lib/actions"

export interface FormField {
  name: string
  label: string
  /** "checks" lets several options be ticked, and sends them joined by commas. */
  type?: "text" | "number" | "date" | "tel" | "email" | "select" | "lookup" | "textarea" | "checks"
  required?: boolean
  options?: { value: string; label: string }[]
  /** The pick-list a lookup field searches. */
  lookup?: string
  /** Fill another field from the chosen option, such as the standard fee from the course. */
  fills?: { field: string; from: "standard_rate" | "outstanding_amount" }
  /** Choosing one of these select options also sets another field, which can still be changed. */
  presets?: Record<string, { field: string; value: string }>
  initial?: string | number
  hint?: string
  placeholder?: string
  /** Hide this field while another field holds one of these values. */
  hideWhen?: { field: string; values: string[] }
  full?: boolean
}

function LookupInput({
  field,
  value,
  onChange,
  onPick,
}: {
  field: FormField
  value: string
  onChange: (value: string) => void
  onPick: (option: { standard_rate?: number; outstanding_amount?: number }) => void
}) {
  const [text, setText] = useState(value)
  const [options, setOptions] = useState<Awaited<ReturnType<typeof lookup>>>([])
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => lookup(field.lookup!, text).then(setOptions), 200)
    return () => clearTimeout(id)
  }, [text, open, field.lookup])

  return (
    <div ref={box} className="relative">
      <Input
        id={field.name}
        value={text}
        required={field.required}
        placeholder={field.placeholder ?? "Type to search"}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(event) => {
          setText(event.target.value)
          onChange("")
          setOpen(true)
        }}
      />
      {open && options.length > 0 && (
        <ul role="listbox" className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-lg">
          {options.map((option) => (
            <li key={option.name} role="option" aria-selected={value === option.name}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#F3F4FB]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.name)
                  onPick(option)
                  setText(option.label && option.label !== option.name ? `${option.label} (${option.name})` : option.name)
                  setOpen(false)
                }}
              >
                {option.label ?? option.name}
                {option.label && option.label !== option.name && <span className="ml-2 text-xs text-[#6A6C8C]">{option.name}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** A dialog built from a list of fields, so every "New ..." and "Record ..." form behaves the same. */
export function FormDialog({
  title,
  description,
  triggerLabel,
  submitLabel = "Save",
  success,
  fields,
  action,
  goTo,
  showPlus = true,
  trigger = "label",
  variant,
  size,
}: {
  title: string
  description?: string
  triggerLabel: string
  submitLabel?: string
  success: string
  fields: FormField[]
  action: (values: FormValues) => Promise<ActionResult>
  goTo?: string
  showPlus?: boolean
  /** "label" is an ordinary button. "add" shows only a plus until hovered or focused, and "edit" is a pencil. */
  trigger?: "label" | "add" | "edit"
  variant?: ComponentProps<typeof Button>["variant"]
  size?: ComponentProps<typeof Button>["size"]
}) {
  const router = useRouter()
  const initial = () => Object.fromEntries(fields.map((field) => [field.name, String(field.initial ?? "")]))
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const set = (name: string, value: string) => setValues((current) => ({ ...current, [name]: value }))
  const isHidden = (field: FormField) => !!field.hideWhen && field.hideWhen.values.includes(values[field.hideWhen.field])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const missing = fields.find((field) => field.required && !isHidden(field) && !values[field.name])
    if (missing) {
      setError(`${missing.label} is needed${missing.type === "lookup" ? ". Choose one from the list" : ""}.`)
      return
    }
    setError(null)
    start(async () => {
      const shown = fields.filter((field) => !isHidden(field))
      const result = await action(Object.fromEntries(shown.map((field) => [field.name, values[field.name]])))
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast.success(success)
      setOpen(false)
      setValues(initial())
      if (goTo) router.push(goTo.replace("{result}", encodeURIComponent(String(result.data))))
      else router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger === "edit" ? (
        <DialogTrigger render={<Button variant="outline" size="icon-sm" aria-label={title} />}>
          <Pencil className="size-4 text-[#2E3094]" />
        </DialogTrigger>
      ) : trigger === "add" ? (
        <DialogTrigger render={<Button variant={variant} size={size} aria-label={triggerLabel} title={triggerLabel} className="gap-0 px-3" />}>
          <Plus className="size-4" />
          {/* Touch screens can't hover, so they keep the label. */}
          <span className="max-w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover/button:ml-2 group-hover/button:max-w-52 group-hover/button:opacity-100 group-focus-visible/button:ml-2 group-focus-visible/button:max-w-52 group-focus-visible/button:opacity-100 motion-reduce:transition-none [@media(hover:none)]:ml-2 [@media(hover:none)]:max-w-52 [@media(hover:none)]:opacity-100">
            {triggerLabel}
          </span>
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant={variant} size={size} />}>
          {showPlus && <Plus className="size-4" />}
          {triggerLabel}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.filter((field) => !isHidden(field)).map((field) => (
              <div key={field.name} className={`flex flex-col gap-1.5 ${field.full || field.type === "textarea" ? "sm:col-span-2" : ""}`}>
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span aria-hidden className="text-[#B5152A]"> *</span>}
                </Label>
                {field.type === "select" ? (
                  <Select
                    value={values[field.name]}
                    onValueChange={(value) => {
                      const chosen = String(value ?? "")
                      set(field.name, chosen)
                      const preset = field.presets?.[chosen]
                      if (preset) set(preset.field, preset.value)
                    }}
                  >
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue placeholder="Choose">
                        {(value: string) => field.options?.find((option) => option.value === value)?.label ?? "Choose"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "checks" ? (
                  <div className="flex flex-col gap-2">
                    {field.options?.map((option) => {
                      const ticked = values[field.name].split(",").filter(Boolean)
                      return (
                        <label key={option.value} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="size-4 accent-[#2E3094]"
                            checked={ticked.includes(option.value)}
                            onChange={(event) => set(field.name, (event.target.checked ? [...ticked, option.value] : ticked.filter((value) => value !== option.value)).join(","))}
                          />
                          {option.label}
                        </label>
                      )
                    })}
                  </div>
                ) : field.type === "lookup" ? (
                  <LookupInput
                    field={field}
                    value={values[field.name]}
                    onChange={(value) => set(field.name, value)}
                    onPick={(option) => {
                      const filled = field.fills && option[field.fills.from]
                      if (field.fills && filled) set(field.fills.field, String(filled))
                    }}
                  />
                ) : field.type === "textarea" ? (
                  <Textarea id={field.name} value={values[field.name]} placeholder={field.placeholder} onChange={(event) => set(field.name, event.target.value)} />
                ) : (
                  <Input
                    id={field.name}
                    type={field.type ?? "text"}
                    step={field.type === "number" ? "any" : undefined}
                    min={field.type === "number" ? 0 : undefined}
                    value={values[field.name]}
                    placeholder={field.placeholder}
                    onChange={(event) => set(field.name, event.target.value)}
                  />
                )}
                {field.hint && <p className="text-xs text-[#6A6C8C]">{field.hint}</p>}
              </div>
            ))}
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-[#EB2239]/10 px-3 py-2 text-sm text-[#87000A]">
              {error}
            </p>
          )}
          <DialogFooter>
            <LoadingButton type="submit" loading={pending}>
              {submitLabel}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
