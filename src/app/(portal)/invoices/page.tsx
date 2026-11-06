import { ReceiptText } from "@/components/icons"
import { FilterBar, PeriodFilter, SearchFilter, SelectFilter } from "@/components/shared/filters"
import { PageHeader } from "@/components/shared/page-header"
import { PrintLink } from "@/components/shared/print-link"
import { RecordLink, RecordTable, type Column } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { StatusTabs } from "@/components/shared/status-tabs"
import { api } from "@/lib/frappe/client"
import { formatDate, formatKes, pageOf } from "@/lib/format"
import type { Invoice, Page } from "@/lib/frappe/types"
import { readPeriod } from "@/lib/period"

const columns: Column<Invoice>[] = [
  { header: "Invoice", cell: (row) => <RecordLink href={`/invoices/${encodeURIComponent(row.name)}`} sub={formatDate(row.posting_date)}>{row.name}</RecordLink> },
  { header: "Customer", cell: (row) => row.customer_name ?? row.customer },
  { header: "Due", cell: (row) => formatDate(row.due_date), wide: true },
  { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  { header: "Total", align: "right", cell: (row) => formatKes(row.grand_total) },
  { header: "Unpaid", align: "right", cell: (row) => formatKes(row.outstanding_amount) },
  { header: "Print", cell: (row) => <PrintLink kind="invoice" name={row.name} /> },
]

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const { page, start, limit } = pageOf(params)
  const chosen = readPeriod(params)
  const data = await api<Page<Invoice> & { years: string[] }>("invoices", { params: { status: params.status, customer: params.customer, search: params.search, source: params.source, from_date: chosen?.from, to_date: chosen?.to, start, limit } })
  return (
    <div>
      <PageHeader title="Invoices" description="Invoices start as drafts from a class or a tractor job. Accounts submits them and records payment." />
      <StatusTabs path="/invoices" current={params.status} keep={params} options={["", "Draft", "Unpaid", "Overdue", "Paid", "Credit Notes"].map((value) => ({ value, label: value || "All" }))} />
      <FilterBar>
        <SearchFilter placeholder="Search by number or customer" />
        <PeriodFilter years={data.years} defaultLabel="Any date" />
        <SelectFilter param="source" placeholder="Any source" options={[{ value: "class", label: "From a class" }, { value: "tractor", label: "From a tractor job" }, { value: "other", label: "Other" }]} />
      </FilterBar>
      <RecordTable columns={columns} rows={data.rows} rowKey={(row) => row.name} empty="No invoices here" emptyDescription="Create them from a class or a tractor job." emptyIcon={ReceiptText} total={data.total} page={page} path="/invoices" params={params} />
    </div>
  )
}
