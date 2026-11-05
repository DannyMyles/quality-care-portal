import Link from "next/link"
import { Users } from "@/components/icons"
import { FormDialog, type FormField } from "@/components/forms/form-dialog"
import { FilterBar, SearchFilter } from "@/components/shared/filters"
import { PageHeader } from "@/components/shared/page-header"
import { RecordTable, type Column } from "@/components/shared/record-table"
import { createCustomer } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatKes, pageOf } from "@/lib/format"
import type { Customer, Page } from "@/lib/frappe/types"

const fields: FormField[] = [
  { name: "customer_name", label: "Name", required: true, full: true },
  { name: "customer_type", label: "Type", type: "select", required: true, initial: "Company", options: [{ value: "Company", label: "Organisation" }, { value: "Individual", label: "Individual" }] },
  { name: "mobile_no", label: "Phone", type: "tel" },
  { name: "email_id", label: "Email", type: "email" },
]

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const { page, start, limit } = pageOf(params)
  const me = await getMe()
  const data = await api<Page<Customer>>("customers", { params: { search: params.search, start, limit } })
  const columns: Column<Customer>[] = [
    { header: "Customer", cell: (row) => <div><p className="font-medium">{row.customer_name}</p><p className="mt-0.5 text-xs text-[#6A6C8C]">{row.customer_type === "Company" ? "Organisation" : row.customer_type}</p></div> },
    { header: "Phone", cell: (row) => row.mobile_no ?? "—" },
    { header: "Email", cell: (row) => row.email_id ?? "—", wide: true },
    ...(me.can.finance ? [{ header: "Owes", align: "right" as const, cell: (row: Customer) => formatKes(row.balance) }] : []),
    ...(me.can.invoices ? [{ header: "Invoices", cell: (row: Customer) => <Link prefetch={false} className="font-medium text-[#2E3094] hover:underline" href={`/invoices?customer=${encodeURIComponent(row.name)}`}>View</Link> }] : []),
  ]
  const add = me.can.edit_customers ? <FormDialog title="New customer" triggerLabel="New customer" trigger="add" success="Customer saved" fields={fields} action={createCustomer} /> : null
  return (
    <div>
      <PageHeader title="Customers" description="Sponsors, hospitals, self-paying trainees and tractor customers." actions={add} />
      <FilterBar>
        <SearchFilter placeholder="Search by name, phone or email" />
      </FilterBar>
      <RecordTable columns={columns} rows={data.rows} rowKey={(row) => row.name} empty="No customers found" emptyIcon={Users} total={data.total} page={page} path="/customers" params={params} />
    </div>
  )
}
