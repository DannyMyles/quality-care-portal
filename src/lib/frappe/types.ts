/** What this person may print, from the Print ticks in Desk. */
export interface PrintRights {
  invoice: boolean
  receipt: boolean
  bill: boolean
  tractor: boolean
  class: boolean
  journal: boolean
  certificate: boolean
  supplier: boolean
  customer: boolean
  reports: string[]
}

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
  edit_items: boolean
  add_suppliers: boolean
  edit_suppliers: boolean
  add_equipment: boolean
  invoices: boolean
  make_invoices: boolean
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
  inbox: boolean
  hires: boolean
  reminders: boolean
  recurring: boolean
  edit_recurring: boolean
  edit_hires: boolean
  delete_hires: boolean
  deposits: boolean
  feedback: boolean
}

export type EmailKind = "invoice" | "receipt" | "customer" | "supplier" | "certificate"

export interface EmailStatus {
  /** The address this company sends from, or null when it has no mailbox yet. */
  from: string | null
  send: Record<EmailKind, boolean>
  inbox: boolean
  unread: number
}

/** One email on a record's history, or a row in the inbox. */
export interface EmailRow {
  name: string
  subject?: string
  sender?: string
  sender_full_name?: string
  recipients?: string
  sent_or_received: "Sent" | "Received"
  communication_date: string
  delivery_status?: string
  seen?: number
  status?: string
  reference_doctype?: string
  reference_name?: string
  has_attachment?: number
  party?: { doctype: string; name: string; title?: string } | null
}

export interface Me {
  mail: EmailStatus
  print: PrintRights
  name: string
  email: string
  full_name: string
  user_image?: string
  roles: string[]
  company: string
  companies: string[]
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
  cpd_points?: number
  start_date: string
  end_date?: string
  venue?: string
  trainer?: string
  trainee_count?: number
  total_fees?: number
  /** Average overall feedback rating, out of 5, when students have answered. */
  rating?: number | null
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

export interface HireRow {
  name: string
  hire_date: string
  customer: string
  hire_basis: "Days" | "Weeks"
  periods: number
  due_back: string
  status: "Out" | "Returned"
  total_amount: number
  negotiated?: number
  rate_approved_by?: string
  return_date?: string
  days_late?: number
  sales_invoice?: string
  deposit_status?: "Held" | "Settled"
  deposit_amount?: number
  damage_invoice?: string
  equipment: string[]
  overdue: boolean
}

export interface HireItem {
  name: string
  asset: string
  asset_name: string
  item_code?: string
  condition_out: string
  condition_in?: string
  standard_rate: number
  rate: number
  amount: number
  charge?: number
}

export interface Hire extends Omit<HireRow, "equipment"> {
  company: string
  items: HireItem[]
  negotiation_reason?: string
  rate_approved_on?: string
  return_notes?: string
  notes?: string
  can_approve: boolean
  deposit_journal?: string
  deposit_applied?: number
  deposit_refunded?: number
  settlement_journal?: string
  /** What each item cost, to start a lost item's charge from. */
  costs: Record<string, number>
  /** How a held deposit would be used if settled now. */
  settlement?: { applied: { invoice: string; amount: number }[]; refund: number; drafts: string[]; uninvoiced_damage: boolean }
}

export interface ClassFeedbackRow {
  name: string
  trainee: string
  trainee_name?: string
  submitted_on: string
  source: "By the student" | "From a paper form"
  overall?: number
  instructor?: number
  content?: number
  venue?: number
  recommend?: string
  liked?: string
  improve?: string
}

export interface ClassFeedback {
  url: string
  qr: string
  open: boolean
  closed: string | null
  count: number
  students: number
  average: Record<"overall" | "instructor" | "content" | "venue", number | null>
  recommend: number | null
  rows: ClassFeedbackRow[]
  can_add: boolean
  can_edit: boolean
  can_delete: boolean
  /** Students on the class who haven't given feedback yet. */
  waiting: { trainee: string; name: string }[]
}

export interface FeedbackInfo {
  found: boolean
  course?: string
  start_date?: string
  end_date?: string | null
  venue?: string | null
  closed?: string | null
  contact: { phones: string; email: string }
}

export interface ReminderSettings {
  invoices: number
  invoice_after_days: number
  invoice_every_days: number
  invoice_most: number
  hires_due: number
  hire_days_before: number
  hires_late: number
  late_every_days: number
  certificates: number
  certificate_days_before: number
  feedback_requests: number
  email_receipts: number
  copy_to?: string | null
}

export interface ClassTrainerRow {
  name: string
  supplier: string
  trainer_name?: string
  role?: string
  fee?: number
  purchase_invoice?: string
}

export interface RecurringCharge {
  name: string
  customer: string
  item: string
  description: string
  cost_center?: string
  amount: number
  frequency: "Month" | "Quarter" | "Year"
  day_of_month: number
  start_date?: string
  end_date?: string
  next_date?: string
  active: number
  last_invoice?: string
  notes?: string
}
