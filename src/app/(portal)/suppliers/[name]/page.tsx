import { DetailList } from "@/components/shared/detail-list"
import { PageHeader } from "@/components/shared/page-header"
import { PrintLink } from "@/components/shared/print-link"
import { RecordLink, RecordTable } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, formatKes } from "@/lib/format"

interface Detail {
  name: string
  supplier_name: string
  supplier_group?: string
  supplier_type?: string
  tax_id?: string
  tax_withholding_category?: string
  supplier_details?: string
  balance?: number
  bills: { name: string; posting_date: string; grand_total: number; outstanding_amount: number; status: string }[]
  trainer_records: { name: string; period: string; class_name?: string; amount_due: number; wht_amount: number; net_amount: number; amount_paid: number }[]
}

export default async function SupplierPage({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name)
  const me = await getMe()
  const data = await api<Detail>("supplier", { params: { name } })
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={data.supplier_name} description={data.supplier_group} actions={<PrintLink statement="supplier" name={name} label="Print statement" />} />
      <DetailList
        rows={[
          { label: "Type", value: data.supplier_type },
          { label: "KRA PIN", value: data.tax_id },
          { label: "Withholding tax", value: data.tax_withholding_category ?? "None" },
          ...(me.can.finance ? [{ label: "We owe", value: formatKes(data.balance, true) }] : []),
        ]}
      />
      {data.supplier_details && (
        <div>
          <h2 className="mb-1 font-medium">Notes</h2>
          <p className="max-w-3xl text-sm whitespace-pre-line text-[#5E6182]">{data.supplier_details}</p>
        </div>
      )}
      {data.bills.length > 0 && (
        <div>
          <h2 className="mb-1 font-medium">Bills</h2>
          <RecordTable
            columns={[
              { header: "Bill", cell: (row) => <RecordLink href={`/bills/${encodeURIComponent(row.name)}`}>{row.name}</RecordLink> },
              { header: "Date", cell: (row) => formatDate(row.posting_date) },
              { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
              { header: "To pay", align: "right", cell: (row) => formatKes(row.grand_total) },
              { header: "Unpaid", align: "right", cell: (row) => formatKes(row.outstanding_amount) },
            ]}
            rows={data.bills}
            rowKey={(row) => row.name}
            empty="No bills"
          />
        </div>
      )}
      {data.trainer_records.length > 0 && (
        <div>
          <h2 className="mb-1 font-medium">Trainer payments</h2>
          <RecordTable
            columns={[
              { header: "Month", cell: (row) => formatDate(row.period) },
              { header: "Class", cell: (row) => <span className="whitespace-normal">{row.class_name ?? "—"}</span> },
              { header: "Fee", align: "right", cell: (row) => formatKes(row.amount_due) },
              { header: "WHT", align: "right", wide: true, cell: (row) => formatKes(row.wht_amount) },
              { header: "Net", align: "right", wide: true, cell: (row) => formatKes(row.net_amount) },
              { header: "Paid", align: "right", cell: (row) => formatKes(row.amount_paid) },
            ]}
            rows={data.trainer_records}
            rowKey={(row) => row.name}
            empty="No payments"
          />
        </div>
      )}
    </div>
  )
}
