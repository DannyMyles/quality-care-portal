import Link from "next/link"
import { GraduationCap } from "@/components/icons"
import { FormDialog } from "@/components/forms/form-dialog"
import { traineeFields } from "@/components/forms/fields"
import { FilterBar, SearchFilter } from "@/components/shared/filters"
import { PageHeader } from "@/components/shared/page-header"
import { RecordLink, RecordTable, type Column } from "@/components/shared/record-table"
import { saveTrainee } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { pageOf } from "@/lib/format"
import type { Page, Trainee } from "@/lib/frappe/types"

const columns: Column<Trainee>[] = [
  { header: "Trainee", cell: (row) => <RecordLink href={`/trainees/${encodeURIComponent(row.name)}`} sub={row.profession}>{row.full_name}</RecordLink> },
  { header: "ID or passport", cell: (row) => row.id_number ?? "—", wide: true },
  { header: "Phone", cell: (row) => row.phone ?? "—" },
  { header: "Email", cell: (row) => row.email ?? "—", wide: true },
  { header: "Billed to", cell: (row) => row.customer ?? <span className="text-[#6A6C8C]">Not set</span> },
]

export default async function TraineesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const { page, start, limit } = pageOf(params)
  const me = await getMe()
  const data = await api<Page<Trainee>>("trainees", { params: { search: params.search, start, limit } })
  const importLink = me.can.import_trainees ? <Link prefetch={false} href="/import" className="text-sm font-medium text-[#2E3094] hover:underline">Import from Excel</Link> : null
  const add = me.can.edit_trainees ? <FormDialog title="New trainee" triggerLabel="New trainee" trigger="add" success="Trainee saved" fields={traineeFields} action={saveTrainee} goTo="/trainees/{result}" /> : null
  return (
    <div>
      <PageHeader title="Trainees" description="Everyone who has trained or is booked to train with Quality Care." actions={<>{importLink}{add}</>} />
      <FilterBar>
        <SearchFilter placeholder="Search by name, ID, phone or email" />
      </FilterBar>
      <RecordTable
        columns={columns}
        rows={data.rows}
        rowKey={(row) => row.name}
        empty={params.search ? "No trainee matches that search" : "No trainees yet"}
        emptyDescription={params.search ? undefined : "Add your first trainee to start building classes."}
        emptyIcon={GraduationCap}
        emptyAction={params.search ? undefined : add}
        total={data.total}
        page={page}
        path="/trainees"
        params={params}
      />
    </div>
  )
}
