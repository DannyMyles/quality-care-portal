import { InfoIcon } from "@/components/icons"
import { PageHeader } from "@/components/shared/page-header"
import { PrintLink } from "@/components/shared/print-link"
import { RecordTable } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { api } from "@/lib/frappe/client"
import { formatDate, formatKes } from "@/lib/format"

interface Entry {
  name: string
  posting_date: string
  voucher_type: string
  docstatus: number
  user_remark?: string
  total_debit: number
  total_credit: number
  lines: { account: string; party?: string; cost_center?: string; debit: number; credit: number }[]
}

export default async function JournalEntryPage({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name)
  const entry = await api<Entry>("journal_entry", { params: { name } })
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={name}
        description={`${entry.voucher_type} · ${formatDate(entry.posting_date)}`}
        actions={
          <>
            <StatusBadge status={entry.docstatus === 0 ? "Draft" : "Posted"} />
            <PrintLink kind="journal" name={name} />
          </>
        }
      />
      {entry.docstatus === 0 && (
        <p className="flex items-start gap-2.5 rounded-xl bg-[#F5C400]/20 px-4 py-3 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          This draft isn&apos;t in the books or the dashboard. Review it and post it from the full system if it&apos;s right.
        </p>
      )}
      {entry.user_remark && <p className="max-w-3xl text-sm text-[#5E6182]">{entry.user_remark}</p>}
      <RecordTable
        columns={[
          { header: "Account", cell: (row) => row.account.replace(/ - QC$/, "") },
          { header: "Party", cell: (row) => row.party ?? "—", wide: true },
          { header: "Business line", cell: (row) => row.cost_center?.replace(/ - QC$/, "") ?? "—", wide: true },
          { header: "Debit", align: "right", cell: (row) => (row.debit ? formatKes(row.debit, true) : "") },
          { header: "Credit", align: "right", cell: (row) => (row.credit ? formatKes(row.credit, true) : "") },
        ]}
        rows={entry.lines}
        rowKey={(row) => `${row.account}${row.debit}${row.credit}${row.party ?? ""}${row.cost_center ?? ""}`}
        empty="No lines"
      />
      <p className="text-right text-sm font-medium tabular-nums">
        Total {formatKes(entry.total_debit, true)} debit · {formatKes(entry.total_credit, true)} credit
      </p>
    </div>
  )
}
