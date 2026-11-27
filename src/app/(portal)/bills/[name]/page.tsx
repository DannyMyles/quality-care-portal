import { PageHeader } from "@/components/shared/page-header"
import { PrintLink } from "@/components/shared/print-link"
import { DetailList } from "@/components/shared/detail-list"
import { RecordLink, RecordTable } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { api, getMe } from "@/lib/frappe/client"
import { ActionButton } from "@/components/forms/action-button"
import { DeleteButton } from "@/components/forms/delete-button"
import { FormDialog, type FormField } from "@/components/forms/form-dialog"
import { cancelRecord, updateBill } from "@/lib/actions"
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
    docstatus: number
    training_batch?: string
  }
  items: { description?: string; expense_account: string; cost_center?: string; amount: number }[]
  payments: { name: string; posting_date: string; mode_of_payment?: string; reference_no?: string; allocated_amount: number }[]
}

const plain = (value?: string) => value?.replace(/ - QC$/, "")

interface BillOptions {
  expense_accounts: { name: string; account_name: string }[]
  cost_centres: string[]
  suppliers: { name: string; supplier_name: string; tax_withholding_category?: string }[]
}

export default async function BillPage({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name)
  const { bill, items, payments } = await api<Detail>("bill", { params: { name } })
  const me = await getMe()
  const draft = bill.docstatus === 0
  const options = draft && me.can.edit_bills && !bill.training_batch ? await api<BillOptions>("bill_options") : null
  const line = items[0]
  const withholding = options?.suppliers.filter((supplier) => supplier.tax_withholding_category).map((supplier) => supplier.name) ?? []
  const fields: FormField[] = options
    ? [
        { name: "supplier", label: "Supplier", type: "select", required: true, full: true, initial: bill.supplier, options: options.suppliers.map((supplier) => ({ value: supplier.name, label: supplier.supplier_name })) },
        { name: "description", label: "What is this for?", required: true, full: true, initial: line?.description?.replace(/<[^>]+>/g, "") ?? "" },
        { name: "amount", label: "Amount (KES)", type: "number", required: true, initial: bill.total },
        { name: "date", label: "Bill date", type: "date", required: true, initial: bill.posting_date },
        { name: "cost_center", label: "Business line", type: "select", required: true, initial: line?.cost_center ?? "", options: options.cost_centres.map((value) => ({ value, label: value.replace(/ - [A-Z]+$/, "") })) },
        { name: "expense_account", label: "Type of cost", type: "select", required: true, initial: line?.expense_account ?? "", hideWhen: { field: "supplier", values: withholding }, options: options.expense_accounts.map((account) => ({ value: account.name, label: account.account_name })) },
        { name: "bill_no", label: "Supplier's bill number", initial: bill.bill_no ?? "" },
      ]
    : []
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={name}
        description={`${bill.supplier_name ?? bill.supplier} · ${formatDate(bill.posting_date)}`}
        actions={
          <>
            <StatusBadge status={bill.status} />
            <PrintLink kind="bill" name={name} />
            {options && <FormDialog key={JSON.stringify(bill)} title={`Edit ${name}`} triggerLabel="Edit draft bill" trigger="edit" success="Draft bill updated" fields={fields} action={updateBill.bind(null, name)} />}
            {draft && me.delete.bill && <DeleteButton kind="bill" name={name} what={`draft bill ${name}`} goTo="/bills" />}
            {bill.docstatus === 1 && me.cancel.bill && <ActionButton variant="outline" label="Cancel bill" success="Bill cancelled" confirm={`Cancel ${name}? It's taken out of the books. Any payment against it must be cancelled first.`} action={cancelRecord.bind(null, "bill", name)} />}
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
