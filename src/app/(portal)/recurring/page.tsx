import { RefreshCw } from "@/components/icons"
import { ActionButton } from "@/components/forms/action-button"
import { FormDialog } from "@/components/forms/form-dialog"
import { FilterBar, SearchFilter, SelectFilter } from "@/components/shared/filters"
import { PageHeader } from "@/components/shared/page-header"
import { RecordLink, RecordTable, type Column } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { StatusTabs } from "@/components/shared/status-tabs"
import { createRecurringInvoices, saveRecurringCharge } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, formatKes, pageOf } from "@/lib/format"
import type { Page, RecurringCharge } from "@/lib/frappe/types"
import { redirect } from "next/navigation"
import { chargeFields, type RecurringOptions } from "./fields"

const EVERY = { Month: "a month", Quarter: "a quarter", Year: "a year" }

export default async function RecurringPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const me = await getMe()
  if (!me.can.recurring) redirect("/no-access")
  const { page, start, limit } = pageOf(params)
  const [data, options] = await Promise.all([
    api<Page<RecurringCharge> & { cost_centres: string[]; items: string[] }>("recurring_charges", { params: { active: params.active, search: params.search, cost_center: params.cost_center, item: params.item, start, limit } }),
    api<RecurringOptions>("recurring_options"),
  ])
  const today = new Date().toISOString().slice(0, 10)
  const due = data.rows.filter((row) => row.active && row.next_date && row.next_date <= today).length
  const columns: Column<RecurringCharge>[] = [
    { header: "Charge", cell: (row) => <RecordLink href={`/recurring/${encodeURIComponent(row.name)}`} sub={row.description}>{row.customer}</RecordLink> },
    { header: "Amount", align: "right", cell: (row) => <span>{formatKes(row.amount)}<span className="block text-xs text-[#6A6C8C]">{EVERY[row.frequency]}</span></span> },
    { header: "Property or vehicle", cell: (row) => row.cost_center?.replace(/ - [A-Z]+$/, "") ?? "—", wide: true },
    { header: "Next invoice", cell: (row) => (row.active ? formatDate(row.next_date) : "—") },
    { header: "Status", cell: (row) => <StatusBadge status={row.active ? "Active" : "Stopped"} /> },
  ]
  const add = me.can.edit_recurring ? <FormDialog title="New recurring charge" description="A draft invoice is made on each due day, for accounts to check and submit." triggerLabel="New recurring charge" trigger="add" success="Recurring charge saved" fields={chargeFields(options)} action={saveRecurringCharge} goTo="/recurring/{result}" /> : null
  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Recurring Invoices"
        description="Rents, vehicle leases and other charges billed on a schedule. Each due day makes a draft invoice by itself at 6 in the morning."
        actions={
          <>
            {me.can.make_invoices && due > 0 && <ActionButton variant="outline" label={`Create due invoices (${due})`} success="Due invoices drafted" action={createRecurringInvoices.bind(null, undefined)} />}
            {add}
          </>
        }
      />
      <StatusTabs path="/recurring" param="active" current={params.active} keep={params} options={[{ value: "", label: "All" }, { value: "1", label: "Active" }, { value: "0", label: "Stopped" }]} />
      <FilterBar>
        <SearchFilter placeholder="Search by customer or what it's for" />
        <SelectFilter param="cost_center" placeholder="All properties and vehicles" options={(data.cost_centres ?? []).map((value) => ({ value, label: value.replace(/ - [A-Z]+$/, "") }))} />
        <SelectFilter param="item" placeholder="Everything charged" options={(data.items ?? []).map((value) => ({ value, label: value }))} />
      </FilterBar>
      <RecordTable columns={columns} rows={data.rows} rowKey={(row) => row.name} empty="No recurring charges yet" emptyIcon={RefreshCw} emptyAction={params.active || params.search ? undefined : add} total={data.total} page={page} path="/recurring" params={params} />
    </div>
  )
}
