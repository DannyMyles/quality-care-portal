import { Tractor } from "@/components/icons"
import { PeriodChart } from "@/components/charts/period-chart"
import { ActionButton } from "@/components/forms/action-button"
import { FormDialog, type FormField } from "@/components/forms/form-dialog"
import { DeskLink } from "@/components/shared/desk-link"
import { FilterBar, PeriodFilter, SearchFilter } from "@/components/shared/filters"
import { PageHeader } from "@/components/shared/page-header"
import { PrintLink } from "@/components/shared/print-link"
import { RecordLink, RecordTable, type Column } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { StatusTabs } from "@/components/shared/status-tabs"
import { createTractorInvoice, saveTractorLog } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, formatKes, pageOf } from "@/lib/format"
import type { Overview, Page, Period, TractorLog } from "@/lib/frappe/types"
import { describeRange, readPeriod } from "@/lib/period"

const fields: FormField[] = [
  { name: "hire_date", label: "Date", type: "date", required: true, initial: new Date().toISOString().slice(0, 10) },
  { name: "customer", label: "Customer", type: "lookup", lookup: "customer", required: true },
  { name: "item", label: "Service", type: "lookup", lookup: "hire_item", required: true },
  { name: "charge_basis", label: "Charged by", type: "select", required: true, initial: "Acres", options: ["Hours", "Acres", "Days", "Fixed Price"].map((value) => ({ value, label: value })) },
  { name: "quantity", label: "Quantity", type: "number", required: true },
  { name: "rate", label: "Rate (KES)", type: "number", required: true },
  { name: "location", label: "Location" },
  { name: "operator", label: "Operator" },
  { name: "notes", label: "Notes", type: "textarea" },
]

export default async function TractorPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const { page, start, limit } = pageOf(params)
  const me = await getMe()
  const data = await api<Page<TractorLog>>("tractor_logs", { params: { status: params.status, search: params.search, start, limit } })
  let profit: Period[] = []
  let label = ""
  let years: string[] = []
  let latest = ""
  if (me.can.finance) {
    const chosen = readPeriod(params)
    const overview = await api<Overview>("overview", { params: chosen ? { from_date: chosen.from, to_date: chosen.to } : {} })
    label = describeRange(overview.from_date, overview.to_date)
    years = overview.years
    latest = overview.from_date.slice(0, 4)
    profit = await api<Period[]>("tractor_profit", { params: { from_date: overview.from_date, to_date: overview.to_date } })
  }
  const columns: Column<TractorLog>[] = [
    { header: "Job", cell: (row) => <div><p className="font-medium">{row.customer}</p><p className="mt-0.5 text-xs text-[#6A6C8C]">{row.name}</p></div> },
    { header: "Date", cell: (row) => formatDate(row.hire_date) },
    { header: "Location", cell: (row) => row.location ?? "—", wide: true },
    { header: "Work", cell: (row) => `${row.quantity} ${row.charge_basis}`, wide: true },
    { header: "Amount", align: "right", cell: (row) => formatKes(row.amount) },
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    {
      header: "Invoice",
      cell: (row) =>
        row.sales_invoice ? (
          me.can.invoices ? <RecordLink href={`/invoices/${encodeURIComponent(row.sales_invoice)}`}>{row.sales_invoice}</RecordLink> : row.sales_invoice
        ) : me.can.invoices ? (
          <ActionButton size="sm" variant="outline" label="Create invoice" success="Draft invoice created" action={createTractorInvoice.bind(null, row.name)} />
        ) : (
          "—"
        ),
    },
    { header: "Print", cell: (row) => <PrintLink kind="tractor" name={row.name} label="Print" /> },
    { header: "Desk", wide: true, cell: (row) => <DeskLink doctype="Tractor Hire Log" name={row.name} label="Open" /> },
  ]
  const add = me.can.edit_tractor ? <FormDialog title="Record a tractor job" triggerLabel="Record job" success="Job recorded" fields={fields} action={saveTractorLog} /> : null
  return (
    <div className="flex flex-col gap-2">
      <PageHeader title="Tractor Hire" description="Record each job, then turn it into an invoice." actions={add} />
      {me.can.finance && (
        <div className="mb-5 flex flex-col gap-3">
          <FilterBar>
            <PeriodFilter years={years} defaultLabel={`Latest figures (${latest})`} />
          </FilterBar>
          {profit.length > 0 ? (
            <PeriodChart title="Tractor income and costs by month" subtitle={label} periods={profit} />
          ) : (
            <p className="rounded-2xl border border-[#ECEEF7] bg-white px-4 py-6 text-center text-sm text-[#6A6C8C]">No tractor income or costs are posted for {label}.</p>
          )}
        </div>
      )}
      <StatusTabs path="/tractor" current={params.status} keep={params} options={[{ value: "", label: "All" }, { value: "To Invoice", label: "To invoice" }, { value: "Invoiced", label: "Invoiced" }]} />
      <FilterBar>
        <SearchFilter placeholder="Search by customer, location or operator" />
      </FilterBar>
      <RecordTable columns={columns} rows={data.rows} rowKey={(row) => row.name} empty="No tractor jobs here" emptyIcon={Tractor} emptyAction={params.status || params.search ? undefined : add} total={data.total} page={page} path="/tractor" params={params} />
    </div>
  )
}
