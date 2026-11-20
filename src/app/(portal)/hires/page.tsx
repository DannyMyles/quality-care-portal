import { PackageMoving } from "@/components/icons"
import { HireForm } from "@/components/hire/hire-form"
import { otherCompany } from "@/components/shared/other-company"
import { FilterBar, PeriodFilter, SearchFilter, SelectFilter } from "@/components/shared/filters"
import { PageHeader } from "@/components/shared/page-header"
import { RecordLink, RecordTable, type Column } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { StatusTabs } from "@/components/shared/status-tabs"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, formatKes, pageOf } from "@/lib/format"
import type { HireRow, Page } from "@/lib/frappe/types"
import { readPeriod } from "@/lib/period"

const choices = (values: string[]) => values.map((value) => ({ value, label: value }))
const plural = (count: number, basis: string) => `${count} ${basis === "Weeks" ? "week" : "day"}${count === 1 ? "" : "s"}`

export default async function HiresPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const { page, start, limit } = pageOf(params)
  const me = await getMe()
  const away = otherCompany(me, "training", "Equipment hires")
  if (away) return away
  const period = readPeriod(params)
  const data = await api<Page<HireRow> & { customers: string[]; years: string[] }>("hires", { params: { status: params.status, search: params.search, customer: params.customer, from_date: period?.from, to_date: period?.to, start, limit } })
  const columns: Column<HireRow>[] = [
    { header: "Hire", cell: (row) => <RecordLink href={`/hires/${encodeURIComponent(row.name)}`} sub={row.name}>{row.customer}</RecordLink> },
    { header: "Equipment", cell: (row) => (row.equipment.length > 2 ? `${row.equipment.slice(0, 2).join(", ")} and ${row.equipment.length - 2} more` : row.equipment.join(", ")), wide: true },
    { header: "Hired", cell: (row) => `${formatDate(row.hire_date)} · ${plural(row.periods, row.hire_basis)}` },
    {
      header: "Back",
      cell: (row) =>
        row.return_date ? (
          <span>{formatDate(row.return_date)}{row.days_late ? <span className="text-[#B5152A]"> ({row.days_late} late)</span> : null}</span>
        ) : (
          <span className={row.overdue ? "font-medium text-[#B5152A]" : undefined}>Due {formatDate(row.due_back)}</span>
        ),
    },
    { header: "Amount", align: "right", cell: (row) => formatKes(row.total_amount) },
    {
      header: "Status",
      cell: (row) => (
        <span className="flex flex-wrap gap-1">
          <StatusBadge status={row.overdue ? "Overdue" : row.status} />
          {row.negotiated && !row.rate_approved_by && !row.sales_invoice ? <StatusBadge status="Needs approval" /> : null}
        </span>
      ),
    },
    { header: "Invoice", cell: (row) => (row.sales_invoice ? (me.can.invoices ? <RecordLink href={`/invoices/${encodeURIComponent(row.sales_invoice)}`}>{row.sales_invoice}</RecordLink> : row.sales_invoice) : "—"), wide: true },
  ]
  const add = me.can.edit_hires ? <HireForm /> : null
  return (
    <div className="flex flex-col gap-2">
      <PageHeader title="Equipment Hire" description="What's out, with whom, until when, and what it's charged." actions={add} />
      <StatusTabs
        path="/hires"
        current={params.status}
        keep={params}
        options={[
          { value: "", label: "All" },
          { value: "Out", label: "Out now" },
          { value: "Returned", label: "Returned" },
          { value: "To Invoice", label: "To invoice" },
          { value: "Needs approval", label: "Needs approval" },
        ]}
      />
      <FilterBar>
        <SearchFilter placeholder="Search by customer or hire number" />
        <SelectFilter param="customer" placeholder="All customers" options={choices(data.customers)} />
        <PeriodFilter years={data.years} defaultLabel="Any date" />
      </FilterBar>
      <RecordTable columns={columns} rows={data.rows} rowKey={(row) => row.name} empty="No equipment hires here" emptyIcon={PackageMoving} emptyAction={params.status || params.search ? undefined : add} total={data.total} page={page} path="/hires" params={params} />
    </div>
  )
}
