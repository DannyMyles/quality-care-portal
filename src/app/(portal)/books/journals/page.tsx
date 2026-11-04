import { PageHeader } from "@/components/shared/page-header"
import { RecordLink, RecordTable } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { StatusTabs } from "@/components/shared/status-tabs"
import { api } from "@/lib/frappe/client"
import { formatDate, formatKes, pageOf } from "@/lib/format"
import type { Page } from "@/lib/frappe/types"

interface Journal {
  name: string
  posting_date: string
  voucher_type: string
  total_debit: number
  docstatus: number
  user_remark?: string
}

const remark = (text?: string) => (text ?? "").replace(/^QC workbook 2024: /, "")

export default async function JournalsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const { page, start, limit } = pageOf(params)
  const data = await api<Page<Journal>>("journal_entries", { params: { status: params.status, start, limit } })
  return (
    <div>
      <PageHeader title="Journal Entries" description="The postings behind your balances. This page is read-only; make changes in Desk." />
      <StatusTabs path="/books/journals" current={params.status} keep={params} options={["", "Posted", "Draft"].map((value) => ({ value, label: value || "All" }))} />
      <RecordTable
        columns={[
          { header: "Entry", cell: (row) => <RecordLink href={`/books/journals/${encodeURIComponent(row.name)}`} sub={formatDate(row.posting_date)}>{row.name}</RecordLink> },
          { header: "What it's for", cell: (row) => <span className="line-clamp-2 max-w-xl whitespace-normal">{remark(row.user_remark) || row.voucher_type}</span> },
          { header: "Status", cell: (row) => <StatusBadge status={row.docstatus === 0 ? "Draft" : "Posted"} /> },
          { header: "Amount", align: "right", cell: (row) => formatKes(row.total_debit, true) },
        ]}
        rows={data.rows}
        rowKey={(row) => row.name}
        empty="No journal entries here"
        total={data.total}
        page={page}
        path="/books/journals"
        params={params}
      />
    </div>
  )
}
