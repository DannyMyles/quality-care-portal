import type { AppIcon } from "@/components/icons"
import { Award, BarChart3, Bill, Building2, GraduationCap, Landmark, LayoutDashboard, Phone, ReceiptText, Teacher, Tractor, Upload, Users, UsersRound, Wrench, Calendar } from "@/components/icons"
import type { Can } from "@/lib/frappe/types"

export interface PortalNavItem {
  label: string
  href: string
  icon: AppIcon
  /** Hidden when the person's role does not include this. Everyone sees items without one. */
  can?: keyof Can
  children?: PortalNavChild[]
}

export interface PortalNavChild {
  label: string
  href: string
  can?: keyof Can
}

export const BOOKS_NAV: PortalNavChild[] = [
  { label: "Balances", href: "/books", can: "finance" },
  { label: "Journal Entries", href: "/books/journals", can: "journals" },
  { label: "Income", href: "/books/income", can: "finance" },
  { label: "Expenses", href: "/books/expenses", can: "finance" },
]

export const PORTAL_NAV_GROUPS: { label: string; items: PortalNavItem[] }[] = [
  { label: "", items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  {
    label: "Training",
    items: [
      { label: "Trainees", href: "/trainees", icon: UsersRound, can: "trainees" },
      { label: "Classes", href: "/batches", icon: Calendar, can: "batches" },
      { label: "Certificates", href: "/certificates", icon: Award, can: "certificates" },
    ],
  },
  { label: "Tractor", items: [{ label: "Tractor Hire", href: "/tractor", icon: Tractor, can: "tractor" }] },
  {
    label: "Money",
    items: [
      { label: "Invoices", href: "/invoices", icon: ReceiptText, can: "invoices" },
      { label: "Customers", href: "/customers", icon: Users, can: "customers" },
      { label: "M-Pesa", href: "/payments", icon: Phone, can: "mpesa" },
      { label: "Supplier Bills", href: "/bills", icon: Bill, can: "bills" },
      { label: "Suppliers", href: "/suppliers", icon: Building2, can: "suppliers" },
    ],
  },
  {
    label: "Records",
    items: [
      {
        label: "Books",
        href: "/books",
        icon: Landmark,
        can: "finance",
        children: BOOKS_NAV,
      },
      { label: "Courses & Services", href: "/services", icon: GraduationCap, can: "items" },
      { label: "Trainers & WHT", href: "/trainers", icon: Teacher, can: "trainers" },
      { label: "Equipment", href: "/equipment", icon: Wrench, can: "equipment" },
      { label: "Reports", href: "/reports", icon: BarChart3, can: "reports" },
      { label: "Import from Excel", href: "/import", icon: Upload, can: "import_trainees" },
      { label: "Team", href: "/team", icon: Users, can: "team" },
    ],
  },
]

/** Every destination, children included, for working out the current page's title. */
export const PORTAL_NAV: { label: string; href: string }[] = PORTAL_NAV_GROUPS.flatMap((group) =>
  group.items.flatMap((item) => [item, ...(item.children ?? [])])
)
