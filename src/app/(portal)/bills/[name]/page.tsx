import { PageHeader } from "@/components/shared/page-header"
import { PrintLink } from "@/components/shared/print-link"
import { DetailList } from "@/components/shared/detail-list"
import { RecordLink, RecordTable } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { api } from "@/lib/frappe/client"
import { formatDate, formatKes } from "@/lib/format"

interface Detail {
  bill: {
    name: string
    supplier: string
    supplier_name?: string
    posting_date: string
    due_date?: string
    bill_no?: string
    total: number
    grand_total: number
    taxes_and_charges_deducted?: number
    outstanding_amount: number
    status: string
    remarks?: string
  }
  items: { description?: string; expense_account: string; cost_center?: string; amount: number }[]
  payments: { name: string; posting_date: string; mode_of_payment?: string; reference_no?: string; allocated_amount: number }[]
}

const plain = (value?: string) => value?.replace(/ - QC$/, "")

export default async function BillPage({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name)
  const { bill, items, payments } = await api<Detail>("bill", { params: { name } })
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={name}
        description={`${bill.supplier_name ?? bill.supplier} · ${formatDate(bill.posting_date)}`}
        actions={
          <>
            <StatusBadge status={bill.status} />
            <PrintLink kind="bill" name={name} />
          </>
        }
      />
      <DetailList
        rows={[
          { label: "Supplier", value: <RecordLink href={`/suppliers/${encodeURIComponent(bill.supplier)}`}>{bill.supplier_name ?? bill.supplier}</RecordLink> },
          { label: "Their bill number", value: bill.bill_no },
          { label: "Due", value: bill.due_date ? formatDate(bill.due_date) : null },
          { label: "Amount", value: formatKes(bill.total, true) },
          { label: "Withholding tax", value: bill.taxes_and_charges_deducted ? formatKes(bill.taxes_and_charges_deducted, true) : null },
          { label: "To pay", value: formatKes(bill.grand_total, true) },
          { label: "Unpaid", value: formatKes(bill.outstanding_amount, true) },
        ]}
      />
      <RecordTable
        columns={[
          { header: "What for", cell: (row) => <span className="whitespace-normal">{row.description ?? "—"}</span> },
          { header: "Expense", cell: (row) => plain(row.expense_account) ?? "—", wide: true },
          { header: "Business line", cell: (row) => plain(row.cost_center) ?? "—", wide: true },
          { header: "Amount", align: "right", cell: (row) => formatKes(row.amount, true) },
        ]}
        rows={items}
        rowKey={(row) => `${row.expense_account}${row.description ?? ""}${row.amount}`}
        empty="No lines"
      />
      {payments.length > 0 && (
        <div>
          <h2 className="mb-1 font-medium">Payments</h2>
          <RecordTable
            columns={[
              { header: "Payment", cell: (row) => row.name },
              { header: "Date", cell: (row) => formatDate(row.posting_date) },
              { header: "How", cell: (row) => row.mode_of_payment ?? "—", wide: true },
              { header: "Reference", cell: (row) => row.reference_no ?? "—", wide: true },
              { header: "Amount", align: "right", cell: (row) => formatKes(row.allocated_amount, true) },
              { header: "Voucher", cell: (row) => <PrintLink kind="receipt" name={row.name} /> },
            ]}
            rows={payments}
            rowKey={(row) => row.name}
            empty="No payments"
          />
        </div>
      )}
    </div>
  )
}
