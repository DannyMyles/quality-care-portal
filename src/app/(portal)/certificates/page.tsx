import Link from "next/link"
import { Award } from "@/components/icons"
import { ActionButton } from "@/components/forms/action-button"
import { FilterBar, SearchFilter } from "@/components/shared/filters"
import { PageHeader } from "@/components/shared/page-header"
import { RecordLink, RecordTable, type Column } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { StatusTabs } from "@/components/shared/status-tabs"
import { certificateAction } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, pageOf } from "@/lib/format"
import type { Certificate, Page } from "@/lib/frappe/types"

const STATUSES = ["Requested", "Issued", "Rejected", "Revoked"]
const isExpired = (date?: string) => !!date && date < new Date().toISOString().slice(0, 10)

export default async function CertificatesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const { page, start, limit } = pageOf(params)
  const me = await getMe()
  const data = await api<Page<Certificate> & { counts: Record<string, number> }>("certificates", { params: { status: params.status, search: params.search, start, limit } })
  const approve = me.can.approve_certificates
  const columns: Column<Certificate>[] = [
    { header: "Trainee", cell: (row) => <RecordLink href={`/trainees/${encodeURIComponent(row.trainee)}`} sub={row.name}>{row.trainee_name ?? row.trainee}</RecordLink> },
    { header: "Course", cell: (row) => row.course },
    { header: "Class", cell: (row) => (row.training_batch ? <RecordLink href={`/batches/${encodeURIComponent(row.training_batch)}`}>{row.training_batch}</RecordLink> : "—"), wide: true },
    { header: "Date", cell: (row) => formatDate(row.issue_date) },
    { header: "Expires", cell: (row) => (row.expiry_date ? <span className={isExpired(row.expiry_date) ? "font-medium text-[#B5152A]" : undefined}>{formatDate(row.expiry_date)}{isExpired(row.expiry_date) ? " (expired)" : ""}</span> : "—") },
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { header: "PDF", cell: (row) => (row.status === "Issued" ? <a href={`/certificates/${encodeURIComponent(row.name)}/pdf`} target="_blank" rel="noopener" className="font-medium text-[#2E3094] hover:underline">Download</a> : "—") },
    ...(approve
      ? [
          {
            header: "Decision",
            cell: (row: Certificate) =>
              row.status === "Requested" ? (
                <div className="flex gap-2">
                  <ActionButton size="sm" label="Approve" success="Certificate issued" action={certificateAction.bind(null, row.name, "Approve")} />
                  <ActionButton size="sm" variant="outline" label="Reject" success="Certificate rejected" confirm={`Reject the certificate for ${row.trainee_name}? They can be requested again from the class.`} action={certificateAction.bind(null, row.name, "Reject")} />
                </div>
              ) : row.status === "Issued" ? (
                <ActionButton size="sm" variant="outline" label="Revoke" success="Certificate revoked" confirm={`Revoke the certificate for ${row.trainee_name}? It stays on the register as revoked.`} action={certificateAction.bind(null, row.name, "Revoke")} />
              ) : null,
          },
        ]
      : []),
  ]
  return (
    <div>
      <PageHeader
        title="Certificates"
        description={approve ? "Approve or reject requests from class coordinators." : "Requests go to the Director for approval."}
        actions={me.can.import_certificates ? <Link prefetch={false} href="/import?kind=certificates" className="text-sm font-medium text-[#2E3094] hover:underline">Import past certificates</Link> : undefined}
      />
      <StatusTabs path="/certificates" current={params.status} keep={params} options={[{ value: "", label: "All" }, ...STATUSES.map((value) => ({ value, label: value, count: data.counts[value] ?? 0 })), { value: "Expiring", label: "Expired or expiring", count: data.counts.Expiring ?? 0 }]} />
      <FilterBar>
        <SearchFilter placeholder="Search by trainee, course or number" />
      </FilterBar>
      <RecordTable columns={columns} rows={data.rows} rowKey={(row) => row.name} empty="No certificates here" emptyDescription="Requests are made from a class, once its trainees have finished." emptyIcon={Award} total={data.total} page={page} path="/certificates" params={params} />
    </div>
  )
}
