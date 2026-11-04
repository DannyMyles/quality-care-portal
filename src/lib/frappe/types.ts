export interface Can {
  finance: boolean
  trainees: boolean
  edit_trainees: boolean
  batches: boolean
  edit_batches: boolean
  certificates: boolean
  approve_certificates: boolean
  tractor: boolean
  edit_tractor: boolean
  customers: boolean
  edit_customers: boolean
  invoices: boolean
  submit_invoices: boolean
  payments: boolean
  bills: boolean
  edit_bills: boolean
  submit_bills: boolean
  suppliers: boolean
  mpesa: boolean
  apply_mpesa: boolean
  trainers: boolean
  equipment: boolean
  journals: boolean
  items: boolean
  team: boolean
  reports: boolean
  import_trainees: boolean
  import_certificates: boolean
}

export interface Me {
  name: string
  email: string
  full_name: string
  user_image?: string
  roles: string[]
  company: string
  logo?: string
  desk: boolean
  can: Can
}

export interface Page<T> {
  rows: T[]
  total: number
  start: number
  limit: number
}

export interface Period {
  key: string
  label: string
  combined: boolean
  months: number
  income: number
  expenses: number
  profit: number
}

export interface BusinessLine {
  name: string
  income: number
  expenses: number
  profit: number
  margin: number | null
}

export interface Overview {
  from_date: string
  to_date: string
  ledger: { first: string | null; last: string | null }
  years: string[]
  years_with_figures: string[]
  has_figures: boolean
  previous: { from_date: string; to_date: string; income: number; expenses: number; profit: number } | null
  notes: string[]
  totals: { income: number; expenses: number; profit: number; margin: number | null }
  business_lines: BusinessLine[]
  periods: Period[]
  expense_breakdown: { name: string; amount: number; share: number; other?: boolean }[]
  income_breakdown: { name: string; amount: number; share: number; other?: boolean }[]
  receivables: { total: number; count: number; customers: { customer: string; amount: number }[] }
  provisional: { label: string; amount: number }[]
  insights: { tone: "good" | "warning" | "neutral"; title: string; detail: string }[]
}

export interface QueueItem {
  key: string
  label: string
  count: number
  amount: number | null
  href: string
  tone: "info" | "warning" | "critical"
}

export interface WorkQueue {
  items: QueueItem[]
  years: string[]
  in_period?: { classes?: number; trainees?: number; certificates?: number; tractor_jobs?: number; tractor_value?: number }
  activity: {
    trainees?: number
    batches?: Record<string, number>
    certificates?: Record<string, number>
    tractor?: Record<string, number>
    upcoming?: { name: string; course_name: string; start_date: string; status: string; trainee_count: number; venue?: string }[]
  }
}

export interface Trainee {
  name: string
  full_name: string
  id_number?: string
  profession?: string
  registration_number?: string
  phone?: string
  email?: string
  customer?: string
}

export interface Batch {
  name: string
  course: string
  course_name?: string
  status: string
  standard_fee?: number
  start_date: string
  end_date?: string
  venue?: string
  trainer?: string
  trainee_count?: number
  total_fees?: number
}

export interface BatchRow {
  name: string
  trainee: string
  trainee_name?: string
  customer?: string
  fee?: number
  completed?: number
  sales_invoice?: string
  certificate?: string
}

export interface Certificate {
  name: string
  trainee: string
  trainee_name?: string
  course: string
  training_batch?: string
  issue_date: string
  expiry_date?: string
  status: string
  approved_by?: string
}

export interface TractorLog {
  name: string
  hire_date: string
  customer: string
  item: string
  location?: string
  operator?: string
  charge_basis: string
  quantity: number
  rate: number
  amount: number
  status: string
  sales_invoice?: string
}

export interface Invoice {
  name: string
  customer: string
  customer_name?: string
  posting_date: string
  due_date?: string
  grand_total: number
  outstanding_amount: number
  status: string
  docstatus: number
  is_return: number
  training_batch?: string
  tractor_hire_log?: string
  custom_sales_invoice_signed?: number
  custom_cu_invoice_number?: string
  custom_cu_serial_number?: string
  custom_verify_url?: string
  in_words?: string
  tax_id?: string
}

export interface Customer {
  name: string
  customer_name: string
  customer_type?: string
  mobile_no?: string
  email_id?: string
  balance?: number
}

export interface MpesaPayment {
  name: string
  transaction_id: string
  amount: number
  payer_name?: string
  phone?: string
  transaction_time?: string
  status: string
  bill_reference?: string
  customer?: string
  sales_invoice?: string
  payment_entry?: string
  source?: string
  notes?: string
}

export interface Bill {
  name: string
  supplier: string
  supplier_name?: string
  posting_date: string
  due_date?: string
  bill_no?: string
  grand_total: number
  taxes_and_charges_deducted?: number
  outstanding_amount: number
  status: string
  docstatus: number
}

export interface ReportResult {
  from_date: string
  to_date: string
  years: string[]
  title: string
  columns: { fieldname: string; label: string; fieldtype?: string; options?: string }[]
  rows: Record<string, string | number | null>[]
}

export type VerifyResult =
  | { found: false }
  | { found: true; status: "Valid" | "Expired" | "Revoked"; certificate: string; trainee: string; course: string; issue_date: string; expiry_date: string | null }

export type PayInfo =
  | { found: false }
  | {
      found: true
      company: string
      number: string
      customer: string
      issued: string
      due: string | null
      overdue: boolean
      total: number
      balance: number
      to_pay: number
      items: { name: string; amount: number }[]
      mpesa: boolean
      paybill: { type: string; number: string; account: string } | null
      contact: { phones: string; email: string }
    }
