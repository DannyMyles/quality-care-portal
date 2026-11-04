export interface PortalReport {
  slug: string
  title: string
  description: string
  group: "Money" | "Accounts" | "Tax" | "Training" | "Tractor" | "Records"
  /** Reports that describe today rather than a period don't ask for dates. */
  noDates?: boolean
  /** Statements read from top to bottom line, so they aren't split into pages. */
  whole?: boolean
}

export const REPORTS: PortalReport[] = [
  { slug: "business-line-profit", group: "Money", title: "Profit by business line", description: "Income, costs and profit for each line" },
  { slug: "income-expenses-by-month", group: "Money", title: "Income and expenses by month", description: "How each month went" },
  { slug: "sales-by-customer", group: "Money", title: "Sales by customer", description: "Who you bill most, and what they've paid" },
  { slug: "receivables-ageing", group: "Money", title: "Who owes what, and how late", description: "Unpaid balances by days past due", noDates: true },
  { slug: "payments-received", group: "Money", title: "Payments received", description: "Every payment in, with its reference" },
  { slug: "payments-made", group: "Money", title: "Payments made", description: "Every payment out, with its reference" },
  { slug: "profit-and-loss", group: "Accounts", title: "Profit and loss", description: "Income and costs by account", whole: true },
  { slug: "trial-balance", group: "Accounts", title: "Trial balance", description: "Every account's debits and credits", whole: true },
  { slug: "wht-on-bills", group: "Tax", title: "Withholding tax on bills", description: "For the KRA return, with supplier PINs" },
  { slug: "trainer-wht", group: "Tax", title: "Trainer withholding tax", description: "Fees and tax per trainer, from the trainer payment records" },
  { slug: "unsigned-invoices", group: "Tax", title: "eTIMS unsigned invoices", description: "Submitted invoices not yet signed" },
  { slug: "course-summary", group: "Training", title: "Course summary", description: "Classes, trainees, certificates and fees per course" },
  { slug: "batch-income", group: "Training", title: "Class income", description: "Fees, invoiced amounts and balances per class" },
  { slug: "not-yet-invoiced", group: "Training", title: "Work not yet invoiced", description: "Trainees and tractor jobs still to bill", noDates: true },
  { slug: "certificates", group: "Training", title: "Certificates by status", description: "Requested, issued, rejected and revoked" },
  { slug: "certificates-expiring", group: "Training", title: "Certificates expiring", description: "Expired or due within 90 days, with contacts", noDates: true },
  { slug: "tractor-profit", group: "Tractor", title: "Tractor profit by month", description: "Whether tractor hire is paying for itself" },
  { slug: "tractor-by-customer", group: "Tractor", title: "Tractor jobs by customer", description: "Jobs, value and what's still to invoice" },
  { slug: "equipment-register", group: "Records", title: "Equipment register", description: "Every item, by category", noDates: true },
]

export const REPORT_GROUPS = ["Money", "Accounts", "Tax", "Training", "Tractor", "Records"] as const
