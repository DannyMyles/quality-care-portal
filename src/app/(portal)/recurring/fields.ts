import type { FormField } from "@/components/forms/form-dialog"
import type { RecurringCharge } from "@/lib/frappe/types"

export interface RecurringOptions {
  items: { name: string; item_name: string; item_group: string }[]
  cost_centres: { name: string; cost_center_name: string }[]
}

/** The form for a recurring charge, new or being changed. */
export function chargeFields(options: RecurringOptions, charge?: RecurringCharge): FormField[] {
  const today = new Date().toISOString().slice(0, 10)
  return [
    { name: "customer", label: "Customer", type: "lookup", lookup: "customer", required: true, full: true, initial: charge?.customer ?? "" },
    { name: "item", label: "Charged as", type: "select", required: true, initial: charge?.item ?? "", options: options.items.map((row) => ({ value: row.name, label: `${row.item_name} (${row.item_group})` })) },
    { name: "cost_center", label: "Property or vehicle", type: "select", initial: charge?.cost_center ?? "", options: options.cost_centres.map((row) => ({ value: row.name, label: row.cost_center_name })), hint: "So each property or vehicle shows its own income." },
    { name: "description", label: "What it's for", required: true, full: true, initial: charge?.description ?? "", placeholder: "Rent for shop 2, Property 1", hint: "The month is added on each invoice." },
    { name: "amount", label: "Amount (KES)", type: "number", required: true, initial: charge?.amount ?? "" },
    { name: "frequency", label: "Every", type: "select", required: true, initial: charge?.frequency ?? "Month", options: [{ value: "Month", label: "Month" }, { value: "Quarter", label: "Quarter" }, { value: "Year", label: "Year" }] },
    { name: "day_of_month", label: "Due on day", type: "number", required: true, initial: charge?.day_of_month ?? 1, hint: "1 to 28." },
    { name: "start_date", label: "First invoice on or after", type: "date", required: true, initial: charge?.start_date ?? today },
    { name: "end_date", label: "Last invoice by", type: "date", initial: charge?.end_date ?? "", hint: "Leave blank to keep going." },
    { name: "notes", label: "Notes", type: "textarea", initial: charge?.notes ?? "", placeholder: "Lease terms, deposit held, contact" },
  ]
}
