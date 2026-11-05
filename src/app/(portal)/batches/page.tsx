import { Calendar } from "@/components/icons"
import { FormDialog, type FormField } from "@/components/forms/form-dialog"
import { FilterBar, SearchFilter } from "@/components/shared/filters"
import { PageHeader } from "@/components/shared/page-header"
import { RecordLink, RecordTable, type Column } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { StatusTabs } from "@/components/shared/status-tabs"
import { saveBatch } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, formatKes, pageOf } from "@/lib/format"
import type { Batch, Page } from "@/lib/frappe/types"

const STATUSES = ["Planned", "In Progress", "Completed", "Cancelled"]
const fields: FormField[] = [
  { name: "course", label: "Course", type: "lookup", lookup: "course", required: true, full: true, fills: { field: "standard_fee", from: "standard_rate" } },
  { name: "start_date", label: "Start date", type: "date", required: true },
  { name: "end_date", label: "End date", type: "date" },
  { name: "status", label: "Status", type: "select", required: true, initial: "Planned", options: STATUSES.map((value) => ({ value, label: value })) },
  { name: "standard_fee", label: "Standard fee (KES)", type: "number" },
  { name: "venue", label: "Venue" },
  { name: "trainer", label: "Lead trainer" },
]

const columns: Column<Batch>[] = [
  { header: "Class", cell: (row) => <RecordLink href={`/batches/${encodeURIComponent(row.name)}`} sub={row.name}>{row.course_name ?? row.course}</RecordLink> },
  { header: "Starts", cell: (row) => formatDate(row.start_date) },
  { header: "Venue", cell: (row) => row.venue ?? "—", wide: true },
  { header: "Trainer", cell: (row) => row.trainer ?? "—", wide: true },
  { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  { header: "Trainees", align: "right", cell: (row) => row.trainee_count ?? 0 },
  { header: "Fees", align: "right", cell: (row) => formatKes(row.total_fees) },
]

export default async function BatchesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const { page, start, limit } = pageOf(params)
  const me = await getMe()
  const data = await api<Page<Batch>>("batches", { params: { status: params.status, search: params.search, start, limit } })
  const add = me.can.edit_batches ? <FormDialog title="New class" triggerLabel="New class" trigger="add" success="Class created" fields={fields} action={saveBatch} goTo="/batches/{result}" /> : null
  return (
    <div>
      <PageHeader title="Classes" description="Plan a class, add trainees, then bill them and request certificates." actions={add} />
      <StatusTabs path="/batches" current={params.status} keep={params} options={[{ value: "", label: "All" }, ...STATUSES.map((value) => ({ value, label: value }))]} />
      <FilterBar>
        <SearchFilter placeholder="Search by course, venue or trainer" />
      </FilterBar>
      <RecordTable columns={columns} rows={data.rows} rowKey={(row) => row.name} empty="No classes here yet" emptyIcon={Calendar} emptyAction={params.status || params.search ? undefined : add} total={data.total} page={page} path="/batches" params={params} />
    </div>
  )
}
