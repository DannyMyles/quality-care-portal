import { paymentFields } from "@/components/forms/fields"
import { Bill as BillIcon } from "@/components/icons"
import { ActionButton } from "@/components/forms/action-button"
import { FormDialog, type FormField } from "@/components/forms/form-dialog"
import { DeskLink } from "@/components/shared/desk-link"
import { FilterBar, SearchFilter } from "@/components/shared/filters"
import { PageHeader } from "@/components/shared/page-header"
import { PrintLink } from "@/components/shared/print-link"
import { RecordTable, type Column } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { StatusTabs } from "@/components/shared/status-tabs"
import { createBill, payBill, submitBill } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, formatKes, pageOf } from "@/lib/format"
import type { Bill, Page } from "@/lib/frappe/types"

interface BillOptions {
  expense_accounts: { name: string; account_name: string }[]
  cost_centres: string[]
  suppliers: { name: string; supplier_name: string; supplier_group: string; tax_withholding_category?: string }[]
}

export default async function BillsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const { page, start, limit } = pageOf(params)
  const me = await getMe()
  const data = await api<Page<Bill>>("bills", { params: { status: params.status, search: params.search, start, limit } })
  const options = me.can.edit_bills ? await api<BillOptions>("bill_options") : null
  const withholding = options?.suppliers.filter((supplier) => supplier.tax_withholding_category).map((supplier) => supplier.name) ?? []
  const fields: FormField[] = options
    ? [
        { name: "supplier", label: "Supplier", type: "select", required: true, full: true, options: options.suppliers.map((supplier) => ({ value: supplier.name, label: supplier.supplier_name })), hint: "For a trainer, 5% withholding tax comes off automatically." },
        { name: "description", label: "What is this for?", required: true, full: true },
        { name: "amount", label: "Amount (KES)", type: "number", required: true },
        { name: "date", label: "Bill date", type: "date", required: true, initial: new Date().toISOString().slice(0, 10) },
        { name: "cost_center", label: "Business line", type: "select", required: true, options: options.cost_centres.map((value) => ({ value, label: value.replace(/ - QC$/, "") })) },
        { name: "expense_account", label: "Type of cost", type: "select", required: true, hideWhen: { field: "supplier", values: withholding }, options: options.expense_accounts.map((account) => ({ value: account.name, label: account.account_name })) },
        { name: "bill_no", label: "Supplier's bill number" },
      ]
    : []
  const columns: Column<Bill>[] = [
    { header: "Bill", cell: (row) => <div><p className="font-medium">{row.supplier_name ?? row.supplier}</p><p className="mt-0.5 text-xs text-[#6A6C8C]">{row.name} · {formatDate(row.posting_date)}</p></div> },
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { header: "WHT", align: "right", wide: true, cell: (row) => (row.taxes_and_charges_deducted ? formatKes(row.taxes_and_charges_deducted) : "—") },
    { header: "To pay", align: "right", cell: (row) => formatKes(row.grand_total) },
    { header: "Unpaid", align: "right", cell: (row) => formatKes(row.outstanding_amount) },
    {
      header: "Next step",
      cell: (row) =>
        row.docstatus === 0 ? (
          me.can.submit_bills ? <ActionButton size="sm" label="Submit" success="Bill submitted" confirm="Once submitted, this bill goes into the books." action={submitBill.bind(null, row.name)} /> : "Awaiting Accounts"
        ) : row.outstanding_amount > 0 && me.can.submit_bills ? (
          <FormDialog title="Pay this bill" description={`${formatKes(row.outstanding_amount, true)} is unpaid.`} triggerLabel="Pay" submitLabel="Record payment" success="Payment recorded" showPlus={false} size="sm" fields={paymentFields(row.outstanding_amount)} action={payBill.bind(null, row.name)} />
        ) : (
          <DeskLink doctype="Purchase Invoice" name={row.name} label="Open" />
        ),
    },
    { header: "Print", cell: (row) => <PrintLink kind="bill" name={row.name} label="Print" /> },
  ]
  const add = options ? <FormDialog title="New supplier bill" description="This saves as a draft. Check the amount, then submit it." triggerLabel="New bill" success="Draft bill saved" fields={fields} action={createBill} /> : null
  return (
    <div>
      <PageHeader title="Supplier Bills" description="Enter every bill against the business line it belongs to." actions={add} />
      <StatusTabs path="/bills" current={params.status} keep={params} options={["", "Draft", "Unpaid", "Paid"].map((value) => ({ value, label: value || "All" }))} />
      <FilterBar>
        <SearchFilter placeholder="Search by supplier or bill number" />
      </FilterBar>
      <RecordTable columns={columns} rows={data.rows} rowKey={(row) => row.name} empty="No bills here" emptyIcon={BillIcon} total={data.total} page={page} path="/bills" params={params} />
    </div>
  )
}
