import type { FormField } from "@/components/forms/form-dialog"

export const traineeFields: FormField[] = [
  { name: "full_name", label: "Full name", required: true, full: true },
  { name: "id_number", label: "ID or passport" },
  { name: "phone", label: "Phone", type: "tel" },
  { name: "email", label: "Email", type: "email" },
  { name: "profession", label: "Profession" },
  { name: "registration_number", label: "Registration number" },
  { name: "customer", label: "Billed to", type: "lookup", lookup: "customer", hint: "The sponsor. Leave blank if they pay for themselves." },
]

export const PAY_MODES = [
  { value: "M-Pesa", label: "M-Pesa" },
  { value: "Wire Transfer", label: "Bank transfer" },
  { value: "Cheque", label: "Cheque" },
  { value: "Cash", label: "Cash" },
]

export function paymentFields(balance: number): FormField[] {
  return [
    { name: "amount", label: "Amount (KES)", type: "number", required: true, initial: balance },
    { name: "mode", label: "Paid by", type: "select", required: true, options: PAY_MODES },
    { name: "reference", label: "Reference", placeholder: "M-Pesa code or cheque number", hint: "Not needed for cash." },
    { name: "date", label: "Date paid", type: "date", initial: new Date().toISOString().slice(0, 10), required: true },
  ]
}
