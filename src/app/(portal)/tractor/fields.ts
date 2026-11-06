import type { FormField } from "@/components/forms/form-dialog"

export const tractorFields: FormField[] = [
  { name: "hire_date", label: "Date", type: "date", required: true, initial: new Date().toISOString().slice(0, 10) },
  { name: "customer", label: "Customer", type: "lookup", lookup: "customer", required: true },
  { name: "item", label: "Service", type: "lookup", lookup: "hire_item", required: true, fills: { field: "rate", from: "standard_rate" } },
  { name: "charge_basis", label: "Charged by", type: "select", required: true, initial: "Acres", options: ["Hours", "Acres", "Days", "Fixed Price"].map((value) => ({ value, label: value })) },
  { name: "quantity", label: "Quantity", type: "number", required: true },
  { name: "rate", label: "Rate (KES)", type: "number", required: true },
  { name: "location", label: "Location" },
  { name: "operator", label: "Operator" },
  { name: "notes", label: "Notes", type: "textarea" },
]
